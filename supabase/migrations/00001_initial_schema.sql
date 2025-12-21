-- Demo table
CREATE TABLE demo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE demo ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Allow anyone to read for POC purposes)
CREATE POLICY "Allow public read access" ON demo FOR SELECT USING (true);

-- Insert dummy records
INSERT INTO demo (name) VALUES ('First Demo Record'), ('Second Demo Record');
