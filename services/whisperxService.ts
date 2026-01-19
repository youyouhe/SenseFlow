/**
 * WhisperX Alignment Service
 *
 * Service for speech-to-text transcription with word-level timestamps.
 * Used for generating alignment data when CosyVoice timestamps are not available.
 *
 * API Base: http://localhost:8000
 * Endpoints:
 *   - GET  /health - Health check
 *   - GET  /v1/models - List available models
 *   - POST /v1/transcribe/sync - Synchronous transcription (short audio)
 *   - POST /v1/transcribe - Asynchronous transcription (long audio)
 *   - GET  /v1/tasks/{task_id} - Task status
 *   - GET  /v1/tasks/{task_id}/result - Get result
 */

import { WordTimestamp } from '../types'

export interface WhisperXConfig {
  apiUrl: string
  model: string
  language: string
  enableAlignment: boolean
  enableDiarization: boolean
}

export interface HealthStatus {
  status: string
  version: string
  gpu_available: boolean
  gpu_device?: string
  memory_used: number
  memory_total: number
  active_tasks: number
}

export interface ModelList {
  whisper: Array<{ name: string; type: string; size: string; loaded: boolean }>
  alignment: Array<{ name: string; type: string; language: string; loaded: boolean }>
  diarization: { name: string; type: string; loaded: boolean }
}

export interface TranscribeOptions {
  language?: string
  model?: string
  alignOutput?: boolean
  diarize?: boolean
  compute_type?: string
}

export interface WordResult {
  word: string
  start: number
  end: number
  score?: number
  speaker?: string
}

export interface SegmentResult {
  id: number
  start: number
  end: number
  text: string
  speaker?: string
  words?: WordResult[]
}

export interface TranscriptionResult {
  segments: SegmentResult[]
  language: string
  language_probability?: number
  duration: number
  model: string
  device?: string
}

