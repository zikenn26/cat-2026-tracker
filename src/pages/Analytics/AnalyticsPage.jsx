import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSessions, getTopicStats } from '../../services/db';
import { ALL_TOPICS, getTopicById, CAT_SYLLABUS } from '../../data/syllabus';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_COLOR = { green: '#22c55e', yellow: '#eab308', red: '#ef4444', unstarted: '#475569' };
const SECTION_COLOR = { QA: '#6366f1', DILR: '#06b6d4', VARC: '#8b5cf6' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || 'var(--text)', fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{p.name?.includes('Acc') ? '%' : ''}
        </p>
      ))}
    </div>
  );
};

function SectionOverview({ topicStats }) {
  return (
    <div className="grid-3" style={{ marginBottom: 24 }}>
      {['QA', 'DILR', 'VARC'].map(sec => {
        const rel = topicStats.filter(ts => getTopicById(ts.topic_id)?.section === sec && ts.total_attempted > 0);
        const totalA = rel.reduce((s, t) => s + t.total_attempted, 0);
        const totalC = rel.reduce((s, t) => s + t.total_correct, 0);
        const acc = totalA ? (totalC / totalA) * 100 : 0;
        const done = rel.length;
        const total = ALL_TOPICS.filter(t => t.section === sec).length;
        const color = SECTION_COLOR[sec];
        const sc = acc === 0 ? '#475569' : acc < 60 ? '#ef4444' : acc < 80 ? '#eab308' : '#22c55e';
        return (
          <div key={sec} className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
            <div className="stat-label" style={{ color }}>{CAT_SYLLABUS[sec].label}</div>
            <div className="stat-value" style={{ color: sc }}>{acc > 0 ? `${acc.toFixed(1)}%` : '—'}</div>
            <div style={{ marginTop: 6 }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${acc}%`, background: sc }} />
              </div>
            </div>
            <div className="stat-sub">{totalA.toLocaleString()} attempts · {done}/{total} topics</div>
          </div>
        );
      })}
    </div>
  );
}

function WeeklyChart({ sessions }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  const data = days.map(date => {
    const ds = sessions.filter(s => s.date === date);
    return {
      day: new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' }),
      Questions: ds.reduce((s, x) => s + (x.attempted || 0), 0),
      Minutes: ds.reduce((s, x) => s + (x.duration_min || 0), 0),
    };
  });
  return (
    <div className="card">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Last 7 Days</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
          <Bar dataKey="Questions" fill="#6366f1" radius={[4,4,0,0]} maxBarSize={32} />
          <Bar dataKey="Minutes" fill="#06b6d4" radius={[4,4,0,0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AccuracyTrend({ sessions }) {
  const dateMap = {};
  [...sessions].reverse().forEach(s => {
    if (!dateMap[s.date]) dateMap[s.date] = { attempted: 0, correct: 0 };
    dateMap[s.date].attempted += s.attempted || 0;
    dateMap[s.date].correct   += s.correct   || 0;
  });
  const data = Object.entries(dateMap).slice(-14).map(([date, { attempted, correct }]) => ({
    date: new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    Accuracy: attempted ? +((correct / attempted) * 100).toFixed(1) : 0,
  }));

  if (data.length < 2) return (
    <div className="card">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Accuracy Trend</h3>
      <div className="empty-state" style={{ padding: '20px 0' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Need at least 2 study days to show trend</p>
      </div>
    </div>
  );

  return (
    <div className="card">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>14-Day Accuracy Trend</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="Accuracy" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectionRadar({ topicStats }) {
  const data = ['QA', 'DILR', 'VARC'].map(sec => {
    const rel = topicStats.filter(ts => getTopicById(ts.topic_id)?.section === sec && ts.total_attempted > 0);
    const totalA = rel.reduce((s, t) => s + t.total_attempted, 0);
    const totalC = rel.reduce((s, t) => s + t.total_correct, 0);
    return { subject: sec, Accuracy: totalA ? +((totalC / totalA) * 100).toFixed(1) : 0 };
  });
  return (
    <div className="card">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Section Radar</h3>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
          <Radar name="Accuracy" dataKey="Accuracy" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopicTable({ topicStats, filterSection }) {
  const [sortBy, setSortBy] = useState('accuracy');
  const [sortDir, setSortDir] = useState('asc');

  const toggleSort = col => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const sortKey = { accuracy: 'accuracy_pct', attempted: 'total_attempted', time: 'avg_time_sec' }[sortBy];

  const rows = topicStats
    .map(ts => {
      const topic = getTopicById(ts.topic_id);
      if (!topic) return null;
      if (filterSection !== 'ALL' && topic.section !== filterSection) return null;
      return { ...ts, topic };
    })
    .filter(Boolean)
    .sort((a, b) => sortDir === 'asc' ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]);

  const SortIcon = ({ col }) => sortBy === col
    ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
    : <span style={{ opacity: 0.3 }}><ChevronDown size={11} /></span>;

  const th = (label, col) => (
    <th onClick={() => toggleSort(col)} style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>{label} <SortIcon col={col} /></span>
    </th>
  );

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>Topic Performance</h3>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {rows.filter(r => r.total_attempted > 0).length} / {rows.length} practised
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>Topic</th>
              <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>Section</th>
              {th('Accuracy', 'accuracy')}
              {th('Attempted', 'attempted')}
              {th('Avg Time/Q', 'time')}
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>Status</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>Last Practiced</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((ts, i) => {
              const sc = ts.total_attempted === 0 ? '#475569' : ts.accuracy_pct < 60 ? '#ef4444' : ts.accuracy_pct < 80 ? '#eab308' : '#22c55e';
              const lastDate = ts.last_practiced
                ? new Date(ts.last_practiced + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
              const daysSince = ts.last_practiced ? Math.floor((Date.now() - new Date(ts.last_practiced + 'T00:00:00')) / 86400000) : null;
              return (
                <tr key={ts.topic_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: i % 2 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                    {ts.topic.name}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ts.topic.category}</div>
                  </td>
                  <td style={{ padding: '10px 6px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                      background: ts.topic.section === 'QA' ? 'var(--accent-dim)' : ts.topic.section === 'DILR' ? 'var(--cyan-dim)' : 'var(--violet-dim)',
                      color: SECTION_COLOR[ts.topic.section] }}>
                      {ts.topic.section}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {ts.total_attempted > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                        <span style={{ fontWeight: 700, color: sc }}>{ts.accuracy_pct.toFixed(1)}%</span>
                        <div style={{ width: 55, height: 3, background: 'var(--surface-3)', borderRadius: 2 }}>
                          <div style={{ width: `${ts.accuracy_pct}%`, height: '100%', background: sc, borderRadius: 2 }} />
                        </div>
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {ts.total_attempted > 0
                      ? <span><span style={{ color: 'var(--green)', fontWeight: 600 }}>{ts.total_correct}</span><span style={{ color: 'var(--text-muted)' }}>/{ts.total_attempted}</span></span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-dim)' }}>
                    {ts.avg_time_sec > 0 ? `${ts.avg_time_sec}s` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                      background: STATUS_COLOR[ts.status] + '22', color: STATUS_COLOR[ts.status] }}>
                      {ts.status === 'unstarted' ? 'Not Started' : ts.status === 'green' ? 'Strong' : ts.status === 'yellow' ? 'Moderate' : 'Weak'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                    {lastDate}
                    {daysSince !== null && daysSince > 7 && (
                      <div style={{ color: 'var(--red)', fontSize: 10 }}>{daysSince}d ago ⚠</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [topicStats, setTopicStats] = useState([]);
  const [sessions, setSessions]     = useState([]);
  const [filter, setFilter]         = useState('ALL');
  const [loading, setLoading]       = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const [ts, ss] = await Promise.all([getTopicStats(user.id), getSessions(user.id, 200)]);
    setTopicStats(ts.data || []);
    setSessions(ss.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="loading-screen" style={{ background: 'transparent' }}>
      <div className="spinner" />
    </div>
  );

  const totalA = topicStats.reduce((s, t) => s + t.total_attempted, 0);
  const totalC = topicStats.reduce((s, t) => s + t.total_correct, 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Analytics</h1>
            <p>Topic-level performance, accuracy trends, and time analysis</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['ALL', 'QA', 'DILR', 'VARC'].map(s => (
              <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(s)}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      <SectionOverview topicStats={topicStats} />

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <WeeklyChart sessions={sessions} />
        <AccuracyTrend sessions={sessions} />
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <SectionRadar topicStats={topicStats} />
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Overall Stats</h3>
          {[
            { label: 'Total Questions Attempted', val: totalA.toLocaleString(), color: 'var(--accent)' },
            { label: 'Overall Accuracy', val: totalA ? `${((totalC/totalA)*100).toFixed(1)}%` : '—',
              color: totalA && totalC/totalA >= 0.8 ? 'var(--green)' : totalC/totalA >= 0.6 ? 'var(--yellow)' : 'var(--red)' },
            { label: 'Strong Topics (≥80%)', val: topicStats.filter(t => t.status === 'green').length, color: 'var(--green)' },
            { label: 'Weak Topics (<60%)', val: topicStats.filter(t => t.status === 'red').length, color: 'var(--red)' },
            { label: 'Topics Not Started', val: topicStats.filter(t => t.status === 'unstarted').length, color: 'var(--text-muted)' },
            { label: 'Sessions Logged', val: sessions.length, color: 'var(--violet)' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontWeight: 700, color, fontSize: 15 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      <TopicTable topicStats={topicStats} filterSection={filter} />
    </div>
  );
}
