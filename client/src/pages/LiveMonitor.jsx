import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const SEVERITY_STYLES = {
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/50', indicator: 'bg-red-500' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/50', indicator: 'bg-orange-400' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/50', indicator: 'bg-amber-400' },
  low: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/50', indicator: 'bg-cyan-400' },
  info: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/50', indicator: 'bg-slate-500' },
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
  const [webhookConfig, setWebhookConfig] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [evtRes, metRes, hookRes] = await Promise.all([
        fetch('/api/events?limit=250'),
        fetch('/api/events/metrics'),
        fetch('/api/webhook-config'),
      ]);
      const evtData = await evtRes.json();
      const metData = await metRes.json();
      const hookData = await hookRes.json();
      
      setEvents(evtData.events || []);
      setMetrics(metData);
      setWebhookConfig(hookData);
    } catch {}
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 2s for SOC responsiveness
  useEffect(() => {
    const interval = setInterval(fetchData, 2000);
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

  // AI Insights Generator (Rule-based for live feed)
  const generateInsights = () => {
    const insights = [];
    if (!metrics) return insights;

    const criticalCount = (metrics.bySeverity?.critical || 0) + (metrics.bySeverity?.high || 0);
    if (criticalCount > 5) {
      insights.push({ icon: 'fa-exclamation-circle', text: `High volume of critical events detected (${criticalCount}). Immediate review of firewall rules recommended.`, type: 'critical' });
    }

    if (metrics.byType?.DNS_REBINDING > 0) {
      insights.push({ icon: 'fa-exchange-alt', text: 'Active DNS Rebinding attempts detected. Ensure DNS resolution caching is disabled and IP validation occurs post-resolution.', type: 'high' });
    }

    if (metrics.byType?.EXPLOIT_SUCCESS > 0) {
      insights.push({ icon: 'fa-skull-crossbones', text: 'Confirmed data exposure via SSRF exploit. Check internal metadata endpoints and block link-local access.', type: 'critical' });
    }

    if (metrics.topIPs && metrics.topIPs.length > 0 && metrics.topIPs[0].count > 20) {
      insights.push({ icon: 'fa-user-secret', text: `Suspicious activity concentration from IP ${metrics.topIPs[0].ip}. Consider temporary rate limiting.`, type: 'medium' });
    }

    if (insights.length === 0) {
      insights.push({ icon: 'fa-check', text: 'Traffic baseline normal. No immediate threats detected.', type: 'info' });
    }
    
    return insights;
  };

  const insights = generateInsights();

  // Distinct panels
  const highSevAlerts = events.filter(e => e.severity === 'critical' || e.severity === 'high').slice(0, 10);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-300 p-4 pt-6 md:p-6 lg:p-8 font-sans selection:bg-cyan-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-[1600px] mx-auto flex flex-col h-[calc(100vh-4rem)]">
        
        {/* Header (Compact SOC style) */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
          <div>
            <Link to="/" className="text-cyan-400 hover:text-cyan-300 text-xs mb-2 inline-flex items-center gap-2 uppercase tracking-widest font-bold">
              <i className="fas fa-chevron-left"></i> Core Systems
            </Link>
            <h1 className="text-3xl lg:text-4xl font-black text-white orbitron-title tracking-tight flex items-center gap-4">
              SOC <span className="font-light text-slate-500">|</span> <span className="text-cyan-400">LIVE TELEMETRY</span>
              <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest bg-green-500/10 text-green-400 border border-green-500/30 px-3 py-1 rounded shadow-[0_0_10px_rgba(34,197,94,0.2)] ml-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                Real-Time
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            {webhookConfig && (
              <div className={`px-3 py-1.5 rounded border ${webhookConfig.enabled ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                <i className="fas fa-satellite-dish mr-2"></i> 
                WEBHOOK: {webhookConfig.enabled ? 'Active' : 'Offline'}
              </div>
            )}
            <div className="text-slate-500">
              UPTIME: <span className="text-white">99.99%</span>
            </div>
          </div>
        </header>

        {/* Top Metrics Row */}
        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-[#111114] border-l-4 border-l-slate-700 border-y border-r border-y-[#1f1f23] border-r-[#1f1f23] rounded shadow p-4">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex justify-between">
                Total Requests <i className="fas fa-globe text-slate-700"></i>
              </div>
              <div className="text-3xl font-mono text-white tracking-tighter">{metrics.total.toLocaleString()}</div>
            </div>
            
            <div className="bg-[#111114] border-l-4 border-l-orange-500 border-y border-r border-y-[#1f1f23] border-r-[#1f1f23] rounded shadow p-4">
              <div className="text-[10px] text-orange-500/70 font-bold uppercase tracking-widest mb-1 flex justify-between">
                Blocked Attacks <i className="fas fa-shield-alt text-orange-900"></i>
              </div>
              <div className="text-3xl font-mono text-orange-400 tracking-tighter">{metrics.byType?.SSRF_BLOCKED || 0}</div>
            </div>

            <div className="bg-[#111114] border-l-4 border-l-red-500 border-y border-r border-y-[#1f1f23] border-r-[#1f1f23] rounded shadow p-4 relative overflow-hidden">
              {(metrics.byType?.EXPLOIT_SUCCESS > 0) && (
                <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
              )}
              <div className="relative z-10">
                <div className="text-[10px] text-red-500/70 font-bold uppercase tracking-widest mb-1 flex justify-between">
                  Exploits Detected <i className="fas fa-skull-crossbones text-red-900"></i>
                </div>
                <div className="text-3xl font-mono text-red-500 tracking-tighter">{metrics.byType?.EXPLOIT_SUCCESS || 0}</div>
              </div>
            </div>

            <div className="bg-[#111114] border-l-4 border-l-cyan-500 border-y border-r border-y-[#1f1f23] border-r-[#1f1f23] rounded shadow p-4">
              <div className="text-[10px] text-cyan-500/70 font-bold uppercase tracking-widest mb-1 flex justify-between">
                High Sev Events <i className="fas fa-exclamation-triangle text-cyan-900"></i>
              </div>
              <div className="text-3xl font-mono text-cyan-400 tracking-tighter">{(metrics.bySeverity?.critical || 0) + (metrics.bySeverity?.high || 0)}</div>
            </div>
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
          
          {/* LEFT COLUMN: Alerts & Intelligence */}
          <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
            
            {/* AI Insights Card */}
            <div className="bg-[#111114] border border-[#1f1f23] rounded flex flex-col flex-shrink-0">
              <div className="p-3 border-b border-[#1f1f23] flex items-center justify-between bg-[#151519]">
                <h2 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-brain text-purple-500"></i> AI Analyst Insights
                </h2>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <i className={`fas ${insight.icon} mt-0.5 ${
                      insight.type === 'critical' ? 'text-red-500' :
                      insight.type === 'high' ? 'text-orange-400' :
                      insight.type === 'medium' ? 'text-amber-400' : 'text-cyan-400'
                    }`}></i>
                    <p className="leading-snug text-slate-300">{insight.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* High Severity Alerts Panel */}
            <div className="bg-[#111114] border border-[#1f1f23] rounded flex flex-col flex-1 min-h-0">
              <div className="p-3 border-b border-[#1f1f23] flex items-center justify-between bg-[#151519]">
                <h2 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-radiation text-red-500"></i> Critical Alerts
                </h2>
                <div className="text-[10px] bg-red-500/20 text-red-400 px-2 rounded-full font-mono">{highSevAlerts.length}</div>
              </div>
              <div className="p-2 flex-1 overflow-y-auto custom-scrollbar space-y-2">
                {highSevAlerts.length === 0 ? (
                  <div className="h-full flex items-center justify-center p-4 text-center">
                    <p className="text-slate-600 text-xs uppercase tracking-widest">No active alerts</p>
                  </div>
                ) : (
                  highSevAlerts.map((evt, i) => (
                    <div key={i} className="bg-[#18181c] border border-red-500/20 rounded p-3 relative overflow-hidden group">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                      <div className="flex justify-between items-start mb-1 ml-2">
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider truncate w-32">{evt.type}</span>
                        <span className="text-[9px] text-slate-500 font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 ml-2 line-clamp-2 leading-relaxed">{evt.reason}</p>
                      <div className="mt-2 ml-2 text-[9px] font-mono text-slate-500 flex justify-between">
                        <span className="truncate w-3/4"><i className="fas fa-globe mr-1"></i>{evt.url}</span>
                        <span><i className="fas fa-network-wired mr-1 text-slate-600"></i>{evt.ip}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* IP Activity */}
            <div className="bg-[#111114] border border-[#1f1f23] rounded flex flex-col flex-shrink-0 h-48">
              <div className="p-3 border-b border-[#1f1f23] bg-[#151519]">
                <h2 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-network-wired text-cyan-500"></i> Top Threat IPs
                </h2>
              </div>
              <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-2">
                {metrics?.topIPs?.slice(0, 5).map((ip, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-300 font-mono">{ip.ip}</span>
                    <span className="text-[10px] font-mono bg-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800">{ip.count}</span>
                  </div>
                ))}
              </div>
            </div>
            
          </div>

          {/* RIGHT COLUMN: Live Threat Feed */}
          <div className="lg:col-span-3 bg-[#111114] border border-[#1f1f23] rounded flex flex-col min-h-0 shadow-lg">
            <div className="p-3 border-b border-[#1f1f23] bg-[#151519] flex justify-between items-center z-10 sticky top-0 shadow">
              <h2 className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-terminal text-emerald-500"></i> SYSTEM LOGS [{filtered.length}]
              </h2>
              <div className="flex items-center gap-3">
                {/* Filters */}
                <select 
                  className="bg-[#18181c] border border-slate-700 text-[10px] text-slate-300 uppercase tracking-widest rounded px-2 py-1 outline-none"
                  value={sevFilter}
                  onChange={(e) => setSevFilter(e.target.value)}
                >
                  <option value="all">ALL SEVERITY</option>
                  <option value="critical">CRITICAL</option>
                  <option value="high">HIGH</option>
                  <option value="medium">MEDIUM</option>
                  <option value="info">INFO</option>
                </select>
                <div className="h-4 w-px bg-slate-700"></div>
                <button onClick={clearAll} className="text-[10px] text-slate-500 hover:text-red-400 uppercase tracking-widest transition">
                  CLEAR LOGS <i className="fas fa-trash-alt ml-1"></i>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0d0d10] p-1 font-mono text-xs">
              {filtered.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-600">
                  <i className="fas fa-server text-4xl mb-4 opacity-50"></i>
                  <p className="uppercase tracking-widest text-sm font-bold">Awaiting telemetry</p>
                  <p className="text-[10px] mt-2 max-w-sm font-sans">Run a scan, execute an attack demo, or wait for live traffic.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#151519]/80 sticky top-0 backdrop-blur z-10 hidden md:table-header-group">
                    <tr>
                      <th className="p-2 font-normal text-slate-500 w-24">TIME</th>
                      <th className="p-2 font-normal text-slate-500 w-32">SEV</th>
                      <th className="p-2 font-normal text-slate-500 w-48">EVENT_TYPE</th>
                      <th className="p-2 font-normal text-slate-500">DETAILS</th>
                      <th className="p-2 font-normal text-slate-500 w-32">SRC_IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((evt, i) => {
                      const s = sev(evt.severity);
                      const icon = TYPE_ICONS[evt.type] || 'fa-circle';
                      return (
                        <tr key={evt.id || i} className={`border-b border-[#1f1f23] hover:bg-[#15151a] group cursor-default transition-colors`}>
                          <td className="p-2 text-slate-500 align-top whitespace-nowrap">
                            {new Date(evt.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="p-2 align-top">
                            <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${s.bg} ${s.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.indicator}`}></span> {evt.severity}
                            </span>
                          </td>
                          <td className="p-2 align-top text-slate-300 font-bold whitespace-nowrap text-[11px]">
                            <i className={`fas ${icon} mr-2 opacity-50`}></i>
                            {evt.type}
                          </td>
                          <td className="p-2 align-top text-slate-400 break-all max-w-[200px]">
                            <span className="text-white block mb-1">{evt.reason}</span>
                            {evt.url && (
                              <div className="text-[10px] text-cyan-600/70 truncate hover:text-cyan-400 hover:whitespace-normal transition-all duration-300">
                                <i className="fas fa-link mr-1"></i> {evt.url}
                              </div>
                            )}
                          </td>
                          <td className="p-2 align-top text-slate-500">
                            {evt.ip}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
