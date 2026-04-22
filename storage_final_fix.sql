-- ── FINAL STORAGE & DATABASE SETUP ────────────────────────────────────
-- This script fixes the "Bucket Not Found" and "Table Not Found" (404) issues.

/* 
  STEP 1: DATABASE TABLE
  Create the study_materials table to store file metadata and links.
*/

CREATE TABLE IF NOT EXISTS public.study_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'url')),
    file_path TEXT, -- Null if type is 'url'
    url TEXT,       -- Null if type is 'pdf'
    topic_id TEXT,
    is_shared BOOLEAN DEFAULT false,
    original_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on the table
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can view shared materials
CREATE POLICY "View Shared Materials" 
ON public.study_materials FOR SELECT 
USING (is_shared = true OR auth.uid() = user_id);

-- 2. Users can insert their own materials
CREATE POLICY "Insert Own Materials" 
ON public.study_materials FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own materials
CREATE POLICY "Update Own Materials" 
ON public.study_materials FOR UPDATE 
USING (auth.uid() = user_id);

-- 4. Users can delete their own materials
CREATE POLICY "Delete Own Materials" 
ON public.study_materials FOR DELETE 
USING (auth.uid() = user_id);


/* 
  STEP 2: STORAGE BUCKET POLICIES
  IMPORTANT: You must still ensure a bucket named 'study-materials' exists 
  in the Supabase Dashboard -> Storage.
*/

-- Allow Public access to read files in the bucket
CREATE POLICY "Public File Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'study-materials' );

-- Allow Authenticated users to upload files
CREATE POLICY "Authenticated Uploads"
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'study-materials' 
  AND auth.role() = 'authenticated'
);

-- Allow Owners to delete their own files
CREATE POLICY "Owner File Deletion"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'study-materials'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow Owners to update their own files
CREATE POLICY "Owner File Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'study-materials'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
