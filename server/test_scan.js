const http = require('http');
const fs = require('fs');

async function runTest() {
  // First delete any existing record
  await new Promise((resolve) => {
    const delReq = http.request({
      hostname: 'localhost', port: 4000,
      path: '/api/dns-record/example.com', method: 'DELETE'
    }, () => resolve());
    delReq.end();
  });

  // Add the redirect record
  const postData = JSON.stringify({
    domain: 'example.com',
    ips: ['8.8.8.8'],
    ttl: 300,
    mode: 'redirect',
    redirectTarget: 'http://169.254.169.254/latest/meta-data/',
    type: 'A'
  });

  await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost', port: 4000,
      path: '/api/dns-record', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve());
    });
    req.write(postData);
    req.end();
  });

  // Wait a bit
  await new Promise(r => setTimeout(r, 500));

  // Scan and collect ALL step data
  return new Promise((resolve) => {
    http.get('http://localhost:4000/api/scan?url=http://example.com', (res) => {
      let output = '';
      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));
            if (data.type === 'step') {
              const s = data.stepResult;
              output += `[${s.status}] ${s.step}: ${s.reason || ''} | data: ${JSON.stringify(s.data)}\n`;
            } else if (data.type === 'done') {
              output += `\nFINAL STATUS: ${data.finalStatus}\n`;
              fs.writeFileSync('scan_output_clear.txt', output, 'utf8');
              console.log('Done! Output written.');
              process.exit(0);
            }
          }
        });
      });
    });
  });
}

runTest().catch(console.error);
