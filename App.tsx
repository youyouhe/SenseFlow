import React, { useState, useEffect } from 'react'
import { Layout } from './components/Layout'
import { Library } from './components/Library'
import { Player } from './components/Player'
import { Settings } from './components/Settings'
import { ProgressDashboard } from './components/Progress'
import { TrainingPanel } from './components/Training'
import { ImportExportPanel } from './components/ImportExport'
import { Marketplace } from './components/Marketplace'
import { useStore } from './store/useStore'

export default function App() {
  const [activeView, setActiveView] = useState('library')

  const renderContent = () => {
    switch (activeView) {
      case 'library':
        return <Library onViewPlayer={() => setActiveView('player')} />
      case 'player':
        return <Player />
      case 'training':
        return <TrainingPanel />
      case 'settings':
        return <Settings />
      case 'progress':
        return <ProgressDashboard />
      case 'import-export':
        return <ImportExportPanel />
      case 'marketplace':
        return <Marketplace />
      default:
        return <Library onViewPlayer={() => setActiveView('player')} />
    }
  }

  return (
    <Layout activeView={activeView} onChangeView={setActiveView}>
      {renderContent()}
    </Layout>
  )
}
