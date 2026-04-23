-- Enable Realtime on all social tables
-- Run this in Supabase SQL Editor

-- Step 1: Add group_messages to realtime publication
-- (supabase_realtime publication may already exist)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add group_messages: %', SQLERRM;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add friendships: %', SQLERRM;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add group_members: %', SQLERRM;
  END;
END $$;

-- Step 2: Verify which tables are in the realtime publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
