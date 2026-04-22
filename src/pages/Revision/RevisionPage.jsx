import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../supabaseClient';
import { getTopicStats } from '../../services/db';
import { getTopicById, CAT_SYLLABUS } from '../../data/syllabus';
import { useNavigate } from 'react-router-dom';
import { Plus, X, RefreshCcw, Play, CheckCircle, BookOpen } from 'lucide-react';

const INTERVALS = [1, 3, 7, 15, 30]; // spaced repetition schedule (days)
const SECTION_COLOR = { QA: '#6366f1', DILR: '#06b6d4', VARC: '#8b5cf6' };

/* ── DB helpers (inline since revision_queue isn't in db.js yet) ── */
const getRevisionQueue  = (userId) =>
  supabase.from('revision_queue').select('*').eq('user_id', userId).order('next_review', { ascending: true });
const insertRevision    = (row) =>
  supabase.from('revision_queue').insert(row).select().single();
const completeRevision  = async (id, intervalDays) => {
  const next = new Date();
  next.setDate(next.getDate() + intervalDays);
  return supabase.from('revision_queue')
    .update({ completed: true, next_review: next.toISOString().split('T')[0], interval_days: intervalDays })
    .eq('id', id);
};
const deleteRevision = (id) => supabase.from('revision_queue').delete().eq('id', id);


