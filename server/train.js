const fs = require('fs');
const path = require('path');

// ── Shared Feature Extraction Logic ──
// Same as used in the mlAnalyzer endpoint to ensure train/test symmetry
const SSRF_PARAMS = [
  "url", "uri", "link", "href", "src", "source", "target", "dest",
  "redirect", "return", "next", "callback", "go", "fetch", "load",
  "path", "file", "page", "proxy"
];
const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const isInternalIP = (ip) => /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.|0\.0\.0\.)/.test(ip);

function extractFeatures(targetUrl) {
  let urlObj;
  try {
    urlObj = new URL(targetUrl.startsWith('http') ? targetUrl : `http://${targetUrl}`);
  } catch (e) {
    urlObj = { hostname: targetUrl, searchParams: new URLSearchParams(), pathname: targetUrl };
  }

  const hostname = urlObj.hostname;
  const isIP = IP_RE.test(hostname) ? 1 : 0;
  const isInternal = isIP && isInternalIP(hostname) ? 1 : (hostname === 'localhost' ? 1 : 0);
  
  let suspiciousParamCount = 0;
  for (const [key] of urlObj.searchParams) {
    if (SSRF_PARAMS.includes(key.toLowerCase())) {
      suspiciousParamCount += 1;
    }
  }

  const specialChars = (targetUrl.match(/[@#?&%=:]/g) || []).length;
  const normLength = Math.min(targetUrl.length, 200) / 200.0;

  return {
    isIp: isIP,
    isInternal: isInternal,
    suspiciousParams: Math.min(suspiciousParamCount, 3) / 3.0,
    specialChars: Math.min(specialChars, 10) / 10.0,
    lengthNorm: normLength
  };
}

// ── Training Dataset ──
// Label 1 = SSRF/Malicious, Label 0 = Benign/Safe
const dataset = [
  // Benign URLs
  { url: "https://google.com", label: 0 },
  { url: "https://example.com/api/data", label: 0 },
  { url: "http://my-blog.com/post?id=123", label: 0 },
  { url: "https://github.com/microsoft/vscode", label: 0 },
  { url: "https://auth.provider.com/login?client_id=xyz", label: 0 },
  { url: "http://news.site.org/feed.xml", label: 0 },
  { url: "https://api.weather.com/v1/current?lat=40&lon=-73", label: 0 },
  { url: "https://shop.com/product/xyz123?sort=desc", label: 0 },
  { url: "https://8.8.8.8", label: 0 }, // Public IP but benign
  { url: "http://1.1.1.1/dns-query", label: 0 },
  
  // Extra Benign URLs to lower baseline bias
  { url: "https://youtube.com/watch?v=dQw4w9WgXcQ", label: 0 },
  { url: "https://en.wikipedia.org/wiki/Machine_learning", label: 0 },
  { url: "https://stackoverflow.com/questions/123/how-to-exit-vim", label: 0 },
  { url: "https://amazon.com/s?k=laptop&ref=nb_sb_noss", label: 0 },
  { url: "https://reddit.com/r/programming/comments/123/cool_post", label: 0 },
  { url: "https://news.ycombinator.com/item?id=234234", label: 0 },
  { url: "https://netflix.com/browse/genre/849", label: 0 },
  { url: "https://spotify.com/album/12345", label: 0 },
  { url: "https://twitter.com/search?q=javascript&src=typed_query", label: 0 },
  { url: "https://facebook.com/groups/reactjs", label: 0 },
  { url: "https://linkedin.com/in/someuser", label: 0 },
  { url: "https://pinterest.com/search/pins/?q=design", label: 0 },
  { url: "https://twitch.tv/directory/game/Valorant", label: 0 },
  { url: "https://apple.com/iphone-14-pro", label: 0 },
  { url: "https://microsoft.com/en-us/windows/", label: 0 },
  { url: "https://aws.amazon.com/ec2/pricing/", label: 0 },
  { url: "https://cloud.google.com/compute/docs", label: 0 },
  { url: "https://azure.microsoft.com/en-us/services/virtual-machines/", label: 0 },
  { url: "https://digitalocean.com/pricing/droplets", label: 0 },
  { url: "https://linode.com/pricing/", label: 0 },

  // Malicious / SSRF Payloads
  { url: "http://169.254.169.254/latest/meta-data/", label: 1 }, // AWS Metadata
  { url: "http://169.254.169.254/latest/user-data/", label: 1 },
  { url: "http://localhost:8080/admin", label: 1 }, // Internal service
  { url: "http://127.0.0.1:22", label: 1 }, // Port scanning
  { url: "http://10.0.0.1/config.json", label: 1 }, // Internal network
  { url: "http://192.168.1.254/router-login", label: 1 },
  { url: "https://example.com/proxy?url=http://169.254.169.254", label: 1 }, // Param based
  { url: "https://app.com/api?target=http://localhost:6379", label: 1 }, // Attempting to hit Redis
  { url: "http://169.254.169.254@example.com/", label: 1 }, // Auth bypass obfuscation
  { url: "http://0.0.0.0:8000/", label: 1 }, // 0.0.0.0 bypass
];

// ── Logistic Regression Training (Gradient Descent) ──

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

async function train() {
  console.log("🚀 Starting Pure JS Machine Learning Training...");
  console.log(`Dataset size: ${dataset.length} labeled URLs`);

  // Initialize weights & bias to 0
  let weights = {
    isIp: 0.0,
    isInternal: 0.0,
    suspiciousParams: 0.0,
    specialChars: 0.0,
    lengthNorm: 0.0
  };
  let bias = 0.0;

  // Hyperparameters
  const LEARNING_RATE = 0.1;
  const EPOCHS = 5000;

  // Prepare training data (extract features once)
  const trainingData = dataset.map(item => ({
    features: extractFeatures(item.url),
    label: item.label
  }));

  const featureKeys = Object.keys(weights);

  console.log("\n🏃‍♂️ Running Gradient Descent...");
  
  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    let totalError = 0;

    // We will accumulate gradients over the whole dataset (Batch Gradient Descent)
    let gradients = {
      isIp: 0.0, isInternal: 0.0, suspiciousParams: 0.0, specialChars: 0.0, lengthNorm: 0.0
    };
    let biasGradient = 0.0;

    // Forward Pass & Calculate Gradients
    for (const item of trainingData) {
      const f = item.features;
      const y = item.label;

      // Calculate z: w1*x1 + w2*x2 ... + bias
      let z = bias;
      for (const key of featureKeys) {
        z += weights[key] * f[key];
      }

      // Prediction (y_hat)
      const yHat = sigmoid(z);
      
      // Error (cross-entropy proxy for display)
      const error = y - yHat;
      totalError += Math.abs(error);

      // Gradient for this sample: (yHat - y) * x
      const grad = (yHat - y); // derivative of loss * sigmoid derivative simplifies to this
      
      for (const key of featureKeys) {
        gradients[key] += grad * f[key];
      }
      biasGradient += grad;
    }

    // Backward Pass: Update Weights
    const m = trainingData.length;
    for (const key of featureKeys) {
      weights[key] -= LEARNING_RATE * (gradients[key] / m);
    }
    bias -= LEARNING_RATE * (biasGradient / m);

    // Logging
    if (epoch % 1000 === 0 || epoch === EPOCHS - 1) {
      const avgError = (totalError / m).toFixed(4);
      console.log(`Epoch ${epoch.toString().padStart(4)} | Average Absolute Error: ${avgError}`);
    }
  }

  console.log("\n✅ Training Complete!");
  console.log("\nLearned Weights:");
  console.table(weights);
  console.log("Learned Bias:", bias);

  // Quick accuracy check on training set
  let correct = 0;
  for (const item of trainingData) {
    let z = bias;
    for (const key of featureKeys) {
      z += weights[key] * item.features[key];
    }
    const pred = sigmoid(z) >= 0.5 ? 1 : 0;
    if (pred === item.label) correct++;
  }
  console.log(`\nAccuracy on training dataset: ${((correct / dataset.length) * 100).toFixed(1)}%`);

  // Save the model
  const modelData = { weights, bias, trainedAt: new Date().toISOString() };
  const outPath = path.join(__dirname, 'data', 'ml_weights.json');
  fs.writeFileSync(outPath, JSON.stringify(modelData, null, 2));
  
  console.log(`\n💾 Model saved directly to: ${outPath}`);
}

train().catch(console.error);
