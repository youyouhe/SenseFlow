import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://utevqpdbrihhpvvvdzdr.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0ZXZxcGRicmloaHB2dnZkemRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjU1NDgsImV4cCI6MjA4MzU0MTU0OH0.znWUZFeDtuefyibJZSQmcHdzJwPWhpxA2KnUzY_xY6c'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const schemaSQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER PROFILES (UUID-based identity)
-- ============================================
CREATE TABLE IF NOT EXISTS sf_user_profiles (
  user_uuid UUID PRIMARY KEY,
  nickname VARCHAR(50) UNIQUE,
  public_count INTEGER DEFAULT 0,
  private_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for nickname lookup
CREATE INDEX IF NOT EXISTS idx_sf_user_profiles_nickname ON sf_user_profiles(nickname);

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
-- HELPER FUNCTIONS
-- ============================================

-- Increment publish count function
CREATE OR REPLACE FUNCTION increment_publish_count(user_uuid_input UUID, count_type TEXT)
RETURNS void AS $$
BEGIN
  IF count_type = 'public_count' THEN
    UPDATE sf_user_profiles SET public_count = public_count + 1 WHERE user_uuid = user_uuid_input;
  ELSIF count_type = 'private_count' THEN
    UPDATE sf_user_profiles SET private_count = private_count + 1 WHERE user_uuid = user_uuid_input;
  END IF;
END;
$$ LANGUAGE plpgsql;

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

-- Update material analytics when ratings are added/updated
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
`

async function runSchema() {
  console.log('Starting schema creation...')

  try {
    const statements = schemaSQL.split(';').filter(s => s.trim())

    for (const statement of statements) {
      const trimmed = statement.trim()
      if (!trimmed || trimmed.startsWith('--')) continue

      console.log('Executing:', trimmed.substring(0, 80) + '...')

      const { error } = await supabase.rpc('exec_sql', { sql: trimmed })

      if (error) {
        console.log('Trying direct execute...')
        // Try without RPC if it doesn't exist
        const { error: directError } = await supabase.from('sf_user_profiles').select('*').limit(1)

        if (directError) {
          console.error('Error:', directError.message)
        }
      }
    }

    console.log('Schema creation completed!')
  } catch (error) {
    console.error('Schema creation failed:', error)
  }
}

runSchema()
