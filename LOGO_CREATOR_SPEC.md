# Logo Creator Feature Specification

## Overview

Transform Nano Banana Pro from a general image generation tool into a specialized logo creation platform with an AI-powered sequential workflow that guides users from brand concept to finished logo variations.

## User Flow

```
┌─────────────────────┐
│  Brand Input        │
│  - Company Name     │
│  - Description      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  GPT-5 API Call     │
│  Generate Concepts  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Concept Selection  │
│  (3 options)        │
│  - Visual Object    │
│  - Visual Style     │
│  - Brand Colors     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Prompt Preview     │
│  (Editable)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  "Create Logo"      │
│  Button             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Gemini API Calls   │
│  - 3 Logo Marks     │
│  - 3 Lettermarks    │
│  - 3 Wordmarks      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  9 Logo Grid        │
│  Display & Select   │
└─────────────────────┘
```

## Phase 1: Brand Input

### UI Components

**New Component: `BrandInputSection`**
- Location: `components/logo-creator/brand-input-section.tsx`
- Replaces or appears before `InputSection` when in "Logo Mode"

**Fields:**
```typescript
interface BrandInput {
  companyName: string      // Required, max 50 chars
  description: string      // Required, max 200 chars, 1-line
}
```

**Layout:**
```
┌──────────────────────────────────────┐
│ Brand Details                        │
├──────────────────────────────────────┤
│                                      │
│ Company Name                         │
│ ┌──────────────────────────────┐   │
│ │ Enter company name...        │   │
│ └──────────────────────────────┘   │
│                                      │
│ What does your company do?          │
│ ┌──────────────────────────────┐   │
│ │ One-line description...      │   │
│ └──────────────────────────────┘   │
│                                      │
│        [Generate Concepts →]         │
│                                      │
└──────────────────────────────────────┘
```

### Validation
- Company name: 1-50 characters
- Description: 1-200 characters
- Both fields required before proceeding
- Character count displayed below each field

---

## Phase 2: Concept Generation (GPT-5)

### API Route

**New Route: `/app/api/generate-concepts/route.ts`**

**Request:**
```typescript
POST /api/generate-concepts
{
  companyName: string
  description: string
}
```

**Response:**
```typescript
{
  concepts: [
    {
      id: string                    // "concept-1", "concept-2", "concept-3"
      visualObject: string          // 1-5 words, no letters
      visualStyle: string           // Up to 3 words
      brandColors: {
        primary: {
          name: string              // e.g., "Red"
          hex: string               // e.g., "#FF0000"
        }
        secondary?: {
          name: string              // e.g., "Blue"
          hex: string               // e.g., "#0000FF"
        }
      }
      rationale?: string            // Optional: Why this concept fits
    },
    // ... 2 more concepts
  ]
}
```

### GPT-5 Integration

**System Prompt Template:**
```
You are a brand identity expert. Generate 3 distinct visual concepts for a logo.

Company: {companyName}
Description: {description}

For each concept, provide:
1. Visual Object: A concrete visual element (1-5 words, NO letters or text)
   Examples: "sun touching horizon", "intersecting circles", "mountain peak"

2. Visual Style: Aesthetic direction (up to 3 words)
   Examples: "Bold, Geometric", "Organic, Flowing", "Minimal, Sharp"

3. Brand Colors: 1-2 colors with hex values
   Format: "ColorName #HEXCODE and ColorName #HEXCODE"
   Examples: "Navy Blue #1E3A8A and Coral #FF6B6B"

Ensure concepts are:
- Visually distinct from each other
- Appropriate for the industry/company
- Based on name, product, or values
- Abstract enough to be iconic
- Do NOT suggest text, letters, or words in the visual object

Return as valid JSON with this structure:
{
  "concepts": [
    {
      "id": "concept-1",
      "visualObject": "...",
      "visualStyle": "...",
      "brandColors": {
        "primary": {"name": "...", "hex": "#..."},
        "secondary": {"name": "...", "hex": "#..."}
      },
      "rationale": "..."
    }
  ]
}
```

