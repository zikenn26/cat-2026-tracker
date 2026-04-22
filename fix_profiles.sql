-- ⚡ QUICK FIX: Run this in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS target_year INT DEFAULT 2026,
  ADD COLUMN IF NOT EXISTS target_percentile INT DEFAULT 99,
  ADD COLUMN IF NOT EXISTS daily_hours_goal INT DEFAULT 6,
  ADD COLUMN IF NOT EXISTS section_priority TEXT[] DEFAULT ARRAY['QA', 'DILR', 'VARC'],
  ADD COLUMN IF NOT EXISTS strengths TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS weaknesses TEXT[] DEFAULT '{}';

-- Also add created_at if missing
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Verify columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
