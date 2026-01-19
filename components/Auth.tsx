import React, { useState, useEffect } from 'react'
import { authService, UserProfile } from '../services/authService'
import { dataService } from '../services/dataService'
import { useStore } from '../store/useStore'
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  LogOut,
  UserCircle,
  Settings,
  Brain,
  Target,
} from 'lucide-react'
import { Button } from './ui/Button'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'signin' | 'signup'
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, mode }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { updateSettings, toggleLanguage } = useStore()
  const { settings } = useStore()
  const t =
    settings.language === 'zh'
      ? {
          signin: '登录',
          signup: '注册',
          email: '邮箱',
          password: '密码',
          username: '用户名',
          login: '登录',
          register: '注册',
          logout: '退出登录',
          profile: '个人资料',
          settings: '设置',
          or: '或',
          google_signin: '使用Google登录',
        }
      : {
          signin: 'Sign In',
          signup: 'Sign Up',
          email: 'Email',
          password: 'Password',
          username: 'Username',
          login: 'Login',
          register: 'Register',
          logout: 'Logout',
          profile: 'Profile',
          settings: 'Settings',
          or: 'or',
          google_signin: 'Sign in with Google',
        }

  useEffect(() => {
    setError('')
  }, [mode, email, password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError(
        mode === 'signin'
          ? t.email + ' and ' + t.password + ' are required'
          : 'All fields are required'
      )
      return
    }

    setLoading(true)
    setError('')

    try {
      if (mode === 'signin') {
        const { user } = await authService.signIn(email, password)
        if (user) {
          onClose()
          // Update store with user info
          await initializeUser(user.id)
        }
      } else {
        const { user } = await authService.signUp(email, password, username)
        if (user) {
          onClose()
          await initializeUser(user.id)
        }
      }
    } catch (error: any) {
      setError(error.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await authService.signInWithGoogle()
      onClose()
    } catch (error: any) {
      setError(error.message || 'Google sign in failed')
    }
  }

  const initializeUser = async (userId: string) => {
    try {
      // Get user profile and sync with store
      const profile = await authService.getUserProfile(userId)
      if (profile?.preferences) {
        updateSettings(profile.preferences)
      }
    } catch (error) {
      console.error('Failed to initialize user:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            {mode === 'signin' ? t.signin : t.signup}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={t.username}
                className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-zinc-900 dark:text-white placeholder-zinc-400"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t.email}
              className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-zinc-900 dark:text-white placeholder-zinc-400"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t.password}
              className="w-full pl-10 pr-12 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-zinc-900 dark:text-white placeholder-zinc-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-600 text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            {loading ? 'Loading...' : mode === 'signin' ? t.login : t.register}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-surface text-zinc-400">{t.or}</span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleGoogleSignIn}
          className="w-full py-3 border border-border bg-secondary hover:bg-zinc-100 dark:hover:bg-zinc-700"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t.google_signin}
        </Button>
      </div>
    </div>
  )
}

export const UserMenu: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const { settings, updateSettings } = useStore()
  const t =
    settings.language === 'zh'
      ? {
          profile: '个人资料',
          settings: '设置',
          logout: '退出登录',
          progress: '学习进度',
          favorites: '收藏夹',
          my_materials: '我的材料',
        }
      : {
          profile: 'Profile',
          settings: 'Settings',
          logout: 'Logout',
          progress: 'Progress',
          favorites: 'Favorites',
          my_materials: 'My Materials',
        }

  useEffect(() => {
    checkAuth()
    const unsubscribe = authService.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await authService.getUserProfile(session.user.id)
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
    })

    return () => unsubscribe.data.subscription.unsubscribe()
  }, [])

  const checkAuth = async () => {
    const user = await authService.getCurrentUser()
    if (user) {
      const profile = await authService.getUserProfile(user.id)
      setUserProfile(profile)
    }
  }

  const handleSignOut = async () => {
    try {
      await authService.signOut()
      setUserProfile(null)
      setShowDropdown(false)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <>
      <div className="relative">
        {userProfile ? (
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {userProfile.avatar_url ? (
              <img
                src={userProfile.avatar_url}
                alt={userProfile.username || 'User'}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <UserCircle className="w-8 h-8 text-zinc-400" />
            )}
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {userProfile.username}
            </span>
          </button>
        ) : (
          <Button
            onClick={() => {
              setAuthMode('signin')
              setShowAuthModal(true)
            }}
            variant="outline"
            size="sm"
          >
            <UserCircle className="w-4 h-4 mr-2" />
            {settings.language === 'zh' ? '登录' : 'Sign In'}
          </Button>
        )}

        {showDropdown && userProfile && (
          <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg z-50">
            <div className="p-3 border-b border-border">
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                {userProfile.username}
              </p>
              <p className="text-xs text-zinc-500 truncate">{userProfile.id}</p>
            </div>

            <div className="py-1">
              <button className="w-full px-3 py-2 text-sm text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2">
                <Target className="w-4 h-4" />
                {t.progress}
              </button>
              <button className="w-full px-3 py-2 text-sm text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2">
                <UserCircle className="w-4 h-4" />
                {t.profile}
              </button>
              <button className="w-full px-3 py-2 text-sm text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                {t.settings}
              </button>
              <button
                onClick={handleSignOut}
                className="w-full px-3 py-2 text-sm text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {t.logout}
              </button>
            </div>
          </div>
        )}
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} mode={authMode} />

      {showDropdown && <div className="fixed inset-0" onClick={() => setShowDropdown(false)} />}
    </>
  )
}
