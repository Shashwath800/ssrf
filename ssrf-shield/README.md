# ssrf-shield

[![npm version](https://img.shields.io/npm/v/ssrf-shield.svg)](https://www.npmjs.com/package/ssrf-shield)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

> A battle-tested, 13-layer SSRF defense engine for Node.js. Detects and blocks Server-Side Request Forgery attacks including DNS rebinding, IPv6 bypass techniques, cloud metadata access, and private IP targeting.

---

## Installation

```bash
npm install ssrf-shield
```

## Quick Start

```js
const SSRFShield = require('ssrf-shield');

const shield = new SSRFShield();
const result = await shield.scan('http://169.254.169.254/latest/meta-data/');

console.log(result.status);  // "BLOCKED"
console.log(result.steps);   // Array of step-by-step results
```

## Why ssrf-shield?

SSRF vulnerabilities consistently rank in the **OWASP Top 10**. Attackers exploit them to:

- **Access cloud metadata endpoints** (AWS `169.254.169.254`, GCP, Azure)
- **Scan internal networks** (10.x.x.x, 172.16.x.x, 192.168.x.x)
- **Exfiltrate credentials** via DNS rebinding
- **Bypass firewalls** using IPv6 tunneling (6to4, NAT64)

`ssrf-shield` defends against **all** of these with a modular, 13-layer pipeline that validates URLs, resolves DNS, checks IPs, and inspects responses — before your application ever makes a request.

---

## Full API Reference

### `shield.scan(url, [requestMeta], [hooks])` → `Promise<{ status, steps, logs }>`

Runs the full 13-layer defense pipeline on the given URL.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | `string` | *(required)* | The URL to scan |
| `requestMeta` | `object` | `{}` | Optional metadata: `{ headers, sourceIP, userAgent }` |
| `hooks` | `object` | `{}` | Optional hooks: `{ onStep, delayMs }` |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | `"PASS"` or `"BLOCKED"` |
| `steps` | `array` | Array of `{ step, status, data, reason }` objects for each layer |
| `logs` | `array` | Array of `{ timestamp, step, status, message }` entries |

**Hook options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onStep` | `async function(stepResult)` | `() => {}` | Called after each pipeline step completes |
| `delayMs` | `number` | `0` | Artificial delay between steps (useful for UI visualization) |

### `shield.getDnsMode()` → `string`

Returns the current DNS mode (`"SAFE"` or `"ATTACK"`).

### `shield.toggleDnsMode()` → `string`

Toggles DNS mode between SAFE and ATTACK. Returns the new mode.

### `shield.setDnsMode(mode)` → `string`

Sets DNS mode directly to `"SAFE"` or `"ATTACK"`.

### `shield.getAuditLog()` → `array`

Returns the in-memory audit log of all scanned requests.

### `shield.clearAuditLog()`

Clears the audit log.

### `SSRFShield.modules`

Static property exposing all individual defense modules for advanced usage:

```js
const { ipValidator, dnsResolver, egressFirewall } = SSRFShield.modules;

// Check if an IP is private
const result = ipValidator.isPrivateIP('192.168.1.1');
console.log(result); // { private: true, reason: 'RFC1918 private network (192.168.x.x)' }

// Normalize an IPv6 address
const normalized = ipValidator.normalizeIPv6('::1');
console.log(normalized); // '0000:0000:0000:0000:0000:0000:0000:0001'
```

---

## Constructor Options

```js
const shield = new SSRFShield(options);
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dnsMode` | `string` | `"SAFE"` | DNS resolution mode. `"SAFE"` = real resolution, `"ATTACK"` = simulate DNS rebinding |
| `allowlist` | `string[]` | `null` | Custom domain allowlist. `null` = use built-in defaults |
| `customDnsMappings` | `object` | `{}` | Static hostname→IP overrides: `{ "host": ["ip1", "ip2"] }` |
| `inspectResponses` | `boolean` | `true` | Whether to scan response bodies for leaked credentials |
| `timeoutMs` | `number` | `5000` | Request timeout in milliseconds |
| `maxBodyBytes` | `number` | `1048576` | Maximum response body size (1 MB default) |
| `customDnsResolver` | `function` | `null` | Custom DNS resolver function: `(hostname) => stepResult` |

---

## 13-Layer Defense Pipeline

Every URL scanned by `ssrf-shield` passes through **13 sequential defense layers**. If any layer detects a threat, the pipeline immediately returns `BLOCKED`.

| # | Layer | Defense | What it catches |
|---|-------|---------|-----------------|
| 1 | **Audit & Alert Layer** | Logs requests, detects anomaly patterns | Repeated probing, suspicious bursts |
| 2 | **URL Normalizer** | Canonicalize URL, decode tricks | Encoding bypasses, malformed URLs |
| 3 | **Protocol + Port Validator** | Allow only http/https on ports 80/443 | `file://`, `gopher://`, port 6379 (Redis) |
| 4 | **DNS Resolver** | Resolve hostname via real `dns.promises` | DNS failures, non-existent domains |
| 5 | **IP Validator (IPv4+IPv6)** | Block private/reserved IPs | `127.0.0.1`, `::1`, 6to4, NAT64, `169.254.x.x` |
| 6 | **Allowlist Checker** | Verify domain is approved | Unauthorized external domains |
| 7 | **IP Locking** | Pin resolved IP for request lifetime | TOCTOU / DNS rebinding races |
| 8 | **Redirect Revalidation** | Re-check targets after HTTP redirects | Redirect-based SSRF (302 → internal) |
| 9 | **Request Metadata Limiter** | Strip sensitive headers | `X-Forwarded-For`, `Referer` leaking |
| 10 | **Egress Firewall** | Final network-level IP check | Last-resort catch for rebound IPs |
| 11 | **Fetch Engine** | Execute simulated HTTP request | — |
| 12 | **Timeout & Size Enforcer** | Hard limits on time and body size | Slow-loris, memory exhaustion |
| 13 | **Response Inspection** | Scan response for leaked secrets | AWS keys (`AKIA...`), bearer tokens, private IPs |

---

## IPv6 Coverage

`ssrf-shield` provides **complete IPv6 SSRF protection**, including bypass techniques that most libraries miss:

| Technique | Example | Detected? |
|-----------|---------|-----------|
| Compressed loopback | `::1` | ✅ |
| Full-form loopback | `0:0:0:0:0:0:0:1` | ✅ |
| IPv4-mapped | `::ffff:127.0.0.1` | ✅ |
| Link-local | `fe80::1` | ✅ |
| Unique local | `fc00::1`, `fd00::1` | ✅ |
| 6to4 wrapping 127.x | `2002:7f00::1` | ✅ |
| 6to4 wrapping 169.254.x | `2002:a9fe::1` | ✅ |
| 6to4 wrapping 10.x | `2002:0a00::1` | ✅ |
| NAT64 | `64:ff9b::127.0.0.1` | ✅ |

---

## How DNS Rebinding Works

DNS rebinding is a sophisticated attack that exploits the time gap between DNS resolution and the actual HTTP request:

```
1. Attacker controls evil.com
2. First DNS query:  evil.com → 93.184.216.34  (public IP — passes validation)
3. Your app validates the IP ✅
4. Attacker changes DNS: evil.com → 169.254.169.254
5. HTTP client resolves again: evil.com → 169.254.169.254  (AWS metadata!)
6. Request hits internal service 💀
```

### How ssrf-shield prevents it:

1. **IP Locking (Layer 7)**: Pins the resolved IP from the first lookup. The HTTP client is forced to use this IP, not re-resolve.
2. **Egress Firewall (Layer 10)**: Re-checks the IP just before the request leaves the network boundary. Even if DNS rebinding succeeds, the firewall catches the private IP.
3. **DNS Rebinding Simulation**: Set `dnsMode: "ATTACK"` to simulate rebinding in development:

```js
const shield = new SSRFShield({ dnsMode: 'ATTACK' });
const result = await shield.scan('http://evil.com/');
// → BLOCKED at IP Validator (resolves to 169.254.169.254)
```

---

## Testing

```bash
npm test
```

Runs 100+ Jest test cases covering:
- Unicode/homoglyph bypasses
- Octal/hex/decimal IP notation
- IPv4-mapped IPv6, 6to4, NAT64
- Redirect chain overflow
- Protocol and port blocking
- Response credential detection
- DNS failure handling

---

## License

MIT © ssrf-shield contributors
