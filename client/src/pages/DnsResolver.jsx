import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const API = '/api';
const privateRe = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.)/;

/* ═══════════════════════════════════════════════════════
   MATRIX BACKGROUND CANVAS
   ═══════════════════════════════════════════════════════ */
function MatrixCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const chars = "01ABCDEFGHIJKLMNOPQRSTUVWXYZｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ";
    let drops = [];
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drops = Array(Math.floor(canvas.width / 16)).fill(1);
    };
    resize();
    window.addEventListener('resize', resize);
    const interval = setInterval(() => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "16px monospace";
      for (let i = 0; i < drops.length; i++) {
        ctx.fillStyle = Math.random() > 0.9 ? "#fff" : "#0F0";
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 16, drops[i] * 16);
        if (drops[i] * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }, 50);
    return () => { clearInterval(interval); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: -1, opacity: 0.35, pointerEvents: 'none' }} />;
}

/* ═══════════════════════════════════════════════════════
   PANEL WRAPPER
   ═══════════════════════════════════════════════════════ */
const panelStyle = {
  background: 'rgba(5, 7, 10, 0.92)',
  border: '1px solid rgba(0, 243, 255, 0.1)',
  borderRadius: '18px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  backdropFilter: 'blur(15px)',
};

function PanelHeader({ children, right }) {
  return (
    <div style={{
      background: 'rgba(0, 243, 255, 0.05)',
      borderBottom: '1px solid rgba(0, 243, 255, 0.1)',
      padding: '12px 18px',
      fontFamily: "'Orbitron', sans-serif",
      fontSize: '10px',
      color: '#00f3ff',
      letterSpacing: '2px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      textTransform: 'uppercase',
    }}>
      <span>{children}</span>
      {right}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   INLINE IP EDITOR (for records table)
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
    { label: '☁️ Meta', ip: '169.254.169.254', color: '#ff0055' },
    { label: '🏠 Loop', ip: '127.0.0.1', color: '#ffaa00' },
    { label: '✅ Safe', ip: '8.8.8.8', color: '#0f0' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input value={ip} onChange={e => setIp(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && apply()}
          style={{
            width: '120px', padding: '4px 8px', background: '#000',
            border: flash ? '1px solid #ffaa00' : '1px solid #333',
            borderRadius: '6px', color: '#00f3ff', fontFamily: 'monospace', fontSize: '11px', outline: 'none',
            transition: 'border-color 0.3s',
          }} />
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => apply()}
          style={{
            padding: '4px 8px', background: 'linear-gradient(135deg, #d97706, #ea580c)',
            border: 'none', color: '#fff', fontSize: '9px', fontWeight: 700, borderRadius: '5px', cursor: 'pointer',
            fontFamily: "'Orbitron', sans-serif",
          }}>⚡</motion.button>
      </div>
      <div style={{ display: 'flex', gap: '3px' }}>
        {presets.map(p => (
          <motion.button key={p.ip} whileTap={{ scale: 0.9 }}
            onClick={() => { setIp(p.ip); apply(p.ip); }}
            style={{
              padding: '2px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 700,
              background: `${p.color}15`, color: p.color, border: `1px solid ${p.color}30`,
              cursor: 'pointer', fontFamily: "'Orbitron', sans-serif", transition: '0.2s',
            }}>{p.label}</motion.button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CONFIGURATOR PANEL — IP RECORDS FORM
   ═══════════════════════════════════════════════════════ */
function RecordForm({ editRecord, onSave, onCancel }) {
  const [domain, setDomain] = useState(editRecord?.domain || 'evil.rebind.attacker.com');
  const [ips, setIps] = useState(editRecord?.ips?.join(', ') || '8.8.8.8, 169.254.169.254');
  const [ttl, setTtl] = useState(editRecord?.ttl || 1);
  const [mode, setMode] = useState(editRecord?.mode || 'rebinding');

  useEffect(() => {
    if (editRecord) { setDomain(editRecord.domain); setIps(editRecord.ips.join(', ')); setTtl(editRecord.ttl); setMode(editRecord.mode); }
  }, [editRecord]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ domain, ips: ips.split(',').map(s => s.trim()).filter(Boolean), ttl: Number(ttl), mode, type: 'A' });
    if (!editRecord) { setDomain(''); setIps(''); setTtl(1); setMode('static'); }
  };

  const inputStyle = {
    background: '#000', border: '1px solid #333', color: '#00f3ff',
    padding: '8px 12px', fontSize: '12px', fontFamily: 'monospace', outline: 'none',
    width: '100%', marginBottom: '8px', borderRadius: '8px',
  };
  const labelStyle = {
    fontFamily: "'Orbitron', sans-serif", fontSize: '9px', color: '#64748b',
    marginBottom: '4px', display: 'block', fontWeight: 'bold', textTransform: 'uppercase',
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '20px', flex: 1 }}>
      <label style={labelStyle}>Target Domain</label>
      <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="evil.attacker.com" style={inputStyle} required disabled={!!editRecord} />

      <label style={labelStyle}>IP Pool</label>
      <textarea value={ips} onChange={e => setIps(e.target.value)} placeholder="8.8.8.8, 169.254.169.254"
        style={{ ...inputStyle, height: '56px', resize: 'none' }} required />

      <div style={{
        marginBottom: '12px', background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)',
        padding: '8px', borderRadius: '10px',
      }}>
        <span style={{ fontSize: '9px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Amazon Metadata IP:</span>
        <code style={{ fontSize: '12px', color: '#bfdbfe', fontFamily: 'monospace', fontWeight: 700 }}>169.254.169.254</code>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={labelStyle}>TTL (SEC)</label>
          <input type="number" min={1} value={ttl} onChange={e => setTtl(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Mode</label>
          <select value={mode} onChange={e => setMode(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
            <option value="static">Static</option>
            <option value="rebinding">Rebinding</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <motion.button type="submit" whileTap={{ scale: 0.97 }}
          style={{
            flex: 1, background: '#2563eb', padding: '12px', border: 'none', color: '#fff',
            fontFamily: "'Orbitron', sans-serif", fontSize: '10px', fontWeight: 700,
            textTransform: 'uppercase', borderRadius: '10px', cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(37,99,235,0.3)',
          }}>
          {editRecord ? '💾 Update' : '+ Initialize'}
        </motion.button>
        {editRecord && (
          <button type="button" onClick={onCancel}
            style={{ padding: '12px 16px', background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', fontSize: '10px', borderRadius: '10px', cursor: 'pointer' }}>Cancel</button>
        )}
      </div>

      {mode === 'rebinding' && (
        <div style={{
          marginTop: '12px', background: 'rgba(0,243,255,0.05)', border: '1px solid rgba(0,243,255,0.15)',
          padding: '10px', borderRadius: '10px',
        }}>
          <p style={{ fontSize: '10px', color: '#67e8f9', fontWeight: 700, fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
            ℹ REBINDING: DNS rotates through IPs every {ttl}s to simulate TOCTOU attack.
          </p>
        </div>
      )}
    </form>
  );
}

/* ═══════════════════════════════════════════════════════
   CONFIGURATOR PANEL — REDIRECT FORM
   ═══════════════════════════════════════════════════════ */
function RedirectForm({ editRecord, onSave, onCancel }) {
  const [domain, setDomain] = useState(editRecord?.domain || '');
  const [redirectTarget, setRedirectTarget] = useState(editRecord?.redirectTarget || '');

  useEffect(() => {
    if (editRecord) { setDomain(editRecord.domain); setRedirectTarget(editRecord.redirectTarget || ''); }
  }, [editRecord]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ domain, ips: ['8.8.8.8'], ttl: 300, mode: 'redirect', redirectTarget, type: 'A' });
    if (!editRecord) { setDomain(''); setRedirectTarget(''); }
  };

  const inputStyle = {
    background: '#000', border: '1px solid #333', color: '#00f3ff',
    padding: '8px 12px', fontSize: '12px', fontFamily: 'monospace', outline: 'none',
    width: '100%', marginBottom: '8px', borderRadius: '8px',
  };
  const labelStyle = {
    fontFamily: "'Orbitron', sans-serif", fontSize: '9px', color: '#64748b',
    marginBottom: '4px', display: 'block', fontWeight: 'bold', textTransform: 'uppercase',
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '20px', flex: 1 }}>
      <label style={labelStyle}>Target Domain</label>
      <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="evil-redirect.com" style={inputStyle} required disabled={!!editRecord} />

      <label style={labelStyle}>Destination URL</label>
      <input value={redirectTarget} onChange={e => setRedirectTarget(e.target.value)} placeholder="http://169.254.169.254/" style={inputStyle} required />

      <div style={{
        background: 'rgba(0,243,255,0.04)', border: '1px solid rgba(0,243,255,0.15)',
        padding: '10px', borderRadius: '10px', marginTop: '8px', marginBottom: '12px',
      }}>
        <p style={{ fontSize: '10px', color: '#67e8f9', fontWeight: 700, fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
          ℹ REDIRECT BYPASS: System resolves via mocked IP to bypass firewall.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <motion.button type="submit" whileTap={{ scale: 0.97 }}
          style={{
            flex: 1, background: '#2563eb', padding: '12px', border: 'none', color: '#fff',
            fontFamily: "'Orbitron', sans-serif", fontSize: '10px', fontWeight: 700,
            textTransform: 'uppercase', borderRadius: '10px', cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(37,99,235,0.3)',
          }}>
          {editRecord ? '💾 Update Rule' : '+ Deploy Vector'}
        </motion.button>
        {editRecord && (
          <button type="button" onClick={onCancel}
            style={{ padding: '12px 16px', background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', fontSize: '10px', borderRadius: '10px', cursor: 'pointer' }}>Cancel</button>
        )}
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════
   RESOLUTION FLOW + LIVE IP DISPLAY
   ═══════════════════════════════════════════════════════ */
function FlowVisualization({ records, queryResult, querying }) {
  // Pick the most interesting record for the big IP: first rebinding record, or query result, or first record
  const rebinding = records.find(r => r.mode === 'rebinding');
  const displayIP = queryResult?.ips?.[0] || rebinding?.currentIP || records[0]?.currentIP || '8.8.8.8';
  const isPriv = privateRe.test(displayIP);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px 0' }}>
      {/* Flow path */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
        {[
          { icon: '💻', label: 'CLIENT' },
          null, // connector
          { icon: '🌐', label: 'RESOLVER', active: true },
          null, // connector
          { icon: '🖥️', label: 'DNS_HOST' },
        ].map((item, i) => {
          if (!item) return (
            <div key={`c-${i}`} style={{ height: '1px', width: '50px', background: 'rgba(0,243,255,0.15)' }} />
          );
          return (
            <div key={item.label} style={{
              border: `1px solid ${item.active ? '#00f3ff' : 'rgba(0,243,255,0.2)'}`,
              background: '#000', padding: '12px 16px', borderRadius: '12px', textAlign: 'center',
              minWidth: '80px',
              boxShadow: item.active ? '0 0 20px rgba(0,243,255,0.2)' : 'none',
            }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{item.icon}</div>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '9px', fontWeight: 700, color: '#94a3b8' }}>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Big IP display */}
      <motion.div
        key={displayIP}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          marginTop: '40px',
          fontSize: 'clamp(2rem, 3.5vw, 3.2rem)',
          fontWeight: 900,
          fontFamily: 'monospace',
          color: isPriv ? '#ff0055' : '#0f0',
          textShadow: isPriv ? '0 0 15px rgba(255,0,85,0.5)' : '0 0 15px rgba(0,255,0,0.5)',
          letterSpacing: '-1px',
          transition: 'color 0.5s ease, text-shadow 0.5s ease',
        }}
      >
        {displayIP}
      </motion.div>
      <div style={{
        fontFamily: "'Orbitron', sans-serif", fontSize: '9px', color: '#475569',
        marginTop: '12px', letterSpacing: '0.4em', textTransform: 'uppercase',
      }}>
        Active Packet Destination
      </div>

      {/* Querying indicator */}
      {querying && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ marginTop: '16px', color: '#818cf8', fontSize: '10px', fontFamily: "'Orbitron', sans-serif" }}
        >
          ● RESOLVING...
        </motion.div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TELEMETRY PANEL
   ═══════════════════════════════════════════════════════ */
function TelemetryPanel({ records, queryResult }) {
  const [ttlProgress, setTtlProgress] = useState(0);
  const [ttlDisplay, setTtlDisplay] = useState('1.00s');
  const startRef = useRef(Date.now());

  const rebinding = records.find(r => r.mode === 'rebinding');
  const duration = (rebinding?.ttl || 1) * 1000;

  useEffect(() => {
    const frame = () => {
      const elapsed = Date.now() - startRef.current;
      const progress = (elapsed % duration) / duration;
      const remaining = ((duration - (elapsed % duration)) / 1000).toFixed(2);
      setTtlProgress(progress);
      setTtlDisplay(`${remaining}s`);
      rafRef.current = requestAnimationFrame(frame);
    };
    const rafRef = { current: null };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [duration]);

  // Build resolved chain from records + query
  const chainEntries = [];
  records.forEach(r => {
    (r.ips || []).forEach(ip => {
      chainEntries.push({ ip, source: r.mode === 'rebinding' ? 'REBIND' : r.mode === 'redirect' ? 'REDIRECT' : 'STATIC', domain: r.domain });
    });
  });
  if (queryResult?.ips) {
    queryResult.ips.forEach(ip => {
      if (!chainEntries.find(e => e.ip === ip)) {
        chainEntries.push({ ip, source: 'QUERY' });
      }
    });
  }

  const displayIP = queryResult?.ips?.[0] || rebinding?.currentIP || records[0]?.currentIP || '8.8.8.8';
  const isPriv = privateRe.test(displayIP);
  const verdictSecure = !isPriv && records.filter(r => r.mode === 'rebinding').length === 0;

  return (
    <div style={{ ...panelStyle, minHeight: '480px' }}>
      <PanelHeader right={<span style={{ fontSize: '14px' }}>⚙️</span>}>Telemetry</PanelHeader>
      <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
        {/* TTL Pulse */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '9px', color: '#64748b', fontWeight: 700 }}>TTL PULSE</span>
          <span style={{ color: '#00f3ff', fontFamily: 'monospace', fontWeight: 700, fontSize: '12px' }}>{ttlDisplay}</span>
        </div>
        <div style={{ width: '100%', background: '#0f172a', height: '3px', borderRadius: '10px', marginBottom: '24px' }}>
          <div style={{
            background: '#00f3ff', height: '100%', borderRadius: '10px',
            width: `${ttlProgress * 100}%`, transition: 'width 0.05s linear',
          }} />
        </div>

        {/* Quick Resolve */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            Active Resolution
          </span>
          <div style={{
            padding: '10px 14px', borderRadius: '10px',
            background: isPriv ? 'rgba(255,0,85,0.06)' : 'rgba(0,255,0,0.04)',
            border: `1px solid ${isPriv ? 'rgba(255,0,85,0.2)' : 'rgba(0,255,0,0.15)'}`,
          }}>
            <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 900, color: isPriv ? '#ff0055' : '#0f0' }}>{displayIP}</span>
          </div>
        </div>

        {/* Resolved Chain */}
        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
          Resolved Chain
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {chainEntries.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace' }}>
              <span style={{ color: '#64748b' }}>8.8.8.8</span>
              <span style={{ color: '#22c55e' }}>[STATIC]</span>
            </div>
          ) : (
            chainEntries.slice(0, 10).map((e, i) => (
              <div key={`${e.ip}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace' }}>
                <span style={{ color: privateRe.test(e.ip) ? '#ff0055' : '#94a3b8' }}>{e.ip}</span>
                <span style={{ color: e.source === 'REBIND' ? '#ff0055' : e.source === 'REDIRECT' ? '#3b82f6' : '#22c55e', fontWeight: 700, fontSize: '9px' }}>
                  [{e.source}]
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Verdict */}
      <div style={{
        padding: '14px 20px',
        background: verdictSecure ? 'rgba(34,197,94,0.08)' : 'rgba(255,0,85,0.08)',
        color: verdictSecure ? '#22c55e' : '#ff0055',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
        fontFamily: "'Orbitron', sans-serif",
        fontWeight: 700,
        fontSize: '11px',
        letterSpacing: '1px',
      }}>
        VERDICT: {verdictSecure ? 'SECURE' : 'THREAT DETECTED'}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   RECORDS TABLE (NODE RECORD TOPOLOGY)
   ═══════════════════════════════════════════════════════ */
function NodeTopologyTable({ records, onDelete, onEdit, onInstantUpdate, activeTab, setActiveTab }) {
  const tableHead = { color: '#555', fontFamily: "'Orbitron', sans-serif", fontSize: '8px', textAlign: 'left', padding: '10px', borderBottom: '1px solid #222' };
  const tableCell = { padding: '10px', borderBottom: '1px solid #111', fontSize: '11px' };

  return (
    <div style={{ ...panelStyle, minHeight: '240px' }}>
      <PanelHeader right={
        <div style={{
          display: 'flex', background: '#000', padding: '3px', borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.1)', gap: '4px',
        }}>
          <button onClick={() => setActiveTab('standard')}
            style={{
              background: activeTab === 'standard' ? '#2563eb' : 'transparent',
              color: activeTab === 'standard' ? '#fff' : '#555',
              padding: '6px 10px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
              borderRadius: '7px', border: 'none', cursor: 'pointer',
              fontFamily: "'Orbitron', sans-serif", transition: '0.3s',
              boxShadow: activeTab === 'standard' ? '0 0 10px rgba(37,99,235,0.5)' : 'none',
            }}>IP Records</button>
          <button onClick={() => setActiveTab('redirect')}
            style={{
              background: activeTab === 'redirect' ? '#2563eb' : 'transparent',
              color: activeTab === 'redirect' ? '#fff' : '#555',
              padding: '6px 10px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
              borderRadius: '7px', border: 'none', cursor: 'pointer',
              fontFamily: "'Orbitron', sans-serif", transition: '0.3s',
              boxShadow: activeTab === 'redirect' ? '0 0 10px rgba(37,99,235,0.5)' : 'none',
            }}>Redirects</button>
        </div>
      }>Node Record Topology</PanelHeader>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {activeTab === 'standard' ? (
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHead}>Record Host</th>
                <th style={tableHead}>Live IP Control</th>
                <th style={tableHead}>Live IP Pool</th>
                <th style={tableHead}>Mode</th>
                <th style={tableHead}>State</th>
                <th style={{ ...tableHead, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {records.filter(r => r.mode !== 'redirect').map(r => (
                  <motion.tr key={r.domain} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <td style={{ ...tableCell, color: '#00f3ff', fontWeight: 700, fontFamily: 'monospace' }}>{r.domain}</td>
                    <td style={tableCell}>
                      <InlineIpEditor domain={r.domain} currentIP={r.currentIP} onInstantUpdate={onInstantUpdate} />
                    </td>
                    <td style={{ ...tableCell, fontFamily: 'monospace', color: '#64748b', fontSize: '10px' }}>{r.ips?.join(', ')}</td>
                    <td style={tableCell}>
                      <span style={{
                        fontFamily: "'Orbitron', sans-serif", fontSize: '9px', fontWeight: 700,
                        color: r.mode === 'rebinding' ? '#ff0055' : '#22c55e',
                      }}>{r.mode?.toUpperCase()}</span>
                    </td>
                    <td style={tableCell}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#22c55e' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                        ACTIVE
                      </span>
                    </td>
                    <td style={{ ...tableCell, textAlign: 'right' }}>
                      <button onClick={() => onEdit(r)} style={{ color: '#818cf8', fontSize: '10px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px' }}>Edit</button>
                      <button onClick={() => onDelete(r.domain)} style={{ color: '#ff0055', fontSize: '10px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {records.filter(r => r.mode !== 'redirect').length === 0 && (
                <tr><td colSpan={6} style={{ ...tableCell, textAlign: 'center', color: '#334155', padding: '30px' }}>No IP records configured</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHead}>Record Host</th>
                <th style={tableHead}>Redirect Target</th>
                <th style={{ ...tableHead, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {records.filter(r => r.mode === 'redirect').map(r => (
                  <motion.tr key={r.domain} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <td style={{ ...tableCell, color: '#00f3ff', fontWeight: 700, fontFamily: 'monospace' }}>{r.domain}</td>
                    <td style={tableCell}>
                      <span style={{ color: '#3b82f6', fontSize: '11px', fontWeight: 700, marginRight: '6px' }}>302 🔀</span>
                      <span style={{
                        padding: '3px 8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                        color: '#93c5fd', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10px',
                      }}>{r.redirectTarget}</span>
                    </td>
                    <td style={{ ...tableCell, textAlign: 'right' }}>
                      <button onClick={() => onEdit(r)} style={{ color: '#818cf8', fontSize: '10px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px' }}>Edit</button>
                      <button onClick={() => onDelete(r.domain)} style={{ color: '#ff0055', fontSize: '10px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {records.filter(r => r.mode === 'redirect').length === 0 && (
                <tr><td colSpan={3} style={{ ...tableCell, textAlign: 'center', color: '#334155', padding: '30px' }}>No redirect rules configured</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   THREAT STREAM LOG
   ═══════════════════════════════════════════════════════ */
function ThreatStreamLog({ logs, onClear }) {
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [logs]);

  const eventColor = (e) => {
    switch (e) {
      case 'REBOUND': case 'ATTACK': return '#ff0055';
      case 'TTL_EXPIRE': case 'DNS_CHANGED': return '#ffaa00';
      case 'STATIC': case 'RESOLVE': return '#0f0';
      default: return '#64748b';
    }
  };

  return (
    <div style={{ ...panelStyle, minHeight: '240px' }}>
      <PanelHeader right={
        <button onClick={onClear} style={{
          background: 'none', border: 'none', color: '#475569', fontSize: '9px',
          cursor: 'pointer', fontFamily: "'Orbitron', sans-serif",
        }}>CLEAR</button>
      }>Threat Stream Log</PanelHeader>
      <div ref={scrollRef} style={{
        background: 'rgba(0,0,0,0.6)', padding: '12px 15px', fontFamily: 'monospace', fontSize: '11px',
        color: '#10b981', overflowY: 'auto', flex: 1,
      }}>
        {logs.length === 0 ? (
          <div style={{ opacity: 0.5, fontSize: '10px' }}>[--:--:--] RESOLVER_INIT WAITING...</div>
        ) : (
          logs.slice(0, 60).map((l, i) => (
            <motion.div key={`${l.time}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.01 }}
              style={{ display: 'flex', gap: '8px', padding: '2px 4px', borderRadius: '3px', lineHeight: '18px' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
            >
              <span style={{ color: '#334155', flexShrink: 0, fontSize: '10px' }}>
                {new Date(l.time).toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <span style={{ color: eventColor(l.event), flexShrink: 0, fontWeight: 700, width: '70px', fontSize: '10px' }}>{l.event}</span>
              <span style={{ color: '#3b82f6', flexShrink: 0, fontSize: '10px' }}>{l.domain}</span>
              <span style={{ color: '#334155' }}>→</span>
              <span style={{ color: privateRe.test(l.ip) ? '#ff0055' : '#0f0', fontWeight: 700, fontSize: '10px' }}>{l.ip}</span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   ★★★ MAIN PAGE COMPONENT ★★★
   ═══════════════════════════════════════════════════════ */
export default function DnsResolver() {
  const [records, setRecords] = useState([]);
  const [logs, setLogs] = useState([]);
  const [editRecord, setEditRecord] = useState(null);
  const [autoRebind, setAutoRebind] = useState(false);
  const [queryDomain, setQueryDomain] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [querying, setQuerying] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState('ip');
  const [activeTableTab, setActiveTableTab] = useState('standard');
  const timerRef = useRef(null);

  /* ── API helpers ── */
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

  const handleInstantUpdate = async (domain, ip) => {
    try {
      const res = await fetch(`${API}/update-dns-instant`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, ip }),
      });
      const data = await res.json();
      if (data.records) setRecords(data.records);
      if (data.recentLogs) setLogs(prev => {
        const merged = [...data.recentLogs, ...prev.filter(l => !data.recentLogs.some(n => n.time === l.time))];
        return merged.sort((a, b) => b.time - a.time).slice(0, 100);
      });
      if (queryResult?.domain === domain) setQueryResult(prev => ({ ...prev, ips: [ip] }));
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

  const handleClearLogs = async () => {
    await fetch(`${API}/dns-logs/clear`, { method: 'POST' });
    setLogs([]);
  };

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#e2e8f0', fontFamily: "'Rajdhani', sans-serif" }}>
      <MatrixCanvas />

      {/* ═══ HEADER BAR ═══ */}
      <div style={{
        position: 'relative', zIndex: 10, padding: '20px', maxWidth: '1600px', margin: '0 auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Link to="/" style={{
            color: '#00f3ff', fontFamily: "'Orbitron', sans-serif", fontSize: '10px', fontWeight: 700,
            background: 'rgba(255,255,255,0.03)', padding: '8px 20px', borderRadius: '100px',
            border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none',
            letterSpacing: '3px', transition: '0.3s', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            ← MAIN_PIPELINE
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setAutoRebind(!autoRebind)}
              style={{
                fontFamily: "'Orbitron', sans-serif", fontSize: '10px', fontWeight: 700,
                background: autoRebind ? 'rgba(255,170,0,0.08)' : 'rgba(255,255,255,0.03)',
                color: autoRebind ? '#ffaa00' : '#475569',
                padding: '8px 16px', borderRadius: '100px',
                border: autoRebind ? '1px solid rgba(255,170,0,0.25)' : '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer', letterSpacing: '1px', transition: '0.3s',
              }}>
              {autoRebind ? '⚡ AUTO_REBIND: ON' : '⚡ AUTO_REBIND: OFF'}
            </motion.button>

            <div style={{
              color: '#22c55e', fontWeight: 700, fontSize: '10px',
              fontFamily: "'Orbitron', sans-serif", letterSpacing: '3px',
              background: 'rgba(34,197,94,0.04)', padding: '8px 16px', borderRadius: '100px',
              border: '1px solid rgba(34,197,94,0.15)',
              boxShadow: '0 0 15px rgba(34,197,94,0.1)',
            }}>
              DNS_RESOLVER_NODE_ACTIVE
            </div>
          </div>
        </div>

        {/* ═══ 3-COLUMN GRID LAYOUT ═══ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '350px 1fr 340px',
          gridTemplateRows: 'auto auto',
          gap: '15px',
        }}>

          {/* ── Left: Configurator ── */}
          <div style={{ ...panelStyle, minHeight: '480px' }}>
            <PanelHeader right={
              <div style={{
                display: 'flex', background: '#000', padding: '3px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)', gap: '4px', width: '210px',
              }}>
                <button onClick={() => setActiveFormTab('ip')}
                  style={{
                    background: activeFormTab === 'ip' ? '#2563eb' : 'transparent',
                    color: activeFormTab === 'ip' ? '#fff' : '#555',
                    padding: '6px 2px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                    borderRadius: '7px', border: 'none', cursor: 'pointer', flex: 1, textAlign: 'center',
                    fontFamily: "'Orbitron', sans-serif", transition: '0.3s',
                    boxShadow: activeFormTab === 'ip' ? '0 0 10px rgba(37,99,235,0.5)' : 'none',
                  }}>IP Records</button>
                <button onClick={() => setActiveFormTab('redirect')}
                  style={{
                    background: activeFormTab === 'redirect' ? '#2563eb' : 'transparent',
                    color: activeFormTab === 'redirect' ? '#fff' : '#555',
                    padding: '6px 2px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                    borderRadius: '7px', border: 'none', cursor: 'pointer', flex: 1, textAlign: 'center',
                    fontFamily: "'Orbitron', sans-serif", transition: '0.3s',
                    boxShadow: activeFormTab === 'redirect' ? '0 0 10px rgba(37,99,235,0.5)' : 'none',
                  }}>Redirects</button>
              </div>
            }>Configurator</PanelHeader>
            {activeFormTab === 'ip' ? (
              <RecordForm editRecord={editRecord && editRecord.mode !== 'redirect' ? editRecord : null} onSave={handleSave} onCancel={() => setEditRecord(null)} />
            ) : (
              <RedirectForm editRecord={editRecord && editRecord.mode === 'redirect' ? editRecord : null} onSave={handleSave} onCancel={() => setEditRecord(null)} />
            )}
          </div>

          {/* ── Center: Resolution Flow Path ── */}
          <div style={{ ...panelStyle, minHeight: '480px' }}>
            <PanelHeader right={
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input value={queryDomain} onChange={e => setQueryDomain(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleResolve()}
                  placeholder="Resolve domain..."
                  style={{
                    background: '#000', border: '1px solid #333', color: '#00f3ff',
                    padding: '4px 10px', fontSize: '10px', fontFamily: 'monospace', outline: 'none',
                    borderRadius: '6px', width: '160px',
                  }} />
                <motion.button whileTap={{ scale: 0.9 }} onClick={handleResolve}
                  style={{
                    background: '#2563eb', border: 'none', color: '#fff', padding: '4px 10px',
                    fontSize: '9px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer',
                    fontFamily: "'Orbitron', sans-serif",
                  }}>🔍</motion.button>
              </div>
            }>Resolution Flow Path</PanelHeader>
            <FlowVisualization records={records} queryResult={queryResult} querying={querying} />
          </div>

          {/* ── Right: Telemetry ── */}
          <TelemetryPanel records={records} queryResult={queryResult} />

          {/* ── Bottom-left (spans 2 cols): Node Record Topology ── */}
          <div style={{ gridColumn: 'span 2' }}>
            <NodeTopologyTable
              records={records}
              onDelete={handleDelete}
              onEdit={(r) => { setEditRecord(r); setActiveFormTab(r.mode === 'redirect' ? 'redirect' : 'ip'); }}
              onInstantUpdate={handleInstantUpdate}
              activeTab={activeTableTab}
              setActiveTab={setActiveTableTab}
            />
          </div>

          {/* ── Bottom-right: Threat Stream Log ── */}
          <ThreatStreamLog logs={logs} onClear={handleClearLogs} />
        </div>
      </div>
    </div>
  );
}