### UI Components

**New Component: `ConceptSelector`**
- Location: `components/logo-creator/concept-selector.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Choose Your Visual Concept                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ ○        │  │ ○        │  │ ○        │         │
│  │          │  │          │  │          │         │
│  │ Concept 1│  │ Concept 2│  │ Concept 3│         │
│  │          │  │          │  │          │         │
│  │ Visual:  │  │ Visual:  │  │ Visual:  │         │
│  │ Sun...   │  │ Wave...  │  │ Peak...  │         │
│  │          │  │          │  │          │         │
│  │ Style:   │  │ Style:   │  │ Style:   │         │
│  │ Bold...  │  │ Fluid... │  │ Sharp... │         │
│  │          │  │          │  │          │         │
│  │ ●● Colors│  │ ●● Colors│  │ ●● Colors│         │
│  │          │  │          │  │          │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                      │
│               [Continue with Selected →]            │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Interaction:**
- Cards are selectable (radio button behavior)
- Hover shows border highlight
- Selected card shows accent border + checkmark
- Color swatches displayed as circles with hex on hover
- Optional: Preview animation or icon for each concept

### Loading State
```
┌─────────────────────────────────────────┐
│ Generating concepts for {companyName}   │
│                                          │
│         ⟳ Analyzing your brand...       │
│         [Progress indicator]             │
│                                          │
└─────────────────────────────────────────┘
```

---

## Phase 3: Concept Selection & Prompt Preview

### UI Components

**Modified Component: `InputSection`**
- Shows read-only brand details at top
- Displays selected concept as a card
- Main prompt textarea is populated with generated prompt
- User can edit the prompt before generation

**Layout:**
```
┌──────────────────────────────────────────┐
│ Brand: {companyName}                     │
│ "{description}"                          │
├──────────────────────────────────────────┤
│                                          │
│ Selected Concept:                        │
│ ┌──────────────────────────────────┐   │
│ │ Visual: {visualObject}           │   │
│ │ Style: {visualStyle}             │   │
│ │ Colors: ●● {colors}              │   │
│ │                   [Change Concept]│   │
│ └──────────────────────────────────┘   │
│                                          │
│ Logo Prompt (editable):                 │
│ ┌──────────────────────────────────┐   │
│ │ {generated prompt}               │   │
│ │                                  │   │
│ │                                  │   │
│ └──────────────────────────────────┘   │
│                                          │
│         [← Back] [Create Logo →]        │
│                                          │
└──────────────────────────────────────────┘
```

### Prompt Generation Logic

**Implementation:** See `lib/logo-prompt-generator.ts`

The prompt generation system is fully implemented with modular, extensible functions:

```typescript
import { generateLogoPrompt, getLettermarkSequence } from '@/lib/logo-prompt-generator'

// Generate a wordmark prompt
const wordmarkPrompt = generateLogoPrompt({
  companyName: "Design Rails",
  concept: selectedConcept,
  archetype: "wordmark"
})
// Output: Wordmark for "Design Rails". Black stroke. Single-line.
//         Fully flat. Handwritten elegance. dynamic.
//         Fully white background. No extra text.

