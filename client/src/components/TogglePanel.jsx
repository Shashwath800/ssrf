import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * TogglePanel Component
 * 
 * DNS mode toggle with Framer Motion animated switch and layout transitions.
 */

export default function TogglePanel() {
  const [dnsMode, setDnsMode] = useState('SAFE');
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    fetch('/api/dns-mode').then(r => r.json()).then(d => setDnsMode(d.dnsMode)).catch(() => {});
  }, []);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      const response = await fetch('/api/toggle-dns', { method: 'POST' });
      const data = await response.json();
      setDnsMode(data.dnsMode);
    } catch (err) { console.error('Failed to toggle DNS mode:', err); }
    setIsToggling(false);
  };

  const isSafe = dnsMode === 'SAFE';

  return (
    <motion.div
      layout
      animate={{ borderColor: isSafe ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }}
      transition={{ duration: 0.4 }}
      className={`rounded-xl p-4 border transition-all duration-500 ${isSafe ? 'bg-green-500/5' : 'bg-red-500/5'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            key={dnsMode}
            initial={{ rotate: -30, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className={`relative w-10 h-10 rounded-lg flex items-center justify-center ${isSafe ? 'bg-green-500/20' : 'bg-red-500/20'}`}
          >
            <span className="text-xl">{isSafe ? '🛡️' : '💀'}</span>
          </motion.div>
          <div>
            <h3 className="text-sm font-semibold text-white">DNS Mode</h3>
            <motion.p key={dnsMode} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className={`text-xs ${isSafe ? 'text-green-400' : 'text-red-400'}`}>
              {isSafe ? '→ Resolves to 8.8.8.8 (Safe)' : '→ Resolves to 169.254.169.254 (Attack!)'}
            </motion.p>
          </div>
        </div>

        {/* Toggle button */}
        <motion.button onClick={handleToggle} disabled={isToggling} whileTap={{ scale: 0.9 }} className="relative">
          <div className={`w-16 h-8 rounded-full transition-colors duration-300 ${isSafe ? 'bg-green-600' : 'bg-red-600'} ${isToggling ? 'opacity-60' : ''}`}>
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
              style={{ left: isSafe ? 4 : 36 }}
            />
          </div>
        </motion.button>
      </div>

      {/* Mode badge */}
      <div className="mt-3 flex items-center gap-2">
        <motion.span key={dnsMode} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            isSafe ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
          <span className={`w-2 h-2 rounded-full ${isSafe ? 'bg-green-400' : 'bg-red-400'}`} />
          {dnsMode}
        </motion.span>
        <span className="text-xs text-slate-500">{isSafe ? 'All domains resolve to safe public IP' : 'Simulating DNS rebinding attack'}</span>
      </div>
    </motion.div>
  );
}
