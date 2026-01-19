/**
 * CosyVoice TTS Service
 *
 * Service for generating speech using CosyVoice with word-level timestamps.
 * Communicates with the Python FastAPI backend.
 *
 * API Base: http://localhost:9880
 * Endpoints:
 *   - GET  /health - Health check
 *   - GET  /speakers - List speakers
 *   - POST /speakers - Create custom speaker
 *   - DELETE /speakers/{id} - Delete speaker
 *   - POST /tts - Text-to-speech
 */

import { AIService } from './aiService'
import { Chunk, WordTimestamp, StudyMaterial, ContentType, SpeakerGender } from '../types'

export interface CosyVoiceConfig {
  apiUrl: string
  mode: string
  speaker: string
  speed: number
  enableAlignment: boolean
}

export interface TTSResponse {
  success: boolean
  audio_data?: string
  format?: string
  duration?: number
  words?: WordTimestamp[]
  sample_rate?: number
  channels?: number
  error?: string
  detail?: string
}

export interface HealthResponse {
  status: string
  model_loaded: boolean
  model_version: string
  speakers_count: number
  available_modes: string[]
}

export interface SpeakersResponse {
  speakers: string[]
  count: number
  mode: string
}

export class CosyVoiceService extends AIService {
  private baseUrl: string
  private cosyConfig: CosyVoiceConfig

  constructor(config: { apiKey?: string; baseUrl?: string } & Partial<CosyVoiceConfig>) {
    super({ apiKey: config.apiKey || '' })
    this.baseUrl = config.baseUrl || 'http://localhost:9880'
    this.cosyConfig = {
      apiUrl: this.baseUrl,
      mode: config.mode || 'instruct2',
      speaker: config.speaker || '中文女',
      speed: config.speed || 1.0,
      enableAlignment: config.enableAlignment ?? true,
    }
  }

  /**
   * Generate chunks is not supported by CosyVoice service
   * Use an AI service (OpenAI, Gemini, etc.) for content generation
   */
  async generateChunks(
    topic: string,
    difficulty: string,
    contentType: ContentType = 'monologue',
    speakerGender?: SpeakerGender
  ): Promise<StudyMaterial> {
    throw new Error(
      'CosyVoiceService is for TTS only. Use an AI service (OpenAI, Gemini, DeepSeek) for content generation.'
    )
  }

  /**
   * Get the API mode based on UI mode selection
   */
  private getApiMode(uiMode: string): string {
    const modeMap: Record<string, string> = {
      预训练音色: 'sft',
      '3s极速复刻': 'zero_shot',
      跨语种复刻: 'cross_lingual',
      自然语言控制: 'instruct2',
    }
    return modeMap[uiMode] || 'sft'
  }

