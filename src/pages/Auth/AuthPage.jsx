import { useState } from 'react';
import { signIn, signUp } from '../../services/db';
import { useToast } from '../../context/ToastContext';

export default function AuthPage() {
  const [tab, setTab]       = useState('login');
  const [email, setEmail]   = useState('');
  const [pass, setPass]     = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let result;
      if (tab === 'login') {
        result = await signIn(email, pass);
        if (result.error) throw result.error;
        show('Welcome back! 🎯', 'success');
      } else {
        result = await signUp(email, pass);
        if (result.error) throw result.error;
        show('Account created! Check your email to verify.', 'success');
      }
    } catch (err) {
      show(err.message || 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen" style={{ background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="auth-box" style={{ maxWidth: 400, width: '100%' }}>
        {/* Header */}
        <div className="auth-logo" style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--sky)', marginBottom: 8 }}>Zen Study</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Focus deeply. Achieve more.</p>
        </div>

        <div className="card shadow-md" style={{ padding: 40, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 24 }}>
          {/* Tabs */}
          <div className="auth-tabs" style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 12, marginBottom: 28 }}>
            <div
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => setTab('login')}
              style={{
                flex: 1, textAlign: 'center', padding: '10px', fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
                background: tab === 'login' ? 'var(--surface)' : 'transparent',
                color: tab === 'login' ? 'var(--sky)' : 'var(--text-dim)',
                boxShadow: tab === 'login' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                transition: 'var(--transition)'
              }}
            >
              Sign In
            </div>
            <div
              className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => setTab('signup')}
              style={{
                flex: 1, textAlign: 'center', padding: '10px', fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
                background: tab === 'signup' ? 'var(--surface)' : 'transparent',
                color: tab === 'signup' ? 'var(--sky)' : 'var(--text-dim)',
                boxShadow: tab === 'signup' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                transition: 'var(--transition)'
              }}
            >
              Join Us
            </div>
          </div>

          <form className="auth-form" onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}>Study Identity (Email)</label>
              <input
                type="email"
                className="form-input"
                placeholder="rohan@study.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ background: 'var(--surface-2)', border: 'none', height: 44, borderRadius: 10 }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}>Secret Key (Password)</label>
              <input
                type="password"
                className="form-input"
                placeholder={tab === 'signup' ? 'Min 6 chars' : '••••••••'}
                value={pass}
                onChange={e => setPass(e.target.value)}
                required
                minLength={6}
                style={{ background: 'var(--surface-2)', border: 'none', height: 44, borderRadius: 10 }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', height: 48, borderRadius: 12, background: 'var(--sky)', border: 'none', fontWeight: 600, marginTop: 8 }}
            >
              {loading
                ? <span className="spinner" style={{ width: 18, height: 18 }} />
                : tab === 'login' ? 'Enter Sanctuary' : 'Start Journey'
              }
            </button>
          </form>

          {tab === 'login' && (
            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-dim)' }}>
              First time here?{' '}
              <span
                style={{ color: 'var(--sky)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => setTab('signup')}
              >
                Create a space
              </span>
            </p>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: 'var(--text-dim)', letterSpacing: 0.5 }}>
          CAT 2026 • DISTRACTION FREE • PRIVATE
        </p>
      </div>
    </div>
  );
}
