'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(function() {
    if (!loading && user) router.push('/');
  }, [user, loading]);

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isSignUp) {
        if (!name.trim()) { setError('Name is required'); setSubmitting(false); return; }
        await signUp(email, password, name, role);
      } else {
        await signIn(email, password);
      }
      router.push('/');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #2a2a3a', borderTop: '3px solid #dc2626', borderRadius: '50%' }} className="animate-spin" />
      </div>
    );
  }

  var roles = [
    { value: 'pm', label: 'PM', desc: 'Full access to all modules' },
    { value: 'fab', label: 'Fab', desc: 'Fabrication tab only' },
    { value: 'dispatch', label: 'Dispatch', desc: 'Dispatch tab only' },
    { value: 'site', label: 'Site', desc: 'Erection tab only' },
    { value: 'viewer', label: 'Viewer', desc: 'Dashboard read-only' },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
      <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: 440, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="animate-glow" style={{
            width: 80, height: 80, borderRadius: '50%', border: '3px solid #dc2626',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', background: 'rgba(20,20,30,0.8)'
          }}>
            <span className="mono" style={{ color: '#dc2626', fontWeight: 700, fontSize: 22 }}>MPS</span>
          </div>
          <h1 className="mono" style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, color: 'var(--text)' }}>
            MPS PROJECT MANAGER
          </h1>
          <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>Mahawar Prefab Solutions</p>
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <button onClick={function() { setIsSignUp(false); setError(''); }}
            style={{
              flex: 1, padding: '10px 0', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: !isSignUp ? 'var(--red)' : 'transparent', color: !isSignUp ? 'white' : 'var(--dim)'
            }}>Sign In</button>
          <button onClick={function() { setIsSignUp(true); setError(''); }}
            style={{
              flex: 1, padding: '10px 0', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: isSignUp ? 'var(--red)' : 'transparent', color: isSignUp ? 'white' : 'var(--dim)'
            }}>Sign Up</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isSignUp && (
            <div>
              <label className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, display: 'block', marginBottom: 4 }}>NAME</label>
              <input value={name} onChange={function(e) { setName(e.target.value); }} placeholder="Your name" />
            </div>
          )}
          <div>
            <label className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, display: 'block', marginBottom: 4 }}>EMAIL</label>
            <input type="email" value={email} onChange={function(e) { setEmail(e.target.value); }} placeholder="your@email.com" />
          </div>
          <div>
            <label className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, display: 'block', marginBottom: 4 }}>PASSWORD</label>
            <input type="password" value={password} onChange={function(e) { setPassword(e.target.value); }} placeholder={isSignUp ? 'Min 6 characters' : 'Your password'} />
          </div>
          {isSignUp && (
            <div>
              <label className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, display: 'block', marginBottom: 8 }}>ROLE</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {roles.map(function(r) {
                  var sel = role === r.value;
                  return (
                    <button key={r.value} type="button" onClick={function() { setRole(r.value); }}
                      style={{
                        padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
                        border: sel ? '1.5px solid var(--red)' : '1px solid var(--border)',
                        background: sel ? 'rgba(153,27,27,0.3)' : 'transparent',
                        color: sel ? 'white' : 'var(--dim)'
                      }}>{r.label}</button>
                  );
                })}
              </div>
            </div>
          )}
          {error && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '8px 12px' }}>
              <p className="mono" style={{ fontSize: 11, color: '#f87171' }}>{error}</p>
            </div>
          )}
          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="btn-red" style={{ width: '100%', marginTop: 8, padding: 12 }}>
            {submitting ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </div>
      </div>
    </div>
  );
}
