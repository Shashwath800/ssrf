/**
 * ssrf-shield
 * 
 * Complete SSRF Defense Pipeline matching the full architecture diagram.
 * 
 * Pipeline order (matching diagram exactly):
 *   1.  Client/User Input (entry point)
 *   2.  Audit & Alert Layer
 *   3.  SSRF Guard Middleware (URL Normalizer)
 *   4.  Protocol + Port Validator
 *   5.  DNS Resolver (A + AAAA)
 *   6.  IP Validator (IPv4 + IPv6)
 *   7.  Allowlist Checker
 *   8.  IP Locking Module
 *   9.  Revalidation Engine (re-run steps on redirects)
 *  10.  Request Metadata Limiter
 *  11.  Secure Fetch Engine (forced IP routing)
 *  12.  Timeout & Size Enforcer
 *  13.  Response Inspection Layer
 *  14.  Egress Firewall (Network Layer)
 *  15.  Target External Server (exit point)
 * 
 * Usage:
 *   const SSRFShield = require('ssrf-shield');
 *   const shield = new SSRFShield();
 *   const result = shield.scan('http://169.254.169.254/latest/meta-data/');
 */

const auditLayer = require('./lib/auditLayer');
const urlNormalizer = require('./lib/urlNormalizer');
const protocolValidator = require('./lib/protocolValidator');
const dnsResolver = require('./lib/dnsResolver');
const ipValidator = require('./lib/ipValidator');
const allowlistChecker = require('./lib/allowlistChecker');
const ipLocking = require('./lib/ipLocking');
const redirectRevalidation = require('./lib/redirectRevalidation');
const requestMetadataLimiter = require('./lib/requestMetadataLimiter');
const fetchEngine = require('./lib/fetchEngine');
const timeoutSizeEnforcer = require('./lib/timeoutSizeEnforcer');
const responseInspector = require('./lib/responseInspector');
const egressFirewall = require('./lib/egressFirewall');

class SSRFShield {
  constructor(options = {}) {
    this.options = {
      dnsMode: options.dnsMode || 'SAFE',
      allowlist: options.allowlist || null,
      customDnsMappings: options.customDnsMappings || {},
      inspectResponses: options.inspectResponses !== false,
      timeoutMs: options.timeoutMs || 5000,
      maxBodyBytes: options.maxBodyBytes || 1048576,
    };

    dnsResolver.setDnsMode(this.options.dnsMode);
    if (Object.keys(this.options.customDnsMappings).length > 0) {
      dnsResolver.addMappings(this.options.customDnsMappings);
    }
    if (this.options.allowlist) {
      allowlistChecker.setAllowlist(this.options.allowlist);
    }
  }

