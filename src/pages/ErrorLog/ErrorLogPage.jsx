import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrors, insertError, updateError } from '../../services/db';
import { CAT_SYLLABUS, getTopicById } from '../../data/syllabus';
import { Plus, X, CheckCircle, RefreshCcw, AlertTriangle, Filter } from 'lucide-react';

const MISTAKE_TYPES = [
  { value: 'concept',       label: 'Concept Gap',      color: 'var(--red)',    icon: '🧠' },
  { value: 'calculation',   label: 'Calculation Error', color: 'var(--yellow)', icon: '🔢' },
  { value: 'time_pressure', label: 'Time Pressure',     color: 'var(--orange)', icon: '⏰' },
  { value: 'silly',         label: 'Silly Mistake',     color: 'var(--violet)', icon: '😓' },
];

const SECTION_COLOR = { QA: '#6366f1', DILR: '#06b6d4', VARC: '#8b5cf6' };

/* ── Add Error Modal ── */
function AddErrorModal({ userId, onClose, onAdded }) {
  const { show } = useToast();
  const [form, setForm] = useState({
    section: 'QA', topic_id: '', question_text: '',
    mistake_type: 'concept', correct_solution: '', revisit: true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.topic_id) { show('Please select a topic', 'error'); return; }
    setSaving(true);
    const { error } = await insertError({
      user_id: userId, date: new Date().toISOString().split('T')[0],
      section: form.section, topic_id: form.topic_id,
      question_text: form.question_text, mistake_type: form.mistake_type,
      correct_solution: form.correct_solution, revisit: form.revisit,
      resolved: false,
    });
    if (error) show(error.message, 'error');
    else { show('Error logged! Learn from it 💪', 'success'); onAdded(); onClose(); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Log Error</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Section */}
          <div className="form-group">
            <label className="form-label">Section</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['QA', 'DILR', 'VARC'].map(sec => (
                <button key={sec} type="button"
                  className={`btn btn-sm ${form.section === sec ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => { set('section', sec); set('topic_id', ''); }}>
                  {sec}
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div className="form-group">
            <label className="form-label">Topic</label>
            <select className="form-select" value={form.topic_id} onChange={e => set('topic_id', e.target.value)}>
              <option value="">-- Select topic --</option>
              {Object.entries(CAT_SYLLABUS[form.section]?.categories || {}).map(([cat, ts]) => (
                <optgroup key={cat} label={cat}>
                  {ts.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Mistake type */}
          <div className="form-group">
            <label className="form-label">Mistake Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {MISTAKE_TYPES.map(mt => (
                <button key={mt.value} type="button"
                  onClick={() => set('mistake_type', mt.value)}
                  className="btn btn-sm"
                  style={{
                    justifyContent: 'flex-start', gap: 6,
                    background: form.mistake_type === mt.value ? mt.color + '22' : 'var(--surface-2)',
                    color: form.mistake_type === mt.value ? mt.color : 'var(--text-muted)',
                    border: `1px solid ${form.mistake_type === mt.value ? mt.color + '55' : 'var(--border)'}`,
                    fontWeight: form.mistake_type === mt.value ? 700 : 400,
                  }}>
                  {mt.icon} {mt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question */}
          <div className="form-group">
            <label className="form-label">Question / Description</label>
            <textarea className="form-textarea" rows={3} value={form.question_text}
              onChange={e => set('question_text', e.target.value)}
              placeholder="Paste or describe the question..." />
          </div>

          {/* Solution */}
          <div className="form-group">
            <label className="form-label">Correct Solution / Key Concept</label>
            <textarea className="form-textarea" rows={3} value={form.correct_solution}
              onChange={e => set('correct_solution', e.target.value)}
              placeholder="Write the correct approach or concept to remember..." />
          </div>

          {/* Revisit toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button"
              onClick={() => set('revisit', !form.revisit)}
              style={{
                width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: form.revisit ? 'var(--accent)' : 'var(--surface-3)',
                position: 'relative', transition: 'all 0.2s',
              }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3,
                left: form.revisit ? 18 : 3,
                transition: 'left 0.2s',
              }} />
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Mark for revisit</span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !form.topic_id}
              style={{ flex: 2, justifyContent: 'center' }}>
              {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Log Error'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Error Row ── */
function ErrorRow({ err, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const topic    = getTopicById(err.topic_id);
  const mtype    = MISTAKE_TYPES.find(m => m.value === err.mistake_type) || MISTAKE_TYPES[0];

  const toggle = async (field) => {
    await updateError(err.id, { [field]: !err[field] });
    onUpdate();
  };

  return (
    <div className="card" style={{
      marginBottom: 8,
      opacity: err.resolved ? 0.6 : 1,
      borderLeft: `3px solid ${err.resolved ? 'var(--green)' : mtype.color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Mistake type icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: mtype.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>{mtype.icon}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{topic?.name || err.topic_id}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
              background: SECTION_COLOR[err.section] + '22', color: SECTION_COLOR[err.section] }}>
              {err.section}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: mtype.color }}>{mtype.label}</span>
            {err.revisit && !err.resolved && (
              <span className="badge badge-yellow" style={{ fontSize: 10 }}>Revisit</span>
            )}
            {err.resolved && (
              <span className="badge badge-green" style={{ fontSize: 10 }}>Resolved ✓</span>
            )}
          </div>

          {err.question_text && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {err.question_text}
            </p>
          )}

          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {new Date(err.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setExpanded(e => !e)}
            style={{ fontSize: 11 }}>{expanded ? 'Hide' : 'View'}</button>
          <button
            className="btn btn-icon btn-sm"
            title={err.resolved ? 'Mark unresolved' : 'Mark resolved'}
            onClick={() => toggle('resolved')}
            style={{ background: err.resolved ? 'var(--green-dim)' : 'var(--surface-2)',
              color: err.resolved ? 'var(--green)' : 'var(--text-muted)',
              border: `1px solid ${err.resolved ? 'rgba(34,197,94,0.3)' : 'var(--border)'}` }}>
            <CheckCircle size={15} />
          </button>
          <button
            className="btn btn-icon btn-sm"
            title="Toggle revisit flag"
            onClick={() => toggle('revisit')}
            style={{ background: err.revisit ? 'var(--yellow-dim)' : 'var(--surface-2)',
              color: err.revisit ? 'var(--yellow)' : 'var(--text-muted)',
              border: `1px solid ${err.revisit ? 'rgba(234,179,8,0.3)' : 'var(--border)'}` }}>
            <RefreshCcw size={15} />
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {err.question_text && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Question</div>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 8 }}>{err.question_text}</p>
            </div>
          )}
          {err.correct_solution && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>✓ Correct Solution / Key Concept</div>
              <p style={{ fontSize: 13, color: 'var(--text)', background: 'var(--green-dim)', padding: '10px 12px', borderRadius: 8, borderLeft: '3px solid var(--green)' }}>{err.correct_solution}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Error Log Page ── */
export default function ErrorLogPage() {
  const { user } = useAuth();
  const [errors, setErrors]       = useState([]);
  const [showAdd, setShowAdd]     = useState(false);
  const [filterSec, setFilterSec] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterState, setFilterState] = useState('ALL'); // ALL | unresolved | revisit
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await getErrors(user.id);
    setErrors(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const filtered = errors.filter(e => {
    if (filterSec !== 'ALL' && e.section !== filterSec) return false;
    if (filterType !== 'ALL' && e.mistake_type !== filterType) return false;
    if (filterState === 'unresolved' && e.resolved) return false;
    if (filterState === 'revisit' && !e.revisit) return false;
    return true;
  });

  // Stats
  const unresolved = errors.filter(e => !e.resolved).length;
  const revisit    = errors.filter(e => e.revisit && !e.resolved).length;
  const byType = MISTAKE_TYPES.map(mt => ({ ...mt, count: errors.filter(e => e.mistake_type === mt.value).length }));

  if (loading) return (
    <div className="loading-screen" style={{ background: 'transparent' }}><div className="spinner" /></div>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Error Log</h1>
            <p>Track every wrong answer — understand patterns, fix weaknesses</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Log Error
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="stat-card red">
          <div className="stat-label">Total Errors</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{errors.length}</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">Unresolved</div>
          <div className="stat-value" style={{ color: 'var(--yellow)' }}>{unresolved}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">To Revisit</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{revisit}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Resolved</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{errors.length - unresolved}</div>
        </div>
      </div>

      {/* Mistake type breakdown */}
      {errors.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Error Breakdown by Type</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {byType.map(mt => (
              <div key={mt.value} style={{
                flex: '1 1 140px', padding: '12px 14px', borderRadius: 10,
                background: mt.color + '11', border: `1px solid ${mt.color}33`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 22 }}>{mt.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: mt.color, fontWeight: 600 }}>{mt.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: mt.color }}>{mt.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <Filter size={14} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Section:</span>
        {['ALL', 'QA', 'DILR', 'VARC'].map(s => (
          <button key={s} className={`btn btn-sm ${filterSec === s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterSec(s)}>{s}</button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Type:</span>
        {[{ value: 'ALL', label: 'All' }, ...MISTAKE_TYPES].map(m => (
          <button key={m.value} className={`btn btn-sm ${filterType === m.value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterType(m.value)}>{m.icon || ''} {m.label}</button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
        {[{ v: 'ALL', l: 'All' }, { v: 'unresolved', l: 'Unresolved' }, { v: 'revisit', l: 'To Revisit' }].map(({ v, l }) => (
          <button key={v} className={`btn btn-sm ${filterState === v ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterState(v)}>{l}</button>
        ))}
        {filtered.length !== errors.length && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
            Showing {filtered.length} of {errors.length}
          </span>
        )}
      </div>

      {/* Error List */}
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 48 }}>
          <AlertTriangle size={48} style={{ opacity: 0.3 }} />
          <h3>{errors.length === 0 ? 'No errors logged yet' : 'No errors match filters'}</h3>
          <p>Log errors from practice sessions to track patterns</p>
          {errors.length === 0 && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={14} /> Log First Error
            </button>
          )}
        </div>
      ) : (
        <div>{filtered.map(e => <ErrorRow key={e.id} err={e} onUpdate={load} />)}</div>
      )}

      {showAdd && <AddErrorModal userId={user.id} onClose={() => setShowAdd(false)} onAdded={load} />}
    </div>
  );
}
