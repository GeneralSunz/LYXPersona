-- Create files table for FileVault
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  size BIGINT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- RLS policies: only authenticated users can access
CREATE POLICY "Authenticated users can read files"
  ON files FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert files"
  ON files FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update files"
  ON files FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete files"
  ON files FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create storage bucket (run in Supabase Dashboard SQL editor)
-- This is a workaround since storage buckets cannot be created via SQL directly:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', true);
-- Then set up RLS for storage:
--   CREATE POLICY "Authenticated users can upload files"
--     ON storage.objects FOR INSERT
--     WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'files');
--   CREATE POLICY "Authenticated users can read files"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'files');
--   CREATE POLICY "Authenticated users can delete files"
--     ON storage.objects FOR DELETE
--     USING (auth.role() = 'authenticated' AND bucket_id = 'files');