  /**
   * Run the full SSRF defense pipeline.
   * Matches the architecture diagram exactly.
   */
  scan(url, requestMeta = {}) {
    const steps = [];
    const logs = [];
    let overallStatus = 'PASS';

    const addStep = (result) => {
      steps.push(result);
      logs.push({
        timestamp: new Date().toISOString(),
        step: result.step,
        status: result.status,
        message: result.reason || result.data?.note || `${result.step}: ${result.status}`,
      });
      if (result.status === 'BLOCK') { overallStatus = 'BLOCKED'; return true; }
      return false;
    };

    // ── Layer 1: Audit & Alert Layer ──
    // Log every request, detect anomaly patterns, alert on repeated failures
    const auditResult = auditLayer.audit(url, requestMeta);
    addStep(auditResult); // audit never blocks, just observes

    // ── Layer 2: SSRF Guard Middleware → URL Normalizer ──
    // Decode %, octals, decimals, Unicode homoglyphs
    const normalizeResult = urlNormalizer.normalize(url);
    if (addStep(normalizeResult)) return { status: overallStatus, steps, logs };
    const parsed = normalizeResult.data;

    // ── Layer 3: Protocol + Port Validator ──
    // Allow only http/https, enforce port allowlist 80/443
    const protocolResult = protocolValidator.validate(parsed);
    if (addStep(protocolResult)) return { status: overallStatus, steps, logs };

    // ── Layer 4: DNS Resolver ──
    // Hardcoded trusted resolver, fetch ALL A + AAAA records
    const dnsResult = dnsResolver.resolve(parsed.hostname);
    if (addStep(dnsResult)) return { status: overallStatus, steps, logs };
    const resolvedIPs = dnsResult.data.resolvedIPs;

    // ── Layer 5: IP Validator (IPv4 + IPv6) ──
    // Block RFC1918, loopback, link-local, IPv4-mapped IPv6
    const ipResult = ipValidator.validate(resolvedIPs);
    if (addStep(ipResult)) return { status: overallStatus, steps, logs };

    // ── Layer 6: Allowlist Checker ──
    // Block if ANY resolved IP is private / domain not in allowlist
    const allowlistResult = allowlistChecker.check(parsed.hostname);
    if (addStep(allowlistResult)) return { status: overallStatus, steps, logs };

    // ── Layer 7: IP Locking Module ──
    // Pin resolved IP, bind to socket, defeat DNS rebinding
    const lockResult = ipLocking.lock(resolvedIPs, parsed.hostname);
    if (addStep(lockResult)) return { status: overallStatus, steps, logs };
    const lockedIP = lockResult.data.lockedIP;

    // ── Layer 8: Revalidation Engine ──
    // Re-run steps 1-6 on every redirect hop
    const redirectResult = redirectRevalidation.revalidate(parsed.normalized, lockedIP);
    if (addStep(redirectResult)) return { status: overallStatus, steps, logs };

    // ── Layer 9: Request Metadata Limiter ──
    // Strip X-Forwarded-For, Referer, cap headers leaking internal topology
    const metadataResult = requestMetadataLimiter.sanitize(requestMeta.headers || {});
    addStep(metadataResult);

    // ── Layer 10: Egress Firewall (Network Layer) ──
    // Hard block RFC1918 at OS/Infra level — last line of defense BEFORE fetch
    const firewallResult = egressFirewall.enforce(lockedIP);
    if (addStep(firewallResult)) return { status: overallStatus, steps, logs };

    // ── Layer 11: Secure Fetch Engine ──
    // Manual HTTP request with forced IP routing
    const fetchResult = fetchEngine.fetch(parsed.normalized, lockedIP);
    if (addStep(fetchResult)) return { status: overallStatus, steps, logs };

    // ── Layer 12: Timeout & Size Enforcer ──
    // Hard timeout, max response body size, abort on breach
    const timeoutResult = timeoutSizeEnforcer.enforce(fetchResult.data.responseBody, {
      timeoutMs: this.options.timeoutMs,
      maxBodyBytes: this.options.maxBodyBytes,
    });
    if (addStep(timeoutResult)) return { status: overallStatus, steps, logs };

    // ── Layer 13: Response Inspection Layer ──
    // Detect AWS/GCP creds, private IPs in response body & headers
    if (this.options.inspectResponses) {
      const inspectResult = responseInspector.inspect(
        fetchResult.data.responseBody,
        fetchResult.data.responseHeaders || {}
      );
      if (addStep(inspectResult)) return { status: overallStatus, steps, logs };
    }

    return { status: overallStatus, steps, logs };
  }

  // --- DNS mode controls ---
  getDnsMode() { return dnsResolver.getDnsMode(); }
  toggleDnsMode() { return dnsResolver.toggleDnsMode(); }
  setDnsMode(mode) { return dnsResolver.setDnsMode(mode); }

  // --- Audit controls ---
  getAuditLog() { return auditLayer.getAuditLog(); }
  clearAuditLog() { return auditLayer.clearAuditLog(); }

  // --- Expose individual modules ---
  static get modules() {
    return {
      auditLayer,
      urlNormalizer,
      protocolValidator,
      dnsResolver,
      ipValidator,
      allowlistChecker,
      ipLocking,
      redirectRevalidation,
      requestMetadataLimiter,
      fetchEngine,
      timeoutSizeEnforcer,
      responseInspector,
      egressFirewall,
    };
  }
}

module.exports = SSRFShield;
