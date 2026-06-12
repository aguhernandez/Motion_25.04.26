-- The app uses Hub-based auth (external JWT), not Supabase Auth.
-- The Supabase client connects as 'anon' role.
-- We need to allow anon access like all other tables in this project.

DROP POLICY IF EXISTS "authenticated_select_settings" ON platform_settings;
DROP POLICY IF EXISTS "authenticated_insert_settings" ON platform_settings;
DROP POLICY IF EXISTS "authenticated_update_settings" ON platform_settings;
DROP POLICY IF EXISTS "authenticated_delete_settings" ON platform_settings;

CREATE POLICY "anon_select_settings" ON platform_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "anon_insert_settings" ON platform_settings
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "anon_update_settings" ON platform_settings
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_settings" ON platform_settings
  FOR DELETE TO anon, authenticated USING (true);
