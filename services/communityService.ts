import { supabase } from './supabaseClient'
import { compressionService } from './compressionService'
import { userIdentityService } from './userIdentityService'
import { StudyMaterial } from '../types'

function generateTextHash(text: string): string {
  // Use a more robust hashing approach
  const normalizedText = text.trim().toLowerCase().replace(/\s+/g, ' ')
  let hash = 0
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

export interface CommunityMaterial {
  id: string
  title: string
  description: string | null
  original_text: string
  text_hash: string | null
  duration: number
  config: Record<string, any>
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane'
  provider_type: string
  tags: string[]
  user_uuid: string
  is_public: boolean
  compressed_data: string | null
  original_size: number | null
  compressed_size: number | null
  created_at: string
  sf_user_profiles?: {
    nickname: string | null
  }
  sf_material_analytics?: {
    total_users: number
    avg_rating: number
    total_plays: number
  }
}

export type MaterialFilter = 'all' | 'public' | 'my-public' | 'my-private'

const PAGE_SIZE = 12

export class CommunityService {
  private constructor() {}

  private static instance: CommunityService

  static getInstance(): CommunityService {
    if (!CommunityService.instance) {
      CommunityService.instance = new CommunityService()
    }
    return CommunityService.instance
  }

  async publishMaterial(
    material: StudyMaterial,
    type: 'public' | 'private',
    onProgress?: (progress: number, total: number) => void
  ): Promise<void> {
    const uuid = userIdentityService.getOrCreateUUID()

    // Ensure user profile exists in database (required by foreign key constraint)
    await userIdentityService.getOrCreateProfile()

    const canPublish = await userIdentityService.canPublish(type)
    if (!canPublish) {
      throw new Error(
        type === 'public' ? '已达到 Public 发布上限 (100)' : '已达到 Private 发布上限 (50)'
      )
    }

    onProgress?.(0, 100)

    const { data, compressedSize } = compressionService.compress(material)
    const originalSize = material.chunks.reduce((sum, c) => {
      return sum + (c.audioData?.length || 0) + c.text.length * 2
    }, 0)

    onProgress?.(30, 100)

    const textHash = generateTextHash(material.original_text)

    onProgress?.(40, 100)

    // Check if material with same text already exists
    const { data: existingMaterial } = await supabase
      .from('sf_materials')
      .select('id, title')
      .eq('text_hash', textHash)
      .single()

    if (existingMaterial) {
      throw new Error(
        `Material already exists: "${existingMaterial.title}" (ID: ${existingMaterial.id})`
      )
    }

    const materialData = {
      title: material.title,
      description: material.description,
      original_text: material.original_text,
      text_hash: textHash,
      duration: Math.round(material.duration),
      config: material.config,
      difficulty: material.config.difficulty,
      provider_type: material.config.provider_type,
      tags: material.config.tags || [],
      user_uuid: uuid,
      compressed_data: data,
      original_size: originalSize,
      compressed_size: compressedSize,
      is_public: type === 'public',
    }

    onProgress?.(50, 100)

    const { data: newMaterial, error: insertError } = await supabase
      .from('sf_materials')
      .insert(materialData)
      .select()
      .single()

    if (insertError) {
      console.error('Error publishing material:', insertError)
      throw insertError
    }

    onProgress?.(70, 100)

    const chunks = material.chunks.map((chunk, index) => ({
      material_id: newMaterial.id,
      chunk_index: index,
      text: chunk.text,
      translation: chunk.translation || null,
      start_time: parseFloat(chunk.start_time.toString()),
      end_time: parseFloat(chunk.end_time.toString()),
      speaker: chunk.speaker || null,
    }))

    const { error: chunksError } = await supabase.from('sf_chunks').insert(chunks)
    if (chunksError) {
      console.error('Error inserting chunks:', chunksError)
      throw chunksError
    }

    onProgress?.(85, 100)

    await supabase.from('sf_material_analytics').insert({
      material_id: newMaterial.id,
      total_users: 0,
      avg_completion_rate: 0,
      avg_rating: 0,
      total_plays: 0,
    })

    await userIdentityService.incrementPublishCount(type)

    onProgress?.(100, 100)
  }

  async getMaterials(
    filter: MaterialFilter,
    offset: number = 0,
    difficulty?: string
  ): Promise<CommunityMaterial[]> {
    let query = supabase
      .from('sf_materials')
      .select(
        `
        *,
        sf_user_profiles(nickname),
        sf_material_analytics(total_users, avg_rating, total_plays)
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    switch (filter) {
      case 'public':
        query = query.eq('is_public', true)
        break
      case 'my-public': {
        const uuid = userIdentityService.getUUID()
        if (uuid) {
          query = query.eq('is_public', true).eq('user_uuid', uuid)
        } else {
          return []
        }
        break
      }
      case 'my-private': {
        const uuid = userIdentityService.getUUID()
        if (uuid) {
          query = query.eq('is_public', false).eq('user_uuid', uuid)
        } else {
          return []
        }
        break
      }
      case 'all':
      default:
        break
    }

    if (difficulty && difficulty !== 'all') {
      query = query.eq('difficulty', difficulty)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching materials:', error)
      throw error
    }

    return data as CommunityMaterial[]
  }

  async downloadMaterial(materialId: string): Promise<StudyMaterial> {
    const { data, error } = await supabase
      .from('sf_materials')
      .select(
        `
        *,
        sf_user_profiles(nickname),
        sf_chunks(id, chunk_index, text, translation, start_time, end_time, speaker)
      `
      )
      .eq('id', materialId)
      .single()

    if (error) {
      console.error('Error fetching material:', error)
      throw error
    }

    if (data.compressed_data) {
      const material = compressionService.decompress(data.compressed_data)
      // Add author info from community data
      if (data.sf_user_profiles) {
        material.author = {
          nickname: data.sf_user_profiles.nickname,
          userUuid: data.user_uuid,
        }
      }
      return material
    }

    return this.convertToStudyMaterial(data)
  }

  async deleteMaterial(materialId: string): Promise<void> {
    const uuid = userIdentityService.getUUID()
    if (!uuid) {
      throw new Error('User not authenticated')
    }

    const { data: material, error: fetchError } = await supabase
      .from('sf_materials')
      .select('user_uuid, is_public')
      .eq('id', materialId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (material.user_uuid !== uuid) {
      throw new Error('Not authorized to delete this material')
    }

    const { error } = await supabase.from('sf_materials').delete().eq('id', materialId)

    if (error) {
      console.error('Error deleting material:', error)
      throw error
    }

    await userIdentityService.incrementPublishCount(material.is_public ? 'public' : 'private')
  }

  async toggleMaterialVisibility(materialId: string, isPublic: boolean): Promise<void> {
    const { error } = await supabase
      .from('sf_materials')
      .update({ is_public: isPublic })
      .eq('id', materialId)
      .eq('user_uuid', userIdentityService.getOrCreateUUID())

    if (error) {
      console.error('Error toggling material visibility:', error)
      throw error
    }

    // Update publish count
    await userIdentityService.incrementPublishCount(isPublic ? 'public' : 'private')
  }

  private convertToStudyMaterial(data: any): StudyMaterial {
    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      original_text: data.original_text,
      chunks: (data.sf_chunks || []).map((chunk: any) => ({
        id: chunk.id,
        text: chunk.text,
        translation: chunk.translation || undefined,
        start_time: Number(chunk.start_time),
        end_time: Number(chunk.end_time),
        speaker: chunk.speaker || null,
      })),
      duration: data.duration,
      config: data.config as any,
      createdAt: new Date(data.created_at).getTime(),
      ttsGenerated: false,
      author: data.sf_user_profiles
        ? {
            nickname: data.sf_user_profiles.nickname,
            userUuid: data.user_uuid,
          }
        : undefined,
    }
  }
}

export const communityService = CommunityService.getInstance()
