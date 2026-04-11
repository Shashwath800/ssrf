import { useState } from 'react';
import { motion } from 'framer-motion';
import { useScan } from '../ScanContext';

/**
 * AttackInput Component
 * 
 * Enhanced with Framer Motion hover/tap animations on buttons.
 */

const PRESETS = [
  { label: '🛡️ Safe URL', url: 'https://example.com', color: 'from-green-600 to-emerald-700', hoverColor: 'hover:from-green-500 hover:to-emerald-600', description: 'Tests a safe, public URL' },
  { label: '☁️ AWS Metadata', url: 'http://169.254.169.254/latest/meta-data/', color: 'from-orange-600 to-red-700', hoverColor: 'hover:from-orange-500 hover:to-red-600', description: 'Simulates AWS metadata access' },
  { label: '🏠 Localhost', url: 'http://localhost:8080/admin', color: 'from-purple-600 to-pink-700', hoverColor: 'hover:from-purple-500 hover:to-pink-600', description: 'Attempts localhost access' },
];

const HACK_ATTACKS = [
  { name: 'DNS Rebinding', url: 'http://evil-rebind.attacker.com/steal' },
  { name: 'AWS Metadata Access', url: 'http://169.254.169.254/latest/meta-data/' },
  { name: 'Localhost Admin', url: 'http://localhost:8080/admin' },
  { name: 'Internal Service', url: 'http://192.168.1.1/api/config' },
  { name: 'IPv6 Loopback', url: 'http://[::1]:3000/secret' },
];

export default function AttackInput() {
  const { isScanning, runScan } = useScan();
  const [url, setUrl] = useState('');
  const [hackProgress, setHackProgress] = useState(-1);

  const handleSubmit = (e) => { e.preventDefault(); runScan(url); };

  const runHackSequence = async () => {
    for (let i = 0; i < HACK_ATTACKS.length; i++) {
      setHackProgress(i);
      await runScan(HACK_ATTACKS[i].url);
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
    setHackProgress(-1);
  };

  return (
    <div className="space-y-5">
      {/* URL Input */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <span className="text-slate-500 text-sm">🔗</span>
          </div>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to scan (e.g. http://example.com)"
            className="w-full pl-9 pr-4 py-3 bg-bg-card border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
            disabled={isScanning}
          />
        </div>
        <motion.button type="submit" disabled={isScanning || !url}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          {isScanning ? (
            <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Scanning...</>
          ) : (<>🔍 Run Scan</>)}
        </motion.button>
      </form>

      {/* Preset Buttons */}
      <div className="grid grid-cols-3 gap-3">
        {PRESETS.map((preset, i) => (
          <motion.button key={preset.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => { setUrl(preset.url); runScan(preset.url); }}
            disabled={isScanning}
            className={`group p-3 bg-gradient-to-br ${preset.color} ${preset.hoverColor} rounded-xl text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
          >
            <div className="text-sm font-bold text-white">{preset.label}</div>
            <div className="text-xs text-white/60 mt-0.5">{preset.description}</div>
          </motion.button>
        ))}
      </div>

      {/* Hack Me Button */}
      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={runHackSequence} disabled={isScanning}
        className="w-full py-4 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:from-red-500 hover:via-pink-500 hover:to-purple-500 text-white font-bold text-base rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-500/20 hover:shadow-red-500/30 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        <span className="relative z-10">
          {hackProgress >= 0 ? `⚔️ Running Attack ${hackProgress + 1}/${HACK_ATTACKS.length}: ${HACK_ATTACKS[hackProgress].name}` : 'Try to Hack Me 😈'}
        </span>
      </motion.button>
    </div>
  );
}
