-- SenseFlow Table Schema with sf_ prefix
-- This script creates all necessary tables for the SenseFlow application

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER PROFILES (UUID-based identity)
-- ============================================
CREATE TABLE IF NOT EXISTS sf_user_profiles (
  user_uuid UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  nickname VARCHAR(50) UNIQUE,
  public_count INTEGER DEFAULT 0,
  private_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables)
DO $$ BEGIN
  ALTER TABLE sf_user_profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE sf_user_profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_sf_user_profiles_email ON sf_user_profiles(email);

-- ============================================
-- STUDY MATERIALS (with compression support)
-- ============================================
CREATE TABLE IF NOT EXISTS sf_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  original_text TEXT NOT NULL,
  duration INTEGER NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'Insane')),
  provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('edge', 'openai', 'local', 'gemini', 'deepseek')),
  tags TEXT[] DEFAULT '{}',
  user_uuid UUID REFERENCES sf_user_profiles(user_uuid) ON DELETE SET NULL,
  compressed_data TEXT,
  original_size INTEGER,
  compressed_size INTEGER,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CHUNKS TABLE (for chunk data)
-- ============================================
CREATE TABLE IF NOT EXISTS sf_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES sf_materials(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  translation TEXT,
  start_time DECIMAL(10,2) NOT NULL,
  end_time DECIMAL(10,2) NOT NULL,
  speaker VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(material_id, chunk_index)
);

-- ============================================
-- USER PROGRESS TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS sf_user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uuid UUID NOT NULL REFERENCES sf_user_profiles(user_uuid) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES sf_materials(id) ON DELETE CASCADE,
  chunks_attempted UUID[] DEFAULT '{}',
  chunks_completed UUID[] DEFAULT '{}',
  accuracy DECIMAL(5,2) DEFAULT 0.00,
  total_time_spent INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_uuid, material_id)
);

-- ============================================
-- TRAINING SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS sf_training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uuid UUID NOT NULL REFERENCES sf_user_profiles(user_uuid) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES sf_materials(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  training_mode VARCHAR(20) NOT NULL CHECK (training_mode IN ('practice', 'test', 'review')),
  chunks_practiced UUID[] DEFAULT '{}',
  accuracy DECIMAL(5,2) DEFAULT 0.00,
  wpm DECIMAL(6,2),
  comprehension_score DECIMAL(5,2),
  adaptive_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER FAVORITES/BOOKMARKS
-- ============================================
CREATE TABLE IF NOT EXISTS sf_user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uuid UUID NOT NULL REFERENCES sf_user_profiles(user_uuid) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES sf_materials(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_uuid, material_id)
);

-- ============================================
-- COMMUNITY RATINGS AND REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS sf_material_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uuid UUID NOT NULL REFERENCES sf_user_profiles(user_uuid) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES sf_materials(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_uuid, material_id)
);

-- ============================================
-- MATERIAL USAGE ANALYTICS
-- ============================================
CREATE TABLE IF NOT EXISTS sf_material_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES sf_materials(id) ON DELETE CASCADE,
  total_users INTEGER DEFAULT 0,
  avg_completion_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_rating DECIMAL(3,2) DEFAULT 0.00,
  total_plays INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sf_materials_user_uuid ON sf_materials(user_uuid);
