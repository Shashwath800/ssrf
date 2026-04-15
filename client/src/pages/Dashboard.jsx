import React, { useState, useEffect, useRef } from 'react';
import { useScan } from '../ScanContext';
import { Link } from 'react-router-dom';

const stages = [
    { name: "Audit & Alert Layer", label: "AUDIT & ALERT LAYER", failTag: "FLAGGED", info: "Logs the initial request parameters and metadata." },
    { name: "URL Normalizer", label: "URL NORMALIZATION", failTag: "MIME BLOCK", info: "Normalizes Unicode, Hex, and Octal encodings to prevent bypasses." },
    { name: "Protocol + Port Validator", label: "PROTOCOL VALIDATION", failTag: "UNSUPPORTED SCHEME", info: "Restricts access to http/https and strictly blocks dangerous schemes." },
    { name: "DNS Resolver", label: "DNS RESOLUTION", failTag: "DNS THREAT", info: "Resolves hostname to IP and validates against internal network ranges." },
    { name: "IP Validator (IPv4+IPv6)", label: "IP BLACKLIST COMPARE", failTag: "IP BLOCKER", info: "Blocks access to loopback (127.0.0.1) and private network ranges." },
    { name: "Allowlist Checker", label: "ALLOWLIST VERIFICATION", failTag: "FILTERED", info: "Checks against the approved organizational whitelist." },
    { name: "IP Locking", label: "ANTI-REBINDING LOCK", failTag: "TOCTOU ALERT", info: "Locks the resolved IP to prevent time-of-use changes." },
    { name: "Redirect Revalidation", label: "REDIRECT REVALIDATION", failTag: "HIJACKED", info: "Ensures redirected URLs pass the entire security pipeline again." },
    { name: "Request Metadata Limiter", label: "METADATA LIMITER", failTag: "LEAK DETECTED", info: "Strips malicious headers to prevent internal exploitation." },
    { name: "Egress Firewall (Network Layer)", label: "EGRESS FIREWALL", failTag: "BLOCKED", info: "Final verification of destination IP just before traffic leaves the server." },
    { name: "Fetch Engine", label: "SECURE FETCH", failTag: "NETWORK ERR", info: "Safely requests the resource using low-level socket controls." },
    { name: "Timeout & Size Enforcer", label: "SIZE ENFORCER", failTag: "BOMB DETECTED", info: "Prevents infinite streams and large file downloads." },
    { name: "Response Inspection Layer", label: "RESPONSE INSPECTION", failTag: "SECRETS LEAKED", info: "Scans payload body for credentials, API keys, or cloud metadata." }
];

