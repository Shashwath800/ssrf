import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function MlAnalyzer() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle, analyzing, result
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const analyze = async (e) => {
    e.preventDefault();
    if (!url) return;

    setStatus('analyzing');
    setError('');
    setResult(null);

    // Minor artificial delay for UX feel of "computation"
    await new Promise(r => setTimeout(r, 600));

    try {
        const res = await fetch('/api/ml-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl: url })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Failed to analyze URL');
        }

        setResult(data);
        setStatus('result');
    } catch (err) {
        setError(err.message);
        setStatus('idle');
    }
  };

  const getRiskColor = (level) => {
      if (level === 'high') return 'text-red-500';
      if (level === 'medium') return 'text-orange-400';
      return 'text-green-400';
  };

  const getRiskBg = (level) => {
    if (level === 'high') return 'bg-red-500/10 border-red-500/30';
    if (level === 'medium') return 'bg-orange-500/10 border-orange-500/30';
    return 'bg-green-500/10 border-green-500/30';
  };

  const expIcon = (type) => {
      if (type === 'critical') return 'fa-radiation text-red-500';
      if (type === 'high') return 'fa-exclamation-triangle text-orange-400';
      if (type === 'medium') return 'fa-search text-yellow-400';
      if (type === 'success') return 'fa-check text-green-400';
      return 'fa-info-circle text-cyan-400';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-300 p-6 md:p-12 selection:bg-purple-500/30 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-black to-black pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="mb-10 text-center">
            <Link to="/" className="text-indigo-400 hover:text-indigo-300 text-xs mb-4 inline-flex items-center gap-2 uppercase tracking-widest font-bold">
                <i className="fas fa-chevron-left"></i> BACK TO DASHBOARD
            </Link>
            <h1 className="text-4xl lg:text-5xl font-black text-white orbitron-title tracking-tight mt-4 flex items-center justify-center gap-4">
                ML <span className="font-light text-slate-500">|</span> <span className="text-indigo-400">ANALYZER</span>
            </h1>
            <p className="mt-3 text-slate-400 text-sm max-w-2xl mx-auto">
                Pure JavaScript Machine Learning. Evaluates URLs for SSRF traits using weighted feature extraction and logistic regression.
            </p>
        </header>

        {/* Main Input Card */}
        <div className="bg-[#111114] border border-[#1f1f23] rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#1f1f23] bg-[#151519]">
                <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-microchip text-indigo-500"></i> Pure JS Classification Engine
                </h2>
            </div>
            
            <div className="p-6 md:p-8">
                <form onSubmit={analyze} className="relative flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <i className="fas fa-link absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                        <input 
                            type="text" 
                            placeholder="https://example.com/api?url=target"
                            className="w-full bg-[#0d0d10] border border-slate-700 text-white rounded-lg pl-12 pr-4 py-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-sm transition-all"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={status === 'analyzing'}
                        />
                    </div>
                    <button 
                        type="submit"
                        disabled={!url || status === 'analyzing'}
                        className={`md:w-48 py-4 rounded-lg font-bold tracking-wider uppercase text-sm transition-all flex items-center justify-center gap-2 ${
                            !url || status === 'analyzing' 
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                        }`}
                    >
                        {status === 'analyzing' ? (
                            <><i className="fas fa-circle-notch fa-spin"></i> Processing...</>
                        ) : (
                            <><i className="fas fa-brain"></i> Analyze</>
                        )}
                    </button>
                </form>

                {error && (
                    <div className="mt-4 p-4 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                        <i className="fas fa-exclamation-triangle"></i> {error}
                    </div>
                )}
            </div>
        </div>

        {/* Results Panel */}
        {status === 'result' && result && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                
                {/* Score Column */}
                <div className="lg:col-span-1 space-y-6">
                    <div className={`border rounded-xl p-6 text-center shadow-lg relative overflow-hidden ${getRiskBg(result.riskLevel)}`}>
                        {result.riskLevel === 'high' && <div className="absolute inset-0 bg-red-500/5 animate-pulse rounded-xl"></div>}
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 relative z-10">ML Risk Probability</h3>
                        <div className={`text-6xl font-black font-mono tracking-tighter my-4 relative z-10 ${getRiskColor(result.riskLevel)}`}>
                            {result.riskScore}<span className="text-2xl text-slate-500">%</span>
                        </div>
                        <div className={`text-sm font-bold uppercase tracking-widest relative z-10 ${getRiskColor(result.riskLevel)}`}>
                            {result.riskLevel} RISK
                        </div>
                    </div>

                    <div className="bg-[#111114] border border-[#1f1f23] rounded-xl p-6 shadow-lg">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Model Confidence</h3>
                        
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300">Certainty</span>
                            <span className="font-mono text-indigo-400">{result.confidence}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 mb-6">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${result.confidence}%` }}></div>
                        </div>

                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300">Anomaly Index (OOD)</span>
                            <span className="font-mono text-purple-400">{result.anomalyScore}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${result.anomalyScore * 100}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Breakdown Column */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Explainability Panel */}
                    <div className="bg-[#111114] border border-[#1f1f23] rounded-xl overflow-hidden shadow-lg h-full">
                        <div className="p-4 border-b border-[#1f1f23] bg-[#151519] flex justify-between items-center">
                            <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <i className="fas fa-list-ul text-emerald-500"></i> Model Explainability
                            </h2>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-mono tracking-widest uppercase">
                                Features: {Object.keys(result.features).length}
                            </span>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {result.explanations.map((exp, i) => (
                                    <div key={i} className="flex gap-3 items-start bg-[#15151a] p-4 rounded-lg border border-slate-800/50">
                                        <div className="mt-0.5"><i className={`fas ${expIcon(exp.type)} w-4 text-center`}></i></div>
                                        <p className="text-sm text-slate-300 leading-relaxed">{exp.text}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 pt-6 border-t border-[#1f1f23]">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Raw Extracted Features</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {Object.entries(result.features).map(([key, value]) => (
                                        <div key={key} className="bg-[#0d0d10] border border-slate-800 rounded p-3 text-center">
                                            <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">{key}</div>
                                            <div className="text-sm font-mono text-indigo-300">{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        )}

      </div>
    </div>
  );
}
