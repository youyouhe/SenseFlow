import { supabase } from './supabaseClient'
import { storageManager } from './storageManager'

export interface UserProfile {
  user_uuid: string
  email: string | null
  email_verified: boolean | null
  nickname: string | null
  public_count: number
  private_count: number
  created_at: string
  updated_at: string
}

export interface UserQuota {
  public: { used: number; limit: number }
  private: { used: number; limit: number }
}

const STORAGE_KEY = 'senseflow_user_uuid'
const STORAGE_EMAIL = 'senseflow_user_email'
const STORAGE_NICKNAME = 'senseflow_user_nickname'
const PUBLIC_LIMIT = 100
const PRIVATE_LIMIT = 50

// UUID change listeners
const uuidChangeListeners = new Set<() => void>()

// Fallback UUID generator for browsers that don't support crypto.randomUUID()
function generateUUID(): string {
  // Check if crypto.randomUUID is available
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback: generate a UUID v4 using crypto.getRandomValues
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6]! & 0x0f) | 0x40 // Version 4
    bytes[8] = (bytes[8]! & 0x3f) | 0x80 // Variant 10

    const hex = Array.from(bytes)
      .map(b => b!.toString(16).padStart(2, '0'))
      .join('')

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
  }

  // Last resort: simple random string generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export class UserIdentityService {
  private constructor() {}

  private static instance: UserIdentityService

  static getInstance(): UserIdentityService {
    if (!UserIdentityService.instance) {
      UserIdentityService.instance = new UserIdentityService()
    }
    return UserIdentityService.instance
  }

  getOrCreateUUID(): string {
    let uuid = localStorage.getItem(STORAGE_KEY)
    if (!uuid) {
      uuid = generateUUID()
      localStorage.setItem(STORAGE_KEY, uuid)
    }
    return uuid
  }

  getUUID(): string | null {
    return localStorage.getItem(STORAGE_KEY)
  }

  // Subscribe to UUID changes (e.g., after account recovery)
  onUUIDChange(callback: () => void): () => void {
    uuidChangeListeners.add(callback)
    // Return unsubscribe function
    return () => uuidChangeListeners.delete(callback)
  }

  // Notify all listeners when UUID changes
  private async notifyUUIDChange(): Promise<void> {
    // Clear user-specific IndexedDB data to prevent data leakage between accounts
    try {
      await storageManager.clearUserData()
      console.log('[UserIdentityService] Cleared user data from IndexedDB after UUID change')
    } catch (error) {
      console.warn('[UserIdentityService] Failed to clear user data:', error)
    }

    // Notify all listeners (components will reload their state)
    uuidChangeListeners.forEach(callback => callback())
  }

  getNickname(): string | null {
    return localStorage.getItem(STORAGE_NICKNAME)
  }

  setNickname(nickname: string): void {
    localStorage.setItem(STORAGE_NICKNAME, nickname)
  }

  getEmail(): string | null {
    return localStorage.getItem(STORAGE_EMAIL)
  }

  setEmail(email: string): void {
    localStorage.setItem(STORAGE_EMAIL, email)
  }

  async bindEmail(email: string): Promise<void> {
    const uuid = this.getOrCreateUUID()
    email = email.toLowerCase().trim()

    // Use maybeSingle() to handle case where email is not yet registered
    const { data: existing } = await supabase
      .from('sf_user_profiles')
      .select('user_uuid, email_verified')
      .eq('email', email)
      .maybeSingle()

    if (existing && existing.user_uuid !== uuid) {
      throw new Error('该邮箱已被其他账户绑定')
    }

    const { error } = await supabase
      .from('sf_user_profiles')
      .update({ email, email_verified: false })
      .eq('user_uuid', uuid)

    if (error) {
      console.error('Error binding email:', error)
      throw new Error('绑定失败')
    }

    this.setEmail(email)
  }

  async findUserByEmail(email: string): Promise<string | null> {
    // Use maybeSingle() to handle case where email is not found
    const { data, error } = await supabase
      .from('sf_user_profiles')
      .select('user_uuid')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (error || !data) {
      return null
    }
    return data.user_uuid
  }

  async migrateToEmail(newEmail: string): Promise<void> {
    const currentUuid = this.getOrCreateUUID()
    const targetUuid = await this.findUserByEmail(newEmail)

    if (!targetUuid) {
      throw new Error('未找到该邮箱关联的账户')
    }

    if (targetUuid === currentUuid) {
      return
    }

    const { error: migrateError } = await supabase.rpc('migrate_user_data', {
      from_uuid: currentUuid,
      to_uuid: targetUuid,
    })

    if (migrateError) {
      console.error('Error migrating data:', migrateError)
      throw new Error('数据迁移失败')
    }

    localStorage.setItem(STORAGE_KEY, targetUuid)
    this.setEmail(newEmail)
    await this.notifyUUIDChange()
  }

  async fetchProfileByUuid(uuid: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('sf_user_profiles')
      .select('*')
      .eq('user_uuid', uuid)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching profile:', error)
      return null
    }

    return data
  }

  async syncProfileFromRemote(uuid: string): Promise<void> {
    const profile = await this.fetchProfileByUuid(uuid)
    if (profile) {
      if (profile.nickname) {
        this.setNickname(profile.nickname)
      }
      if (profile.email) {
        this.setEmail(profile.email)
      }
    }
  }

  async sendRecoveryCode(email: string): Promise<void> {
    const uuid = this.getOrCreateUUID()
    const nickname = this.getNickname() || '用户'

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-recovery-code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ email, user_uuid: uuid, nickname }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '发送失败')
    }
  }

  async verifyRecoveryCode(email: string, code: string): Promise<string | null> {
    // Use maybeSingle() to handle case where code is invalid/expired
    const { data, error } = await supabase
      .from('sf_recovery_codes')
      .select('user_uuid')
      .eq('email', email.toLowerCase())
      .eq('code', code.toUpperCase())
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (error || !data) {
      return null
    }
    return data.user_uuid
  }

  async recoverAccount(email: string, code: string): Promise<void> {
    const currentUuid = this.getOrCreateUUID()
    const targetUuid = await this.verifyRecoveryCode(email, code)

    if (!targetUuid) {
      throw new Error('验证码无效或已过期')
    }

    if (targetUuid === currentUuid) {
      throw new Error('当前设备已在该账户下')
    }

    const { error: migrateError } = await supabase.rpc('migrate_user_data', {
      from_uuid: currentUuid,
      to_uuid: targetUuid,
    })

    if (migrateError) {
      console.error('Error migrating data:', migrateError)
      throw new Error('数据迁移失败')
    }

    localStorage.setItem(STORAGE_KEY, targetUuid)
    this.setEmail(email)
    await this.notifyUUIDChange()
  }

  async getOrCreateProfile(): Promise<UserProfile> {
    const uuid = this.getOrCreateUUID()

    const { data, error } = await supabase
      .from('sf_user_profiles')
      .select('*')
      .eq('user_uuid', uuid)
      .single()

    if (data) {
      return data
    }

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error)
    }

    const { data: newProfile, error: insertError } = await supabase
      .from('sf_user_profiles')
      .insert({
        user_uuid: uuid,
        nickname: this.getNickname() || `User_${uuid.substring(0, 6)}`,
        public_count: 0,
        private_count: 0,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating profile:', insertError)
      throw insertError
    }

    return newProfile
  }

  async updateNickname(nickname: string): Promise<void> {
    const uuid = this.getOrCreateUUID()
    this.setNickname(nickname)

    const { error } = await supabase
      .from('sf_user_profiles')
      .update({ nickname })
      .eq('user_uuid', uuid)

    if (error) {
      console.error('Error updating nickname:', error)
      throw error
    }
  }

  async getQuota(): Promise<UserQuota> {
    const uuid = this.getUUID()
    if (!uuid) {
      return {
        public: { used: 0, limit: PUBLIC_LIMIT },
        private: { used: 0, limit: PRIVATE_LIMIT },
      }
    }

    // Use maybeSingle() instead of single() to handle new users without profile
    const { data, error } = await supabase
      .from('sf_user_profiles')
      .select('public_count, private_count')
      .eq('user_uuid', uuid)
      .maybeSingle()

    if (error || !data) {
      // PGRST116 is expected for new users - no profile exists yet
      if (error?.code !== 'PGRST116') {
        console.warn('Error getting quota:', error)
      }
      return {
        public: { used: 0, limit: PUBLIC_LIMIT },
        private: { used: 0, limit: PRIVATE_LIMIT },
      }
    }

    return {
      public: { used: data.public_count, limit: PUBLIC_LIMIT },
      private: { used: data.private_count, limit: PRIVATE_LIMIT },
    }
  }

  async canPublish(type: 'public' | 'private'): Promise<boolean> {
    const quota = await this.getQuota()
    const target = type === 'public' ? quota.public : quota.private
    return target.used < target.limit
  }

  async incrementPublishCount(type: 'public' | 'private'): Promise<void> {
    const uuid = this.getOrCreateUUID()
    const field = type === 'public' ? 'public_count' : 'private_count'

    const { error } = await supabase.rpc('increment_publish_count', {
      user_uuid_input: uuid,
      count_type: field,
    })

    if (error) {
      console.error('Error incrementing publish count:', error)
    }
  }
}

export const userIdentityService = UserIdentityService.getInstance()
