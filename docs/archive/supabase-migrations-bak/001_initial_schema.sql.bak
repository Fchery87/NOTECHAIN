-- NoteChain Database Schema for Supabase
-- Version: 1.0
-- Database: PostgreSQL 15
-- Migration: 001_initial_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- For client-side encryption compatibility testing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- For UUID generation

-- ============================================
-- Users Table (Managed by Supabase Auth)
-- This table is automatically managed by Supabase Auth
-- We only reference it via auth.uid()
-- ============================================

-- ============================================
-- User Profiles Table
-- Stores encrypted user profile data
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email_hash VARCHAR(255) UNIQUE NOT NULL,  -- SHA-256 hash for billing lookups
    encrypted_profile BYTEA NOT NULL,  -- Encrypted UserProfile JSON (name, timezone, preferences)
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Row Level Security for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Index for email_hash lookups (billing)
CREATE INDEX idx_profiles_email_hash ON public.profiles(email_hash);

-- ============================================
-- Devices Table
-- Manages multiple devices per user with encryption keys
-- ============================================
CREATE TABLE public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NOT NULL, -- 'ios', 'android', 'web', 'desktop'
    public_exchange_key BYTEA NOT NULL, -- X25519 public key for E2E sync
    encrypted_shared_secret BYTEA NOT NULL, -- Encrypted with device-specific key
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_trusted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, device_type, device_name)
);

