/**
 * DNS Record Store & Resolution Engine
 * 
 * Full DNS management system with:
 * - In-memory record store (domain → records)
 * - Static and rebinding resolution modes
 * - TTL-based IP rotation for rebinding simulation
 * - Query logging with event classification
 */

// ── DNS Record Store ──
const dnsRecords = {
  "example.com": {
    type: "A",
    mode: "static",
    ips: ["8.8.8.8"],
    ttl: 300,
    currentIndex: 0,
    lastRotated: Date.now(),
    status: "ACTIVE",
    created: Date.now(),
  },
  "evil-rebind.attacker.com": {
    type: "A",
    mode: "rebinding",
    ips: ["8.8.8.8", "169.254.169.254"],
    ttl: 1,
    currentIndex: 0,
    lastRotated: Date.now(),
    status: "ACTIVE",
    created: Date.now(),
  },
  "malicious.site": {
    type: "A",
    mode: "rebinding",
    ips: ["93.184.216.34", "127.0.0.1"],
    ttl: 2,
    currentIndex: 0,
    lastRotated: Date.now(),
    status: "ACTIVE",
    created: Date.now(),
  },
};

// ── Query Log ──
const queryLog = [];
const MAX_LOG_SIZE = 200;

function addLog(domain, ip, event, extra = {}) {
  const entry = {
    time: Date.now(),
    timestamp: new Date().toISOString(),
    domain,
    ip,
    event, // RESOLVE, REBOUND, TTL_EXPIRE, STATIC, NOT_FOUND
    ...extra,
  };
  queryLog.push(entry);
  if (queryLog.length > MAX_LOG_SIZE) queryLog.shift();
  return entry;
}

// ── Resolution Logic ──
function resolveDomain(domain) {
  const record = dnsRecords[domain];

  if (!record || record.status !== "ACTIVE") {
    addLog(domain, "8.8.8.8", "NOT_FOUND", { note: "Domain not in store — default response" });
    return { ips: ["8.8.8.8"], source: "default", record: null };
  }

  if (record.mode === "static") {
    const ip = record.ips[0];
    addLog(domain, ip, "STATIC", { ttl: record.ttl });
    return { ips: [ip], source: "static", record };
  }

  if (record.mode === "rebinding") {
    const now = Date.now();
    const elapsed = now - record.lastRotated;
    const ttlMs = record.ttl * 1000;
    let rotated = false;

    if (elapsed >= ttlMs) {
      const oldIndex = record.currentIndex;
      record.currentIndex = (record.currentIndex + 1) % record.ips.length;
      record.lastRotated = now;
      rotated = true;

      addLog(domain, record.ips[oldIndex], "TTL_EXPIRE", {
        ttl: record.ttl,
        oldIP: record.ips[oldIndex],
      });
      addLog(domain, record.ips[record.currentIndex], "REBOUND", {
        ttl: record.ttl,
        fromIP: record.ips[oldIndex],
        toIP: record.ips[record.currentIndex],
      });
    }

    const ip = record.ips[record.currentIndex];
    if (!rotated) {
      addLog(domain, ip, "RESOLVE", {
        ttl: record.ttl,
        ttlRemaining: Math.max(0, ttlMs - elapsed),
      });
    }

    return { ips: [ip], source: "rebinding", rotated, record };
  }

  return { ips: ["8.8.8.8"], source: "unknown", record };
}

// ── CRUD Operations ──
function getAllRecords() {
  return Object.entries(dnsRecords).map(([domain, record]) => ({
    domain,
    ...record,
    ttlRemaining: record.mode === "rebinding"
      ? Math.max(0, record.ttl * 1000 - (Date.now() - record.lastRotated))
      : null,
    currentIP: record.ips[record.currentIndex] || record.ips[0],
  }));
}

function addOrUpdateRecord(domain, data) {
  dnsRecords[domain] = {
    type: data.type || "A",
    mode: data.mode || "static",
    ips: data.ips || ["8.8.8.8"],
    ttl: data.ttl || 300,
    currentIndex: 0,
    lastRotated: Date.now(),
    status: "ACTIVE",
    created: dnsRecords[domain]?.created || Date.now(),
  };
  return dnsRecords[domain];
}

/**
 * Instant IP update — changes the active IP without resetting TTL, mode, or state.
 * Simulates an attacker modifying DNS mid-request.
 */
function instantUpdate(domain, newIP) {
  const record = dnsRecords[domain];
  if (!record) {
    // Create a new static record on the fly
    dnsRecords[domain] = {
      type: "A", mode: "static", ips: [newIP], ttl: 300,
      currentIndex: 0, lastRotated: Date.now(), status: "ACTIVE", created: Date.now(),
    };
    addLog(domain, newIP, "DNS_CHANGED", { note: "New record created via instant update" });
    return dnsRecords[domain];
  }

  const oldIP = record.ips[record.currentIndex] || record.ips[0];

  // If rebinding mode, replace the current-index IP; otherwise replace first IP
  if (record.mode === "rebinding") {
    record.ips[record.currentIndex] = newIP;
  } else {
    record.ips = [newIP];
    record.currentIndex = 0;
  }

  const isPrivate = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.)/.test(newIP);

  addLog(domain, newIP, isPrivate ? "ATTACK" : "DNS_CHANGED", {
    oldIP,
    newIP,
    note: isPrivate
      ? `⚡ ATTACK: DNS changed to private IP ${newIP} — potential rebinding!`
      : `DNS updated: ${oldIP} → ${newIP}`,
  });

  return record;
}

function deleteRecord(domain) {
  if (dnsRecords[domain]) {
    delete dnsRecords[domain];
    return true;
  }
  return false;
}

function getQueryLog(limit = 100) {
  return queryLog.slice(-limit).reverse();
}

function clearQueryLog() {
  queryLog.length = 0;
}

module.exports = {
  resolveDomain,
  getAllRecords,
  addOrUpdateRecord,
  instantUpdate,
  deleteRecord,
  getQueryLog,
  clearQueryLog,
  addLog,
};
