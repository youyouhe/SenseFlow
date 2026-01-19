import React, { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import {
  Play,
  Clock,
  Tag,
  Download,
  Sparkles,
  Loader2,
  Plus,
  ChevronRight,
  Wand2,
  Dices,
  Heart,
  Star,
  Users,
  Search,
  Filter,
  Mic,
  User,
  Trash2,
  Music,
  RefreshCw,
  X,
  Check,
  AlertCircle,
} from 'lucide-react'
import { Button } from './ui/Button'
import {
  StudyMaterial,
  ProviderType,
  ContentType,
  AIServiceConfig,
  SpeakerGender,
  Chunk,
  VoiceConfig,
} from '../types'
import { translations } from '../services/translations'
import { authService } from '../services/authService'
import { dataService } from '../services/dataService'
import { AIServiceFactory } from '../services/aiService'
import { CosyVoiceService } from '../services/cosyvoiceService'
import { WhisperXService } from '../services/whisperxService'
import { arrayBufferToBase64, extractAudioSegment } from '../services/audioUtils'
import { storageManager } from '../services/storageManager'

export const Library = ({ onViewPlayer }: { onViewPlayer: () => void }) => {
  const { materials, setMaterial, addMaterial, deleteMaterial, settings } = useStore()
  const t = translations[settings.language]

  // Generator State
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Insane'>('Medium')
  const [contentType, setContentType] = useState<ContentType>('monologue')
  const [speakerGender, setSpeakerGender] = useState<SpeakerGender>('male-female')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Voice Regeneration State
  const [voiceRegenMaterial, setVoiceRegenMaterial] = useState<StudyMaterial | null>(null)
  const [voiceRegenSpeaker, setVoiceRegenSpeaker] = useState<string>('')
  const [availableSpeakers, setAvailableSpeakers] = useState<string[]>([])
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regenProgress, setRegenProgress] = useState<{ current: number; total: number } | null>(
    null
  )
  const [regenError, setRegenError] = useState<string | null>(null)

  const handlePlay = (id: string) => {
    setMaterial(id)
    onViewPlayer()
  }

  const handleDelete = (id: string) => {
    if (deleteConfirmId === id) {
      deleteMaterial(id)
      setDeleteConfirmId(null)
    } else {
      setDeleteConfirmId(id)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null)
  }

  const difficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
      case 'Medium':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20'
      case 'Hard':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
      case 'Insane':
        return 'text-rose-500 bg-rose-500/10 border-rose-500/20'
      default:
        return 'text-zinc-400'
    }
  }

  const generateContent = async (mode: 'topic' | 'random') => {
    setError(null)
    setIsGenerating(true)

    try {
      const envApiKey = process.env.API_KEY

      let provider: ProviderType | null = null
      let apiKey = ''

      if (settings.openaiKey) {
        provider = 'openai'
        apiKey = settings.openaiKey
      } else if (settings.deepseekKey) {
        provider = 'deepseek'
        apiKey = settings.deepseekKey
      } else if (settings.geminiKey || envApiKey) {
        provider = 'gemini'
        apiKey = settings.geminiKey || envApiKey || ''
      }

      if (!provider || !apiKey) {
        throw new Error(t.err_no_key)
      }

      // Random topics for variety
      const randomTopics = [
        'A surprising discovery in daily life',
        'An unexpected friendship',
        'Learning a difficult lesson',
        'A moment of personal growth',
        'Finding beauty in small things',
        'Overcoming a common challenge',
        'A memorable travel experience',
        'The joy of helping others',
        'A fascinating hobby or passion',
        'Technology changing everyday life',
        'Childhood memories and nostalgia',
        'Future hopes and dreams',
        'Cultural differences and similarities',
        'Environmental awareness',
        'The power of kindness',
        'Creative problem solving',
        'A funny misunderstanding',
        'The importance of family',
        'Pursuing a lifelong goal',
        'Simple pleasures in life',
      ]

      const effectiveTopic =
        mode === 'random' ? randomTopics[Math.floor(Math.random() * randomTopics.length)] : topic

      const config: AIServiceConfig = { apiKey }
      const service = AIServiceFactory.createService(provider, config)

      const newMaterial = await service.generateChunks(
        effectiveTopic,
        difficulty,
        contentType,
        speakerGender
      )

      if (settings.ttsMode === 'cosyvoice' && settings.cosyvoiceApiUrl) {
        await generateTTSForMaterial(newMaterial)
      }

      addMaterial(newMaterial)
      setIsGeneratorOpen(false)
      setTopic('')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateTTSForMaterial = async (material: StudyMaterial): Promise<void> => {
    const startTime = Date.now()
    console.log('[TTS] Starting TTS generation for material:', material.id)

    const cosyvoice = new CosyVoiceService({
      baseUrl: settings.cosyvoiceApiUrl || 'http://localhost:9880',
      mode: settings.cosyvoiceMode || '预训练音色',
      speaker: settings.cosyvoiceSpeaker || '',
      speed: settings.cosyvoiceSpeed || 1.0,
    })

    const whisperx = settings.whisperxApiUrl
      ? new WhisperXService(settings.whisperxApiUrl || 'http://localhost:8000')
      : null

    // CRITICAL: Use original_text for TTS to ensure audio matches the intended content
    // Chunks are derived from original_text and should not contain additional words
    const fullText = material.original_text || material.chunks.map(c => c.text).join(' ')
    console.log('[TTS] Full text length:', fullText.length, 'chars')
    console.log('[TTS] Text source:', material.original_text ? 'original_text' : 'chunks fallback')
    console.log('[TTS] Full text preview:', fullText.substring(0, 100) + '...')

    let validSpeaker = settings.cosyvoiceSpeaker
    if (!validSpeaker) {
      try {
        const speakersResult = await cosyvoice.getSpeakers()
        console.log('[TTS] Available speakers:', speakersResult.speakers)
        if (speakersResult.speakers && speakersResult.speakers.length > 0) {
          validSpeaker = speakersResult.speakers[0]
        }
      } catch (err) {
        console.warn('[TTS] Failed to get speakers:', err)
      }
    }

    if (!validSpeaker) {
      throw new Error('No valid speaker available. Please configure CosyVoice speaker in Settings.')
    }

    console.log('[TTS] Using speaker:', validSpeaker)
    cosyvoice.updateConfig({ speaker: validSpeaker })

    // Detect language from material text for WhisperX alignment
    const detectLanguage = (text: string): string => {
      const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
      const totalChars = text.length
      return chineseChars > totalChars * 0.3 ? 'zh' : 'en'
    }
    const detectedLang = detectLanguage(fullText)
    console.log('[TTS] Detected language for WhisperX:', detectedLang)

    console.log('[TTS] Calling CosyVoice TTS...')
    const ttsResult = await cosyvoice.generateAudioWithTimestamps(fullText, detectedLang)
    const fullAudio = ttsResult.audio
    console.log('[TTS] TTS complete. Audio size:', fullAudio.byteLength, 'bytes')

    // Get actual audio duration by decoding
    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(fullAudio.slice(0))
    const actualAudioDuration = audioBuffer.duration
    const sampleRate = audioBuffer.sampleRate
    console.log('[TTS] Actual audio duration:', actualAudioDuration, 'seconds')
    console.log('[TTS] Audio sample rate:', sampleRate, 'Hz')

    // Update material duration with actual value
    material.duration = Number(actualAudioDuration.toFixed(2))

    console.log('[TTS] CosyVoice returned words:', ttsResult.words?.length || 0)
    if (ttsResult.words && ttsResult.words.length > 0) {
      console.log(
        '[TTS] CosyVoice words time range:',
        ttsResult.words[0].start,
        '-',
        ttsResult.words[ttsResult.words.length - 1].end
      )
      console.log('[TTS] CosyVoice words preview (first 5):', ttsResult.words.slice(0, 5))
    }

    // Save full audio for debugging
    const fullAudioBase64 = arrayBufferToBase64(fullAudio)
    console.log('[TTS] Full audio base64 length:', fullAudioBase64.length)
    console.log(
      '[TTS] Full audio base64 preview (first 200 chars):',
      fullAudioBase64.substring(0, 200)
    )

    // Optionally create a downloadable link for the full audio
    try {
      const blob = new Blob([fullAudio], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      console.log('[TTS] Full audio downloadable URL:', url)
      // Store for potential download (you can add a download button if needed)
      ;(window as any).debugFullAudioUrl = url
    } catch (err) {
      console.warn('[TTS] Could not create blob for download:', err)
    }

    let allWords: any[] = []
    console.log('[TTS] WhisperX available:', !!whisperx)
    console.log('[TTS] WhisperX alignment enabled:', settings.whisperxEnableAlignment)
    console.log('[TTS] CosyVoice words count:', ttsResult.words?.length || 0)

    if (whisperx && settings.whisperxEnableAlignment) {
      try {
        console.log('[TTS] Calling WhisperX for alignment...')
        const transcribeResult = await whisperx.transcribe(fullAudio, {
          language: settings.whisperxLanguage || 'en',
          model: settings.whisperxModel || 'large-v2',
          alignOutput: true,
        })
        allWords = whisperx.convertToWordTimestamps(transcribeResult, 0)
        console.log('[TTS] WhisperX complete. Words count:', allWords.length)
      } catch (err) {
        console.warn('[TTS] WhisperX alignment failed, using CosyVoice words:', err)
        allWords = ttsResult.words || []
      }
    } else {
      allWords = ttsResult.words || []
      console.log('[TTS] Using CosyVoice words. Count:', allWords.length)
    }

    console.log('[TTS] Final allWords count for alignment:', allWords.length)
    if (allWords.length > 0) {
      console.log('[TTS] First few words:', allWords.slice(0, 3))
    }

    // Use text-based sequence matching to assign words to chunks
    // This is more reliable than time-based matching because chunk timestamps are estimated
    let wordIndex = 0
    let successCount = 0

    // First pass: assign words to chunks by text matching
    for (let i = 0; i < material.chunks.length; i++) {
      const chunk = material.chunks[i]
      try {
        console.log(
          `[TTS] Processing chunk ${i + 1}/${material.chunks.length}:`,
          `text="${chunk.text}"`,
          `time=${chunk.start_time}s - ${chunk.end_time}s (estimated)`
        )

        // Build chunk text word list for matching
        const chunkTextWords = chunk.text.split(/\s+/).filter(w => w.length > 0)

        // Assign words from allWords to this chunk by sequence
        const chunkWords: any[] = []
        let matchedWordCount = 0

        for (const textWord of chunkTextWords) {
          if (wordIndex >= allWords.length) break

          const currentWord = allWords[wordIndex]
          const wordText = currentWord.word.trim().replace(/[.,!?;:\"'()]/g, '')
          const textWordClean = textWord.trim().replace(/[.,!?;:\"'()]/g, '')

          // Check if words match (fuzzy matching to handle punctuation/case differences)
          if (wordText.toLowerCase() === textWordClean.toLowerCase()) {
            chunkWords.push({ ...currentWord })
            matchedWordCount++
            wordIndex++
          } else {
            // Word mismatch - try to find the matching word in next few positions
            // This handles cases where WhisperX might skip or misalign some words
            let found = false
            for (
              let lookAhead = 1;
              lookAhead <= 5 && wordIndex + lookAhead < allWords.length;
              lookAhead++
            ) {
              const lookAheadWord = allWords[wordIndex + lookAhead]
              const lookAheadText = lookAheadWord.word.trim().replace(/[.,!?;:\"'()]/g, '')
              if (lookAheadText.toLowerCase() === textWordClean.toLowerCase()) {
                // Found it! Add the skipped words and this word
                for (let k = 0; k <= lookAhead; k++) {
                  chunkWords.push({ ...allWords[wordIndex + k] })
                  matchedWordCount++
                }
                wordIndex += lookAhead + 1
                found = true
                break
              }
            }

            if (!found) {
              // CRITICAL FIX: If we can't find a better match ahead, trust the sequence.
              // Use the time from WhisperX but keep the original word from text to maintain consistency.
              console.warn(
                `[TTS] Chunk ${i + 1}: Mismatch detected ("${textWordClean}" vs "${wordText}"). ` +
                  `Trusting sequence and keeping current word at index ${wordIndex}`
              )
              chunkWords.push({ ...currentWord, word: textWord }) // Keep estimated word from text
              matchedWordCount++
              wordIndex++
            }
          }
        }

        chunk.words = chunkWords
        console.log(`[TTS] Chunk ${i + 1} aligned ${chunk.words.length} words`)
        successCount++
      } catch (err) {
        console.error(`[TTS] Failed to process chunk ${i + 1}:`, err)
      }
    }

    // Second pass: recalculate chunk timestamps based on actual word timestamps
    console.log('[TTS] Recalculating chunk timestamps based on WhisperX word alignments...')
    let lastEndTime = 0
    for (let i = 0; i < material.chunks.length; i++) {
      const chunk = material.chunks[i]
      if (chunk.words && chunk.words.length > 0) {
        // Store original word timestamps before modification
        const originalWords = chunk.words.map(w => ({ ...w }))

        // Use first and last word timestamps to determine chunk boundaries
        const firstWordStart = originalWords[0].start
        const lastWordEnd = originalWords[originalWords.length - 1].end

        // Add small padding (0.1s before) for natural pauses, but use word-level end as boundary
        const padding = 0.1
        let startTime = Math.max(0, firstWordStart - padding)

        // FIX: Prevent timestamp overlap with previous chunk
        if (startTime < lastEndTime) {
          startTime = lastEndTime
        }

        chunk.start_time = startTime
        chunk.end_time = lastWordEnd // 统一使用词级end作为chunk结束时间
        lastEndTime = chunk.end_time

        // Adjust word timestamps relative to new chunk start
        for (let j = 0; j < chunk.words.length; j++) {
          chunk.words[j].start = Math.max(0, originalWords[j].start - chunk.start_time)
          chunk.words[j].end = originalWords[j].end - chunk.start_time
        }

        console.log(
          `[TTS] Chunk ${i + 1}: "${chunk.text}"`,
          `time=${chunk.start_time.toFixed(2)}s - ${chunk.end_time.toFixed(2)}s`,
          `duration=${(chunk.end_time - chunk.start_time).toFixed(2)}s`,
          `words=${chunk.words.length}`
        )
      } else {
        // Fallback: use estimated timestamps (no word alignment available)
        console.warn(`[TTS] Chunk ${i + 1} has no word alignment, using estimated timestamps`)
      }
    }

    // Third pass: extract audio segments using recalculated timestamps
    console.log('[TTS] Extracting audio segments with recalculated timestamps...')
    for (let i = 0; i < material.chunks.length; i++) {
      const chunk = material.chunks[i]
      try {
        const chunkAudio = await extractAudioSegment(fullAudio, chunk.start_time, chunk.end_time)
        chunk.audioData = arrayBufferToBase64(chunkAudio)

        console.log(
          `[TTS] Chunk ${i + 1} audioData length:`,
          chunk.audioData?.length,
          'words:',
          chunk.words?.length
        )
      } catch (err) {
        console.error(`[TTS] Failed to extract audio for chunk ${i + 1}:`, err)
      }
    }

    material.ttsGenerated = true

    // Save voice configuration for future regeneration
    material.voiceConfig = {
      speaker: validSpeaker,
      speed: settings.cosyvoiceSpeed || 1.0,
      generatedAt: Date.now(),
    }

    const elapsed = Date.now() - startTime
    console.log(
      `[TTS] Complete! ${successCount}/${material.chunks.length} chunks processed in ${elapsed}ms`
    )

    // Provide a way to download the full audio for debugging
    console.log('[TTS] === DEBUG INFO ===')
    console.log('[TTS] To download the full audio, run this in console:')
    console.log(
      '[TTS]',
      `
      const link = document.createElement('a');
      link.href = window.debugFullAudioUrl;
      link.download = 'full_audio_${material.id}.wav';
      link.click();
    `
    )
    console.log('[TTS] Or just open this URL in a new tab:', (window as any).debugFullAudioUrl)
    console.log('[TTS] === END DEBUG INFO ===')
  }

  // Voice Regeneration Functions
  const openVoiceRegenModal = async (material: StudyMaterial) => {
    setVoiceRegenMaterial(material)
    setVoiceRegenSpeaker('')
    setRegenError(null)
    setIsLoadingSpeakers(true)

    try {
      const cosyvoice = new CosyVoiceService({
        baseUrl: settings.cosyvoiceApiUrl || 'http://localhost:9880',
        mode: settings.cosyvoiceMode || '预训练音色',
        speaker: settings.cosyvoiceSpeaker || '',
        speed: 1.0,
      })

      const speakersResult = await cosyvoice.getSpeakers()
      setAvailableSpeakers(speakersResult.speakers || [])
    } catch (err) {
      console.error('Failed to fetch speakers:', err)
      setRegenError('无法获取音色列表，请检查 CosyVoice 服务')
      setAvailableSpeakers(['中文女', '中文男', '英文女', '英文男'])
    } finally {
      setIsLoadingSpeakers(false)
    }
  }

  const closeVoiceRegenModal = () => {
    setVoiceRegenMaterial(null)
    setVoiceRegenSpeaker('')
    setRegenError(null)
    setRegenProgress(null)
  }

  const regenerateVoice = async () => {
    if (!voiceRegenMaterial || !voiceRegenSpeaker) return

    setIsRegenerating(true)
    setRegenProgress({ current: 0, total: voiceRegenMaterial.chunks.length })
    setRegenError(null)

    try {
      const material = voiceRegenMaterial
      const totalChunks = material.chunks.length

      // Create CosyVoice service with new speaker
      const cosyvoice = new CosyVoiceService({
        baseUrl: settings.cosyvoiceApiUrl || 'http://localhost:9880',
        mode: settings.cosyvoiceMode || '预训练音色',
        speaker: voiceRegenSpeaker,
        speed: 1.0,
      })

      // Detect language
      const fullText = material.original_text || material.chunks.map(c => c.text).join(' ')
      const detectLanguage = (text: string): string => {
        const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
        const totalChars = text.length
        return chineseChars > totalChars * 0.3 ? 'zh' : 'en'
      }
      const detectedLang = detectLanguage(fullText)

      // Generate full audio with new voice
      console.log('[VoiceRegen] Generating audio with new voice:', voiceRegenSpeaker)
      const ttsResult = await cosyvoice.generateAudioWithTimestamps(fullText, detectedLang)
      const fullAudio = ttsResult.audio

      // Get actual audio duration
      const audioContext = new AudioContext()
      const audioBuffer = await audioContext.decodeAudioData(fullAudio.slice(0))
      material.duration = Number(audioBuffer.duration.toFixed(2))

      // Clear old audio data
      for (const chunk of material.chunks) {
        chunk.audioData = undefined
        chunk.words = undefined
      }

      // Use WhisperX if available for alignment
      const whisperx = settings.whisperxApiUrl
        ? new WhisperXService(settings.whisperxApiUrl || 'http://localhost:8000')
        : null

      let allWords: any[] = []

      if (whisperx && settings.whisperxEnableAlignment) {
        try {
          const transcribeResult = await whisperx.transcribe(fullAudio, {
            language: settings.whisperxLanguage || 'en',
            model: settings.whisperxModel || 'large-v2',
            alignOutput: true,
          })
          allWords = whisperx.convertToWordTimestamps(transcribeResult, 0)
        } catch (err) {
          console.warn('[VoiceRegen] WhisperX alignment failed, using CosyVoice words')
          allWords = ttsResult.words || []
        }
      } else {
        allWords = ttsResult.words || []
      }

      // Assign words to chunks by text matching
      let wordIndex = 0
      for (let i = 0; i < material.chunks.length; i++) {
        const chunk = material.chunks[i]
        const chunkTextWords = chunk.text.split(/\s+/).filter(w => w.length > 0)
        const chunkWords: any[] = []

        for (const textWord of chunkTextWords) {
          if (wordIndex >= allWords.length) break

          const currentWord = allWords[wordIndex]
          const wordText = currentWord.word.trim().replace(/[.,!?;:\"'()]/g, '')
          const textWordClean = textWord.trim().replace(/[.,!?;:\"'()]/g, '')

          if (wordText.toLowerCase() === textWordClean.toLowerCase()) {
            chunkWords.push({ ...currentWord })
            wordIndex++
          } else {
            chunkWords.push({ ...currentWord, word: textWord })
            wordIndex++
          }
        }

        chunk.words = chunkWords
      }

      // Recalculate chunk timestamps
      let lastEndTime = 0
      for (let i = 0; i < material.chunks.length; i++) {
        const chunk = material.chunks[i]
        if (chunk.words && chunk.words.length > 0) {
          const originalWords = chunk.words.map(w => ({ ...w }))
          const firstWordStart = originalWords[0].start
          const lastWordEnd = originalWords[originalWords.length - 1].end

          const padding = 0.1
          let startTime = Math.max(0, firstWordStart - padding)
          if (startTime < lastEndTime) startTime = lastEndTime

          chunk.start_time = startTime
          chunk.end_time = lastWordEnd
          lastEndTime = chunk.end_time

          for (let j = 0; j < chunk.words.length; j++) {
            chunk.words[j].start = Math.max(0, originalWords[j].start - chunk.start_time)
            chunk.words[j].end = originalWords[j].end - chunk.start_time
          }
        }
      }

      // Extract audio segments and update progress
      for (let i = 0; i < material.chunks.length; i++) {
        const chunk = material.chunks[i]
        try {
          const chunkAudio = await extractAudioSegment(fullAudio, chunk.start_time, chunk.end_time)
          chunk.audioData = arrayBufferToBase64(chunkAudio)
        } catch (err) {
          console.error(`[VoiceRegen] Failed to extract audio for chunk ${i + 1}:`, err)
        }

        setRegenProgress({ current: i + 1, total: totalChunks })
      }

      // Save voice configuration
      material.voiceConfig = {
        speaker: voiceRegenSpeaker,
        speed: 1.0,
        generatedAt: Date.now(),
      }
      material.ttsGenerated = true

      // Save to storage and update store
      await storageManager.saveMaterial(material)

      // Update in materials list
      useStore.setState(state => ({
        materials: state.materials.map(m => (m.id === material.id ? material : m)),
      }))

      closeVoiceRegenModal()
    } catch (err: any) {
      console.error('[VoiceRegen] Failed:', err)
      setRegenError(err.message || '音频生成失败，请重试')
    } finally {
      setIsRegenerating(false)
    }
  }

  // Voice Regeneration Modal
  const renderVoiceRegenModal = () => {
    if (!voiceRegenMaterial) return null

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
        <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md mx-4 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Music className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  重新生成音频
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate max-w-[200px]">
                  {voiceRegenMaterial.title}
                </p>
              </div>
            </div>
            <button
              onClick={closeVoiceRegenModal}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Voice Info */}
          {voiceRegenMaterial.voiceConfig && (
            <div className="mb-4 p-3 bg-secondary rounded-lg border border-border">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">当前音色</div>
              <div className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                <Mic className="w-4 h-4 text-zinc-400" />
                {voiceRegenMaterial.voiceConfig.speaker}
              </div>
            </div>
          )}

          {/* Error */}
          {regenError && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-500/10 rounded-lg border border-rose-200 dark:border-rose-500/20">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{regenError}</span>
              </div>
            </div>
          )}

          {/* Speaker Selection */}
          {!isRegenerating && !regenProgress && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  选择新音色
                </label>
                {isLoadingSpeakers ? (
                  <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在获取音色列表...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {availableSpeakers.map(speaker => (
                      <button
                        key={speaker}
                        onClick={() => setVoiceRegenSpeaker(speaker)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          voiceRegenSpeaker === speaker
                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-indigo-500/50'
                        }`}
                      >
                        {speaker}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={closeVoiceRegenModal} className="flex-1">
                  取消
                </Button>
                <Button
                  onClick={regenerateVoice}
                  disabled={!voiceRegenSpeaker || isLoadingSpeakers}
                  className="flex-1 gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  开始生成
                </Button>
              </div>
            </>
          )}

          {/* Progress */}
          {isRegenerating && regenProgress && (
            <div className="py-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">正在生成音频...</span>
                <span className="text-sm font-mono text-indigo-500">
                  {regenProgress.current}/{regenProgress.total}
                </span>
              </div>
              <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${(regenProgress.current / regenProgress.total) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 text-center">
                正在处理第 {regenProgress.current} 个片段，共 {regenProgress.total} 个
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Voice Regeneration Modal */}
      {renderVoiceRegenModal()}

      <div className="p-8 space-y-8 animate-fade-in pb-24">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {t.lib_title}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">{t.lib_subtitle}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              {t.lib_import}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsGeneratorOpen(!isGeneratorOpen)}
            >
              <Sparkles className="w-4 h-4 text-accent" />
              {t.lib_workshop_btn}
            </Button>
          </div>
        </div>

        {/* AI Generator Panel */}
        {isGeneratorOpen && (
          <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-secondary border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-6 space-y-4 animate-in slide-in-from-top-4 fade-in duration-300 shadow-xl shadow-indigo-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Wand2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                {t.lib_gen_title}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                  {t.lib_gen_topic}
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder={t.lib_gen_topic_ph}
                  className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2.5 px-4 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                  {t.lib_gen_diff}
                </label>
                <select
                  value={difficulty}
                  onChange={e =>
                    setDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard' | 'Insane')
                  }
                  className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2.5 px-4 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none transition-colors"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="Insane">Insane</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                  Content Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setContentType('monologue')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-colors ${
                      contentType === 'monologue'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-500/50'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                    <span className="text-sm font-medium">Single Voice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentType('dialogue')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-colors ${
                      contentType === 'dialogue'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-500/50'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">Dialogue</span>
                  </button>
                </div>
              </div>

              {contentType === 'dialogue' && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                    Speaker Gender
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSpeakerGender('male-male')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-colors ${
                        speakerGender === 'male-male'
                          ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-blue-500/50'
                      }`}
                    >
                      <span className="text-sm font-medium">Male-Male</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpeakerGender('male-female')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-colors ${
                        speakerGender === 'male-female'
                          ? 'bg-violet-500/10 border-violet-500 text-violet-600 dark:text-violet-400'
                          : 'bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-violet-500/50'
                      }`}
                    >
                      <span className="text-sm font-medium">Male-Female</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpeakerGender('female-female')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-colors ${
                        speakerGender === 'female-female'
                          ? 'bg-pink-500/10 border-pink-500 text-pink-600 dark:text-pink-400'
                          : 'bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-pink-500/50'
                      }`}
                    >
                      <span className="text-sm font-medium">Female-Female</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="text-rose-500 text-sm bg-rose-50 dark:bg-rose-500/10 p-2 rounded border border-rose-200 dark:border-rose-500/20">
                {error}
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-end gap-3 pt-2">
              {/* Random Button */}
              <Button
                onClick={() => generateContent('random')}
                disabled={isGenerating}
                variant="secondary"
                className="gap-2 w-full md:w-auto"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Dices className="w-4 h-4" />
                )}
                {isGenerating ? t.lib_gen_btn_loading : t.lib_gen_btn_random}
              </Button>

              {/* Specific Generate Button */}
              <Button
                onClick={() => generateContent('topic')}
                disabled={isGenerating || !topic.trim()}
                className="gap-2 w-full md:w-auto min-w-[140px]"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {isGenerating ? t.lib_gen_btn_loading : t.lib_gen_btn_create}
              </Button>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map(item => (
            <div
              key={item.id}
              className="group bg-surface rounded-xl border border-border p-5 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 dark:hover:bg-zinc-800/50 hover:bg-zinc-50 transition-all duration-300 flex flex-col h-full relative overflow-hidden"
            >
              {/* Hover Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="flex justify-between items-start mb-4 relative z-10">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${difficultyColor(item.config.difficulty)}`}
                >
                  {item.config.difficulty}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 bg-secondary border border-border px-2 py-1 rounded flex items-center gap-1.5">
                  {item.config.provider_type === 'gemini' && (
                    <Sparkles className="w-3 h-3 text-sky-400" />
                  )}
                  {item.config.provider_type}
                </span>
              </div>

              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors relative z-10">
                {item.title}
              </h3>

              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 flex-grow line-clamp-2 relative z-10">
                {item.description}
              </p>

              <div className="space-y-4 relative z-10">
                <div className="flex flex-wrap gap-2">
                  {item.config.tags.slice(0, 3).map(tag => (
                    <div
                      key={tag}
                      className="flex items-center text-xs text-zinc-500 dark:text-zinc-400 bg-secondary px-2 py-1 rounded"
                    >
                      <Tag className="w-3 h-3 mr-1 opacity-50" />
                      {tag}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4 mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-zinc-500 dark:text-zinc-400 text-sm font-mono">
                      <Clock className="w-4 h-4 mr-1.5 text-zinc-400" />
                      {item.duration}s
                    </div>
                    {/* Voice Config Display */}
                    {item.voiceConfig && (
                      <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 bg-secondary px-2 py-1 rounded">
                        <Mic className="w-3 h-3" />
                        {item.voiceConfig.speaker}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Regenerate Audio Button */}
                    {item.ttsGenerated && (
                      <button
                        onClick={() => openVoiceRegenModal(item)}
                        className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="重新生成音频"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    {/* Delete Button */}
                    {deleteConfirmId === item.id ? (
                      <>
                        <button
                          onClick={handleDeleteCancel}
                          className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-3 py-1.5 text-xs font-medium bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
                        >
                          确认删除
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <Button
                      onClick={() => handlePlay(item.id)}
                      size="sm"
                      className="gap-1 pl-4 pr-3"
                    >
                      {t.lib_start}
                      <ChevronRight className="w-4 h-4 opacity-60" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
