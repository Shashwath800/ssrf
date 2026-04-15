import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function RiskAnalyzer() {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const analyzeUrl = async (e) => {
    if (e) e.preventDefault();
    if (!url) return;

    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/analyze-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze URL');
      }
      
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 60) return 'text-red-500 bg-red-500/10 border-red-500/30';
    if (score >= 30) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    return 'text-green-400 bg-green-500/10 border-green-500/30';
  };

  const getTextColor = (score) => {
    if (score >= 60) return 'text-red-500';
    if (score >= 30) return 'text-amber-500';
    return 'text-green-400';
  };

  const getBarColor = (score) => {
    if (score >= 60) return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
    if (score >= 30) return 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]';
    return 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]';
  };

  return (
    <div className="min-h-screen p-6 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center mb-12">
          <Link to="/" className="text-cyan-400 hover:underline text-sm mb-4 inline-flex items-center gap-2">
            <i className="fas fa-arrow-left"></i> BACK TO DASHBOARD
          </Link>
          <h1 className="text-5xl font-black text-white mt-4 orbitron-title tracking-tighter">
            AI SSRF <span className="text-cyan-400">RISK ANALYZER</span>
          </h1>
          <p className="mt-4 text-slate-400 text-sm max-w-2xl mx-auto border border-amber-500/30 bg-amber-500/5 p-3 rounded-lg">
            <i className="fas fa-brain text-amber-500 mr-2"></i>
            This tool uses a multi-agent AI system to safely estimate SSRF risk based on observable patterns. 
            <strong className="text-amber-400 ml-1">It does not perform real exploitation.</strong>
          </p>
        </header>

        {/* Input Section */}
        <div className="bg-black/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm max-w-3xl mx-auto shadow-2xl">
          <form onSubmit={analyzeUrl} className="flex gap-4">
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/api?url=..."
              className="flex-1 bg-black/90 border-2 border-slate-800 p-4 rounded-xl outline-none focus:border-cyan-500 text-cyan-200 font-mono transition-all"
            />
            <button
              type="submit"
              disabled={isAnalyzing || !url}
              className="px-8 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {isAnalyzing ? (
                <><i className="fas fa-spinner fa-spin"></i> Analyzing...</>
              ) : (
                <><i className="fas fa-radar"></i> Analyze</>
              )}
            </button>
          </form>
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-[fadeIn_0.5s_ease-out]">
            
            {/* Overview Cards */}
            <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Risk Score */}
              <div className={`rounded-2xl p-6 border ${getRiskColor(result.strategist.riskScore)} flex flex-col justify-center items-center backdrop-blur-sm`}>
                <div className="text-[10px] font-bold tracking-widest uppercase mb-4 text-slate-400">
                  Risk Score
                </div>
                <div className="text-6xl font-black mb-4">
                  {result.strategist.riskScore}<span className="text-2xl text-slate-500 font-medium">/100</span>
                </div>
                <div className="w-full bg-black/50 h-3 rounded-full overflow-hidden border border-slate-800/50">
                  <div 
                    className={`h-full transition-all duration-1000 ${getBarColor(result.strategist.riskScore)}`}
                    style={{ width: `${result.strategist.riskScore}%` }}
                  ></div>
                </div>
              </div>

              {/* Attackability Level */}
              <div className={`rounded-2xl p-6 border flex flex-col justify-center items-center backdrop-blur-sm ${getRiskColor(result.strategist.riskScore)}`}>
                <div className="text-[10px] font-bold tracking-widest uppercase mb-4 text-slate-400">
                  Attackability Level
                </div>
                <div className="text-5xl font-black uppercase flex items-center gap-3">
                  {result.strategist.attackability === 'High' && <i className="fas fa-radiation"></i>}
                  {result.strategist.attackability === 'Medium' && <i className="fas fa-exclamation-triangle"></i>}
                  {result.strategist.attackability === 'Low' && <i className="fas fa-shield-check"></i>}
                  {result.strategist.attackability}
                </div>
              </div>

              {/* Confidence Score */}
              <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50 flex flex-col justify-center items-center backdrop-blur-sm">
                <div className="text-[10px] font-bold tracking-widest uppercase mb-4 text-slate-400">
                  AI Confidence
                </div>
                <div className="text-5xl font-black text-cyan-400 mb-2">
                  {result.strategist.confidence}%
                </div>
                <div className="text-xs text-slate-500 text-center">
                  Based on multiple signal confirmations
                </div>
              </div>
            </div>

            {/* AI Explanation (Strategist) */}
            <div className="lg:col-span-4 bg-black/60 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
               <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 text-cyan-400">
                   <i className="fas fa-robot text-xl"></i>
                 </div>
                 <h2 className="text-2xl font-bold text-white tracking-wide">Strategist Analysis</h2>
               </div>
               
               {result.strategist.reasoning ? (
                 <div className="space-y-4">
                   {result.strategist.reasoning.split('\n').filter(l => l.trim()).map((line, i) => {
                     const isVerdict = line.toLowerCase().includes('verdict:');
                     const isRisky = line.includes('🚨') || line.toLowerCase().includes('dangerous') || line.toLowerCase().includes('high risk');
                     
                     if (isVerdict) {
                       return (
                         <div key={i} className={`mt-6 p-5 rounded-xl border-2 font-bold text-base ${isRisky ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-green-500/10 border-green-500/40 text-green-400'}`}>
                           {line}
                         </div>
                       );
                     }
                     return (
                       <div key={i} className="flex gap-4 items-start">
                         <span className="text-cyan-500 mt-1.5 text-[10px]"><i className="fas fa-square"></i></span>
                         <p className="text-slate-300 text-lg leading-relaxed">{line.replace(/^[•\-]\s*/, '')}</p>
                       </div>
                     );
                   })}
                 </div>
               ) : (
                 <p className="text-slate-500 italic">No detailed reasoning available.</p>
               )}
            </div>

            {/* Multi-Agent Panel */}
            <div className="lg:col-span-2 bg-gradient-to-b from-slate-900 to-black border border-slate-800 rounded-2xl p-6 overflow-hidden flex flex-col max-h-[600px]">
              <h3 className="text-[10px] text-cyan-600 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
                <i className="fas fa-network-wired"></i> MULTI-AGENT TELEMETRY
              </h3>
              
              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {result.agents.map((agent, i) => (
                  <div key={i} className="bg-black/40 border border-slate-800/50 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3 border-b border-slate-800/50 pb-2">
                      <div className="font-bold text-cyan-400 text-sm">{agent.agent}</div>
                      <div className={`text-xs font-mono font-bold px-2 py-1 rounded bg-black ${getTextColor(agent.risk)}`}>
                        Risk: {agent.risk}
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {agent.findings.map((f, j) => (
                        <li key={j} className="flex gap-2 items-start text-xs">
                          <span className={`mt-0.5 ${f.type === 'good' ? 'text-green-500' : f.type === 'warning' ? 'text-amber-500' : f.type === 'critical' ? 'text-red-500' : 'text-slate-500'}`}>
                            {f.type === 'good' && <i className="fas fa-check-circle"></i>}
                            {f.type === 'warning' && <i className="fas fa-exclamation-triangle"></i>}
                            {f.type === 'critical' && <i className="fas fa-skull"></i>}
                            {(f.type === 'info' || !f.type) && <i className="fas fa-info-circle"></i>}
                          </span>
                          <span className="text-slate-300 leading-relaxed">{f.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="lg:col-span-2 bg-black/60 border border-slate-800 rounded-2xl p-6 flex flex-col">
              <h3 className="text-[10px] text-emerald-600 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
                <i className="fas fa-shield-alt"></i> REMEDIATION RECOMMENDATIONS
              </h3>
              
              <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                {result.strategist.recommendations.map((rec, i) => (
                  <div key={i} className="bg-emerald-950/10 border border-emerald-900/30 rounded-xl p-4 flex gap-4 items-start hover:border-emerald-500/30 transition-colors">
                    <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="fas fa-wrench text-xs"></i>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
