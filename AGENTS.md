# Agent Instructions for SenseFlow

This document provides guidelines for AI coding agents working on the SenseFlow codebase. SenseFlow is a React/TypeScript application for language learning and auditory fitness, built with Vite.

## Project Overview

SenseFlow is a language learning app that helps users improve their listening skills through chunk-based audio training. It supports multiple AI providers (OpenAI, Gemini, DeepSeek) and local inference engines.

## Build/Lint/Test Commands

### Build Commands
- `npm run dev` - Start development server on port 3000
- `npm run build` - Build production bundle with Vite
- `npm run preview` - Preview production build locally

### Testing
Currently no test framework is configured. To add testing:
- Install Vitest: `npm install --save-dev vitest @testing-library/react @testing-library/jest-dom`
- Add to package.json scripts:
  ```json
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:run": "vitest run"
  ```
- Run single test: `npm run test -- <test-file-path>`

### Linting and Code Quality
Currently no linting tools configured. Recommended setup:
- Install ESLint: `npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react-hooks eslint-plugin-react`
- Install Prettier: `npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier`
- Add scripts:
  ```json
  "lint": "eslint src/**/*.{ts,tsx} --fix",
  "format": "prettier --write src/**/*.{ts,tsx,css,md}"
  ```

## Code Style Guidelines

### Language and Framework
- **React**: Use functional components with hooks
- **TypeScript**: Strict typing required, no `any` types
- **State Management**: Zustand for global state, React state for component state
- **Styling**: Tailwind CSS classes in className strings

### File Structure
```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   └── [Feature].tsx   # Feature components
├── store/              # Zustand stores
├── services/           # Business logic and API calls
├── types.ts            # TypeScript type definitions
└── [main-files]        # App.tsx, index.tsx, etc.
```

### Naming Conventions

#### Files and Directories
- Components: `PascalCase.tsx` (e.g., `Button.tsx`, `Library.tsx`)
- Services: `camelCase.ts` (e.g., `mockData.ts`, `translations.ts`)
- Stores: `useCamelCase.ts` (e.g., `useStore.ts`)
- Types: `types.ts` (centralized type definitions)

#### Code Elements
- **Components**: `PascalCase` (e.g., `Button`, `Library`)
- **Functions/Variables**: `camelCase` (e.g., `renderContent`, `activeView`)
- **Types/Interfaces**: `PascalCase` (e.g., `ButtonProps`, `StudyMaterial`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MOCK_MATERIALS`)
- **Event Handlers**: `handleEventName` (e.g., `handleSubmit`, `onViewChange`)

### Import/Export Patterns
```typescript
// Named exports preferred
export interface ButtonProps { ... }
export const Button: React.FC<ButtonProps> = ...

// Default exports for components
export default function App() { ... }

// Import grouping
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { useStore } from '../store/useStore';
import { translations } from '../services/translations';
```

### Component Patterns

#### Functional Components
```typescript
interface ComponentProps {
  title: string;
  onAction?: () => void;
}

export const MyComponent: React.FC<ComponentProps> = ({
  title,
  onAction
}) => {
  const [state, setState] = useState(initialValue);

  return (
    <div className="component-styles">
      {/* JSX content */}
    </div>
  );
};
```

#### Props with Defaults
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  // Component implementation
};
```

### State Management

#### Zustand Store Pattern
```typescript
interface StoreState {
  // State properties
  items: Item[];
  loading: boolean;

  // Actions
  addItem: (item: Item) => void;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  // Initial state
  items: [],
  loading: false,

  // Actions
  addItem: (item) => set((state) => ({
    items: [item, ...state.items]
  })),

  setLoading: (loading) => set({ loading }),
}));
```

### TypeScript Types

#### Interface Definitions
```typescript
export interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  duration: number;
  config: MaterialConfig;
}

export type ProviderType = 'edge' | 'openai' | 'local' | 'gemini' | 'deepseek';
```

#### Union Types for Variants
```typescript
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Insane';
```

### Error Handling

#### Try-Catch in Async Functions
```typescript
const fetchData = async () => {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error; // Re-throw for caller to handle
  }
};
```

#### Error Boundaries (for components)
```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}
```

### Styling Conventions

#### Tailwind CSS Classes
- Use responsive prefixes: `sm:`, `md:`, `lg:`
- Dark mode: `dark:` prefix
- State variants: `hover:`, `focus:`, `disabled:`
- Combine classes in template literals
- Prefer utility classes over custom CSS

```typescript
const buttonClasses = `
  inline-flex items-center justify-center
  rounded-lg font-medium
  transition-all duration-200
  focus:outline-none focus:ring-2
  disabled:opacity-50
`;
```

### Code Formatting

#### General Rules
- **Indentation**: 2 spaces (no tabs)
- **Line Length**: Max 100 characters
- **Quotes**: Single quotes for strings
- **Semicolons**: Optional (Prettier will handle)
- **Trailing Commas**: Always for multiline objects/arrays

#### JSX Formatting
```typescript
// Good: Multi-line for readability
<button
  className="btn-primary"
  onClick={handleClick}
  disabled={isLoading}
>
  {children}
</button>

// Good: Single line for simple elements
<input type="text" value={value} onChange={handleChange} />
```

### Best Practices

#### Performance
- Use `React.memo` for expensive components
- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers passed to children
- Avoid inline functions in render

#### Accessibility
- Use semantic HTML elements
- Add `aria-label` or `aria-labelledby` where needed
- Ensure keyboard navigation works
- Maintain sufficient color contrast

#### Security
- Never commit API keys or secrets
- Validate user inputs
- Use HTTPS for API calls
- Sanitize data before rendering

### Git Workflow

#### Commit Messages
- Use imperative mood: "Add feature" not "Added feature"
- Keep first line under 50 characters
- Add detailed description for complex changes
- Reference issue numbers: "Fix login bug (#123)"

#### Branch Naming
- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- Hotfixes: `hotfix/description`

### Development Workflow

1. Create feature branch from `main`
2. Make changes following these guidelines
3. Run build to ensure no compilation errors
4. Test functionality manually
5. Commit with clear message
6. Create pull request for review

### Tooling Configuration

#### VS Code Extensions (Recommended)
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- Prettier - Code formatter
- ESLint

#### Environment Variables
- Use `.env.local` for local development
- Prefix with `VITE_` for client-side variables
- Never commit `.env` files

This document should be updated as the project evolves and new patterns emerge.</content>
<parameter name="filePath">D:\SenseFlow\AGENTS.md