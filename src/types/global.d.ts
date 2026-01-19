/// <reference types="vite/client" />

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
    speechSynthesis: SpeechSynthesis
  }
}

// Environment variables
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_OPENAI_KEY: string
  readonly VITE_GEMINI_KEY: string
  readonly VITE_DEEPSEEK_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Temporary React JSX fix
declare namespace JSX {
  interface IntrinsicElements {
    [tagName: string]: any
  }
}

export {}
