const http = require('http');
const fs = require('fs');

async function runTest() {
  const postData = JSON.stringify({
    domain: 'example.com',
    ips: ['8.8.8.8'],
    ttl: 300,
    mode: 'redirect',
    redirectTarget: 'http://169.254.169.254/latest/meta-data/',
    type: 'A'
  });

  const req = http.request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/dns-record',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    let output = 'Record Added: ' + res.statusCode + '\n';
    
    setTimeout(() => {
      http.get('http://localhost:4000/api/scan?url=http://example.com', (res) => {
        res.on('data', (chunk) => {
          const lines = chunk.toString().split('\n');
          lines.forEach(line => {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.substring(6));
              if (data.type === 'step') {
                output += `[${data.stepResult.status}] ${data.stepResult.step}: ${data.stepResult.reason || data.stepResult.data.note || ''}\n`;
              } else if (data.type === 'done') {
                output += `FINAL STATUS: ${data.finalStatus}\n`;
                fs.writeFileSync('scan_output_clear.txt', output, 'utf8');
                process.exit(0);
              }
            }
          });
        });
      });
    }, 1000);
  });

  req.write(postData);
  req.end();
}

runTest();
