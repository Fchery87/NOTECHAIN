-- Neon Database Schema for NoteChain

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles (encrypted)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  encrypted_profile_data TEXT NOT NULL, -- Full encrypted profile
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session management for web-only app
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL, -- Unique session identifier
  device_info TEXT, -- Encrypted device info
  browser_info TEXT, -- Encrypted browser info
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Encrypted blobs (for storing all encrypted data)
CREATE TABLE encrypted_blobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  blob_type VARCHAR(50) NOT NULL, -- 'note', 'todo', 'pdf', 'profile', 'attachment'
  encrypted_data TEXT NOT NULL, -- The actual encrypted content
  nonce VARCHAR(24) NOT NULL, -- For encryption (ChaCha20-Poly1305)
  auth_tag VARCHAR(32) NOT NULL, -- Authentication tag
  metadata JSONB, -- Encrypted metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Sync operations table
CREATE TABLE sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('create', 'update', 'delete')),
  entity_type VARCHAR(50) NOT NULL, -- 'note', 'todo', 'pdf', etc.
  entity_id UUID NOT NULL,
  encrypted_payload TEXT NOT NULL, -- The encrypted data
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  version INTEGER DEFAULT 1
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_encrypted_blobs_user_id ON encrypted_blobs(user_id);
CREATE INDEX idx_encrypted_blobs_blob_type ON encrypted_blobs(blob_type);
CREATE INDEX idx_sync_operations_user_id ON sync_operations(user_id);
CREATE INDEX idx_sync_operations_is_processed ON sync_operations(is_processed);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_blobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_operations ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
CREATE POLICY user_isolation_policy ON users
  FOR ALL TO authenticated
  USING (id = auth.uid());

CREATE POLICY user_profiles_isolation_policy ON user_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY sessions_isolation_policy ON sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY encrypted_blobs_isolation_policy ON encrypted_blobs
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY sync_operations_isolation_policy ON sync_operations
  FOR ALL TO authenticated
  USING (user_id = auth.uid());