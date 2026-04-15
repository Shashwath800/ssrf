import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

const PRESETS = [
  {
    name: 'AWS Metadata',
    url: 'http://169.254.169.254/latest/meta-data/',
    icon: 'fab fa-aws',
    desc: 'Access EC2 instance metadata endpoint',
  },
  {
    name: 'AWS Credentials',
    url: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/fake-role',
    icon: 'fas fa-key',
    desc: 'Steal IAM role credentials directly',
  },
  {
    name: 'Internal Database',
    url: 'http://localhost:4000/internal/db',
    icon: 'fas fa-database',
    desc: 'Access internal DB with user passwords',
  },
  {
    name: 'DNS Rebinding',
    url: 'http://evil.com/latest/meta-data/iam/security-credentials/fake-role',
    icon: 'fas fa-skull-crossbones',
    desc: 'evil.com resolves to 169.254.169.254',
  },
];

const FLOW_STEPS = ['INPUT', 'DNS_RESOLVE', 'IP_CHECK', 'FETCH', 'RESPONSE'];
const FLOW_LABELS = {
  INPUT: 'User Input',
  DNS_RESOLVE: 'DNS Resolve',
  IP_CHECK: 'IP Validation',
  FETCH: 'HTTP Fetch',
  RESPONSE: 'Response',
};

