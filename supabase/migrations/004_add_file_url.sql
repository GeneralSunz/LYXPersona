-- Add file_url column to store the full public URL of each file
ALTER TABLE files ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Backfill existing files with R2 public URLs
UPDATE files
SET file_url = 'https://pub-ac5abe7a212f453abd134cea6c25d943.r2.dev/' || storage_path
WHERE file_url IS NULL;
