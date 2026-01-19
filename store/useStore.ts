import { create } from 'zustand'
import { StudyMaterial, UserSettings, AIServiceConfig, ProviderType, UserProgress } from '../types'
import { audioService } from '../services/audioService'
import { storageManager } from '../services/storageManager'

const DEFAULT_SETTINGS: UserSettings = {
  openaiKey: '',
  geminiKey: '',
  deepseekKey: '',
  localApiUrl: 'http://localhost:9000',
  cosyvoiceApiUrl: 'http://localhost:9880',
  cosyvoiceMode: '预训练音色',
  cosyvoiceSpeaker: '',
  cosyvoiceSpeed: 1.0,
  cosyvoiceEnableAlignment: true,
  whisperxApiUrl: 'http://localhost:8000',
  whisperxModel: 'large-v2',
  whisperxLanguage: 'en',
  whisperxEnableAlignment: true,
  whisperxEnableDiarization: false,
  edgeVoiceName: '',
  theme: 'dark',
  language: 'zh',
  trainingMode: 'sequential',
  showTranslations: true,
  autoProgress: false,
  repetitionCount: 3,
  clickToSpeak: true,
  enableClickSpeakInFullMode: true,
  showTranslationInFullMode: true,
  autoPlayNext: false,
  seamlessPlayback: false,
  ttsMode: 'auto',
  noiseType: 'white',
  noiseIntensity: 0.5,
  customNoiseData: null,
}

const DEFAULT_PROGRESS: UserProgress = {
  userId: 'default',
  materialId: '',
  chunksAttempted: [],
  chunksCorrect: [],
  currentStreak: 0,
  bestStreak: 0,
  accuracy: 0,
  totalTime: 0,
  lastAccessed: new Date(),
  difficultyProgress: {},
}

interface PlayerState {
  isPlaying: boolean
  isGap: boolean
  isLoadingAudio: boolean
  currentTime: number
  duration: number
  playbackRate: number
  currentChunkIndex: number
  stopAfterCurrentChunk: boolean
  voiceVolume: number
  noiseVolume: number
  noiseEnabled: boolean
  playerViewMode: 'chunk' | 'full'
  activeMaterial: StudyMaterial | null
  materials: StudyMaterial[]
  settings: UserSettings
  chunkGap: number
  gapSound: 'beep' | 'silent'
  autoPlayNext: boolean
  trainingMode: 'practice' | 'test' | 'review'
  showHints: boolean
  trainingProgress: UserProgress
  adaptiveSettings: {
    difficultyMultiplier: number
    noiseLevelMultiplier: number
    speedMultiplier: number
  }
  setMaterial: (id: string) => void
  addMaterial: (material: StudyMaterial) => void
  deleteMaterial: (id: string) => void
  clearAllData: () => void
  play: (startIndex?: number, isFirstChunk?: boolean) => void
  pause: () => void
  stop: () => void
  seek: (time: number) => void
  nextChunk: () => void
  previousChunk: () => void
  setVoiceVolume: (val: number) => void
  setNoiseVolume: (val: number) => void
  toggleNoise: () => void
  setNoiseType: (type: 'white' | 'gaussian' | 'custom') => void
  setNoiseIntensity: (intensity: number) => void
  setCustomNoiseData: (data: string | null) => void
  setPlayerViewMode: (mode: 'chunk' | 'full') => void
  setTrainingMode: (mode: 'practice' | 'test' | 'review') => void
  toggleHints: () => void
  setPlaybackRate: (rate: number) => void
  markChunkAttempt: (chunkId: string) => void
  markChunkCorrect: (chunkId: string) => void
  calculateTrainingProgress: () => void
  getAdaptiveDifficulty: () => number
  resetTrainingSession: () => void
  getNextChunkIndex: (mode: 'sequential' | 'random' | 'adaptive') => number
  updateSettings: (settings: Partial<UserSettings>) => void
  toggleTheme: () => void
  toggleLanguage: () => void
  setChunkGap: (gap: number) => void
  toggleAutoPlayNext: () => void
  setIsLoadingAudio: (loading: boolean) => void
  setStopAfterCurrentChunk: (stop: boolean) => void
  setGapSound: (sound: 'beep' | 'silent') => void
  tick: (delta: number) => void
}

