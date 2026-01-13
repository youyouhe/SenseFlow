// The "Recipe" Structure defined in the report
export type ProviderType = "edge" | "openai" | "local" | "gemini" | "deepseek";

export interface Chunk {
  id: string; // unique id for keying
  text: string;
  translation?: string; // Chinese translation
  start_time: number; // seconds
  end_time: number;   // seconds
}

export interface MaterialConfig {
  recommended_speed: number;
  recommended_noise_level: number;
  provider_type: ProviderType;
  tags: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane';
}

export interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  original_text: string;
  chunks: Chunk[];
  duration: number; // total duration in seconds
  config: MaterialConfig;
}

export interface UserSettings {
  openaiKey: string;
  geminiKey: string;
  deepseekKey: string;
  localApiUrl: string;
  theme: 'dark' | 'light';
  language: 'en' | 'zh';
}