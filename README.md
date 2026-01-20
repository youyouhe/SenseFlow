<div align="center">
<img width="1200" height="475" alt="SenseFlow Banner" src="/banner.png" />
</div>

# SenseFlow - Language Learning & Auditory Fitness

SenseFlow is a React/TypeScript web application designed to help users improve their listening skills through chunk-based audio training. The app supports multiple AI providers for text-to-speech and speech-to-text, with features for personal learning progress tracking and a community marketplace for sharing materials.

## Features

### 🎧 Auditory Training

- **Chunk-based Learning**: Break down audio content into manageable chunks for focused listening practice
- **Multiple TTS Engines**: Support for Edge TTS, OpenAI, Google Gemini, DeepSeek, and local CosyVoice
- **Speech Recognition**: WhisperX integration for accurate transcription and pronunciation evaluation
- **Adaptive Difficulty**: Smart difficulty adjustment based on your performance

### 📚 Personal Library

- Import and manage your study materials
- Progress tracking with detailed analytics
- Favorite materials for quick access
- Training history with accuracy scores

### 🌐 Community Marketplace

- Browse and download public learning materials
- Share your own creations with the community
- Rate and review materials
- Follow other learners

### 🔐 Account Recovery

- UUID-based identity system
- Email binding for account recovery
- Multi-device synchronization
- Secure data migration

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL, Edge Functions)
- **AI Services**:
  - Edge TTS / OpenAI TTS / Google Gemini / DeepSeek (text-to-speech)
  - WhisperX (speech-to-text)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/SenseFlow.git
cd SenseFlow
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# AI Services (optional)
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
```

4. Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
SenseFlow/
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # Reusable UI components
│   │   ├── Library.tsx   # Material library
│   │   ├── Player.tsx    # Audio player & training
│   │   ├── Settings.tsx  # App settings
│   │   └── Marketplace.tsx # Community marketplace
│   ├── services/         # Business logic & API
│   │   ├── audioService.ts
│   │   ├── cosyvoiceService.ts
│   │   ├── whisperxService.ts
│   │   └── userIdentityService.ts
│   ├── store/            # Zustand stores
│   ├── types.ts          # TypeScript definitions
│   └── main.tsx
├── supabase/
│   ├── functions/        # Edge Functions
│   └── 001_create_tables.sql
├── public/               # Static assets
└── package.json
```

## Screenshots

### Library (English)

![Library](/library-en.png)

### Library (Chinese)

![Library](/library-zh.png)

### Training - Light Mode

![Training](/play-zh-light.png)

### Training - Dark Mode

![Training](/play-zh-dark.png)

## Scripts

```bash
# Development
npm run dev           # Start dev server on port 3000

# Build
npm run build         # Production build
npm run preview       # Preview production build

# Testing
npm run test          # Run tests
npm run test:ui       # Tests with UI
npm run test:run      # Tests (single run)

# Code Quality
npm run lint          # Auto-fix linting issues
npm run lint:check    # Check linting
npm run format        # Auto-format code
npm run format:check  # Check formatting
npm run typecheck     # TypeScript type check
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [WhisperX](https://github.com/m-bain/whisperx) for speech recognition
- [Edge TTS](https://github.com/rany2/edge-tts) for text-to-speech
- [Supabase](https://supabase.com/) for backend infrastructure
