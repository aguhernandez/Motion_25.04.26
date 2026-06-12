-- Allow anon role to access athletes table (auth is handled via Hub token, not Supabase Auth)
CREATE POLICY "Anon users can read athletes"
  ON athletes FOR SELECT TO anon USING (true);

CREATE POLICY "Anon users can insert athletes"
  ON athletes FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon users can update athletes"
  ON athletes FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon users can delete athletes"
  ON athletes FOR DELETE TO anon USING (true);
