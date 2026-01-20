-- Add unique constraint to text_hash column to prevent duplicate uploads
-- This ensures no two materials can have the same text hash

-- First, remove any existing duplicate text_hash values (keep the most recent one)
DELETE FROM sf_materials 
WHERE id NOT IN (
  SELECT DISTINCT ON (text_hash) id
  FROM sf_materials 
  WHERE text_hash IS NOT NULL
  ORDER BY text_hash, created_at DESC
);

-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_sf_materials_text_hash;

-- Create unique constraint
ALTER TABLE sf_materials ADD CONSTRAINT sf_materials_text_hash_unique UNIQUE (text_hash);

-- Create unique index for better performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_sf_materials_text_hash_unique ON sf_materials(text_hash);