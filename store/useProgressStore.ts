import { create } from 'zustand';
import { StudyMaterial, UserProgress, TrainingSession } from '../types';

interface ProgressState {
  // User progress tracking
  userProgress: Record<string, UserProgress>;
  currentSession: TrainingSession | null;
  sessionHistory: TrainingSession[];
  
  // Learning analytics
  totalStudyTime: number;
  averageAccuracy: number;
  streakDays: number;
  masteredChunks: string[];
  
  // Actions
  startSession: (materialId: string) => void;
  endSession: () => void;
  updateChunkProgress: (chunkId: string, accuracy: number) => void;
  getSessionStats: () => { accuracy: number; wpm: number; chunksCompleted: number };
  getProgressByMaterial: (materialId: string) => UserProgress | null;
  getOverallProgress: () => { totalChunks: number; masteredChunks: number; averageAccuracy: number };
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  userProgress: {},
  currentSession: null,
  sessionHistory: [],
  
  totalStudyTime: 0,
  averageAccuracy: 0,
  streakDays: 0,
  masteredChunks: [],

  startSession: (materialId: string) => {
    const session: TrainingSession = {
      id: `session_${Date.now()}`,
      materialId,
      startTime: new Date(),
      chunksPracticed: [],
      accuracy: 0,
      wpm: 0,
      comprehensionScore: 0
    };
    set({ currentSession: session });
  },

  endSession: () => {
    const { currentSession, sessionHistory } = get();
    if (currentSession) {
      const completedSession = {
        ...currentSession,
        endTime: new Date()
      };
      set({
        currentSession: null,
        sessionHistory: [...sessionHistory, completedSession]
      });
    }
  },

  updateChunkProgress: (chunkId: string, accuracy: number) => {
    const { currentSession, userProgress } = get();
    if (currentSession) {
      // Update session
      const updatedSession = {
        ...currentSession,
        chunksPracticed: [...currentSession.chunksPracticed, chunkId],
        accuracy: (currentSession.accuracy * currentSession.chunksPracticed.length + accuracy) / (currentSession.chunksPracticed.length + 1)
      };
      set({ currentSession: updatedSession });

      // Update user progress
      const materialProgress = userProgress[currentSession.materialId];
      if (materialProgress) {
        const updatedProgress = {
          ...materialProgress,
          chunksCompleted: [...materialProgress.chunksCompleted, chunkId],
          accuracy: (materialProgress.accuracy * materialProgress.chunksCompleted.length + accuracy) / (materialProgress.chunksCompleted.length + 1),
          lastAccessed: new Date()
        };
        set({
          userProgress: {
            ...userProgress,
            [currentSession.materialId]: updatedProgress
          }
        });
      }
    }
  },

  getSessionStats: () => {
    const { currentSession } = get();
    return {
      accuracy: currentSession?.accuracy || 0,
      wpm: currentSession?.wpm || 0,
      chunksCompleted: currentSession?.chunksPracticed.length || 0
    };
  },

  getProgressByMaterial: (materialId: string) => {
    return get().userProgress[materialId] || null;
  },

  getOverallProgress: () => {
    const { userProgress, masteredChunks } = get();
    const allProgress = Object.values(userProgress);
    const totalChunks = allProgress.reduce((sum, p) => sum + p.chunksCompleted.length, 0);
    const avgAccuracy = allProgress.length > 0 
      ? allProgress.reduce((sum, p) => sum + p.accuracy, 0) / allProgress.length 
      : 0;

    return {
      totalChunks,
      masteredChunks: masteredChunks.length,
      averageAccuracy: avgAccuracy
    };
  }
}));