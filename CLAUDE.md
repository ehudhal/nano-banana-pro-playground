# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nano Banana Pro is an AI image generation and editing playground powered by Vercel AI Gateway and Google's Gemini 3 Pro Image model. The app supports two modes:
- **Text-to-image**: Generate images from natural language prompts
- **Image-editing**: Edit/combine existing images with AI based on prompts

## Development Commands

```bash
# Development
npm run dev              # Start dev server on localhost:3000

# Build & Production
npm run build           # Build for production
npm run start           # Run production build
npm run lint            # Run ESLint
```

## Environment Setup

Required environment variables in `.env.local`:
```
AI_GATEWAY_API_KEY=your-vercel-ai-gateway-key

# For logo vectorization (SVG conversion)
VECTORIZER_API_ID=your-vectorizer-api-id
VECTORIZER_API_SECRET=your-vectorizer-api-secret
```

- `AI_GATEWAY_API_KEY`: Required for image generation. The application checks for this key at runtime via `/api/check-api-key` and displays a warning banner if missing.
- `VECTORIZER_API_ID` / `VECTORIZER_API_SECRET`: Required for logo vectorization. Get credentials from [vectorizer.ai](https://vectorizer.ai)

## Architecture

### Core Application Structure

**Single Page Application**: The entire app is a single-page experience built around `components/image-combiner/index.tsx`, which orchestrates all functionality.

**State Management Pattern**: The app uses a composition of custom hooks rather than a global state management library:
- `use-image-generation.ts`: Handles image generation lifecycle, progress tracking, and API calls
- `use-image-upload.ts`: Manages file uploads, HEIC conversion, and URL-based images
- `use-aspect-ratio.ts`: Controls aspect ratio selection and detection
- `use-persistent-history.tsx`: Manages generation history using localStorage (max 50 items)

**Split Panel Layout**: Desktop view has a resizable split panel (30-70% constraints) with:
- Left: Input controls, prompt, image uploads, history (desktop)
- Right: Output display, generation preview
- Mobile: Stacked layout with history at bottom

### API Routes

Both routes in `/app/api/` use the Vercel AI SDK with the Gateway provider:

**`/api/generate-image` (POST)**:
- Accepts FormData with mode, prompt, aspectRatio, and optional images
- Supports both file uploads and URL-based images
- Uses `@ai-sdk/gateway` with `createGateway()` and model `google/gemini-3-pro-image`
- Returns base64-encoded images in the response
- Validates file sizes (10MB max) and types (JPEG, PNG, WebP, GIF)

**`/api/check-api-key` (GET)**:
- Simple health check that returns whether `AI_GATEWAY_API_KEY` is configured

### Generation Flow

1. User enters prompt and optionally uploads images
2. `useImageGeneration` creates a new Generation object with status "loading"
3. A progress interval simulates progress (slows down as it approaches 98%)
4. FormData is sent to `/api/generate-image` with AbortController for cancellation
5. On success, generation is moved to "complete" status and saved to localStorage
6. A subtle success sound plays (Web Audio API)
7. The new generation becomes selected by default

### History & Persistence

- Generations are stored in localStorage under key `nb2_generations`
- Maximum 50 generations kept (FIFO)
- Each Generation has: id, status, progress, imageUrl, prompt, timestamp, error, abortController
- History displays as thumbnails with status indicators
- Users can select, delete, or load previous generations as new inputs

### Image Handling

**Upload Methods**:
- Drag & drop (global or per-slot)
- File picker
- Paste from clipboard (images or URLs)
- Direct URL input (toggle between file/URL mode)

**HEIC Conversion**: Uses `heic-to` library for automatic HEIC → PNG conversion with progress tracking

**Fullscreen Viewer**:
- Navigate between generations with arrow keys or buttons
- Close with Escape or click outside
- Supports keyboard shortcuts throughout

### Keyboard Shortcuts

When not typing in inputs:
- `Cmd/Ctrl + Enter`: Generate image (in prompt textarea)
- `Cmd/Ctrl + C`: Copy generated image to clipboard
- `Cmd/Ctrl + D`: Download generated image
- `Cmd/Ctrl + U`: Load generated image as input
- `Escape`: Close fullscreen viewer
- `Arrow Left/Right`: Navigate generations in fullscreen

### Visual Design

- Dark theme with dithering shader background (`@paper-design/shaders-react`)
- Geist font for UI, JetBrains Mono for monospace elements
- Next.js Image optimization disabled (`unoptimized: true`)
- Tailwind CSS v4 with custom animations
- Mobile-responsive with breakpoint-aware layouts

## Key Implementation Details

**Next.js Configuration**:
- TypeScript and ESLint errors ignored during build (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`)
- Remote image patterns configured for Google's generative language domains
- Package imports optimized for `lucide-react` and `@radix-ui/react-icons`

**Error Handling**:
- ErrorBoundary wraps the entire app at root layout
- API errors bubble up to toast notifications
- Missing API key shows persistent warning banner
- Generation failures remove the loading generation and show error toast

**Performance Optimizations**:
- Dithering component is memoized to prevent re-renders
- Images lazy load with loading states
- Thumbnails in history track loaded state separately
- AbortController allows cancelling in-flight requests

## Common Development Patterns

**Adding a new generation feature**:
1. Update the `Generation` type in `types.ts` with new fields
2. Modify `useImageGeneration` to handle the new logic
3. Update localStorage schema in `use-persistent-history.tsx`
4. Add UI controls in `InputSection` or relevant component

**Modifying the API**:
1. Edit `/app/api/generate-image/route.ts`
2. Update FormData construction in `use-image-generation.ts`
3. Adjust response handling and error cases
4. Update TypeScript interfaces if response shape changes

**Adding keyboard shortcuts**:
1. Update `handleGlobalKeyboard` in `ImageCombiner` component
2. Document in the "How it Works" modal if user-facing
3. Ensure shortcuts don't fire when typing in inputs (check `isTyping` flag)
