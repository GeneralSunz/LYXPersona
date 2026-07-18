-- Create folders table
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read folders"
  ON folders FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert folders"
  ON folders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update folders"
  ON folders FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete folders"
  ON folders FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add folder_id to files table
ALTER TABLE files ADD COLUMN folder_id UUID REFERENCES folders(id);

-- Create index for faster queries
CREATE INDEX idx_files_folder_id ON files(folder_id);
