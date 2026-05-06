/*
  # Biomechanics Satellite Module - Database Schema

  ## Overview
  Creates all tables for the Biomechanics satellite of the Asciende ecosystem.
  This module handles biomechanical analysis for cycling (bike fitting) and running (gait analysis).

  ## New Tables

  ### 1. `athletes`
  - Athlete profiles with anthropometric data imported from Lab
  - `id` (uuid, primary key)
  - `name`, `email`, `date_of_birth`
  - Anthropometric fields: `height_cm`, `weight_kg`, `leg_length_cm`, `arm_length_cm`,
    `shoulder_width_cm`, `torso_length_cm`, `inseam_cm`
  - `lab_athlete_id` (text) — reference to Lab module athlete
  - `notes` (text)

  ### 2. `biomechanics_sessions`
  - Analysis sessions per athlete
  - `id`, `athlete_id` (FK to athletes)
  - `session_type` — 'cycling' | 'running'
  - `discipline` — e.g., 'road', 'mtb', 'trail_run', 'track'
  - `title`, `notes`, `created_at`
  - `lab_session_id` (text) — optional link to Lab session

  ### 3. `biomechanics_snapshots`
  - Individual captured frames within a session
  - `id`, `session_id` (FK)
  - `image_url` (text) — stored image URL or base64 hint
  - `image_data` (text) — base64 encoded image for storage
  - `key_points` (jsonb) — array of {id, label, x, y} normalized coords
  - `angles` (jsonb) — computed angle data {name, value_deg, reference_min, reference_max, status}
  - `bike_fitting_data` (jsonb) — saddle height, setback, reach measurements (cycling)
  - `gait_data` (jsonb) — cadence, stride length, contact time (running)
  - `notes` (text)
  - `created_at`

  ### 4. `reference_ranges`
  - Configurable angle reference ranges
  - `id`, `discipline` ('road', 'mtb', 'running', 'trail_run')
  - `angle_name` (text)
  - `min_deg`, `optimal_min_deg`, `optimal_max_deg`, `max_deg`
  - `description` (text)
  - `is_custom` (boolean) — true if added by trainer
  - `created_by` (text) — trainer identifier
  - `created_at`

  ## Security
  - RLS enabled on all tables
  - Public read/write policies for MVP (no auth requirement for this satellite)
    but scoped to prevent cross-contamination
*/

CREATE TABLE IF NOT EXISTS athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text DEFAULT '',
  date_of_birth date,
  height_cm numeric(5,1),
  weight_kg numeric(5,2),
  leg_length_cm numeric(5,1),
  arm_length_cm numeric(5,1),
  shoulder_width_cm numeric(5,1),
  torso_length_cm numeric(5,1),
  inseam_cm numeric(5,1),
  lab_athlete_id text DEFAULT '',
  notes text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read athletes"
  ON athletes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert athletes"
  ON athletes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update athletes"
  ON athletes FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete athletes"
  ON athletes FOR DELETE
  TO anon, authenticated
  USING (true);

-- Sessions
CREATE TABLE IF NOT EXISTS biomechanics_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES athletes(id) ON DELETE SET NULL,
  session_type text NOT NULL DEFAULT 'cycling' CHECK (session_type IN ('cycling', 'running')),
  discipline text NOT NULL DEFAULT 'road' CHECK (discipline IN ('road', 'mtb', 'trail_run', 'track', 'road_running', 'triathlon')),
  title text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  lab_session_id text DEFAULT '',
  snapshot_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE biomechanics_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read sessions"
  ON biomechanics_sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert sessions"
  ON biomechanics_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update sessions"
  ON biomechanics_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete sessions"
  ON biomechanics_sessions FOR DELETE
  TO anon, authenticated
  USING (true);

