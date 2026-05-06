/*
  # Fix RLS Policies - Replace Open Access with Profile-Based Access

  ## Summary
  The original RLS policies allowed unauthenticated users (anon) full read/write/delete access to
  all data. This migration replaces them with policies that allow access only to authenticated users,
  keeping the app functional while removing anonymous access.

  Since this app uses a hub-based satellite authentication (external JWT), all legitimate users
  arrive as `authenticated` role. We restrict anon access entirely.

  ## Changes
  - Drop all existing "Public can ..." policies on athletes, biomechanics_sessions,
    biomechanics_snapshots, and reference_ranges
  - Create new policies allowing only authenticated users full access
  - reference_ranges: authenticated users can read all, insert/update/delete only custom ones

  ## Security
  - Anonymous users can no longer read or modify any data
  - Authenticated users retain full access to all records (appropriate for a multi-trainer app
    where trainers manage multiple athletes)
  - reference_ranges: read open to authenticated; write restricted to custom entries
*/

-- =====================
-- ATHLETES
-- =====================
DROP POLICY IF EXISTS "Public can read athletes" ON athletes;
DROP POLICY IF EXISTS "Public can insert athletes" ON athletes;
DROP POLICY IF EXISTS "Public can update athletes" ON athletes;
DROP POLICY IF EXISTS "Public can delete athletes" ON athletes;

CREATE POLICY "Authenticated users can read athletes"
  ON athletes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert athletes"
  ON athletes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update athletes"
  ON athletes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete athletes"
  ON athletes FOR DELETE
  TO authenticated
  USING (true);

-- =====================
-- BIOMECHANICS_SESSIONS
-- =====================
DROP POLICY IF EXISTS "Public can read sessions" ON biomechanics_sessions;
DROP POLICY IF EXISTS "Public can insert sessions" ON biomechanics_sessions;
DROP POLICY IF EXISTS "Public can update sessions" ON biomechanics_sessions;
DROP POLICY IF EXISTS "Public can delete sessions" ON biomechanics_sessions;

CREATE POLICY "Authenticated users can read sessions"
  ON biomechanics_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sessions"
  ON biomechanics_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sessions"
  ON biomechanics_sessions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sessions"
  ON biomechanics_sessions FOR DELETE
  TO authenticated
  USING (true);

-- =====================
-- BIOMECHANICS_SNAPSHOTS
-- =====================
DROP POLICY IF EXISTS "Public can read snapshots" ON biomechanics_snapshots;
DROP POLICY IF EXISTS "Public can insert snapshots" ON biomechanics_snapshots;
DROP POLICY IF EXISTS "Public can update snapshots" ON biomechanics_snapshots;
DROP POLICY IF EXISTS "Public can delete snapshots" ON biomechanics_snapshots;

CREATE POLICY "Authenticated users can read snapshots"
  ON biomechanics_snapshots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert snapshots"
  ON biomechanics_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update snapshots"
  ON biomechanics_snapshots FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete snapshots"
  ON biomechanics_snapshots FOR DELETE
  TO authenticated
  USING (true);

-- =====================
-- REFERENCE_RANGES
-- =====================
DROP POLICY IF EXISTS "Public can read reference_ranges" ON reference_ranges;
DROP POLICY IF EXISTS "Public can insert reference_ranges" ON reference_ranges;
DROP POLICY IF EXISTS "Public can update reference_ranges" ON reference_ranges;
DROP POLICY IF EXISTS "Public can delete reference_ranges" ON reference_ranges;

CREATE POLICY "Authenticated users can read reference_ranges"
  ON reference_ranges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert custom reference_ranges"
  ON reference_ranges FOR INSERT
  TO authenticated
  WITH CHECK (is_custom = true);

CREATE POLICY "Authenticated users can update custom reference_ranges"
  ON reference_ranges FOR UPDATE
  TO authenticated
  USING (is_custom = true)
  WITH CHECK (is_custom = true);

CREATE POLICY "Authenticated users can delete custom reference_ranges"
  ON reference_ranges FOR DELETE
  TO authenticated
  USING (is_custom = true);
