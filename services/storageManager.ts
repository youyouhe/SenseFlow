/**
 * Storage Manager
 *
 * Unified storage interface for SenseFlow.
 * Manages settings, materials, audio cache, and exchange data.
 * Uses IndexedDB for persistent storage.
 */

import { idbService } from './indexedDBService'
import { cacheService } from './cacheService'
import { UserSettings, StudyMaterial, Chunk, WordTimestamp, UserProgress } from '../types'

const SETTINGS_ID = 'main'

export interface StorageStats {
  settings: boolean
  materialsCount: number
  audioCache: { count: number; size: number }
  textCache: { count: number; size: number }
  totalSize: number
}

export interface AudioGenerationResult {
  cacheKey: string
  audioBuffer: AudioBuffer
  wordTimestamps?: WordTimestamp[]
  duration: number
}

export class StorageManager {
  private idb = idbService
  private cache = cacheService
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return

    await this.idb.init()
    await this.cache.cleanup()

    this.initialized = true
    console.log('StorageManager initialized')
  }

  private ensureInit(): Promise<void> {
    if (!this.initialized) {
      return this.init()
    }
    return Promise.resolve()
  }

  async getSettings(): Promise<UserSettings | null> {
    await this.ensureInit()
    return await this.idb.get<UserSettings>('settings', SETTINGS_ID)
  }

  async setSettings(settings: UserSettings): Promise<void> {
    await this.ensureInit()
    const settingsWithId = { ...settings, id: SETTINGS_ID }
    await this.idb.put('settings', settingsWithId)
    console.log('Settings saved')
  }

  async getSimpleValue<T>(key: string, defaultValue: T): Promise<T> {
    await this.ensureInit()
    const entry = await this.idb.get<{ value: T }>('simpleValues', key)
    return entry?.value ?? defaultValue
  }

  async setSimpleValue<T>(key: string, value: T): Promise<void> {
    await this.ensureInit()
    await this.idb.put('simpleValues', { value }, key)
  }

  async getMaterials(): Promise<StudyMaterial[]> {
    await this.ensureInit()
    return await this.idb.getAll<StudyMaterial>('materials')
  }

  async getMaterial(id: string): Promise<StudyMaterial | null> {
    await this.ensureInit()
    return await this.idb.get<StudyMaterial>('materials', id)
  }

  async saveMaterial(material: StudyMaterial): Promise<void> {
    await this.ensureInit()

    await this.ensureMaterialLimit()

    if (!material.createdAt) {
      material.createdAt = Date.now()
    }
    material.ttsGenerated = material.chunks.some(chunk => chunk.audioData !== undefined)

    await this.idb.put('materials', material)
    console.log(`Material saved: ${material.id}`)
  }

  async ensureMaterialLimit(limit: number = 500): Promise<void> {
    const materials = await this.getAllMaterials()
    if (materials.length >= limit) {
      const sorted = materials.sort((a, b) => a.createdAt - b.createdAt)
      const toDelete = sorted.slice(0, materials.length - limit + 1)
      for (const m of toDelete) {
        await this.deleteMaterial(m.id)
      }
    }
  }

  async deleteMaterial(id: string): Promise<void> {
    await this.ensureInit()
    const material = await this.getMaterial(id)
    if (material) {
      for (const chunk of material.chunks) {
        if (chunk.audioData) {
          const cacheKey = this.getChunkCacheKey(chunk)
          await this.cache.deleteAudioCache(cacheKey)
        }
      }
    }
    await this.idb.delete('materials', id)
    console.log(`Material deleted: ${id}`)
  }

  private getChunkCacheKey(chunk: { id: string; text: string }): string {
    const textHash = Array.from(chunk.text).reduce(
      (hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0,
      0
    )
    return `chunk_${chunk.id}_${textHash}`
  }

  async getAllMaterials(): Promise<StudyMaterial[]> {
    await this.ensureInit()
    return await this.idb.getAll<StudyMaterial>('materials')
  }

  async clearMaterials(): Promise<void> {
    await this.ensureInit()
    await this.idb.clear('materials')
  }

  async cacheAudio(
    text: string,
    audioBuffer: ArrayBuffer,
    metadata: {
      speaker?: string
      mode?: string
      speed?: number
    }
  ): Promise<string> {
    await this.ensureInit()
    return await this.cache.setAudioCache(text, audioBuffer, metadata)
  }

  async getCachedAudio(
    text: string,
    metadata: {
      speaker?: string
      mode?: string
      speed?: number
    }
  ): Promise<AudioBuffer | null> {
    await this.ensureInit()
    const result = await this.cache.findAudioCache(text, metadata)
    return result?.audioBuffer || null
  }

  async getCachedAudioByKey(cacheKey: string): Promise<AudioBuffer | null> {
    await this.ensureInit()
    return await this.cache.getAudioCache(cacheKey)
  }

  async clearAudioCache(): Promise<void> {
    await this.ensureInit()
    await this.idb.clear('audioCache')
  }

  async getAudioCacheStats(): Promise<{ count: number; size: number }> {
    await this.ensureInit()
    const stats = await this.cache.getCacheStats()
    return stats.audio
  }

  async saveExchangeData(
    id: string,
    type: 'material' | 'progress' | 'config' | 'audio',
    data: any
  ): Promise<void> {
    await this.ensureInit()

    const exchangeData = {
      id,
      type,
      data,
      version: 1,
      timestamp: Date.now(),
    }

    await this.idb.put('exchangeData', exchangeData, id)
    console.log(`Exchange data saved: ${id}`)
  }

  async getExchangeData(id: string): Promise<any> {
    await this.ensureInit()
    const entry = await this.idb.get<any>('exchangeData', id)
    return entry?.data || null
  }

  async getExchangeDataByType(type: string): Promise<any[]> {
    await this.ensureInit()
    const all = await this.idb.getAll<any>('exchangeData')
    return all.filter(e => e.type === type)
  }

  async deleteExchangeData(id: string): Promise<void> {
    await this.ensureInit()
    await this.idb.delete('exchangeData', id)
  }

  async getStorageStats(): Promise<StorageStats> {
    await this.ensureInit()

    const settings = await this.getSettings()
    const materials = await this.getAllMaterials()
    const cacheStats = await this.cache.getCacheStats()

    return {
      settings: !!settings,
      materialsCount: materials.length,
      audioCache: cacheStats.audio,
      textCache: cacheStats.text,
      totalSize: cacheStats.audio.size + cacheStats.text.size,
    }
  }

  async clearAll(): Promise<void> {
    await this.ensureInit()

    await Promise.all([
      this.idb.clear('settings'),
      this.idb.clear('materials'),
      this.idb.clear('audioCache'),
      this.idb.clear('textCache'),
      this.idb.clear('exchangeData'),
    ])

    console.log('All storage cleared')
  }

  async cleanup(): Promise<number> {
    await this.ensureInit()
    return await this.cache.cleanup()
  }

  async isReady(): Promise<boolean> {
    return this.initialized
  }

  async close(): Promise<void> {
    await this.idb.close()
    this.initialized = false
  }
}

export const storageManager = new StorageManager()
