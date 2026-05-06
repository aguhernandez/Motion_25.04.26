/*
  # Drop profiles foreign key to auth.users

  ## Purpose
  Removes the foreign key constraint linking profiles.id to auth.users(id).
  Since this satellite uses HUB authentication (not Supabase Auth), there are
  no rows in auth.users, causing INSERT conflicts with a 409 error.

  ## Changes
  - Drops the profiles_id_fkey constraint if it exists
*/

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
