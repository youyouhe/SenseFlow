import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useProgressStore } from '../store/useProgressStore';
import { Brain, Zap, Target, Clock, CheckCircle, RotateCcw, Volume2 } from 'lucide-react';
import { Button } from './ui/Button';

export const TrainingPanel: React.FC = () => {
  const { 
    activeMaterial, 
    currentChunkIndex, 
    trainingMode, 
    setTrainingMode,
    showHints,
    toggleHints,
    play,
    pause,
    nextChunk,
    previousChunk,
    settings
  } = useStore();
  
  const { startSession, endSession, updateChunkProgress, getSessionStats } = useProgressStore();
  
  const [userInput, setUserInput] = useState('');
  const [showTranslation, setShowTranslation] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);

  const currentChunk = activeMaterial?.chunks[currentChunkIndex];
  const sessionStats = getSessionStats();

  useEffect(() => {
    if (activeMaterial) {
      startSession(activeMaterial.id);
    }
    return () => endSession();
  }, [activeMaterial?.id]);

  useEffect(() => {
    // Reset state when chunk changes
    setUserInput('');
    setShowTranslation(false);
    setIsCorrect(null);
    setAttempts(0);
  }, [currentChunkIndex]);

  if (!currentChunk) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <p>No chunk selected</p>
      </div>
    );
  }

  const handleInputSubmit = () => {
    if (!currentChunk) return;

    const isInputCorrect = userInput.toLowerCase().trim() === currentChunk.text.toLowerCase().trim();
    setIsCorrect(isInputCorrect);
    setAttempts(attempts + 1);

    if (isInputCorrect) {
      const accuracy = attempts === 0 ? 100 : Math.max(0, 100 - (attempts - 1) * 20);
      updateChunkProgress(currentChunk.id, accuracy);
      
      // Auto advance after success
      setTimeout(() => {
        if (currentChunkIndex < activeMaterial.chunks.length - 1) {
          nextChunk();
        }
      }, 1500);
    }
  };

  const handleSkip = () => {
    updateChunkProgress(currentChunk.id, 0);
    nextChunk();
  };

  const handleRepeat = () => {
    setUserInput('');
    setIsCorrect(null);
    setAttempts(0);
  };

  const trainingModes = [
    { id: 'practice', label: 'Practice', icon: Target, description: 'Learn with hints' },
    { id: 'test', label: 'Test', icon: Brain, description: 'Test your knowledge' },
    { id: 'review', label: 'Review', icon: RotateCcw, description: 'Reinforce learning' }
  ] as const;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Training Mode Selector */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Training Mode
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleHints}
            className={`gap-2 ${showHints ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30' : ''}`}
          >
            <Zap className="w-4 h-4" />
            {showHints ? 'Hints On' : 'Hints Off'}
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          {trainingModes.map(({ id, label, icon: Icon, description }) => (
            <button
              key={id}
              onClick={() => setTrainingMode(id)}
              className={`p-3 rounded-lg border transition-all ${
                trainingMode === id
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                  : 'border-border hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <Icon className="w-5 h-5 mb-2 mx-auto" />
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs text-zinc-500 mt-1">{description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Training Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span>Chunk {currentChunkIndex + 1} of {activeMaterial.chunks.length}</span>
            <span>Session Accuracy: {Math.round(sessionStats.accuracy)}%</span>
          </div>

          {/* Chunk Display */}
          <div className="text-center space-y-6">
            {trainingMode !== 'test' && (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full text-sm">
                  <Volume2 className="w-4 h-4" />
                  Listen carefully
                </div>
                
                <div className="p-6 bg-surface border border-border rounded-xl">
                  <Button
                    onClick={play}
                    size="lg"
                    className="w-full gap-2 h-12 text-lg"
                  >
                    <Volume2 className="w-5 h-5" />
                    Play Audio
                  </Button>
                </div>
              </div>
            )}

            {trainingMode === 'test' && (
              <div className="p-8 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-xl">
                <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-2">Type what you hear:</div>
                <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                  🔉 Audio will play here
                </div>
              </div>
            )}

            {/* Show Translation Hint */}
            {showHints && currentChunk.translation && (
              <div className="p-4 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-lg">
                <div className="text-sm text-amber-600 dark:text-amber-400 mb-1">Translation:</div>
                <div className="text-lg text-amber-700 dark:text-amber-300">
                  {currentChunk.translation}
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="space-y-4">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleInputSubmit();
                }
              }}
              placeholder="Type what you heard..."
              className="w-full p-4 border border-border rounded-lg resize-none h-24 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              disabled={isCorrect === true}
            />

            {/* Feedback */}
            {isCorrect !== null && (
              <div className={`p-4 rounded-lg flex items-center gap-3 ${
                isCorrect 
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
              }`}>
                {isCorrect ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <RotateCcw className="w-5 h-5" />
                )}
                <span>
                  {isCorrect ? 'Correct! Well done!' : 'Try again. Listen carefully.'}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleInputSubmit}
                disabled={!userInput.trim() || isCorrect === true}
                className="flex-1"
              >
                Submit
              </Button>
              
              <Button
                variant="outline"
                onClick={handleRepeat}
                disabled={attempts === 0}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                onClick={handleSkip}
              >
                Skip
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-8 border-t border-border">
            <Button
              variant="outline"
              onClick={previousChunk}
              disabled={currentChunkIndex === 0}
              className="gap-2"
            >
              Previous
            </Button>
            
            <div className="text-sm text-zinc-500">
              {attempts > 0 && `Attempts: ${attempts}`}
            </div>
            
            <Button
              onClick={nextChunk}
              disabled={currentChunkIndex === activeMaterial.chunks.length - 1}
              className="gap-2"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};