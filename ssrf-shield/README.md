# ssrf-shield

A modular SSRF (Server-Side Request Forgery) defense engine for Node.js. Provides a configurable pipeline of validation steps to detect and block SSRF attacks including DNS rebinding, AWS metadata access, and private IP targeting.

## Installation

```bash
npm install ssrf-shield
```

## Quick Start

```js
const SSRFShield = require('ssrf-shield');

const shield = new SSRFShield();
const result = shield.scan('http://169.254.169.254/latest/meta-data/');

console.log(result.status);  // "BLOCKED"
console.log(result.steps);   // Array of step-by-step results
console.log(result.logs);    // Human-readable log entries
```

## Configuration

```js
const shield = new SSRFShield({
  // DNS mode: 'SAFE' resolves to 8.8.8.8, 'ATTACK' simulates DNS rebinding
  dnsMode: 'SAFE',

  // Custom allowlist of domains (null = use defaults)
  allowlist: ['api.example.com', 'cdn.example.com'],

  // Custom hostname → IP mappings for simulation
  customDnsMappings: {
    'internal.corp': ['10.0.0.1'],
  },

  // Whether to scan response bodies for leaked credentials
  inspectResponses: true,
});
```

## API

### `shield.scan(url)` → `{ status, steps, logs }`

Runs the full 9-step defense pipeline on the given URL.

- **status**: `"PASS"` or `"BLOCKED"`
- **steps**: Array of `{ step, status, data, reason }` objects
- **logs**: Array of `{ timestamp, step, status, message }` entries

### `shield.getDnsMode()` → `string`

Returns the current DNS mode (`"SAFE"` or `"ATTACK"`).

### `shield.toggleDnsMode()` → `string`

Toggles DNS mode and returns the new mode.

### `shield.setDnsMode(mode)` → `string`

Sets DNS mode directly.

### `SSRFShield.modules`

Static property exposing all individual modules for advanced usage:

```js
const { ipValidator, dnsResolver } = SSRFShield.modules;

const check = ipValidator.isPrivateIP('192.168.1.1');
console.log(check); // { private: true, reason: 'Private network (192.168.x.x)' }
```

## Pipeline Steps

| # | Module | Defense |
|---|--------|---------|
| 1 | URL Normalizer | Canonicalize URL, prevent encoding tricks |
| 2 | Protocol Validator | Allow only http/https |
| 3 | DNS Resolver | Resolve hostname, detect DNS rebinding |
| 4 | IP Validator | Block private/reserved IPs |
| 5 | Allowlist Checker | Verify domain is approved |
| 6 | IP Locking | Pin resolved IP for request lifetime |
| 7 | Redirect Revalidation | Re-check targets after redirects |
| 8 | Fetch Engine | Execute simulated request |
| 9 | Response Inspector | Scan response for leaked credentials |

## License

MIT