  /**
   * Generate audio with word-level timestamps
   */
  async generateAudioWithTimestamps(text: string, language: string = 'en'): Promise<{
    audio: ArrayBuffer
    words: WordTimestamp[]
    duration: number
  }> {
    const apiMode = this.getApiMode(this.cosyConfig.mode)

    const requestBody: Record<string, any> = {
      mode: apiMode,
      text: text,
      speed: this.cosyConfig.speed,
      language: language,  // Pass language for WhisperX alignment
    }

    // Mode-specific parameters
    if (apiMode === 'sft') {
      // SFT模式: 使用内置说话人
      requestBody.speaker_id = this.cosyConfig.speaker
    } else if (apiMode === 'zero_shot') {
      // Zero-shot模式: 使用已保存的说话人（通过speaker_id）
      requestBody.speaker_id = this.cosyConfig.speaker
    } else if (apiMode === 'cross_lingual') {
      throw new Error('Cross-lingual mode requires prompt_audio. Use a preset speaker instead.')
    } else if (apiMode === 'instruct2') {
      requestBody.speaker_id = this.cosyConfig.speaker
      requestBody.instruct_text = '用自然的方式说这句话<|endofprompt|>'
    }

    const response = await fetch(`${this.baseUrl}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData: TTSResponse = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(
        `CosyVoice API error (${response.status}): ${errorData.detail || errorData.error || 'Unknown error'}`
      )
    }

    const data: TTSResponse = await response.json()

    if (!data.success) {
      throw new Error(data.detail || data.error || 'CosyVoice generation failed')
    }

    if (!data.audio_data) {
      throw new Error('No audio data in response')
    }

    const audioBinary = atob(data.audio_data)
    const audioBytes = new Uint8Array(audioBinary.length)
    for (let i = 0; i < audioBinary.length; i++) {
      audioBytes[i] = audioBinary.charCodeAt(i)
    }

    return {
      audio: audioBytes.buffer,
      words: data.words || [],
      duration: data.duration || 0,
    }
  }

  /**
   * Generate audio without timestamps (standard AIService interface)
   */
  async generateAudio(text: string): Promise<ArrayBuffer> {
    const result = await this.generateAudioWithTimestamps(text)
    return result.audio
  }

  /**
   * Test TTS - generates audio for testing purposes
   */
  async testTTS(text?: string): Promise<ArrayBuffer> {
    const testText = text || 'Hello, this is a test of the text-to-speech system.'
    const result = await this.generateAudioWithTimestamps(testText)
    return result.audio
  }

  /**
   * Enrich a chunk with word-level timestamps
   */
  async enrichChunkWithTimestamps(chunk: Chunk): Promise<Chunk> {
    try {
      const result = await this.generateAudioWithTimestamps(chunk.text)
      return {
        ...chunk,
        words: result.words,
      }
    } catch (error) {
      console.warn('Failed to enrich chunk with timestamps:', error)
      return chunk
    }
  }

  /**
   * Batch enrich chunks with timestamps
   */
  async enrichChunksWithTimestamps(chunks: Chunk[]): Promise<Chunk[]> {
    const enrichedChunks = await Promise.all(
      chunks.map(chunk => this.enrichChunkWithTimestamps(chunk))
    )
    return enrichedChunks
  }

  /**
   * Check if the backend service is healthy
   */
  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      if (!response.ok) {
        return {
          status: 'unhealthy',
          model_loaded: false,
          model_version: 'unknown',
          speakers_count: 0,
          available_modes: [],
        }
      }
      return await response.json()
    } catch {
      return {
        status: 'unreachable',
        model_loaded: false,
        model_version: 'unknown',
        speakers_count: 0,
        available_modes: [],
      }
    }
  }

  /**
   * Get available speakers from the backend
   */
  async getSpeakers(): Promise<SpeakersResponse> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3秒超时

      const response = await fetch(`${this.baseUrl}/speakers`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        return this.getDefaultSpeakers()
      }
      return await response.json()
    } catch (error) {
      // Silently return default speakers for network/CORS errors
      return this.getDefaultSpeakers()
    }
  }

  /**
   * Get available voice options (modes, speakers, speed range)
   */
  async getVoiceOptions(): Promise<{
    modes: string[]
    speakers: Array<{ id: string; name: string; language: string }>
    speed_range: { min: number; max: number; default: number; step: number }
  }> {
    try {
      const speakers = await this.getSpeakers()
      return {
        modes: ['预训练音色', '3s极速复刻', '跨语种复刻', '自然语言控制'],
        speakers: speakers.speakers.map((id: string) => ({
          id,
          name: this.getSpeakerDisplayName(id),
          language: this.getSpeakerLanguage(id),
        })),
        speed_range: {
          min: 0.5,
          max: 2.0,
          default: 1.0,
          step: 0.1,
        },
      }
    } catch {
      return this.getDefaultVoiceOptions()
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CosyVoiceConfig>): void {
    this.cosyConfig = { ...this.cosyConfig, ...config }
    if (config.apiUrl) {
      this.baseUrl = config.apiUrl
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CosyVoiceConfig {
    return { ...this.cosyConfig }
  }

  private getDefaultVoiceOptions() {
    return {
      modes: ['预训练音色', '3s极速复刻', '跨语种复刻', '自然语言控制'],
      speakers: [
        { id: '中文女', name: 'Chinese Female', language: 'zh' },
        { id: '中文男', name: 'Chinese Male', language: 'zh' },
        { id: '日语女', name: 'Japanese Female', language: 'ja' },
        { id: '日语男', name: 'Japanese Male', language: 'ja' },
        { id: '粤语女', name: 'Cantonese Female', language: 'yue' },
        { id: '粤语男', name: 'Cantonese Male', language: 'yue' },
        { id: '英文女', name: 'English Female', language: 'en' },
        { id: '英文男', name: 'English Male', language: 'en' },
        { id: '韩语女', name: 'Korean Female', language: 'ko' },
      ],
      speed_range: {
        min: 0.5,
        max: 2.0,
        default: 1.0,
        step: 0.1,
      },
    }
  }

  private getDefaultSpeakers(): SpeakersResponse {
    return {
      speakers: ['中文女', '中文男', '日语女', '日语男', '英文女', '英文男', '韩语女'],
      count: 7,
      mode: 'sft',
    }
  }

  private getSpeakerDisplayName(speakerId: string): string {
    const names: Record<string, string> = {
      中文女: 'Chinese Female',
      中文男: 'Chinese Male',
      日语女: 'Japanese Female',
      日语男: 'Japanese Male',
      粤语女: 'Cantonese Female',
      粤语男: 'Cantonese Male',
      英文女: 'English Female',
      英文男: 'English Male',
      韩语女: 'Korean Female',
      韩语男: 'Korean Male',
    }
    return names[speakerId] || speakerId
  }

  private getSpeakerLanguage(speakerId: string): string {
    const languages: Record<string, string> = {
      中文女: 'zh',
      中文男: 'zh',
      日语女: 'ja',
      日语男: 'ja',
      粤语女: 'yue',
      粤语男: 'yue',
      英文女: 'en',
      英文男: 'en',
      韩语女: 'ko',
      韩语男: 'ko',
    }
    return languages[speakerId] || 'unknown'
  }
}
