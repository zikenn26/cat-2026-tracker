import { useAuth } from '../../context/AuthContext';
import { upsertProfile, getStreak } from '../../services/db';
import { useToast } from '../../context/ToastContext';
import { useState, useEffect } from 'react';
import { User, Target, Clock, BookOpen, Award, Lock } from 'lucide-react';
import { BADGES } from '../../data/badges';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { show } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile || {});
  const [saving, setSaving] = useState(false);
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    if (user) {
      getStreak(user.id).then(({ data }) => setStreak(data));
    }
  }, [user]);

  const save = async () => {
    setSaving(true);
    const { error } = await upsertProfile({ id: user.id, ...form });
    if (error) show(error.message, 'error');
    else { await refreshProfile(); show('Profile updated!', 'success'); setEditing(false); }
    setSaving(false);
  };

  const earnedBadgeIds = streak?.badges_earned || [];

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700 }}>Profile Hub</h1>
            <p style={{ color: 'var(--text-muted)' }}>Account settings and study milestones</p>
          </div>
          <button className="btn btn-ghost" onClick={() => setEditing(!editing)} style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-2)', fontSize: 13, padding: '0 16px', height: 36 }}>
            {editing ? 'Cancel' : 'Edit Settings'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        <div>
          <div className="card" style={{ padding: 32, border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 32 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: 'var(--sky-dim)',
                color: 'var(--sky)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 700
              }}>
                {profile?.name?.[0]?.toUpperCase() || '👤'}
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{profile?.name || 'Aspirant'}</h2>
                <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Target: CAT {profile?.target_year || 2026}</p>
              </div>
            </div>

            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 12 }}>Display Name</label>
                  <input className="form-input" style={{ background: 'var(--surface-2)', border: 'none', height: 44 }} value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 12 }}>Goal Percentile</label>
                  <select className="form-select" style={{ background: 'var(--surface-2)', border: 'none', height: 44 }} value={form.target_percentile || 99} onChange={e => setForm(f => ({ ...f, target_percentile: +e.target.value }))}>
                    {[99.5, 99, 98, 97, 95, 90].map(p => <option key={p} value={p}>{p}+</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 12 }}>Daily Hours Target</label>
                  <select className="form-select" style={{ background: 'var(--surface-2)', border: 'none', height: 44 }} value={form.daily_hours_goal || 6} onChange={e => setForm(f => ({ ...f, daily_hours_goal: +e.target.value }))}>
                    {[2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h} hours/day</option>)}
                  </select>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', height: 48, borderRadius: 12, background: 'var(--sky)', border: 'none', fontWeight: 600 }} onClick={save} disabled={saving}>
                  {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Update Profile'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { icon: Target, label: 'Success Target', val: `${profile?.target_percentile || 99}+ %ile` },
                  { icon: Clock, label: 'Study Quota', val: `${profile?.daily_hours_goal || 6} hrs/day` },
                  { icon: BookOpen, label: 'Prep Focus', val: `Batch of ${profile?.target_year || 2026}` },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--sky)', background: 'var(--sky-dim)', padding: 8, borderRadius: 10 }}>
                      <Icon size={16} />
                    </div>
                    <span style={{ flex: 1, color: 'var(--text-dim)', fontSize: 13, fontWeight: 500 }}>{label}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Badges / Achievements */}
        <div className="card" style={{ padding: 32, border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <h3 style={{ marginBottom: 24, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Award size={18} color="var(--mint)" /> Achievements
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
            {BADGES.map(badge => {
              const isEarned = earnedBadgeIds.includes(badge.id) || (streak && badge.check(streak));
              return (
                <div key={badge.id} style={{
                  padding: '20px 12px', borderRadius: 16,
                  background: isEarned ? 'var(--surface-2)' : 'transparent',
                  border: isEarned ? `1px solid var(--border)` : '1px dashed var(--border)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                  opacity: isEarned ? 1 : 0.4, transition: 'var(--transition)'
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', background: isEarned ? 'var(--surface)' : 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                    color: isEarned ? badge.color : 'var(--text-dim)',
                    boxShadow: isEarned ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                  }}>
                    {isEarned ? <badge.icon size={20} /> : <Lock size={16} />}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: 'var(--text)' }}>{badge.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.4 }}>{badge.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

