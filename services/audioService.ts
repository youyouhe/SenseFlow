import { ProviderType, Chunk, WordTimestamp } from '../types'
import { AIServiceFactory } from './aiService'
import { AIServiceConfig } from '../types'
import { WhisperXService } from './whisperxService'
import { base64ToArrayBuffer } from './audioUtils'

export type NoiseType = 'white' | 'gaussian' | 'custom'
export type TTSMode = 'browser' | 'openai' | 'cosyvoice' | 'auto'

export class AudioService {
  private audioContext: AudioContext | null = null
  private currentSource: AudioBufferSourceNode | null = null
  private noiseNode: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private noiseGainNode: GainNode | null = null
  private aiService: any = null
  private browserSpeechUtterance: SpeechSynthesisUtterance | null = null

  private audioCache: Map<string, AudioBuffer> = new Map()
  private cacheMaxSize: number = 50

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  async initializeAIService(provider: ProviderType, config: AIServiceConfig) {
    try {
      this.aiService = AIServiceFactory.createService(provider, config)
    } catch (error) {
      console.warn('AI TTS not available, falling back to browser TTS:', error)
      this.aiService = null
    }
  }

  private initializeAudio() {
    if (!this.audioContext || this.gainNode) return

    this.gainNode = this.audioContext.createGain()
    this.noiseGainNode = this.audioContext.createGain()
    this.gainNode.connect(this.audioContext.destination)
    this.noiseGainNode.connect(this.audioContext.destination)
  }

  async generateSpeech(
    text: string,
    provider: ProviderType = 'edge',
    config?: AIServiceConfig
  ): Promise<AudioBuffer> {
    this.initializeAudio()
    if (!this.audioContext) throw new Error('Audio context not available')

    // Generate cache key - for CosyVoice include speaker/mode/speed for proper invalidation
    let cacheKey: string
    if (provider === 'cosyvoice' && config?.baseUrl) {
      cacheKey = `cosyvoice_${text.substring(0, 50)}_${(config as any).speaker || '中文女'}_${(config as any).mode || '预训练音色'}_${(config as any).speed || 1.0}`
    } else {
      cacheKey = `${provider}_${text.substring(0, 50)}_${config?.model || 'default'}`
    }

    if (this.audioCache.has(cacheKey)) {
      console.log(`Using cached audio for: ${text.substring(0, 30)}...`)
      return this.audioCache.get(cacheKey)!
    }

    let audioBuffer: AudioBuffer

    try {
      if (provider === 'cosyvoice' || (provider !== 'edge' && config?.apiKey)) {
        await this.initializeAIService(provider, config || { apiKey: '' })
        const audioData = await this.aiService!.generateAudio(text)
        audioBuffer = await this.arrayBufferToAudioBuffer(audioData)
      } else {
        audioBuffer = await this.generateBrowserSpeech(text)
      }
    } catch (error) {
      console.warn('TTS generation failed, using fallback:', error)
      audioBuffer = this.generateFallbackSpeechBuffer(text)
    }

    this.cacheAudio(cacheKey, audioBuffer)
    return audioBuffer
  }

  async generateSpeechWithAlignment(
    text: string,
    provider: ProviderType = 'edge',
    options: {
      enableAlignment: boolean
      whisperxApiUrl?: string
      whisperxModel?: string
      whisperxLanguage?: string
    },
    config?: AIServiceConfig
  ): Promise<{ audioBuffer: AudioBuffer; wordTimestamps?: WordTimestamp[] }> {
    this.initializeAudio()
    if (!this.audioContext) throw new Error('Audio context not available')

    let audioBuffer: AudioBuffer
    let wordTimestamps: WordTimestamp[] | undefined

    try {
      if (provider === 'cosyvoice') {
        await this.initializeAIService(provider, config || { apiKey: '' })
        const result = await this.aiService!.generateAudioWithTimestamps(text)
        audioBuffer = await this.arrayBufferToAudioBuffer(result.audio)
        wordTimestamps = result.words
      } else if (options.enableAlignment && config?.baseUrl) {
        const audioData = await this.generateSpeechData(text, provider, config || { apiKey: '' })
        audioBuffer = await this.arrayBufferToAudioBuffer(audioData)
        wordTimestamps = await this.generateAlignment(
          audioData,
          options.whisperxApiUrl || config.baseUrl,
          options.whisperxModel || 'large-v2',
          options.whisperxLanguage || 'en'
        )
      } else {
        audioBuffer = await this.generateSpeech(text, provider, config)
      }
    } catch (error) {
      console.warn('TTS generation failed, using fallback:', error)
      audioBuffer = this.generateFallbackSpeechBuffer(text)
    }

    return { audioBuffer, wordTimestamps }
  }

