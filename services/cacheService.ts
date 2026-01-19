/**
 * Cache Service
 *
 * Manages audio and text caching using IndexedDB.
 * Provides LRU cache management with configurable limits.
 */

import { idbService, AudioCacheEntry, TextCacheEntry } from './indexedDBService'

const MAX_CACHE_ENTRIES = 500
const CLEANUP_THRESHOLD = 400

export interface CacheMetadata {
  cacheKey: string
  text: string
  speaker?: string
  mode?: string
  speed?: number
  timestamp: number
  size: number
}

export class CacheService {
  private idb = idbService
  private audioContext: AudioContext | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  private generateCacheKey(text: string, type: string, ...args: string[]): string {
    const hash = this.simpleHash(text)
    const params = args.filter(Boolean).join('_')
    return `${type}_${hash}${params ? '_' + params : ''}`
  }

  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  private async ensureInit(): Promise<void> {
    await this.idb.init()
  }

  private async cleanupIfNeeded(storeName: string): Promise<void> {
    const stats = await this.idb.getStats(storeName)
    if (stats.count > MAX_CACHE_ENTRIES) {
      console.log(`Cache cleanup triggered for ${storeName}, current: ${stats.count}`)
      await this.idb.deleteOldestEntries(storeName, CLEANUP_THRESHOLD)
    }
  }

  async setAudioCache(
    text: string,
    audioBuffer: ArrayBuffer,
    metadata: {
      speaker?: string
      mode?: string
      speed?: number
    }
  ): Promise<string> {
    await this.ensureInit()

    const cacheKey = this.generateCacheKey(
      text,
      'audio',
      metadata.speaker || '',
      metadata.mode || '',
      metadata.speed?.toString() || ''
    )

    const entry: AudioCacheEntry = {
      cacheKey,
      audioBuffer,
      text,
      speaker: metadata.speaker,
      mode: metadata.mode,
      speed: metadata.speed,
      timestamp: Date.now(),
      size: audioBuffer.byteLength,
    }

    await this.idb.put('audioCache', entry, cacheKey)
    await this.cleanupIfNeeded('audioCache')

    console.log(`Audio cached: ${cacheKey}, size: ${(audioBuffer.byteLength / 1024).toFixed(2)}KB`)
    return cacheKey
  }

  async getAudioCache(cacheKey: string): Promise<AudioBuffer | null> {
    try {
      await this.ensureInit()

      const entry = await this.idb.get<AudioCacheEntry>('audioCache', cacheKey)
      if (!entry) {
        console.log(`Audio cache miss: ${cacheKey}`)
        return null
      }

      console.log(`Audio cache hit: ${cacheKey}`)
      return await this.audioContext!.decodeAudioData(entry.audioBuffer.slice(0))
    } catch (error) {
      console.warn('Failed to get audio cache:', error)
      return null
    }
  }

  async findAudioCache(
    text: string,
    metadata: {
      speaker?: string
      mode?: string
      speed?: number
    }
  ): Promise<{ cacheKey: string; audioBuffer: AudioBuffer } | null> {
    await this.ensureInit()

    const targetKey = this.generateCacheKey(
      text,
      'audio',
      metadata.speaker || '',
      metadata.mode || '',
      metadata.speed?.toString() || ''
    )

    const entry = await this.idb.get<AudioCacheEntry>('audioCache', targetKey)
    if (!entry) return null

    const audioBuffer = await this.audioContext!.decodeAudioData(entry.audioBuffer.slice(0))
    return { cacheKey: targetKey, audioBuffer }
  }

  async setTextCache(text: string, language?: string): Promise<string> {
    await this.ensureInit()

    const cacheKey = this.generateCacheKey(text, 'text', language || '')

    const entry: TextCacheEntry = {
      cacheKey,
      content: text,
      language,
      timestamp: Date.now(),
      size: new Blob([text]).size,
    }

    await this.idb.put('textCache', entry, cacheKey)
    await this.cleanupIfNeeded('textCache')

    return cacheKey
  }

  async getTextCache(cacheKey: string): Promise<string | null> {
    await this.ensureInit()

    const entry = await this.idb.get<TextCacheEntry>('textCache', cacheKey)
    return entry?.content || null
  }

  async findTextCache(text: string, language?: string): Promise<string | null> {
    await this.ensureInit()

    const targetKey = this.generateCacheKey(text, 'text', language || '')
    const entry = await this.idb.get<TextCacheEntry>('textCache', targetKey)
    return entry?.content || null
  }

  async getCacheStats(): Promise<{
    audio: { count: number; size: number }
    text: { count: number; size: number }
  }> {
    await this.ensureInit()

    const [audioStats, textStats] = await Promise.all([
      this.idb.getStats('audioCache'),
      this.idb.getStats('textCache'),
    ])

    return {
      audio: { count: audioStats.count, size: audioStats.totalSize },
      text: { count: textStats.count, size: textStats.totalSize },
    }
  }

  async clearAllCaches(): Promise<void> {
    await this.ensureInit()

    await Promise.all([this.idb.clear('audioCache'), this.idb.clear('textCache')])

    console.log('All caches cleared')
  }

  async cleanup(maxEntries: number = MAX_CACHE_ENTRIES): Promise<number> {
    await this.ensureInit()

    let deletedCount = 0

    const audioStats = await this.idb.getStats('audioCache')
    if (audioStats.count > maxEntries) {
      deletedCount += await this.idb.deleteOldestEntries('audioCache', maxEntries)
    }

    const textStats = await this.idb.getStats('textCache')
    if (textStats.count > maxEntries) {
      deletedCount += await this.idb.deleteOldestEntries('textCache', maxEntries)
    }

    if (deletedCount > 0) {
      console.log(`Cleanup completed, deleted ${deletedCount} entries`)
    }

    return deletedCount
  }

  async deleteAudioCache(cacheKey: string): Promise<void> {
    await this.ensureInit()
    await this.idb.delete('audioCache', cacheKey)
  }

  async deleteTextCache(cacheKey: string): Promise<void> {
    await this.ensureInit()
    await this.idb.delete('textCache', cacheKey)
  }

  async getAllAudioCache(): Promise<CacheMetadata[]> {
    await this.ensureInit()

    const entries = await this.idb.getAll<AudioCacheEntry>('audioCache')
    return entries.map(e => ({
      cacheKey: e.cacheKey,
      text: e.text,
      speaker: e.speaker,
      mode: e.mode,
      speed: e.speed,
      timestamp: e.timestamp,
      size: e.size,
    }))
  }
}

export const cacheService = new CacheService()
