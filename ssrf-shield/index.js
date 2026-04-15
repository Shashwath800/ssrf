/**
 * ssrf-shield
 * 
 * Complete SSRF Defense Pipeline matching the full architecture diagram.
 * Now supports asynchronous execution for visual simulation.
 */

const auditLayer = require('./lib/auditLayer');
const urlNormalizer = require('./lib/urlNormalizer');
const protocolValidator = require('./lib/protocolValidator');
const dnsResolverDefault = require('./lib/dnsResolver');
const ipValidator = require('./lib/ipValidator');
const allowlistChecker = require('./lib/allowlistChecker');
const ipLocking = require('./lib/ipLocking');
const redirectRevalidation = require('./lib/redirectRevalidation');
const requestMetadataLimiter = require('./lib/requestMetadataLimiter');
const fetchEngine = require('./lib/fetchEngine');
const timeoutSizeEnforcer = require('./lib/timeoutSizeEnforcer');
const responseInspector = require('./lib/responseInspector');
const egressFirewall = require('./lib/egressFirewall');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class SSRFShield {
  constructor(options = {}) {
    this.options = {
      dnsMode: options.dnsMode || 'SAFE',
      allowlist: options.allowlist || null,
      customDnsMappings: options.customDnsMappings || {},
      inspectResponses: options.inspectResponses !== false,
      timeoutMs: options.timeoutMs || 5000,
      maxBodyBytes: options.maxBodyBytes || 1048576,
      customDnsResolver: options.customDnsResolver || null, // Inject real DNS store here
    };

    dnsResolverDefault.setDnsMode(this.options.dnsMode);
    if (Object.keys(this.options.customDnsMappings).length > 0) {
      dnsResolverDefault.addMappings(this.options.customDnsMappings);
    }
    if (this.options.allowlist) {
      allowlistChecker.setAllowlist(this.options.allowlist);
    }
  }

  /**
   * Run the full SSRF defense pipeline.
   * Can be run synchronously, or asynchronously with a delay and onStep hook.
   */
  async scan(url, requestMeta = {}, hooks = {}) {
    const { onStep = () => {}, delayMs = 0 } = hooks;
    const steps = [];
    const logs = [];
    let overallStatus = 'PASS';

    const addStep = async (result) => {
      steps.push(result);
      logs.push({
        timestamp: new Date().toISOString(),
        step: result.step,
        status: result.status,
        message: result.reason || result.data?.note || `${result.step}: ${result.status}`,
      });
      if (result.status === 'BLOCK') { overallStatus = 'BLOCKED'; }
      await onStep(result);
      if (delayMs > 0) await delay(delayMs);
      return result.status === 'BLOCK';
    };

    // Helper for resolving domain dynamically (mid-flight simulation)
    const resolveDomain = async (hostname) => {
      if (this.options.customDnsResolver) {
        return this.options.customDnsResolver(hostname);
      }
      return await dnsResolverDefault.resolve(hostname);
    };

    // ── Layer 1: Audit & Alert Layer ──
    const auditResult = auditLayer.audit(url, requestMeta);
    if (await addStep(auditResult)) return { status: overallStatus, steps, logs };

    let currentUrl = url;
    let lockedIP = null;
    let redirectCount = 0;
    const MAX_REDIRECTS = 3;
    let parsed = null;

    while (redirectCount < MAX_REDIRECTS) {
      if (redirectCount > 0) {
        // Inject a special loop log message
        logs.push({ timestamp: new Date().toISOString(), layer: "System", message: `--- FOLLOWING REDIRECT HOP ${redirectCount} ---` });
      }

      // ── Layer 2: SSRF Guard Middleware → URL Normalizer ──
      const normalizeResult = urlNormalizer.normalize(currentUrl);
      if (await addStep(normalizeResult)) return { status: overallStatus, steps, logs };
      parsed = normalizeResult.data;

      // ── Layer 3: Protocol + Port Validator ──
      const protocolResult = protocolValidator.validate(parsed);
      if (await addStep(protocolResult)) return { status: overallStatus, steps, logs };

      // ── Layer 4: DNS Resolver ──
      const dnsResult = await resolveDomain(parsed.hostname);
      if (await addStep(dnsResult)) return { status: overallStatus, steps, logs };
      const resolvedIPs = dnsResult.data.resolvedIPs;

      // ── Layer 5: IP Validator (IPv4 + IPv6) ──
      const ipResult = ipValidator.validate(resolvedIPs);
      if (await addStep(ipResult)) return { status: overallStatus, steps, logs };

      // ── Layer 6: Allowlist Checker ──
      const allowlistResult = allowlistChecker.check(parsed.hostname);
      if (await addStep(allowlistResult)) return { status: overallStatus, steps, logs };

      // ── Layer 7: IP Locking Module ──
      const lockResult = ipLocking.lock(resolvedIPs, parsed.hostname);
      if (await addStep(lockResult)) return { status: overallStatus, steps, logs };
      lockedIP = lockResult.data.lockedIP;

      // ── Layer 8: Revalidation Engine ──
      if (dnsResult.data.source === "redirect" && dnsResult.data.redirectTarget) {
        // Simulate HTTP redirect being intercepted
        const redirectFetchResult = {
          step: "Redirect Revalidation",
          status: "PASS",
          data: { url: parsed.normalized, statusCode: 302, note: `HTTP 302 Redirect intercepted to: ${dnsResult.data.redirectTarget}` }
        };
        await addStep(redirectFetchResult);

        // Loop back using the new URL!
        currentUrl = dnsResult.data.redirectTarget;
        redirectCount++;
        continue;
      } else {
        const redirectResult = redirectRevalidation.revalidate(parsed.normalized, lockedIP);
        if (await addStep(redirectResult)) return { status: overallStatus, steps, logs };
        break; // No redirect; proceed to fetch
      }
    }

    if (redirectCount >= MAX_REDIRECTS) {
       const tooManyResult = { step: "Redirect Revalidation", status: "BLOCK", reason: `Exceeded MAX_REDIRECTS (${MAX_REDIRECTS})`, data: { url: currentUrl } };
       if (await addStep(tooManyResult)) return { status: overallStatus, steps, logs };
    }

    // ── Layer 9: Request Metadata Limiter ──
    const metadataResult = requestMetadataLimiter.sanitize(requestMeta.headers || {});
    if (await addStep(metadataResult)) return { status: overallStatus, steps, logs };

    // ── SIMULATE DNS REBINDING WINDOW ──
    // Just before egress firewall/fetching, re-resolve to simulate the HTTP client's behavior
    // An attacker might change DNS here
    const lateDnsResult = await resolveDomain(parsed.hostname);
    lockedIP = lateDnsResult.data.resolvedIPs[0] || lockedIP;
    
    // ── Layer 10: Egress Firewall (Network Layer) ──
    // Now check the (possibly rebound) IP against the firewall
    const firewallResult = egressFirewall.enforce(lockedIP);
    if (await addStep(firewallResult)) return { status: overallStatus, steps, logs };

    // ── Layer 11: Secure Fetch Engine ──
    const fetchResult = fetchEngine.fetch(parsed.normalized, lockedIP);
    if (await addStep(fetchResult)) return { status: overallStatus, steps, logs };

    // ── Layer 12: Timeout & Size Enforcer ──
    const timeoutResult = timeoutSizeEnforcer.enforce(fetchResult.data.responseBody, {
      timeoutMs: this.options.timeoutMs,
      maxBodyBytes: this.options.maxBodyBytes,
    });
    if (await addStep(timeoutResult)) return { status: overallStatus, steps, logs };

    // ── Layer 13: Response Inspection Layer ──
    if (this.options.inspectResponses) {
      const inspectResult = responseInspector.inspect(
        fetchResult.data.responseBody,
        fetchResult.data.responseHeaders || {}
      );
      if (await addStep(inspectResult)) return { status: overallStatus, steps, logs };
    }

    return { status: overallStatus, steps, logs };
  }

  // --- DNS mode controls ---
  getDnsMode() { return dnsResolverDefault.getDnsMode(); }
  toggleDnsMode() { return dnsResolverDefault.toggleDnsMode(); }
  setDnsMode(mode) { return dnsResolverDefault.setDnsMode(mode); }

  // --- Audit controls ---
  getAuditLog() { return auditLayer.getAuditLog(); }
  clearAuditLog() { return auditLayer.clearAuditLog(); }

  // --- Expose individual modules ---
  static get modules() {
    return {
      auditLayer, urlNormalizer, protocolValidator, dnsResolver: dnsResolverDefault,
      ipValidator, allowlistChecker, ipLocking, redirectRevalidation,
      requestMetadataLimiter, fetchEngine, timeoutSizeEnforcer,
      responseInspector, egressFirewall,
    };
  }
}

module.exports = SSRFShield;
