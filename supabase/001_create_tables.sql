-- SenseFlow Table Schema with sf_ prefix
-- This script creates all necessary tables for the SenseFlow application

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS sf_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study materials table
CREATE TABLE IF NOT EXISTS sf_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  original_text TEXT NOT NULL,
  duration INTEGER NOT NULL, -- in seconds
  config JSONB NOT NULL DEFAULT '{}', -- MaterialConfig
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'Insane')),
  provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('edge', 'openai', 'local', 'gemini', 'deepseek')),
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  author_id UUID REFERENCES sf_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chunks table (for chunk data)
CREATE TABLE IF NOT EXISTS sf_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES sf_materials(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  translation TEXT,
  start_time DECIMAL(10,2) NOT NULL, -- in seconds with millisecond precision
  end_time DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(material_id, chunk_index)
);

-- User progress tracking
CREATE TABLE IF NOT EXISTS sf_user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES sf_users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES sf_materials(id) ON DELETE CASCADE,
  chunks_attempted UUID[] DEFAULT '{}', -- Array of chunk IDs
  chunks_completed UUID[] DEFAULT '{}', -- Array of chunk IDs
  accuracy DECIMAL(5,2) DEFAULT 0.00, -- Percentage 0-100
  total_time_spent INTEGER DEFAULT 0, -- in seconds
  best_streak INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, material_id)
);

-- Training sessions table
CREATE TABLE IF NOT EXISTS sf_training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES sf_users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES sf_materials(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  training_mode VARCHAR(20) NOT NULL CHECK (training_mode IN ('practice', 'test', 'review')),
  chunks_practiced UUID[] DEFAULT '{}',
  accuracy DECIMAL(5,2) DEFAULT 0.00,
  wpm DECIMAL(6,2), -- Words per minute
  comprehension_score DECIMAL(5,2), -- 0-100
  adaptive_settings JSONB DEFAULT '{}', -- Training adaptive settings used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User favorites/bookmarks
CREATE TABLE IF NOT EXISTS sf_user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES sf_users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES sf_materials(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, material_id)
);

-- Community ratings and reviews
CREATE TABLE IF NOT EXISTS sf_material_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES sf_users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES sf_materials(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, material_id)
);

-- Material usage analytics
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sf_materials_author_id ON sf_materials(author_id);
CREATE INDEX IF NOT EXISTS idx_sf_materials_difficulty ON sf_materials(difficulty);
CREATE INDEX IF NOT EXISTS idx_sf_materials_tags ON sf_materials USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_sf_materials_is_public ON sf_materials(is_public);
CREATE INDEX IF NOT EXISTS idx_sf_materials_created_at ON sf_materials(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sf_chunks_material_id ON sf_chunks(material_id);
CREATE INDEX IF NOT EXISTS idx_sf_chunks_start_time ON sf_chunks(start_time);

CREATE INDEX IF NOT EXISTS idx_sf_user_progress_user_id ON sf_user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_sf_user_progress_material_id ON sf_user_progress(material_id);
CREATE INDEX IF NOT EXISTS idx_sf_user_progress_last_accessed ON sf_user_progress(last_accessed DESC);

CREATE INDEX IF NOT EXISTS idx_sf_training_sessions_user_id ON sf_training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sf_training_sessions_material_id ON sf_training_sessions(material_id);
CREATE INDEX IF NOT EXISTS idx_sf_training_sessions_start_time ON sf_training_sessions(start_time DESC);

CREATE INDEX IF NOT EXISTS idx_sf_user_favorites_user_id ON sf_user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_sf_user_favorites_material_id ON sf_user_favorites(material_id);

CREATE INDEX IF NOT EXISTS idx_sf_material_ratings_material_id ON sf_material_ratings(material_id);
CREATE INDEX IF NOT EXISTS idx_sf_material_ratings_rating ON sf_material_ratings(rating);

-- Row Level Security (RLS)
ALTER TABLE sf_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sf_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sf_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sf_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sf_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sf_user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE sf_material_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can only see and edit their own profile
CREATE POLICY "Users can view own profile" ON sf_users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON sf_users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON sf_users FOR INSERT WITH CHECK (auth.uid() = id);

-- Materials: Public materials are readable by everyone, private only by author
CREATE POLICY "Public materials are readable by everyone" ON sf_materials FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Private materials readable by author" ON sf_materials FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "Users can create materials" ON sf_materials FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update own materials" ON sf_materials FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete own materials" ON sf_materials FOR DELETE USING (auth.uid() = author_id);

-- Chunks follow material permissions
CREATE POLICY "Chunks follow material permissions" ON sf_chunks FOR SELECT USING (
  EXISTS (SELECT 1 FROM sf_materials m 
         WHERE m.id = sf_chunks.material_id 
         AND (m.is_public = TRUE OR m.author_id = auth.uid()))
);

-- User progress is only visible to the user
CREATE POLICY "Users can view own progress" ON sf_user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON sf_user_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON sf_user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Training sessions only visible to the user
CREATE POLICY "Users can view own training sessions" ON sf_training_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own training sessions" ON sf_training_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Favorites only visible to the user
CREATE POLICY "Users can view own favorites" ON sf_user_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own favorites" ON sf_user_favorites FOR ALL USING (auth.uid() = user_id);

-- Ratings are public but only user who created can modify
CREATE POLICY "Ratings are readable by everyone" ON sf_material_ratings FOR SELECT USING (TRUE);
CREATE POLICY "Users can create ratings" ON sf_material_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ratings" ON sf_material_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ratings" ON sf_material_ratings FOR DELETE USING (auth.uid() = user_id);

-- Analytics are readable by everyone for public materials
CREATE POLICY "Material analytics readable by everyone" ON sf_material_analytics FOR SELECT USING (TRUE);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sf_users_timestamp BEFORE UPDATE ON sf_users
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

-- Create a function to sync user profile from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO sf_users (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();