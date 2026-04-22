import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useTimer — Pomodoro & Deep Work timer hook
 * modes: 'pomodoro' | 'deep_work'
 */
export function useTimer(mode = 'pomodoro', customMinutes = 50) {
  const POMODORO_WORK  = 25 * 60;
  const POMODORO_BREAK = 5 * 60;
  const DEEP_WORK_SECS = customMinutes * 60;

  const [seconds, setSeconds]         = useState(mode === 'pomodoro' ? POMODORO_WORK : customMinutes * 60);
  const [running, setRunning]         = useState(false);
  const [phase, setPhase]             = useState('work'); // 'work' | 'break'
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [elapsed, setElapsed]         = useState(0);

  // Use refs so tick never becomes stale — avoids interval reset on every phase change
  const runningRef = useRef(false);
  const phaseRef   = useRef('work');
  const modeRef    = useRef(mode);
  const intervalRef = useRef(null);

  // Keep refs in sync
  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { phaseRef.current = phase; },   [phase]);
  useEffect(() => { modeRef.current = mode; },     [mode]);

  const tick = useCallback(() => {
    setSeconds(s => {
      if (s <= 1) {
        if (modeRef.current === 'pomodoro') {
          if (phaseRef.current === 'work') {
            setPomodoroCount(c => c + 1);
            setPhase('break');
            phaseRef.current = 'break';
            return POMODORO_BREAK;
          } else {
            setPhase('work');
            phaseRef.current = 'work';
            return POMODORO_WORK;
          }
        } else {
          // deep work done — stop
          setRunning(false);
          return 0;
        }
      }
      return s - 1;
    });
    setElapsed(e => e + 1);
  }, []); // stable — no deps, reads from refs

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, tick]);

  const start  = () => setRunning(true);
  const pause  = () => setRunning(false);
  const toggle = () => setRunning(r => !r);

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setPhase('work');
    phaseRef.current = 'work';
    setPomodoroCount(0);
    setElapsed(0);
    setSeconds(mode === 'pomodoro' ? POMODORO_WORK : customMinutes * 60);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const totalSecs = phase === 'break' ? POMODORO_BREAK : (mode === 'pomodoro' ? POMODORO_WORK : customMinutes * 60);
  const progress  = totalSecs > 0 ? Math.max(0, Math.min(1, 1 - seconds / totalSecs)) : 0;

  return {
    seconds, running, phase, pomodoroCount,
    elapsed,
    elapsedMinutes: Math.floor(elapsed / 60),
    displayTime: formatTime(seconds),
    progress,
    start, pause, toggle, reset,
    isBreak: mode === 'pomodoro' && phase === 'break',
  };
}
