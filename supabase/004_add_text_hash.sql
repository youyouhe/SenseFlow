-- Add text_hash column for duplicate detection
-- Run this to update existing tables

ALTER TABLE sf_materials ADD COLUMN IF NOT EXISTS text_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_sf_materials_text_hash ON sf_materials(text_hash);
