import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { audioService } from '../services/audioService'
import { Chunk } from '../types'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Waves,
  Settings2,
  Rewind,
  AlignLeft,
  AlignJustify,
  Brain,
  Target,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Volume,
  Gauge,
  Music,
  User,
} from 'lucide-react'
import { Button } from './ui/Button'
import { translations } from '../services/translations'

export const Player = () => {
  const {
    activeMaterial,
    isPlaying,
    isLoadingAudio,
    currentTime,
    duration,
    currentChunkIndex,
    play,
    pause,
    stop,
    seek,
    tick,
    voiceVolume,
    setVoiceVolume,
    noiseVolume,
    setNoiseVolume,
    noiseEnabled,
    toggleNoise,
    playerViewMode,
    setPlayerViewMode,
    trainingMode,
    setTrainingMode,
    showHints,
    toggleHints,
    trainingProgress,
    adaptiveSettings,
    markChunkAttempt,
    markChunkCorrect,
    calculateTrainingProgress,
    resetTrainingSession,
    settings,
    updateSettings,
    chunkGap,
    setChunkGap,
    gapSound,
    setGapSound,
    autoPlayNext,
    toggleAutoPlayNext,
    playbackRate,
    setPlaybackRate,
    setStopAfterCurrentChunk,
  } = useStore()
  const t = translations[settings.language]

  const [showTrainingPanel, setShowTrainingPanel] = useState(false)
  const [currentChunkResponse, setCurrentChunkResponse] = useState<'correct' | 'incorrect' | null>(
    null
  )
  const [quickSpeaker, setQuickSpeaker] = useState(settings.cosyvoiceSpeaker || '中文女')
  const [isChangingSpeaker, setIsChangingSpeaker] = useState(false)
  const [availableSpeakers, setAvailableSpeakers] = useState<string[]>([])
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(false)

  // Refs for auto-scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const activeChunkRef = useRef<HTMLElement>(null)

  // Fetch available speakers from CosyVoice API
  useEffect(() => {
    const fetchSpeakers = async () => {
      if (settings.ttsMode === 'cosyvoice') {
        setIsLoadingSpeakers(true)
        try {
          const response = await fetch(
            `${settings.cosyvoiceApiUrl || 'http://localhost:9880'}/speakers`
          )
          if (response.ok) {
            const data = await response.json()
            if (data.speakers && data.speakers.length > 0) {
              setAvailableSpeakers(data.speakers)
              if (!quickSpeaker && data.speakers.length > 0) {
                setQuickSpeaker(data.speakers[0])
              }
            } else {
              setAvailableSpeakers(['中文女', '中文男', '英文女', '英文男'])
            }
          } else {
            setAvailableSpeakers(['中文女', '中文男', '英文女', '英文男'])
          }
        } catch (error) {
          console.warn('Failed to fetch speakers:', error)
          setAvailableSpeakers(['中文女', '中文男', '英文女', '英文男'])
        }
        setIsLoadingSpeakers(false)
      }
    }
    fetchSpeakers()
  }, [settings.ttsMode, settings.cosyvoiceApiUrl])

  // --- TTS Speak Function ---
  const speakText = async (text: string, chunk?: Chunk) => {
    // Stop any currently playing audio
    audioService.stop()

    // If chunk has pre-generated audioData, use it
    if (chunk?.audioData) {
      try {
        const { base64ToArrayBuffer } = await import('../services/audioUtils')
        const arrayBuffer = base64ToArrayBuffer(chunk.audioData)
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

        // Play the audio
        const source = audioContext.createBufferSource()
        source.buffer = audioBuffer

        const gainNode = audioContext.createGain()
        gainNode.gain.value = voiceVolume

        source.connect(gainNode)
        gainNode.connect(audioContext.destination)

        source.start()
        return
      } catch (error) {
        console.warn('Failed to play pre-generated audio, falling back to TTS:', error)
      }
    }

    // Fall back to browser TTS
    if ('speechSynthesis' in window && settings.clickToSpeak) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = voiceVolume

      const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'))
      console.log(
        'Available English voices:',
        voices.map(v => v.name)
      )
      let selectedVoice = null

      if (chunk && activeMaterial?.config.content_type === 'dialogue' && chunk.speaker) {
        const speakerGender = activeMaterial.config.speaker_gender || 'male-female'
        console.log('Dialogue speaker_gender:', speakerGender)
        const isSpeakerA = chunk.speaker === 'A'
        console.log('Chunk speaker:', chunk.speaker, 'isSpeakerA:', isSpeakerA)
        const speakerType = isSpeakerA ? speakerGender.split('-')[0] : speakerGender.split('-')[1]
        console.log('Determined speakerType:', speakerType)

        if (speakerType === 'male') {
          const malePatterns = [
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
          ]
          const maleVoices = voices.filter(
            v =>
              !v.name.toLowerCase().includes('female') && malePatterns.some(p => v.name.includes(p))
          )
          console.log(
            'Male voices matched:',
            maleVoices.map(v => v.name)
          )
          if (maleVoices.length > 0) {
            selectedVoice = maleVoices[0]
          } else {
            const nonFemale = voices.filter(v => !v.name.toLowerCase().includes('female'))
            console.log(
              'Non-female voices:',
              nonFemale.map(v => v.name)
            )
            if (nonFemale.length > 0) {
              selectedVoice = nonFemale[0]
            }
          }
          console.log('Selected male voice:', selectedVoice?.name || 'NONE')
        } else {
          const femalePatterns = [
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
          ]
          const femaleVoices = voices.filter(v => femalePatterns.some(p => v.name.includes(p)))
          console.log(
            'Female voices matched:',
            femaleVoices.map(v => v.name)
          )
          if (femaleVoices.length > 0) {
            selectedVoice = femaleVoices[0]
          } else {
            const withFemale = voices.filter(v => v.name.toLowerCase().includes('female'))
            console.log(
              'Voices with "female":',
              withFemale.map(v => v.name)
            )
            if (withFemale.length > 0) {
              selectedVoice = withFemale[0]
            }
          }
          console.log('Selected female voice:', selectedVoice?.name || 'NONE')
        }
      }

      if (!selectedVoice) {
        const fallbackVoice = voices.find(
          v =>
            v.name.includes('Natural') ||
            v.name.includes('Premium') ||
            v.name.includes('Microsoft') ||
            v.name.includes('Google')
        )
        console.log(
          'Fallback voice (Natural/Premium/Microsoft/Google):',
          fallbackVoice?.name || 'NONE'
        )
        selectedVoice = fallbackVoice
      }

      if (!selectedVoice && voices.length > 0) {
        console.log('Final fallback: using first voice:', voices[0].name)
        selectedVoice = voices[0]
      }

      console.log('FINAL selected voice:', selectedVoice?.name || 'NONE')

      if (selectedVoice) {
        utterance.voice = selectedVoice
      }

      window.speechSynthesis.speak(utterance)
    }
  }

  // Handle chunk click/double-click
  const handleChunkClick = (chunk: Chunk, e: React.MouseEvent) => {
    if (settings.clickToSpeak) {
      if (e.detail === 2) {
        e.preventDefault()
        speakText(chunk.text, chunk)
      }
    }
    if (e.detail === 1) {
      seek(chunk.start_time)
    }
  }

  // Handle full-text chunk click (single click to seek, double click to speak)
  const handleFullTextChunkClick = (chunk: Chunk, e: React.MouseEvent) => {
    if (settings.enableClickSpeakInFullMode && settings.clickToSpeak) {
      if (e.detail === 2) {
        e.preventDefault()
        speakText(chunk.text, chunk)
        return
      }
    }
    if (e.detail === 1) {
      seek(chunk.start_time)
    }
  }

  // --- Animation Loop ---
  const requestRef = useRef<number | undefined>(undefined)
  const previousTimeRef = useRef<number | undefined>(undefined)

  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = (time - previousTimeRef.current) / 1000
      tick(deltaTime)
    }
    previousTimeRef.current = time
    requestRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(requestRef.current!)
  }, [isPlaying])

  useEffect(() => {
    previousTimeRef.current = undefined
  }, [isPlaying])

  // --- Auto-Scrolling ---
  useEffect(() => {
    if (activeChunkRef.current && scrollContainerRef.current && isPlaying) {
      activeChunkRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [currentTime, isPlaying, playerViewMode])

  // --- Helpers ---
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isChunkActive = (start: number, end: number) => {
    return currentTime >= start && currentTime < end
  }

  // 修复：考虑gap期间的chunk活跃状态
  const isChunkActiveWithGap = (chunk: Chunk) => {
    const chunkEndTimeWithGap = chunk.end_time + chunkGap
    return currentTime >= chunk.start_time && currentTime < chunkEndTimeWithGap
  }

  // Check if a word within a chunk should be highlighted based on word-level timestamps
  const isWordActive = (chunk: Chunk, wordStart: number, wordEnd: number) => {
    const chunkRelativeTime = currentTime - chunk.start_time
    const chunkDuration = chunk.end_time - chunk.start_time
    // 修复：只在音频播放期间（不包括gap）高亮单词
    return (
      chunkRelativeTime >= wordStart &&
      chunkRelativeTime < wordEnd &&
      chunkRelativeTime < chunkDuration
    )
  }

  // Render text with word-level highlighting if available
  const renderTextWithWordHighlighting = (chunk: Chunk, isActive: boolean) => {
    // Strategy: Always use chunk.text for display, only use words for highlighting if they match
    if (chunk.words && chunk.words.length > 0) {
      const wordsText = chunk.words.map(w => w.word).join(' ')

      // Only use words for highlighting if they perfectly match the actual chunk text
      // This prevents displaying incorrect/outdated word timestamps from WhisperX transcription errors
      if (wordsText === chunk.text) {
        return (
          <>
            {chunk.words.map((word, idx) => {
              const wordActive = isActive && isWordActive(chunk, word.start, word.end)
              return (
                <span
                  key={idx}
                  className={`
                    transition-colors duration-150 rounded px-0.5 py-0.5
                    ${
                      wordActive
                        ? 'bg-yellow-400/80 text-zinc-900 dark:bg-yellow-500/80 dark:text-zinc-900'
                        : ''
                    }
                  `}
                >
                  {word.word}
                </span>
              )
            })}
          </>
        )
      }
    }

    // Default: Always render the original chunk.text (most reliable)
    return chunk.text
  }

  if (!activeMaterial) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-600">
        <Waves className="w-16 h-16 mb-4 opacity-20" />
        <p>{t.player_empty}</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-background transition-colors duration-300">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10 bg-gradient-to-b from-background via-background/95 to-transparent flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {activeMaterial.title}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-xs font-medium border border-indigo-500/20">
              {playerViewMode === 'chunk' ? t.player_chunk_mode : t.player_full_mode}
            </span>
            <span className="text-zinc-500 text-sm">• {activeMaterial.config.difficulty}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="bg-surface border border-border rounded-lg p-1 flex gap-1 shadow-sm">
            <button
              onClick={() => setPlayerViewMode('chunk')}
              className={`p-1.5 rounded transition-all ${playerViewMode === 'chunk' ? 'bg-indigo-500 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
              title={t.player_chunk_mode}
            >
              <AlignJustify className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPlayerViewMode('full')}
              className={`p-1.5 rounded transition-all ${playerViewMode === 'full' ? 'bg-indigo-500 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
              title={t.player_full_mode}
            >
              <AlignLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-surface border border-border rounded-lg p-1 flex gap-1 shadow-sm">
            <button
              onClick={() => setShowTrainingPanel(!showTrainingPanel)}
              className={`p-1.5 rounded transition-all ${showTrainingPanel ? 'bg-rose-500 text-white shadow-sm' : 'text-zinc-500 hover:text-rose-600 dark:hover:text-rose-300'}`}
              title={t.player_training_modes || 'Training Modes'}
            >
              <Brain className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Training Panel */}
      {showTrainingPanel && (
        <div className="absolute top-24 left-6 right-6 z-20 bg-surface border border-border rounded-xl shadow-xl p-6 pointer-events-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-rose-500" />
              {t.player_training_modes || 'Training Modes'}
            </h3>
            <button
              onClick={() => setShowTrainingPanel(false)}
              className="text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Training Mode Selection */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button
              onClick={() => setTrainingMode('practice')}
              className={`p-3 rounded-lg border transition-all ${
                trainingMode === 'practice'
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-border hover:border-emerald-500 text-zinc-600 dark:text-zinc-300'
              }`}
              title={t.player_mode_practice || 'Practice Mode'}
            >
              <Target className="w-5 h-5 mx-auto mb-1" />
              <div className="text-sm font-medium">Practice</div>
            </button>

            <button
              onClick={() => setTrainingMode('test')}
              className={`p-3 rounded-lg border transition-all ${
                trainingMode === 'test'
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'border-border hover:border-amber-500 text-zinc-600 dark:text-zinc-300'
              }`}
              title={t.player_mode_test || 'Test Mode'}
            >
              <Brain className="w-5 h-5 mx-auto mb-1" />
              <div className="text-sm font-medium">Test</div>
            </button>

            <button
              onClick={() => setTrainingMode('review')}
              className={`p-3 rounded-lg border transition-all ${
                trainingMode === 'review'
                  ? 'bg-indigo-500 border-indigo-500 text-white'
                  : 'border-border hover:border-indigo-500 text-zinc-600 dark:text-zinc-300'
              }`}
              title={t.player_mode_review || 'Review Mode'}
            >
              <RotateCcw className="w-5 h-5 mx-auto mb-1" />
              <div className="text-sm font-medium">Review</div>
            </button>
          </div>

          {/* Training Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-secondary rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1">Accuracy</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">
                {trainingProgress.accuracy > 0
                  ? `${(trainingProgress.accuracy * 100).toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
            <div className="bg-secondary rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1">Streak</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">
                {trainingProgress.currentStreak} 🔥
              </div>
            </div>
          </div>

          {/* Training Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleHints}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                showHints
                  ? 'bg-indigo-500 text-white'
                  : 'bg-secondary text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title={t.player_hints || 'Toggle hints'}
            >
              {showHints ? t.player_hints_on || 'Hints ON' : t.player_hints_off || 'Hints OFF'}
            </button>

            <button
              onClick={resetTrainingSession}
              className="px-3 py-1.5 rounded-lg text-sm bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-all"
              title={t.player_reset || 'Reset training session'}
            >
              {t.player_reset || 'Reset Session'}
            </button>

            {trainingMode === 'test' && (
              <div className="ml-auto text-sm text-zinc-500">
                Adaptive: {adaptiveSettings.difficultyMultiplier.toFixed(1)}x
              </div>
            )}
          </div>

          {/* Chunk Response Buttons for Test Mode */}
          {trainingMode === 'test' &&
            activeMaterial &&
            currentChunkIndex < activeMaterial.chunks.length && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                  How did you do on this chunk?
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      markChunkCorrect(activeMaterial.chunks[currentChunkIndex].id)
                      setCurrentChunkResponse('correct')
                      setTimeout(() => setCurrentChunkResponse(null), 1000)
                    }}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      currentChunkResponse === 'correct'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Correct
                  </button>
                  <button
                    onClick={() => {
                      markChunkAttempt(activeMaterial.chunks[currentChunkIndex].id)
                      setCurrentChunkResponse('incorrect')
                      setTimeout(() => setCurrentChunkResponse(null), 1000)
                    }}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      currentChunkResponse === 'incorrect'
                        ? 'bg-rose-500 text-white'
                        : 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
                    }`}
                  >
                    <XCircle className="w-4 h-4 inline mr-1" />
                    Incorrect
                  </button>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Main Content Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex flex-col p-8 md:p-16 overflow-y-auto scroll-smooth pt-32 pb-32"
      >
        <div
          className={`max-w-3xl w-full mx-auto ${playerViewMode === 'chunk' ? 'space-y-6 text-center' : 'leading-relaxed'}`}
        >
          {playerViewMode === 'chunk' ? (
            // --- CHUNK MODE ---
            activeMaterial.chunks.map(chunk => {
              const active = isChunkActive(chunk.start_time, chunk.end_time)
              const isDialogue = activeMaterial.config.content_type === 'dialogue'
              const speakerName = chunk.speakerName
              const speakerColor = isDialogue
                ? chunk.speaker === 'A'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-emerald-600 dark:text-emerald-400'
                : ''
              return (
                <div
                  key={chunk.id}
                  ref={active ? (activeChunkRef as React.RefObject<HTMLDivElement>) : null}
                  onClick={e => handleChunkClick(chunk, e)}
                  className={`
                    transition-all duration-300 cursor-pointer rounded-xl p-4 flex flex-col items-center
                    ${
                      active
                        ? 'bg-indigo-500/10 scale-105 border-indigo-500/50 border shadow-lg shadow-indigo-500/10'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border border-transparent opacity-60 hover:opacity-100'
                    }
                  `}
                >
                  {isDialogue && speakerName && (
                    <span
                      className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                        active ? speakerColor : 'text-zinc-500 dark:text-zinc-600'
                      }`}
                    >
                      {speakerName}
                    </span>
                  )}
                  <p
                    className={`
                        text-2xl md:text-4xl font-semibold transition-colors
                        ${active ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-500'}
                      `}
                  >
                    {renderTextWithWordHighlighting(chunk, active)}
                  </p>
                  {chunk.translation && settings.showTranslations && (
                    <p
                      className={`
                          text-base md:text-lg mt-2 font-light transition-colors
                          ${active ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-500 dark:text-zinc-600'}
                        `}
                    >
                      {chunk.translation}
                    </p>
                  )}
                </div>
              )
            })
          ) : (
            // --- FULL TEXT MODE ---
            <div className="text-xl md:text-2xl leading-[2.5] md:leading-[2.5] text-zinc-600 dark:text-zinc-700 font-medium">
              {activeMaterial.chunks.map((chunk, _index) => {
                const active = isChunkActiveWithGap(chunk)
                const isDialogue = activeMaterial.config.content_type === 'dialogue'
                const isSpeakerA = chunk.speaker === 'A'
                const isSpeakerB = chunk.speaker === 'B'
                const speakerName = chunk.speakerName

                const getSpeakerColor = () => {
                  if (!isDialogue) return ''
                  if (active) {
                    if (isSpeakerA)
                      return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20 font-bold'
                    if (isSpeakerB)
                      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20 font-bold'
                  } else {
                    if (isSpeakerA)
                      return 'text-blue-400 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                    if (isSpeakerB)
                      return 'text-emerald-400 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                  }
                  return ''
                }

                const getSpeakerLabelColor = () => {
                  if (!isDialogue) return ''
                  if (isSpeakerA) return 'text-blue-500 dark:text-blue-400'
                  if (isSpeakerB) return 'text-emerald-500 dark:text-emerald-400'
                  return ''
                }

                return (
                  <React.Fragment key={chunk.id}>
                    {isDialogue && speakerName && (
                      <span
                        className={`text-xs font-bold uppercase tracking-wider mr-2 ${getSpeakerLabelColor()}`}
                      >
                        {speakerName}:
                      </span>
                    )}
                    <span
                      ref={active ? (activeChunkRef as React.RefObject<HTMLSpanElement>) : null}
                      onClick={e => handleFullTextChunkClick(chunk, e)}
                      className={`
                        cursor-pointer transition-all duration-200
                        ${
                          active
                            ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20 font-bold'
                            : 'text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }
                        ${isDialogue ? getSpeakerColor() : ''}
                      `}
                    >
                      {renderTextWithWordHighlighting(chunk, active)}
                    </span>
                    {/* Show translation below chunk in full mode if enabled */}
                    {chunk.translation && settings.showTranslationInFullMode && (
                      <span
                        className={`
                          block text-sm md:text-base font-light -mt-1 mb-2 ml-1
                          ${active ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-500 dark:text-zinc-600'}
                        `}
                      >
                        {chunk.translation}
                      </span>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          )}

          <div className="h-[50vh]"></div>
        </div>
      </div>

      {/* Bottom Control Deck */}
      <div className="bg-surface border-t border-border p-6 z-20 shadow-2xl">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Progress Bar */}
          <div
            className="group relative w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full cursor-pointer"
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect()
              const pct = (e.clientX - rect.left) / rect.width
              seek(pct * duration)
            }}
          >
            <div
              className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all duration-75"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border border-indigo-500 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                left: `${(currentTime / duration) * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Controls Layout */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => seek(Math.max(0, currentTime - 5))}
                title={t.player_rewind || 'Rewind 5s'}
                className="text-zinc-500 hover:text-indigo-600 dark:hover:text-white transition"
              >
                <Rewind className="w-6 h-6" />
              </button>

              <button
                onClick={() => {
                  if (isPlaying) {
                    setStopAfterCurrentChunk(true)
                  } else {
                    setStopAfterCurrentChunk(false)
                    play()
                  }
                }}
                disabled={false}
                title={
                  isPlaying
                    ? t.player_stop_after || 'Stop after current chunk'
                    : t.player_play || 'Play'
                }
                className={`w-14 h-14 flex items-center justify-center rounded-full text-white transition shadow-lg shadow-indigo-500/30 ${
                  isLoadingAudio ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isLoadingAudio ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-1" />
                )}
              </button>

              <button
                onClick={() => {
                  setStopAfterCurrentChunk(false)
                  audioService.stop()
                  if (noiseEnabled) {
                    audioService.stopNoise()
                  }
                  useStore.setState({ isPlaying: false, currentTime: 0, currentChunkIndex: 0 })
                }}
                title={t.player_restart || 'Restart from beginning'}
                className="text-zinc-500 hover:text-indigo-600 dark:hover:text-white transition"
              >
                <RotateCcw className="w-6 h-6" />
              </button>

              <button
                onClick={() => seek(Math.min(duration, currentTime + 5))}
                title={t.player_forward || 'Forward 5s'}
                className="text-zinc-500 hover:text-indigo-600 dark:hover:text-white transition"
              >
                <SkipForward className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-8 bg-secondary p-3 rounded-xl border border-border">
              {/* Voice Volume */}
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-indigo-500" />
                <div className="w-24">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={voiceVolume}
                    onChange={e => setVoiceVolume(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="w-px h-8 bg-border mx-2"></div>

              {/* Chunk Gap Control */}
              <div className="flex items-center gap-3">
                <div title={t.player_gap || 'Gap between chunks'}>
                  <Clock className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="w-20">
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.5"
                    value={chunkGap}
                    onChange={e => setChunkGap(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                    title={t.player_gap || 'Gap between chunks'}
                  />
                </div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider w-8">
                  {chunkGap}s
                </span>
              </div>

              {/* Gap Sound Control */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGapSound('beep')}
                  className={`px-2 py-1 rounded text-xs transition ${
                    gapSound === 'beep'
                      ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
                      : 'text-zinc-500 hover:text-zinc-600'
                  }`}
                  title={t.player_gap_beep || 'Beep sound'}
                >
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {t.player_gap_beep || 'Beep'}
                  </span>
                </button>
                <button
                  onClick={() => setGapSound('silent')}
                  className={`px-2 py-1 rounded text-xs transition ${
                    gapSound === 'silent'
                      ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
                      : 'text-zinc-500 hover:text-zinc-600'
                  }`}
                  title={t.player_gap_silent || 'Silent'}
                >
                  {t.player_gap_silent || 'Silent'}
                </button>
              </div>

              <div className="w-px h-8 bg-border mx-2"></div>

              {/* Playback Rate */}
              <div className="flex items-center gap-3">
                <div title={t.player_playback_rate || 'Playback Speed'}>
                  <Gauge className="w-4 h-4 text-amber-500" />
                </div>
                <div className="w-20">
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={playbackRate}
                    onChange={e => setPlaybackRate(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                    title={t.player_playback_rate || 'Playback Speed'}
                  />
                </div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider w-10">
                  {playbackRate.toFixed(1)}x
                </span>
              </div>

              <div className="w-px h-8 bg-border mx-2"></div>

              {/* Quick Speaker Selector (CosyVoice only) */}
              {settings.ttsMode === 'cosyvoice' && (
                <>
                  <div className="flex items-center gap-2">
                    <div title={t.settings_cosyvoice_title || 'Voice'}>
                      <User className="w-4 h-4 text-orange-500" />
                    </div>
                    <select
                      value={quickSpeaker}
                      onChange={async e => {
                        const newSpeaker = e.target.value
                        setQuickSpeaker(newSpeaker)
                        setIsChangingSpeaker(true)
                        updateSettings({
                          ...settings,
                          cosyvoiceSpeaker: newSpeaker,
                        })
                        ;(audioService as any).audioCache?.clear()
                        // Clear chunk words to trigger regeneration
                        if (activeMaterial && currentChunkIndex < activeMaterial.chunks.length) {
                          const chunk = activeMaterial.chunks[currentChunkIndex]
                          chunk.words = undefined
                          await play(currentChunkIndex, false)
                        }
                        setIsChangingSpeaker(false)
                      }}
                      disabled={isChangingSpeaker || isLoadingSpeakers}
                      className="bg-background border border-border rounded-lg py-1 px-2 text-xs text-primary dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none cursor-pointer max-w-32"
                    >
                      {isLoadingSpeakers ? (
                        <option value="">加载中...</option>
                      ) : availableSpeakers.length > 0 ? (
                        availableSpeakers.map(speaker => (
                          <option key={speaker} value={speaker}>
                            {speaker}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="中文女">中文女</option>
                          <option value="中文男">中文男</option>
                          <option value="英文女">英文女</option>
                          <option value="英文男">英文男</option>
                          <option value="日语女">日语女</option>
                          <option value="日语男">日语男</option>
                          <option value="韩语女">韩语女</option>
                          <option value="韩语男">韩语男</option>
                        </>
                      )}
                    </select>
                    {isChangingSpeaker && (
                      <span className="text-xs text-orange-500 animate-pulse">生成中...</span>
                    )}
                  </div>
                  <div className="w-px h-8 bg-border mx-2"></div>
                </>
              )}

              {/* Noise Control */}
              <div className="flex items-center gap-3">
                {/* Noise Toggle Switch */}
                <button
                  onClick={toggleNoise}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    noiseEnabled ? 'bg-rose-500' : 'bg-zinc-600'
                  }`}
                  title={t.player_toggle_noise || 'Toggle background noise'}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      noiseEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>

                <div
                  className={`transition-opacity ${noiseEnabled ? 'opacity-100' : 'opacity-40'}`}
                >
                  {noiseEnabled ? (
                    <Waves className="w-4 h-4 text-rose-500" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-zinc-500" />
                  )}
                </div>

                <div className="w-20">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={noiseVolume}
                    onChange={e => setNoiseVolume(parseFloat(e.target.value))}
                    disabled={!noiseEnabled}
                    className={`w-full h-1 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer ${noiseEnabled ? 'accent-rose-500' : 'accent-zinc-500'}`}
                    title={t.player_voice_volume || 'Voice Volume'}
                  />
                </div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  {t.player_noise_label}
                </span>

                {settings.noiseType === 'custom' && settings.customNoiseData && (
                  <button
                    onClick={() => toggleNoise()}
                    className="ml-2 p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition"
                    title={t.settings_noise_uploaded || 'Test custom noise'}
                  >
                    <Music className="w-4 h-4" />
                  </button>
                )}

                {settings.customNoiseData && settings.noiseType !== 'custom' && (
                  <span className="ml-2 text-[10px] text-amber-500">
                    (Select "Custom" to enable)
                  </span>
                )}
              </div>
            </div>

            <Button variant="ghost" size="sm" className="hidden md:flex">
              <Settings2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
