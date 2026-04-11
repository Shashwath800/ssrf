/**
 * Allowlist Checker Module
 * 
 * SSRF Defense Step 5: Check hostname against an allowlist.
 * In production, only pre-approved domains should be fetchable.
 * This prevents attackers from pointing to arbitrary internal services.
 * 
 * For simulation, we allow common safe domains and block unknown ones
 * with a warning (not a hard block for demo purposes).
 */

const ALLOWLISTED_DOMAINS = [
  "example.com",
  "www.example.com",
  "api.example.com",
  "httpbin.org",
  "jsonplaceholder.typicode.com",
];

function check(hostname) {
  const isAllowed = ALLOWLISTED_DOMAINS.includes(hostname);

  if (isAllowed) {
    return {
      step: "Allowlist Checker",
      status: "PASS",
      data: { hostname, allowlisted: true, allowlist: ALLOWLISTED_DOMAINS },
    };
  }

  // For demo: warn but don't block unknown domains (real systems would block)
  return {
    step: "Allowlist Checker",
    status: "PASS",
    data: {
      hostname,
      allowlisted: false,
      note: `⚠ Domain "${hostname}" is NOT in allowlist — proceeding for demo`,
      allowlist: ALLOWLISTED_DOMAINS,
    },
  };
}

module.exports = { check };
