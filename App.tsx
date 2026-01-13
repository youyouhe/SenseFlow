import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Library } from './components/Library';
import { Player } from './components/Player';
import { Settings } from './components/Settings';

export default function App() {
  const [activeView, setActiveView] = useState('library');

  const renderContent = () => {
    switch (activeView) {
      case 'library':
        return <Library onViewPlayer={() => setActiveView('player')} />;
      case 'player':
        return <Player />;
      case 'settings':
        return <Settings />;
      default:
        return <Library onViewPlayer={() => setActiveView('player')} />;
    }
  };

  return (
    <Layout activeView={activeView} onChangeView={setActiveView}>
      {renderContent()}
    </Layout>
  );
}