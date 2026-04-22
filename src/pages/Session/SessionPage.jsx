import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTimer } from '../../hooks/useTimer';
import { useToast } from '../../context/ToastContext';
import {
  insertSession, getTopicStats, updateTopicStat, getStreak, upsertStreak,
} from '../../services/db';
import { CAT_SYLLABUS, getTopicById } from '../../data/syllabus';
import { Play, Pause, RotateCcw, Coffee, Zap, CheckCircle, XCircle, MinusCircle } from 'lucide-react';

/* ── Circular Timer Ring ── */
function TimerRing({ progress, size = 220, color = 'var(--accent)', isBreak }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="var(--surface-3)" strokeWidth={8} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={isBreak ? 'var(--green)' : color} strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - progress)}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}

/* ── Log Results Modal ── */
function LogResultsModal({ session, onConfirm, onCancel }) {
  const [attempted, setAttempted] = useState('');
  const [correct, setCorrect]     = useState('');
  const [incorrect, setIncorrect] = useState('');
  const [skipped, setSkipped]     = useState('');
  const [notes, setNotes]         = useState('');

  const topic = getTopicById(session.topic_id);

  const handleAttempted = (v) => {
    setAttempted(v);
    // Auto-calc skipped if correct + incorrect filled
    if (correct && incorrect) setSkipped(String(Math.max(0, +v - +correct - +incorrect)));
  };

  const save = () => {
    const a = +attempted || 0, c = +correct || 0,
          w = +incorrect || 0, sk = +skipped || 0;
    onConfirm({ ...session, attempted: a, correct: c, incorrect: w, skipped: sk, notes });
  };

  return (
    <div className="modal-overlay">
      <div className="modal fade-in">
        <div className="modal-header">
          <h3>Log Session Results</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {topic?.name} · {session.subject}
          </span>
        </div>

        <div style={{ 
          padding: '12px 16px', borderRadius: 'var(--radius)',
          background: 'var(--accent-dim)', marginBottom: 16,
          fontSize: 13, color: 'var(--accent)', display: 'flex', gap: 16
        }}>
          <span>⏱ {session.elapsedDisplay}</span>
          {session.pomodoroCount > 0 && <span>🍅 {session.pomodoroCount} pomodoros</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Questions Attempted</label>
            <input type="number" className="form-input" min={0} value={attempted}
              onChange={e => handleAttempted(e.target.value)} placeholder="e.g. 20" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--green)' }}>
                <CheckCircle size={11} style={{ display: 'inline', marginRight: 4 }} />Correct
              </label>
              <input type="number" className="form-input" min={0} value={correct}
                onChange={e => setCorrect(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--red)' }}>
                <XCircle size={11} style={{ display: 'inline', marginRight: 4 }} />Incorrect
              </label>
              <input type="number" className="form-input" min={0} value={incorrect}
                onChange={e => setIncorrect(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--text-muted)' }}>
                <MinusCircle size={11} style={{ display: 'inline', marginRight: 4 }} />Skipped
              </label>
              <input type="number" className="form-input" min={0} value={skipped}
                onChange={e => setSkipped(e.target.value)} />
            </div>
          </div>

          {attempted && correct && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--radius)',
              background: +correct / +attempted >= 0.8 ? 'var(--green-dim)' :
                          +correct / +attempted >= 0.6 ? 'var(--yellow-dim)' : 'var(--red-dim)',
              fontSize: 13, fontWeight: 600,
              color: +correct / +attempted >= 0.8 ? 'var(--green)' :
                     +correct / +attempted >= 0.6 ? 'var(--yellow)' : 'var(--red)',
            }}>
              Accuracy: {((+correct / +attempted) * 100).toFixed(1)}%
              {+correct / +attempted >= 0.8 ? ' 🎉 Excellent!' :
               +correct / +attempted >= 0.6 ? ' 👍 Good' : ' ⚠️ Needs work'}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Session Notes (optional)</label>
            <textarea className="form-textarea" placeholder="Key takeaways, doubts, observations..."
              value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onCancel} style={{ flex: 1, justifyContent: 'center' }}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={save} style={{ flex: 2, justifyContent: 'center' }}
              disabled={!attempted}>
              Save Session ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Session Page ── */
export default function SessionPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const location = useLocation();
  const locationState = location.state || {};

  // Setup state
  const [phase, setPhase]       = useState('setup'); // 'setup' | 'running' | 'logging'
  const [subject, setSubject]   = useState(locationState.subject || 'QA');
  const [topicId, setTopicId]   = useState(locationState.topicId || '');
  const [timerMode, setTimerMode] = useState('pomodoro');
  const [deepMins, setDeepMins] = useState(50);
  const [startTime, setStartTime] = useState(null);

  // Timer
  const timer = useTimer(timerMode, deepMins);

  // Logging state
  const [logData, setLogData] = useState(null);
  const [saving, setSaving]   = useState(false);

  const topic = getTopicById(topicId);

  const startSession = () => {
    // Topic is now optional
    setStartTime(new Date());
    timer.reset();
    timer.start();
    setPhase('running');
  };

  const endSession = () => {
    timer.pause();
    const elapsedMins = Math.ceil(timer.elapsed / 60);
    const elapsedDisplay = timer.elapsed >= 3600
      ? `${Math.floor(timer.elapsed / 3600)}h ${Math.floor((timer.elapsed % 3600) / 60)}m`
      : `${elapsedMins}m`;
    setLogData({
      topic_id: topicId,
      subject,
      elapsedDisplay,
      elapsedMins,
      pomodoroCount: timer.pomodoroCount,
    });
    setPhase('logging');
  };

  const cancelSession = () => {
    timer.reset();
    setPhase('setup');
  };

  const saveSession = async (results) => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const endT = new Date();
      const sessionRow = {
        user_id: user.id,
        date: today,
        subject: results.subject,
        topic_id: results.topic_id || null, // Allow null
        start_time: startTime.toISOString(),
        end_time: endT.toISOString(),
        duration_min: results.elapsedMins,
        attempted: results.attempted,
        correct: results.correct,
        incorrect: results.incorrect,
        skipped: results.skipped,
        notes: results.notes,
        timer_mode: timerMode,
      };
      await insertSession(sessionRow);

      // Update topic_stats ONLY if we have a topic
      if (topicId) {
        const { data: stats } = await getTopicStats(user.id);
        const existing = stats.find(s => s.topic_id === topicId);
        if (existing) {
          const newAttempted = existing.total_attempted + results.attempted;
          const newCorrect   = existing.total_correct   + results.correct;
          const accuracy = newAttempted ? (newCorrect / newAttempted) * 100 : 0;
          const avgTime = results.attempted
            ? Math.round((results.elapsedMins * 60) / results.attempted)
            : existing.avg_time_sec;
          const status = accuracy === 0 ? 'unstarted' : accuracy < 60 ? 'red' : accuracy < 80 ? 'yellow' : 'green';
          await updateTopicStat(user.id, topicId, {
            total_attempted: newAttempted,
            total_correct: newCorrect,
            accuracy_pct: accuracy,
            avg_time_sec: avgTime,
            last_practiced: today,
            status,
          });
        }
      }

      // Update streak
      const { data: streak } = await getStreak(user.id);
      const todayStr = today;
      const lastDate = streak?.last_study_date;
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const isConsecutive = lastDate === yesterdayStr;
      const alreadyToday  = lastDate === todayStr;
      await upsertStreak({
        user_id: user.id,
        current_streak: alreadyToday ? (streak?.current_streak || 1) :
                        isConsecutive ? (streak?.current_streak || 0) + 1 : 1,
        longest_streak: Math.max(
          streak?.longest_streak || 0,
          alreadyToday ? (streak?.current_streak || 1) :
          isConsecutive ? (streak?.current_streak || 0) + 1 : 1
        ),
        last_study_date: todayStr,
        total_questions: (streak?.total_questions || 0) + results.attempted,
        total_hours: ((streak?.total_hours || 0) + results.elapsedMins / 60),
        badges_earned: streak?.badges_earned || [],
      });

      show('Session saved! Great work 💪', 'success');
      timer.reset();
      setPhase('setup');
      setTopicId(locationState.topicId || '');
    } catch (err) {
      show('Failed to save session: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const sectionColor = { QA: 'var(--accent)', DILR: 'var(--cyan)', VARC: 'var(--violet)' };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>Study Focus</h1>
        <p style={{ color: 'var(--text-muted)' }}>Set your intention and let's begin</p>
      </div>

      {/* ── SETUP PHASE ── */}
      {phase === 'setup' && (
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <div className="card" style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>Session Settings</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Section */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>Pick Your Focus Area</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['QA', 'DILR', 'VARC'].map(sec => (
                    <button key={sec} type="button"
                      className={`btn ${subject === sec ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ 
                        flex: 1, justifyContent: 'center', height: 44,
                        background: subject === sec ? sectionColor[sec] : 'var(--surface-2)',
                        color: subject === sec ? '#fff' : 'var(--text-muted)',
                        border: 'none', borderRadius: 10
                      }}
                      onClick={() => { setSubject(sec); setTopicId(''); }}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>Specific Topic (Optional)</label>
                <select className="form-select" value={topicId} onChange={e => setTopicId(e.target.value)} style={{ background: 'var(--surface-2)', height: 48, borderRadius: 10 }}>
                  <option value="">General Prep / Focus Session</option>
                  {Object.entries(CAT_SYLLABUS[subject]?.categories || {}).map(([cat, ts]) => (
                    <optgroup key={cat} label={cat}>
                      {ts.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Timer Mode */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>Choose Your Pace</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setTimerMode('pomodoro')}
                    className={`btn ${timerMode === 'pomodoro' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ 
                      justifyContent: 'center', flexDirection: 'column', gap: 4, height: 70, borderRadius: 12,
                      background: timerMode === 'pomodoro' ? 'var(--sky)' : 'var(--surface-2)',
                      color: timerMode === 'pomodoro' ? '#fff' : 'var(--text-muted)',
                      border: 'none'
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>Pomodoro</span>
                    <span style={{ fontSize: 10, opacity: 0.9 }}>25m + 5m rest</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimerMode('deep_work')}
                    className={`btn ${timerMode === 'deep_work' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ 
                      justifyContent: 'center', flexDirection: 'column', gap: 4, height: 70, borderRadius: 12,
                      background: timerMode === 'deep_work' ? 'var(--accent)' : 'var(--surface-2)',
                      color: timerMode === 'deep_work' ? '#fff' : 'var(--text-muted)',
                      border: 'none'
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>Deep Work</span>
                    <span style={{ fontSize: 10, opacity: 0.9 }}>Custom length</span>
                  </button>
                </div>
              </div>

              {timerMode === 'deep_work' && (
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 12 }}>Focus Duration (minutes)</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[30, 45, 60, 90].map(m => (
                      <button key={m} type="button"
                        className={`btn btn-sm ${deepMins === m ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ height: 32, padding: '0 16px', background: deepMins === m ? 'var(--accent)' : 'var(--surface-2)', border: 'none', color: deepMins === m ? '#fff' : 'var(--text-muted)' }}
                        onClick={() => setDeepMins(m)}
                      >{m}m</button>
                    ))}
                    <input type="number" className="form-input" value={deepMins} min={10} max={240}
                      onChange={e => setDeepMins(+e.target.value)}
                      style={{ width: 60, height: 32, padding: 0, textAlign: 'center', background: 'var(--surface-2)', border: 'none' }} />
                  </div>
                </div>
              )}

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', height: 52, borderRadius: 14, background: sectionColor[subject], border: 'none', boxShadow: 'none', marginTop: 10 }}
                onClick={startSession}
              >
                Start Focusing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RUNNING PHASE ── */}
      {phase === 'running' && (
        <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
          <div className="card" style={{ padding: 48, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {/* Topic info */}
            <div style={{ marginBottom: 32 }}>
              <span style={{ 
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, 
                color: sectionColor[subject], background: sectionColor[subject] + '15', 
                padding: '4px 12px', borderRadius: 20, marginBottom: 12, display: 'inline-block'
              }}>
                {subject} • {timerMode.replace('_', ' ')}
              </span>
              <h2 style={{ fontSize: 22, fontWeight: 700 }}>{topic?.name || 'General Focus'}</h2>
              <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>Time to quiet the mind</p>
            </div>

            {/* Ring + Timer */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 32 }}>
              <TimerRing progress={timer.progress} isBreak={timer.isBreak}
                color={sectionColor[subject]} size={240} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: 60, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>{timer.displayTime}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
                  {timer.isBreak ? 'Resting' : 'Focus'}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 20 }}>
              <button className="btn btn-ghost" onClick={cancelSession} style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-2)', padding: 0, justifyContent: 'center' }}>
                <RotateCcw size={18} />
              </button>
              <button
                className="btn btn-primary"
                style={{ minWidth: 140, height: 48, borderRadius: 14, justifyContent: 'center', background: sectionColor[subject], border: 'none' }}
                onClick={timer.toggle}
              >
                {timer.running ? <><Pause size={20} /> Pause</> : <><Play size={20} /> Resume</>}
              </button>
              <button className="btn btn-ghost" onClick={endSession}
                style={{ height: 48, borderRadius: 14, color: 'var(--green)', padding: '0 20px', fontWeight: 700, background: 'var(--green-dim)' }}>
                Finish
              </button>
            </div>

            <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>
              Total elapsed: {timer.elapsedMinutes}m
            </div>
          </div>
        </div>
      )}

      {/* ── LOGGING PHASE ── */}
      {phase === 'logging' && logData && (
        <LogResultsModal
          session={logData}
          onConfirm={saveSession}
          onCancel={() => setPhase('running')}
        />
      )}
    </div>
  );
}