export class WhisperXService {
  private baseUrl: string
  private defaultConfig: WhisperXConfig

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.defaultConfig = {
      apiUrl: this.baseUrl,
      model: 'large-v2',
      language: 'en',
      enableAlignment: true,
      enableDiarization: false,
    }
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      if (!response.ok) {
        return {
          status: 'unhealthy',
          version: 'unknown',
          gpu_available: false,
          memory_used: 0,
          memory_total: 0,
          active_tasks: 0,
        }
      }
      return await response.json()
    } catch {
      return {
        status: 'unreachable',
        version: 'unknown',
        gpu_available: false,
        memory_used: 0,
        memory_total: 0,
        active_tasks: 0,
      }
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<ModelList> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`)
      if (!response.ok) {
        return this.getDefaultModels()
      }
      return await response.json()
    } catch {
      return this.getDefaultModels()
    }
  }

  /**
   * Transcribe audio synchronously (for short audio < 30s)
   * @param audioBuffer - The audio data to transcribe
   * @param options - Transcription options
   * @returns Transcription result with word-level timestamps
   */
  async transcribe(
    audioBuffer: ArrayBuffer,
    options: TranscribeOptions = {}
  ): Promise<TranscriptionResult> {
    const config = { ...this.defaultConfig, ...options }

    const formData = new FormData()

    const blob = new Blob([audioBuffer], { type: 'audio/wav' })
    formData.append('audio', blob, 'audio.wav')

    formData.append('model', config.model)
    formData.append('language', config.language)
    formData.append('align_output', String(config.enableAlignment))
    formData.append('compute_type', 'int8')

    if (config.diarize) {
      formData.append('diarize', 'true')
    }

    const response = await fetch(`${this.baseUrl}/v1/transcribe/sync`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(
        `WhisperX API error (${response.status}): ${error.detail || error.error || 'Unknown error'}`
      )
    }

    const result = await response.json()

    if (result.result) {
      return result.result
    }

    return result
  }

  /**
   * Transcribe audio asynchronously (for longer audio)
   * @param audioBuffer - The audio data to transcribe
   * @param options - Transcription options
   * @returns Task ID for polling
   */
  async transcribeAsync(
    audioBuffer: ArrayBuffer,
    options: TranscribeOptions = {}
  ): Promise<{ task_id: string }> {
    const config = { ...this.defaultConfig, ...options }

    const formData = new FormData()
    const blob = new Blob([audioBuffer], { type: 'audio/wav' })
    formData.append('audio', blob, 'audio.wav')
    formData.append('model', config.model)
    formData.append('language', config.language)
    formData.append('align_output', String(config.enableAlignment))
    formData.append('compute_type', 'int8')

    if (config.diarize) {
      formData.append('diarize', 'true')
    }

    const response = await fetch(`${this.baseUrl}/v1/transcribe`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(
        `WhisperX API error (${response.status}): ${error.detail || error.error || 'Unknown error'}`
      )
    }

    return await response.json()
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<{
    task_id: string
    status: string
    stage: string
    progress: number
    message: string
  }> {
    const response = await fetch(`${this.baseUrl}/v1/tasks/${taskId}`)
    if (!response.ok) {
      throw new Error(`Failed to get task status: ${response.status}`)
    }
    return await response.json()
  }

  /**
   * Get task result
   */
  async getTaskResult(taskId: string): Promise<TranscriptionResult> {
    const response = await fetch(`${this.baseUrl}/v1/tasks/${taskId}/result`)
    if (!response.ok) {
      throw new Error(`Failed to get task result: ${response.status}`)
    }
    return await response.json()
  }

  /**
   * Wait for task completion with retry logic
   */
  async waitForCompletion(
    taskId: string,
    maxAttempts: number = 30,
    intervalMs: number = 1000
  ): Promise<TranscriptionResult> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getTaskStatus(taskId)

      if (status.status === 'completed') {
        return await this.getTaskResult(taskId)
      }

      if (status.status === 'failed') {
        throw new Error(`Transcription failed: ${status.message}`)
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }

    throw new Error('Transcription timeout')
  }

  /**
   * Transcribe with retry logic (max 3 retries)
   */
  async transcribeWithRetry(
    audioBuffer: ArrayBuffer,
    options: TranscribeOptions = {},
    maxRetries: number = 3
  ): Promise<TranscriptionResult> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.transcribe(audioBuffer, options)
      } catch (error) {
        lastError = error as Error
        console.warn(
          `WhisperX transcription attempt ${attempt}/${maxRetries} failed:`,
          lastError.message
        )

        if (attempt < maxRetries) {
          const delayMs = attempt * 1000
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }
      }
    }

    throw lastError || new Error('Transcription failed after all retries')
  }

  /**
   * Convert WhisperX result to word timestamps (relative to chunk start)
   */
  convertToWordTimestamps(
    result: TranscriptionResult,
    chunkStartTime: number = 0
  ): WordTimestamp[] {
    const timestamps: WordTimestamp[] = []

    for (const segment of result.segments) {
      if (segment.words) {
        for (const word of segment.words) {
          timestamps.push({
            word: word.word,
            start: word.start - chunkStartTime,
            end: word.end - chunkStartTime,
          })
        }
      }
    }

    return timestamps
  }

  /**
   * Get default model list when API is unavailable
   */
  private getDefaultModels(): ModelList {
    return {
      whisper: [
        { name: 'tiny', type: 'whisper', size: 'tiny', loaded: false },
        { name: 'base', type: 'whisper', size: 'base', loaded: false },
        { name: 'small', type: 'whisper', size: 'small', loaded: false },
        { name: 'medium', type: 'whisper', size: 'medium', loaded: false },
        { name: 'large-v2', type: 'whisper', size: 'large v2', loaded: false },
        { name: 'large-v3', type: 'whisper', size: 'large v3', loaded: false },
      ],
      alignment: [
        { name: 'wav2vec2-en', type: 'alignment', language: 'en', loaded: false },
        { name: 'wav2vec2-zh', type: 'alignment', language: 'zh', loaded: false },
      ],
      diarization: {
        name: 'pyannote/speaker-diarization-3.1',
        type: 'diarization',
        loaded: false,
      },
    }
  }

  /**
   * Get available model names for dropdown
   */
  getAvailableModels(): string[] {
    return ['tiny', 'base', 'small', 'medium', 'large-v2', 'large-v3']
  }

  /**
   * Get available languages
   */
  getAvailableLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: '', name: 'Auto Detect' },
      { code: 'en', name: 'English' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
    ]
  }
}