export default function Dashboard() {
    const { isScanning, scanResult, runScan } = useScan();
    const [urlInput, setUrlInput] = useState('');
    const [view, setView] = useState('pipeline'); // 'pipeline' | 'module'
    const [activeModule, setActiveModule] = useState(0);
    const [aiExplanation, setAiExplanation] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);

    // Dynamic auto-scrolling
    const processingNodeRef = useRef(null);

    useEffect(() => {
        if (processingNodeRef.current && view === 'pipeline') {
            processingNodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [scanResult, isScanning, view]);

    useEffect(() => {
        const canvas = document.getElementById('matrix-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const chars = "01ABCDEFGHIJKLMNOPQRSTUVWXYZｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ";
        const drops = Array(Math.floor(canvas.width / 16)).fill(1);
        const interval = setInterval(() => {
            ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = "16px monospace";
            for (let i = 0; i < drops.length; i++) {
                ctx.fillStyle = Math.random() > 0.9 ? "#fff" : "#0f0";
                ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 16, drops[i] * 16);
                if (drops[i] * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        }, 50);

        // Handle resize
        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleStartScan = () => {
        if (!urlInput) return alert("Enter TARGET URL...");
        setView('pipeline');
        runScan(urlInput);
    };

    const fetchGroqExplanation = async (idx, currentScanResult) => {
        const stage = stages[idx];
        const steps = currentScanResult?.steps || [];

        // Exact match first, then partial/case-insensitive fallback
        let stepResult = steps.find(s => s.step === stage.name);
        if (!stepResult) {
            stepResult = steps.find(s =>
                s.step?.toLowerCase().includes(stage.name.split(' ')[0].toLowerCase()) ||
                stage.name.toLowerCase().includes((s.step || '').split(' ')[0].toLowerCase())
            );
        }

        if (!stepResult) {
            setAiExplanation(null);
            setAiLoading(false);
            return;
        }

        // Gather logs specific to this step for richer context
        const stepLogs = (currentScanResult?.logs || [])
            .filter(l => l.step === stage.name || l.step === stepResult.step)
            .map(l => `[${l.status}] ${l.message}`);

        setAiLoading(true);
        setAiExplanation(null);
        try {
            const res = await fetch('/api/explain-step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: stepResult.step,
                    status: stepResult.status,
                    reason: stepResult.reason,
                    data: stepResult.data,
                    targetUrl: currentScanResult?.url || '',
                    stepLogs,
                }),
            });
            if (!res.ok) {
                const errText = await res.text();
                setAiExplanation(`API Error ${res.status}: ${errText}`);
                return;
            }
            const json = await res.json();
            setAiExplanation(json.explanation || 'No explanation returned.');
        } catch (err) {
            setAiExplanation(`Network error: ${err.message}. Is the backend running on port 4000?`);
        } finally {
            setAiLoading(false);
        }
    };

    const handleShowModule = (idx) => {
        setActiveModule(idx);
        setView('module');
        // Pass current scanResult directly to avoid stale closure
        fetchGroqExplanation(idx, scanResult);
        window.scrollTo(0, 0);
    };

    return (
        <>
            <canvas id="matrix-canvas"></canvas>

            <div id="sidebar">
                <div className="text-cyan-400 font-bold mb-10 border-b border-cyan-900 pb-2 italic tracking-tighter">CONSTRUCT_MENU</div>
                <nav className="space-y-4">
                    <div onClick={() => setView('pipeline')} className="hover:text-cyan-400 cursor-pointer flex items-center gap-3 text-slate-400 text-sm transition">
                        <i className="fas fa-project-diagram"></i> MAIN_PIPELINE
                    </div>
                    <Link to="/dns-resolver" className="hover:text-cyan-400 cursor-pointer flex items-center gap-3 text-slate-400 text-sm transition mt-2">
                        <i className="fas fa-globe"></i> DNS_RESOLVER
                    </Link>
                    <Link to="/attack-demo" className="hover:text-red-400 cursor-pointer flex items-center gap-3 text-slate-400 text-sm transition mt-2">
                        <i className="fas fa-crosshairs"></i> ATTACK_DEMO
                    </Link>
                    <div className="text-[10px] text-slate-600 uppercase tracking-widest mt-6 mb-2">Modules</div>
                    <div id="sidebar-links" className="space-y-2">
                        {stages.map((s, i) => (
                            <div key={i} onClick={() => handleShowModule(i)} className="w-full text-left text-xs text-slate-500 hover:text-cyan-400 cursor-pointer transition py-1 uppercase">
                                {i < 9 ? '0'+(i+1) : (i+1)} // {s.label.split(' ')[0]}
                            </div>
                        ))}
                    </div>
                </nav>
            </div>

            {view === 'pipeline' && (
                <main id="pipeline-view" className="relative z-10 w-full px-4 pt-20 pb-40">
                    <header className="text-center mb-16">
                        <h1 className="text-6xl font-black text-white mb-4 orbitron-title">SSRF <span className="text-cyan-400">GUARD</span></h1>
                        <div className="h-1 w-48 bg-cyan-500 mx-auto rounded-full blur-[1px]"></div>
                        <p className="mt-6 text-cyan-800 font-bold uppercase tracking-[0.6em] text-xs">Vertical Construct v4.5 // Synchronized</p>
                    </header>

                    <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4 mb-32">
                        <input 
                            type="text" 
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleStartScan()}
                            placeholder="ENTER TARGET URL..." 
                            className="flex-grow bg-black/90 border-2 border-slate-800 p-5 rounded outline-none focus:border-cyan-400 text-cyan-200 font-mono text-sm transition-all"
                        />
                        <button onClick={handleStartScan} disabled={isScanning} className="btn-execute px-10 py-5 rounded font-black text-white uppercase shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            {isScanning ? 'SCANNING...' : 'SCAN'}
                        </button>
                    </div>

                    <div id="flow-container" className="flex flex-col items-center">
                        {stages.map((stage, i) => {
                            let statusClass = '';
                            let iconClass = 'fas fa-circle-notch text-slate-800';
                            let isProcessing = false;

                            const stepsForThis = scanResult?.steps.filter(s => s.step === stage.name) || [];
                            const lastStep = stepsForThis[stepsForThis.length - 1];

                            const lastCompletedStepName = scanResult?.steps.length > 0 ? scanResult.steps[scanResult.steps.length - 1].step : null;
                            const lastCompletedStepIndex = lastCompletedStepName ? stages.findIndex(s => s.name === lastCompletedStepName) : -1;

                            if (lastStep) {
                                if (lastStep.status === 'PASS') {
                                    statusClass = 'success';
                                    iconClass = 'fas fa-check text-green-400';
                                } else {
                                    statusClass = 'failed';
                                    iconClass = 'fas fa-times text-red-500';
                                }
                            } else if (isScanning && scanResult && !scanResult.isDone) {
                                // If NO step has happened yet, stage 0 is processing
                                if (scanResult.steps.length === 0 && i === 0) {
                                    statusClass = 'processing';
                                    iconClass = 'fas fa-spinner fa-spin text-amber-500';
                                    isProcessing = true;
                                } 
                                // Otherwise, the stage right after the last completed one is processing
                                else if (i === lastCompletedStepIndex + 1) {
                                    statusClass = 'processing';
                                    iconClass = 'fas fa-spinner fa-spin text-amber-500';
                                    isProcessing = true;
                                }
                            }

                            let connectorClass = 'connector';
                            if (statusClass === 'success') {
                                connectorClass += ' drawn active-flow';
                            } else if (statusClass === 'failed') {
                                connectorClass += ' drawn fail-path';
                            }

                            // Dynamic visibility cascade
                            let isVisible = false;
                            if (scanResult) {
                                if (lastStep) {
                                    isVisible = true;
                                } else if (isScanning && i <= lastCompletedStepIndex + 1) {
                                    isVisible = true;
                                } else if (scanResult.isDone && i <= lastCompletedStepIndex) {
                                    isVisible = true;
                                }
                            }

                            return (
                                <div key={i} className={`node-wrapper ${isVisible ? 'visible' : ''}`} ref={isProcessing ? processingNodeRef : null}>
                                    <div id={`node-${i}`} onClick={() => handleShowModule(i)} className={`node rounded-lg shadow-2xl ${statusClass}`}>
                                        <div className="text-left">
                                            <div className="text-[10px] text-cyan-600 font-bold tracking-widest uppercase">
                                                STAGE {i < 9 ? '0'+(i+1) : (i+1)}
                                            </div>
                                            <h3 className="text-xl font-bold text-white tracking-wider">{stage.label}</h3>
                                        </div>
                                        <div className={`status-icon text-2xl ${statusClass === '' ? 'text-slate-800' : ''}`}>
                                            <i className={iconClass}></i>
                                        </div>
                                        <div className="fail-branch">
                                            <div className="branch-line"></div>
                                            <div className="fail-tag">{stage.failTag}</div>
                                        </div>
                                    </div>
                                    {i < stages.length - 1 && (
                                        <div id={`line-${i}`} className={connectorClass}>
                                            <div className="particle"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </main>
            )}

            {view === 'module' && (
                <section id="demo-view" className="relative z-10 w-full max-w-4xl mx-auto pt-20">
                    <button onClick={() => setView('pipeline')} className="text-cyan-400 mb-10 hover:underline flex items-center gap-2">
                        <i className="fas fa-arrow-left"></i> BACK_TO_PIPELINE
                    </button>
                    <div id="demo-content">
                        <div className="demo-card">
                            <h2 className="text-5xl font-bold text-white mb-6 tracking-tighter">{stages[activeModule].label}</h2>

                            {/* AI Explanation Section */}
                            <div className="mb-8 p-5 rounded-lg border border-cyan-500/30 bg-cyan-900/10 relative min-h-[80px]">
                                <div className="text-[10px] text-cyan-600 font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
                                    <i className="fas fa-robot"></i> AI ANALYSIS // GROQ
                                </div>
                                {aiLoading ? (
                                    <div className="flex items-center gap-3 text-cyan-400 text-sm">
                                        <i className="fas fa-spinner fa-spin"></i>
                                        <span className="font-mono tracking-wider">Querying Groq LLM...</span>
                                    </div>
                                ) : aiExplanation ? (
                                    <p className="text-lg text-slate-200 leading-relaxed font-light">{aiExplanation}</p>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">Run a scan first, then click a stage to get a live AI explanation of what happened.</p>
                                )}
                            </div>

                            {/* Live Logs from scan */}
                            <div className="p-6 bg-black/50 border-l-4 border-cyan-500 font-mono text-green-500 overflow-x-auto">
                                &gt; MODULE_ID: {activeModule < 9 ? '0'+(activeModule+1) : (activeModule+1)}<br/>
                                &gt; STATUS: OPERATIONAL<br/>
                                &gt; LOGGING: ACTIVE<br/><br/>
                                {scanResult?.logs.filter(l => l.step === stages[activeModule].name).length > 0 ? (
                                    scanResult.logs.filter(l => l.step === stages[activeModule].name).map((log, idx) => (
                                        <div key={idx} className={`mt-2 ${log.status === 'BLOCK' || log.status === 'ERROR' ? 'text-red-500' : 'text-green-400'}`}>
                                            [{new Date(log.timestamp).toLocaleTimeString()}] {log.status}: {log.message}
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-slate-600">$ No logs for this stage yet. Run a scan to see live results.</span>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </>
    );
}
