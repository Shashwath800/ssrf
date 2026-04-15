import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const SEVERITY_STYLES = {
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  low: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', dot: 'bg-cyan-400' },
  info: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', dot: 'bg-slate-500' },
};

const TYPE_ICONS = {
  SSRF_BLOCKED: 'fa-shield-alt',
  EXPLOIT_SUCCESS: 'fa-skull-crossbones',
  ANALYSIS_COMPLETED: 'fa-search',
  DNS_REBINDING: 'fa-exchange-alt',
  DNS_REDIRECT: 'fa-directions',
  DNS_ATTACK: 'fa-bolt',
  SCAN_STARTED: 'fa-play-circle',
  SCAN_COMPLETED: 'fa-check-circle',
  STEP_PASS: 'fa-arrow-right',
  STEP_BLOCK: 'fa-ban',
  WEBHOOK_FIRED: 'fa-bell',
  RISK_ANALYSIS: 'fa-chart-bar',
};

export default function LiveMonitor() {
  const [events, setEvents] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sevFilter, setSevFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const [evtRes, metRes] = await Promise.all([
        fetch('/api/events?limit=100'),
        fetch('/api/events/metrics'),
      ]);
      const evtData = await evtRes.json();
      const metData = await metRes.json();
      setEvents(evtData.events || []);
      setMetrics(metData);
    } catch {}
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 3s
  useEffect(() => {
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const clearAll = async () => {
    await fetch('/api/events', { method: 'DELETE' });
    fetchData();
  };

  // Filter events
  const filtered = events.filter(e => {
    if (filter !== 'all' && e.source !== filter) return false;
    if (sevFilter !== 'all' && e.severity !== sevFilter) return false;
    return true;
  });

  const sev = (s) => SEVERITY_STYLES[s] || SEVERITY_STYLES.info;

  return (
    <div className="min-h-screen p-6 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="text-center mb-8">
          <Link to="/" className="text-cyan-400 hover:underline text-sm mb-4 inline-flex items-center gap-2">
            <i className="fas fa-arrow-left"></i> BACK TO DASHBOARD
          </Link>
          <h1 className="text-5xl font-black text-white mt-4 orbitron-title tracking-tighter">
            LIVE <span className="text-emerald-400">MONITOR</span>
          </h1>
          <p className="mt-2 text-slate-500 text-sm flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-time security event stream — auto-refreshing every 3s
          </p>
        </header>

        {/* Metrics Row */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-black/60 border border-slate-800 rounded-xl p-4 text-center backdrop-blur-sm">
              <div className="text-3xl font-black text-white">{metrics.total}</div>
              <div className="text-[10px] text-slate-500 tracking-widest uppercase mt-1">Total Events</div>
            </div>
            <div className="bg-black/60 border border-red-900/30 rounded-xl p-4 text-center backdrop-blur-sm">
              <div className="text-3xl font-black text-red-400">{(metrics.bySeverity?.critical || 0) + (metrics.bySeverity?.high || 0)}</div>
              <div className="text-[10px] text-red-500/60 tracking-widest uppercase mt-1">High / Critical</div>
            </div>
            <div className="bg-black/60 border border-orange-900/30 rounded-xl p-4 text-center backdrop-blur-sm">
              <div className="text-3xl font-black text-orange-400">{metrics.byType?.SSRF_BLOCKED || 0}</div>
              <div className="text-[10px] text-orange-500/60 tracking-widest uppercase mt-1">Blocked</div>
            </div>
            <div className="bg-black/60 border border-red-900/30 rounded-xl p-4 text-center backdrop-blur-sm">
              <div className="text-3xl font-black text-red-500">{metrics.byType?.EXPLOIT_SUCCESS || 0}</div>
              <div className="text-[10px] text-red-500/60 tracking-widest uppercase mt-1">Exploits</div>
            </div>
            <div className="bg-black/60 border border-cyan-900/30 rounded-xl p-4 text-center backdrop-blur-sm">
              <div className="text-3xl font-black text-cyan-400">{metrics.byType?.ANALYSIS_COMPLETED || 0}</div>
              <div className="text-[10px] text-cyan-500/60 tracking-widest uppercase mt-1">Analyses</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel: IP Activity + Source Breakdown */}
          <div className="lg:col-span-1 space-y-6">
            {/* Source Filter */}
            <div className="bg-black/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
              <h3 className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
                <i className="fas fa-filter"></i> FILTER BY SOURCE
              </h3>
              <div className="space-y-1">
                {['all', 'scanner', 'simulator', 'analyzer', 'dns', 'webhook'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`w-full text-left text-xs py-2 px-3 rounded-lg transition-all uppercase tracking-wider ${
                      filter === s
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-500 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    {s === 'all' ? '● ALL SOURCES' : s}
                    {metrics?.bySource?.[s] ? ` (${metrics.bySource[s]})` : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Filter */}
            <div className="bg-black/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
              <h3 className="text-[10px] text-amber-500 font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
                <i className="fas fa-exclamation-triangle"></i> FILTER BY SEVERITY
              </h3>
              <div className="space-y-1">
                {['all', 'critical', 'high', 'medium', 'low', 'info'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSevFilter(s)}
                    className={`w-full text-left text-xs py-2 px-3 rounded-lg transition-all uppercase tracking-wider flex items-center gap-2 ${
                      sevFilter === s
                        ? `${sev(s).bg} ${sev(s).color} border ${sev(s).border}`
                        : 'text-slate-500 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    {s !== 'all' && <span className={`w-2 h-2 rounded-full ${sev(s).dot}`}></span>}
                    {s === 'all' ? '● ALL' : s}
                    {s !== 'all' && metrics?.bySeverity?.[s] ? ` (${metrics.bySeverity[s]})` : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Top IPs */}
            {metrics?.topIPs?.length > 0 && (
              <div className="bg-black/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
                <h3 className="text-[10px] text-red-500 font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
                  <i className="fas fa-user-secret"></i> TOP IPs
                </h3>
                <div className="space-y-2">
                  {metrics.topIPs.map((ip, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-mono">{ip.ip}</span>
                      <span className="text-slate-500 bg-slate-800 px-2 py-0.5 rounded font-bold">{ip.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Live Event Feed */}
          <div className="lg:col-span-3 bg-black/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm flex flex-col max-h-[800px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase flex items-center gap-2">
                <i className="fas fa-stream"></i> LIVE EVENT FEED ({filtered.length})
              </h3>
              <div className="flex gap-2">
                <button onClick={fetchData} className="text-[10px] text-slate-600 hover:text-cyan-400 transition uppercase tracking-widest">
                  <i className="fas fa-sync-alt"></i> Refresh
                </button>
                {events.length > 0 && (
                  <button onClick={clearAll} className="text-[10px] text-slate-600 hover:text-red-400 transition uppercase tracking-widest">
                    <i className="fas fa-trash-alt"></i> Clear
                  </button>
                )}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <i className="fas fa-satellite-dish text-slate-800 text-5xl mb-4"></i>
                  <p className="text-slate-600 text-sm">No events yet</p>
                  <p className="text-slate-700 text-xs mt-1">Events appear when you scan URLs, run attacks, or analyze risks</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {filtered.map((evt, i) => {
                  const s = sev(evt.severity);
                  const icon = TYPE_ICONS[evt.type] || 'fa-circle';
                  const isHighSev = evt.severity === 'critical' || evt.severity === 'high';
                  return (
                    <div
                      key={evt.id || i}
                      className={`border rounded-lg p-3 transition-all ${s.border} ${s.bg} hover:brightness-125`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isHighSev ? 'bg-red-500/20' : 'bg-slate-800/50'}`}>
                          <i className={`fas ${icon} ${s.color} text-xs`}></i>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold tracking-wider uppercase ${s.color}`}>
                              {evt.type.replace(/_/g, ' ')}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${s.bg} ${s.color} border ${s.border}`}>
                              {evt.severity}
                            </span>
                            <span className="text-[9px] text-slate-600 px-1.5 py-0.5 rounded bg-slate-800/50">
                              {evt.source}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed truncate">{evt.reason}</p>
                          <div className="flex gap-4 mt-1.5 text-[10px] text-slate-600">
                            {evt.url && (
                              <span className="truncate max-w-[250px]"><i className="fas fa-link mr-1"></i>{evt.url}</span>
                            )}
                            {evt.ip && evt.ip !== 'unknown' && (
                              <span><i className="fas fa-network-wired mr-1"></i>{evt.ip}</span>
                            )}
                          </div>
                        </div>

                        {/* Timestamp */}
                        <div className="text-[10px] text-slate-600 font-mono whitespace-nowrap flex-shrink-0">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
