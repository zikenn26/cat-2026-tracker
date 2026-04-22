-- ============================================================
-- CAT 2026 Study Tracker — Supabase Database Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Profiles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT,
  target_year         INT DEFAULT 2026,
  target_percentile   INT DEFAULT 99,
  daily_hours_goal    INT DEFAULT 6,
  section_priority    TEXT[] DEFAULT ARRAY['QA', 'DILR', 'VARC'],
  strengths           TEXT[] DEFAULT '{}',
  weaknesses          TEXT[] DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Topic Stats ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.topic_stats (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id            TEXT NOT NULL,
  total_attempted     INT DEFAULT 0,
  total_correct       INT DEFAULT 0,
  accuracy_pct        FLOAT DEFAULT 0,
  avg_time_sec        INT DEFAULT 0,
  last_practiced      DATE,
  status              TEXT DEFAULT 'unstarted',  -- unstarted | red | yellow | green
  revision_dates      DATE[] DEFAULT '{}',
  UNIQUE(user_id, topic_id)
);

-- ── 3. Sessions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  subject             TEXT NOT NULL CHECK (subject IN ('QA','DILR','VARC')),
  topic_id            TEXT NOT NULL,
  start_time          TIMESTAMPTZ,
  end_time            TIMESTAMPTZ,
  duration_min        INT DEFAULT 0,
  attempted           INT DEFAULT 0,
  correct             INT DEFAULT 0,
  incorrect           INT DEFAULT 0,
  skipped             INT DEFAULT 0,
  timer_mode          TEXT DEFAULT 'pomodoro',
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Streaks ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.streaks (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak      INT DEFAULT 0,
  longest_streak      INT DEFAULT 0,
  last_study_date     DATE,
  total_questions     INT DEFAULT 0,
  total_hours         FLOAT DEFAULT 0,
  badges_earned       TEXT[] DEFAULT '{}'
);

-- ── 5. Daily Plans ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_plans (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  subject             TEXT NOT NULL,
  topic_id            TEXT NOT NULL,
  time_goal_min       INT DEFAULT 60,
  question_goal       INT DEFAULT 30,
  completed           BOOLEAN DEFAULT FALSE,
  session_id          UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. Mock Tests ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mock_tests (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  mock_name           TEXT,
  total_score         INT DEFAULT 0,
  percentile          FLOAT,
  varc_score          INT DEFAULT 0,
  varc_attempted      INT DEFAULT 0,
  varc_correct        INT DEFAULT 0,
  dilr_score          INT DEFAULT 0,
  dilr_attempted      INT DEFAULT 0,
  dilr_correct        INT DEFAULT 0,
  qa_score            INT DEFAULT 0,
  qa_attempted        INT DEFAULT 0,
  qa_correct          INT DEFAULT 0,
  easy_missed         INT DEFAULT 0,
  time_wasted         TEXT,
  weak_topics         TEXT[] DEFAULT '{}',
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. Error Log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.error_log (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                DATE NOT NULL DEFAULT CURRENT_DATE,
  section             TEXT,
  topic_id            TEXT,
  question_text       TEXT,
  mistake_type        TEXT,  -- concept | calculation | time_pressure | silly
  correct_solution    TEXT,
  revisit             BOOLEAN DEFAULT TRUE,
  resolved            BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. Revision Queue ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.revision_queue (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id            TEXT NOT NULL,
  created_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  next_review         DATE NOT NULL,
  interval_days       INT DEFAULT 1,
  completed           BOOLEAN DEFAULT FALSE
);

-- ── 9. Notes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id            TEXT,
  title               TEXT,
  content             TEXT,
  type                TEXT DEFAULT 'note',  -- note | formula | flashcard
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY — users see only their own data
-- ============================================================

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_stats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_tests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes         ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can manage own profile"       ON public.profiles      FOR ALL USING (auth.uid() = id);

-- Topic Stats
CREATE POLICY "Users can manage own topic stats"   ON public.topic_stats   FOR ALL USING (auth.uid() = user_id);

-- Sessions
CREATE POLICY "Users can manage own sessions"      ON public.sessions      FOR ALL USING (auth.uid() = user_id);

-- Streaks
CREATE POLICY "Users can manage own streaks"       ON public.streaks       FOR ALL USING (auth.uid() = user_id);

-- Daily Plans
CREATE POLICY "Users can manage own plans"         ON public.daily_plans   FOR ALL USING (auth.uid() = user_id);

-- Mock Tests
CREATE POLICY "Users can manage own mocks"         ON public.mock_tests    FOR ALL USING (auth.uid() = user_id);

-- Error Log
CREATE POLICY "Users can manage own errors"        ON public.error_log     FOR ALL USING (auth.uid() = user_id);

-- Revision Queue
CREATE POLICY "Users can manage own revision"      ON public.revision_queue FOR ALL USING (auth.uid() = user_id);

-- Notes
CREATE POLICY "Users can manage own notes"         ON public.notes         FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- DONE! All tables created with RLS enabled.
-- ============================================================
