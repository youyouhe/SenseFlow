import { AIServiceConfig, StudyMaterial, ContentType } from '../types'

export class EdgeTTSService {
  private voices: any[] = []
  private config: AIServiceConfig | null = null

  constructor(config?: AIServiceConfig) {
    this.config = config || null
    this.initializeVoices()
  }

  private async initializeVoices() {
    try {
      const synth = window.speechSynthesis
      const voices = synth.getVoices()

      this.voices = voices.filter(
        voice =>
          voice.lang.includes('en') &&
          (voice.name.includes('Microsoft') || voice.name.includes('Google'))
      )

      console.log(
        'Available TTS voices:',
        this.voices.map(v => v.name)
      )
    } catch (error) {
      console.warn('Failed to initialize voices:', error)
    }
  }

  async generateChunks(
    topic: string,
    difficulty: string,
    contentType: ContentType = 'monologue'
  ): Promise<StudyMaterial> {
    const chunks = await this.generateChunkedContent(topic, 100)

    return {
      id: `edge_${Date.now()}`,
      title: topic,
      description: `${difficulty} difficulty exercise`,
      original_text: topic,
      chunks: chunks.map((item, index) => ({
        id: `edge_${Date.now()}_${index}`,
        text: item.text,
        translation: undefined,
        speaker: null,
        start_time: item.start_time,
        end_time: item.end_time,
      })),
      duration: chunks.length * 2.5,
      config: {
        recommended_speed: 1.0,
        recommended_noise_level: 0.2,
        provider_type: 'edge' as const,
        tags: [difficulty],
        difficulty: difficulty as 'Easy' | 'Medium' | 'Hard' | 'Insane',
        content_type: contentType,
      },
    }
  }

  async generateChunkedContent(text: string, chunkSize: number = 100): Promise<any[]> {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const chunks = []

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim()
      if (!sentence) continue

      if (sentence.length > chunkSize) {
        const words = sentence.split(' ')
        let currentChunk = ''
        let chunkStartTime = i * 2

        for (const word of words) {
          if (currentChunk.length + word.length > chunkSize) {
            if (currentChunk.trim()) {
              chunks.push({
                text: currentChunk.trim(),
                start_time: chunkStartTime,
                end_time: chunkStartTime + 1.5,
              })
              chunkStartTime += 1.5
            }
            currentChunk = word
          } else {
            currentChunk += (currentChunk ? ' ' : '') + word
          }
        }

        if (currentChunk.trim()) {
          chunks.push({
            text: currentChunk.trim(),
            start_time: chunkStartTime,
            end_time: chunkStartTime + 1.5,
          })
        }
      } else {
        chunks.push({
          text: sentence,
          start_time: i * 2,
          end_time: (i + 1) * 2,
        })
      }
    }

    return chunks
  }

  async generateAudio(text: string): Promise<ArrayBuffer> {
    try {
      const synth = window.speechSynthesis
      const voices = synth.getVoices()
      const englishVoice =
        voices.find(
          voice =>
            voice.lang.startsWith('en') &&
            (voice.name.includes('Microsoft') ||
              voice.name.includes('Google') ||
              voice.name.includes('Natural'))
        ) || voices.find(voice => voice.lang.startsWith('en'))

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1
      if (englishVoice) {
        utterance.voice = englishVoice
      }

      return new Promise((resolve, reject) => {
        utterance.onend = () => {
          const duration = text.length * 0.08
          const sampleRate = 24000
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate)
          const data = buffer.getChannelData(0)

          for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate
            const frequency = 120 + Math.sin(t * 3) * 40 + Math.random() * 15
            data[i] = Math.sin(2 * Math.PI * frequency * t) * 0.25 * (1 + Math.random() * 0.08)
            const envelope = Math.min(1, t * 8) * Math.max(0, 1 - (t - duration + 0.15) * 8)
            data[i] *= envelope
          }

          const result = this.audioBufferToArrayBuffer(buffer)
          resolve(result)
        }

        utterance.onerror = event => {
          console.warn('Browser TTS failed, using fallback:', event)
          const fallbackBuffer = this.generateFallbackAudio(text)
          resolve(this.audioBufferToArrayBuffer(fallbackBuffer))
        }

        synth.speak(utterance)
      })
    } catch (error) {
      console.error('Edge TTS generation error:', error)
      const fallbackBuffer = this.generateFallbackAudio(text)
      return this.audioBufferToArrayBuffer(fallbackBuffer)
    }
  }

  private generateFallbackAudio(text: string): AudioBuffer {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const duration = Math.max(1.5, text.length * 0.06)
    const sampleRate = audioContext.sampleRate
    const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const frequency = 130 + Math.sin(t * 2.5) * 45 + Math.random() * 12
      data[i] = Math.sin(2 * Math.PI * frequency * t) * 0.2 * (1 + Math.random() * 0.1)
      const envelope = Math.min(1, t * 12) * Math.max(0, 1 - (t - duration + 0.2) * 10)
      data[i] *= envelope
    }

    return buffer
  }

  private audioBufferToArrayBuffer(audioBuffer: AudioBuffer): ArrayBuffer {
    const length = audioBuffer.length * audioBuffer.numberOfChannels * 4
    const arrayBuffer = new ArrayBuffer(length)
    const view = new DataView(arrayBuffer)
    const channels = []

    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i))
    }

    let offset = 0
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const sample = channels[channel][i]
        view.setFloat32(offset, sample, true)
        offset += 4
      }
    }

    return arrayBuffer
  }

  async generateAudioBuffer(audioData: ArrayBuffer): Promise<AudioBuffer> {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      return await audioContext.decodeAudioData(audioData.slice(0))
    } catch (error) {
      console.error('Failed to decode audio data:', error)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const duration = 2
      return audioContext.createBuffer(
        1,
        audioContext.sampleRate * duration,
        audioContext.sampleRate
      )
    }
  }

  getCapabilities() {
    return {
      supportedLanguages: ['en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN'],
      voices: this.voices.map(voice => ({
        name: voice.name,
        language: voice.lang,
        gender: voice.name.includes('Female') ? 'female' : 'male',
      })),
      maxTextLength: 5000,
      streamingSupported: false,
      ssmlSupported: false,
    }
  }

  setVoice(voiceName: string) {
    const voice = this.voices.find(v => v.name === voiceName)
    if (voice) {
      console.log(`Selected voice: ${voice.name} (${voice.lang})`)
    } else {
      console.warn(`Voice ${voiceName} not found, using default`)
    }
  }

  async getVoiceList() {
    return this.voices
  }
}
