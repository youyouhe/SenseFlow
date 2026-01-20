// Data service for managing SenseFlow learning materials and user data
import { supabase, Database } from './supabaseClient'
import { StudyMaterial } from '../types'

export interface MaterialWithAnalytics {
  id: string
  title: string
  description: string | null
  original_text: string
  duration: number
  config: Record<string, any>
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane'
  provider_type: 'edge' | 'openai' | 'local' | 'gemini' | 'deepseek'
  tags: string[]
  is_public: boolean
  author_id: string | null
  created_at: string
  updated_at: string
  sf_chunks: any[]
  sf_material_analytics: any | null
  sf_user_progress?: any | null
}

export class DataService {
  // Materials management
  async getPublicMaterials(limit: number = 20, offset: number = 0, difficulty?: string) {
    try {
      let query = supabase
        .from('sf_materials')
        .select(
          `
          *,
          sf_chunks(id, chunk_index, text, translation, start_time, end_time),
          sf_material_analytics(total_users, avg_rating, total_plays),
          author:author_id(username, avatar_url)
        `
        )
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (difficulty && difficulty !== 'all') {
        query = query.eq('difficulty', difficulty)
      }

      const { data, error } = await query

      if (error) throw error
      return data as MaterialWithAnalytics[]
    } catch (error) {
      console.error('Get public materials error:', error)
      throw error
    }
  }

