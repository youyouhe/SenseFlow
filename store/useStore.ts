import { create } from 'zustand';
import { StudyMaterial, UserSettings } from '../types';
import { MOCK_MATERIALS } from '../services/mockData';

interface PlayerState {
  // Playback State
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  
  // Mixer State
  voiceVolume: number; // 0.0 to 1.0
  noiseVolume: number; // 0.0 to 1.0
  noiseEnabled: boolean;

  // View State
  playerViewMode: 'chunk' | 'full';

  // Data State
  activeMaterial: StudyMaterial | null;
  materials: StudyMaterial[];

  // User Settings
  settings: UserSettings;

  // Actions
  setMaterial: (id: string) => void;
  addMaterial: (material: StudyMaterial) => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVoiceVolume: (val: number) => void;
  setNoiseVolume: (val: number) => void;
  toggleNoise: () => void;
  setPlayerViewMode: (mode: 'chunk' | 'full') => void;
  
  updateSettings: (settings: Partial<UserSettings>) => void;
  toggleTheme: () => void;
  toggleLanguage: () => void;

  tick: (delta: number) => void; // Simulate time passing for the mock player
}

export const useStore = create<PlayerState>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1.0,
  
  voiceVolume: 1.0,
  noiseVolume: 0.3,
  noiseEnabled: true,
  
  playerViewMode: 'chunk',

  activeMaterial: null,
  materials: MOCK_MATERIALS,

  settings: {
    openaiKey: '',
    geminiKey: '',
    deepseekKey: '',
    localApiUrl: 'http://localhost:9000',
    theme: 'dark',
    language: 'zh' // Default to Chinese
  },

  setMaterial: (id) => {
    const material = get().materials.find(m => m.id === id);
    if (material) {
      set({ 
        activeMaterial: material, 
        duration: material.duration,
        currentTime: 0,
        isPlaying: false,
        noiseVolume: material.config.recommended_noise_level 
      });
    }
  },

  addMaterial: (material) => set((state) => ({ 
    materials: [material, ...state.materials] 
  })),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  
  seek: (time) => set({ currentTime: Math.max(0, Math.min(time, get().duration)) }),
  
  setVoiceVolume: (val) => set({ voiceVolume: val }),
  setNoiseVolume: (val) => set({ noiseVolume: val }),
  toggleNoise: () => set((state) => ({ noiseEnabled: !state.noiseEnabled })),
  setPlayerViewMode: (mode) => set({ playerViewMode: mode }),
  
  updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),

  toggleTheme: () => set((state) => {
    const newTheme = state.settings.theme === 'dark' ? 'light' : 'dark';
    return { settings: { ...state.settings, theme: newTheme } };
  }),

  toggleLanguage: () => set((state) => {
    const newLang = state.settings.language === 'zh' ? 'en' : 'zh';
    return { settings: { ...state.settings, language: newLang } };
  }),

  // Simulation tick for the progress bar since we don't have real audio in this mock
  tick: (delta) => {
    const { isPlaying, currentTime, duration, playbackRate } = get();
    if (isPlaying) {
      const nextTime = currentTime + (delta * playbackRate);
      if (nextTime >= duration) {
        set({ isPlaying: false, currentTime: duration }); // End reached
      } else {
        set({ currentTime: nextTime });
      }
    }
  }
}));