-- Row Level Security for Devices
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices"
ON public.devices
FOR SELECT
USING (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can insert own devices"
ON public.devices
FOR INSERT
WITH CHECK (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can update own devices"
ON public.devices
FOR UPDATE
USING (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

-- ============================================
-- Encrypted Blobs Table
-- Core storage for all encrypted user data
-- ============================================
CREATE TABLE public.encrypted_blobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    blob_type VARCHAR(50) NOT NULL, -- 'note', 'todo', 'pdf', 'annotation'
    ciphertext BYTEA NOT NULL,
    nonce BYTEA NOT NULL, -- 96-bit IV for AES-256-GCM
    auth_tag BYTEA NOT NULL, -- 128-bit GCM authentication tag
    key_id UUID NOT NULL, -- References which encryption key was used
    metadata_hash BYTEA NOT NULL, -- Blake3 hash of encrypted metadata for integrity
    version BIGINT DEFAULT 1, -- CRDT version number
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE -- Soft delete for sync
);

-- Row Level Security for Encrypted Blobs
ALTER TABLE public.encrypted_blobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own encrypted blobs"
ON public.encrypted_blobs
FOR SELECT
USING (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can insert own encrypted blobs"
ON public.encrypted_blobs
FOR INSERT
WITH CHECK (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can update own encrypted blobs"
ON public.encrypted_blobs
FOR UPDATE
USING (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Indexes for sync queries
CREATE INDEX idx_blobs_user_id ON public.encrypted_blobs(user_id);
CREATE INDEX idx_blobs_type_version ON public.encrypted_blobs(user_id, blob_type, version);
CREATE INDEX idx_blobs_deleted ON public.encrypted_blobs(user_id, is_deleted);

-- ============================================
-- Sync Metadata Table
-- Tracks sync state and conflict resolution
-- ============================================
CREATE TABLE public.sync_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE NOT NULL,
    last_sync_version BIGINT DEFAULT 0,
    sync_status VARCHAR(50) DEFAULT 'idle', -- 'idle', 'syncing', 'conflict', 'error'
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, device_id)
);

-- Row Level Security for Sync Metadata
ALTER TABLE public.sync_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync metadata"
ON public.sync_metadata
FOR SELECT
USING (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can insert own sync metadata"
ON public.sync_metadata
FOR INSERT
WITH CHECK (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can update own sync metadata"
ON public.sync_metadata
FOR UPDATE
USING (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

-- ============================================
-- Subscription Metadata Table
-- Stores billing and subscription information
-- ============================================
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    account_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'pro'
    subscription_status VARCHAR(50) DEFAULT 'active', -- 'active', 'canceled', 'past_due'
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    device_limit INTEGER DEFAULT 1, -- 1 for free, 5 for pro
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id)
);

-- Row Level Security for Subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
USING (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Subscription updates are handled via Edge Functions, not direct user access

-- ============================================
-- Notes Table (Encrypted Content Reference)
-- Maps notes to encrypted blobs with metadata
-- ============================================
CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    encrypted_blob_id UUID REFERENCES public.encrypted_blobs(id) ON DELETE CASCADE,
    notebook_id UUID REFERENCES public.notebooks(id) ON DELETE SET NULL,
    title_hash VARCHAR(255) NOT NULL, -- For title search (encrypted on client)
    content_hash VARCHAR(255) NOT NULL, -- For change detection
    word_count INTEGER DEFAULT 0,
    encryption_key_id UUID NOT NULL,
    sync_version BIGINT DEFAULT 1,
    is_locked BOOLEAN DEFAULT FALSE, -- Additional passphrase protection
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Row Level Security for Notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes"
ON public.notes
FOR SELECT
USING (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can insert own notes"
ON public.notes
FOR INSERT
WITH CHECK (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can update own notes"
ON public.notes
FOR UPDATE
USING (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can soft delete own notes"
ON public.notes
FOR UPDATE
USING (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
)
WITH CHECK (is_deleted = TRUE);

-- Indexes
CREATE INDEX idx_notes_user ON public.notes(user_id, is_deleted);
CREATE INDEX idx_notes_notebook ON public.notes(notebook_id);

-- ============================================
-- Notebooks Table
-- Organizes notes into notebooks/folders
-- ============================================
CREATE TABLE public.notebooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Row Level Security for Notebooks
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notebooks"
ON public.notebooks
FOR SELECT
USING (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can insert own notebooks"
ON public.notebooks
FOR INSERT
WITH CHECK (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

-- ============================================
-- Todos Table (Encrypted Content Reference)
-- Maps todos to encrypted blobs with metadata
-- ============================================
CREATE TABLE public.todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    encrypted_blob_id UUID REFERENCES public.encrypted_blobs(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    linked_note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL, -- For todo-from-note feature
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_minutes INTEGER,
    actual_minutes INTEGER,
    calendar_event_id VARCHAR(255), -- External calendar event ID
    calendar_provider VARCHAR(50), -- 'google', 'outlook', 'apple'
    sync_version BIGINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Row Level Security for Todos
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own todos"
ON public.todos
FOR SELECT
USING (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can insert own todos"
ON public.todos
FOR INSERT
WITH CHECK (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can update own todos"
ON public.todos
FOR UPDATE
USING (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Indexes
CREATE INDEX idx_todos_user ON public.todos(user_id, is_deleted);
CREATE INDEX idx_todos_status ON public.todos(user_id, status, due_date);
CREATE INDEX idx_todos_linked_note ON public.todos(linked_note_id);

-- ============================================
-- Projects Table
-- Organizes todos into projects/tags
-- ============================================
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name_hash VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f6', -- Hex color code
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Row Level Security for Projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
ON public.projects
FOR SELECT
USING (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can insert own projects"
ON public.projects
FOR INSERT
WITH CHECK (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

-- ============================================
-- PDF Documents Table
-- Stores PDF metadata and links to encrypted storage
-- ============================================
CREATE TABLE public.pdf_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    encrypted_blob_id UUID REFERENCES public.encrypted_blobs(id) ON DELETE CASCADE,
    storage_key VARCHAR(500) NOT NULL, -- Supabase Storage path
    thumbnail_key VARCHAR(500),
    original_filename_hash VARCHAR(255) NOT NULL,
    page_count INTEGER DEFAULT 0,
    file_size_bytes BIGINT DEFAULT 0,
    encryption_key_id UUID NOT NULL,
    sync_version BIGINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Row Level Security for PDF Documents
ALTER TABLE public.pdf_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pdfs"
ON public.pdf_documents
FOR SELECT
USING (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can insert own pdfs"
ON public.pdf_documents
FOR INSERT
WITH CHECK (
    user_id IN (
        SELECT id FROM public.profiles WHERE id = auth.uid()
    )
);

-- ============================================
-- PDF Annotations Table
-- Stores annotations and signatures for PDFs
-- ============================================
CREATE TABLE public.pdf_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pdf_id UUID REFERENCES public.pdf_documents(id) ON DELETE CASCADE NOT NULL,
    encrypted_blob_id UUID REFERENCES public.encrypted_blobs(id) ON DELETE CASCADE,
    annotation_type VARCHAR(50) NOT NULL, -- 'highlight', 'underline', 'signature', 'drawing'
    page_number INTEGER NOT NULL,
    position_x DECIMAL(10, 2),
    position_y DECIMAL(10, 2),
    width DECIMAL(10, 2),
    height DECIMAL(10, 2),
    color VARCHAR(7) DEFAULT '#FF6B6B',
    sync_version BIGINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Row Level Security for PDF Annotations
ALTER TABLE public.pdf_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pdf annotations"
ON public.pdf_annotations
FOR SELECT
USING (
    pdf_id IN (
        SELECT id FROM public.pdf_documents
        WHERE user_id IN (
            SELECT id FROM public.profiles WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert own pdf annotations"
ON public.pdf_annotations
FOR INSERT
WITH CHECK (
    pdf_id IN (
        SELECT id FROM public.pdf_documents
        WHERE user_id IN (
            SELECT id FROM public.profiles WHERE id = auth.uid()
        )
    )
);

-- ============================================
-- Functions and Triggers for Automatic Timestamp Updates
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_todos_updated_at
    BEFORE UPDATE ON public.todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notebooks_updated_at
    BEFORE UPDATE ON public.notebooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pdfs_updated_at
    BEFORE UPDATE ON public.pdf_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Grant Permissions
-- ============================================
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Allow authenticated users to interact with tables via RLS policies
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.devices TO authenticated;
GRANT ALL ON public.encrypted_blobs TO authenticated;
GRANT ALL ON public.sync_metadata TO authenticated;
GRANT ALL ON public.subscriptions TO authenticated;
GRANT ALL ON public.notes TO authenticated;
GRANT ALL ON public.notebooks TO authenticated;
GRANT ALL ON public.todos TO authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.pdf_documents TO authenticated;
GRANT ALL ON public.pdf_annotations TO authenticated;
