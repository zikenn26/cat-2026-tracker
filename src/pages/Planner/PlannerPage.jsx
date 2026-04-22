import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getTodayPlans, insertPlan, updatePlan, deletePlan, getSessions } from '../../services/db';
import { CAT_SYLLABUS, getTopicById } from '../../data/syllabus';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Play, CheckCircle, Trash2, Calendar, Target, Clock, TrendingUp } from 'lucide-react';

const SECTION_COLOR = { QA: '#6366f1', DILR: '#06b6d4', VARC: '#8b5cf6' };

/* ── Add Plan Modal ── */
function AddPlanModal({ userId, onClose, onAdded }) {
  const { show } = useToast();
  const [form, setForm] = useState({
    subject: 'QA', topic_id: '', time_goal_min: 60, question_goal: 30,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.topic_id) { show('Please select a topic', 'error'); return; }
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    const { error } = await insertPlan({
      user_id: userId, date: today,
      subject: form.subject, topic_id: form.topic_id,
      time_goal_min: form.time_goal_min,
      question_goal: form.question_goal,
      completed: false,
    });
    if (error) show(error.message, 'error');
    else { show('Added to today\'s plan ✓', 'success'); onAdded(); onClose(); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add to Today's Plan</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Section</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['QA', 'DILR', 'VARC'].map(s => (
                <button key={s} type="button"
                  className={`btn btn-sm ${form.subject === s ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => { set('subject', s); set('topic_id', ''); }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Topic</label>
            <select className="form-select" value={form.topic_id} onChange={e => set('topic_id', e.target.value)}>
              <option value="">-- Select topic --</option>
              {Object.entries(CAT_SYLLABUS[form.subject]?.categories || {}).map(([cat, ts]) => (
                <optgroup key={cat} label={cat}>
                  {ts.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Time Goal (min)</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[30, 45, 60, 90].map(m => (
                  <button key={m} type="button"
                    className={`btn btn-sm ${form.time_goal_min === m ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => set('time_goal_min', m)}>{m}m</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Question Goal</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[15, 20, 30, 40].map(q => (
                  <button key={q} type="button"
                    className={`btn btn-sm ${form.question_goal === q ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => set('question_goal', q)}>{q}Q</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !form.topic_id}
              style={{ flex: 2, justifyContent: 'center' }}>
              {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Add Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Plan Item ── */
function PlanItem({ plan, onUpdate, onDelete }) {
  const navigate = useNavigate();
  const topic = getTopicById(plan.topic_id);
  const color = SECTION_COLOR[plan.subject];

  const toggle = async () => {
    await updatePlan(plan.id, { completed: !plan.completed });
    onUpdate();
  };

  const startSession = () => {
    navigate('/session', { state: { subject: plan.subject, topicId: plan.topic_id } });
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', borderRadius: 'var(--radius-lg)',
      background: plan.completed ? 'rgba(34,197,94,0.05)' : 'var(--surface)',
      border: `1px solid ${plan.completed ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`,
      marginBottom: 8, transition: 'all 0.2s',
      opacity: plan.completed ? 0.75 : 1,
    }}>
      {/* Checkbox */}
      <button
        onClick={toggle}
        style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${plan.completed ? 'var(--green)' : 'var(--border-2)'}`,
          background: plan.completed ? 'var(--green)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        {plan.completed && <CheckCircle size={14} color="#fff" />}
      </button>

      {/* Section dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: color, flexShrink: 0,
      }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, fontSize: 14,
          textDecoration: plan.completed ? 'line-through' : 'none',
          color: plan.completed ? 'var(--text-muted)' : 'var(--text)',
        }}>
          {topic?.name || plan.topic_id}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 12 }}>
          <span style={{ color }}>{plan.subject}</span>
          <span><Clock size={10} style={{ display: 'inline', marginRight: 2 }} />{plan.time_goal_min}m</span>
          <span><Target size={10} style={{ display: 'inline', marginRight: 2 }} />{plan.question_goal}Q</span>
        </div>
      </div>

      {/* Actions */}
      {!plan.completed && (
        <button
          className="btn btn-primary btn-sm"
          onClick={startSession}
          style={{ flexShrink: 0 }}
          title="Start session for this topic">
          <Play size={12} /> Start
        </button>
      )}
      <button
        className="btn btn-ghost btn-icon btn-sm"
        onClick={() => onDelete(plan.id)}
        style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}

/* ── Weekly Summary ── */
function WeeklySummary({ sessions }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i); // this week Mon-Sun
    const dateStr = d.toISOString().split('T')[0];
    const daySessions = sessions.filter(s => s.date === dateStr);
    const mins = daySessions.reduce((s, x) => s + (x.duration_min || 0), 0);
    const questions = daySessions.reduce((s, x) => s + (x.attempted || 0), 0);
    const isToday = dateStr === today.toISOString().split('T')[0];
    const isPast = d < today && !isToday;
    return { day: days[d.getDay()], mins, questions, isToday, isPast };
  });

  const maxMins = Math.max(...week.map(d => d.mins), 60);

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>This Week</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 100 }}>
        {week.map(({ day, mins, questions, isToday, isPast }) => {
          const h = mins ? Math.max(8, (mins / maxMins) * 80) : 0;
          return (
            <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 10, color: mins > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                {mins > 0 ? `${mins}m` : ''}
              </div>
              <div style={{
                width: '100%', height: `${h || 4}px`,
                borderRadius: 4,
                background: isToday ? 'linear-gradient(180deg, var(--accent), var(--violet))' :
                             mins > 0 ? 'var(--accent-dim)' : 'var(--surface-3)',
                border: isToday ? '1px solid var(--accent)' : 'none',
                minHeight: 4,
              }} />
              <div style={{
                fontSize: 11, fontWeight: isToday ? 700 : 400,
                color: isToday ? 'var(--accent)' : 'var(--text-muted)',
              }}>{day}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        {[
          { label: 'Days Studied', val: week.filter(d => d.mins > 0).length + '/7', color: 'var(--accent)' },
          { label: 'Total Time', val: `${Math.round(week.reduce((s, d) => s + d.mins, 0) / 60 * 10) / 10}h`, color: 'var(--cyan)' },
          { label: 'Questions', val: week.reduce((s, d) => s + d.questions, 0), color: 'var(--violet)' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Planner Page ── */
export default function PlannerPage() {
  const { user, profile } = useAuth();
  const { show } = useToast();
  const [plans, setPlans]       = useState([]);
  const [sessions, setSessions] = useState([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [loading, setLoading]   = useState(true);

  const todayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const load = useCallback(async () => {
    if (!user) return;
    const [p, s] = await Promise.all([getTodayPlans(user.id), getSessions(user.id, 100)]);
    setPlans(p.data || []);
    setSessions(s.data || []);
    setLoading(false);
  }, [user]);

  const scheduleReminder = async () => {
    if (!("Notification" in window)) {
      show("System notifications not supported", "error");
      return;
    }
    
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    
    if (permission === "granted") {
      show("Study reminder set for 1 hour from now!", "success");
      setTimeout(() => {
        new Notification("📖 CAT 2026: Time to Study!", {
          body: "Your planned session is waiting. Stay consistent!",
          icon: "/vite.svg"
        });
      }, 3600000); // 1 hour
    } else {
      show("Notification permission denied", "error");
    }
  };

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    await deletePlan(id);
    setPlans(ps => ps.filter(p => p.id !== id));
    show('Task removed', 'info');
  };

  const completedCount = plans.filter(p => p.completed).length;
  const totalMinsGoal  = plans.reduce((s, p) => s + p.time_goal_min, 0);
  const totalQGoal     = plans.reduce((s, p) => s + p.question_goal, 0);
  const progress       = plans.length ? (completedCount / plans.length) * 100 : 0;

  // Section balance for today
  const sectionCounts = { QA: 0, DILR: 0, VARC: 0 };
  plans.forEach(p => { if (sectionCounts[p.subject] !== undefined) sectionCounts[p.subject]++; });

  if (loading) return (
    <div className="loading-screen" style={{ background: 'transparent' }}><div className="spinner" /></div>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Study Planner</h1>
            <p style={{ marginTop: 4 }}>{todayDate}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={scheduleReminder}>
              <Clock size={16} /> Remind Me
            </button>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add Task
            </button>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Today progress */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div className="stat-label">Today's Progress</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: progress === 100 ? 'var(--green)' : 'var(--accent)', marginTop: 4 }}>
                {completedCount} / {plans.length}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>tasks completed</div>
            </div>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: `conic-gradient(var(--accent) ${progress * 3.6}deg, var(--surface-3) 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                color: progress === 100 ? 'var(--green)' : 'var(--text)',
              }}>
                {Math.round(progress)}%
              </div>
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{
              width: `${progress}%`,
              background: progress === 100 ? 'var(--green)' : 'linear-gradient(90deg, var(--accent), var(--violet))',
            }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
              Goal: <strong style={{ color: 'var(--text)' }}>{totalMinsGoal}m</strong>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              <Target size={11} style={{ display: 'inline', marginRight: 3 }} />
              Goal: <strong style={{ color: 'var(--text)' }}>{totalQGoal}Q</strong>
            </div>
          </div>
        </div>

        {/* Section balance */}
        <div className="card">
          <div className="stat-label" style={{ marginBottom: 12 }}>Section Balance Today</div>
          {['QA', 'DILR', 'VARC'].map(sec => {
            const count = sectionCounts[sec];
            const maxCount = Math.max(...Object.values(sectionCounts), 1);
            return (
              <div key={sec} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: SECTION_COLOR[sec] }}>{sec}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{count} task{count !== 1 ? 's' : ''}</span>
                </div>
                <div className="progress-bar">
                  <div style={{
                    height: '100%', borderRadius: 'var(--radius-full)',
                    width: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%',
                    background: SECTION_COLOR[sec],
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            );
          })}
          {plans.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 8 }}>
              Add tasks to see section balance
            </p>
          )}
        </div>
      </div>

      {/* Weekly summary */}
      <WeeklySummary sessions={sessions} />

      {/* Today's task list */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Today's Tasks ({plans.length})
          </h3>
          {completedCount === plans.length && plans.length > 0 && (
            <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
              🎉 All done! Great work today!
            </span>
          )}
        </div>

        {plans.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 40 }}>
            <Calendar size={48} style={{ opacity: 0.3 }} />
            <h3>No tasks planned yet</h3>
            <p>Add topics to study today. Hit each target then log a session.</p>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={14} /> Add First Task
            </button>
          </div>
        ) : (
          <div>
            {/* Pending */}
            {plans.filter(p => !p.completed).map(p => (
              <PlanItem key={p.id} plan={p} onUpdate={load} onDelete={handleDelete} />
            ))}
            {/* Completed */}
            {plans.filter(p => p.completed).length > 0 && (
              <>
                <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, marginTop: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={13} /> Completed ({plans.filter(p => p.completed).length})
                </div>
                {plans.filter(p => p.completed).map(p => (
                  <PlanItem key={p.id} plan={p} onUpdate={load} onDelete={handleDelete} />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {showAdd && <AddPlanModal userId={user.id} onClose={() => setShowAdd(false)} onAdded={load} />}
    </div>
  );
}
