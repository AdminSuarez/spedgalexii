-- ============================================================
-- Migration 002: App Tables
-- Project: SpEdGalexii (oknwpgijmruhrxugclnm)
-- Tables: profiles, deep_dive_sessions, deep_dive_files, output_files
-- Storage bucket: iep-documents
-- ============================================================

-- ============================================================
-- profiles
-- Stores subscription tier per authenticated user.
-- Referenced in: src/lib/supabase/client.ts → hasCloudSync()
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tier TEXT    NOT NULL DEFAULT 'free',
                                -- values: 'free' | 'yearly' | 'bundle'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);


-- ============================================================
-- deep_dive_sessions
-- One row per Deep Space analysis session.
-- Referenced in: src/lib/hybridStorage.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS deep_dive_sessions (
  id                TEXT        PRIMARY KEY,       -- client-generated nanoid
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id        TEXT,
  student_name      TEXT,
  file_count        INT         NOT NULL DEFAULT 0,
  analysis_complete BOOLEAN     NOT NULL DEFAULT FALSE,
  alert_count       INT,
  critical_count    INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_deep_dive_sessions_user
  ON deep_dive_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_deep_dive_sessions_expires
  ON deep_dive_sessions(expires_at);

-- RLS
ALTER TABLE deep_dive_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own sessions" ON deep_dive_sessions;
CREATE POLICY "Users can manage own sessions"
  ON deep_dive_sessions FOR ALL
  USING (auth.uid() = user_id);


-- ============================================================
-- deep_dive_files
-- File metadata rows linked to a session.
-- Referenced in: src/lib/hybridStorage.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS deep_dive_files (
  id            BIGSERIAL   PRIMARY KEY,
  session_id    TEXT        NOT NULL REFERENCES deep_dive_sessions(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name     TEXT        NOT NULL,
  file_size     BIGINT,
  file_type     TEXT,
  storage_path  TEXT,                               -- path inside the 'iep-documents' bucket
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deep_dive_files_session
  ON deep_dive_files(session_id);

CREATE INDEX IF NOT EXISTS idx_deep_dive_files_user
  ON deep_dive_files(user_id);

-- RLS
ALTER TABLE deep_dive_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own files" ON deep_dive_files;
CREATE POLICY "Users can manage own files"
  ON deep_dive_files FOR ALL
  USING (auth.uid() = user_id);


-- ============================================================
-- output_files
-- Generated output artifacts (JSON analysis, MD reports).
-- Referenced in: src/lib/hybridStorage.ts → saveAnalysisResultsHybrid()
-- ============================================================
CREATE TABLE IF NOT EXISTS output_files (
  id            BIGSERIAL   PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    TEXT        REFERENCES deep_dive_sessions(id) ON DELETE SET NULL,
  name          TEXT        NOT NULL,               -- filename e.g. DEEP_DIVE_Jane_Doe_2025-06-01.json
  type          TEXT,                               -- 'json' | 'md' | 'pdf' etc.
  size          TEXT,                               -- human-readable e.g. "42 KB"
  module        TEXT,                               -- 'Deep Space' | 'ARD Packet' etc.
  data          TEXT,                               -- base64-encoded file content
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_output_files_user
  ON output_files(user_id);

CREATE INDEX IF NOT EXISTS idx_output_files_session
  ON output_files(session_id);

-- RLS
ALTER TABLE output_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own outputs" ON output_files;
CREATE POLICY "Users can manage own outputs"
  ON output_files FOR ALL
  USING (auth.uid() = user_id);


-- ============================================================
-- Storage bucket: iep-documents
-- Holds uploaded IEP PDF/image files for Deep Space sessions.
-- Referenced in: src/lib/hybridStorage.ts → 'iep-documents' bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('iep-documents', 'iep-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read/write their own folder
DROP POLICY IF EXISTS "Users can upload iep-documents" ON storage.objects;
CREATE POLICY "Users can upload iep-documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'iep-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read own iep-documents" ON storage.objects;
CREATE POLICY "Users can read own iep-documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'iep-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own iep-documents" ON storage.objects;
CREATE POLICY "Users can delete own iep-documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'iep-documents' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================
-- Storage bucket: galexii-uploads
-- Holds canonical CSVs mirrored from upload route.
-- Referenced in: src/lib/supabase/server.ts → CANON_BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('galexii-uploads', 'galexii-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Service role only (no user-level RLS needed — server-side only)
-- The server.ts client uses the SERVICE_ROLE_KEY which bypasses RLS.
