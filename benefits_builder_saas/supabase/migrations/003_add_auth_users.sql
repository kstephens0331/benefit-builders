-- Migration: Add Internal User Authentication
-- Date: 2025-10-25
-- Description: Simple username/password auth for 4 internal Benefits Builder users

-- INTERNAL USERS TABLE
CREATE TABLE IF NOT EXISTS internal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  email text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- USER SESSIONS TABLE
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES internal_users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- AUDIT LOG TABLE (for tracking user actions)
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES internal_users(id) ON DELETE SET NULL,
  username text,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Function to update user's last login
CREATE OR REPLACE FUNCTION update_user_last_login(user_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE internal_users
  SET last_login_at = now(), updated_at = now()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE internal_users IS 'Internal Benefits Builder users with username/password authentication';
COMMENT ON TABLE user_sessions IS 'Active user sessions with expiration tracking';
COMMENT ON TABLE audit_log IS 'Complete audit trail of all user actions in the system';