-- Snapshots
CREATE TABLE IF NOT EXISTS biomechanics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES biomechanics_sessions(id) ON DELETE CASCADE,
  image_data text DEFAULT '',
  key_points jsonb DEFAULT '[]'::jsonb,
  angles jsonb DEFAULT '[]'::jsonb,
  bike_fitting_data jsonb DEFAULT '{}'::jsonb,
  gait_data jsonb DEFAULT '{}'::jsonb,
  phase_label text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE biomechanics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read snapshots"
  ON biomechanics_snapshots FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert snapshots"
  ON biomechanics_snapshots FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update snapshots"
  ON biomechanics_snapshots FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete snapshots"
  ON biomechanics_snapshots FOR DELETE
  TO anon, authenticated
  USING (true);

-- Reference ranges
CREATE TABLE IF NOT EXISTS reference_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline text NOT NULL DEFAULT 'road',
  angle_name text NOT NULL DEFAULT '',
  min_deg numeric(6,1) NOT NULL DEFAULT 0,
  optimal_min_deg numeric(6,1) NOT NULL DEFAULT 0,
  optimal_max_deg numeric(6,1) NOT NULL DEFAULT 0,
  max_deg numeric(6,1) NOT NULL DEFAULT 0,
  description text DEFAULT '',
  is_custom boolean DEFAULT false,
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reference_ranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read reference_ranges"
  ON reference_ranges FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert reference_ranges"
  ON reference_ranges FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update reference_ranges"
  ON reference_ranges FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete reference_ranges"
  ON reference_ranges FOR DELETE
  TO anon, authenticated
  USING (true);

-- Seed default reference ranges for cycling (road)
INSERT INTO reference_ranges (discipline, angle_name, min_deg, optimal_min_deg, optimal_max_deg, max_deg, description) VALUES
('road', 'Rodilla BDC', 25, 30, 40, 50, 'Ángulo mínimo de rodilla en punto muerto inferior'),
('road', 'Rodilla TDC', 90, 100, 115, 130, 'Ángulo de rodilla en punto muerto superior'),
('road', 'Cadera BDC', 40, 45, 60, 75, 'Ángulo de cadera en punto muerto inferior'),
('road', 'Tobillo BDC', 90, 95, 110, 120, 'Flexión plantar en BDC'),
('road', 'Codo', 150, 155, 165, 170, 'Ángulo de extensión de codo'),
('road', 'Tronco-Manillar', 35, 40, 55, 65, 'Inclinación de tronco respecto al manillar'),
('road', 'Espalda-Lumbar', 20, 25, 45, 55, 'Curvatura lumbar en posición de pedaleo'),
('mtb', 'Rodilla BDC', 25, 28, 38, 48, 'Ángulo mínimo de rodilla en BDC para MTB'),
('mtb', 'Rodilla TDC', 90, 95, 110, 125, 'Ángulo de rodilla en TDC para MTB'),
('mtb', 'Cadera BDC', 35, 40, 55, 70, 'Ángulo de cadera en BDC para MTB'),
('mtb', 'Tobillo BDC', 85, 90, 105, 115, 'Flexión plantar en BDC para MTB'),
('mtb', 'Codo', 145, 150, 160, 170, 'Ángulo de codo para MTB'),
('mtb', 'Tronco-Manillar', 40, 45, 60, 70, 'Inclinación de tronco para MTB'),
('road_running', 'Rodilla Apoyo', 10, 15, 25, 35, 'Flexión de rodilla en fase de apoyo'),
('road_running', 'Rodilla Despegue', 90, 95, 110, 125, 'Flexión de rodilla en fase de despegue'),
('road_running', 'Cadera Apoyo', 160, 165, 175, 180, 'Extensión de cadera en apoyo'),
('road_running', 'Tobillo Apoyo', 70, 75, 90, 95, 'Dorsiflexión de tobillo en apoyo'),
('road_running', 'Inclinación Tronco', 5, 8, 15, 20, 'Inclinación anterior del tronco en carrera'),
('road_running', 'Hombro-Brazo', 50, 55, 80, 90, 'Oscilación de brazo durante la carrera'),
('road_running', 'Cadencia', 160, 170, 180, 190, 'Pasos por minuto (cadencia de carrera)'),
('road_running', 'Longitud Zancada', 120, 130, 160, 175, 'Longitud de zancada en centímetros');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_athlete_id ON biomechanics_sessions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_session_id ON biomechanics_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_reference_ranges_discipline ON reference_ranges(discipline);
