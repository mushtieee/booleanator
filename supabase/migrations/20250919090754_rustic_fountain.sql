/*
  # User Management System for Booleanator

  1. New Tables
    - `profiles` - Extended user profiles with approval status
      - `id` (uuid, references auth.users)
      - `full_name` (text)
      - `email` (text)
      - `is_approved` (boolean, default false)
      - `created_at` (timestamp)
      - `last_login` (timestamp)
      - `login_count` (integer, default 0)
    
    - `user_sessions` - Track user sessions for analytics
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `session_start` (timestamp)
      - `session_end` (timestamp)
      - `ip_address` (text)
      - `user_agent` (text)
    
    - `site_analytics` - Track site visits and usage
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles, nullable)
      - `page_visited` (text)
      - `visit_timestamp` (timestamp)
      - `session_id` (text)
      - `referrer` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for user data access
    - Admin-only access for approval management

  3. Functions
    - Auto-create profile on user signup
    - Update last_login on authentication
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text UNIQUE NOT NULL,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz DEFAULT now(),
  login_count integer DEFAULT 0
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_start timestamptz DEFAULT now(),
  session_end timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create site_analytics table
CREATE TABLE IF NOT EXISTS site_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  page_visited text NOT NULL,
  visit_timestamp timestamptz DEFAULT now(),
  session_id text,
  referrer text,
  ip_address text
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_analytics ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND email = 'mustafakesarya@gmail.com'
    )
  );

CREATE POLICY "Admin can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND email = 'mustafakesarya@gmail.com'
    )
  );

-- User sessions policies
CREATE POLICY "Users can read own sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sessions"
  ON user_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can read all sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND email = 'mustafakesarya@gmail.com'
    )
  );

-- Site analytics policies
CREATE POLICY "Users can read own analytics"
  ON site_analytics
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can insert analytics"
  ON site_analytics
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can read all analytics"
  ON site_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND email = 'mustafakesarya@gmail.com'
    )
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update last login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles 
  SET 
    last_login = now(),
    login_count = login_count + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON profiles(last_login);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_start ON user_sessions(session_start);
CREATE INDEX IF NOT EXISTS idx_site_analytics_user_id ON site_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_site_analytics_visit_timestamp ON site_analytics(visit_timestamp);