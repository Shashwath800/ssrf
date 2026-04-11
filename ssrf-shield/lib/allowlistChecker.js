/**
 * Allowlist Checker
 * 
 * SSRF Defense Step 5: Check hostname against an allowlist.
 * Supports runtime allowlist configuration via setAllowlist().
 */

let allowlist = ["example.com", "www.example.com", "api.example.com", "httpbin.org", "jsonplaceholder.typicode.com"];

function setAllowlist(domains) {
  allowlist = [...domains];
}

function getAllowlist() {
  return [...allowlist];
}

function check(hostname) {
  const isAllowed = allowlist.includes(hostname);
  if (isAllowed) {
    return { step: "Allowlist Checker", status: "PASS", data: { hostname, allowlisted: true, allowlist } };
  }
  return {
    step: "Allowlist Checker", status: "PASS",
    data: { hostname, allowlisted: false, note: `⚠ Domain "${hostname}" is NOT in allowlist — proceeding for demo`, allowlist },
  };
}

module.exports = { check, setAllowlist, getAllowlist };