export default function AttackDemo() {
  const [targetUrl, setTargetUrl] = useState('http://169.254.169.254/latest/meta-data/');
  const [mode, setMode] = useState('vulnerable');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [activeFlowStep, setActiveFlowStep] = useState(-1);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const logsEndRef = useRef(null);

  // Matrix rain
  useEffect(() => {
    const canvas = document.getElementById('attack-matrix-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const chars = 'SSRF01METADATA'.split('');
    const fontSize = 12;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

    const interval = setInterval(() => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = mode === 'vulnerable' ? '#ff005520' : '#00ff0020';
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }, 60);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => { clearInterval(interval); window.removeEventListener('resize', handleResize); };
  }, [mode]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [result?.logs]);

  const launchAttack = async () => {
    setIsRunning(true);
    setResult(null);
    setAiAnalysis(null);
    setAiLoading(false);
    setActiveFlowStep(0);

    // Animate the flow steps
    const flowDelay = mode === 'vulnerable' ? 400 : 600;
    for (let i = 0; i < FLOW_STEPS.length - 1; i++) {
      await new Promise(r => setTimeout(r, flowDelay));
      setActiveFlowStep(i + 1);
    }

    try {
      const res = await fetch('/api/attack-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl, mode }),
      });
      const data = await res.json();
      setResult(data);
      setActiveFlowStep(FLOW_STEPS.length);

      // Fire off AI analysis via Groq
      if (data.logs && !data.error) {
        setAiLoading(true);
        try {
          const aiRes = await fetch('/api/analyze-attack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              logs: data.logs,
              targetUrl,
              mode,
              blocked: data.blocked || false,
              leaked: data.leaked || false,
              resolvedIP: data.resolvedIP || '',
              reason: data.reason || '',
              responseBody: data.response?.body || null,
            }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            setAiAnalysis(aiData.analysis || 'No analysis returned.');
          } else {
            const errData = await aiRes.json().catch(() => ({}));
            setAiAnalysis(`AI Error: ${errData.error || aiRes.statusText}`);
          }
        } catch (aiErr) {
          setAiAnalysis(`AI unavailable: ${aiErr.message}`);
        } finally {
          setAiLoading(false);
        }
      }
    } catch (err) {
      setResult({ error: err.message, logs: [{ time: 0, event: 'NETWORK_ERROR', detail: err.message }] });
      setActiveFlowStep(FLOW_STEPS.length);
    } finally {
      setIsRunning(false);
    }
  };

  const handlePreset = (preset) => {
    setTargetUrl(preset.url);
    setResult(null);
    setActiveFlowStep(-1);
    setAiAnalysis(null);
  };

  const handleSubPath = async (path) => {
    setTargetUrl(path);
    setResult(null);
    setActiveFlowStep(-1);
    // Auto-launch
    setTimeout(() => {
      setTargetUrl(path);
      document.getElementById('launch-btn')?.click();
    }, 100);
  };

  // Detect clickable sub-paths in text response
  const renderResponseBody = (body) => {
    if (typeof body === 'object') {
      return (
        <pre className="text-sm font-mono whitespace-pre-wrap break-all">
          {highlightSensitive(JSON.stringify(body, null, 2))}
        </pre>
      );
    }
    // Text response — make sub-paths clickable
    const lines = String(body).split('\n');
    return (
      <div className="font-mono text-sm">
        {lines.map((line, i) => {
          const trimmed = line.trim().replace(/\/$/, '');
          if (trimmed && !trimmed.includes(' ')) {
            const basePath = targetUrl.endsWith('/') ? targetUrl : targetUrl + '/';
            const fullPath = basePath + line.trim();
            return (
              <div
                key={i}
                className="cursor-pointer hover:text-cyan-300 hover:bg-cyan-500/10 px-2 py-1 rounded transition flex items-center gap-2"
                onClick={() => handleSubPath(fullPath)}
              >
                <i className="fas fa-folder-open text-amber-500 text-xs"></i>
                <span className="text-cyan-400 underline underline-offset-2">{line.trim()}</span>
                <i className="fas fa-arrow-right text-xs text-slate-600 ml-auto"></i>
              </div>
            );
          }
          return <div key={i} className="px-2 py-0.5 text-slate-300">{line}</div>;
        })}
      </div>
    );
  };

  // Highlight sensitive data in JSON strings
  const highlightSensitive = (str) => {
    const sensitivePatterns = [
      /("AccessKeyId"\s*:\s*")(.*?)(")/g,
      /("SecretAccessKey"\s*:\s*")(.*?)(")/g,
      /("Token"\s*:\s*")(.*?)(")/g,
      /("password"\s*:\s*")(.*?)(")/g,
      /("key"\s*:\s*")(.*?)(")/g,
      /("dbConnection"\s*:\s*")(.*?)(")/g,
    ];

    const parts = [];
    let lastIndex = 0;
    const allMatches = [];

    for (const pattern of sensitivePatterns) {
      let match;
      const regex = new RegExp(pattern.source, 'g');
      while ((match = regex.exec(str)) !== null) {
        allMatches.push({
          index: match.index + match[1].length,
          end: match.index + match[1].length + match[2].length,
          value: match[2],
          prefix: match[1],
          suffix: match[3],
          fullStart: match.index,
          fullEnd: match.index + match[0].length,
        });
      }
    }

    if (allMatches.length === 0) {
      return <span className="text-green-400">{str}</span>;
    }

    // Sort by position
    allMatches.sort((a, b) => a.fullStart - b.fullStart);

    for (const m of allMatches) {
      if (m.fullStart > lastIndex) {
        parts.push(<span key={`t-${lastIndex}`} className="text-green-400">{str.slice(lastIndex, m.fullStart)}</span>);
      }
      parts.push(
        <span key={`m-${m.fullStart}`}>
          <span className="text-green-400">{m.prefix}</span>
          <span className="text-red-500 font-bold bg-red-500/10 px-1 rounded">{m.value}</span>
          <span className="text-green-400">{m.suffix}</span>
        </span>
      );
      lastIndex = m.fullEnd;
    }
    if (lastIndex < str.length) {
      parts.push(<span key={`t-${lastIndex}`} className="text-green-400">{str.slice(lastIndex)}</span>);
    }
    return <>{parts}</>;
  };

  return (
    <>
      <canvas id="attack-matrix-canvas" style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        zIndex: 0, pointerEvents: 'none', opacity: 0.4,
      }}></canvas>

      <div className="relative z-10 min-h-screen p-6">
        {/* Header */}
        <header className="text-center mb-8">
          <Link to="/" className="text-cyan-400 hover:underline text-sm mb-4 inline-flex items-center gap-2">
            <i className="fas fa-arrow-left"></i> BACK TO DASHBOARD
          </Link>
          <h1 className="text-5xl font-black text-white mt-4 orbitron-title">
            SSRF <span className={mode === 'vulnerable' ? 'text-red-500' : 'text-green-400'}>ATTACK</span> SIMULATOR
          </h1>
          <div className={`h-1 w-48 mx-auto rounded-full blur-[1px] mt-3 ${mode === 'vulnerable' ? 'bg-red-500' : 'bg-green-500'}`}></div>
          <p className="mt-3 text-slate-500 font-bold uppercase tracking-[0.5em] text-xs">
            Controlled Environment // Educational Demo
          </p>
        </header>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ═══ LEFT PANEL — Controls ═══ */}
          <div className="lg:col-span-4 space-y-5">

            {/* Mode Toggle */}
            <div className="bg-black/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
              <div className="text-[10px] text-cyan-600 font-bold tracking-widest uppercase mb-3">
                ATTACK MODE
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { setMode('vulnerable'); setResult(null); setActiveFlowStep(-1); setAiAnalysis(null); }}
                  className={`flex-1 py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
                    mode === 'vulnerable'
                      ? 'bg-red-500/20 border-2 border-red-500 text-red-400 shadow-[0_0_20px_rgba(255,0,85,0.3)]'
                      : 'bg-slate-900 border-2 border-slate-700 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  <i className="fas fa-unlock mr-2"></i>Vulnerable
                </button>
                <button
                  onClick={() => { setMode('protected'); setResult(null); setActiveFlowStep(-1); setAiAnalysis(null); }}
                  className={`flex-1 py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
                    mode === 'protected'
                      ? 'bg-green-500/20 border-2 border-green-500 text-green-400 shadow-[0_0_20px_rgba(0,255,0,0.3)]'
                      : 'bg-slate-900 border-2 border-slate-700 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  <i className="fas fa-shield-alt mr-2"></i>Protected
                </button>
              </div>
            </div>

            {/* URL Input */}
            <div className="bg-black/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
              <div className="text-[10px] text-cyan-600 font-bold tracking-widest uppercase mb-3">
                TARGET URL
              </div>
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isRunning && launchAttack()}
                className="w-full bg-black/90 border-2 border-slate-800 p-4 rounded-lg outline-none focus:border-cyan-400 text-cyan-200 font-mono text-sm transition-all"
                placeholder="Enter target URL..."
              />
              <button
                id="launch-btn"
                onClick={launchAttack}
                disabled={isRunning || !targetUrl}
                className={`w-full mt-4 py-4 rounded-lg font-black text-white uppercase tracking-widest text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  mode === 'vulnerable'
                    ? 'bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 shadow-[0_0_30px_rgba(255,0,85,0.4)]'
                    : 'bg-gradient-to-r from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 shadow-[0_0_30px_rgba(0,255,0,0.4)]'
                }`}
              >
                {isRunning ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>ATTACKING...</>
                ) : (
                  <><i className="fas fa-crosshairs mr-2"></i>LAUNCH ATTACK</>
                )}
              </button>
            </div>

            {/* Preset Scenarios */}
            <div className="bg-black/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
              <div className="text-[10px] text-cyan-600 font-bold tracking-widest uppercase mb-3">
                ATTACK PRESETS
              </div>
              <div className="space-y-2">
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handlePreset(p)}
                    className="w-full text-left p-3 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <i className={`${p.icon} text-cyan-500 group-hover:text-cyan-400 w-5 text-center`}></i>
                      <div>
                        <div className="text-white text-sm font-bold">{p.name}</div>
                        <div className="text-slate-500 text-xs">{p.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ RIGHT PANEL — Results ═══ */}
          <div className="lg:col-span-8 space-y-5">

            {/* Attack Flow Visualization */}
            <div className="bg-black/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
              <div className="text-[10px] text-cyan-600 font-bold tracking-widest uppercase mb-4">
                ATTACK FLOW
              </div>
              <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
                {FLOW_STEPS.map((step, i) => {
                  let stepClass = 'bg-slate-900 border-slate-700 text-slate-500';
                  let connClass = 'bg-slate-800';

                  if (activeFlowStep > i) {
                    // Completed
                    if (result?.blocked && step === 'IP_CHECK') {
                      stepClass = 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(255,0,85,0.4)]';
                      connClass = 'bg-red-500';
                    } else if (result?.blocked && i >= FLOW_STEPS.indexOf('IP_CHECK')) {
                      stepClass = 'bg-red-500/10 border-red-800 text-red-600';
                      connClass = 'bg-red-800';
                    } else {
                      stepClass = mode === 'vulnerable'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-green-500/20 border-green-500 text-green-400';
                      connClass = mode === 'vulnerable' ? 'bg-amber-500' : 'bg-green-500';
                    }
                  } else if (activeFlowStep === i) {
                    // Active/Processing
                    stepClass = 'bg-cyan-500/20 border-cyan-400 text-cyan-300 animate-pulse shadow-[0_0_20px_rgba(0,243,255,0.4)]';
                    connClass = 'bg-cyan-500 animate-pulse';
                  }

                  return (
                    <React.Fragment key={step}>
                      <div className={`flex-shrink-0 px-3 py-2 rounded-lg border-2 text-xs font-bold uppercase tracking-wider text-center min-w-[90px] transition-all duration-500 ${stepClass}`}>
                        {FLOW_LABELS[step]}
                      </div>
                      {i < FLOW_STEPS.length - 1 && (
                        <div className={`flex-shrink-0 h-0.5 w-6 rounded transition-all duration-500 ${connClass}`}></div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Status Banner */}
            {result && !result.error && (
              <div className={`rounded-xl p-5 border-2 text-center font-black text-xl uppercase tracking-widest ${
                result.blocked
                  ? 'bg-green-500/10 border-green-500 text-green-400 shadow-[0_0_40px_rgba(0,255,0,0.2)]'
                  : result.leaked
                    ? 'bg-red-500/10 border-red-500 text-red-400 shadow-[0_0_40px_rgba(255,0,85,0.3)] animate-pulse'
                    : 'bg-amber-500/10 border-amber-500 text-amber-400'
              }`}>
                {result.blocked
                  ? <><i className="fas fa-shield-alt mr-3"></i>✅ ATTACK BLOCKED</>
                  : result.leaked
                    ? <><i className="fas fa-exclamation-triangle mr-3"></i>⚠️ EXPLOIT SUCCESSFUL — DATA LEAKED</>
                    : <><i className="fas fa-check mr-3"></i>Request Completed</>
                }
              </div>
            )}

            {/* Response Viewer */}
            {result && (
              <div className="bg-black/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
                <div className="text-[10px] text-cyan-600 font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
                  <i className="fas fa-terminal"></i> RESPONSE VIEWER
                </div>

                {result.blocked ? (
                  <div className="p-6 rounded-lg bg-green-500/5 border border-green-500/30">
                    <div className="text-green-400 font-bold text-lg mb-2">
                      <i className="fas fa-ban mr-2"></i>Request Blocked
                    </div>
                    <div className="text-slate-300 font-mono text-sm mb-3">
                      <span className="text-slate-500">Block Layer: </span>
                      <span className="text-cyan-400">{result.blockStep}</span>
                    </div>
                    <div className="text-slate-300 font-mono text-sm mb-3">
                      <span className="text-slate-500">Reason: </span>
                      <span className="text-amber-400">{result.reason}</span>
                    </div>
                    <div className="text-slate-300 font-mono text-sm">
                      <span className="text-slate-500">Resolved IP: </span>
                      <span className="text-red-400">{result.resolvedIP}</span>
                    </div>
                    {result.steps && (
                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <div className="text-[10px] text-cyan-600 font-bold tracking-widest uppercase mb-2">
                          PIPELINE STEPS
                        </div>
                        {result.steps.map((s, i) => (
                          <div key={i} className={`text-xs font-mono py-1 ${s.status === 'BLOCK' ? 'text-red-400' : 'text-green-400'}`}>
                            [{s.status}] {s.step}{s.reason ? ` — ${s.reason}` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : result.error ? (
                  <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-400 font-mono text-sm">
                    Error: {result.error}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-black/60 border border-slate-800 max-h-[400px] overflow-y-auto">
                    {result.response ? (
                      <>
                        <div className="flex items-center gap-4 mb-3 pb-3 border-b border-slate-800">
                          <span className="text-xs font-mono text-slate-500">
                            Status: <span className="text-green-400">{result.response.status}</span>
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            Type: <span className="text-cyan-400">{result.response.contentType}</span>
                          </span>
                        </div>
                        {renderResponseBody(result.response.body)}
                      </>
                    ) : (
                      <span className="text-slate-500 italic">No response body</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Logs Panel */}
            <div className="bg-black/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
              <div className="text-[10px] text-cyan-600 font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
                <i className="fas fa-scroll"></i> ATTACK LOGS
              </div>
              <div className="bg-black/80 rounded-lg p-4 font-mono text-xs max-h-[300px] overflow-y-auto border border-slate-900">
                {!result?.logs ? (
                  <div className="text-slate-600 italic">
                    $ Awaiting attack execution...
                  </div>
                ) : (
                  result.logs.map((log, i) => {
                    let color = 'text-slate-400';
                    if (log.event === 'EXPLOIT_SUCCESS' || log.event === 'FETCH_ERROR') color = 'text-red-400';
                    else if (log.event === 'ATTACK_BLOCKED') color = 'text-green-400';
                    else if (log.event === 'BLOCKED') color = 'text-red-400';
                    else if (log.event === 'STEP_PASS') color = 'text-green-400';
                    else if (log.event === 'IP_CHECK_SKIPPED') color = 'text-amber-400';
                    else if (log.event === 'URL_REWRITE') color = 'text-amber-400';
                    else if (log.event === 'DNS_RESOLVED') color = 'text-cyan-400';

                    return (
                      <div key={i} className={`py-0.5 ${color}`}>
                        <span className="text-slate-600">[{log.time}ms]</span>{' '}
                        <span className="text-slate-500">{log.event}</span>{' '}
                        {log.detail}
                      </div>
                    );
                  })
                )}
                <div ref={logsEndRef} />
              </div>

              {/* Summary */}
              {result && !result.error && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Domain</div>
                    <div className="text-cyan-400 font-mono text-sm truncate">{result.resolvedDomain || 'N/A'}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Resolved IP</div>
                    <div className={`font-mono text-sm ${result.blocked ? 'text-red-400' : 'text-amber-400'}`}>{result.resolvedIP || 'N/A'}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Final URL</div>
                    <div className="text-slate-300 font-mono text-sm truncate">{result.finalURL || 'N/A'}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Verdict</div>
                    <div className={`font-bold text-sm ${result.blocked ? 'text-green-400' : result.leaked ? 'text-red-400' : 'text-amber-400'}`}>
                      {result.blocked ? '🛡️ BLOCKED' : result.leaked ? '💀 LEAKED' : '✅ OK'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ═══ AI Security Analysis Panel (Groq-powered) ═══ */}
            {(aiLoading || aiAnalysis) && (
              <div className="bg-black/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
                <div className="text-[10px] text-cyan-600 font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
                  <i className="fas fa-brain"></i> 🧠 AI SECURITY ANALYSIS // GROQ
                </div>

                {aiLoading ? (
                  <div className="flex items-center gap-3 text-cyan-400 text-sm py-4">
                    <i className="fas fa-spinner fa-spin"></i>
                    <span className="font-mono tracking-wider">Analyzing attack via Groq LLM...</span>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-3">
                    {aiAnalysis.split('\n').filter(line => line.trim()).map((line, i) => {
                      const trimmed = line.trim();
                      const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
                      const isVerdict = trimmed.includes('VERDICT:');
                      const isExploit = trimmed.includes('🚨') || trimmed.toLowerCase().includes('exploit successful');
                      const isBlocked = trimmed.includes('✅') || trimmed.toLowerCase().includes('attack blocked');

                      if (isVerdict) {
                        return (
                          <div key={i} className={`mt-4 p-4 rounded-lg border-2 font-bold text-sm ${
                            isExploit
                              ? 'text-red-400 border-red-500/40 bg-red-500/5'
                              : 'text-green-400 border-green-500/40 bg-green-500/5'
                          }`}>
                            {trimmed}
                          </div>
                        );
                      }

                      return (
                        <div key={i} className="flex gap-3 items-start">
                          {isBullet && <span className="text-cyan-500 mt-1 text-xs">●</span>}
                          <p className={`text-sm leading-relaxed ${
                            isBullet ? 'text-slate-300' : 'text-slate-400'
                          }`}>
                            {isBullet ? trimmed.replace(/^[•\-]\s*/, '') : trimmed}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-slate-700 text-xs uppercase tracking-widest">
          ⚠️ Safe Simulation Environment — All Data Is Fake & Local
        </footer>
      </div>
    </>
  );
}
