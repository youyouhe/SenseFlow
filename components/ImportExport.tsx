import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { Button } from './ui/Button'
import {
  Download,
  Upload,
  FileText,
  Share2,
  Copy,
  Check,
  X,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { StudyMaterial } from '../types'

export const ImportExportPanel: React.FC = () => {
  const { materials, addMaterial, deleteMaterial, clearAllData } = useStore()
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [exportStatus, setExportStatus] = useState<'idle' | 'success'>('idle')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const exportMaterial = (material: StudyMaterial) => {
    const dataStr = JSON.stringify(material, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

    const exportFileDefaultName = `${material.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()

    setExportStatus('success')
    setTimeout(() => setExportStatus('idle'), 2000)
  }

  const exportAllMaterials = () => {
    const dataStr = JSON.stringify(
      {
        version: '1.0',
        exportDate: new Date().toISOString(),
        materials: materials,
      },
      null,
      2
    )

    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `chunkmaster_backup_${new Date().toISOString().split('T')[0]}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()

    setExportStatus('success')
    setTimeout(() => setExportStatus('idle'), 2000)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const importMaterial = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = e => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)

        if (data.materials && Array.isArray(data.materials)) {
          // Import multiple materials from backup
          data.materials.forEach((material: StudyMaterial) => {
            addMaterial(material)
          })
        } else if (data.chunks && data.title) {
          // Import single material
          addMaterial(data)
        } else {
          throw new Error('Invalid file format')
        }

        setImportStatus('success')
        setTimeout(() => setImportStatus('idle'), 3000)
      } catch (error) {
        console.error('Import error:', error)
        setImportStatus('error')
        setTimeout(() => setImportStatus('idle'), 3000)
      }
    }

    reader.readAsText(file)
    event.target.value = '' // Reset file input
  }

  const shareMaterial = async (material: StudyMaterial) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: material.title,
          text: `Check out this language learning material: ${material.title}`,
          url: window.location.href,
        })
      } else {
        // Fallback: copy to clipboard
        const shareText = `${material.title}\n\n${material.description}\n\nChunks: ${material.chunks.length}\nDifficulty: ${material.config.difficulty}`
        await navigator.clipboard.writeText(shareText)
        setCopiedId(material.id)
        setTimeout(() => setCopiedId(null), 2000)
      }
    } catch (error) {
      console.error('Share failed:', error)
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">Import & Export</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Manage your learning materials</p>
      </div>

      {/* Import Section */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Import Materials
        </h3>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Upload JSON files to import learning materials
            </p>

            <Button className="gap-2" onClick={handleImportClick}>
              <Download className="w-4 h-4" />
              Choose File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={importMaterial}
              className="hidden"
            />
          </div>

          {importStatus === 'success' && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-3">
              <Check className="w-5 h-5" />
              <span>Materials imported successfully!</span>
            </div>
          )}

          {importStatus === 'error' && (
            <div className="p-4 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 rounded-lg border border-rose-200 dark:border-rose-500/20 flex items-center gap-3">
              <X className="w-5 h-5" />
              <span>Failed to import file. Please check the format.</span>
            </div>
          )}
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export Materials
        </h3>

        <div className="space-y-4">
          <Button onClick={exportAllMaterials} className="w-full gap-2" variant="outline">
            <Download className="w-4 h-4" />
            Export All Materials (Backup)
          </Button>

          {exportStatus === 'success' && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-3">
              <Check className="w-5 h-5" />
              <span>Export completed successfully!</span>
            </div>
          )}
        </div>
      </div>

      {/* Materials List */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">Your Materials</h3>

        {materials.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No materials to export</p>
          </div>
        ) : (
          <div className="space-y-4">
            {materials.map(material => (
              <div
                key={material.id}
                className="flex items-center justify-between p-4 bg-background dark:bg-zinc-800/50 rounded-lg border border-border"
              >
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-white">{material.title}</h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500">
                    <span>{material.chunks.length} chunks</span>
                    <span>{material.config.difficulty}</span>
                    <span>{Math.round(material.duration)}s</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportMaterial(material)}
                    className="gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => shareMaterial(material)}
                    className="gap-1"
                  >
                    {copiedId === material.id ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        Share
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm('Delete this material?')) {
                        deleteMaterial(material.id)
                      }
                    }}
                    className="gap-1 text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clear All Data */}
      <div className="bg-surface border border-rose-200 dark:border-rose-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Clear All Data
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Delete all settings, materials, and progress. This cannot be undone.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowClearConfirm(true)}
            className="gap-2 text-rose-500 border-rose-200 hover:bg-rose-500/10"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Clear All Data?</h3>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6">
              This will permanently delete all your materials, settings, and training progress. This
              action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  clearAllData()
                  setShowClearConfirm(false)
                  alert('All data has been cleared.')
                }}
                className="text-rose-500 border-rose-200 hover:bg-rose-500/10"
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
