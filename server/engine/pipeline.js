/**
 * Pipeline Orchestrator
 * 
 * Runs all SSRF defense modules in sequence.
 * Each module returns { step, status, data, reason }.
 * If any module returns BLOCK, pipeline short-circuits.
 * 
 * Pipeline order:
 * 1. URL Normalizer
 * 2. Protocol Validator
 * 3. DNS Resolver
 * 4. IP Validator
 * 5. Allowlist Checker
 * 6. IP Locking
 * 7. Redirect Revalidation
 * 8. Fetch Engine
 * 9. Response Inspector
 */

const urlNormalizer = require("./urlNormalizer");
const protocolValidator = require("./protocolValidator");
const dnsResolver = require("./dnsResolver");
const ipValidator = require("./ipValidator");
const allowlistChecker = require("./allowlistChecker");
const ipLocking = require("./ipLocking");
const redirectRevalidation = require("./redirectRevalidation");
const fetchEngine = require("./fetchEngine");
const responseInspector = require("./responseInspector");

function run(url) {
  const steps = [];
  const logs = [];
  let overallStatus = "PASS";

  // Helper: add step and check for block
  function addStep(result) {
    steps.push(result);
    logs.push({
      timestamp: new Date().toISOString(),
      step: result.step,
      status: result.status,
      message: result.reason || result.data?.note || `${result.step}: ${result.status}`,
    });
    if (result.status === "BLOCK") {
      overallStatus = "BLOCKED";
      return true; // signals short-circuit
    }
    return false;
  }

  // Step 1: URL Normalizer
  const normalizeResult = urlNormalizer.normalize(url);
  if (addStep(normalizeResult)) {
    return { status: overallStatus, steps, logs };
  }
  const parsed = normalizeResult.data;

  // Step 2: Protocol Validator
  const protocolResult = protocolValidator.validate(parsed);
  if (addStep(protocolResult)) {
    return { status: overallStatus, steps, logs };
  }

  // Step 3: DNS Resolver
  const dnsResult = dnsResolver.resolve(parsed.hostname);
  if (addStep(dnsResult)) {
    return { status: overallStatus, steps, logs };
  }
  const resolvedIPs = dnsResult.data.resolvedIPs;

  // Step 4: IP Validator
  const ipResult = ipValidator.validate(resolvedIPs);
  if (addStep(ipResult)) {
    return { status: overallStatus, steps, logs };
  }

  // Step 5: Allowlist Checker
  const allowlistResult = allowlistChecker.check(parsed.hostname);
  if (addStep(allowlistResult)) {
    return { status: overallStatus, steps, logs };
  }

  // Step 6: IP Locking
  const lockResult = ipLocking.lock(resolvedIPs, parsed.hostname);
  if (addStep(lockResult)) {
    return { status: overallStatus, steps, logs };
  }
  const lockedIP = lockResult.data.lockedIP;

  // Step 7: Redirect Revalidation
  const redirectResult = redirectRevalidation.revalidate(parsed.normalized, lockedIP);
  if (addStep(redirectResult)) {
    return { status: overallStatus, steps, logs };
  }

  // Step 8: Fetch Engine
  const fetchResult = fetchEngine.fetch(parsed.normalized, lockedIP);
  if (addStep(fetchResult)) {
    return { status: overallStatus, steps, logs };
  }

  // Step 9: Response Inspector
  const inspectResult = responseInspector.inspect(fetchResult.data.responseBody);
  if (addStep(inspectResult)) {
    return { status: overallStatus, steps, logs };
  }

  return { status: overallStatus, steps, logs };
}

module.exports = { run };