/* ── Add to Queue Modal ── */
function AddRevisionModal({ userId, onClose, onAdded }) {
  const { show } = useToast();
  const [subject, setSubject]   = useState('QA');
  const [topicId, setTopicId]   = useState('');
  const [interval, setInterval] = useState(1);
  const [saving, setSaving]     = useState(false);

  const save = async () => {
    if (!topicId) { show('Select a topic', 'error'); return; }
    setSaving(true);
    const today = new Date();
    const next  = new Date(today);
    next.setDate(today.getDate() + interval);
    const { error } = await insertRevision({
      user_id: userId,
      topic_id: topicId,
      created_date: today.toISOString().split('T')[0],
      next_review: next.toISOString().split('T')[0],
      interval_days: interval,
      completed: false,
    });
    if (error) show(error.message, 'error');
    else { show('Added to revision queue!', 'success'); onAdded(); onClose(); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add to Revision Queue</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Section</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['QA', 'DILR', 'VARC'].map(s => (
                <button key={s} type="button"
                  className={`btn btn-sm ${subject === s ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => { setSubject(s); setTopicId(''); }}>
                  {s}
                </button>
              ))}
            </div>
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
          <div className="form-group">
            <label className="form-label">First Review In</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {INTERVALS.map(d => (
                <button key={d} type="button"
                  className={`btn btn-sm ${interval === d ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setInterval(d)}>
                  {d} day{d > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !topicId}
              style={{ flex: 2, justifyContent: 'center' }}>
              {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Add to Queue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Revision Card ── */
function RevisionCard({ item, onDone, onDelete }) {
  const navigate  = useNavigate();
  const topic     = getTopicById(item.topic_id);
  const today     = new Date().toISOString().split('T')[0];
  const isDue     = item.next_review <= today;
  const daysUntil = Math.ceil((new Date(item.next_review) - new Date(today)) / 86400000);
  const color     = SECTION_COLOR[topic?.section] || 'var(--accent)';

  const nextInterval = (() => {
    const idx = INTERVALS.indexOf(item.interval_days);
    return INTERVALS[Math.min(idx + 1, INTERVALS.length - 1)];
  })();

  return (
    <div style={{
      padding: '14px 18px', borderRadius: 'var(--radius-lg)',
      background: isDue ? 'var(--surface)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isDue ? color + '55' : 'var(--border)'}`,
      marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: isDue ? `0 0 0 1px ${color}22` : 'none',
    }}>
      {/* Status dot */}
      <div style={{
        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
        background: isDue ? color : 'var(--surface-3)',
        boxShadow: isDue ? `0 0 6px ${color}` : 'none',
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: isDue ? 'var(--text)' : 'var(--text-muted)' }}>
          {topic?.name || item.topic_id}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 12 }}>
          <span style={{ color }}>{topic?.section}</span>
          <span>Interval: {item.interval_days}d</span>
          <span style={{ color: isDue ? 'var(--yellow)' : 'var(--text-muted)' }}>
            {isDue ? '📅 Due today!' : `In ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {isDue && (
          <>
            <button
              className="btn btn-sm"
              onClick={() => navigate('/session', { state: { subject: topic?.section, topicId: item.topic_id } })}
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Play size={12} /> Revise
            </button>
            <button
              className="btn btn-sm"
              onClick={() => onDone(item.id, nextInterval)}
              style={{ background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <CheckCircle size={12} /> Done → {nextInterval}d
            </button>
          </>
        )}
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(item.id)}>
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

/* ── Auto-suggest from weak topics ── */
function WeakTopicSuggestions({ userId, queueTopicIds, onAdd }) {
  const [weakTopics, setWeakTopics] = useState([]);

  useEffect(() => {
    getTopicStats(userId).then(({ data }) => {
      const red = (data || [])
        .filter(t => t.status === 'red' && !queueTopicIds.includes(t.topic_id))
        .slice(0, 6);
      setWeakTopics(red);
    });
  }, [userId, queueTopicIds]);

  if (weakTopics.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--red)' }}>
        ⚠️ Weak Topics — Add to Revision Queue
      </h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {weakTopics.map(ts => {
          const topic = getTopicById(ts.topic_id);
          return topic ? (
            <button key={ts.topic_id} className="btn btn-sm"
              onClick={() => onAdd(ts.topic_id, topic.section)}
              style={{
                background: 'var(--red-dim)', color: 'var(--red)',
                border: '1px solid rgba(239,68,68,0.25)',
              }}>
              <Plus size={11} /> {topic.name}
              <span style={{ opacity: 0.7, fontSize: 10, marginLeft: 2 }}>
                ({ts.accuracy_pct.toFixed(0)}%)
              </span>
            </button>
          ) : null;
        })}
      </div>
    </div>
  );
}

/* ── Main Revision Page ── */
export default function RevisionPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [queue, setQueue]       = useState([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all'); // all | due | upcoming

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await getRevisionQueue(user.id);
    setQueue(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleDone = async (id, nextInterval) => {
    await completeRevision(id, nextInterval);
    show(`✅ Marked done! Next review in ${nextInterval} days`, 'success');
    load();
  };

  const handleDelete = async (id) => {
    await deleteRevision(id);
    setQueue(q => q.filter(x => x.id !== id));
  };

  // Quick-add from suggestion
  const quickAdd = async (topicId, section) => {
    const today = new Date();
    const next  = new Date(today); next.setDate(today.getDate() + 1);
    await insertRevision({
      user_id: user.id, topic_id: topicId,
      created_date: today.toISOString().split('T')[0],
      next_review: next.toISOString().split('T')[0],
      interval_days: 1, completed: false,
    });
    show('Added to revision queue!', 'success');
    load();
  };

  const today = new Date().toISOString().split('T')[0];
  const dueItems      = queue.filter(q => !q.completed && q.next_review <= today);
  const upcomingItems = queue.filter(q => !q.completed && q.next_review > today);
  const doneItems     = queue.filter(q => q.completed);

  const filtered = filter === 'due' ? dueItems : filter === 'upcoming' ? upcomingItems : [...dueItems, ...upcomingItems];

  if (loading) return (
    <div className="loading-screen" style={{ background: 'transparent' }}><div className="spinner" /></div>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Revision Queue</h1>
            <p>Spaced repetition: 1 → 3 → 7 → 15 → 30 day intervals</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Topic
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="stat-card red">
          <div className="stat-label">Due Today</div>
          <div className="stat-value" style={{ color: dueItems.length > 0 ? 'var(--red)' : 'var(--green)' }}>
            {dueItems.length}
          </div>
          <div className="stat-sub">Awaiting revision</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Upcoming</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{upcomingItems.length}</div>
          <div className="stat-sub">Scheduled</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Completed Today</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>
            {queue.filter(q => q.completed && q.next_review === today).length}
          </div>
          <div className="stat-sub">Sessions done</div>
        </div>
        <div className="stat-card violet">
          <div className="stat-label">Total Topics</div>
          <div className="stat-value" style={{ color: 'var(--violet)' }}>
            {new Set(queue.map(q => q.topic_id)).size}
          </div>
          <div className="stat-sub">In the system</div>
        </div>
      </div>

      {/* Due today highlight */}
      {dueItems.length > 0 && (
        <div style={{
          padding: '14px 18px', borderRadius: 'var(--radius-lg)', marginBottom: 20,
          background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <RefreshCcw size={18} style={{ color: 'var(--red)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--red)' }}>
              {dueItems.length} topic{dueItems.length > 1 ? 's' : ''} due for revision today!
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Revise now to keep your memory strong
            </div>
          </div>
        </div>
      )}

      {/* Weak topic suggestions */}
      <WeakTopicSuggestions
        userId={user.id}
        queueTopicIds={queue.map(q => q.topic_id)}
        onAdd={quickAdd}
      />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { v: 'all', l: `All Active (${dueItems.length + upcomingItems.length})` },
          { v: 'due', l: `Due Now (${dueItems.length})` },
          { v: 'upcoming', l: `Upcoming (${upcomingItems.length})` },
        ].map(({ v, l }) => (
          <button key={v} className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      {/* Queue list */}
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 40 }}>
          <BookOpen size={48} style={{ opacity: 0.3 }} />
          <h3>{queue.length === 0 ? 'Revision queue is empty' : 'Nothing matching filter'}</h3>
          <p>Add topics to revise. The system schedules them at 1, 3, 7, 15, 30 day intervals.</p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add First Topic
          </button>
        </div>
      ) : (
        <div>
          {/* Due items first (highlighted) */}
          {filter !== 'upcoming' && dueItems.map(item => (
            <RevisionCard key={item.id} item={item} onDone={handleDone} onDelete={handleDelete} />
          ))}
          {/* Upcoming */}
          {filter !== 'due' && upcomingItems.length > 0 && (
            <>
              {filter === 'all' && dueItems.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, margin: '16px 0 8px',
                  textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Upcoming
                </div>
              )}
              {upcomingItems.map(item => (
                <RevisionCard key={item.id} item={item} onDone={handleDone} onDelete={handleDelete} />
              ))}
            </>
          )}
        </div>
      )}

      {showAdd && <AddRevisionModal userId={user.id} onClose={() => setShowAdd(false)} onAdded={load} />}
    </div>
  );
}
