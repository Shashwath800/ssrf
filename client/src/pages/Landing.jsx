import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = '/api/scan';

// ─── Animated counter ───
function AnimatedNumber({ target, duration = 2000 }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <span>{value}</span>;
}

export default function Landing() {
  const navigate = useNavigate();
  const [demoUrl, setDemoUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const sectionRefs = useRef({});

  // Intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set([...prev, entry.target.dataset.section]));
          }
        });
      },
      { threshold: 0.15 }
    );
    Object.values(sectionRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, []);

  const runDemo = async () => {
    if (!demoUrl.trim()) return;
    setScanning(true);
    setResult(null);
    try {
      const source = new EventSource(`${API}?url=${encodeURIComponent(demoUrl)}`);
      let finalStatus = null;
      let blockedStep = null;
      source.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'step' && data.stepResult.status === 'BLOCK') {
          blockedStep = data.stepResult.step;
        }
        if (data.type === 'done') {
          finalStatus = data.finalStatus;
          source.close();
          setResult({ status: finalStatus, blockedStep });
          setScanning(false);
        }
      };
      source.onerror = () => {
        source.close();
        setResult({ status: 'ERROR', blockedStep: null });
        setScanning(false);
      };
    } catch {
      setResult({ status: 'ERROR', blockedStep: null });
      setScanning(false);
    }
  };

  const copyInstall = () => {
    navigator.clipboard.writeText('npm install ssrf-shield');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const presetsAttack = [
    'http://169.254.169.254/latest/meta-data/',
    'http://127.0.0.1/',
    'http://[::ffff:169.254.169.254]/',
    'http://example.com:6379/',
  ];
  const presetsSafe = ['https://example.com', 'https://httpbin.org/get'];

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#e2e8f0', fontFamily: "'Rajdhani', sans-serif", overflowX: 'hidden' }}>

      {/* ═══ NAV ═══ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,243,255,0.15)',
        padding: '0 2rem', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #00f3ff 0%, #6366f1 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', fontWeight: 700, color: '#000', fontFamily: "'Orbitron', sans-serif"
          }}>S</div>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.15rem', letterSpacing: '0.15em', color: '#00f3ff' }}>
            SSRF-SHIELD
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <a href="#features" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.95rem', transition: '0.2s' }}
            onMouseEnter={e => e.target.style.color='#00f3ff'} onMouseLeave={e => e.target.style.color='#94a3b8'}>Features</a>
          <a href="#pricing" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.95rem', transition: '0.2s' }}
            onMouseEnter={e => e.target.style.color='#00f3ff'} onMouseLeave={e => e.target.style.color='#94a3b8'}>Pricing</a>
          <button onClick={() => navigate('/')} style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            border: 'none', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: '8px',
            fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
            transition: '0.3s'
          }}
            onMouseEnter={e => e.target.style.boxShadow='0 0 20px rgba(99,102,241,0.5)'}
            onMouseLeave={e => e.target.style.boxShadow='none'}
          >Dashboard →</button>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{
        paddingTop: '140px', paddingBottom: '80px', textAlign: 'center', position: 'relative'
      }}>
        {/* Animated gradient orbs */}
        <div style={{
          position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)',
          width: '800px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, rgba(0,243,255,0.05) 40%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none'
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{
            display: 'inline-block', padding: '0.35rem 1rem', borderRadius: '100px', marginBottom: '1.5rem',
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
            fontSize: '0.85rem', color: '#818cf8', letterSpacing: '0.05em'
          }}>
            🛡️ 13-Layer Defense Pipeline • Open Source
          </div>
          <h1 style={{
            fontFamily: "'Orbitron', sans-serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            lineHeight: 1.1, fontWeight: 700, margin: '0 0 1.25rem 0',
            background: 'linear-gradient(135deg, #fff 0%, #00f3ff 50%, #6366f1 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Block SSRF attacks before they reach your infrastructure
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#94a3b8', maxWidth: '650px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
            A battle-tested Node.js defense engine that validates URLs, resolves DNS, catches IPv6 bypasses, and blocks cloud metadata access — in milliseconds.
          </p>

          {/* ── Live Demo ── */}
          <div style={{
            maxWidth: '700px', margin: '0 auto', background: 'rgba(10,14,26,0.9)',
            border: '1px solid rgba(0,243,255,0.2)', borderRadius: '16px',
            padding: '2rem', backdropFilter: 'blur(20px)'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              Live Demo — Try scanning a URL
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                id="landing-demo-input"
                value={demoUrl}
                onChange={e => setDemoUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runDemo()}
                placeholder="Enter a URL to scan..."
                style={{
                  flex: 1, padding: '0.85rem 1.25rem', borderRadius: '10px',
                  background: 'rgba(0,20,40,0.8)', border: '1px solid rgba(0,243,255,0.25)', color: '#e2e8f0',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9rem', outline: 'none',
                  transition: '0.3s'
                }}
              />
              <button
                id="landing-scan-btn"
                onClick={runDemo}
                disabled={scanning}
                style={{
                  padding: '0.85rem 2rem', borderRadius: '10px', border: 'none',
                  background: scanning ? '#334155' : 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
                  color: '#fff', fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem', fontWeight: 600,
                  cursor: scanning ? 'not-allowed' : 'pointer', transition: '0.3s', whiteSpace: 'nowrap'
                }}
              >
                {scanning ? '⏳ Scanning...' : '🔍 Scan'}
              </button>
            </div>

            {/* Preset buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: result ? '1rem' : 0 }}>
              {presetsAttack.map(url => (
                <button key={url} onClick={() => { setDemoUrl(url); setResult(null); }}
                  style={{
                    padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.7rem',
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171',
                    cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", transition: '0.2s'
                  }}
                  onMouseEnter={e => e.target.style.background='rgba(239,68,68,0.25)'}
                  onMouseLeave={e => e.target.style.background='rgba(239,68,68,0.1)'}
                >{url.length > 35 ? url.slice(0,35)+'…' : url}</button>
              ))}
              {presetsSafe.map(url => (
                <button key={url} onClick={() => { setDemoUrl(url); setResult(null); }}
                  style={{
                    padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.7rem',
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80',
                    cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", transition: '0.2s'
                  }}
                  onMouseEnter={e => e.target.style.background='rgba(34,197,94,0.25)'}
                  onMouseLeave={e => e.target.style.background='rgba(34,197,94,0.1)'}
                >{url}</button>
              ))}
            </div>

            {/* Result */}
            {result && (
              <div style={{
                padding: '1rem 1.25rem', borderRadius: '10px',
                background: result.status === 'PASS' ? 'rgba(34,197,94,0.1)' : result.status === 'BLOCKED' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)',
                border: `1px solid ${result.status === 'PASS' ? 'rgba(34,197,94,0.4)' : result.status === 'BLOCKED' ? 'rgba(239,68,68,0.4)' : 'rgba(234,179,8,0.4)'}`,
                display: 'flex', alignItems: 'center', gap: '0.75rem', animation: 'fadeIn 0.3s ease'
              }}>
                <span style={{ fontSize: '1.5rem' }}>
                  {result.status === 'PASS' ? '✅' : result.status === 'BLOCKED' ? '🚫' : '⚠️'}
                </span>
                <div>
                  <div style={{
                    fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: '1rem',
                    color: result.status === 'PASS' ? '#4ade80' : result.status === 'BLOCKED' ? '#f87171' : '#fbbf24'
                  }}>
                    {result.status}
                  </div>
                  {result.blockedStep && (
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                      Blocked at: <span style={{ color: '#f87171' }}>{result.blockedStep}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" data-section="features" ref={el => sectionRefs.current.features = el}
        style={{
          padding: '80px 1.5rem', maxWidth: '1100px', margin: '0 auto',
          opacity: visibleSections.has('features') ? 1 : 0,
          transform: visibleSections.has('features') ? 'translateY(0)' : 'translateY(40px)',
          transition: 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)'
        }}>
        <h2 style={{
          fontFamily: "'Orbitron', sans-serif", textAlign: 'center', fontSize: '2rem',
          marginBottom: '0.5rem', color: '#fff'
        }}>Enterprise-Grade Protection</h2>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '3rem', fontSize: '1.05rem' }}>
          Three pillars of defense that work together to eliminate SSRF attacks
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {[
            {
              icon: '🏗️', title: '13-Layer Defense Pipeline',
              desc: 'Every request passes through URL normalization, protocol validation, DNS resolution, IP checking, allowlisting, redirect revalidation, and response inspection.',
              gradient: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.02))',
              border: 'rgba(99,102,241,0.3)',
              accent: '#818cf8'
            },
            {
              icon: '🧬', title: 'DNS Rebinding Detection',
              desc: 'IP locking pins resolved addresses. The egress firewall re-checks before every request. Attackers cannot exploit the TOCTOU window between resolution and fetch.',
              gradient: 'linear-gradient(135deg, rgba(0,243,255,0.15), rgba(0,243,255,0.02))',
              border: 'rgba(0,243,255,0.3)',
              accent: '#00f3ff'
            },
            {
              icon: '📡', title: 'Real-Time Monitoring',
              desc: 'Built-in audit logging, anomaly detection, webhook alerts, and a live dashboard. Know exactly what is being probed and when — before damage occurs.',
              gradient: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.02))',
              border: 'rgba(34,197,94,0.3)',
              accent: '#4ade80'
            }
          ].map((card, i) => (
            <div key={i} style={{
              background: card.gradient, border: `1px solid ${card.border}`,
              borderRadius: '16px', padding: '2rem', backdropFilter: 'blur(10px)',
              transition: 'all 0.4s ease', cursor: 'default'
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = `0 20px 40px ${card.border.replace('0.3', '0.2')}`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{card.icon}</div>
              <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.1rem', color: card.accent, marginBottom: '0.75rem' }}>
                {card.title}
              </h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section data-section="stats" ref={el => sectionRefs.current.stats = el}
        style={{
          padding: '60px 1.5rem', maxWidth: '900px', margin: '0 auto',
          opacity: visibleSections.has('stats') ? 1 : 0,
          transform: visibleSections.has('stats') ? 'translateY(0)' : 'translateY(40px)',
          transition: 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)'
        }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.5rem', textAlign: 'center'
        }}>
          {[
            { value: 13, label: 'Defense Layers', suffix: '' },
            { value: 100, label: 'Test Cases', suffix: '+' },
            { value: 9, label: 'IPv6 Bypass Types', suffix: '' },
            { value: 0, label: 'Dependencies', suffix: '' },
          ].map((stat, i) => (
            <div key={i} style={{
              padding: '1.5rem', borderRadius: '12px',
              background: 'rgba(10,14,26,0.8)', border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{
                fontFamily: "'Orbitron', sans-serif", fontSize: '2.5rem', fontWeight: 700,
                background: 'linear-gradient(135deg, #00f3ff, #6366f1)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                {visibleSections.has('stats') ? <AnimatedNumber target={stat.value} /> : 0}{stat.suffix}
              </div>
              <div style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.9rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ INSTALL CTA ═══ */}
      <section data-section="install" ref={el => sectionRefs.current.install = el}
        style={{
          padding: '80px 1.5rem', textAlign: 'center',
          opacity: visibleSections.has('install') ? 1 : 0,
          transform: visibleSections.has('install') ? 'translateY(0)' : 'translateY(40px)',
          transition: 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)'
        }}>
        <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.8rem', marginBottom: '1rem', color: '#fff' }}>
          Get Started in Seconds
        </h2>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Zero dependencies. Zero configuration. Just install and protect.</p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '1rem',
          background: 'rgba(10,14,26,0.95)', border: '1px solid rgba(0,243,255,0.25)',
          borderRadius: '12px', padding: '1rem 1.5rem'
        }}>
          <code style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '1.1rem', color: '#00f3ff', letterSpacing: '0.02em'
          }}>
            <span style={{ color: '#64748b' }}>$</span> npm install ssrf-shield
          </code>
          <button onClick={copyInstall}
            style={{
              padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
              background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)',
              color: copied ? '#4ade80' : '#818cf8', cursor: 'pointer',
              fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: '0.85rem', transition: '0.3s'
            }}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
        <div style={{ marginTop: '2rem' }}>
          <pre style={{
            display: 'inline-block', textAlign: 'left', padding: '1.5rem 2rem',
            background: 'rgba(10,14,26,0.9)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem',
            lineHeight: 1.7, color: '#94a3b8', maxWidth: '500px'
          }}>
            <span style={{ color: '#6366f1' }}>const</span> <span style={{ color: '#e2e8f0' }}>SSRFShield</span> = <span style={{ color: '#06b6d4' }}>require</span>(<span style={{ color: '#4ade80' }}>'ssrf-shield'</span>);{'\n'}
            <span style={{ color: '#6366f1' }}>const</span> <span style={{ color: '#e2e8f0' }}>shield</span> = <span style={{ color: '#06b6d4' }}>new</span> <span style={{ color: '#e2e8f0' }}>SSRFShield</span>();{'\n'}
            <span style={{ color: '#6366f1' }}>const</span> <span style={{ color: '#e2e8f0' }}>result</span> = <span style={{ color: '#6366f1' }}>await</span> shield.<span style={{ color: '#06b6d4' }}>scan</span>(<span style={{ color: '#e2e8f0' }}>userUrl</span>);{'\n'}
            <span style={{ color: '#64748b' }}>// result.status → "PASS" or "BLOCKED"</span>
          </pre>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" data-section="pricing" ref={el => sectionRefs.current.pricing = el}
        style={{
          padding: '80px 1.5rem', maxWidth: '1100px', margin: '0 auto',
          opacity: visibleSections.has('pricing') ? 1 : 0,
          transform: visibleSections.has('pricing') ? 'translateY(0)' : 'translateY(40px)',
          transition: 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)'
        }}>
        <h2 style={{ fontFamily: "'Orbitron', sans-serif", textAlign: 'center', fontSize: '2rem', marginBottom: '0.5rem', color: '#fff' }}>
          Pricing
        </h2>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '3rem', fontSize: '1.05rem' }}>
          Start free, scale when you need to
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Free */}
          <div style={{
            background: 'rgba(10,14,26,0.9)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Free</div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '2.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>$0</div>
            <div style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Open source, forever</div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', flex: 1 }}>
              {['Full 13-layer pipeline', 'Real DNS resolution', 'IPv6 bypass detection', 'Response inspection', 'Self-hosted', 'MIT License'].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                  <span style={{ color: '#4ade80' }}>✓</span> {f}
                </div>
              ))}
            </div>
            <button style={{
              marginTop: '1.5rem', width: '100%', padding: '0.75rem', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e2e8f0',
              fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: '1rem', cursor: 'pointer', transition: '0.3s'
            }}
              onMouseEnter={e => { e.target.style.background='rgba(255,255,255,0.05)'; e.target.style.borderColor='rgba(0,243,255,0.3)'; }}
              onMouseLeave={e => { e.target.style.background='transparent'; e.target.style.borderColor='rgba(255,255,255,0.15)'; }}
            >Get Started</button>
          </div>

          {/* Pro */}
          <div style={{
            background: 'rgba(10,14,26,0.9)', border: '2px solid rgba(99,102,241,0.5)',
            borderRadius: '16px', padding: '2.5rem 2rem', position: 'relative', display: 'flex', flexDirection: 'column',
            boxShadow: '0 0 40px rgba(99,102,241,0.15)'
          }}>
            <div style={{
              position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '0.25rem 1rem',
              borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, color: '#fff', letterSpacing: '0.05em'
            }}>MOST POPULAR</div>
            <div style={{ fontSize: '0.85rem', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Pro</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.25rem' }}>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '2.5rem', fontWeight: 700, color: '#fff' }}>$29</span>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>/mo</span>
            </div>
            <div style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>For teams shipping fast</div>
            <div style={{ borderTop: '1px solid rgba(99,102,241,0.2)', paddingTop: '1.5rem', flex: 1 }}>
              {['Everything in Free', 'Hosted dashboard', 'API key management', 'Webhook alerts (Slack, Discord)', 'Scan history & analytics', 'Priority support'].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                  <span style={{ color: '#818cf8' }}>✓</span> {f}
                </div>
              ))}
            </div>
            <button style={{
              marginTop: '1.5rem', width: '100%', padding: '0.75rem', borderRadius: '10px',
              border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff',
              fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: '1rem', cursor: 'pointer', transition: '0.3s'
            }}
              onMouseEnter={e => e.target.style.boxShadow='0 0 30px rgba(99,102,241,0.4)'}
              onMouseLeave={e => e.target.style.boxShadow='none'}
            >Start Free Trial</button>
          </div>

          {/* Enterprise */}
          <div style={{
            background: 'rgba(10,14,26,0.9)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Enterprise</div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>Custom</div>
            <div style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>For large organizations</div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', flex: 1 }}>
              {['Everything in Pro', 'On-premise deployment', 'SSO / SAML integration', 'Custom pipeline plugins', 'SLA guarantee', 'Dedicated support engineer'].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                  <span style={{ color: '#fbbf24' }}>✓</span> {f}
                </div>
              ))}
            </div>
            <button style={{
              marginTop: '1.5rem', width: '100%', padding: '0.75rem', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e2e8f0',
              fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: '1rem', cursor: 'pointer', transition: '0.3s'
            }}
              onMouseEnter={e => { e.target.style.background='rgba(255,255,255,0.05)'; e.target.style.borderColor='rgba(251,191,36,0.3)'; }}
              onMouseLeave={e => { e.target.style.background='transparent'; e.target.style.borderColor='rgba(255,255,255,0.15)'; }}
            >Contact Sales</button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)', padding: '3rem 1.5rem',
        textAlign: 'center', marginTop: '40px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #00f3ff, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', fontWeight: 700, color: '#000', fontFamily: "'Orbitron', sans-serif"
          }}>S</div>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.9rem', color: '#64748b', letterSpacing: '0.1em' }}>SSRF-SHIELD</span>
        </div>
        <p style={{ color: '#475569', fontSize: '0.85rem' }}>
          MIT License • Built with ❤️ for the security community
        </p>
      </footer>

      {/* ═══ GLOBAL ANIMATIONS ═══ */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}
