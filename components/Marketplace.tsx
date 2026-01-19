import React, { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { dataService } from '../services/dataService'
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
} from 'lucide-react'
import { Button } from './ui/Button'
import { translations } from '../services/translations'

export const Marketplace: React.FC = () => {
  const { settings, addMaterial } = useStore()
  const t = translations[settings.language]

  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [difficulty, setDifficulty] = useState('all')

  useEffect(() => {
    loadMaterials()
  }, [difficulty])

  const loadMaterials = async () => {
    setLoading(true)
    try {
      const data = await dataService.getPublicMaterials(20, 0, difficulty)
      setMaterials(data || [])
    } catch (error) {
      console.error('Failed to load materials:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadMaterials()
      return
    }
    setLoading(true)
    try {
      const data = await dataService.searchMaterials(searchQuery, undefined, difficulty)
      setMaterials(data || [])
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadMaterial = async (material: any) => {
    try {
      const studyMaterial = dataService.convertToStudyMaterial(material)
      addMaterial(studyMaterial)
      alert(t.lib_start_success || 'Material added to your library!')
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

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

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={t.market_search || 'Search materials...'}
            className="w-full bg-surface border border-border rounded-lg py-3 pl-10 pr-4 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <select
          value={difficulty}
          onChange={e => setDifficulty(e.target.value)}
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
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>{t.market_empty || 'No materials found'}</p>
        </div>
      ) : (
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
                  <span key={tag} className="text-xs bg-secondary px-2 py-1 rounded text-zinc-500">
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
      )}
    </div>
  )
}
