import { useState } from 'react';
import { upsertProfile } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CAT_SYLLABUS } from '../../data/syllabus';

const STEPS = ['Basic Info', 'Goals', 'Strengths'];

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const { show } = useToast();
  const [step, setStep]     = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    target_year: 2026,
    target_percentile: 99,
    daily_hours_goal: 6,
    section_priority: ['QA', 'DILR', 'VARC'],
    strengths: [],
    weaknesses: [],
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleArray = (key, val) => {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val],
    }));
  };

  const moveSectionPriority = (section, dir) => {
    const arr = [...form.section_priority];
    const idx = arr.indexOf(section);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    set('section_priority', arr);
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const { error } = await upsertProfile({ id: user.id, ...form });
      if (error) throw error;
      await refreshProfile();
      show('Profile saved! Let\'s crack CAT 2026 🎯', 'success');
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const allTopics = Object.entries(CAT_SYLLABUS).flatMap(([sec, sd]) =>
    Object.values(sd.categories).flat().map(t => ({ ...t, section: sec }))
  );

  return (
    <div className="onboarding-screen">
      <div className="onboarding-card fade-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }} className="gradient-text">
            CAT 2026 Tracker
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Let's set up your profile in 3 steps
          </p>
        </div>

        {/* Step Dots */}
        <div className="onboarding-step" style={{ justifyContent: 'center' }}>
          {STEPS.map((s, i) => (
            <div key={s} className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>

        <h2 style={{ fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
          {STEPS[step]}
        </h2>

        {/* ── Step 0: Basic Info ── */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input
                className="form-input"
                placeholder="e.g. Rohan"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Target Year</label>
              <select className="form-select" value={form.target_year} onChange={e => set('target_year', +e.target.value)}>
                <option value={2026}>CAT 2026</option>
                <option value={2027}>CAT 2027</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Target Percentile</label>
              <select className="form-select" value={form.target_percentile} onChange={e => set('target_percentile', +e.target.value)}>
                {[99.5, 99, 98, 97, 95, 90].map(p => (
                  <option key={p} value={p}>{p}+ percentile</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── Step 1: Goals ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Daily Study Hours Goal</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[2, 3, 4, 5, 6, 7, 8].map(h => (
                  <button
                    key={h}
                    type="button"
                    className={`btn ${form.daily_hours_goal === h ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => set('daily_hours_goal', h)}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Section Priority (drag to reorder)</label>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                First = most important. Use arrows to change order.
              </p>
              {form.section_priority.map((sec, idx) => (
                <div key={sec} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', marginBottom: 6,
                  background: 'var(--surface-2)', borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                }}>
                  <span style={{ 
                    width: 22, height: 22, borderRadius: '50%',
                    background: idx === 0 ? 'var(--accent)' : idx === 1 ? 'var(--cyan)' : 'var(--violet)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>{idx + 1}</span>
                  <span style={{ flex: 1, fontWeight: 500 }}>{sec}</span>
                  <button type="button" className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => moveSectionPriority(sec, -1)} disabled={idx === 0}>↑</button>
                  <button type="button" className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => moveSectionPriority(sec, 1)} disabled={idx === 2}>↓</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Strengths/Weaknesses ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Tag your strong and weak topics. This seeds your initial analytics.
            </p>
            {Object.entries(CAT_SYLLABUS).map(([sec, sd]) => (
              <div key={sec}>
                <div className="section-title" style={{ marginBottom: 8 }}>
                  <span style={{ color: sd.color }}>{sec}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.values(sd.categories).flat().map(t => {
                    const isStrong = form.strengths.includes(t.id);
                    const isWeak   = form.weaknesses.includes(t.id);
                    return (
                      <div key={t.id} style={{ display: 'flex', gap: 2 }}>
                        <button
                          type="button"
                          onClick={() => { toggleArray('strengths', t.id); if (isWeak) toggleArray('weaknesses', t.id); }}
                          className="btn btn-sm"
                          style={{
                            background: isStrong ? 'var(--green-dim)' : 'var(--surface-2)',
                            color: isStrong ? 'var(--green)' : 'var(--text-muted)',
                            border: `1px solid ${isStrong ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                            borderRight: 'none', borderRadius: 'var(--radius) 0 0 var(--radius)',
                            fontSize: 11, padding: '4px 8px',
                          }}
                          title="Mark as strength"
                        >✓</button>
                        <span style={{
                          padding: '4px 8px', fontSize: 11, fontWeight: 500,
                          background: 'var(--surface-2)', color: 'var(--text-dim)',
                          border: '1px solid var(--border)', borderLeft: 'none', borderRight: 'none',
                        }}>{t.name}</span>
                        <button
                          type="button"
                          onClick={() => { toggleArray('weaknesses', t.id); if (isStrong) toggleArray('strengths', t.id); }}
                          className="btn btn-sm"
                          style={{
                            background: isWeak ? 'var(--red-dim)' : 'var(--surface-2)',
                            color: isWeak ? 'var(--red)' : 'var(--text-muted)',
                            border: `1px solid ${isWeak ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                            borderLeft: 'none', borderRadius: '0 var(--radius) var(--radius) 0',
                            fontSize: 11, padding: '4px 8px',
                          }}
                          title="Mark as weakness"
                        >✗</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 10, marginTop: 28, justifyContent: 'space-between' }}>
          {step > 0
            ? <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>← Back</button>
            : <div />
          }
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !form.name.trim()}>
              Next →
            </button>
          ) : (
            <button className="btn btn-primary" onClick={saveProfile} disabled={loading}>
              {loading
                ? <span className="spinner" style={{ width: 16, height: 16 }} />
                : 'Let\'s Go! 🚀'
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