// Generate lettermark sequence (wordmark → lettermark → optional enclosure)
const steps = getLettermarkSequence(
  "Design Rails",
  selectedConcept,
  "circle" // or "square", or null for no enclosure
)
// Returns: Array of sequential generation steps with prompts
```

**Implemented Archetypes:**
- **Wordmark** (16:9): Full company name with configurable styles
- **Lettermark** (1:1): Extracted initials from wordmark
- **Enclosed Lettermark** (1:1): Lettermark inside circle/square

**Extensibility:**
- Add new wordmark styles to `WORDMARK_ADJECTIVES` array
- Add new enclosing shapes to `LETTERMARK_SHAPES` array
- All logic is modular and testable

---

## Phase 4: Logo Generation (Gemini)

### Generation Strategy

**9 Parallel API Calls to Gemini:**

1. **Logo Mark Variations (3)** - Visual concept based
   - Prompt includes: visual object, style, colors
   - No text or letters
   - Focus on iconic symbol

2. **Lettermark Variations (3)** - Less literal, letter-focused
   - Prompt includes: company initials, style, colors
   - Abstract letter treatment
   - Artistic typography

3. **Wordmark Variations (3)** - Lettermark + wordmark combo
   - Prompt includes: full company name, style, colors
   - Combined letter + word treatment
   - Integrated design

### Modified API Route

**Update: `/app/api/generate-image/route.ts`**

Add support for batch generation mode:

```typescript
interface BatchGenerateRequest {
  mode: 'logo-batch'
  prompts: Array<{
    id: string
    type: 'logomark' | 'lettermark' | 'wordmark'
    prompt: string
    aspectRatio: string
  }>
}

interface BatchGenerateResponse {
  results: Array<{
    id: string
    type: string
    url: string
    prompt: string
  }>
}
```

### UI Components

**New Component: `LogoGenerationProgress`**
```
┌──────────────────────────────────────────┐
│ Creating your logo variations...         │
├──────────────────────────────────────────┤
│                                          │
│ Logo Marks        [██████    ] 2/3      │
│ Lettermarks       [████      ] 1/3      │
│ Wordmarks         [          ] 0/3      │
│                                          │
│ Overall Progress: 33% (3 of 9)          │
│                                          │
│              [Cancel Generation]         │
│                                          │
└──────────────────────────────────────────┘
```

**New Component: `LogoGrid`**
- Location: `components/logo-creator/logo-grid.tsx`

```
┌─────────────────────────────────────────────────────────┐
│ Your Logo Options                                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Logo Marks (Visual Concept)                             │
│ ┌────────┐ ┌────────┐ ┌────────┐                       │
│ │   🎨   │ │   🎨   │ │   🎨   │                       │
│ │  Logo  │ │  Logo  │ │  Logo  │                       │
│ │   #1   │ │   #2   │ │   #3   │                       │
│ └────────┘ └────────┘ └────────┘                       │
│                                                          │
│ Lettermarks                                             │
│ ┌────────┐ ┌────────┐ ┌────────┐                       │
│ │   AB   │ │   AB   │ │   AB   │                       │
│ │ Letter │ │ Letter │ │ Letter │                       │
│ │   #1   │ │   #2   │ │   #3   │                       │
│ └────────┘ └────────┘ └────────┘                       │
│                                                          │
│ Wordmarks (Letter + Word)                               │
│ ┌────────┐ ┌────────┐ ┌────────┐                       │
│ │ ACME   │ │ ACME   │ │ ACME   │                       │
│ │  Word  │ │  Word  │ │  Word  │                       │
│ │   #1   │ │   #2   │ │   #3   │                       │
│ └────────┘ └────────┘ └────────┘                       │
│                                                          │
│            [Regenerate All] [Try New Concept]           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Grid Interaction:**
- Click to select/enlarge
- Download individual logos
- Download all as ZIP
- Hover shows quick actions (download, fullscreen, regenerate single)
- Each card shows loading → complete → error states

---

## Data Models

### TypeScript Interfaces

```typescript
// Brand input
interface BrandDetails {
  companyName: string
  description: string
}

// Concept from GPT-5
interface LogoConcept {
  id: string
  visualObject: string
  visualStyle: string
  brandColors: {
    primary: {
      name: string
      hex: string
    }
    secondary?: {
      name: string
      hex: string
    }
  }
  rationale?: string
}

// Logo generation result
interface LogoVariation {
  id: string
  type: 'logomark' | 'lettermark' | 'wordmark'
  imageUrl: string
  prompt: string
  status: 'loading' | 'complete' | 'error'
  progress: number
  error?: string
}

// Complete logo project
interface LogoProject {
  id: string
  brandDetails: BrandDetails
  selectedConcept: LogoConcept
  finalPrompt: string
  variations: LogoVariation[]
  createdAt: string
  selectedVariationId?: string
}
```