async function initializeStore() {
  try {
    await storageManager.init()
    const savedSettings = await storageManager.getSettings()
    const savedMaterials = await storageManager.getAllMaterials()
    console.log('[Store] Loaded settings:', !!savedSettings)
    console.log('[Store] Loaded materials:', savedMaterials?.length)
    return { settings: savedSettings || DEFAULT_SETTINGS, materials: savedMaterials }
  } catch (error) {
    console.warn('Failed to load saved state:', error)
    return { settings: DEFAULT_SETTINGS, materials: [] }
  }
}

export const useStore = create<PlayerState>((set, get) => ({
  isPlaying: false,
  isGap: false,
  isLoadingAudio: false,
  currentTime: 0,
  duration: 0,
  currentChunkIndex: 0,
  stopAfterCurrentChunk: false,
  voiceVolume: 1.0,
  noiseVolume: 0.3,
  noiseEnabled: true,
  playerViewMode: 'chunk',
  chunkGap: 1.5,
  gapSound: 'beep',
  autoPlayNext: false,
  playbackRate: 1.0,
  activeMaterial: null,
  materials: [],
  settings: DEFAULT_SETTINGS,
  trainingMode: 'practice',
  showHints: true,
  trainingProgress: DEFAULT_PROGRESS,
  adaptiveSettings: {
    difficultyMultiplier: 1.0,
    noiseLevelMultiplier: 1.0,
    speedMultiplier: 1.0,
  },

  setMaterial: id => {
    const material = get().materials.find(m => m.id === id)
    if (material) {
      audioService.stop()
      audioService.stopNoise()
      set({
        activeMaterial: material,
        duration: material.duration,
        currentTime: 0,
        currentChunkIndex: 0,
        isPlaying: false,
        playbackRate: material.config.recommended_speed,
        noiseVolume: material.config.recommended_noise_level,
      })
    }
  },

  addMaterial: material => {
    set(state => {
      const newMaterials = [material, ...state.materials]
      storageManager.saveMaterial(material)
      return { materials: newMaterials }
    })
  },

  deleteMaterial: id => {
    set(state => {
      const newMaterials = state.materials.filter(m => m.id !== id)
      storageManager.deleteMaterial(id)
      return {
        materials: newMaterials,
        activeMaterial: state.activeMaterial?.id === id ? null : state.activeMaterial,
      }
    })
  },

  clearAllData: async () => {
    await storageManager.clearAll()
    set({
      materials: [],
      settings: DEFAULT_SETTINGS,
      chunkGap: 1.5,
      playbackRate: 1.0,
      trainingMode: 'practice',
      showHints: true,
      trainingProgress: DEFAULT_PROGRESS,
      adaptiveSettings: {
        difficultyMultiplier: 1.0,
        noiseLevelMultiplier: 1.0,
        speedMultiplier: 1.0,
      },
    })
  },

  play: async (startIndex?: number, isFirstChunk: boolean = true) => {
    const {
      activeMaterial,
      chunkGap,
      gapSound,
      playbackRate,
      noiseEnabled,
      noiseVolume,
      settings,
    } = get()

    const currentIndex = startIndex !== undefined ? startIndex : get().currentChunkIndex
    const shouldAutoPlay = settings.autoPlayNext !== undefined ? settings.autoPlayNext : false
    const shouldSeamless = settings.seamlessPlayback === true && shouldAutoPlay
    const isCustomNoise = settings.noiseType === 'custom' && settings.customNoiseData

    if (activeMaterial && currentIndex < activeMaterial.chunks.length) {
      const chunk = activeMaterial.chunks[currentIndex]

      const needsAlignment = settings.cosyvoiceEnableAlignment && !chunk.words

      if (needsAlignment && settings.ttsMode === 'cosyvoice') {
        try {
          const { CosyVoiceService } = require('../services/cosyvoiceService')
          const cosyvoice = new CosyVoiceService({
            baseUrl: settings.cosyvoiceApiUrl || 'http://localhost:9880',
            mode: settings.cosyvoiceMode || '预训练音色',
            speaker: settings.cosyvoiceSpeaker || '',
            speed: settings.cosyvoiceSpeed || 1.0,
          })

          const result = await cosyvoice.generateAudioWithTimestamps(chunk.text)
          chunk.words = result.words

          await storageManager.cacheAudio(chunk.text, result.audio, {
            speaker: settings.cosyvoiceSpeaker,
            mode: settings.cosyvoiceMode,
            speed: settings.cosyvoiceSpeed,
          })
        } catch (error) {
          console.warn('Failed to generate alignment:', error)
        }
      } else if (needsAlignment && settings.whisperxApiUrl) {
        try {
          const { WhisperXService } = require('../services/whisperxService')
          const whisperx = new WhisperXService(settings.whisperxApiUrl)

          const audioData = await audioService.generateSpeech(chunk.text, 'cosyvoice', {
            apiKey: '',
            baseUrl: settings.cosyvoiceApiUrl || 'http://localhost:9880',
          })

          const result = await whisperx.transcribeWithRetry(audioData, {
            model: settings.whisperxModel || 'large-v2',
            language: settings.whisperxLanguage || 'en',
            alignOutput: true,
          })

          chunk.words = whisperx.convertToWordTimestamps(result, 0)
        } catch (error) {
          console.warn('Failed to generate alignment with WhisperX:', error)
        }
      }

      let provider: ProviderType
      let config: AIServiceConfig

      const ttsMode = settings.ttsMode || 'auto'

      if (ttsMode === 'cosyvoice') {
        provider = 'cosyvoice'
        config = {
          apiKey: '',
          baseUrl: settings.cosyvoiceApiUrl || 'http://localhost:9880',
          speaker: settings.cosyvoiceSpeaker || '',
          mode: settings.cosyvoiceMode || '预训练音色',
          speed: settings.cosyvoiceSpeed || 1.0,
        } as AIServiceConfig & { speaker?: string; mode?: string; speed?: number }
      } else if (ttsMode === 'browser') {
        provider = 'edge'
        config = { apiKey: '' }
      } else if (ttsMode === 'openai' && settings.openaiKey) {
        provider = 'openai'
        config = { apiKey: settings.openaiKey }
      } else if (ttsMode === 'auto' && settings.openaiKey) {
        provider = 'openai'
        config = { apiKey: settings.openaiKey }
      } else {
        provider = 'edge'
        config = { apiKey: '' }
      }

      try {
        set({ isPlaying: true, isLoadingAudio: true })

        const loadingTimeout = setTimeout(() => {
          set({ isLoadingAudio: false })
        }, 3000)

        if (isFirstChunk && noiseEnabled) {
          const intensity = settings.noiseIntensity || 0.5
          const volume = noiseVolume * intensity
          audioService.startNoise(
            volume,
            settings.noiseType as any,
            settings.customNoiseData || null
          )
        }

        await audioService.playChunk(
          chunk,
          audioElapsedTime => {
            // 修复：基于chunk开始时间和音频播放进度计算绝对时间
            // 只有当音频真正有进度产生时，才确保isGap为false
            set({ currentTime: chunk.start_time + audioElapsedTime, isGap: false })
          },
          () => {
            clearTimeout(loadingTimeout)
            // 音频播放结束，进入Gap状态
            set({ isLoadingAudio: false, currentChunkIndex: currentIndex, isGap: true })

            const { stopAfterCurrentChunk } = get()
            if (stopAfterCurrentChunk) {
              set({ isPlaying: false, stopAfterCurrentChunk: false })
              if (noiseEnabled) {
                audioService.stopNoise()
              }
              return
            }

            if (shouldAutoPlay) {
              const nextIndex = currentIndex + 1
              if (nextIndex < activeMaterial.chunks.length) {
                const nextChunk = activeMaterial.chunks[nextIndex]

                if (shouldSeamless) {
                  // 在Gap结束后进入下一个chunk之前，确保时间戳正确，并准备开始播放
                  set({
                    currentChunkIndex: nextIndex,
                    currentTime: nextChunk.start_time,
                    isPlaying: true,
                    isLoadingAudio: true,
                    isGap: false, // 准备播放下一个，关闭Gap标记
                  })
                  get().play(nextIndex, false)
                } else {
                  set({
                    currentChunkIndex: nextIndex,
                    currentTime: nextChunk.start_time,
                    isPlaying: false,
                    isGap: false,
                  })
                  if (noiseEnabled) {
                    audioService.stopNoise()
                  }
                }
              } else {
                set({ isPlaying: false, isGap: false })
                if (noiseEnabled) {
                  audioService.stopNoise()
                }
              }
            } else {
              set({ isPlaying: false, isGap: false })
              if (noiseEnabled) {
                audioService.stopNoise()
              }
            }
          },
          chunkGap,
          gapSound,
          playbackRate,
          provider,
          config,
          ttsMode,
          activeMaterial.config.speaker_gender || 'male-female'
        )
      } catch (error) {
        console.error('Playback error:', error)
        set({ isPlaying: false, isLoadingAudio: false })
        if (noiseEnabled) {
          audioService.stopNoise()
        }
      }
    }
  },

  pause: () => {
    audioService.stop()
    audioService.stopNoise()
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    set({ isPlaying: false })
  },

  stop: () => {
    audioService.stop()
    audioService.stopNoise()
    set({ isPlaying: false, currentTime: 0, currentChunkIndex: 0 })
  },

  seek: time => {
    const { activeMaterial } = get()
    if (activeMaterial) {
      const chunkIndex = activeMaterial.chunks.findIndex(
        chunk => time >= chunk.start_time && time <= chunk.end_time
      )
      set({
        currentTime: Math.max(0, Math.min(time, get().duration)),
        currentChunkIndex: Math.max(0, chunkIndex),
      })
    }
  },

  nextChunk: () => {
    const { activeMaterial, currentChunkIndex } = get()
    if (activeMaterial && currentChunkIndex < activeMaterial.chunks.length - 1) {
      const nextIndex = currentChunkIndex + 1
      const nextChunk = activeMaterial.chunks[nextIndex]
      set({
        currentChunkIndex: nextIndex,
        currentTime: nextChunk.start_time,
        isPlaying: false,
      })
    }
  },

  previousChunk: () => {
    const { activeMaterial, currentChunkIndex } = get()
    if (activeMaterial && currentChunkIndex > 0) {
      const prevIndex = currentChunkIndex - 1
      const prevChunk = activeMaterial.chunks[prevIndex]
      set({
        currentChunkIndex: prevIndex,
        currentTime: prevChunk.start_time,
        isPlaying: false,
      })
    }
  },

  setVoiceVolume: val => set({ voiceVolume: val }),
  setNoiseVolume: val => {
    set({ noiseVolume: val })
    audioService.setNoiseVolume(val)
  },
  toggleNoise: () => {
    const { noiseEnabled, noiseVolume, settings } = get()
    const newState = !noiseEnabled

    if (newState) {
      const intensity = settings.noiseIntensity || 0.5
      const volume = noiseVolume * intensity
      audioService.startNoise(volume, settings.noiseType as any, settings.customNoiseData || null)
    } else {
      audioService.stopNoise()
    }

    set({ noiseEnabled: newState })
  },
  setNoiseType: (type: 'white' | 'gaussian' | 'custom') => {
    set(state => ({
      settings: { ...state.settings, noiseType: type },
    }))
  },
  setNoiseIntensity: (intensity: number) => {
    set(state => ({
      settings: { ...state.settings, noiseIntensity: Math.max(0.1, Math.min(2.0, intensity)) },
    }))
  },
  setCustomNoiseData: (data: string | null) => {
    set(state => ({
      settings: { ...state.settings, customNoiseData: data },
    }))
  },
  setPlayerViewMode: mode => set({ playerViewMode: mode }),
  setTrainingMode: mode => set({ trainingMode: mode }),
  toggleHints: () => set(state => ({ showHints: !state.showHints })),

  markChunkAttempt: chunkId => {
    set(state => {
      const newProgress = {
        ...state.trainingProgress,
        chunksAttempted: [...state.trainingProgress.chunksAttempted, chunkId].filter(
          (id, index, arr) => arr.indexOf(id) === index
        ),
      }
      return { trainingProgress: newProgress }
    })
  },

  markChunkCorrect: chunkId => {
    set(state => {
      const newAttempted = [...state.trainingProgress.chunksAttempted, chunkId].filter(
        (id, index, arr) => arr.indexOf(id) === index
      )
      const newCorrect = [...state.trainingProgress.chunksCorrect, chunkId].filter(
        (id, index, arr) => arr.indexOf(id) === index
      )
      const newStreak = state.trainingProgress.currentStreak + 1
      const bestStreak = Math.max(state.trainingProgress.bestStreak, newStreak)
      const accuracy = newCorrect.length / newAttempted.length

      const difficultyMultiplier =
        accuracy > 0.8
          ? Math.min(1.5, state.adaptiveSettings.difficultyMultiplier + 0.1)
          : Math.max(0.5, state.adaptiveSettings.difficultyMultiplier - 0.05)
      const noiseLevelMultiplier =
        accuracy > 0.7
          ? Math.min(2.0, state.adaptiveSettings.noiseLevelMultiplier + 0.1)
          : Math.max(0.2, state.adaptiveSettings.noiseLevelMultiplier - 0.05)

      const newProgress = {
        ...state.trainingProgress,
        chunksAttempted: newAttempted,
        chunksCorrect: newCorrect,
        currentStreak: newStreak,
        bestStreak,
        accuracy,
      }

      return {
        trainingProgress: newProgress,
        adaptiveSettings: {
          ...state.adaptiveSettings,
          difficultyMultiplier,
          noiseLevelMultiplier,
        },
      }
    })
  },

  calculateTrainingProgress: () => {
    const state = get()
    const { chunksAttempted, chunksCorrect } = state.trainingProgress
    const accuracy =
      chunksAttempted.length > 0 ? (chunksCorrect.length / chunksAttempted.length) * 100 : 0
  },

  getAdaptiveDifficulty: () => {
    const { adaptiveSettings } = get()
    return adaptiveSettings.difficultyMultiplier
  },

  resetTrainingSession: () => {
    set({
      trainingProgress: DEFAULT_PROGRESS,
      adaptiveSettings: {
        difficultyMultiplier: 1.0,
        noiseLevelMultiplier: 1.0,
        speedMultiplier: 1.0,
      },
    })
  },

  getNextChunkIndex: mode => {
    const { activeMaterial, currentChunkIndex, trainingProgress } = get()
    if (!activeMaterial) return 0

    switch (mode) {
      case 'sequential':
        return Math.min(currentChunkIndex + 1, activeMaterial.chunks.length - 1)

      case 'random':
        const unmasteredChunks = activeMaterial.chunks.filter(
          chunk => !trainingProgress.chunksCorrect.includes(chunk.id)
        )
        if (unmasteredChunks.length > 0) {
          const randomChunk = unmasteredChunks[Math.floor(Math.random() * unmasteredChunks.length)]
          return activeMaterial.chunks.findIndex(chunk => chunk.id === randomChunk.id)
        }
        return Math.floor(Math.random() * activeMaterial.chunks.length)

      case 'adaptive':
        const difficultChunks = activeMaterial.chunks.filter(chunk => {
          const chunkLength = chunk.text.length
          const hasBeenAttempted = trainingProgress.chunksAttempted.includes(chunk.id)
          const isCorrect = trainingProgress.chunksCorrect.includes(chunk.id)
          return !isCorrect || (hasBeenAttempted && chunkLength > 20)
        })

        if (difficultChunks.length > 0) {
          const targetChunk = difficultChunks[0]
          return activeMaterial.chunks.findIndex(chunk => chunk.id === targetChunk.id)
        }
        return Math.min(currentChunkIndex + 1, activeMaterial.chunks.length - 1)

      default:
        return currentChunkIndex
    }
  },

  updateSettings: newSettings => {
    set(state => {
      const newSettingsObj = { ...state.settings, ...newSettings }
      storageManager.setSettings(newSettingsObj)
      return { settings: newSettingsObj }
    })
  },

  toggleTheme: () => {
    set(state => {
      const newTheme = state.settings.theme === 'dark' ? 'light' : 'dark'
      const newSettings = { ...state.settings, theme: newTheme as 'dark' | 'light' }
      storageManager.setSettings(newSettings)
      return { settings: newSettings }
    })
  },

  toggleLanguage: () => {
    set(state => {
      const newLang = state.settings.language === 'zh' ? 'en' : 'zh'
      const newSettings = { ...state.settings, language: newLang as 'en' | 'zh' }
      storageManager.setSettings(newSettings)
      return { settings: newSettings }
    })
  },

  setChunkGap: gap => {
    const clampedGap = Math.max(0, Math.min(5, gap))
    set({ chunkGap: clampedGap })
  },
  toggleAutoPlayNext: () => {
    const newValue = !get().autoPlayNext
    set({ autoPlayNext: newValue })
  },
  setPlaybackRate: rate => set({ playbackRate: Math.max(0.5, Math.min(2.0, rate)) }),

  setIsLoadingAudio: loading => set({ isLoadingAudio: loading }),
  setStopAfterCurrentChunk: stop => set({ stopAfterCurrentChunk: stop }),
  setGapSound: sound => set({ gapSound: sound }),

  tick: delta => {
    const { isPlaying, isGap, currentTime, currentChunkIndex, activeMaterial } = get()
    if (isPlaying && !isGap && activeMaterial && currentChunkIndex < activeMaterial.chunks.length) {
      const currentChunk = activeMaterial.chunks[currentChunkIndex]
      const chunkEndTime = currentChunk.end_time

      // 只有在音频播放期间（通过isGap控制）才累加时间
      if (currentTime < chunkEndTime) {
        set({ currentTime: currentTime + delta })
      }
    }
  },
}))

initializeStore().then(({ settings, materials }) => {
  useStore.setState({ settings, materials })
})
