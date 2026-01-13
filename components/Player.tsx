import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Waves, Settings2, Rewind, AlignLeft, AlignJustify
} from 'lucide-react';
import { Button } from './ui/Button';
import { translations } from '../services/translations';

export const Player = () => {
  const { 
    activeMaterial, isPlaying, currentTime, duration,
    play, pause, seek, tick,
    voiceVolume, setVoiceVolume,
    noiseVolume, setNoiseVolume,
    noiseEnabled, toggleNoise,
    playerViewMode, setPlayerViewMode,
    settings
  } = useStore();
  const t = translations[settings.language];

  // Refs for auto-scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeChunkRef = useRef<HTMLElement>(null);
  
  // --- Animation Loop ---
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = (time - previousTimeRef.current) / 1000;
      tick(deltaTime);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [isPlaying]); 

  useEffect(() => {
     previousTimeRef.current = undefined;
  }, [isPlaying]);

  // --- Auto-Scrolling ---
  useEffect(() => {
    if (activeChunkRef.current && scrollContainerRef.current && isPlaying) {
      activeChunkRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime, isPlaying, playerViewMode]);

  // --- Helpers ---
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isChunkActive = (start: number, end: number) => {
    return currentTime >= start && currentTime < end;
  };

  if (!activeMaterial) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
        <Waves className="w-16 h-16 mb-4 opacity-20" />
        <p>{t.player_empty}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-background transition-colors duration-300">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10 bg-gradient-to-b from-background via-background/95 to-transparent flex justify-between items-start pointer-events-none">
         <div className="pointer-events-auto">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{activeMaterial.title}</h1>
            <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-xs font-medium border border-indigo-500/20">
                  {playerViewMode === 'chunk' ? t.player_chunk_mode : t.player_full_mode}
                </span>
                <span className="text-zinc-500 text-sm">• {activeMaterial.config.difficulty}</span>
            </div>
         </div>
         
         <div className="bg-surface border border-border rounded-lg p-1 flex gap-1 shadow-sm pointer-events-auto">
            <button 
              onClick={() => setPlayerViewMode('chunk')}
              className={`p-1.5 rounded transition-all ${playerViewMode === 'chunk' ? 'bg-indigo-500 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
              title={t.player_chunk_mode}
            >
              <AlignJustify className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPlayerViewMode('full')}
              className={`p-1.5 rounded transition-all ${playerViewMode === 'full' ? 'bg-indigo-500 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
              title={t.player_full_mode}
            >
              <AlignLeft className="w-4 h-4" />
            </button>
         </div>
      </div>

      {/* Main Content Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 flex flex-col p-8 md:p-16 overflow-y-auto scroll-smooth pt-32 pb-32"
      >
        <div className={`max-w-3xl w-full mx-auto ${playerViewMode === 'chunk' ? 'space-y-6 text-center' : 'leading-relaxed'}`}>
          
          {playerViewMode === 'chunk' ? (
            // --- CHUNK MODE ---
            activeMaterial.chunks.map((chunk) => {
              const active = isChunkActive(chunk.start_time, chunk.end_time);
              return (
                <div 
                  key={chunk.id}
                  ref={active ? activeChunkRef as React.RefObject<HTMLDivElement> : null}
                  onClick={() => seek(chunk.start_time)}
                  className={`
                    transition-all duration-300 cursor-pointer rounded-xl p-4 flex flex-col items-center
                    ${active 
                      ? 'bg-indigo-500/10 scale-105 border-indigo-500/50 border shadow-lg shadow-indigo-500/10' 
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border border-transparent opacity-60 hover:opacity-100'}
                  `}
                >
                  <p className={`
                    text-2xl md:text-4xl font-semibold transition-colors
                    ${active ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}
                  `}>
                    {chunk.text}
                  </p>
                  {chunk.translation && (
                    <p className={`
                      text-base md:text-lg mt-2 font-light transition-colors
                      ${active ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-300 dark:text-zinc-600'}
                    `}>
                      {chunk.translation}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            // --- FULL TEXT MODE ---
            <div className="text-xl md:text-2xl leading-[2.5] md:leading-[2.5] text-zinc-300 dark:text-zinc-700 font-medium">
               {activeMaterial.chunks.map((chunk, index) => {
                 const active = isChunkActive(chunk.start_time, chunk.end_time);
                 return (
                   <React.Fragment key={chunk.id}>
                     <span 
                       ref={active ? activeChunkRef as React.RefObject<HTMLSpanElement> : null}
                       onClick={() => seek(chunk.start_time)}
                       className={`
                         cursor-pointer transition-all duration-200 px-1.5 py-0.5 rounded
                         ${active 
                           ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20 font-bold' 
                           : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}
                       `}
                     >
                       {chunk.text}
                     </span>
                     <span className="mr-1"> </span>
                   </React.Fragment>
                 )
               })}
            </div>
          )}

          <div className="h-[50vh]"></div>
        </div>
      </div>

      {/* Bottom Control Deck */}
      <div className="bg-surface border-t border-border p-6 z-20 shadow-2xl">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Progress Bar */}
          <div className="group relative w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full cursor-pointer"
               onClick={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect();
                 const pct = (e.clientX - rect.left) / rect.width;
                 seek(pct * duration);
               }}>
            <div 
              className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all duration-75"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border border-indigo-500 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${(currentTime / duration) * 100}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Controls Layout */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="flex items-center gap-4">
              <button onClick={() => seek(Math.max(0, currentTime - 5))} className="text-zinc-400 hover:text-indigo-600 dark:hover:text-white transition">
                <Rewind className="w-6 h-6" />
              </button>
              
              <button 
                onClick={isPlaying ? pause : play}
                className="w-14 h-14 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
              </button>

              <button onClick={() => seek(Math.min(duration, currentTime + 5))} className="text-zinc-400 hover:text-indigo-600 dark:hover:text-white transition">
                <SkipForward className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-8 bg-secondary p-3 rounded-xl border border-border">
              
              {/* Voice Volume */}
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-indigo-500" />
                <div className="w-24">
                  <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={voiceVolume} 
                    onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="w-px h-8 bg-border mx-2"></div>

              {/* Noise Volume */}
              <div className="flex items-center gap-3">
                <button onClick={toggleNoise} className={`transition ${noiseEnabled ? 'text-rose-500' : 'text-zinc-400'}`}>
                   {noiseEnabled ? <Waves className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <div className="w-24">
                  <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={noiseVolume} 
                    onChange={(e) => setNoiseVolume(parseFloat(e.target.value))}
                    disabled={!noiseEnabled}
                    className={`w-full h-1 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer ${noiseEnabled ? 'accent-rose-500' : 'accent-zinc-500'}`}
                  />
                </div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">{t.player_noise_label}</span>
              </div>

            </div>

            <Button variant="ghost" size="sm" className="hidden md:flex">
              <Settings2 className="w-5 h-5" />
            </Button>
            
          </div>
        </div>
      </div>
    </div>
  );
};