---

## State Management

### New Custom Hook: `useLogoCreation`

```typescript
interface UseLogoCreationReturn {
  // Current step in workflow
  currentStep: 'brand-input' | 'concept-selection' | 'prompt-preview' | 'generation' | 'results'

  // Brand details
  brandDetails: BrandDetails | null
  setBrandDetails: (details: BrandDetails) => void

  // Concepts
  concepts: LogoConcept[]
  isGeneratingConcepts: boolean
  generateConcepts: () => Promise<void>

  // Selected concept
  selectedConcept: LogoConcept | null
  selectConcept: (conceptId: string) => void

  // Prompt
  logoPrompt: string
  setLogoPrompt: (prompt: string) => void

  // Generation
  variations: LogoVariation[]
  generateLogos: () => Promise<void>
  cancelGeneration: () => void
  regenerateVariation: (id: string) => Promise<void>

  // Navigation
  goToStep: (step: string) => void
  goBack: () => void
  reset: () => void

  // Selected result
  selectedVariation: LogoVariation | null
  selectVariation: (id: string) => void
}
```

### localStorage Persistence

**Keys:**
- `logo_projects`: Array of LogoProject objects
- `current_logo_project`: Active project ID
- Max 20 projects stored

---

## UI/UX Enhancements

### Mode Toggle

Add a mode switcher at the top of the app:

```
┌──────────────────────────────────┐
│  ○ Image Generator  ● Logo Maker │
└──────────────────────────────────┘
```

When in "Logo Maker" mode:
- Show different UI flow
- Hide unnecessary image editing options
- Focus on logo-specific features

### Progress Indicator

```
Brand Input → Concepts → Preview → Generate → Results
    ●            ○          ○          ○         ○
```

### Mobile Considerations

- Stack cards vertically on mobile
- Simplify concept cards to show only essential info
- Use accordion/expansion for logo grid sections
- Ensure touch targets are 44px minimum

---

## Error Handling

### GPT-5 API Errors
```
┌──────────────────────────────────────┐
│ ⚠️ Couldn't generate concepts        │
│                                      │
│ {error message}                      │
│                                      │
│         [Try Again] [Go Back]        │
└──────────────────────────────────────┘
```

### Partial Generation Failures
- If 1-2 logos fail, show errors for those cards
- Allow user to regenerate failed ones
- Don't block viewing successful generations

### Validation Errors
- Inline validation for brand input fields
- Red border + error message below field
- Disable "Generate Concepts" until valid

---

## Prompt Engineering (Placeholder)

### Logo Mark Prompt Template
```
Create a professional logo mark featuring {visualObject}.
Style: {visualStyle}
Colors: {primaryColor} and {secondaryColor}
Requirements:
- Simple, iconic symbol
- No text or letters
- Scalable vector style
- Clean, professional
- Centered on white background
- High contrast
```

### Lettermark Prompt Template
```
Create a lettermark logo using the initials "{initials}".
Style: {visualStyle}
Colors: {primaryColor} and {secondaryColor}
Requirements:
- Abstract letter treatment
- Artistic typography
- No full words
- Unique letter combination
- Centered on white background
```

### Wordmark Prompt Template
```
Create a combined lettermark and wordmark logo for "{companyName}".
Style: {visualStyle}
Colors: {primaryColor} and {secondaryColor}
Requirements:
- Integrated letter and word design
- Custom typography
- Full company name visible
- Professional and memorable
- Centered on white background
```

