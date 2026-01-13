import React from 'react';
import { useStore } from '../store/useStore';
import { Key, Save, Server, Globe } from 'lucide-react';
import { Button } from './ui/Button';
import { translations } from '../services/translations';

export const Settings = () => {
  const { settings, updateSettings } = useStore();
  const [localState, setLocalState] = React.useState(settings);
  const t = translations[settings.language];

  const handleSave = () => {
    updateSettings(localState);
    alert(t.settings_saved_msg);
  };

  // Sync local state when global language changes
  React.useEffect(() => {
    setLocalState(prev => ({...prev, language: settings.language}));
  }, [settings.language]);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-primary dark:text-white tracking-tight">{t.settings_title}</h2>
        <p className="text-zinc-500 dark:text-zinc-400">{t.settings_subtitle}</p>
      </div>

      <div className="grid gap-6">
        
        {/* Cloud Providers */}
        <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Globe className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-primary dark:text-white">{t.settings_cloud_title}</h3>
          </div>
          
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">OpenAI API Key</label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input 
                  type="password"
                  value={localState.openaiKey}
                  onChange={(e) => setLocalState({...localState, openaiKey: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-4 text-primary dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-zinc-500"
                  placeholder="sk-..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Gemini API Key</label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input 
                  type="password"
                  value={localState.geminiKey}
                  onChange={(e) => setLocalState({...localState, geminiKey: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-4 text-primary dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-zinc-500"
                  placeholder="AIza..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">DeepSeek API Key</label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input 
                  type="password"
                  value={localState.deepseekKey}
                  onChange={(e) => setLocalState({...localState, deepseekKey: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-4 text-primary dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-zinc-500"
                  placeholder="sk-..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Local Engine */}
        <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Server className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-primary dark:text-white">{t.settings_local_title}</h3>
          </div>
          
          <div className="p-4 bg-secondary/30 rounded-lg border border-border mb-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t.settings_local_desc}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.settings_local_endpoint}</label>
            <input 
              type="text"
              value={localState.localApiUrl}
              onChange={(e) => setLocalState({...localState, localApiUrl: e.target.value})}
              className="w-full bg-background border border-border rounded-lg py-2 px-4 text-primary dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-mono text-sm"
              placeholder="http://localhost:9000"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} size="lg" className="gap-2">
            <Save className="w-4 h-4" />
            {t.settings_save}
          </Button>
        </div>
      </div>
    </div>
  );
};