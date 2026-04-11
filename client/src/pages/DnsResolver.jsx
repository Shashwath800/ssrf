import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const API = '/api';
const privateRe = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.)/;

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function InlineIpEditor({ domain, currentIP, onInstantUpdate }) {
  const [ip, setIp] = useState(currentIP);
  const [flash, setFlash] = useState(false);

  useEffect(() => { setIp(currentIP); }, [currentIP]);

  const apply = (newIP) => {
    const val = newIP || ip;
    setIp(val);
    onInstantUpdate(domain, val);
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
  };

  const presets = [
    { label: '☁️ Metadata', ip: '169.254.169.254', color: 'red' },
    { label: '🏠 Localhost', ip: '127.0.0.1', color: 'yellow' },
    { label: '✅ Safe', ip: '8.8.8.8', color: 'green' },
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <input value={ip} onChange={e => setIp(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && apply()}
          className={`w-[130px] px-2 py-1 bg-bg-primary border rounded text-[11px] font-mono text-white focus:outline-none transition-all ${
            flash ? 'border-yellow-500 ring-1 ring-yellow-500/30' : 'border-slate-700/50 focus:border-indigo-500/50'
          }`} />
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => apply()}
          className="px-2 py-1 bg-gradient-to-r from-yellow-600/80 to-orange-600/80 text-white text-[10px] font-bold rounded hover:from-yellow-500 hover:to-orange-500 transition-all">
          Apply ⚡
        </motion.button>
      </div>
      <div className="flex gap-1">
        {presets.map(p => (
          <motion.button key={p.ip} whileTap={{ scale: 0.9 }}
            onClick={() => { setIp(p.ip); apply(p.ip); }}
            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all border ${
              p.color === 'red' ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' :
              p.color === 'yellow' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20' :
              'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
            }`}>{p.label}</motion.button>
        ))}
      </div>
    </div>
  );
}

function RecordsTable({ records, onDelete, onEdit, onInstantUpdate }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700/50 text-slate-500 uppercase tracking-wider">
            <th className="text-left py-2 px-3 font-semibold">Domain</th>
            <th className="text-left py-2 px-3 font-semibold">Type</th>
            <th className="text-left py-2 px-3 font-semibold">Live IP Control</th>
            <th className="text-left py-2 px-3 font-semibold">All IPs</th>
            <th className="text-left py-2 px-3 font-semibold">TTL</th>
            <th className="text-left py-2 px-3 font-semibold">Mode</th>
            <th className="text-left py-2 px-3 font-semibold">Status</th>
            <th className="text-right py-2 px-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {records.map((r) => (
              <motion.tr key={r.domain} layout
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                className="border-b border-slate-800/30 hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-2.5 px-3 font-mono text-indigo-300 text-[11px]">{r.domain}</td>
                <td className="py-2.5 px-3 text-slate-400">{r.type}</td>
                <td className="py-2.5 px-3">
                  <InlineIpEditor domain={r.domain} currentIP={r.currentIP} onInstantUpdate={onInstantUpdate} />
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex flex-wrap gap-1">
                    {r.ips.map((ip, i) => (
                      <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        ip === r.currentIP ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30' : 'bg-slate-800 text-slate-500'
                      }`}>{ip}</span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-400">{r.ttl}s</td>
                <td className="py-2.5 px-3">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    r.mode === 'rebinding' ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'
                  }`}>{r.mode.toUpperCase()}</span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="flex items-center gap-1 text-green-400 text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />{r.status}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right space-x-2">
                  <button onClick={() => onEdit(r)} className="text-indigo-400 hover:text-indigo-300 text-[10px] font-semibold">Edit</button>
                  <button onClick={() => onDelete(r.domain)} className="text-red-400 hover:text-red-300 text-[10px] font-semibold">Delete</button>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
          {records.length === 0 && (
            <tr><td colSpan={8} className="py-8 text-center text-slate-600 text-xs">No DNS records. Add one above.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RedirectsTable({ records, onDelete, onEdit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700/50 text-slate-500 uppercase tracking-wider">
            <th className="text-left py-2 px-3 font-semibold">Domain</th>
            <th className="text-left py-2 px-3 font-semibold">Target (URL or CNAME)</th>
            <th className="text-right py-2 px-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {records.map((r) => (
              <motion.tr key={r.domain} layout
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                className="border-b border-slate-800/30 hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-2.5 px-3 font-mono text-indigo-300 text-[11px]">{r.domain}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-400 text-xs font-bold">302 🔀</span>
                    <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded text-[10px] font-mono">
                      {r.redirectTarget}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right space-x-2">
                  <button onClick={() => onEdit(r)} className="text-indigo-400 hover:text-indigo-300 text-[10px] font-semibold">Edit</button>
                  <button onClick={() => onDelete(r.domain)} className="text-red-400 hover:text-red-300 text-[10px] font-semibold">Delete</button>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
          {records.length === 0 && (
            <tr><td colSpan={3} className="py-8 text-center text-slate-600 text-xs">No redirect rules. Add one above.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RecordForm({ editRecord, onSave, onCancel }) {
  const [domain, setDomain] = useState(editRecord?.domain || '');
  const [ips, setIps] = useState(editRecord?.ips?.join(', ') || '');
  const [ttl, setTtl] = useState(editRecord?.ttl || 1);
  const [mode, setMode] = useState(editRecord?.mode || 'static');

  useEffect(() => { 
    if (editRecord) { 
      setDomain(editRecord.domain); 
      setIps(editRecord.ips.join(', ')); 
      setTtl(editRecord.ttl); 
      setMode(editRecord.mode); 
    } 
  }, [editRecord]);

  const handleSubmit = (e) => { 
    e.preventDefault(); 
    onSave({ 
      domain, 
      ips: ips.split(',').map(s => s.trim()).filter(Boolean), 
      ttl: Number(ttl), 
      mode, 
      type: 'A' 
    }); 
    if (!editRecord) { 
      setDomain(''); setIps(''); setTtl(1); setMode('static');
    } 
  };
  
  const ic = "w-full px-3 py-2 bg-bg-primary border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[10px] text-slate-500 uppercase font-semibold mb-1 block">Domain</label>
          <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="evil.attacker.com" className={ic} required disabled={!!editRecord} /></div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-semibold mb-1 block">IP Address(es) <span className="text-slate-600">comma-separated</span></label>
          <input value={ips} onChange={e => setIps(e.target.value)} placeholder="8.8.8.8, 169.254.169.254" className={ic} required />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <div><label className="text-[10px] text-slate-500 uppercase font-semibold mb-1 block">TTL (seconds)</label>
          <input type="number" min={1} value={ttl} onChange={e => setTtl(e.target.value)} className={ic} /></div>
        <div><label className="text-[10px] text-slate-500 uppercase font-semibold mb-1 block">Mode</label>
          <select value={mode} onChange={e => setMode(e.target.value)} className={`${ic} appearance-none`}>
            <option value="static">Static</option>
            <option value="rebinding">Rebinding</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 text-white text-xs font-bold rounded-lg">
            {editRecord ? '💾 Update' : '+ Add Record'}</motion.button>
          {editRecord && <button type="button" onClick={onCancel} className="px-3 py-2 bg-slate-800 text-slate-400 text-xs rounded-lg hover:bg-slate-700">Cancel</button>}
        </div>
      </div>
      {mode === 'rebinding' && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-xs text-red-300">
          ⚠ <strong>Rebinding mode:</strong> DNS rotates through IPs every {ttl}s.
        </motion.div>
      )}
    </form>
  );
}

function RedirectForm({ editRecord, onSave, onCancel }) {
  const [domain, setDomain] = useState(editRecord?.domain || '');
  const [redirectTarget, setRedirectTarget] = useState(editRecord?.redirectTarget || '');

  useEffect(() => { 
    if (editRecord) { 
      setDomain(editRecord.domain); 
      setRedirectTarget(editRecord.redirectTarget || '');
    } 
  }, [editRecord]);

  const handleSubmit = (e) => { 
    e.preventDefault(); 
    onSave({ 
      domain, 
      ips: ['8.8.8.8'], // Mock safe IP to pass initial validator
      ttl: 300, 
      mode: 'redirect', 
      redirectTarget,
      type: 'A' 
    }); 
    if (!editRecord) { 
      setDomain(''); setRedirectTarget('');
    } 
  };
  
  const ic = "w-full px-3 py-2 bg-bg-primary border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[10px] text-slate-500 uppercase font-semibold mb-1 block">Domain</label>
          <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="evil-redirect.com" className={ic} required disabled={!!editRecord} /></div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-semibold mb-1 block">Target URL or CNAME</label>
          <input value={redirectTarget} onChange={e => setRedirectTarget(e.target.value)} placeholder="http://169.254.169.254/ or internal.local" className={ic} required />
        </div>
      </div>
      <div className="flex items-end gap-2 mt-2">
        <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-bold rounded-lg">
          {editRecord ? '💾 Update Rule' : '+ Add Redirect Rule'}</motion.button>
        {editRecord && <button type="button" onClick={onCancel} className="px-3 py-2 bg-slate-800 text-slate-400 text-xs rounded-lg hover:bg-slate-700">Cancel</button>}
      </div>
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
        className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300 mt-2">
        ℹ <strong>Note:</strong> Redirection occurs at Layer 8. The pipeline will initially resolve this domain via a safe mocked IP to bypass network firewall validations.
      </motion.div>
    </form>
  );
}

function LiveResolution({ domain, ips, currentIP, ttl, ttlRemaining, mode, redirectTarget }) {
  const isPriv = privateRe.test(currentIP);
  const pct = mode === 'rebinding' && ttl > 0 ? Math.max(0, (ttlRemaining / (ttl * 1000)) * 100) : 100;
  return (
    <div className="bg-bg-primary/50 rounded-lg p-3 border border-slate-700/30">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-indigo-300 text-xs">{domain}</span>
        {mode === 'rebinding' && <span className="text-[10px] text-yellow-400 font-mono">TTL: {Math.ceil((ttlRemaining || 0) / 1000)}s</span>}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {ips.map((ip, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <motion.span animate={{ scale: ip === currentIP ? 1.05 : 0.95, opacity: ip === currentIP ? 1 : 0.4 }}
              className={`px-2 py-1 rounded text-[11px] font-mono font-bold ${
                ip === currentIP ? (privateRe.test(ip) ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50' : 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50') : 'bg-slate-800 text-slate-500'
              }`}>{ip}</motion.span>
            {i < ips.length - 1 && <span className="text-slate-600 text-[10px]">→</span>}
          </div>
        ))}
        {mode === 'redirect' && (
          <div className="flex items-center gap-1.5 ml-2 mt-1">
            <span className="text-blue-400 text-[10px] font-bold">302 🔀</span>
            <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded text-[10px] font-mono">
              {redirectTarget}
            </span>
          </div>
        )}
      </div>
      {mode === 'rebinding' && (
        <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
          <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }}
            className={`h-full rounded-full ${pct < 30 ? 'bg-red-500' : pct < 60 ? 'bg-yellow-500' : 'bg-green-500'}`} />
        </div>
      )}
    </div>
  );
}

function DnsQueryLog({ logs }) {
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [logs]);
  const eventColor = (e) => {
    switch (e) {
      case 'REBOUND': case 'ATTACK': return 'text-red-400';
      case 'TTL_EXPIRE': case 'DNS_CHANGED': return 'text-yellow-400';
      case 'STATIC': case 'RESOLVE': return 'text-green-400';
      default: return 'text-slate-400';
    }
  };
  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/80" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" /><div className="w-2.5 h-2.5 rounded-full bg-green-500/80" /></div>
        <span className="text-[10px] text-slate-500 ml-2 font-mono">dns-query-log — {logs.length} entries</span>
      </div>
      <div ref={scrollRef} className="p-3 font-mono text-[11px] leading-5 max-h-[250px] overflow-y-auto">
        {logs.length === 0 ? <div className="text-slate-600">$ Waiting for DNS queries...</div> :
          logs.slice(0, 60).map((l, i) => (
            <motion.div key={l.time + '-' + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }} className="flex gap-2 hover:bg-white/[0.02] px-1 rounded">
              <span className="text-slate-600 shrink-0">{new Date(l.time).toLocaleTimeString('en-US', { hour12: false })}</span>
              <span className={`shrink-0 font-bold w-20 ${eventColor(l.event)}`}>{l.event}</span>
              <span className="text-blue-400 shrink-0">{l.domain}</span>
              <span className="text-slate-600">→</span>
              <span className={`font-bold ${privateRe.test(l.ip) ? 'text-red-400' : 'text-green-400'}`}>{l.ip}</span>
              {l.note && <span className="text-slate-600 truncate ml-1 hidden xl:inline">— {l.note}</span>}
            </motion.div>
          ))
        }
      </div>
    </div>
  );
}

function NetworkSvg({ domain, currentIP, querying, dnsEvent }) {
  const isPriv = privateRe.test(currentIP || '');
  const ipColor = isPriv ? '#ef4444' : '#22c55e';
  const showAttackLabel = dnsEvent === 'ATTACK' || dnsEvent === 'DNS_CHANGED';

  return (
    <svg viewBox="0 0 500 130" className="w-full" style={{ minHeight: '110px' }}>
      <defs>
        <filter id="svg-glow-g" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="b" /><feFlood floodColor="#22c55e" floodOpacity="0.4" result="c" />
          <feComposite in="c" in2="b" operator="in" result="s" /><feMerge><feMergeNode in="s" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="svg-glow-r" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="b" /><feFlood floodColor="#ef4444" floodOpacity="0.5" result="c" />
          <feComposite in="c" in2="b" operator="in" result="s" /><feMerge><feMergeNode in="s" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <path id="q-path" d="M 85 65 L 250 65 L 415 65" fill="none" />
      </defs>

      {/* Client */}
      <rect x="10" y="40" width="75" height="50" rx="10" fill="#334155" stroke="#475569" strokeWidth="1.5" />
      <text x="47" y="60" textAnchor="middle" fontSize="14">💻</text>
      <text x="47" y="77" textAnchor="middle" fontSize="8" fill="#94a3b8">Client</text>

      {/* Arrows */}
      <line x1="85" y1="65" x2="165" y2="65" stroke="#475569" strokeWidth="1.5" />
      <line x1="335" y1="65" x2="415" y2="65" stroke={ipColor} strokeWidth="1.5" />
      <text x="125" y="55" textAnchor="middle" fontSize="7" fill="#64748b">Query</text>
      <text x="375" y="55" textAnchor="middle" fontSize="7" fill="#64748b">Response</text>

      {/* DNS Server */}
      <motion.rect x="165" y="35" width="170" height="60" rx="12" fill="#1e293b"
        animate={{ stroke: showAttackLabel ? '#f59e0b' : '#6366f1' }}
        strokeWidth="1.5">
        {showAttackLabel && <animate attributeName="stroke-opacity" values="1;0.3;1" dur="0.4s" repeatCount="3" />}
      </motion.rect>
      <text x="250" y="57" textAnchor="middle" fontSize="12">🌐</text>
      <text x="250" y="73" textAnchor="middle" fontSize="8" fill="#a5b4fc" fontWeight="600">DNS Server</text>
      <text x="250" y="85" textAnchor="middle" fontSize="7" fill="#64748b" fontFamily="monospace">{domain || '...'}</text>

      {/* Resolved IP */}
      <motion.rect x="415" y="40" width="75" height="50" rx="10"
        animate={{ fill: ipColor + '20', stroke: ipColor }}
        transition={{ duration: 0.3 }}
        strokeWidth="1.5" filter={isPriv ? 'url(#svg-glow-r)' : 'url(#svg-glow-g)'} />
      <text x="452" y="60" textAnchor="middle" fontSize="11">🎯</text>
      <motion.text key={currentIP} x="452" y="77" textAnchor="middle" fontSize="7" fontFamily="monospace" fontWeight="700"
        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0, fill: ipColor }}>
        {currentIP || '...'}
      </motion.text>

      {/* Attack label */}
      <AnimatePresence>
        {showAttackLabel && (
          <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <rect x="170" y="6" width="160" height="18" rx="4" fill="#f59e0b20" stroke="#f59e0b" strokeWidth="1" />
            <text x="250" y="18" textAnchor="middle" fontSize="8" fill="#f59e0b" fontWeight="700">⚡ DNS Modified During Execution</text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* Animated dot */}
      {querying && (
        <circle r="4" fill="#818cf8">
          <animateMotion dur="1.2s" repeatCount="indefinite"><mpath href="#q-path" /></animateMotion>
          <animate attributeName="opacity" values="0.5;1;0.5" dur="0.6s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}


/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */

export default function DnsResolver() {
  const [records, setRecords] = useState([]);
  const [logs, setLogs] = useState([]);
  const [editRecord, setEditRecord] = useState(null);
  const [autoRebind, setAutoRebind] = useState(false);
  const [queryDomain, setQueryDomain] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [querying, setQuerying] = useState(false);
  const [lastDnsEvent, setLastDnsEvent] = useState(null);
  const [activeFormTab, setActiveFormTab] = useState('standard');
  const [activeTableTab, setActiveTableTab] = useState('standard');
  const timerRef = useRef(null);

  const fetchRecords = useCallback(async () => {
    try { const r = await fetch(`${API}/dns-records`); const d = await r.json(); setRecords(d.records || []); } catch {}
  }, []);

  const fetchLogs = useCallback(async () => {
    try { const r = await fetch(`${API}/dns-logs?limit=100`); const d = await r.json(); setLogs(d.logs || []); } catch {}
  }, []);

  useEffect(() => { fetchRecords(); fetchLogs(); }, [fetchRecords, fetchLogs]);

  useEffect(() => {
    if (autoRebind) { timerRef.current = setInterval(() => { fetchRecords(); fetchLogs(); }, 1000); }
    else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [autoRebind, fetchRecords, fetchLogs]);

  // ── Instant DNS update ──
  const handleInstantUpdate = async (domain, ip) => {
    try {
      const res = await fetch(`${API}/update-dns-instant`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, ip }),
      });
      const data = await res.json();
      // Immediately update local state from response
      if (data.records) setRecords(data.records);
      if (data.recentLogs) setLogs(prev => {
        const merged = [...data.recentLogs, ...prev.filter(l => !data.recentLogs.some(n => n.time === l.time))];
        return merged.sort((a, b) => b.time - a.time).slice(0, 100);
      });
      // Flash the SVG
      const isPriv = privateRe.test(ip);
      setLastDnsEvent(isPriv ? 'ATTACK' : 'DNS_CHANGED');
      setTimeout(() => setLastDnsEvent(null), 2000);
      // Update query result if same domain
      if (queryResult?.domain === domain) {
        setQueryResult(prev => ({ ...prev, ips: [ip] }));
      }
    } catch (err) { console.error(err); }
  };

  const handleSave = async (data) => {
    await fetch(`${API}/dns-record`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    setEditRecord(null); fetchRecords();
  };

  const handleDelete = async (domain) => {
    await fetch(`${API}/dns-record/${encodeURIComponent(domain)}`, { method: 'DELETE' });
    fetchRecords();
  };

  const handleResolve = async () => {
    if (!queryDomain) return;
    setQuerying(true);
    try { const r = await fetch(`${API}/resolve?domain=${encodeURIComponent(queryDomain)}`); setQueryResult(await r.json()); fetchLogs(); } catch {}
    setTimeout(() => setQuerying(false), 1200);
  };

  const sV = { hidden: { opacity: 0, y: 20 }, visible: (i) => ({ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22, delay: i * 0.08 } }) };

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="border-b border-slate-800/50 bg-bg-primary/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-400 hover:text-white transition-colors text-sm">← Dashboard</Link>
            <div className="w-px h-6 bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <span className="text-base">🌐</span>
              </div>
              <div>
                <h1 className="text-base font-bold text-white">DNS Resolver</h1>
                <p className="text-[10px] text-slate-500">Attacker-Controlled DNS — Live IP Mutation</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700/50">{records.length} records</span>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setAutoRebind(!autoRebind)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                autoRebind ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700/50'
              }`}>
              {autoRebind ? '⚡ Auto-Rebind ON' : '⚡ Auto-Rebind OFF'}
            </motion.button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Row 1: Add Record + Network Viz */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <motion.div custom={0} initial="hidden" animate="visible" variants={sV}
            className="lg:col-span-3 bg-bg-card border border-slate-700/30 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />{editRecord ? 'Edit Configuration' : 'Add Configuration'}
              </h2>
              <div className="flex items-center bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                <button type="button" onClick={() => { setActiveFormTab('standard'); if (editRecord && editRecord.mode === 'redirect') setEditRecord(null); }}
                  className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${activeFormTab === 'standard' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                  🌐 IP Records
                </button>
                <button type="button" onClick={() => { setActiveFormTab('redirect'); if (editRecord && editRecord.mode !== 'redirect') setEditRecord(null); }}
                  className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${activeFormTab === 'redirect' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                  🔀 Redirects
                </button>
              </div>
            </div>
            
            {activeFormTab === 'standard' ? (
              <RecordForm editRecord={editRecord && editRecord.mode !== 'redirect' ? editRecord : null} onSave={handleSave} onCancel={() => setEditRecord(null)} />
            ) : (
              <RedirectForm editRecord={editRecord && editRecord.mode === 'redirect' ? editRecord : null} onSave={handleSave} onCancel={() => setEditRecord(null)} />
            )}
          </motion.div>
          <motion.div custom={1} initial="hidden" animate="visible" variants={sV}
            className="lg:col-span-2 bg-bg-card border border-slate-700/30 rounded-2xl p-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />Quick Resolve
            </h2>
            <div className="flex gap-2 mb-3">
              <input value={queryDomain} onChange={e => setQueryDomain(e.target.value)} placeholder="Type domain..."
                onKeyDown={e => e.key === 'Enter' && handleResolve()}
                className="flex-1 px-3 py-2 bg-bg-primary border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono" />
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleResolve}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-700 text-white text-xs font-bold rounded-lg">🔍 Resolve</motion.button>
            </div>
            <NetworkSvg domain={queryDomain || records[0]?.domain || 'example.com'} currentIP={queryResult?.ips?.[0] || records[0]?.currentIP} querying={querying} dnsEvent={lastDnsEvent} />
          </motion.div>
        </div>

        {/* Row 2: Records Table with inline editing */}
        <motion.div custom={2} initial="hidden" animate="visible" variants={sV}
          className="bg-bg-card border border-slate-700/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-700/30 pb-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />Domain Configurations
              <span className="text-[10px] font-normal text-slate-600 ml-1 hidden sm:inline">— Edit IP inline or use quick attack buttons</span>
            </h2>
            <div className="flex items-center bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
              <button onClick={() => setActiveTableTab('standard')}
                className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${activeTableTab === 'standard' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                A Records
              </button>
              <button onClick={() => setActiveTableTab('redirect')}
                className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${activeTableTab === 'redirect' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                Redirect Rules
              </button>
            </div>
          </div>
          
          {activeTableTab === 'standard' ? (
            <RecordsTable records={records.filter(r => r.mode !== 'redirect')} onDelete={handleDelete} onEdit={(r) => { setEditRecord(r); setActiveFormTab('standard'); }} onInstantUpdate={handleInstantUpdate} />
          ) : (
            <RedirectsTable records={records.filter(r => r.mode === 'redirect')} onDelete={handleDelete} onEdit={(r) => { setEditRecord(r); setActiveFormTab('redirect'); }} />
          )}
        </motion.div>

        {/* Row 3: Live Resolution + Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <motion.div custom={3} initial="hidden" animate="visible" variants={sV}
            className="bg-bg-card border border-slate-700/30 rounded-2xl p-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />Live DNS Resolution
              {autoRebind && <span className="text-[10px] text-yellow-400 font-normal ml-1">● live</span>}
            </h2>
            <div className="space-y-2">
              {records.filter(r => r.mode === 'rebinding').length > 0 ? (
                records.filter(r => r.mode === 'rebinding').map(r => (
                  <LiveResolution key={r.domain} {...r} />
                ))
              ) : <div className="text-xs text-slate-600 py-4 text-center">No rebinding records</div>}

              {records.filter(r => r.mode === 'redirect').length > 0 && (
                <>
                  <div className="text-[10px] text-slate-600 uppercase font-semibold mt-3 mb-1">Redirect Records</div>
                  {records.filter(r => r.mode === 'redirect').map(r => <LiveResolution key={r.domain} {...r} />)}
                </>
              )}

              {records.filter(r => r.mode === 'static').length > 0 && (
                <>
                  <div className="text-[10px] text-slate-600 uppercase font-semibold mt-3 mb-1">Static Records</div>
                  {records.filter(r => r.mode === 'static').map(r => <LiveResolution key={r.domain} {...r} />)}
                </>
              )}
            </div>
          </motion.div>
          <motion.div custom={4} initial="hidden" animate="visible" variants={sV}
            className="bg-bg-card border border-slate-700/30 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />DNS Query Log
              </h2>
              <button onClick={async () => { await fetch(`${API}/dns-logs/clear`, { method: 'POST' }); setLogs([]); }}
                className="text-[10px] text-slate-600 hover:text-slate-400">Clear</button>
            </div>
            <DnsQueryLog logs={logs} />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
