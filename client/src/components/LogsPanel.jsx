import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * LogsPanel Component
 * 
 * Terminal-styled scrollable log panel with Framer Motion entry animations.
 */

export default function LogsPanel({ logs = [] }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'PASS': return 'text-green-400';
      case 'BLOCK': return 'text-red-400';
      case 'ERROR': return 'text-red-500';
      default: return 'text-yellow-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PASS': return '✓';
      case 'BLOCK': return '✗';
      case 'ERROR': return '⚠';
      default: return '●';
    }
  };

  const formatTime = (timestamp) => {
    try { return new Date(timestamp).toLocaleTimeString('en-US', { hour12: false }); }
    catch { return '--:--:--'; }
  };

  return (
    <div className="bg-terminal-bg border border-terminal-border rounded-xl overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b22] border-b border-terminal-border">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-xs text-slate-500 ml-2 font-mono">
          ssrf-defense-logs — {logs.length} entries
        </span>
      </div>

      {/* Terminal body */}
      <div ref={scrollRef} className="p-4 font-mono text-xs leading-6 max-h-[320px] overflow-y-auto" style={{ fontFamily: 'var(--font-mono)' }}>
        {logs.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-600">
            <p>$ ssrf-scanner --watch</p>
            <p className="text-slate-500 mt-1 terminal-cursor">Waiting for scan input...</p>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {logs.map((log, i) => (
              <motion.div
                key={`${i}-${log.timestamp}`}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30, delay: Math.min(i * 0.02, 0.3) }}
                className="flex gap-2 hover:bg-white/3 px-1 rounded transition-colors overflow-hidden"
              >
                <span className="text-slate-600 shrink-0 select-none">{formatTime(log.timestamp)}</span>
                <span className={`shrink-0 w-4 text-center ${getStatusColor(log.status)}`}>{getStatusIcon(log.status)}</span>
                <span className="text-blue-400 shrink-0">[{log.step}]</span>
                <span className={`${getStatusColor(log.status)} break-all`}>{log.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {logs.length > 0 && (
          <div className="mt-2 text-slate-600"><span className="terminal-cursor">$</span></div>
        )}
      </div>
    </div>
  );
}
