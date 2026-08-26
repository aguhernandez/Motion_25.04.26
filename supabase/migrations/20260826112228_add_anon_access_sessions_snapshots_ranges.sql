/*
# Allow anon-role access to sessions, snapshots, and reference ranges

## Why
This app authenticates users through its own external "hub" login system, not
Supabase's built-in authentication. As a result the browser always talks to the
database using the anonymous (anon) role. The `athletes`, `profiles`, and
`platform_settings` tables were already opened up for the anon role, but
`biomechanics_sessions`, `biomechanics_snapshots`, and `reference_ranges` still
only granted access to the `authenticated` role. That mismatch caused
"new row violates row-level security policy" errors when creating a session.

## Changes
This migration adds anon-role RLS policies that mirror the existing
authenticated-role policies:

1. `biomechanics_sessions` — anon can select/insert/update/delete.
2. `biomechanics_snapshots` — anon can select/insert/update/delete.
3. `reference_ranges` — anon can read all rows and can insert/update/delete
   only custom ranges (is_custom = true), matching the authenticated rules.

## Security notes
1. RLS remains enabled on all three tables.
2. These policies match the app's existing open-access model where access
   control is handled by the external hub login before the app loads.
*/

-- biomechanics_sessions
DROP POLICY IF EXISTS "Anon users can read sessions" ON biomechanics_sessions;
CREATE POLICY "Anon users can read sessions" ON biomechanics_sessions FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "Anon users can insert sessions" ON biomechanics_sessions;
CREATE POLICY "Anon users can insert sessions" ON biomechanics_sessions FOR INSERT
  TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon users can update sessions" ON biomechanics_sessions;
CREATE POLICY "Anon users can update sessions" ON biomechanics_sessions FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon users can delete sessions" ON biomechanics_sessions;
CREATE POLICY "Anon users can delete sessions" ON biomechanics_sessions FOR DELETE
  TO anon USING (true);

-- biomechanics_snapshots
DROP POLICY IF EXISTS "Anon users can read snapshots" ON biomechanics_snapshots;
CREATE POLICY "Anon users can read snapshots" ON biomechanics_snapshots FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "Anon users can insert snapshots" ON biomechanics_snapshots;
CREATE POLICY "Anon users can insert snapshots" ON biomechanics_snapshots FOR INSERT
  TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon users can update snapshots" ON biomechanics_snapshots;
CREATE POLICY "Anon users can update snapshots" ON biomechanics_snapshots FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon users can delete snapshots" ON biomechanics_snapshots;
CREATE POLICY "Anon users can delete snapshots" ON biomechanics_snapshots FOR DELETE
  TO anon USING (true);

-- reference_ranges
DROP POLICY IF EXISTS "Anon users can read reference_ranges" ON reference_ranges;
CREATE POLICY "Anon users can read reference_ranges" ON reference_ranges FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "Anon users can insert custom reference_ranges" ON reference_ranges;
CREATE POLICY "Anon users can insert custom reference_ranges" ON reference_ranges FOR INSERT
  TO anon WITH CHECK (is_custom = true);

DROP POLICY IF EXISTS "Anon users can update custom reference_ranges" ON reference_ranges;
CREATE POLICY "Anon users can update custom reference_ranges" ON reference_ranges FOR UPDATE
  TO anon USING (is_custom = true) WITH CHECK (is_custom = true);

DROP POLICY IF EXISTS "Anon users can delete custom reference_ranges" ON reference_ranges;
CREATE POLICY "Anon users can delete custom reference_ranges" ON reference_ranges FOR DELETE
  TO anon USING (is_custom = true);
