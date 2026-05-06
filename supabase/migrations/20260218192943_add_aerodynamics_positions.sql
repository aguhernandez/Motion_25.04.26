/*
  # Aerodynamics Module — Position Storage

  ## Overview
  Adds the aerodynamics_positions table to store cycling aero position analyses.
  Each record represents a captured cycling position with biomechanical angles,
  frontal area estimation, aerodynamic index, and power simulation results.

  ## New Tables

  ### `aerodynamics_positions`
  - `id` (uuid, PK)
  - `athlete_id` (uuid, FK to athletes, nullable)
  - `session_id` (uuid, FK to biomechanics_sessions, nullable)
  - `label` (text) — user-defined name for this position (e.g. "Position A – Race")
  - `image_data` (text) — base64 captured frame
  - `key_points` (jsonb) — normalized key point coordinates
  - `bike_type` (text) — 'road' | 'aero_road' | 'tt'
  - `target_speed_kmh` (numeric) — target speed for power simulation
  - `air_density` (numeric) — kg/m³, default 1.225
  - `total_mass_kg` (numeric) — rider + bike system mass
  - `ftp_watts` (numeric) — functional threshold power
  - Biomechanical angles (jsonb):
    - `torso_angle_deg`, `hip_angle_tdc_deg`, `knee_angle_bdc_deg`
    - `elbow_angle_deg`, `head_angle_deg`
  - `frontal_area_index` (numeric) — relative frontal area 0-1
  - `aerodynamic_index` (numeric 0-100)
  - `power_at_target_speed_w` (numeric) — estimated watts
  - `cda_estimate` (numeric) — relative CdA estimate
  - `notes` (text)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled with public read/write (consistent with rest of module)
*/

CREATE TABLE IF NOT EXISTS aerodynamics_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES athletes(id) ON DELETE SET NULL,
  session_id uuid REFERENCES biomechanics_sessions(id) ON DELETE SET NULL,
  label text NOT NULL DEFAULT '',
  image_data text DEFAULT '',
  key_points jsonb DEFAULT '[]'::jsonb,
  bike_type text NOT NULL DEFAULT 'road' CHECK (bike_type IN ('road', 'aero_road', 'tt')),
  target_speed_kmh numeric(5,1) DEFAULT 40,
  air_density numeric(6,4) DEFAULT 1.225,
  total_mass_kg numeric(6,2) DEFAULT 80,
  ftp_watts numeric(6,1) DEFAULT 250,
  torso_angle_deg numeric(5,1),
  hip_angle_tdc_deg numeric(5,1),
  knee_angle_bdc_deg numeric(5,1),
  elbow_angle_deg numeric(5,1),
  head_angle_deg numeric(5,1),
  frontal_area_index numeric(6,4) DEFAULT 0,
  aerodynamic_index numeric(5,1) DEFAULT 0,
  power_at_target_speed_w numeric(7,1) DEFAULT 0,
  cda_estimate numeric(6,4) DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE aerodynamics_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read aerodynamics_positions"
  ON aerodynamics_positions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert aerodynamics_positions"
  ON aerodynamics_positions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update aerodynamics_positions"
  ON aerodynamics_positions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete aerodynamics_positions"
  ON aerodynamics_positions FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_aero_positions_athlete_id ON aerodynamics_positions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_aero_positions_session_id ON aerodynamics_positions(session_id);
