import React from 'react'
import { useStore } from '../store/useStore'
import { audioService } from '../services/audioService'
import { CosyVoiceService } from '../services/cosyvoiceService'
import { WhisperXService } from '../services/whisperxService'
import {
  Key,
  Save,
  Server,
  Globe,
  Moon,
  Sun,
  MousePointer2,
  Type,
  Volume,
  Play,
  FastForward,
  Waves,
  Upload,
  Trash2,
  Mic,
  Pause,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileAudio,
  Zap,
  Mail,
  Link,
  AlertTriangle,
} from 'lucide-react'
import { Button } from './ui/Button'
import { translations } from '../services/translations'
import { userIdentityService, UserQuota } from '../services/userIdentityService'
import { Copy, User, Users, Globe2, Lock } from 'lucide-react'

export const Settings = () => {
  const {
    settings,
    updateSettings,
    toggleTheme,
    noiseVolume,
    setNoiseVolume,
    setVoiceVolume,
    voiceVolume,
  } = useStore()
  const [localState, setLocalState] = React.useState(settings)
  const [isTestingNoise, setIsTestingNoise] = React.useState(false)
  const [saveStatus, setSaveStatus] = React.useState<'saved' | 'saving' | 'unsaved'>('saved')

  // CosyVoice test state
  const [cosyvoiceStatus, setCosyvoiceStatus] = React.useState<{
    connected: boolean
    message: string
    version?: string
  }>({ connected: false, message: '' })
  const [isTestingCosyvoice, setIsTestingCosyvoice] = React.useState(false)
  const [cosyvoiceTestResult, setCosyvoiceTestResult] = React.useState<{
    success: boolean
    message: string
  } | null>(null)
  const [cosyvoiceSpeakers, setCosyvoiceSpeakers] = React.useState<string[]>([])
  const [isLoadingSpeakers, setIsLoadingSpeakers] = React.useState(false)

  // WhisperX test state
  const [whisperxStatus, setWhisperxStatus] = React.useState<{
    connected: boolean
    message: string
    version?: string
    gpu?: string
  }>({ connected: false, message: '' })
  const [isTestingWhisperx, setIsTestingWhisperx] = React.useState(false)
  const [whisperxTestResult, setWhisperxTestResult] = React.useState<{
    success: boolean
    message: string
    segments?: any[]
  } | null>(null)

  const t = translations[settings.language]

  // Community Identity State
  const [userUuid, setUserUuid] = React.useState('')
  const [nickname, setNickname] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [emailBound, setEmailBound] = React.useState(false)
  const [quota, setQuota] = React.useState<UserQuota | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(true)
  const [isSavingNickname, setIsSavingNickname] = React.useState(false)
  const [isBindingEmail, setIsBindingEmail] = React.useState(false)
  const [nicknameError, setNicknameError] = React.useState('')
  const [emailError, setEmailError] = React.useState('')
  const [emailSuccess, setEmailSuccess] = React.useState('')
  const [recoveryStep, setRecoveryStep] = React.useState<'input' | 'verify' | undefined>(undefined)
  const [recoveryEmail, setRecoveryEmail] = React.useState('')
  const [recoveryCode, setRecoveryCode] = React.useState('')
  const [isVerifying, setIsVerifying] = React.useState(false)
  const [isSendingCode, setIsSendingCode] = React.useState(false)
  const [isReplacingUuid, setIsReplacingUuid] = React.useState(false)
  const [userUuidInput, setUserUuidInput] = React.useState('')

  const handleSave = () => {
    updateSettings(localState)
    setSaveStatus('saved')
    alert(t.settings_saved_msg)
  }

  // Sync localState when global settings change (e.g., from other components)
  React.useEffect(() => {
    setLocalState(prev => {
      const merged = { ...settings, ...prev }
      const hasChanges = JSON.stringify(merged) !== JSON.stringify(prev)
      if (hasChanges) {
        return merged
      }
      return prev
    })
  }, [settings])

  // Auto-save when localState changes
  React.useEffect(() => {
    setSaveStatus('saving')
    const timer = setTimeout(() => {
      updateSettings(localState)
      setSaveStatus('saved')
    }, 500)
    return () => clearTimeout(timer)
  }, [localState])
  React.useEffect(() => {
    if (isTestingNoise) {
      const intensity = localState.noiseIntensity || 0.5
      const volume = noiseVolume * intensity * 2
      audioService.setNoiseVolume(volume)
    }
  }, [localState.noiseIntensity])

  const handleTestNoise = async () => {
    const intensity = localState.noiseIntensity || 0.5
    const volume = noiseVolume * intensity * 2

    if (isTestingNoise) {
      audioService.stopNoise()
      setIsTestingNoise(false)
    } else {
      if (localState.noiseType === 'custom' && localState.customNoiseData) {
        await audioService.startNoise(volume, 'custom' as any, localState.customNoiseData)
      } else {
        await audioService.startNoise(volume, localState.noiseType as any, null)
      }
      setIsTestingNoise(true)
    }
  }

  // Test CosyVoice connection
  const handleTestCosyvoice = async () => {
    setIsTestingCosyvoice(true)
    setCosyvoiceTestResult(null)

    try {
      const cosyvoice = new CosyVoiceService({
        baseUrl: localState.cosyvoiceApiUrl || 'http://localhost:9880',
        mode: localState.cosyvoiceMode,
        speaker: localState.cosyvoiceSpeaker,
        speed: localState.cosyvoiceSpeed,
      })

      const health = await cosyvoice.checkHealth()

      if (health.status === 'healthy' || health.model_loaded) {
        setCosyvoiceStatus({
          connected: true,
          message: `Connected (v${health.model_version}, ${health.available_modes?.length || 0} modes)`,
          version: health.model_version,
        })
      } else {
        setCosyvoiceStatus({
          connected: false,
          message: 'Service not ready',
        })
      }
    } catch (error) {
      setCosyvoiceStatus({
        connected: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      })
    }

    setIsTestingCosyvoice(false)
  }

  // Test CosyVoice TTS
  const handleTestCosyvoiceTTS = async () => {
    setIsTestingCosyvoice(true)
    setCosyvoiceTestResult(null)

    try {
      const cosyvoice = new CosyVoiceService({
        baseUrl: localState.cosyvoiceApiUrl || 'http://localhost:9880',
        mode: localState.cosyvoiceMode,
        speaker: localState.cosyvoiceSpeaker,
        speed: localState.cosyvoiceSpeed,
      })

      const audioData = await cosyvoice.testTTS()

      // Play the audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(audioData.slice(0))
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      source.start()

      setCosyvoiceTestResult({
        success: true,
        message: 'Audio generated and played successfully',
      })
    } catch (error) {
      setCosyvoiceTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'TTS generation failed',
      })
    }

    setIsTestingCosyvoice(false)
  }

  // Test WhisperX connection
  const handleTestWhisperx = async () => {
    setIsTestingWhisperx(true)
    setWhisperxTestResult(null)

    try {
      const whisperx = new WhisperXService(localState.whisperxApiUrl || 'http://localhost:8000')
      const health = await whisperx.healthCheck()

      if (health.status === 'healthy') {
        setWhisperxStatus({
          connected: true,
          message: `Healthy (v${health.version}, GPU: ${health.gpu_available ? health.gpu_device : 'CPU'})`,
          version: health.version,
          gpu: health.gpu_device,
        })
      } else {
        setWhisperxStatus({
          connected: false,
          message: 'Service not healthy',
        })
      }
    } catch (error) {
      setWhisperxStatus({
        connected: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      })
    }

    setIsTestingWhisperx(false)
  }

  // Test WhisperX transcription
  const handleTestWhisperxTranscribe = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsTestingWhisperx(true)
    setWhisperxTestResult(null)

    try {
      const whisperx = new WhisperXService(localState.whisperxApiUrl || 'http://localhost:8000')
      const audioData = await file.arrayBuffer()

      const result = await whisperx.transcribe(audioData, {
        language: localState.whisperxLanguage || 'en',
        model: localState.whisperxModel || 'large-v2',
        alignOutput: localState.whisperxEnableAlignment ?? true,
      })

      const preview = result.segments
        .slice(0, 3)
        .map(s => `[${s.start.toFixed(1)}s] ${s.text.trim()}`)
        .join(' ')

      setWhisperxTestResult({
        success: true,
        message: `Transcribed ${result.segments.length} segments in ${result.language}`,
        segments: result.segments,
      })
    } catch (error) {
      setWhisperxTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Transcription failed',
      })
    }

    setIsTestingWhisperx(false)
  }

  // Sync local state when global language changes
  React.useEffect(() => {
    setLocalState(prev => ({ ...prev, language: settings.language }))
  }, [settings.language])

  // Load community identity profile
  React.useEffect(() => {
    const loadProfile = async () => {
      setIsLoadingProfile(true)
      try {
        const uuid = userIdentityService.getOrCreateUUID()
        setUserUuid(uuid)
        setNickname(userIdentityService.getNickname() || '')
        setEmail(userIdentityService.getEmail() || '')
        setEmailBound(!!userIdentityService.getEmail())
        const q = await userIdentityService.getQuota()
        setQuota(q)
      } catch (error) {
        console.error('Failed to load profile:', error)
      } finally {
        setIsLoadingProfile(false)
      }
    }
    loadProfile()
  }, [])

  // Fetch CosyVoice speakers when CosyVoice mode is selected
  React.useEffect(() => {
    const fetchSpeakers = async () => {
      if (localState.ttsMode === 'cosyvoice') {
        setIsLoadingSpeakers(true)
        try {
          const cosyvoice = new CosyVoiceService({
            baseUrl: localState.cosyvoiceApiUrl || 'http://localhost:9880',
          })
          const speakers = await cosyvoice.getSpeakers()
          if (speakers.speakers && speakers.speakers.length > 0) {
            setCosyvoiceSpeakers(speakers.speakers)
          } else {
            setCosyvoiceSpeakers(['中文女', '中文男', '英文女', '英文男'])
          }
        } catch (error) {
          console.warn('Failed to fetch speakers:', error)
          setCosyvoiceSpeakers(['中文女', '中文男', '英文女', '英文男'])
        }
        setIsLoadingSpeakers(false)
      }
    }
    fetchSpeakers()
  }, [localState.ttsMode, localState.cosyvoiceApiUrl])

  // Save nickname handler
  const handleSaveNickname = async () => {
    if (!nickname.trim()) {
      setNicknameError('昵称不能为空')
      return
    }
    if (nickname.length > 50) {
      setNicknameError('昵称最长50个字符')
      return
    }
    setIsSavingNickname(true)
    setNicknameError('')
    try {
      await userIdentityService.updateNickname(nickname.trim())
    } catch (error) {
      setNicknameError('保存失败，请重试')
    } finally {
      setIsSavingNickname(false)
    }
  }

  // Copy UUID handler
  const handleCopyUuid = () => {
    navigator.clipboard.writeText(userUuid)
  }

  // Clear UUID handler
  const handleClearUuid = () => {
    if (!confirm('确定要清除当前设备身份吗？清除后您可以通过邮箱恢复账户。此操作不可撤销。')) {
      return
    }
    localStorage.removeItem('senseflow_user_uuid')
    localStorage.removeItem('senseflow_user_nickname')
    localStorage.removeItem('senseflow_user_email')
    window.location.reload()
  }

  // Restore UUID handler
  const handleRestoreUuid = async () => {
    if (!userUuidInput.trim()) {
      alert('请输入 UUID')
      return
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userUuidInput.trim())) {
      alert('请输入有效的 UUID 格式')
      return
    }
    if (!confirm('确定要使用此 UUID 恢复账户吗？')) {
      return
    }

    const newUuid = userUuidInput.trim()
    localStorage.setItem('senseflow_user_uuid', newUuid)

    try {
      await userIdentityService.syncProfileFromRemote(newUuid)
      window.location.reload()
    } catch (error) {
      console.error('Error syncing profile:', error)
      window.location.reload()
    }
  }

  // Bind email handler
  const handleBindEmail = async () => {
    if (!email.trim()) {
      setEmailError('请输入邮箱地址')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setEmailError('请输入有效的邮箱地址')
      return
    }
    setIsBindingEmail(true)
    setEmailError('')
    setEmailSuccess('')
    try {
      await userIdentityService.bindEmail(email.trim())
      setEmailBound(true)
      setEmailSuccess('邮箱绑定成功！')
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : '绑定失败，请重试')
    } finally {
      setIsBindingEmail(false)
    }
  }

  // Send recovery code handler
  const handleSendRecoveryCode = async () => {
    if (!recoveryEmail.trim()) {
      alert('请输入邮箱地址')
      return
    }

    setIsSendingCode(true)
    try {
      await userIdentityService.sendRecoveryCode(recoveryEmail.trim())
      setRecoveryStep('verify')
    } catch (error) {
      alert(error instanceof Error ? error.message : '发送失败')
    } finally {
      setIsSendingCode(false)
    }
  }

  // Verify recovery code handler
  const handleVerifyRecoveryCode = async () => {
    if (!recoveryCode.trim()) {
      alert('请输入验证码')
      return
    }

    if (!confirm('确定要将当前账户数据迁移到邮箱关联的账户吗？此操作不可撤销。')) {
      return
    }

    setIsVerifying(true)
    try {
      await userIdentityService.recoverAccount(recoveryEmail.trim(), recoveryCode.trim())
      alert('账户恢复成功！已自动切换到您的原账户。')
      window.location.reload()
    } catch (error) {
      alert(error instanceof Error ? error.message : '恢复失败')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-primary dark:text-white tracking-tight">
          {t.settings_title}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">{t.settings_subtitle}</p>
      </div>

      <div className="grid gap-6">
        {/* Appearance */}
        <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Globe className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-primary dark:text-white">
              {t.settings_appearance_title || 'Appearance'}
            </h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-primary dark:text-white">
                {t.settings_theme_label || 'Theme'}
              </label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {t.settings_theme_desc || 'Choose your preferred theme'}
              </p>
            </div>
            <Button onClick={toggleTheme} variant="outline" size="sm" className="gap-2">
              {settings.theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4" />
                  {t.settings_theme_light || 'Light'}
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" />
                  {t.settings_theme_dark || 'Dark'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Interaction Settings */}
        <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <MousePointer2 className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-primary dark:text-white">
              {t.settings_interaction_title || 'Interaction Settings'}
            </h3>
          </div>

          <div className="space-y-4">
            {/* Click to Speak */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <Volume className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-primary dark:text-white">
                    {t.settings_click_to_speak || 'Click to Speak'}
                  </label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {t.settings_click_to_speak_desc ||
                      'Chunk mode: Double-click to speak • Full mode: Double-click to speak'}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setLocalState({ ...localState, clickToSpeak: !localState.clickToSpeak })
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  localState.clickToSpeak ? 'bg-indigo-500' : 'bg-zinc-600'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    localState.clickToSpeak ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Enable Click Speak in Full Mode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <MousePointer2 className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-primary dark:text-white">
                    {t.settings_enable_click_speak_full || 'Enable Click Speak in Full Mode'}
                  </label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {t.settings_enable_click_speak_full_desc ||
                      "When disabled: Full mode only seeks, doesn't speak on click"}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setLocalState({
                    ...localState,
                    enableClickSpeakInFullMode: !localState.enableClickSpeakInFullMode,
                  })
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  localState.enableClickSpeakInFullMode ? 'bg-indigo-500' : 'bg-zinc-600'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    localState.enableClickSpeakInFullMode ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Show Translation in Full Mode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <Type className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-primary dark:text-white">
                    {t.settings_show_trans_full || 'Show Translation in Full Mode'}
                  </label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {t.settings_show_trans_full_desc ||
                      'Display Chinese translation below each chunk in full-text mode'}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setLocalState({
                    ...localState,
                    showTranslationInFullMode: !localState.showTranslationInFullMode,
                  })
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  localState.showTranslationInFullMode ? 'bg-indigo-500' : 'bg-zinc-600'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    localState.showTranslationInFullMode ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Auto Play Next */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <Play className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-primary dark:text-white">
                    {t.settings_auto_play_next || 'Auto Play Next'}
                  </label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {t.settings_auto_play_next_desc ||
                      'Automatically play next chunk after current one finishes'}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setLocalState({
                    ...localState,
                    autoPlayNext: !localState.autoPlayNext,
                  })
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  localState.autoPlayNext ? 'bg-indigo-500' : 'bg-zinc-600'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    localState.autoPlayNext ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Seamless Playback */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <FastForward className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-primary dark:text-white">
                    {t.settings_seamless_playback || 'Seamless Playback'}
                  </label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {t.settings_seamless_playback_desc ||
                      'Play next chunk without stopping (requires Auto Play Next enabled)'}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setLocalState({
                    ...localState,
                    seamlessPlayback: !localState.seamlessPlayback,
                  })
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  localState.seamlessPlayback ? 'bg-indigo-500' : 'bg-zinc-600'
                }`}
                disabled={!localState.autoPlayNext}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    localState.seamlessPlayback ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Noise Settings */}
        <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Waves className="w-5 h-5 text-rose-400" />
            <h3 className="text-lg font-semibold text-primary dark:text-white">
              {t.settings_noise_title || 'Noise Settings'}
            </h3>
          </div>

          <div className="space-y-4">
            {/* Noise Type */}
            <div>
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                {t.settings_noise_type || 'Noise Type'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setLocalState({ ...localState, noiseType: 'white' })}
                  className={`p-3 rounded-lg border transition-all ${
                    localState.noiseType === 'white'
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'border-border hover:border-rose-500 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  <div className="text-sm font-medium">
                    {t.settings_noise_type_white || 'White Noise'}
                  </div>
                </button>
                <button
                  onClick={() => setLocalState({ ...localState, noiseType: 'gaussian' })}
                  className={`p-3 rounded-lg border transition-all ${
                    localState.noiseType === 'gaussian'
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'border-border hover:border-rose-500 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  <div className="text-sm font-medium">
                    {t.settings_noise_type_gaussian || 'Gaussian'}
                  </div>
                </button>
                <button
                  onClick={() => setLocalState({ ...localState, noiseType: 'custom' })}
                  className={`p-3 rounded-lg border transition-all ${
                    localState.noiseType === 'custom'
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'border-border hover:border-rose-500 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  <div className="text-sm font-medium">
                    {t.settings_noise_type_custom || 'Custom'}
                  </div>
                </button>
              </div>
            </div>

            {/* Noise Intensity */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {t.settings_noise_intensity || 'Noise Intensity'}
                </label>
                <span className="text-sm text-rose-500 font-medium">
                  {((localState.noiseIntensity || 0.5) * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={localState.noiseIntensity || 0.5}
                onChange={e =>
                  setLocalState({ ...localState, noiseIntensity: parseFloat(e.target.value) })
                }
                className="w-full accent-rose-500 h-2 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {t.settings_noise_intensity_desc || 'Adjust the volume of background noise'}
              </p>
            </div>

            {/* Noise Test Button */}
            <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg border border-border">
              <button
                onClick={handleTestNoise}
                disabled={false}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  isTestingNoise
                    ? 'bg-rose-500 text-white'
                    : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                }`}
              >
                {isTestingNoise ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {isTestingNoise
                    ? t.settings_noise_stop_test || 'Stop Test'
                    : t.settings_noise_test || 'Test Noise'}
                </span>
              </button>
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.settings_noise_test_desc || 'Preview the noise sound'}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {localState.noiseType === 'white'
                    ? t.settings_noise_type_white || 'White Noise'
                    : localState.noiseType === 'gaussian'
                      ? t.settings_noise_type_gaussian || 'Gaussian Noise'
                      : t.settings_noise_type_custom || 'Custom Audio'}
                </div>
              </div>
            </div>

            {/* Custom Noise Upload */}
            {localState.noiseType === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                  {t.settings_noise_upload || 'Upload Custom Noise'}
                </label>
                {localState.customNoiseData ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {t.settings_noise_uploaded || 'Custom noise uploaded'}
                      </div>
                    </div>
                    <button
                      onClick={() => setLocalState({ ...localState, customNoiseData: null })}
                      className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-rose-500 hover:bg-rose-500/5 transition">
                    <Upload className="w-5 h-5 text-zinc-400" />
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {t.settings_noise_upload_desc || 'Upload WAV/MP3 file'}
                    </span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = () => {
                            const base64 = reader.result as string
                            const base64Data = base64.split(',')[1]
                            setLocalState({ ...localState, customNoiseData: base64Data })
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        </div>

        {/* TTS Settings */}
        <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Mic className="w-5 h-5 text-rose-400" />
            <h3 className="text-lg font-semibold text-primary dark:text-white">
              {t.settings_tts_title || 'Text-to-Speech'}
            </h3>
          </div>

          <div className="p-4 bg-secondary/30 rounded-lg border border-border mb-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t.settings_tts_desc || 'Choose how audio is generated for playback'}
            </p>
          </div>

          <div className="grid gap-3">
            <button
              onClick={() => setLocalState({ ...localState, ttsMode: 'browser' })}
              className={`p-4 rounded-lg border transition-all text-left ${
                localState.ttsMode === 'browser'
                  ? 'bg-rose-500/10 border-rose-500/50 text-rose-700 dark:text-rose-300'
                  : 'border-border hover:border-rose-500/30 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    localState.ttsMode === 'browser'
                      ? 'bg-rose-500 border-rose-500'
                      : 'border-zinc-400'
                  }`}
                />
                <div>
                  <div className="font-medium">{t.settings_tts_browser || 'Browser TTS'}</div>
                  <div className="text-xs opacity-70">
                    {t.settings_tts_browser_desc ||
                      'Free, uses your browser voice. Noise mixing not available.'}
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setLocalState({ ...localState, ttsMode: 'openai' })}
              className={`p-4 rounded-lg border transition-all text-left ${
                localState.ttsMode === 'openai'
                  ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-700 dark:text-indigo-300'
                  : 'border-border hover:border-indigo-500/30 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    localState.ttsMode === 'openai'
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'border-zinc-400'
                  }`}
                />
                <div>
                  <div className="font-medium">{t.settings_tts_openai || 'OpenAI TTS'}</div>
                  <div className="text-xs opacity-70">
                    {t.settings_tts_openai_desc || 'High quality AI voice. Requires API key.'}
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setLocalState({ ...localState, ttsMode: 'auto' })}
              className={`p-4 rounded-lg border transition-all text-left ${
                localState.ttsMode === 'auto'
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                  : 'border-border hover:border-emerald-500/30 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    localState.ttsMode === 'auto'
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-zinc-400'
                  }`}
                />
                <div>
                  <div className="font-medium">{t.settings_tts_auto || 'Auto'}</div>
                  <div className="text-xs opacity-70">
                    {t.settings_tts_auto_desc ||
                      'Use OpenAI if API key configured, otherwise browser TTS.'}
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setLocalState({ ...localState, ttsMode: 'cosyvoice' })}
              className={`p-4 rounded-lg border transition-all text-left ${
                localState.ttsMode === 'cosyvoice'
                  ? 'bg-orange-500/10 border-orange-500/50 text-orange-700 dark:text-orange-300'
                  : 'border-border hover:border-orange-500/30 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    localState.ttsMode === 'cosyvoice'
                      ? 'bg-orange-500 border-orange-500'
                      : 'border-zinc-400'
                  }`}
                />
                <div>
                  <div className="font-medium">CosyVoice TTS</div>
                  <div className="text-xs opacity-70">
                    High-quality Chinese TTS with word-level timestamps. Requires local backend.
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* CosyVoice Settings */}
        {localState.ttsMode === 'cosyvoice' && (
          <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <Server className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-primary dark:text-white">
                CosyVoice Configuration
              </h3>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  API URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={localState.cosyvoiceApiUrl || 'http://localhost:9880'}
                    onChange={e =>
                      setLocalState({ ...localState, cosyvoiceApiUrl: e.target.value })
                    }
                    className="flex-1 bg-background border border-border rounded-lg py-2 px-4 text-primary dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder-zinc-500 font-mono text-sm"
                    placeholder="http://localhost:9880"
                  />
                  <button
                    onClick={handleTestCosyvoice}
                    disabled={isTestingCosyvoice}
                    className="px-4 py-2 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 rounded-lg transition flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                  >
                    {isTestingCosyvoice ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Test
                  </button>
                </div>
              </div>

              {cosyvoiceStatus.message && (
                <div
                  className={`p-3 rounded-lg border flex items-center gap-2 ${
                    cosyvoiceStatus.connected
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-rose-500/10 border-rose-500/30'
                  }`}
                >
                  {cosyvoiceStatus.connected ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500" />
                  )}
                  <span
                    className={`text-sm ${
                      cosyvoiceStatus.connected
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {cosyvoiceStatus.message}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Mode
                </label>
                <select
                  value={localState.cosyvoiceMode || '预训练音色'}
                  onChange={e => setLocalState({ ...localState, cosyvoiceMode: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg py-2 px-4 text-primary dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="预训练音色">预训练音色 (Pretrained)</option>
                  <option value="3s极速复刻">3s极速复刻 (3s Clone)</option>
                  <option value="跨语种复刻">跨语种复刻 (Cross-lingual)</option>
                  <option value="自然语言控制">自然语言控制 (Instruct)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Speaker
                </label>
                <select
                  value={localState.cosyvoiceSpeaker || cosyvoiceSpeakers[0] || '中文女'}
                  onChange={e => setLocalState({ ...localState, cosyvoiceSpeaker: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg py-2 px-4 text-primary dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                  disabled={isLoadingSpeakers}
                >
                  {isLoadingSpeakers ? (
                    <option value="">Loading speakers...</option>
                  ) : cosyvoiceSpeakers.length > 0 ? (
                    cosyvoiceSpeakers.map(speaker => (
                      <option key={speaker} value={speaker}>
                        {speaker}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="中文女">中文女 (Chinese Female)</option>
                      <option value="中文男">中文男 (Chinese Male)</option>
                      <option value="日语女">日语女 (Japanese Female)</option>
                      <option value="日语男">日语男 (Japanese Male)</option>
                      <option value="粤语女">粤语女 (Cantonese Female)</option>
                      <option value="粤语男">粤语男 (Cantonese Male)</option>
                      <option value="英文女">英文女 (English Female)</option>
                      <option value="英文男">英文男 (English Male)</option>
                      <option value="韩语女">韩语女 (Korean Female)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Speed: {localState.cosyvoiceSpeed || 1.0}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={localState.cosyvoiceSpeed || 1.0}
                  onChange={e =>
                    setLocalState({ ...localState, cosyvoiceSpeed: parseFloat(e.target.value) })
                  }
                  className="w-full accent-orange-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cosyvoice-alignment"
                  checked={localState.cosyvoiceEnableAlignment ?? true}
                  onChange={e =>
                    setLocalState({ ...localState, cosyvoiceEnableAlignment: e.target.checked })
                  }
                  className="w-4 h-4 accent-orange-500 rounded"
                />
                <label
                  htmlFor="cosyvoice-alignment"
                  className="text-sm text-primary dark:text-white"
                >
                  Enable word-level alignment (WhisperX)
                </label>
              </div>

              <div className="pt-2 border-t border-border">
                <button
                  onClick={handleTestCosyvoiceTTS}
                  disabled={isTestingCosyvoice}
                  className="w-full py-2 px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center justify-center gap-2 font-medium disabled:opacity-50"
                >
                  {isTestingCosyvoice ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Test TTS - Play Sample
                    </>
                  )}
                </button>

                {cosyvoiceTestResult && (
                  <div
                    className={`mt-3 p-3 rounded-lg border text-sm flex items-center gap-2 ${
                      cosyvoiceTestResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {cosyvoiceTestResult.success ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    {cosyvoiceTestResult.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cloud Providers */}
        <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Globe className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-primary dark:text-white">
              {t.settings_cloud_title}
            </h3>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                OpenAI API Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  value={localState.openaiKey}
                  onChange={e => setLocalState({ ...localState, openaiKey: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-4 text-primary dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-zinc-500"
                  placeholder="sk-..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                Gemini API Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  value={localState.geminiKey}
                  onChange={e => setLocalState({ ...localState, geminiKey: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-4 text-primary dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-zinc-500"
                  placeholder="AIza..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                DeepSeek API Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  value={localState.deepseekKey}
                  onChange={e => setLocalState({ ...localState, deepseekKey: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-4 text-primary dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-zinc-500"
                  placeholder="sk-..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Local Engine */}
        <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Server className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-primary dark:text-white">
              {t.settings_local_title}
            </h3>
          </div>

          <div className="p-4 bg-secondary/30 rounded-lg border border-border mb-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.settings_local_desc}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              {t.settings_local_endpoint}
            </label>
            <input
              type="text"
              value={localState.localApiUrl}
              onChange={e => setLocalState({ ...localState, localApiUrl: e.target.value })}
              className="w-full bg-background border border-border rounded-lg py-2 px-4 text-primary dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-mono text-sm"
              placeholder="http://localhost:9000"
            />
          </div>
        </div>

        {/* WhisperX Alignment Service */}
        <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <FileAudio className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-primary dark:text-white">
              WhisperX Alignment Service
            </h3>
          </div>

          <div className="p-4 bg-secondary/30 rounded-lg border border-border">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Provides word-level timestamps for karaoke-style highlighting. Used when CosyVoice
              alignment is disabled.
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                API URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localState.whisperxApiUrl || 'http://localhost:8000'}
                  onChange={e => setLocalState({ ...localState, whisperxApiUrl: e.target.value })}
                  className="flex-1 bg-background border border-border rounded-lg py-2 px-4 text-primary dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-zinc-500 font-mono text-sm"
                  placeholder="http://localhost:8000"
                />
                <button
                  onClick={handleTestWhisperx}
                  disabled={isTestingWhisperx}
                  className="px-4 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                >
                  {isTestingWhisperx ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Test
                </button>
              </div>
            </div>

            {whisperxStatus.message && (
              <div
                className={`p-3 rounded-lg border flex items-center gap-2 ${
                  whisperxStatus.connected
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                {whisperxStatus.connected ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
                <span
                  className={`text-sm ${
                    whisperxStatus.connected
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {whisperxStatus.message}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Model
                </label>
                <select
                  value={localState.whisperxModel || 'large-v2'}
                  onChange={e => setLocalState({ ...localState, whisperxModel: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg py-2 px-4 text-primary dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="tiny">tiny (fastest)</option>
                  <option value="base">base</option>
                  <option value="small">small</option>
                  <option value="medium">medium</option>
                  <option value="large-v2">large-v2 (recommended)</option>
                  <option value="large-v3">large-v3 (most accurate)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Language
                </label>
                <select
                  value={localState.whisperxLanguage || 'en'}
                  onChange={e => setLocalState({ ...localState, whisperxLanguage: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg py-2 px-4 text-primary dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">Auto Detect</option>
                  <option value="en">English</option>
                  <option value="zh">Chinese</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="whisperx-alignment"
                  checked={localState.whisperxEnableAlignment ?? true}
                  onChange={e =>
                    setLocalState({ ...localState, whisperxEnableAlignment: e.target.checked })
                  }
                  className="w-4 h-4 accent-blue-500 rounded"
                />
                <label
                  htmlFor="whisperx-alignment"
                  className="text-sm text-primary dark:text-white"
                >
                  Enable word-level timestamps (required for karaoke highlighting)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="whisperx-diarization"
                  checked={localState.whisperxEnableDiarization ?? false}
                  onChange={e =>
                    setLocalState({ ...localState, whisperxEnableDiarization: e.target.checked })
                  }
                  className="w-4 h-4 accent-blue-500 rounded"
                />
                <label
                  htmlFor="whisperx-diarization"
                  className="text-sm text-primary dark:text-white"
                >
                  Enable speaker diarization (identifies multiple speakers)
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                Test Transcription
              </label>
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition">
                  <Upload className="w-5 h-5 text-zinc-400" />
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Upload audio (.mp3, .wav) to test
                  </span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleTestWhisperxTranscribe}
                  />
                </label>
              </div>

              {isTestingWhisperx && (
                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    Processing transcription...
                  </span>
                </div>
              )}

              {whisperxTestResult && (
                <div
                  className={`mt-3 p-3 rounded-lg border ${
                    whisperxTestResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-rose-500/10 border-rose-500/30'
                  }`}
                >
                  <div
                    className={`text-sm flex items-center gap-2 mb-2 ${
                      whisperxTestResult.success
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {whisperxTestResult.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {whisperxTestResult.message}
                  </div>
                  {whisperxTestResult.segments && whisperxTestResult.segments.length > 0 && (
                    <div className="mt-2 p-2 bg-background/50 rounded text-xs font-mono text-zinc-600 dark:text-zinc-400 max-h-32 overflow-y-auto">
                      {whisperxTestResult.segments.slice(0, 5).map((seg, i) => (
                        <div key={i} className="mb-1">
                          <span className="text-blue-500">[{seg.start.toFixed(1)}s]</span>{' '}
                          {seg.text.trim()}
                        </div>
                      ))}
                      {whisperxTestResult.segments.length > 5 && (
                        <div className="text-zinc-400 italic">
                          ... and {whisperxTestResult.segments.length - 5} more segments
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Community Identity */}
        <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <User className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-primary dark:text-white">社区身份</h3>
          </div>

          {isLoadingProfile ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 text-zinc-400 animate-spin" />
              <span className="ml-2 text-sm text-zinc-500">加载中...</span>
            </div>
          ) : (
            <div className="grid gap-6">
              {/* UUID */}
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  用户 ID (UUID)
                </label>
                {isReplacingUuid ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userUuidInput}
                      onChange={e => setUserUuidInput(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="flex-1 bg-background border border-amber-500/50 rounded-lg py-2 px-4 text-primary dark:text-white font-mono text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    />
                    <button
                      onClick={handleRestoreUuid}
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition flex items-center gap-2 text-sm"
                    >
                      确认
                    </button>
                    <button
                      onClick={() => {
                        setIsReplacingUuid(false)
                        setUserUuidInput('')
                      }}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-secondary transition text-sm"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userUuid}
                      readOnly
                      className="flex-1 bg-background border border-border rounded-lg py-2 px-4 text-primary dark:text-white font-mono text-sm"
                    />
                    <button
                      onClick={handleCopyUuid}
                      className="px-4 py-2 bg-secondary text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-secondary/80 transition flex items-center gap-2 text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      复制
                    </button>
                    <button
                      onClick={() => setIsReplacingUuid(true)}
                      className="px-4 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition flex items-center gap-2 text-sm"
                    >
                      替换
                    </button>
                    <button
                      onClick={handleClearUuid}
                      className="px-4 py-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/20 transition flex items-center gap-2 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      清除
                    </button>
                  </div>
                )}
                {userUuid && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    此 ID 用于标识您在社区中的身份，发布资料时使用
                  </p>
                )}

                {/* Email Recovery for cleared UUID */}
                {!userUuid && (
                  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          设备身份已清除
                        </h4>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1 mb-3">
                          请选择以下方式恢复您的账户和资料。
                        </p>

                        {/* UUID Input */}
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-amber-600/70 dark:text-amber-400/70 mb-1">
                            如果您记得原 UUID，可直接输入：
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={userUuidInput}
                              onChange={e => setUserUuidInput(e.target.value)}
                              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                              className="flex-1 bg-background border border-amber-500/30 rounded-lg py-1.5 px-3 text-primary dark:text-white font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                            />
                            <button
                              onClick={handleRestoreUuid}
                              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-xs font-medium"
                            >
                              恢复
                            </button>
                          </div>
                        </div>

                        {/* Email Recovery */}
                        <div className="pt-3 border-t border-amber-500/20">
                          <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mb-2">
                            或通过邮箱验证码恢复：
                          </p>
                          <button
                            onClick={() => setRecoveryStep('input')}
                            className="px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-xs font-medium"
                          >
                            通过邮箱恢复
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Nickname */}
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  昵称
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    placeholder="输入您的昵称"
                    className="flex-1 bg-background border border-border rounded-lg py-2 px-4 text-primary dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                  <button
                    onClick={handleSaveNickname}
                    disabled={isSavingNickname}
                    className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                  >
                    {isSavingNickname ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    保存
                  </button>
                </div>
                {nicknameError && <p className="text-xs text-rose-500 mt-1">{nicknameError}</p>}
              </div>

              {/* Email Binding */}
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  邮箱绑定
                </label>
                {emailBound ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {email}
                      </span>
                    </div>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                      已绑定
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value)
                        setEmailError('')
                      }}
                      placeholder="输入您的邮箱"
                      className="flex-1 bg-background border border-border rounded-lg py-2 px-4 text-primary dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                    <button
                      onClick={handleBindEmail}
                      disabled={isBindingEmail}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                    >
                      {isBindingEmail ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Link className="w-4 h-4" />
                      )}
                      绑定
                    </button>
                  </div>
                )}
                {emailError && <p className="text-xs text-rose-500 mt-1">{emailError}</p>}
                {emailSuccess && <p className="text-xs text-emerald-500 mt-1">{emailSuccess}</p>}
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  绑定邮箱后，即使更换浏览器或设备，也能通过邮箱找回您的资料
                </p>
              </div>

              {/* Quota Display */}
              {quota && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        Public 配额
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {quota.public.used} / {quota.public.limit}
                    </div>
                    <div className="mt-2 h-1.5 bg-emerald-500/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{
                          width: `${Math.min((quota.public.used / quota.public.limit) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        Private 配额
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {quota.private.used} / {quota.private.limit}
                    </div>
                    <div className="mt-2 h-1.5 bg-blue-500/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{
                          width: `${Math.min((quota.private.used / quota.private.limit) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  <strong>Public:</strong> 公开分享给所有用户，每个用户最多 100 条<br />
                  <strong>Private:</strong> 仅自己可见的多设备同步，每个用户最多 50 条
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <span
            className={`text-sm ${
              saveStatus === 'saved'
                ? 'text-emerald-500'
                : saveStatus === 'saving'
                  ? 'text-blue-500'
                  : 'text-amber-500'
            }`}
          >
            {saveStatus === 'saved' ? '✓ 已保存' : saveStatus === 'saving' ? '保存中...' : '未保存'}
          </span>
          <Button onClick={handleSave} size="lg" className="gap-2">
            <Save className="w-4 h-4" />
            {t.settings_save}
          </Button>
        </div>
      </div>
    </div>
  )
}
