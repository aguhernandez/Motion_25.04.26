/*
  # Create profiles table for HUB satellite authentication

  ## Purpose
  This migration creates the local profiles table for the LAB satellite.
  Authentication is handled externally by hub.asciende.pro. This table stores
  local user data synced from the HUB on first access.

  ## New Tables
  - `profiles`
    - `id` (uuid, primary key, auto-generated)
    - `hub_user_id` (text, unique) - The user's ID from hub.asciende.pro
    - `email` (text) - User's email address
    - `full_name` (text) - User's display name
    - `role` (text) - One of: 'admin', 'coach', 'athlete'
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz, auto-updated via trigger)

  ## Security
  - RLS is enabled on the table
  - Policies allow anon/authenticated access since auth is managed by the HUB token,
    not Supabase Auth. The HUB validates tokens and our backend syncs profiles.

  ## Notes
  - Profiles are auto-created when a HUB user first accesses the LAB satellite
  - hub_user_id uniquely identifies each user across all satellites
  - The role 'trainer' from HUB is normalized to 'coach' locally
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_user_id text UNIQUE NOT NULL,
  email text NOT NULL DEFAULT '',
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'athlete' CHECK (role IN ('admin', 'coach', 'athlete')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_hub_user_id ON profiles(hub_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for anon and authenticated"
  ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert for anon and authenticated"
  ON profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update for anon and authenticated"
  ON profiles
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
