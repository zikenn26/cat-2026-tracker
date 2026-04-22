import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getMockTests, insertMockTest } from '../../services/db';
import { CAT_SYLLABUS, getTopicById } from '../../data/syllabus';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, X, TrendingUp, Target, FileText } from 'lucide-react';

const SECTION_COLOR = { QA: '#6366f1', DILR: '#06b6d4', VARC: '#8b5cf6' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

/* ── Add Mock Modal ── */
function AddMockModal({ userId, onClose, onAdded }) {
  const { show } = useToast();
  const [form, setForm] = useState({
    mock_name: '', date: new Date().toISOString().split('T')[0],
    total_score: '', percentile: '',
    varc_score: '', varc_attempted: '', varc_correct: '',
    dilr_score: '', dilr_attempted: '', dilr_correct: '',
    qa_score: '',   qa_attempted: '',   qa_correct: '',
    easy_missed: '', time_wasted: '', notes: '',
    weak_topics: [],
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleWeakTopic = (id) => {
    setForm(f => ({
      ...f,
      weak_topics: f.weak_topics.includes(id) ? f.weak_topics.filter(x => x !== id) : [...f.weak_topics, id],
    }));
  };

  const save = async () => {
    if (!form.mock_name || !form.date) { show('Please fill name and date', 'error'); return; }
    setSaving(true);
    const row = {
      user_id: userId,
      mock_name: form.mock_name, date: form.date,
      total_score: +form.total_score || 0,
      percentile: +form.percentile || null,
      varc_score: +form.varc_score || 0, varc_attempted: +form.varc_attempted || 0, varc_correct: +form.varc_correct || 0,
      dilr_score: +form.dilr_score || 0, dilr_attempted: +form.dilr_attempted || 0, dilr_correct: +form.dilr_correct || 0,
      qa_score:   +form.qa_score   || 0, qa_attempted:   +form.qa_attempted   || 0, qa_correct:   +form.qa_correct   || 0,
      easy_missed: +form.easy_missed || 0,
      time_wasted: form.time_wasted,
      weak_topics: form.weak_topics,
      notes: form.notes,
    };
    const { error } = await insertMockTest(row);
    if (error) { show(error.message, 'error'); }
    else { show('Mock test logged! 📊', 'success'); onAdded(); onClose(); }
    setSaving(false);
  };

  const inputStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Log Mock Test</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Basic */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Mock Name</label>
              <input className="form-input" placeholder="e.g. AIMCAT 1" value={form.mock_name} onChange={e => set('mock_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Total Score</label>
              <input type="number" className="form-input" placeholder="e.g. 120" value={form.total_score} onChange={e => set('total_score', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Percentile</label>
              <input type="number" className="form-input" placeholder="e.g. 95.4" step="0.1" value={form.percentile} onChange={e => set('percentile', e.target.value)} />
            </div>
          </div>

          {/* Section breakdown */}
          {[
            { sec: 'VARC', label: 'VARC', color: '#8b5cf6' },
            { sec: 'DILR', label: 'DILR', color: '#06b6d4' },
            { sec: 'QA',   label: 'QA',   color: '#6366f1' },
          ].map(({ sec, label, color }) => (
            <div key={sec}>
              <div className="section-title" style={{ marginBottom: 8 }}>
                <span style={{ color }}>{label}</span>
              </div>
              <div style={inputStyle}>
                <div className="form-group">
                  <label className="form-label">Score</label>
                  <input type="number" className="form-input" value={form[`${sec.toLowerCase()}_score`]}
                    onChange={e => set(`${sec.toLowerCase()}_score`, e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Attempted</label>
                  <input type="number" className="form-input" value={form[`${sec.toLowerCase()}_attempted`]}
                    onChange={e => set(`${sec.toLowerCase()}_attempted`, e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Correct</label>
                  <input type="number" className="form-input" value={form[`${sec.toLowerCase()}_correct`]}
                    onChange={e => set(`${sec.toLowerCase()}_correct`, e.target.value)} />
                </div>
              </div>
            </div>
          ))}

          {/* Analysis */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Easy Questions Missed</label>
              <input type="number" className="form-input" min={0} value={form.easy_missed}
                onChange={e => set('easy_missed', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Time Wasted On</label>
              <select className="form-select" value={form.time_wasted} onChange={e => set('time_wasted', e.target.value)}>
                <option value="">None</option>
                <option value="VARC">VARC</option>
                <option value="DILR">DILR</option>
                <option value="QA">QA</option>
              </select>
            </div>
          </div>

          {/* Weak topics */}
          <div className="form-group">
            <label className="form-label">Weak Topics in This Mock</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {Object.entries(CAT_SYLLABUS).flatMap(([sec, sd]) =>
                Object.values(sd.categories).flat().map(t => ({ ...t, section: sec }))
              ).map(t => (
                <button key={t.id} type="button"
                  className="btn btn-sm"
                  onClick={() => toggleWeakTopic(t.id)}
                  style={{
                    fontSize: 11, padding: '3px 8px',
                    background: form.weak_topics.includes(t.id) ? 'var(--red-dim)' : 'var(--surface-2)',
                    color: form.weak_topics.includes(t.id) ? 'var(--red)' : 'var(--text-muted)',
                    border: `1px solid ${form.weak_topics.includes(t.id) ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                  }}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes / Observations</label>
            <textarea className="form-textarea" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="What went well? What went wrong? What to fix?" />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ flex: 2, justifyContent: 'center' }}>
              {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Save Mock Test'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Mock Card ── */
function MockCard({ mock }) {
  const [expanded, setExpanded] = useState(false);
  const secAcc = sec => {
    const a = mock[`${sec}_attempted`];
    const c = mock[`${sec}_correct`];
    return a ? ((c / a) * 100).toFixed(1) : '—';
  };
  const pColor = mock.percentile >= 99 ? '#22c55e' : mock.percentile >= 95 ? '#06b6d4' : mock.percentile >= 90 ? '#eab308' : '#ef4444';

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 10, flexShrink: 0,
          background: 'var(--accent-dim)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 20,
        }}>📝</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>{mock.mock_name}</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {new Date(mock.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{mock.total_score}</span>
            {mock.percentile && (
              <span style={{ fontSize: 22, fontWeight: 800, color: pColor }}>{mock.percentile}%ile</span>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {['varc', 'dilr', 'qa'].map(sec => (
                <span key={sec} style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                  background: sec === 'varc' ? 'var(--violet-dim)' : sec === 'dilr' ? 'var(--cyan-dim)' : 'var(--accent-dim)',
                  color: sec === 'varc' ? 'var(--violet)' : sec === 'dilr' ? 'var(--cyan)' : 'var(--accent)' }}>
                  {sec.toUpperCase()} {mock[`${sec}_score`]} · {secAcc(sec)}%
                </span>
              ))}
            </div>
          </div>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setExpanded(e => !e)}>
          {expanded ? <X size={14} /> : <span style={{ fontSize: 12 }}>Details</span>}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
            {['varc', 'dilr', 'qa'].map(sec => (
              <div key={sec} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: SECTION_COLOR[sec.toUpperCase()], textTransform: 'uppercase', marginBottom: 6 }}>{sec}</div>
                <div style={{ fontSize: 13 }}>Score: <strong>{mock[`${sec}_score`]}</strong></div>
                <div style={{ fontSize: 13 }}>Attempted: <strong>{mock[`${sec}_attempted`]}</strong></div>
                <div style={{ fontSize: 13 }}>Correct: <strong style={{ color: 'var(--green)' }}>{mock[`${sec}_correct`]}</strong></div>
                <div style={{ fontSize: 13 }}>Accuracy: <strong>{secAcc(sec)}{typeof secAcc(sec) === 'string' && secAcc(sec) !== '—' ? '%' : ''}</strong></div>
              </div>
            ))}
          </div>
          {mock.easy_missed > 0 && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--yellow-dim)', color: 'var(--yellow)', fontSize: 12, marginBottom: 8 }}>
              ⚠️ {mock.easy_missed} easy questions missed — focus on accuracy over speed
            </div>
          )}
          {mock.time_wasted && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--red-dim)', color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>
              ⏰ Too much time spent on {mock.time_wasted}
            </div>
          )}
          {mock.weak_topics?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Weak topics in this mock:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {mock.weak_topics.map(id => {
                  const t = getTopicById(id);
                  return t ? (
                    <span key={id} className="badge badge-red">{t.name}</span>
                  ) : null;
                })}
              </div>
            </div>
          )}
          {mock.notes && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-2)', fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic' }}>
              "{mock.notes}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Mock Tests Page ── */
export default function MockTestsPage() {
  const { user } = useAuth();
  const [mocks, setMocks]       = useState([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await getMockTests(user.id);
    setMocks(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Chart data
  const chartData = [...mocks].reverse().map(m => ({
    name: m.mock_name,
    Score: m.total_score,
    Percentile: m.percentile || 0,
    VARC: m.varc_score, DILR: m.dilr_score, QA: m.qa_score,
  }));

  const latestMock  = mocks[0];
  const avgPerc = mocks.length ? (mocks.reduce((s, m) => s + (m.percentile || 0), 0) / mocks.length).toFixed(1) : '—';
  const bestPerc = mocks.length ? Math.max(...mocks.map(m => m.percentile || 0)).toFixed(1) : '—';

  if (loading) return (
    <div className="loading-screen" style={{ background: 'transparent' }}><div className="spinner" /></div>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Mock Tests</h1>
            <p>Log, analyze, and track your percentile journey</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Log Mock Test
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card accent">
          <div className="stat-label">Mocks Taken</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{mocks.length}</div>
          <div className="stat-sub">Total mock tests logged</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-label">Latest Score</div>
          <div className="stat-value" style={{ color: 'var(--cyan)' }}>{latestMock?.total_score ?? '—'}</div>
          <div className="stat-sub">{latestMock ? latestMock.mock_name : 'No mocks yet'}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Best Percentile</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{bestPerc}{bestPerc !== '—' ? '%' : ''}</div>
          <div className="stat-sub">Your peak performance</div>
        </div>
        <div className="stat-card violet">
          <div className="stat-label">Avg Percentile</div>
          <div className="stat-value" style={{ color: 'var(--violet)' }}>{avgPerc}{avgPerc !== '—' ? '%' : ''}</div>
          <div className="stat-sub">Across all mocks</div>
        </div>
      </div>

      {/* Charts */}
      {mocks.length >= 2 && (
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Percentile Trend</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Percentile" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Section Scores</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="VARC" fill="#8b5cf6" radius={[3,3,0,0]} maxBarSize={20} />
                <Bar dataKey="DILR" fill="#06b6d4" radius={[3,3,0,0]} maxBarSize={20} />
                <Bar dataKey="QA"   fill="#6366f1" radius={[3,3,0,0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Mock List */}
      {mocks.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 48 }}>
          <FileText size={48} style={{ opacity: 0.3 }} />
          <h3>No mock tests yet</h3>
          <p>Log your first mock test to start tracking your percentile journey</p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Log First Mock
          </button>
        </div>
      ) : (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            All Mocks ({mocks.length})
          </h3>
          {mocks.map(m => <MockCard key={m.id} mock={m} />)}
        </div>
      )}

      {showAdd && <AddMockModal userId={user.id} onClose={() => setShowAdd(false)} onAdded={load} />}
    </div>
  );
}
