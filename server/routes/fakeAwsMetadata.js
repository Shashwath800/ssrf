/**
 * Fake AWS Metadata Service & Internal DB
 * 
 * Simulates the AWS EC2 metadata service at 169.254.169.254
 * and an internal database endpoint for SSRF attack demonstrations.
 * 
 * ⚠️ SAFE SIMULATION ONLY — All data is fake.
 */

const express = require("express");
const router = express.Router();

// ── AWS Metadata Endpoints ──

// Root metadata directory listing
router.get("/latest/meta-data/", (req, res) => {
  res.type("text/plain").send(
    "iam/\nhostname\ninstance-id\nlocal-ipv4\nami-id\ninstance-type\nplacement/"
  );
});

// IAM security credentials directory
router.get("/latest/meta-data/iam/security-credentials/", (req, res) => {
  res.type("text/plain").send("fake-role");
});

// IAM role credentials (THE PRIZE an attacker wants)
router.get("/latest/meta-data/iam/security-credentials/fake-role", (req, res) => {
  res.json({
    Code: "Success",
    LastUpdated: "2026-04-15T10:00:00Z",
    Type: "AWS-HMAC",
    AccessKeyId: "AKIAFAKEAWSACCESSKEY123",
    SecretAccessKey: "FAKESECRETKEY456+abcdefghijklmnopqrstuv",
    Token: "FakeSessionToken789/VeryLongString+Base64Encoded==",
    Expiration: "2026-12-31T23:59:59Z",
  });
});

// Hostname
router.get("/latest/meta-data/hostname", (req, res) => {
  res.type("text/plain").send("ip-10-0-1-42.ec2.internal");
});

// Instance ID
router.get("/latest/meta-data/instance-id", (req, res) => {
  res.type("text/plain").send("i-0abcdef1234567890");
});

// Local IPv4
router.get("/latest/meta-data/local-ipv4", (req, res) => {
  res.type("text/plain").send("10.0.1.42");
});

// AMI ID
router.get("/latest/meta-data/ami-id", (req, res) => {
  res.type("text/plain").send("ami-0fake12345abcdef0");
});

// Instance type
router.get("/latest/meta-data/instance-type", (req, res) => {
  res.type("text/plain").send("t2.micro");
});

// Placement / availability zone
router.get("/latest/meta-data/placement/availability-zone", (req, res) => {
  res.type("text/plain").send("us-east-1a");
});

// ── Internal Fake Database Endpoint ──

router.get("/internal/db", (req, res) => {
  res.json({
    users: [
      { id: 1, name: "admin", email: "admin@corp.internal", password: "supersecret123!" },
      { id: 2, name: "doctor", email: "doc@corp.internal", password: "med@Pass456" },
      { id: 3, name: "devops", email: "devops@corp.internal", password: "k8s_cl0ud$ecret" },
    ],
    apiKeys: [
      { service: "stripe", key: "REMOVEDtest_4eC39HqLyjWDarjtT1zdp7dc" },
      { service: "firebase", key: "AIzaSyDFake-FirebaseKey123456" },
      { service: "aws-s3", key: "AKIA5FAKEKEYS3BUCKET99" },
    ],
    dbConnection: "postgresql://admin:supersecret123!@10.0.1.50:5432/production",
  });
});

module.exports = router;
