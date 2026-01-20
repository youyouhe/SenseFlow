import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { dataService } from '../services/dataService'
import { communityService, MaterialFilter, CommunityMaterial } from '../services/communityService'
import { userIdentityService } from '../services/userIdentityService'
import {
  Search,
  Filter,
  Download,
  Star,
  Users,
  Clock,
  Heart,
  Share2,
  Loader2,
  Sparkles,
  Globe,
  Lock,
  User,
} from 'lucide-react'
import { Button } from './ui/Button'
import { translations } from '../services/translations'

export const Marketplace: React.FC = () => {
  const { settings, addMaterial } = useStore()
  const t = translations[settings.language]

  const [materials, setMaterials] = useState<CommunityMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [difficulty, setDifficulty] = useState('all')
  const [filter, setFilter] = useState<MaterialFilter>('public')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [userUuid, setUserUuid] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Initialize user UUID
  useEffect(() => {
    setUserUuid(userIdentityService.getOrCreateUUID())
  }, [])

  // Load materials when filter or difficulty changes
  useEffect(() => {
    loadMaterials(true)
  }, [filter, difficulty])

  const loadMaterials = async (reset = false) => {
    const currentOffset = reset ? 0 : offset
    if (reset) {
      setOffset(0)
      setMaterials([])
    }

    setLoading(true)
    try {
      const newMaterials = await communityService.getMaterials(filter, currentOffset, difficulty)

      if (reset) {
        setMaterials(newMaterials)
      } else {
        setMaterials(prev => [...prev, ...newMaterials])
      }

      setHasMore(newMaterials.length >= 12)
      if (!reset) {
        setOffset(currentOffset + 12)
      }
    } catch (error) {
      console.error('Failed to load materials:', error)
    } finally {
      setLoading(false)
      setIsLoadingMore(false)
    }
  }

  // Infinite scroll
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !loading) {
      setIsLoadingMore(true)
      setOffset(prev => prev + 12)
      loadMaterials(false)
    }
  }, [isLoadingMore, hasMore, loading])

  useEffect(() => {
    if (loadMoreRef.current) {
      observerRef.current = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting && hasMore && !loading) {
            handleLoadMore()
          }
        },
        { threshold: 0.1 }
      )
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loading, handleLoadMore])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadMaterials(true)
      return
    }
    setLoading(true)
    try {
      // For search, use dataService (full-text search in Supabase)
      const data = await dataService.searchMaterials(searchQuery, undefined, difficulty)
      setMaterials(data || [])
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadMaterial = async (material: CommunityMaterial) => {
    try {
      const studyMaterial = await communityService.downloadMaterial(material.id)
      addMaterial(studyMaterial)
      alert(t.lib_start_success || 'Material added to your library!')
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const filterOptions: { value: MaterialFilter; label: string; icon: React.ReactNode }[] = [
    { value: 'public', label: 'Public', icon: <Globe className="w-4 h-4" /> },
    { value: 'private', label: 'Private', icon: <Lock className="w-4 h-4" /> },
    { value: 'my-public', label: 'My Public', icon: <User className="w-4 h-4" /> },
    { value: 'my-private', label: 'My Private', icon: <User className="w-4 h-4" /> },
  ]

  const difficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy':
        return 'text-emerald-500 bg-emerald-500/10'
      case 'Medium':
        return 'text-amber-500 bg-amber-500/10'
      case 'Hard':
        return 'text-orange-500 bg-orange-500/10'
      case 'Insane':
        return 'text-rose-500 bg-rose-500/10'
      default:
        return 'text-zinc-400 bg-zinc-500/10'
    }
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in pb-24">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
          {t.market_title || 'Community Marketplace'}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          {t.market_subtitle || 'Discover and download learning materials shared by the community'}
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterOptions.map(option => (
          <button
            key={option.value}
            onClick={() => {
              setFilter(option.value)
              loadMaterials(true)
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              filter === option.value
                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'bg-surface border-border text-zinc-600 dark:text-zinc-400 hover:border-indigo-500/50'
            }`}
          >
            {option.icon}
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        ))}
      </div>

      {/* Search & Difficulty */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
            placeholder={t.market_search || 'Search materials...'}
            className="w-full bg-surface border border-border rounded-lg py-3 pl-10 pr-4 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <select
          value={difficulty}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDifficulty(e.target.value)}
          className="bg-surface border border-border rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="all">{t.diff_all || 'All Levels'}</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
          <option value="Insane">Insane</option>
        </select>
        <Button onClick={handleSearch} className="gap-2">
          <Sparkles className="w-4 h-4" />
          {t.btn_search || 'Search'}
        </Button>
      </div>

      {/* Content */}
      {loading && materials.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>{t.market_empty || 'No materials found'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials.map(material => (
              <div
                key={material.id}
                className="bg-surface rounded-xl border border-border p-5 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${difficultyColor(material.difficulty)}`}
                  >
                    {material.difficulty}
                  </span>
                  <div className="flex items-center gap-2 text-zinc-400">
                    {material.sf_material_analytics?.avg_rating > 0 && (
                      <span className="flex items-center text-xs">
                        <Star className="w-3 h-3 text-amber-400 mr-1" />
                        {material.sf_material_analytics.avg_rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
                  {material.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 line-clamp-2">
                  {material.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {(material.tags || []).slice(0, 3).map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs bg-secondary px-2 py-1 rounded text-zinc-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {material.duration}s
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {material.sf_material_analytics?.total_users || 0} {t.market_users || 'users'}
                  </span>
                </div>

                <Button onClick={() => downloadMaterial(material)} className="w-full gap-2">
                  <Download className="w-4 h-4" />
                  {t.btn_download || 'Download'}
                </Button>
              </div>
            ))}
          </div>

          {/* Load More Trigger */}
          {materials.length > 0 && hasMore && (
            <div ref={loadMoreRef} className="flex items-center justify-center py-8">
              {isLoadingMore ? (
                <div className="flex items-center gap-2 text-zinc-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>加载更多...</span>
                </div>
              ) : (
                <span className="text-sm text-zinc-400">滚动加载更多</span>
              )}
            </div>
          )}

          {!hasMore && materials.length > 0 && (
            <div className="text-center py-8 text-zinc-400 text-sm">已加载全部内容</div>
          )}
        </>
      )}
    </div>
  )
}
