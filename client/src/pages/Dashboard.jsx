import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PipelineSVG from '../components/PipelineSVG';
import AttackInput from '../components/AttackInput';
import LogsPanel from '../components/LogsPanel';
import TogglePanel from '../components/TogglePanel';

/**
 * Dashboard Page
 * 
 * Main page with Framer Motion section reveal animations.
 */

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 22, delay: i * 0.12 },
  }),
};

export default function Dashboard() {
  const [scanResult, setScanResult] = useState(null);
  const [allLogs, setAllLogs] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);

  const handleScanStart = useCallback(() => setIsScanning(true), []);

  const handleScanResult = useCallback((result) => {
    setIsScanning(false);
    setScanResult(result);
    setAllLogs(prev => [
      ...prev,
      { timestamp: new Date().toISOString(), step: 'Scanner', status: 'INFO', message: `─── Scanning: ${result.url} ───` },
      ...result.logs,
      { timestamp: new Date().toISOString(), step: 'Result', status: result.status === 'BLOCKED' ? 'BLOCK' : 'PASS', message: `Final verdict: ${result.status}` },
    ]);
    setScanHistory(prev => [...prev, { url: result.url, status: result.status, time: new Date().toLocaleTimeString() }]);
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="border-b border-slate-800/50 bg-bg-primary/80 backdrop-blur-xl sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20"
            >
              <span className="text-lg">🛡️</span>
            </motion.div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">SSRF Defense Simulator</h1>
              <p className="text-xs text-slate-500">Real-time attack pipeline visualization</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {scanResult && (
              <motion.span
                key={scanResult.status + scanHistory.length}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                  scanResult.status === 'BLOCKED'
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                    : 'bg-green-500/15 text-green-400 border border-green-500/30'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${scanResult.status === 'BLOCKED' ? 'bg-red-400' : 'bg-green-400'}`} />
                Last: {scanResult.status}
              </motion.span>
            )}
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/50">
              {scanHistory.length} scans
            </span>
            <Link to="/dns-resolver" className="px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-600/20 to-blue-600/20 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/50 hover:text-white transition-all">
              🌐 DNS Resolver
            </Link>

          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Top row: Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div custom={0} initial="hidden" animate="visible" variants={sectionVariants}
            className="lg:col-span-2 bg-bg-card border border-slate-700/30 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />Attack Input
            </h2>
            <AttackInput onScanResult={handleScanResult} onScanStart={handleScanStart} isScanning={isScanning} />
          </motion.div>

          <motion.div custom={1} initial="hidden" animate="visible" variants={sectionVariants}
            className="bg-bg-card border border-slate-700/30 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />DNS Rebinding Control
            </h2>
            <TogglePanel />
            {scanHistory.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-4 border-t border-slate-700/30">
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Recent Scans</h3>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {scanHistory.slice(-5).reverse().map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 truncate max-w-[140px]">{s.url}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${s.status === 'BLOCKED' ? 'text-red-400' : 'text-green-400'}`}>{s.status}</span>
                        <span className="text-slate-600">{s.time}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Pipeline */}
        <motion.div custom={2} initial="hidden" animate="visible" variants={sectionVariants}
          className="bg-bg-card border border-slate-700/30 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />Defense Pipeline
            <span className="text-xs font-normal text-slate-600 ml-2">Click nodes for details</span>
          </h2>
          <PipelineSVG steps={scanResult?.steps || []} isRunning={isScanning} />
        </motion.div>

        {/* Logs */}
        <motion.div custom={3} initial="hidden" animate="visible" variants={sectionVariants}
          className="bg-bg-card border border-slate-700/30 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />Defense Logs
            <span className="text-xs font-normal text-slate-600 ml-2">Real-time pipeline output</span>
          </h2>
          <LogsPanel logs={allLogs} />
        </motion.div>
      </main>

      <footer className="border-t border-slate-800/50 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-slate-600">
          <span>SSRF Defense Simulator v1.0 — Educational use only</span>
          <span>All attacks are simulated • No real network requests made</span>
        </div>
      </footer>
    </div>
  );
}
