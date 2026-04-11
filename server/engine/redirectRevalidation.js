/**
 * Redirect Revalidation Module (Simulated)
 * 
 * SSRF Defense Step 7: Re-validate after following HTTP redirects.
 * Attackers can host a URL that returns a 302 redirect to an internal IP.
 * Example attack chain:
 *   fetch(https://evil.com) → 302 → http://169.254.169.254/latest/meta-data/
 * 
 * After each redirect, we must re-run DNS resolution and IP validation
 * on the new target. This module simulates that revalidation.
 */

function revalidate(url, lockedIP) {
  // Simulated: check if the URL appears to be a redirect to an internal target
  const suspiciousTargets = ["169.254.169.254", "127.0.0.1", "localhost", "0.0.0.0"];
  const urlLower = url.toLowerCase();

  const isSuspicious = suspiciousTargets.some((t) => urlLower.includes(t));

  if (isSuspicious) {
    return {
      step: "Redirect Revalidation",
      status: "BLOCK",
      reason: `Redirect target contains suspicious internal address`,
      data: { url, lockedIP },
    };
  }

  return {
    step: "Redirect Revalidation",
    status: "PASS",
    data: {
      url,
      lockedIP,
      redirectsFollowed: 0,
      note: "No suspicious redirects detected",
    },
  };
}

module.exports = { revalidate };