  async getUserMaterials(userId: string) {
    try {
      const { data, error } = await supabase
        .from('sf_materials')
        .select(
          `
          *,
          sf_chunks(id, chunk_index, text, translation, start_time, end_time),
          sf_material_analytics(total_users, avg_rating, total_plays)
        `
        )
        .eq('author_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as MaterialWithAnalytics[]
    } catch (error) {
      console.error('Get user materials error:', error)
      throw error
    }
  }

  async getMaterialById(materialId: string, userId?: string) {
    try {
      const { data, error } = await supabase
        .from('sf_materials')
        .select(
          `
          *,
          sf_chunks(id, chunk_index, text, translation, start_time, end_time),
          sf_material_analytics(total_users, avg_rating, total_plays),
          author:author_id(username, avatar_url)
        `
        )
        .eq('id', materialId)
        .single()

      if (error) throw error

      // Check if user has progress on this material
      if (userId) {
        const { data: progressData } = await supabase
          .from('sf_user_progress')
          .select('*')
          .eq('material_id', materialId)
          .eq('user_id', userId)
          .single()

        return { ...data, sf_user_progress: progressData } as MaterialWithAnalytics
      }

      return data as MaterialWithAnalytics
    } catch (error) {
      console.error('Get material by ID error:', error)
      throw error
    }
  }

  async createMaterial(
    material: Omit<Database['public']['Tables']['sf_materials']['Insert'], 'id'>,
    chunks: Database['public']['Tables']['sf_chunks']['Insert'][]
  ) {
    try {
      // Start a transaction-like operation
      const { data: materialData, error: materialError } = await supabase
        .from('sf_materials')
        .insert(material)
        .select()
        .single()

      if (materialError) throw materialError

      const materialId = materialData.id

      // Insert chunks
      const { error: chunksError } = await supabase.from('sf_chunks').insert(
        chunks.map((chunk, index) => ({
          ...chunk,
          material_id: materialId,
          chunk_index: index,
        }))
      )

      if (chunksError) throw chunksError

      // Initialize analytics
      await supabase.from('sf_material_analytics').insert({
        material_id: materialId,
        total_users: 0,
        avg_completion_rate: 0,
        avg_rating: 0,
        total_plays: 0,
      })

      return materialData
    } catch (error) {
      console.error('Create material error:', error)
      throw error
    }
  }

  async updateMaterial(
    materialId: string,
    updates: Database['public']['Tables']['sf_materials']['Update']
  ) {
    try {
      const { data, error } = await supabase
        .from('sf_materials')
        .update(updates)
        .eq('id', materialId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Update material error:', error)
      throw error
    }
  }

  async deleteMaterial(materialId: string) {
    try {
      const { error } = await supabase.from('sf_materials').delete().eq('id', materialId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Delete material error:', error)
      throw error
    }
  }

  // User progress management
  async getUserProgress(userId: string, materialId?: string) {
    try {
      let query = supabase
        .from('sf_user_progress')
        .select(
          `
          *,
          sf_materials(id, title, difficulty, duration)
        `
        )
        .eq('user_id', userId)
        .order('last_accessed', { ascending: false })

      if (materialId) {
        query = query.eq('material_id', materialId)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get user progress error:', error)
      throw error
    }
  }

  async updateUserProgress(
    progress: Database['public']['Tables']['sf_user_progress']['Update'],
    userId: string,
    materialId: string
  ) {
    try {
      const { data, error } = await supabase
        .from('sf_user_progress')
        .upsert({
          ...progress,
          user_id: userId,
          material_id: materialId,
          last_accessed: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Update user progress error:', error)
      throw error
    }
  }

  // Training sessions
  async createTrainingSession(
    session: Database['public']['Tables']['sf_training_sessions']['Insert']
  ) {
    try {
      const { data, error } = await supabase
        .from('sf_training_sessions')
        .insert(session)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Create training session error:', error)
      throw error
    }
  }

  async updateTrainingSession(
    sessionId: string,
    updates: Database['public']['Tables']['sf_training_sessions']['Update']
  ) {
    try {
      const { data, error } = await supabase
        .from('sf_training_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Update training session error:', error)
      throw error
    }
  }

  async getTrainingSessions(userId: string, limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('sf_training_sessions')
        .select(
          `
          *,
          sf_materials(id, title, difficulty)
        `
        )
        .eq('user_id', userId)
        .order('start_time', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get training sessions error:', error)
      throw error
    }
  }

  // Favorites management
  async getFavorites(userId: string) {
    try {
      const { data, error } = await supabase
        .from('sf_user_favorites')
        .select(
          `
          *,
          sf_materials(id, title, description, difficulty, duration, created_at)
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get favorites error:', error)
      throw error
    }
  }

  async addToFavorites(userId: string, materialId: string) {
    try {
      const { error } = await supabase
        .from('sf_user_favorites')
        .insert({ user_id: userId, material_id: materialId })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Add to favorites error:', error)
      throw error
    }
  }

  async removeFromFavorites(userId: string, materialId: string) {
    try {
      const { error } = await supabase
        .from('sf_user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('material_id', materialId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Remove from favorites error:', error)
      throw error
    }
  }

  // Ratings management
  async getMaterialRatings(materialId: string) {
    try {
      const { data, error } = await supabase
        .from('sf_material_ratings')
        .select(
          `
          *,
          sf_users(username, avatar_url)
        `
        )
        .eq('material_id', materialId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get material ratings error:', error)
      throw error
    }
  }

  async rateMaterial(userId: string, materialId: string, rating: number, review?: string) {
    try {
      const { data, error } = await supabase
        .from('sf_material_ratings')
        .upsert({
          user_id: userId,
          material_id: materialId,
          rating,
          review,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Rate material error:', error)
      throw error
    }
  }

  // Search materials
  async searchMaterials(query: string, userId?: string, difficulty?: string, tags?: string[]) {
    try {
      let dbQuery = supabase
        .from('sf_materials')
        .select(
          `
          *,
          sf_chunks(id, chunk_index, text, translation, start_time, end_time),
          sf_material_analytics(total_users, avg_rating, total_plays),
          author:author_id(username, avatar_url)
        `
        )
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,original_text.ilike.%${query}%`)
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (difficulty && difficulty !== 'all') {
        dbQuery = dbQuery.eq('difficulty', difficulty)
      }

      if (tags && tags.length > 0) {
        dbQuery = dbQuery.contains('tags', tags)
      }

      const { data, error } = await dbQuery

      if (error) throw error
      return data as MaterialWithAnalytics[]
    } catch (error) {
      console.error('Search materials error:', error)
      throw error
    }
  }

  // Convert Supabase material to StudyMaterial type
  convertToStudyMaterial(supabaseMaterial: MaterialWithAnalytics): StudyMaterial {
    return {
      id: supabaseMaterial.id,
      title: supabaseMaterial.title,
      description: supabaseMaterial.description || '',
      original_text: supabaseMaterial.original_text,
      chunks: supabaseMaterial.sf_chunks.map(chunk => ({
        id: chunk.id,
        text: chunk.text,
        translation: chunk.translation || undefined,
        start_time: Number(chunk.start_time),
        end_time: Number(chunk.end_time),
        speaker: (chunk as any).speaker || null,
      })),
      duration: supabaseMaterial.duration,
      config: supabaseMaterial.config as any,
      createdAt: new Date(supabaseMaterial.created_at).getTime(),
      ttsGenerated: false,
    }
  }

  // Export materials to JSON file
  exportToJSON(materials: StudyMaterial[]): string {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      materials: materials,
    }
    return JSON.stringify(exportData, null, 2)
  }

  // Download materials as JSON file
  downloadAsJSON(materials: StudyMaterial[], filename: string = 'senseflow-materials.json'): void {
    const json = this.exportToJSON(materials)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Import materials from JSON file
  async importFromJSON(jsonString: string): Promise<StudyMaterial[]> {
    try {
      const data = JSON.parse(jsonString)
      if (!data.materials || !Array.isArray(data.materials)) {
        throw new Error('Invalid JSON format: missing materials array')
      }

      const materials: StudyMaterial[] = data.materials.map((m: any, index: number) => ({
        id: m.id || `imported_${Date.now()}_${index}`,
        title: m.title || 'Imported Material',
        description: m.description || '',
        original_text: m.original_text || '',
        chunks: (m.chunks || []).map((c: any, chunkIndex: number) => ({
          id: c.id || `chunk_${chunkIndex}`,
          text: c.text || '',
          translation: c.translation,
          start_time: c.start_time || 0,
          end_time: c.end_time || 0,
          speaker: c.speaker || null,
        })),
        duration: m.duration || 0,
        config: m.config || {
          recommended_speed: 1.0,
          recommended_noise_level: 0.2,
          provider_type: 'edge' as const,
          tags: ['imported'],
          difficulty: 'Medium' as const,
          content_type: 'monologue' as const,
        },
      }))

      return materials
    } catch (error) {
      console.error('Import error:', error)
      throw error
    }
  }

  // Upload single material to cloud
  async uploadMaterial(material: StudyMaterial, userId: string, isPublic: boolean = false) {
    try {
      const materialData = {
        title: material.title,
        description: material.description,
        original_text: material.original_text,
        duration: material.duration,
        config: material.config,
        difficulty: material.config.difficulty,
        provider_type: material.config.provider_type,
        tags: material.config.tags || [],
        is_public: isPublic,
        author_id: userId,
      }

      const { data: newMaterial, error: materialError } = await supabase
        .from('sf_materials')
        .insert(materialData)
        .select()
        .single()

      if (materialError) throw materialError

      const chunks = material.chunks.map((chunk, index) => ({
        material_id: newMaterial.id,
        chunk_index: index,
        text: chunk.text,
        translation: chunk.translation || null,
        start_time: Math.floor(Number(chunk.start_time)),
        end_time: Math.floor(Number(chunk.end_time)),
        speaker: chunk.speaker || null,
      }))

      const { error: chunksError } = await supabase.from('sf_chunks').insert(chunks)
      if (chunksError) throw chunksError

      await supabase.from('sf_material_analytics').insert({
        material_id: newMaterial.id,
        total_users: 0,
        avg_completion_rate: 0,
        avg_rating: 0,
        total_plays: 0,
      })

      return newMaterial
    } catch (error) {
      console.error('Upload material error:', error)
      throw error
    }
  }
}

export const dataService = new DataService()
