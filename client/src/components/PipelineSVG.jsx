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
  const [animationPhase, setAnimationPhase] = useState(-1);

  const getNodeStatus = (node) => {
    if (isRunning && animationPhase >= 0) {
      const idx = PIPELINE_NODES.findIndex(n => n.id === node.id);
      if (idx < animationPhase) return 'PASS';
      if (idx === animationPhase) return 'PROCESSING';
      return 'IDLE';
    }
    const allForNode = steps.filter(s => STEP_TO_NODE[s.step] === node.id);
    if (allForNode.length === 0) return 'IDLE';
    if (allForNode.some(s => s.status === 'BLOCK')) return 'BLOCK';
    return 'PASS';
  };

  const getNodeDetails = (node) => steps.filter(s => STEP_TO_NODE[s.step] === node.id);

  useEffect(() => {
    if (!isRunning) { setAnimationPhase(-1); return; }
    setAnimationPhase(0);
    const interval = setInterval(() => {
      setAnimationPhase(prev => {
        if (prev >= PIPELINE_NODES.length - 1) { clearInterval(interval); return prev; }
        return prev + 1;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [isRunning]);

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
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${
                        detail.status === 'PASS' ? 'bg-green-500/20 text-green-400' :
                        detail.status === 'BLOCK' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>{detail.status}</span>
                      <span className="text-xs text-slate-400">{detail.step}</span>
                    </div>
                    {detail.reason && <p className="text-xs text-red-400 mt-1">⚠ {detail.reason}</p>}
                    {detail.data && (
                      <pre className="text-xs text-slate-300 mt-1 font-mono overflow-x-auto max-h-32 overflow-y-auto">
                        {JSON.stringify(detail.data, null, 2)}
                      </pre>
                    )}
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
