-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: allow public reads (download page is public)
DROP POLICY IF EXISTS "Public can read files" ON storage.objects;
CREATE POLICY "Public can read files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'files');

-- Storage RLS: only authenticated users can upload/delete
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'files');

DROP POLICY IF EXISTS "Authenticated users can delete files" ON storage.objects;
CREATE POLICY "Authenticated users can delete files"
  ON storage.objects FOR DELETE
  USING (auth.role() = 'authenticated' AND bucket_id = 'files');

-- Fix files table: allow public read access (download page)
DROP POLICY IF EXISTS "Authenticated users can read files" ON files;
CREATE POLICY "Public can read files"
  ON files FOR SELECT
  USING (true);

-- Fix folders table: allow public read access (download page)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'folders') THEN
    DROP POLICY IF EXISTS "Authenticated users can read folders" ON folders;
    CREATE POLICY "Public can read folders"
      ON folders FOR SELECT
      USING (true);
  END IF;
END $$;