CREATE INDEX IF NOT EXISTS idx_sf_materials_difficulty ON sf_materials(difficulty);
CREATE INDEX IF NOT EXISTS idx_sf_materials_tags ON sf_materials USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_sf_materials_is_public ON sf_materials(is_public);
CREATE INDEX IF NOT EXISTS idx_sf_materials_created_at ON sf_materials(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sf_chunks_material_id ON sf_chunks(material_id);
CREATE INDEX IF NOT EXISTS idx_sf_chunks_start_time ON sf_chunks(start_time);

CREATE INDEX IF NOT EXISTS idx_sf_user_progress_user_uuid ON sf_user_progress(user_uuid);
CREATE INDEX IF NOT EXISTS idx_sf_user_progress_material_id ON sf_user_progress(material_id);
CREATE INDEX IF NOT EXISTS idx_sf_user_progress_last_accessed ON sf_user_progress(last_accessed DESC);

CREATE INDEX IF NOT EXISTS idx_sf_training_sessions_user_uuid ON sf_training_sessions(user_uuid);
CREATE INDEX IF NOT EXISTS idx_sf_training_sessions_material_id ON sf_training_sessions(material_id);
CREATE INDEX IF NOT EXISTS idx_sf_training_sessions_start_time ON sf_training_sessions(start_time DESC);

CREATE INDEX IF NOT EXISTS idx_sf_user_favorites_user_uuid ON sf_user_favorites(user_uuid);
CREATE INDEX IF NOT EXISTS idx_sf_user_favorites_material_id ON sf_user_favorites(material_id);

CREATE INDEX IF NOT EXISTS idx_sf_material_ratings_material_id ON sf_material_ratings(material_id);
CREATE INDEX IF NOT EXISTS idx_sf_material_ratings_rating ON sf_material_ratings(rating);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE sf_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sf_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sf_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sf_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sf_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sf_user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE sf_material_ratings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- User Profiles: Users can view all profiles (for community), but only edit own
CREATE POLICY "Anyone can view profiles" ON sf_user_profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile" ON sf_user_profiles FOR UPDATE USING (user_uuid = user_uuid);
CREATE POLICY "Users can insert own profile" ON sf_user_profiles FOR INSERT WITH CHECK (user_uuid = user_uuid);

-- Materials: Public materials are readable by everyone, private only by owner
CREATE POLICY "Public materials are readable by everyone" ON sf_materials FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Private materials readable by owner" ON sf_materials FOR SELECT USING (user_uuid IS NOT NULL AND user_uuid = user_uuid);
CREATE POLICY "Users can create materials" ON sf_materials FOR INSERT WITH CHECK (user_uuid = user_uuid);
CREATE POLICY "Owners can update own materials" ON sf_materials FOR UPDATE USING (user_uuid = user_uuid);
CREATE POLICY "Owners can delete own materials" ON sf_materials FOR DELETE USING (user_uuid = user_uuid);

-- Chunks follow material permissions
CREATE POLICY "Chunks follow material permissions" ON sf_chunks FOR SELECT USING (
  EXISTS (SELECT 1 FROM sf_materials m 
         WHERE m.id = sf_chunks.material_id 
         AND (m.is_public = TRUE OR m.user_uuid = m.user_uuid))
);

-- User progress is only visible to the user
CREATE POLICY "Users can view own progress" ON sf_user_progress FOR SELECT USING (user_uuid = user_uuid);
CREATE POLICY "Users can update own progress" ON sf_user_progress FOR UPDATE USING (user_uuid = user_uuid);
CREATE POLICY "Users can insert own progress" ON sf_user_progress FOR INSERT WITH CHECK (user_uuid = user_uuid);

-- Training sessions only visible to the user
CREATE POLICY "Users can view own training sessions" ON sf_training_sessions FOR SELECT USING (user_uuid = user_uuid);
CREATE POLICY "Users can insert own training sessions" ON sf_training_sessions FOR INSERT WITH CHECK (user_uuid = user_uuid);

-- Favorites only visible to the user
CREATE POLICY "Users can view own favorites" ON sf_user_favorites FOR SELECT USING (user_uuid = user_uuid);
CREATE POLICY "Users can manage own favorites" ON sf_user_favorites FOR ALL USING (user_uuid = user_uuid);

-- Ratings are public but only user who created can modify
CREATE POLICY "Ratings are readable by everyone" ON sf_material_ratings FOR SELECT USING (TRUE);
CREATE POLICY "Users can create ratings" ON sf_material_ratings FOR INSERT WITH CHECK (user_uuid = user_uuid);
CREATE POLICY "Users can update own ratings" ON sf_material_ratings FOR UPDATE USING (user_uuid = user_uuid);
CREATE POLICY "Users can delete own ratings" ON sf_material_ratings FOR DELETE USING (user_uuid = user_uuid);

-- Analytics are readable by everyone for public materials
CREATE POLICY "Material analytics readable by everyone" ON sf_material_analytics FOR SELECT USING (TRUE);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sf_user_profiles_timestamp BEFORE UPDATE ON sf_user_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_sf_materials_timestamp BEFORE UPDATE ON sf_materials
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_sf_user_progress_timestamp BEFORE UPDATE ON sf_user_progress
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_sf_material_ratings_timestamp BEFORE UPDATE ON sf_material_ratings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Trigger to update material analytics when ratings are added/updated
CREATE OR REPLACE FUNCTION update_material_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO sf_material_analytics (material_id, total_users, avg_completion_rate, avg_rating, total_plays, last_updated)
  VALUES (
    NEW.material_id,
    0,
    0,
    (SELECT COALESCE(AVG(rating), 0) FROM sf_material_ratings WHERE material_id = NEW.material_id),
    0,
    NOW()
  )
  ON CONFLICT (material_id) 
  DO UPDATE SET 
    avg_rating = EXCLUDED.avg_rating,
    last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_material_analytics
    AFTER INSERT OR UPDATE ON sf_material_ratings
    FOR EACH ROW EXECUTE FUNCTION update_material_analytics();

-- ============================================
-- ACCOUNT RECOVERY
-- ============================================
CREATE TABLE IF NOT EXISTS sf_recovery_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(20) NOT NULL,
  user_uuid UUID NOT NULL REFERENCES sf_user_profiles(user_uuid) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email, code)
);

CREATE INDEX IF NOT EXISTS idx_sf_recovery_codes_email ON sf_recovery_codes(email);
CREATE INDEX IF NOT EXISTS idx_sf_recovery_codes_expires ON sf_recovery_codes(expires_at);

-- ============================================
-- EMAIL BINDING FUNCTIONS
-- ============================================

-- Migrate user data from one UUID to another (for email binding)
DROP FUNCTION IF EXISTS migrate_user_data(UUID, UUID);
CREATE OR REPLACE FUNCTION migrate_user_data(from_uuid UUID, to_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Update materials
  UPDATE sf_materials SET user_uuid = to_uuid WHERE user_uuid = from_uuid;
  
  -- Update user progress
  UPDATE sf_user_progress SET user_uuid = to_uuid WHERE user_uuid = from_uuid;
  
  -- Update training sessions
  UPDATE sf_training_sessions SET user_uuid = to_uuid WHERE user_uuid = from_uuid;
  
  -- Update favorites
  UPDATE sf_user_favorites SET user_uuid = to_uuid WHERE user_uuid = from_uuid;
  
  -- Update ratings
  UPDATE sf_material_ratings SET user_uuid = to_uuid WHERE user_uuid = from_uuid;
  
  -- Delete old profile
  DELETE FROM sf_user_profiles WHERE user_uuid = from_uuid;
  
  -- Clean up recovery codes
  DELETE FROM sf_recovery_codes WHERE user_uuid = from_uuid;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired recovery codes (run periodically)
DROP FUNCTION IF EXISTS cleanup_expired_recovery_codes();
CREATE OR REPLACE FUNCTION cleanup_expired_recovery_codes()
RETURNS VOID AS $$
BEGIN
  DELETE FROM sf_recovery_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;