-- ============================================================================
-- RLS: 公开可读，仅登录用户可写
-- 在 Supabase Dashboard → SQL Editor 中运行
-- ============================================================================

-- ── files 表 ──
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- 所有人可读取
DROP POLICY IF EXISTS "Public can read files" ON files;
CREATE POLICY "Public can read files"
  ON files FOR SELECT
  USING (true);

-- 仅登录用户可写入
DROP POLICY IF EXISTS "Authenticated users can insert files" ON files;
CREATE POLICY "Authenticated users can insert files"
  ON files FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update files" ON files;
CREATE POLICY "Authenticated users can update files"
  ON files FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete files" ON files;
CREATE POLICY "Authenticated users can delete files"
  ON files FOR DELETE
  USING (auth.role() = 'authenticated');


-- ── folders 表 ──
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- 所有人可读取
DROP POLICY IF EXISTS "Public can read folders" ON folders;
CREATE POLICY "Public can read folders"
  ON folders FOR SELECT
  USING (true);

-- 仅登录用户可写入
DROP POLICY IF EXISTS "Authenticated users can insert folders" ON folders;
CREATE POLICY "Authenticated users can insert folders"
  ON folders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update folders" ON folders;
CREATE POLICY "Authenticated users can update folders"
  ON folders FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete folders" ON folders;
CREATE POLICY "Authenticated users can delete folders"
  ON folders FOR DELETE
  USING (auth.role() = 'authenticated');


-- ── Storage 存储桶 ──
-- 确保 bucket 存在且公开
INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- 所有人可下载
DROP POLICY IF EXISTS "Public can read files" ON storage.objects;
CREATE POLICY "Public can read files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'files');

-- 仅登录用户可上传
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'files');

-- 仅登录用户可删除
DROP POLICY IF EXISTS "Authenticated users can delete files" ON storage.objects;
CREATE POLICY "Authenticated users can delete files"
  ON storage.objects FOR DELETE
  USING (auth.role() = 'authenticated' AND bucket_id = 'files');
