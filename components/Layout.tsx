import React, { useEffect } from 'react';
import { LayoutDashboard, Library, Settings, Disc, Sun, Moon, Languages } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../services/translations';
import { Button } from './ui/Button';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
    ${active 
      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
  >
    <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
    <span className="font-medium text-sm">{label}</span>
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />}
  </button>
);

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onChangeView: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeView, onChangeView }) => {
  const { settings, toggleTheme, toggleLanguage } = useStore();
  const t = translations[settings.language];

  // Apply Theme Class
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  return (
    <div className="flex h-screen bg-background overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border flex flex-col bg-secondary/50 dark:bg-secondary/30 backdrop-blur-sm">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Disc className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">{t.app_name}</h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 pl-10">{t.slogan}</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <SidebarItem 
            icon={Library} 
            label={t.nav_library} 
            active={activeView === 'library'} 
            onClick={() => onChangeView('library')}
          />
          <SidebarItem 
            icon={LayoutDashboard} 
            label={t.nav_player} 
            active={activeView === 'player'} 
            onClick={() => onChangeView('player')}
          />
          <SidebarItem 
            icon={Settings} 
            label={t.nav_settings} 
            active={activeView === 'settings'} 
            onClick={() => onChangeView('settings')}
          />
        </nav>

        <div className="p-4 border-t border-border">
           <div className="bg-surface rounded-lg p-3 border border-border shadow-sm">
              <p className="text-xs text-zinc-500 mb-1">{t.local_status_title}</p>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-xs text-zinc-600 dark:text-zinc-300 font-mono">edge-tts: {t.local_status_ready}</span>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative flex flex-col">
        {/* Top Banner / Header */}
        <header className="h-16 border-b border-border flex items-center justify-end px-6 bg-background/80 backdrop-blur-md sticky top-0 z-30">
           <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleTheme}
                className="rounded-full w-9 h-9 p-0 bg-surface shadow-sm"
                title="Toggle Theme"
              >
                 {settings.theme === 'dark' ? (
                   <Moon className="w-4 h-4 text-indigo-400" />
                 ) : (
                   <Sun className="w-4 h-4 text-amber-500" />
                 )}
              </Button>

              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleLanguage}
                className="gap-2 bg-surface shadow-sm text-xs font-medium"
              >
                 <Languages className="w-4 h-4" />
                 {settings.language === 'en' ? 'EN' : '中文'}
              </Button>
           </div>
        </header>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};