'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import Logo from '../../components/shell/Logo';
import { Button } from '../../components/ui';
import { ArrowRight } from '../../components/icons';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn, signUp } = useAuth();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('site');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.push('/');
  }, [user, loading, router]);

  async function handleSubmit() {
    setError('');
    setInfo('');
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    if (mode === 'signup' && !name) {
      setError('Please enter your name.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        router.push('/');
      } else {
        await signUp(email, password, name, role);
        setInfo(
          'Account created. Check your email to confirm, then sign in.'
        );
        setMode('signin');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
    setSubmitting(false);
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleSubmit();
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--surface-0)',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            border: '2px solid var(--surface-3)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
          }}
          className="animate-spin"
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--surface-0)',
      }}
    >
      <div
        className="card animate-fade"
        style={{
          width: '100%',
          maxWidth: 400,
          padding: 28,
          boxShadow: 'var(--shadow-md)',
          background: 'var(--surface-1)',
        }}
      >
        {/* Logo + lockup */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 22,
          }}
        >
          <Logo />
        </div>

        <h1
          className="t-h2"
          style={{
            margin: '0 0 4px',
            textAlign: 'center',
            letterSpacing: '-0.01em',
          }}
        >
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>
        <p
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--ink-500)',
            margin: '0 0 22px',
          }}
        >
          {mode === 'signin'
            ? 'Project Manager Â· Mahawar Prefab Solutions'
            : 'Request access from your project manager.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Your full name"
              />
            </Field>
          )}

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKey}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKey}
              placeholder={mode === 'signup' ? 'Min. 6 characters' : 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </Field>

          {mode === 'signup' && (
            <Field label="Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="pm">Project Manager</option>
                <option value="fab">Fabrication</option>
                <option value="dispatch">Dispatch</option>
                <option value="site">Site Engineer</option>
                <option value="client">Client</option>
                <option value="viewer">Viewer (read-only)</option>
              </select>
            </Field>
          )}

          {error && (
            <div
              style={{
                background: 'var(--status-alert-tint)',
                border: '1px solid var(--status-alert)',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 12.5,
                color: 'var(--status-alert)',
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}
          {info && (
            <div
              style={{
                background: 'var(--status-done-tint)',
                border: '1px solid var(--status-done)',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 12.5,
                color: 'var(--status-done)',
                fontWeight: 500,
              }}
            >
              {info}
            </div>
          )}

          <Button
            variant="accent"
            size="lg"
            onClick={handleSubmit}
            disabled={submitting}
            iconRight={ArrowRight}
            style={{ justifyContent: 'center', marginTop: 4 }}
          >
            {submitting
              ? 'Please waitâ€¦'
              : mode === 'signin'
              ? 'Sign in'
              : 'Create account'}
          </Button>
        </div>

        {/* Mode switcher */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 16,
            paddingTop: 16,
            borderTop: '1px solid var(--line)',
          }}
        >
          {mode === 'signin' ? (
            <button
              onClick={() => {
                setMode('signup');
                setError('');
                setInfo('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: 12.5,
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              Need an account? Create one
            </button>
          ) : (
            <button
              onClick={() => {
                setMode('signin');
                setError('');
                setInfo('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: 12.5,
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              Already have an account? Sign in
            </button>
          )}
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 10.5,
            color: 'var(--ink-400)',
            letterSpacing: '0.03em',
          }}
        >
          Fabrication Â· Dispatch Â· Erection Â· Site
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label
        className="t-overline"
        style={{ display: 'block', marginBottom: 5 }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}