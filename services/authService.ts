// Authentication service for SenseFlow
import { supabase, Database } from './supabaseClient'

export interface UserProfile {
  id: string
  username: string | null
  avatar_url: string | null
  preferences: Record<string, any>
  created_at: string
  updated_at: string
}

export class AuthService {
  // Sign up with email and password
  async signUp(email: string, password: string, username?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split('@')[0],
          },
        },
      })

      if (error) throw error

      return { user: data.user, session: data.session }
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      return { user: data.user, session: data.session }
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  // Sign in with Google OAuth
  async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      return data
    } catch (error) {
      console.error('Google sign in error:', error)
      throw error
    }
  }

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return true
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      return user
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  // Get user profile from sf_users table
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase.from('sf_users').select('*').eq('id', userId).single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get user profile error:', error)
      return null
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<UserProfile>) {
    try {
      const { data, error } = await supabase
        .from('sf_users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Update user profile error:', error)
      throw error
    }
  }

  // Reset password
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return supabase.auth.getUser() !== null
  }
}

export const authService = new AuthService()
