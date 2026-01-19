// The "Recipe" Structure defined in the report
export type ProviderType = 'edge' | 'openai' | 'local' | 'gemini' | 'deepseek' | 'cosyvoice'

export type ContentType = 'monologue' | 'dialogue'

export type SpeakerGender = 'male-male' | 'male-female' | 'female-female'

export interface DialogueConfig {
  contentType: ContentType
  speakerGender: SpeakerGender
}

// Word-level timestamp for karaoke-style highlighting
export interface WordTimestamp {
  word: string
  start: number // Start time in seconds (relative to chunk start)
  end: number // End time in seconds (relative to chunk start)
}

export interface Chunk {
  id: string
  text: string
  translation?: string
  start_time: number
  end_time: number
  speaker?: 'A' | 'B' | null
  speakerName?: string
  words?: WordTimestamp[]
  audioData?: string
}

export interface MaterialConfig {
  recommended_speed: number
  recommended_noise_level: number
  provider_type: ProviderType
  tags: string[]
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane'
  content_type: ContentType
  speaker_gender?: SpeakerGender
}

export interface StudyMaterial {
  id: string
  title: string
  description: string
  original_text: string
  chunks: Chunk[]
  duration: number
  config: MaterialConfig
  createdAt: number
  ttsGenerated: boolean
}

export interface UserSettings {
  openaiKey: string
  geminiKey: string
  deepseekKey: string
  localApiUrl: string
  // CosyVoice settings
  cosyvoiceApiUrl: string
  cosyvoiceMode: string
  cosyvoiceSpeaker: string
  cosyvoiceSpeed: number
  cosyvoiceEnableAlignment: boolean
  // WhisperX settings
  whisperxApiUrl: string
  whisperxModel: string
  whisperxLanguage: string
  whisperxEnableAlignment: boolean
  whisperxEnableDiarization: boolean
  edgeVoiceName: string
  theme: 'dark' | 'light'
  language: 'en' | 'zh'
  // Enhanced training settings
  trainingMode: 'sequential' | 'random' | 'adaptive'
  showTranslations: boolean
  autoProgress: boolean
  repetitionCount: number
  // Interaction settings
  clickToSpeak: boolean
  enableClickSpeakInFullMode: boolean
  showTranslationInFullMode: boolean
  autoPlayNext: boolean
  seamlessPlayback: boolean
  // TTS settings
  ttsMode: 'browser' | 'openai' | 'cosyvoice' | 'auto'
  // Noise settings
  noiseType: 'white' | 'gaussian' | 'custom'
  noiseIntensity: number // 0.1 to 2.0
  customNoiseData: string | null // Base64 encoded audio data
}

export interface UserProgress {
  userId: string
  materialId: string
  chunksAttempted: string[]
  chunksCorrect: string[]
  currentStreak: number
  bestStreak: number
  accuracy: number
  totalTime: number
  lastAccessed: Date
  difficultyProgress: Record<string, number>
}

export interface TrainingSession {
  id: string
  materialId: string
  startTime: Date
  endTime?: Date
  chunksPracticed: string[]
  accuracy: number
  wpm: number
  comprehensionScore: number
}

export interface AIServiceConfig {
  apiKey: string
  baseUrl?: string
  model?: string
}
