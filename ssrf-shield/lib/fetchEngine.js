/**
 * Fetch Engine (Simulated)
 * SSRF Defense Step 8: Simulate HTTP fetch.
 * Returns fake AWS metadata for 169.254.169.254.
 */
const AWS_METADATA = {
  instanceId: "i-123456", region: "us-east-1", instanceType: "t2.micro",
  accessKey: "AKIAFAKEKEY123456", secretKey: "FAKESECRET+abcdefghijklmnop",
  sessionToken: "FakeSessionToken/Long+String+Here", accountId: "123456789012",
  iamRole: "arn:aws:iam::123456789012:role/ssrf-vulnerable-role",
};

function fetch(url, lockedIP) {
  if (lockedIP === "169.254.169.254" || url.includes("169.254.169.254")) {
    return {
      step: "Fetch Engine", status: "PASS",
      data: { url, lockedIP, statusCode: 200, responseBody: AWS_METADATA, note: "🚨 AWS metadata endpoint reached — credentials exposed!" },
    };
  }
  return {
    step: "Fetch Engine", status: "PASS",
    data: {
      url, lockedIP, statusCode: 200,
      responseBody: { message: "Simulated safe response", server: "example-server/1.0", timestamp: new Date().toISOString() },
      note: "Request completed successfully",
    },
  };
}
module.exports = { fetch };