  private async generateSpeechData(
    text: string,
    provider: ProviderType,
    config: AIServiceConfig
  ): Promise<ArrayBuffer> {
    await this.initializeAIService(provider, config)
    return await this.aiService!.generateAudio(text)
  }

  private async generateAlignment(
    audioData: ArrayBuffer,
    apiUrl: string,
    model: string,
    language: string
  ): Promise<WordTimestamp[]> {
    const whisperx = new WhisperXService(apiUrl)

    try {
      const result = await whisperx.transcribeWithRetry(audioData, {
        model,
        language,
        alignOutput: true,
      })
      return whisperx.convertToWordTimestamps(result, 0)
    } catch (error) {
      console.warn('Alignment generation failed:', error)
      return []
    }
  }

  private cacheAudio(key: string, buffer: AudioBuffer): void {
    if (this.audioCache.size >= this.cacheMaxSize) {
      const firstKey = this.audioCache.keys().next().value || ''
      this.audioCache.delete(firstKey)
    }
    this.audioCache.set(key, buffer!)
    console.log(`Cached audio buffer. Cache size: ${this.audioCache.size}/${this.cacheMaxSize}`)
  }

  // Generate white noise
  private generateWhiteNoiseBuffer(duration: number, volume: number = 0.3): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not available')

    const sampleRate = this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() - 0.5) * volume
    }

    return buffer
  }

  // Generate Gaussian noise using Box-Muller transform
  private generateGaussianNoiseBuffer(duration: number, volume: number = 0.3): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not available')

    const sampleRate = this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      // Box-Muller transform for Gaussian distribution
      const u1 = Math.random()
      const u2 = Math.random()
      const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
      data[i] = z * volume
    }

    return buffer
  }

  // Load custom audio from base64 data
  private async generateCustomNoiseBuffer(base64Data: string): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('Audio context not available')

    try {
      let data = base64Data
      if (base64Data.includes(',')) {
        data = base64Data.split(',')[1]
      }

      const binaryString = atob(data)
      const len = binaryString.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const arrayBuffer = bytes.buffer

      return await this.audioContext.decodeAudioData(arrayBuffer.slice(0))
    } catch (error) {
      console.error('Failed to decode custom noise audio:', error)
      return this.generateNoiseBuffer(10, 'white', 0.3)
    }
  }

  generateNoiseBuffer(
    duration: number,
    noiseType: NoiseType = 'white',
    intensity: number = 0.3
  ): AudioBuffer {
    switch (noiseType) {
      case 'gaussian':
        return this.generateGaussianNoiseBuffer(duration, intensity)
      case 'custom':
        throw new Error('Custom noise requires async loading')
      case 'white':
      default:
        return this.generateWhiteNoiseBuffer(duration, intensity)
    }
  }

  async playChunk(
    chunk: Chunk,
    onProgress?: (currentTime: number) => void,
    onComplete?: () => void,
    gapSeconds: number = 0,
    gapSound: 'beep' | 'silent' = 'beep',
    playbackRate: number = 1.0,
    provider: ProviderType = 'edge',
    config?: AIServiceConfig,
    ttsMode: TTSMode = 'auto',
    speakerGender: 'male-male' | 'male-female' | 'female-female' = 'male-female'
  ): Promise<void> {
    this.initializeAudio()
    if (!this.audioContext) throw new Error('Audio context not available')

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    // If chunk has pre-generated audioData, use it directly (highest priority)
    if (chunk.audioData) {
      try {
        const arrayBuffer = base64ToArrayBuffer(chunk.audioData)
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
        await this.playAudioBuffer(
          audioBuffer,
          playbackRate,
          onProgress,
          onComplete,
          gapSeconds,
          gapSound
        )
        return
      } catch (error) {
        console.warn('Failed to decode pre-generated audio, falling back to TTS:', error)
        // Fall through to TTS generation
      }
    }

    // Use browser TTS if configured
    const useBrowserTTS = ttsMode === 'browser' || (ttsMode === 'auto' && !config?.apiKey)

    if (useBrowserTTS) {
      await this.playChunkWithBrowserTTS(
        chunk,
        onProgress,
        onComplete,
        gapSeconds,
        gapSound,
        playbackRate,
        speakerGender
      )
      return
    }

    // Generate audio using API
    try {
      const audioBuffer = await this.generateSpeech(chunk.text, provider, config)
      await this.playAudioBuffer(
        audioBuffer,
        playbackRate,
        onProgress,
        onComplete,
        gapSeconds,
        gapSound
      )
    } catch (error) {
      console.error('Failed to generate speech:', error)
      throw error
    }
  }

  private async playAudioBuffer(
    audioBuffer: AudioBuffer,
    playbackRate: number,
    onProgress?: (currentTime: number) => void,
    onComplete?: () => void,
    gapSeconds: number = 0,
    gapSound: 'beep' | 'silent' = 'beep'
  ): Promise<void> {
    if (!this.audioContext) throw new Error('Audio context not available')

    this.currentSource = this.audioContext.createBufferSource()
    this.currentSource.buffer = audioBuffer
    this.currentSource.connect(this.gainNode!)

    this.currentSource.playbackRate.value = playbackRate

    const startTime = this.audioContext.currentTime
    this.currentSource.start(startTime)

    const duration = audioBuffer.duration / playbackRate
    let progressInterval: NodeJS.Timeout

    // 修复：只在音频播放期间更新进度，gap期间由外层tick函数处理
    if (onProgress) {
      progressInterval = setInterval(() => {
        const elapsed = (this.audioContext!.currentTime - startTime) * playbackRate
        onProgress(Math.min(elapsed, duration))
      }, 100)
    }

    this.currentSource.onended = () => {
      if (progressInterval) clearInterval(progressInterval)
      if (gapSeconds > 0) {
        if (gapSound === 'beep') {
          this.playBeepSound()
        }
        // 修复：移除gap期间的onProgress调用，避免双重时间更新
        setTimeout(() => onComplete?.(), gapSeconds * 1000)
      } else {
        onComplete?.()
      }
    }
  }

  private async playChunkWithBrowserTTS(
    chunk: Chunk,
    onProgress?: (currentTime: number) => void,
    onComplete?: () => void,
    gapSeconds: number = 0,
    gapSound: 'beep' | 'silent' = 'beep',
    playbackRate: number = 1.0,
    speakerGender: 'male-male' | 'male-female' | 'female-female' = 'male-female'
  ): Promise<void> {
    return new Promise(resolve => {
      if (!('speechSynthesis' in window)) {
        console.warn('Browser TTS not supported')
        resolve()
        return
      }

      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(chunk.text)
      utterance.rate = Math.min(2.0, 0.9 * playbackRate)
      utterance.pitch = 1
      utterance.volume = 1

      const voices = speechSynthesis.getVoices()

      const isDialogue = chunk.speaker === 'A' || chunk.speaker === 'B'
      let selectedVoice = null

      if (isDialogue) {
        const isSpeakerA = chunk.speaker === 'A'
        const speakerType = isSpeakerA ? speakerGender.split('-')[0] : speakerGender.split('-')[1]

        const maleVoicePatterns = [
          'male',
          'Male',
          'David',
          'Alex',
          'Daniel',
          'George',
          'Mark',
          'Adam',
          'John',
          'James',
          'Tom',
          'Ben',
          'Michael',
          'Steve',
          'Microsoft David',
          'Microsoft Zira Desktop',
          'Google US English',
          'English United States',
        ]

        const femaleVoicePatterns = [
          'female',
          'Female',
          'Zira',
          'Samantha',
          'Victoria',
          'Susan',
          'Karen',
          'Tessa',
          'Emily',
          'Olivia',
          'Ava',
          'Sophia',
          'Ivy',
          'Microsoft Maria',
          'Microsoft Zira Desktop',
          'Google UK English Female',
          'English Female',
        ]

        if (speakerType === 'male') {
          const maleVoices = voices.filter(
            voice =>
              voice.lang.startsWith('en') &&
              !voice.name.toLowerCase().includes('female') &&
              maleVoicePatterns.some(pattern => voice.name.includes(pattern))
          )
          if (maleVoices.length > 0) {
            selectedVoice = maleVoices[0]
          } else {
            const nonFemaleVoices = voices.filter(
              voice => voice.lang.startsWith('en') && !voice.name.toLowerCase().includes('female')
            )
            if (nonFemaleVoices.length > 0) {
              selectedVoice = nonFemaleVoices[0]
            }
          }
        } else {
          const femaleVoices = voices.filter(
            voice =>
              voice.lang.startsWith('en') &&
              femaleVoicePatterns.some(pattern => voice.name.includes(pattern))
          )
          if (femaleVoices.length > 0) {
            selectedVoice = femaleVoices[0]
          } else {
            const voicesWithFemale = voices.filter(
              voice => voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female')
            )
            if (voicesWithFemale.length > 0) {
              selectedVoice = voicesWithFemale[0]
            }
          }
        }
      }

      if (!selectedVoice) {
        selectedVoice = voices.find(
          voice =>
            voice.lang.startsWith('en') &&
            (voice.name.includes('Natural') ||
              voice.name.includes('Premium') ||
              voice.name.includes('Microsoft') ||
              voice.name.includes('Google'))
        )
      }

      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en'))
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice
      }

      const startTime = Date.now()
      let progressInterval: NodeJS.Timeout

      if (onProgress) {
        progressInterval = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000
          onProgress(elapsed)
        }, 100)
      }

      utterance.onend = () => {
        if (progressInterval) clearInterval(progressInterval)
        if (gapSeconds > 0) {
          if (gapSound === 'beep') {
            this.playBeepSound()
          }
          setTimeout(() => {
            if (onComplete) onComplete()
            resolve()
          }, gapSeconds * 1000)
        } else {
          if (onComplete) onComplete()
          resolve()
        }
      }

      utterance.onerror = event => {
        console.warn('Browser TTS error:', event)
        if (progressInterval) clearInterval(progressInterval)
        if (onComplete) onComplete()
        resolve()
      }

      window.speechSynthesis.speak(utterance)
    })
  }

  private playBeepSound(): void {
    this.initializeAudio()
    if (!this.audioContext || !this.gainNode) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.gainNode)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1)

    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.1)
  }

  async startNoise(
    volume: number = 0.3,
    noiseType: NoiseType = 'white',
    customData: string | null = null
  ): Promise<void> {
    this.initializeAudio()

    if (!this.audioContext) return
    if (this.noiseNode) return

    try {
      let noiseBuffer: AudioBuffer

      if (noiseType === 'custom' && customData) {
        noiseBuffer = await this.generateCustomNoiseBuffer(customData)
      } else {
        // Use fixed intensity for noise generation, volume controlled by gain
        noiseBuffer = this.generateNoiseBuffer(10, noiseType, 0.3)
      }

      this.noiseNode = this.audioContext.createBufferSource()
      this.noiseNode.buffer = noiseBuffer
      this.noiseNode.loop = true
      this.noiseNode.connect(this.noiseGainNode!)

      // Volume controlled by gain node
      this.noiseGainNode!.gain.value = Math.max(0, Math.min(1, volume))
      this.noiseNode.start()
    } catch (error) {
      console.error('Error starting noise:', error)
    }
  }

  stopNoise(): void {
    if (this.noiseNode) {
      this.noiseNode.stop()
      this.noiseNode = null
    }
  }

  setVoiceVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = volume
    }
  }

  setNoiseVolume(volume: number): void {
    if (this.noiseGainNode) {
      this.noiseGainNode.gain.value = Math.max(0, Math.min(1, volume))
    }
  }

  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop()
      this.currentSource = null
    }
    this.stopNoise()
  }

  // Cancel all audio playback (AudioContext + Speech Synthesis)
  cancelAllPlayback(): void {
    this.stop() // Stops AudioContext source
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel() // Stops TTS
    }
  }

  // Check if anything is currently playing
  isCurrentlyPlaying(): boolean {
    return this.currentSource !== null
  }

  getAudioState(): { isPlaying: boolean; currentTime: number } {
    return {
      isPlaying: this.currentSource !== null,
      currentTime: this.audioContext?.currentTime || 0,
    }
  }

  private async generateBrowserSpeech(text: string): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1

      const voices = speechSynthesis.getVoices()
      const englishVoice = voices.find(
        voice =>
          voice.lang.startsWith('en') &&
          (voice.name.includes('Natural') ||
            voice.name.includes('Premium') ||
            voice.name.includes('Microsoft'))
      )
      if (englishVoice) {
        utterance.voice = englishVoice
      }

      utterance.onend = () => {
        const duration = Math.max(1.5, text.length * 0.06)
        const sampleRate = this.audioContext!.sampleRate
        const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate)
        const data = buffer.getChannelData(0)

        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate
          const frequency = 130 + Math.sin(t * 2.5) * 45 + Math.random() * 12
          data[i] = Math.sin(2 * Math.PI * frequency * t) * 0.2 * (1 + Math.random() * 0.1)
          const envelope = Math.min(1, t * 12) * Math.max(0, 1 - (t - duration + 0.2) * 10)
          data[i] *= envelope
        }

        resolve(buffer)
      }

      utterance.onerror = event => {
        console.warn('Browser TTS failed, using fallback:', event)
        const fallbackBuffer = this.generateFallbackSpeechBuffer(text)
        resolve(fallbackBuffer)
      }

      speechSynthesis.speak(utterance)
    })
  }

  private generateFallbackSpeechBuffer(text: string): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('Audio context not available')
    }
    const duration = Math.max(1.5, text.length * 0.08)
    const sampleRate = this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    const words = text.split(' ')
    const avgWordsPerSecond = 2.5
    const samplesPerWord = sampleRate / avgWordsPerSecond

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const wordIndex = Math.floor(i / samplesPerWord)
      const wordProgress = (i % samplesPerWord) / samplesPerWord

      const baseFreq = 150 + wordIndex * 20
      const freqModulation = Math.sin(t * 8) * 30
      const wordEnvelope = Math.sin(wordProgress * Math.PI)

      let sample = Math.sin(2 * Math.PI * (baseFreq + freqModulation) * t) * 0.15

      sample *= wordEnvelope

      const attack = Math.min(1, t * 20)
      const decay = Math.max(0, 1 - (t - duration + 0.3) * 5)
      sample *= attack * decay

      const noise = (Math.random() - 0.5) * 0.02
      sample += noise

      data[i] = sample
    }

    return buffer
  }

  private async arrayBufferToAudioBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    return new Promise(async (resolve, reject) => {
      if (!this.audioContext) {
        reject(new Error('Audio context not available'))
        return
      }

      try {
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0))
        resolve(audioBuffer)
      } catch (error) {
        const duration = 2
        const sampleRate = this.audioContext.sampleRate
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate)
        resolve(buffer)
      }
    })
  }

  clearCache(): void {
    this.audioCache.clear()
    console.log('Audio cache cleared')
  }

  getCacheStats(): { size: number; maxSize: number; memoryUsage: string } {
    let totalBuffers = 0
    this.audioCache.forEach(buffer => {
      totalBuffers += buffer.length * buffer.numberOfChannels * 4
    })

    const memoryUsageMB = (totalBuffers / (1024 * 1024)).toFixed(2)

    return {
      size: this.audioCache.size,
      maxSize: this.cacheMaxSize,
      memoryUsage: `${memoryUsageMB} MB`,
    }
  }

  debugListVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Browser TTS not supported')
      return
    }

    const voices = speechSynthesis.getVoices()
    console.log('=== Available TTS Voices ===')
    console.log(`Total voices: ${voices.length}`)
    console.log('')

    const englishVoices = voices.filter(v => v.lang.startsWith('en'))
    console.log(`English voices (${englishVoices.length}):`)
    englishVoices.forEach((voice, i) => {
      console.log(
        `  ${i + 1}. ${voice.name} (${voice.lang}) - ${voice.localService ? 'Local' : 'Remote'}`
      )
    })

    console.log('')
    console.log('Voice selection hints:')
    console.log(
      '- Male voices: David, Alex, Daniel, George, Mark, Adam, John, James, Tom, Ben, Michael'
    )
    console.log(
      '- Female voices: Zira, Samantha, Victoria, Susan, Karen, Tessa, Emily, Olivia, Ava'
    )
    console.log('- Generic: Microsoft David (male), Microsoft Zira Desktop (female)')
  }
}

export const audioService = new AudioService()
