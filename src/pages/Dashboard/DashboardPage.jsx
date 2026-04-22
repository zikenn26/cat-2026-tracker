import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getSessionsToday, getSessionsThisWeek, getTopicStats,
  getStreak, getTodayPlans, insertPlan, updatePlan, deletePlan,
} from '../../services/db';
import { CAT_SYLLABUS, ALL_TOPICS, getTopicById } from '../../data/syllabus';
import { NavLink } from 'react-router-dom';
import {
  Zap, Clock, Target, BookOpen, TrendingUp, AlertTriangle,
  Plus, CheckCircle, Trash2, ChevronRight, Flame, BarChart2, ClipboardList
} from 'lucide-react';

/* ── Helpers ── */
const formatMins = (m) => {
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const accuracyStatus = (pct) => {
  if (pct === 0) return { cls: 'badge-accent', label: 'New' };
  if (pct < 60)  return { cls: 'badge-red',    label: `${pct.toFixed(0)}%` };
  if (pct < 80)  return { cls: 'badge-yellow', label: `${pct.toFixed(0)}%` };
  return           { cls: 'badge-green',  label: `${pct.toFixed(0)}%` };
};

/* ── Smart Insights Engine ── */
function generateInsights(sessions7d, topicStats, profile) {
  const insights = [];

  // Accuracy check per section
  const sectionAccuracy = {};
  ['QA', 'DILR', 'VARC'].forEach(sec => {
    const ts = topicStats.filter(t => {
      const topic = getTopicById(t.topic_id);
      return topic?.section === sec && t.total_attempted > 0;
    });
    if (ts.length) {
      const totalC = ts.reduce((s, t) => s + t.total_correct, 0);
      const totalA = ts.reduce((s, t) => s + t.total_attempted, 0);
      sectionAccuracy[sec] = (totalC / totalA) * 100;
    }
  });

  Object.entries(sectionAccuracy).forEach(([sec, acc]) => {
    if (acc < 60) insights.push({
      type: 'warning', icon: '⚠️',
      text: `${sec} accuracy is at ${acc.toFixed(0)}% — below the 60% threshold. Schedule focused practice.`,
    });
  });

  // Inactive sections
  const last7dates = sessions7d.map(s => s.date);
  ['QA', 'DILR', 'VARC'].forEach(sec => {
    const recent = sessions7d.filter(s => s.subject === sec);
    if (recent.length === 0) insights.push({
      type: 'alert', icon: '📌',
      text: `You haven't practiced ${sec} in the last 7 days. Don't neglect it!`,
    });
  });

  // Weakest topic
  const weakest = topicStats
    .filter(t => t.total_attempted > 5 && t.accuracy_pct < 60)
    .sort((a, b) => a.accuracy_pct - b.accuracy_pct)[0];
  if (weakest) {
    const t = getTopicById(weakest.topic_id);
    if (t) insights.push({
      type: 'improvement', icon: '🎯',
      text: `${t.name} is your weakest topic at ${weakest.accuracy_pct.toFixed(0)}%. Consider revisiting concepts.`,
    });
  }

  // Daily hours
  const todaySecs = sessions7d
    .filter(s => s.date === new Date().toISOString().split('T')[0])
    .reduce((sum, s) => sum + (s.duration_min || 0), 0);
  const goalMins = (profile?.daily_hours_goal || 6) * 60;
  if (todaySecs < goalMins * 0.5) insights.push({
    type: 'info', icon: '⏰',
    text: `You've studied ${formatMins(todaySecs)} today — ${formatMins(goalMins)} is your daily goal.`,
  });

  if (insights.length === 0) insights.push({
    type: 'success', icon: '🔥',
    text: 'Great consistency! Keep the momentum going.',
  });

  return insights.slice(0, 4);
}

/* ── Add Plan Modal ── */
function AddPlanModal({ userId, onClose, onAdded }) {
  const [subject, setSubject] = useState('QA');
  const [topicId, setTopicId] = useState('');
  const [timeGoal, setTimeGoal] = useState(60);
  const [qGoal, setQGoal] = useState(30);
  const [loading, setLoading] = useState(false);

  const topics = Object.values(CAT_SYLLABUS[subject]?.categories || {}).flat();

  const save = async () => {
    if (!topicId) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    await insertPlan({
      user_id: userId, date: today, subject,
      topic_id: topicId, time_goal_min: timeGoal,
      question_goal: qGoal, completed: false,
    });
    setLoading(false);
    onAdded();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Today's Task</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Section</label>
            <select className="form-select" value={subject} onChange={e => { setSubject(e.target.value); setTopicId(''); }}>
              <option value="QA">QA — Quantitative Aptitude</option>
              <option value="DILR">DILR — Data Interpretation & LR</option>
              <option value="VARC">VARC — Verbal Ability & RC</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Topic</label>
            <select className="form-select" value={topicId} onChange={e => setTopicId(e.target.value)}>
              <option value="">-- Select topic --</option>
              {Object.entries(CAT_SYLLABUS[subject]?.categories || {}).map(([cat, ts]) => (
                <optgroup key={cat} label={cat}>
                  {ts.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Time Goal (min)</label>
              <input type="number" className="form-input" value={timeGoal} min={15} max={300}
                onChange={e => setTimeGoal(+e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Question Goal</label>
              <input type="number" className="form-input" value={qGoal} min={5} max={200}
                onChange={e => setQGoal(+e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={save} disabled={loading || !topicId}
            style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Dashboard ── */
export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [sessionsToday, setSessionsToday] = useState([]);
  const [sessions7d, setSessions7d]       = useState([]);
  const [topicStats, setTopicStats]       = useState([]);
  const [streak, setStreak]               = useState(null);
  const [plans, setPlans]                 = useState([]);
  const [insights, setInsights]           = useState([]);
  const [showAddPlan, setShowAddPlan]     = useState(false);
  const [loading, setLoading]             = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const [t, w, ts, st, p] = await Promise.all([
      getSessionsToday(user.id),
      getSessionsThisWeek(user.id),
      getTopicStats(user.id),
      getStreak(user.id),
      getTodayPlans(user.id),
    ]);
    setSessionsToday(t.data);
    setSessions7d(w.data);
    setTopicStats(ts.data);
    setStreak(st.data);
    setPlans(p.data);
    setInsights(generateInsights(w.data, ts.data, profile));
    setLoading(false);
  }, [user, profile]);

  useEffect(() => { load(); }, [load]);

  // Derived stats
  const todayMins = sessionsToday.reduce((s, x) => s + (x.duration_min || 0), 0);
  const goalMins  = (profile?.daily_hours_goal || 6) * 60;
  const hoursProgress = Math.min((todayMins / goalMins) * 100, 100);

  const weeklyAccuracy = (() => {
    const total = sessions7d.reduce((s, x) => s + (x.attempted || 0), 0);
    const correct = sessions7d.reduce((s, x) => s + (x.correct || 0), 0);
    return total ? ((correct / total) * 100).toFixed(1) : '—';
  })();

  const weeklyQuestions = sessions7d.reduce((s, x) => s + (x.attempted || 0), 0);

  const weakTopics = topicStats
    .filter(t => t.total_attempted > 3 && t.accuracy_pct < 60)
    .slice(0, 4);

  const togglePlan = async (plan) => {
    await updatePlan(plan.id, { completed: !plan.completed });
    load();
  };

  const removePlan = async (id) => {
    await deletePlan(id);
    load();
  };

  const sectionColor = { QA: 'var(--accent)', DILR: 'var(--cyan)', VARC: 'var(--violet)' };

  if (loading) {
    return (
      <div className="loading-screen" style={{ background: 'transparent' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)' }}>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div className="page-header-row">
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
              <span style={{ color: 'var(--accent)' }}>{profile?.name || 'there'}</span>
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}Focusing on your {profile?.target_percentile || 99}+ percentile goal
            </p>
          </div>
          <NavLink to="/session" className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: 12 }}>
            <Zap size={16} /> Start Session
          </NavLink>
        </div>
      </div>

      <div className="bento-grid">
        {/* Main Stats - Hero Card */}
        <div className="card bento-card-large" style={{ background: 'var(--surface)', padding: '24px 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <div className="stat-label" style={{ color: 'var(--text-dim)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} /> Focus Time Today
              </div>
              <div className="stat-value" style={{ fontSize: 36, fontWeight: 700 }}>{formatMins(todayMins)}</div>
              <div className="progress-bar" style={{ marginTop: 16, height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                <div className="progress-fill" style={{ width: `${hoursProgress}%`, background: 'var(--sky)', transition: 'width 1s ease-out' }} />
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                Target: {formatMins(goalMins)} · <strong>{hoursProgress.toFixed(0)}%</strong>
              </div>
            </div>
            
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 32 }}>
              <div className="stat-label" style={{ color: 'var(--text-dim)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Flame size={14} /> Study Streak
              </div>
              <div className="stat-value" style={{ fontSize: 36, fontWeight: 700, color: 'var(--sky)' }}>
                {streak?.current_streak || 0}
                <span style={{ fontSize: 16, marginLeft: 6, fontWeight: 500, color: 'var(--text-muted)' }}>days</span>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>Best: {streak?.longest_streak || 0} days</div>
            </div>
          </div>
        </div>

        {/* Weekly Accuracy */}
        <div className="card bento-card" style={{ background: 'var(--mint-dim)' }}>
          <div className="stat-label" style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Target size={14} /> Average Accuracy
          </div>
          <div className="stat-value" style={{ fontSize: 32, marginTop: 12, fontWeight: 700 }}>{weeklyAccuracy}%</div>
          <div className="stat-sub" style={{ fontSize: 12, marginTop: 4 }}>{weeklyQuestions} questions solved</div>
          <div style={{ marginTop: 20, height: 6, background: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' }}>
             <div style={{ width: `${weeklyAccuracy}%`, height: '100%', background: 'var(--green)' }} />
          </div>
        </div>

        {/* Total Volume */}
        <div className="card bento-card" style={{ background: 'var(--surface)' }}>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={14} /> Total Volume
          </div>
          <div className="stat-value" style={{ fontSize: 32, marginTop: 12, fontWeight: 700 }}>
            {streak?.total_questions?.toLocaleString() || 0}
          </div>
          <div className="stat-sub" style={{ fontSize: 12, marginTop: 4 }}>
            Across {streak?.total_hours?.toFixed(1) || 0} study hours
          </div>
        </div>

        {/* Smart Insights */}
        <div className="card bento-card-tall" style={{ background: 'var(--sky-dim)', border: 'none' }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--sky)' }}>Study Compass</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 18 }}>{ins.icon}</span>
                <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>{ins.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Live Feed */}
        <div className="card bento-card">
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Activity Stream</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessionsToday.slice(0, 3).map(s => (
               <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                 <div style={{ width: 6, height: 6, borderRadius: '50%', background: sectionColor[s.subject] }} />
                 <span style={{ flex: 1, fontWeight: 500 }}>{getTopicById(s.topic_id)?.name || 'General Session'}</span>
                 <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>{s.duration_min}m</span>
               </div>
            ))}
            {sessionsToday.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No sessions today.</p>}
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="card bento-card-large" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Today's Checklist</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddPlan(true)} style={{ height: 32 }}>
              <Plus size={14} /> Add Task
            </button>
          </div>

          {plans.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <ClipboardList size={32} style={{ color: 'var(--text-dim)', opacity: 0.3, marginBottom: 16 }} />
              <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Setting daily goals increases focus by 40%.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {plans.map(plan => {
                const topic = getTopicById(plan.topic_id);
                return (
                  <div key={plan.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '16px', borderRadius: 16,
                    background: plan.completed ? 'var(--mint-dim)' : 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    transition: 'var(--transition)'
                  }}>
                    <button
                      className="btn btn-icon btn-sm"
                      onClick={() => togglePlan(plan)}
                      style={{ background: plan.completed ? 'var(--mint)' : 'var(--surface-3)', border: 'none', color: plan.completed ? '#fff' : 'var(--text-dim)', borderRadius: '50%', width: 24, height: 24, padding: 0, justifyContent: 'center' }}
                    >
                      <CheckCircle size={14} />
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: plan.completed ? 'var(--text-dim)' : 'var(--text)', textDecoration: plan.completed ? 'line-through' : 'none' }}>
                        {topic?.name || plan.topic_id}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>
                        {plan.subject} · {plan.question_goal} Qs
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weak Topics */}
        <div className="card" style={{ gridColumn: 'span 12', background: 'var(--surface)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Knowledge Retention Review</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {weakTopics.slice(0, 3).map(ts => (
               <div key={ts.topic_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border)' }}>
                 <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{getTopicById(ts.topic_id)?.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Low accuracy detected</span>
                 </div>
                 <div style={{ 
                   fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 10,
                   background: accuracyStatus(ts.accuracy_pct).cls === 'badge-red' ? 'var(--red-dim)' : 'var(--yellow-dim)',
                   color: accuracyStatus(ts.accuracy_pct).cls === 'badge-red' ? 'var(--red)' : 'var(--yellow)',
                   border: '1px solid currentColor', opacity: 0.8
                 }}>
                   {ts.accuracy_pct.toFixed(0)}%
                 </div>
               </div>
            ))}
            {weakTopics.length === 0 && (
              <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: 13 }}>
                Consistency is key! No critical areas found yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddPlan && (
        <AddPlanModal userId={user.id} onClose={() => setShowAddPlan(false)} onAdded={load} />
      )}
    </div>
  );
}
