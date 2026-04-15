import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PipelineSVG Component
 * 
 * Full architecture pipeline matching the defense diagram.
 * Vertical layout with grouped sections (Validation Engine, Secure Fetch Engine).
 * Each node changes color based on status, with animated data flow.
 */

const PIPELINE_NODES = [
  { id: 'audit',       label: 'Audit & Alert',           icon: '📋', group: 'pre',    tag: 'NEW' },
  { id: 'input',       label: 'URL Normalizer',          icon: '📥', group: 'engine' },
  { id: 'protocol',    label: 'Protocol + Port',         icon: '🔒', group: 'engine', tag: 'ENHANCED' },
  { id: 'dns',         label: 'DNS Resolver',            icon: '🌐', group: 'engine' },
  { id: 'ip',          label: 'IP Validator (v4+v6)',    icon: '🛡️', group: 'engine' },
  { id: 'allowlist',   label: 'Allowlist Checker',       icon: '✅', group: 'engine' },
  { id: 'iplock',      label: 'IP Locking',              icon: '📌', group: 'engine' },
  { id: 'revalidate',  label: 'Revalidation Engine',     icon: '🔄', group: 'engine' },
  { id: 'metadata',    label: 'Metadata Limiter',        icon: '🧹', group: 'fetch',  tag: 'NEW' },
  { id: 'firewall',    label: 'Egress Firewall',         icon: '🧱', group: 'fetch',  tag: 'NEW' },
  { id: 'fetch',       label: 'Secure Fetch Engine',     icon: '⚡', group: 'fetch' },
  { id: 'timeout',     label: 'Timeout & Size',          icon: '⏱️', group: 'post',   tag: 'NEW' },
  { id: 'inspect',     label: 'Response Inspector',      icon: '🔍', group: 'post',   tag: 'NEW' },
];

const STATUS_COLORS = {
  PASS:       { fill: '#22c55e', stroke: '#16a34a', text: '#dcfce7', bg: 'rgba(34,197,94,0.08)' },
  BLOCK:      { fill: '#ef4444', stroke: '#dc2626', text: '#fecaca', bg: 'rgba(239,68,68,0.08)' },
  PROCESSING: { fill: '#f59e0b', stroke: '#d97706', text: '#fef3c7', bg: 'rgba(245,158,11,0.08)' },
  IDLE:       { fill: '#334155', stroke: '#475569', text: '#94a3b8', bg: 'rgba(51,65,85,0.05)' },
};

const STEP_TO_NODE = {
  'Audit & Alert Layer':             'audit',
  'URL Normalizer':                  'input',
  'Protocol + Port Validator':       'protocol',
  'DNS Resolver':                    'dns',
  'IP Validator (IPv4+IPv6)':        'ip',
  'Allowlist Checker':               'allowlist',
  'IP Locking':                      'iplock',
  'Redirect Revalidation':           'revalidate',
  'Revalidation Engine':             'revalidate',
  'Request Metadata Limiter':        'metadata',
  'Egress Firewall (Network Layer)': 'firewall',
  'Fetch Engine':                    'fetch',
  'Secure Fetch Engine':             'fetch',
  'Timeout & Size Enforcer':         'timeout',
  'Response Inspection Layer':       'inspect',
  'Response Inspector':              'inspect',
};

