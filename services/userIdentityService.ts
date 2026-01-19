import { supabase } from './supabaseClient'

export interface UserProfile {
  user_uuid: string
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
const STORAGE_NICKNAME = 'senseflow_user_nickname'
const PUBLIC_LIMIT = 100
const PRIVATE_LIMIT = 50

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
      uuid = crypto.randomUUID()
      localStorage.setItem(STORAGE_KEY, uuid)
    }
    return uuid
  }

  getUUID(): string | null {
    return localStorage.getItem(STORAGE_KEY)
  }

  getNickname(): string | null {
    return localStorage.getItem(STORAGE_NICKNAME)
  }

  setNickname(nickname: string): void {
    localStorage.setItem(STORAGE_NICKNAME, nickname)
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

    const { data, error } = await supabase
      .from('sf_user_profiles')
      .select('public_count, private_count')
      .eq('user_uuid', uuid)
      .single()

    if (error) {
      console.error('Error getting quota:', error)
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
      user_uuid: uuid,
      count_type: field,
    })

    if (error) {
      console.error('Error incrementing publish count:', error)
    }
  }
}

export const userIdentityService = UserIdentityService.getInstance()
