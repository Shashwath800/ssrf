/**
 * Redirect Revalidation (Simulated)
 * SSRF Defense Step 7: Re-validate after following HTTP redirects.
 */
const suspiciousTargets = ["169.254.169.254", "127.0.0.1", "localhost", "0.0.0.0"];

function revalidate(url, lockedIP) {
  const urlLower = url.toLowerCase();
  const isSuspicious = suspiciousTargets.some((t) => urlLower.includes(t));
  if (isSuspicious) {
    return {
      step: "Redirect Revalidation", status: "BLOCK",
      reason: "Redirect target contains suspicious internal address",
      data: { url, lockedIP },
    };
  }
  return {
    step: "Redirect Revalidation", status: "PASS",
    data: { url, lockedIP, redirectsFollowed: 0, note: "No suspicious redirects detected" },
  };
}
module.exports = { revalidate };
