import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

export default function WebhookSettings() {
  const [config, setConfig] = useState({ url: '', enabled: false, secret: '' });
  const [alerts, setAlerts] = useState([]);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);
  const [editUrl, setEditUrl] = useState('');
  const [editSecret, setEditSecret] = useState('');

  // Fetch config + alerts
  const fetchData = useCallback(async () => {
    try {
      const [cfgRes, alertRes] = await Promise.all([
        fetch('/api/webhook-config'),
        fetch('/api/alerts?limit=50'),
      ]);
      const cfgData = await cfgRes.json();
      const alertData = await alertRes.json();

      setConfig(cfgData);
      setEditUrl(cfgData.url);
      setEditSecret('');
      setAlerts(alertData.alerts || []);
      setTotalAlerts(alertData.total || 0);
    } catch (err) {
      console.error('Failed to fetch webhook data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh alerts every 5s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/alerts?limit=50');
        const data = await res.json();
        setAlerts(data.alerts || []);
        setTotalAlerts(data.total || 0);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Save config
  const saveConfig = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body = { url: editUrl, enabled: config.enabled };
      if (editSecret) body.secret = editSecret;

      const res = await fetch('/api/webhook-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setConfig({ ...config, url: data.url, enabled: data.enabled });
      setMessage({ type: 'success', text: 'Webhook configuration saved' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  // Toggle enabled
  const toggleEnabled = async () => {
    try {
      const res = await fetch('/api/webhook-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !config.enabled }),
      });
      const data = await res.json();
      setConfig({ ...config, enabled: data.enabled });
      setMessage({ type: 'success', text: data.enabled ? 'Webhook enabled' : 'Webhook disabled' });
    } catch {}
  };

  // Send test alert
  const sendTest = async () => {
    setTesting(true);
    try {
      await fetch('/api/webhook-test', { method: 'POST' });
      setMessage({ type: 'success', text: 'Test alert dispatched!' });
      // Refresh alerts after a moment
      setTimeout(fetchData, 1000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Test failed: ' + err.message });
    } finally {
      setTesting(false);
    }
  };

  // Clear alerts
  const clearAlerts = async () => {
    try {
      await fetch('/api/alerts', { method: 'DELETE' });
      setAlerts([]);
      setTotalAlerts(0);
      setMessage({ type: 'success', text: 'All alerts cleared' });
    } catch {}
  };

  const getSeverityStyle = (sev) => {
    if (sev === 'critical') return 'text-red-500 bg-red-500/10 border-red-500/30';
    if (sev === 'high') return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    if (sev === 'medium') return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-cyan-400 text-3xl"></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative">
      {/* Grid bg */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center mb-10">
          <Link to="/" className="text-cyan-400 hover:underline text-sm mb-4 inline-flex items-center gap-2">
            <i className="fas fa-arrow-left"></i> BACK TO DASHBOARD
          </Link>
          <h1 className="text-5xl font-black text-white mt-4 orbitron-title tracking-tighter">
            WEBHOOK <span className="text-amber-400">SETTINGS</span>
          </h1>
          <p className="mt-3 text-slate-500 text-sm">
            Configure security alerts when SSRF attempts are blocked
          </p>
        </header>

        {/* Status message */}
        {message && (
          <div className={`p-3 rounded-lg text-sm flex items-center gap-2 border ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto text-slate-500 hover:text-white">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Configuration Panel ─── */}
          <div className="lg:col-span-1 space-y-6">

            {/* Toggle Card */}
            <div className="bg-black/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] text-amber-500 font-bold tracking-widest uppercase flex items-center gap-2">
                  <i className="fas fa-bell"></i> WEBHOOK STATUS
                </h3>
                <button
                  onClick={toggleEnabled}
                  className={`w-14 h-7 rounded-full relative transition-all duration-300 ${
                    config.enabled
                      ? 'bg-green-500/30 border-green-500'
                      : 'bg-slate-800 border-slate-700'
                  } border`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-300 ${
                    config.enabled ? 'left-8' : 'left-0.5'
                  }`}></div>
                </button>
              </div>
              <p className={`text-lg font-bold ${config.enabled ? 'text-green-400' : 'text-slate-600'}`}>
                {config.enabled ? '● ACTIVE' : '○ DISABLED'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {config.enabled
                  ? 'Alerts will be sent when SSRF attempts are blocked'
                  : 'No alerts will be dispatched'}
              </p>
            </div>

            {/* URL Config */}
            <div className="bg-black/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-[10px] text-amber-500 font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
                <i className="fas fa-link"></i> WEBHOOK ENDPOINT
              </h3>
              <input
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://your-webhook-url.com/endpoint"
                className="w-full bg-black/90 border-2 border-slate-800 p-3 rounded-xl outline-none focus:border-amber-500 text-cyan-200 font-mono text-sm transition-all mb-4"
              />

              <h3 className="text-[10px] text-amber-500 font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
                <i className="fas fa-key"></i> SECRET (optional)
              </h3>
              <input
                type="password"
                value={editSecret}
                onChange={(e) => setEditSecret(e.target.value)}
                placeholder="webhook_secret_key"
                className="w-full bg-black/90 border-2 border-slate-800 p-3 rounded-xl outline-none focus:border-amber-500 text-cyan-200 font-mono text-sm transition-all mb-4"
              />

              <div className="flex gap-3">
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 text-sm"
                >
                  {saving ? <><i className="fas fa-spinner fa-spin mr-2"></i>Saving...</> : <><i className="fas fa-save mr-2"></i>Save</>}
                </button>
                <button
                  onClick={sendTest}
                  disabled={testing}
                  className="flex-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30 font-bold py-3 rounded-xl transition-all disabled:opacity-50 text-sm"
                >
                  {testing ? <><i className="fas fa-spinner fa-spin mr-2"></i>Sending...</> : <><i className="fas fa-paper-plane mr-2"></i>Test</>}
                </button>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
              <p className="text-amber-400 text-xs leading-relaxed">
                <i className="fas fa-info-circle mr-2"></i>
                Webhooks fire automatically when the SSRF defense pipeline <strong>blocks</strong> a malicious request on the Dashboard scan page.
                The default endpoint is an internal test receiver at <code className="text-cyan-400">/api/webhook-receiver</code>.
              </p>
            </div>
          </div>

          {/* ─── Alerts Panel ─── */}
          <div className="lg:col-span-2 bg-black/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col max-h-[750px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] text-red-500 font-bold tracking-widest uppercase flex items-center gap-2">
                <i className="fas fa-shield-alt"></i> SECURITY ALERTS ({totalAlerts})
              </h3>
              {alerts.length > 0 && (
                <button
                  onClick={clearAlerts}
                  className="text-[10px] text-slate-600 hover:text-red-400 transition uppercase tracking-widest flex items-center gap-1"
                >
                  <i className="fas fa-trash-alt"></i> Clear All
                </button>
              )}
            </div>

            {alerts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <i className="fas fa-shield-alt text-slate-800 text-5xl mb-4"></i>
                  <p className="text-slate-600 text-sm">No alerts yet</p>
                  <p className="text-slate-700 text-xs mt-1">Alerts appear here when the pipeline blocks a malicious URL</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`border rounded-xl p-4 transition-all hover:border-opacity-60 ${getSeverityStyle(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {alert.event === 'SSRF_TEST_ALERT' ? (
                            <><i className="fas fa-vial mr-1"></i> TEST</>
                          ) : (
                            <><i className="fas fa-radiation mr-1"></i> {alert.severity?.toUpperCase()}</>
                          )}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex gap-2">
                        <span className="text-slate-500 w-12 flex-shrink-0">URL</span>
                        <span className="font-mono text-slate-300 break-all">{alert.targetUrl}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-slate-500 w-12 flex-shrink-0">IP</span>
                        <span className="font-mono text-slate-400">{alert.attackerIP}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-slate-500 w-12 flex-shrink-0">WHY</span>
                        <span className="text-slate-300">{alert.reason}</span>
                      </div>
                      {alert.step && (
                        <div className="flex gap-2">
                          <span className="text-slate-500 w-12 flex-shrink-0">STEP</span>
                          <span className="text-cyan-400 font-mono">{alert.step}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-current/10 flex items-center gap-2">
                      {alert.blocked ? (
                        <span className="text-[10px] text-green-500 font-bold"><i className="fas fa-check-circle mr-1"></i>BLOCKED</span>
                      ) : (
                        <span className="text-[10px] text-red-500 font-bold"><i className="fas fa-times-circle mr-1"></i>ALLOWED</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
