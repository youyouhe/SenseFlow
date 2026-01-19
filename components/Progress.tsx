import React from 'react';
import { useProgressStore } from '../store/useProgressStore';
import { useStore } from '../store/useStore';
import { BarChart, Clock, Target, TrendingUp, Award, Calendar } from 'lucide-react';
import { Button } from './ui/Button';

export const ProgressDashboard: React.FC = () => {
  const { materials } = useStore();
  const { getOverallProgress, sessionHistory } = useProgressStore();
  const stats = getOverallProgress();

  const recentSessions = sessionHistory.slice(-5).reverse();

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
          Learning Progress
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Track your language learning journey
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Target className="w-8 h-8 text-indigo-500" />
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              {stats.totalChunks}
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Chunks Practiced</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Award className="w-8 h-8 text-emerald-500" />
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              {stats.masteredChunks}
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Mastered Chunks</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-amber-500" />
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              {Math.round(stats.averageAccuracy)}%
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Average Accuracy</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8 text-rose-500" />
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              {sessionHistory.length}
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Sessions Completed</p>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Recent Sessions
        </h3>
        
        {recentSessions.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            <BarChart className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No sessions yet. Start practicing to see your progress!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentSessions.map((session) => {
              const material = materials.find(m => m.id === session.materialId);
              const duration = session.endTime 
                ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000 / 60)
                : 0;
              
              return (
                <div key={session.id} className="flex items-center justify-between p-4 bg-background dark:bg-zinc-800/50 rounded-lg border border-border">
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-white">
                      {material?.title || 'Unknown Material'}
                    </h4>
                    <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                      <span>{new Date(session.startTime).toLocaleDateString()}</span>
                      <span>{duration} min</span>
                      <span>{session.chunksPracticed.length} chunks</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {Math.round(session.accuracy)}%
                    </div>
                    <div className="text-sm text-zinc-500">Accuracy</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Material Progress */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart className="w-5 h-5" />
          Material Progress
        </h3>
        
        <div className="space-y-4">
          {materials.map((material) => {
            const progress = useProgressStore.getState().getProgressByMaterial(material.id);
            const completion = progress 
              ? (progress.chunksCompleted.length / material.chunks.length) * 100
              : 0;
            
            return (
              <div key={material.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-zinc-900 dark:text-white">
                    {material.title}
                  </h4>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {Math.round(completion)}% complete
                  </span>
                </div>
                
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                
                {progress && (
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <span>{progress.chunksCompleted.length}/{material.chunks.length} chunks</span>
                    <span>Accuracy: {Math.round(progress.accuracy)}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};