**Note:** The actual implementation in `lib/logo-prompt-generator.ts` provides the working prompt templates above. These templates are examples - the real prompts are generated by the modular functions.

---

## API Keys & Configuration

### Environment Variables

Add to `.env.local`:
```bash
# Existing
AI_GATEWAY_API_KEY=xxx

# New - for GPT-5 concept generation
OPENAI_API_KEY=xxx
OPENAI_MODEL=gpt-5  # or whatever the model name is
```

### API Rate Limiting Considerations

- Concept generation: 1 call per brand input
- Logo generation: 9 concurrent calls
- Implement retry logic with exponential backoff
- Show rate limit errors gracefully
- Consider queuing if rate limited

---

## Testing Checklist

### User Flow Testing
- [ ] Complete brand input validation
- [ ] GPT-5 concept generation (3 distinct concepts)
- [ ] Concept selection and UI updates
- [ ] Prompt editing and preview
- [ ] Logo generation (all 9 variations)
- [ ] Logo grid display and interaction
- [ ] Download individual/batch
- [ ] Error states for each step
- [ ] Back navigation at each step
- [ ] Mobile responsive layout

### Edge Cases
- [ ] Very long company names (50 chars)
- [ ] Special characters in company name
- [ ] API timeout handling
- [ ] Partial generation failures
- [ ] Network interruption during generation
- [ ] localStorage quota exceeded
- [ ] Concurrent generation requests

---

## Future Enhancements (Out of Scope)

- Export logos in multiple formats (SVG, PNG, PDF)
- Color palette customization after concept selection
- A/B testing with multiple concepts simultaneously
- Logo usage guidelines generation
- Brand kit export with all variations
- Collaboration features for team review
- Version history and iterations
- AI-powered logo refinement based on feedback

---

## Implementation Order

### Phase 1: Brand Input & UI Shell
1. Create mode toggle (Image Generator ↔ Logo Maker)
2. Build `BrandInputSection` component
3. Add validation and character counts
4. Implement step navigation UI

### Phase 2: Concept Generation
1. Create `/api/generate-concepts` route
2. Integrate OpenAI GPT-5 SDK
3. Build `ConceptSelector` component
4. Add concept selection state management
5. Implement loading states

### Phase 3: Prompt Preview
1. ✅ Create prompt transformation logic - **COMPLETE** (`lib/logo-prompt-generator.ts`)
2. Update `InputSection` for logo mode
3. Add editable prompt preview
4. Implement back navigation

### Phase 4: Logo Generation
1. Update `/api/generate-image` for batch mode
2. Create `LogoGrid` component
3. Implement parallel generation logic
4. Add `LogoGenerationProgress` component
5. Handle partial failures

### Phase 5: Results & Download
1. Add fullscreen view for logos
2. Implement individual downloads
3. Add batch ZIP download
4. Create project persistence
5. Add regeneration options

### Phase 6: Polish
1. Mobile responsive adjustments
2. Keyboard shortcuts
3. Animations and transitions
4. Error message refinement
5. Accessibility improvements (ARIA labels, focus management)

---

## Open Questions

1. Should users be able to refine/iterate on a single variation?
2. Do we allow mixing concepts (e.g., colors from concept 1, style from concept 2)?
3. Should there be a "surprise me" option that auto-selects a concept?
4. How do we handle NSFW/inappropriate brand names or descriptions?
5. Pricing model: Free tier with limits? Pay per generation?
6. Should we show examples/inspiration during concept selection?
7. Do we need admin moderation for generated concepts?

---

## Success Metrics

- Time to first logo: < 2 minutes from brand input to 9 variations
- Concept selection rate: % of users who select vs. regenerate concepts
- Variation preference: Which type (logo/letter/wordmark) gets selected most
- Download rate: % of users who download at least one logo
- Completion rate: % who complete full flow vs. abandon
- Error rate: < 5% generation failures
- User satisfaction: Measured via optional feedback after download
