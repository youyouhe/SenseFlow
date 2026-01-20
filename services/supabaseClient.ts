import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://utevqpdbrihhpvvvdzdr.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0ZXZxcGRicmloaHB2dnZkemRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjU1NDgsImV4cCI6MjA4MzU0MTU0OH0.znWUZFeDtuefyibJZSQmcHdzJwPWhpxA2KnUzY_xY6c'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for Supabase tables
export interface Database {
  public: {
    Tables: {
      sf_user_profiles: {
        Row: {
          user_uuid: string
          nickname: string | null
          public_count: number
          private_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_uuid: string
          nickname?: string | null
          public_count?: number
          private_count?: number
        }
        Update: {
          nickname?: string | null
          public_count?: number
          private_count?: number
        }
      }
      sf_materials: {
        Row: {
          id: string
          title: string
          description: string | null
          original_text: string
          duration: number
          config: Record<string, any>
          difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane'
          provider_type: 'edge' | 'openai' | 'local' | 'gemini' | 'deepseek'
          tags: string[]
          user_uuid: string | null
          compressed_data: string | null
          original_size: number | null
          compressed_size: number | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          original_text: string
          duration: number
          config?: Record<string, any>
          difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane'
          provider_type: 'edge' | 'openai' | 'local' | 'gemini' | 'deepseek'
          tags?: string[]
          user_uuid?: string | null
          compressed_data?: string | null
          original_size?: number | null
          compressed_size?: number | null
          is_public?: boolean
        }
        Update: {
          title?: string
          description?: string | null
          original_text?: string
          duration?: number
          config?: Record<string, any>
          difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Insane'
          provider_type?: 'edge' | 'openai' | 'local' | 'gemini' | 'deepseek'
          tags?: string[]
          user_uuid?: string | null
          compressed_data?: string | null
          original_size?: number | null
          compressed_size?: number | null
          is_public?: boolean
        }
      }
      sf_chunks: {
        Row: {
          id: string
          material_id: string
          chunk_index: number
          text: string
          translation: string | null
          start_time: number
          end_time: number
          speaker: string | null
          created_at: string
        }
        Insert: {
          id?: string
          material_id: string
          chunk_index: number
          text: string
          translation?: string | null
          start_time: number
          end_time: number
          speaker?: string | null
        }
        Update: {
          material_id?: string
          chunk_index?: number
          text?: string
          translation?: string | null
          start_time?: number
          end_time?: number
          speaker?: string | null
        }
      }
      sf_user_progress: {
        Row: {
          id: string
          user_uuid: string
          material_id: string
          chunks_attempted: string[]
          chunks_completed: string[]
          accuracy: number
          total_time_spent: number
          best_streak: number
          current_streak: number
          last_accessed: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_uuid: string
          material_id: string
          chunks_attempted?: string[]
          chunks_completed?: string[]
          accuracy?: number
          total_time_spent?: number
          best_streak?: number
          current_streak?: number
          last_accessed?: string
        }
        Update: {
          chunks_attempted?: string[]
          chunks_completed?: string[]
          accuracy?: number
          total_time_spent?: number
          best_streak?: number
          current_streak?: number
          last_accessed?: string
        }
      }
      sf_training_sessions: {
        Row: {
          id: string
          user_uuid: string
          material_id: string
          start_time: string
          end_time: string | null
          training_mode: 'practice' | 'test' | 'review'
          chunks_practiced: string[]
          accuracy: number
          wpm: number | null
          comprehension_score: number | null
          adaptive_settings: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          user_uuid: string
          material_id: string
          start_time?: string
          end_time?: string | null
          training_mode: 'practice' | 'test' | 'review'
          chunks_practiced?: string[]
          accuracy?: number
          wpm?: number | null
          comprehension_score?: number | null
          adaptive_settings?: Record<string, any>
        }
        Update: {
          end_time?: string | null
          training_mode?: 'practice' | 'test' | 'review'
          chunks_practiced?: string[]
          accuracy?: number
          wpm?: number | null
          comprehension_score?: number | null
          adaptive_settings?: Record<string, any>
        }
      }
      sf_user_favorites: {
        Row: {
          id: string
          user_uuid: string
          material_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_uuid: string
          material_id: string
        }
        Update: Record<string, never>
      }
      sf_material_ratings: {
        Row: {
          id: string
          user_uuid: string
          material_id: string
          rating: number
          review: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_uuid: string
          material_id: string
          rating: number
          review?: string | null
        }
        Update: {
          rating?: number
          review?: string | null
        }
      }
      sf_material_analytics: {
        Row: {
          id: string
          material_id: string
          total_users: number
          avg_completion_rate: number
          avg_rating: number
          total_plays: number
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: string
          material_id: string
          total_users?: number
          avg_completion_rate?: number
          avg_rating?: number
          total_plays?: number
          last_updated?: string
        }
        Update: {
          total_users?: number
          avg_completion_rate?: number
          avg_rating?: number
          total_plays?: number
          last_updated?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
