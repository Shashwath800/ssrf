import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

/**
 * DnsControl Page
 * 
 * Dedicated page for managing DNS resolution mode.
 * Allows switching between SAFE and ATTACK modes,
 * with visual feedback and explanation of each mode.
 */

export default function DnsControl() {
  const [dnsMode, setDnsMode] = useState('SAFE');
  const [isToggling, setIsToggling] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch('/api/dns-mode').then(r => r.json()).then(d => setDnsMode(d.dnsMode)).catch(() => {});
  }, []);

  const switchMode = async (mode) => {
    if (mode === dnsMode) return;
    setIsToggling(true);
    try {
      const res = await fetch('/api/toggle-dns', { method: 'POST' });
      const data = await res.json();
      setDnsMode(data.dnsMode);
      setHistory(prev => [...prev, { mode: data.dnsMode, time: new Date().toLocaleTimeString() }]);
    } catch (err) {
      console.error(err);
    }
    setIsToggling(false);
  };

  const isSafe = dnsMode === 'SAFE';

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-slate-800/50 bg-bg-primary/80 backdrop-blur-xl sticky top-0 z-50"
      >
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1">
              ← Back to Dashboard
            </Link>
          </div>
          <motion.span
            key={dnsMode}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              isSafe ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'
            }`}
          >
            {dnsMode}
          </motion.span>
        </div>
      </motion.header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white mb-2">🌐 DNS Control Panel</h1>
          <p className="text-slate-400">Manage how the SSRF simulator resolves domain names. Switch between safe and attack modes to test DNS rebinding scenarios.</p>
        </motion.div>

        {/* Current Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-2xl p-8 border-2 transition-all duration-500 ${
            isSafe ? 'bg-green-500/5 border-green-500/30' : 'bg-red-500/5 border-red-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <motion.div
                key={dnsMode}
                initial={{ rotate: -90, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${
                  isSafe ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}
              >
                {isSafe ? '🛡️' : '💀'}
              </motion.div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isSafe ? 'Safe Mode' : 'Attack Mode'}
                </h2>
                <p className={`text-sm ${isSafe ? 'text-green-400' : 'text-red-400'}`}>
                  {isSafe
                    ? 'All domains resolve to 8.8.8.8 (Google DNS — safe public IP)'
                    : 'All domains resolve to 169.254.169.254 (AWS metadata — DNS rebinding!)'}
                </p>
              </div>
            </div>

            <motion.div
              key={dnsMode + '-indicator'}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`w-5 h-5 rounded-full ${isSafe ? 'bg-green-400' : 'bg-red-400'}`}
              style={{ boxShadow: isSafe ? '0 0 20px rgba(34,197,94,0.5)' : '0 0 20px rgba(239,68,68,0.5)' }}
            />
          </div>

          <div className="bg-black/20 rounded-xl p-4 font-mono text-sm">
            <div className="text-slate-500 mb-1">$ nslookup evil-attacker.com</div>
            <div className={isSafe ? 'text-green-400' : 'text-red-400'}>
              → {isSafe ? '8.8.8.8' : '169.254.169.254'}
            </div>
          </div>
        </motion.div>

        {/* Mode Switch Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => switchMode('SAFE')}
            disabled={isToggling}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${
              isSafe
                ? 'bg-green-500/10 border-green-500/50 ring-2 ring-green-500/20'
                : 'bg-bg-card border-slate-700/30 hover:border-green-500/30'
            } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🛡️</span>
              <span className="text-lg font-bold text-white">SAFE Mode</span>
              {isSafe && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold rounded-full"
                >
                  ACTIVE
                </motion.span>
              )}
            </div>
            <p className="text-sm text-slate-400 mb-3">
              All domain lookups resolve to <span className="text-green-400 font-mono">8.8.8.8</span> (Google's public DNS).
              No SSRF attack is possible in this mode.
            </p>
            <div className="text-xs text-slate-500 space-y-1">
              <div>✓ Safe for testing normal URL flows</div>
              <div>✓ IP Validator will always pass</div>
              <div>✓ No private IP exposure</div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => switchMode('ATTACK')}
            disabled={isToggling}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${
              !isSafe
                ? 'bg-red-500/10 border-red-500/50 ring-2 ring-red-500/20'
                : 'bg-bg-card border-slate-700/30 hover:border-red-500/30'
            } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">💀</span>
              <span className="text-lg font-bold text-white">ATTACK Mode</span>
              {!isSafe && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-bold rounded-full"
                >
                  ACTIVE
                </motion.span>
              )}
            </div>
            <p className="text-sm text-slate-400 mb-3">
              All domain lookups resolve to <span className="text-red-400 font-mono">169.254.169.254</span> (AWS metadata IP).
              Simulates a DNS rebinding attack.
            </p>
            <div className="text-xs text-slate-500 space-y-1">
              <div>⚠ Simulates DNS rebinding</div>
              <div>⚠ Targets AWS metadata endpoint</div>
              <div>⚠ IP Validator should block this</div>
            </div>
          </motion.button>
        </motion.div>

        {/* Explanation Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-bg-card border border-slate-700/30 rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            💡 What is DNS Rebinding?
          </h3>
          <div className="text-sm text-slate-300 space-y-3 leading-relaxed">
            <p>
              <strong className="text-white">DNS rebinding</strong> is an attack where a domain's DNS record alternates between
              a safe public IP and an internal/private IP. The attacker controls the domain and its DNS server.
            </p>
            <div className="bg-black/20 rounded-xl p-4 font-mono text-xs space-y-1">
              <div className="text-slate-500"># First DNS lookup (during validation)</div>
              <div className="text-green-400">evil.com → 8.8.8.8  ✓ passes IP check</div>
              <div className="text-slate-500 mt-2"># Second DNS lookup (during actual fetch)</div>
              <div className="text-red-400">evil.com → 169.254.169.254  ✗ targets AWS metadata!</div>
            </div>
            <p>
              The defense against this is <strong className="text-white">IP Locking</strong> — pinning the resolved IP after
              the first lookup so the fetch always uses the validated address.
            </p>
          </div>
        </motion.div>

        {/* Switch History */}
        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-card border border-slate-700/30 rounded-2xl p-6"
          >
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              🕑 Switch History
            </h3>
            <div className="space-y-2">
              {history.slice().reverse().map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${entry.mode === 'SAFE' ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-white font-medium">Switched to {entry.mode}</span>
                  </div>
                  <span className="text-slate-500 text-xs">{entry.time}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
