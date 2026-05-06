/*
  # Add custom session type and discipline

  ## Changes
  - Drops the check constraint on `session_type` in biomechanics_sessions to allow 'custom'
  - Drops the check constraint on `discipline` to allow 'custom' and other free-form values
  - Adds new unconstrained versions to support the free-form "Análisis Libre" module

  ## Notes
  - Custom analysis sessions have session_type = 'custom' and discipline = 'custom'
  - This enables the free-form angle analysis for any sport or movement
*/

ALTER TABLE biomechanics_sessions
  DROP CONSTRAINT IF EXISTS biomechanics_sessions_session_type_check;

ALTER TABLE biomechanics_sessions
  DROP CONSTRAINT IF EXISTS biomechanics_sessions_discipline_check;

ALTER TABLE biomechanics_sessions
  ADD CONSTRAINT biomechanics_sessions_session_type_check
  CHECK (session_type IN ('cycling', 'running', 'custom'));

ALTER TABLE biomechanics_sessions
  ADD CONSTRAINT biomechanics_sessions_discipline_check
  CHECK (discipline IN ('road', 'mtb', 'trail_run', 'track', 'road_running', 'triathlon', 'custom'));