export default function PipelineSVG({ steps = [], isRunning = false }) {
  const [selectedNode, setSelectedNode] = useState(null);

  const getNodeStatus = (node) => {
    const allForNode = steps.filter(s => STEP_TO_NODE[s.step] === node.id);
    if (allForNode.length > 0) {
      if (allForNode.some(s => s.status === 'BLOCK')) return 'BLOCK';
      return 'PASS';
    }
    
    // Node hasn't been reached yet
    if (!isRunning) return 'IDLE';

    // The node directly after the MOST RECENT step is the one currently Processing
    const nodeIdx = PIPELINE_NODES.findIndex(n => n.id === node.id);
    const latestStepName = steps[steps.length - 1]?.step;
    const latestNodeIdx = PIPELINE_NODES.findIndex(n => n.id === STEP_TO_NODE[latestStepName]);
    
    // If no steps yet, node 0 is processing
    if (steps.length === 0 && nodeIdx === 0) return 'PROCESSING';
    
    // If there ARE steps, the next logical node is processing
    if (steps.length > 0 && nodeIdx === latestNodeIdx + 1) return 'PROCESSING';
    
    return 'IDLE';
  };

  const getNodeDetails = (node) => steps.filter(s => STEP_TO_NODE[s.step] === node.id);

  // Layout: horizontal scroll with compact nodes
  const nodeW = 100, nodeH = 54, gap = 36;
  const svgW = PIPELINE_NODES.length * (nodeW + gap) + 60;
  const svgH = 180;
  const cy = svgH / 2;

  return (
    <div className="w-full">
      <div className="overflow-x-auto pb-2">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: '900px', minHeight: '160px' }}>
          <defs>
            <filter id="g-pass" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="b" /><feFlood floodColor="#22c55e" floodOpacity="0.4" result="c" />
              <feComposite in="c" in2="b" operator="in" result="s" /><feMerge><feMergeNode in="s" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="g-block" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="b" /><feFlood floodColor="#ef4444" floodOpacity="0.4" result="c" />
              <feComposite in="c" in2="b" operator="in" result="s" /><feMerge><feMergeNode in="s" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="g-proc" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="b" /><feFlood floodColor="#f59e0b" floodOpacity="0.5" result="c" />
              <feComposite in="c" in2="b" operator="in" result="s" /><feMerge><feMergeNode in="s" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <marker id="arrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
              <polygon points="0 0, 7 2.5, 0 5" fill="#475569" />
            </marker>
            <path id="flow-path" d={PIPELINE_NODES.map((_, i) => {
              const x = 30 + i * (nodeW + gap) + nodeW / 2;
              return i === 0 ? `M ${x} ${cy}` : `L ${x} ${cy}`;
            }).join(' ')} fill="none" />
          </defs>

          {/* Group backgrounds */}
          {[
            { label: 'SSRF Validation Engine', start: 1, end: 7, color: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.15)' },
            { label: 'Secure Fetch Engine', start: 8, end: 10, color: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)' },
          ].map((g, gi) => {
            const x1 = 30 + g.start * (nodeW + gap) - 12;
            const x2 = 30 + g.end * (nodeW + gap) + nodeW + 12;
            return (
              <g key={gi}>
                <rect x={x1} y={cy - nodeH / 2 - 24} width={x2 - x1} height={nodeH + 48} rx="14"
                  fill={g.color} stroke={g.border} strokeWidth="1" strokeDasharray="4,3" />
                <text x={x1 + 8} y={cy - nodeH / 2 - 10} fontSize="8" fill={g.border} fontWeight="600" fontFamily="Inter, sans-serif">
                  {g.label}
                </text>
              </g>
            );
          })}

          {/* Connector lines */}
          {PIPELINE_NODES.map((node, i) => {
            if (i === PIPELINE_NODES.length - 1) return null;
            const x1 = 30 + i * (nodeW + gap) + nodeW;
            const x2 = 30 + (i + 1) * (nodeW + gap);
            const st = getNodeStatus(node);
            const color = st === 'PASS' ? '#22c55e' : st === 'BLOCK' ? '#ef4444' : '#334155';
            return <line key={`l-${i}`} x1={x1} y1={cy} x2={x2} y2={cy} stroke={color} strokeWidth="1.5"
              strokeDasharray={st === 'IDLE' ? '3,3' : 'none'} markerEnd="url(#arrow)" />;
          })}

          {/* Nodes */}
          {PIPELINE_NODES.map((node, i) => {
            const x = 30 + i * (nodeW + gap);
            const st = getNodeStatus(node);
            const c = STATUS_COLORS[st];
            const glow = st === 'PASS' ? 'url(#g-pass)' : st === 'BLOCK' ? 'url(#g-block)' : st === 'PROCESSING' ? 'url(#g-proc)' : 'none';
            const sel = selectedNode?.id === node.id;

            return (
              <motion.g key={node.id} className="cursor-pointer"
                onClick={() => setSelectedNode(sel ? null : node)}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: st === 'IDLE' ? 0.55 : 1, y: 0, scale: sel ? 1.08 : st === 'PROCESSING' ? 1.04 : 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.05 }}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
              >
                <rect x={x} y={cy - nodeH / 2} width={nodeW} height={nodeH} rx="10" fill={c.fill}
                  stroke={c.stroke} strokeWidth="1.5" filter={glow}>
                  {st === 'PROCESSING' && <animate attributeName="opacity" values="0.7;1;0.7" dur="0.7s" repeatCount="indefinite" />}
                </rect>
                <text x={x + nodeW / 2} y={cy - 6} textAnchor="middle" fontSize="14" dominantBaseline="central">{node.icon}</text>
                <text x={x + nodeW / 2} y={cy + 16} textAnchor="middle" fontSize="7.5" fontWeight="600"
                  fill={c.text} dominantBaseline="central" fontFamily="Inter, sans-serif">{node.label}</text>
                {/* Status dot */}
                <circle cx={x + nodeW - 6} cy={cy - nodeH / 2 + 6} r="3"
                  fill={st === 'PASS' ? '#22c55e' : st === 'BLOCK' ? '#ef4444' : st === 'PROCESSING' ? '#f59e0b' : '#64748b'}>
                  {st === 'PROCESSING' && <animate attributeName="r" values="2;4;2" dur="0.5s" repeatCount="indefinite" />}
                </circle>
                {/* NEW/ENHANCED tag */}
                {node.tag && (
                  <g>
                    <rect x={x + nodeW - 30} y={cy - nodeH / 2 - 8} width={28} height={12} rx="3"
                      fill={node.tag === 'NEW' ? '#8b5cf6' : '#3b82f6'} />
                    <text x={x + nodeW - 16} y={cy - nodeH / 2 - 2} textAnchor="middle" fontSize="6" fontWeight="700"
                      fill="white" dominantBaseline="central" fontFamily="Inter, sans-serif">{node.tag}</text>
                  </g>
                )}
              </motion.g>
            );
          })}

          {/* Animated flow dot */}
          {(isRunning || steps.length > 0) && (
            <circle r="4" fill="#818cf8" opacity="0.9">
              <animateMotion dur="3s" repeatCount={isRunning ? 'indefinite' : '1'} fill="freeze">
                <mpath href="#flow-path" />
              </animateMotion>
              <animate attributeName="r" values="3;5;3" dur="0.6s" repeatCount="indefinite" />
            </circle>
          )}
        </svg>
      </div>

      {/* Detail popover */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div key={selectedNode.id}
            initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="mt-4 bg-bg-card border border-slate-700/50 rounded-xl p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="text-lg">{selectedNode.icon}</span>{selectedNode.label}
                {selectedNode.tag && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${selectedNode.tag === 'NEW' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>{selectedNode.tag}</span>
                )}
              </h3>
              <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white text-xs">✕ Close</button>
            </div>
            <div className="space-y-2">
              {getNodeDetails(selectedNode).length > 0 ? (
                getNodeDetails(selectedNode).map((detail, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="bg-bg-primary/50 rounded-lg p-3 border border-slate-700/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${
                        detail.status === 'PASS' ? 'bg-green-500/20 text-green-400' :
                        detail.status === 'BLOCK' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>{detail.status}</span>
                      <span className="text-xs text-slate-400">{detail.step}</span>
                    </div>
                    {detail.reason && (
                      <p className="text-xs text-red-400 mt-1 mb-2 flex items-start gap-1.5">
                        <span className="shrink-0 mt-0.5">⚠</span>
                        <span>{detail.reason}</span>
                      </p>
                    )}
                    <DetailExplanation detail={detail} />
                  </motion.div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No data yet — run a scan first</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailExplanation({ detail }) {
  const [aiExplanation, setAiExplanation] = React.useState('');
  const [aiLoading, setAiLoading] = React.useState(true);
  const [aiError, setAiError] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    const fetchAi = async () => {
      setAiLoading(true);
      setAiError('');
      try {
        const res = await fetch('http://localhost:4000/api/explain-step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step: detail.step,
            status: detail.status,
            reason: detail.reason,
            data: detail.data
          })
        });
        if (!res.ok) throw new Error('AI request failed');
        const json = await res.json();
        if (mounted) setAiExplanation(json.explanation);
      } catch (err) {
        if (mounted) setAiError(err.message);
      } finally {
        if (mounted) setAiLoading(false);
      }
    };
    fetchAi();
    return () => { mounted = false; };
  }, [detail]);

  const d = detail.data;
  if (!d) return null;

  const lines = [];

  // URL Normalizer
  if (d.original) lines.push({ label: 'Original URL', value: d.original });
  if (d.normalized) lines.push({ label: 'Normalized', value: d.normalized });
  if (d.hostname) lines.push({ label: 'Hostname', value: d.hostname });
  if (d.protocol) lines.push({ label: 'Protocol', value: d.protocol });
  if (d.port) lines.push({ label: 'Port', value: d.port });

  // DNS
  if (d.resolvedIPs) lines.push({ label: 'Resolved IPs', value: d.resolvedIPs.join(', '), highlight: true });
  if (d.source) lines.push({ label: 'DNS Source', value: d.source });
  if (d.redirectTarget) lines.push({ label: 'Redirect Target', value: d.redirectTarget, danger: true });

  // IP Validator
  if (d.validatedIPs) lines.push({ label: 'Validated IPs', value: d.validatedIPs.join(', ') });
  if (d.blockedIPs && d.blockedIPs.length > 0) lines.push({ label: 'Blocked IPs', value: d.blockedIPs.join(', '), danger: true });

  // IP Locking
  if (d.lockedIP) lines.push({ label: 'Locked IP', value: d.lockedIP, highlight: true });

  // Redirect
  if (d.statusCode) lines.push({ label: 'HTTP Status', value: d.statusCode });
  if (d.url) lines.push({ label: 'Target URL', value: d.url });
  if (d.redirectsFollowed !== undefined) lines.push({ label: 'Redirects Followed', value: d.redirectsFollowed });

  // Fetch
  if (d.responseBody) lines.push({ label: 'Response Body', value: d.responseBody.substring(0, 120) + (d.responseBody.length > 120 ? '...' : '') });
  if (d.latencyMs) lines.push({ label: 'Latency', value: `${d.latencyMs}ms` });
  if (d.bodySize) lines.push({ label: 'Body Size', value: `${d.bodySize} bytes` });

  // Note (generic explanation)
  if (d.note) lines.push({ label: 'Internal Note', value: d.note, isNote: true });

  return (
    <div className="mt-2 space-y-3">
      {/* AI Explanation Box */}
      <div className="bg-slate-900/80 rounded border border-indigo-500/30 p-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-indigo-400 text-xs font-bold flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Ollama AI Analysis
          </span>
        </div>
        
        {aiLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-xs animate-pulse">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
            Generating explanation...
          </div>
        ) : aiError ? (
          <div className="text-red-400/80 text-xs">⚠️ AI Agent Offline: {aiError}</div>
        ) : (
          <div className="text-slate-300 text-xs leading-relaxed">
            {aiExplanation}
          </div>
        )}
      </div>

      {/* Raw Data Points */}
      {lines.length > 0 && (
        <div className="space-y-1.5 bg-black/20 rounded p-2 border border-slate-800/50">
          {lines.map((line, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <span className="text-slate-500 shrink-0 min-w-[90px] text-right font-medium">{line.label}:</span>
              <span className={`font-mono break-all ${
                line.danger ? 'text-red-400 font-bold' :
                line.highlight ? 'text-indigo-300 font-semibold' :
                line.isNote ? 'text-slate-400 italic' :
                'text-slate-300'
              }`}>{line.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
