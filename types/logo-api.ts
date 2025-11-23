/**
 * TypeScript types for Logo Creator API routes
 */

// ============================================================================
// Concept Generation Types
// ============================================================================

export interface BrandInput {
  companyName: string
  description: string
}

export interface LogoConcept {
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

export interface GenerateConceptsRequest {
  companyName: string
  description: string
}

export interface GenerateConceptsResponse {
  concepts: LogoConcept[]
}

export interface GenerateConceptsErrorResponse {
  error: string
  message?: string
  details?: string
}

// ============================================================================
// Logo Generation Types (Batch Mode)
// ============================================================================

export type LogoArchetype = "literal" | "wordmark" | "lettermark-enclosed" | "lettermark-derived"

export interface LogoGenerationRequest {
  id: string
  type: LogoArchetype
  prompt: string
  aspectRatio: string
  previousImageUrl?: string // For sequential generation (lettermark from wordmark)
}

export interface BatchGenerateRequest {
  mode: "logo-batch"
  requests: LogoGenerationRequest[]
}

export interface LogoGenerationResult {
  id: string
  type: LogoArchetype
  url: string
  prompt: string
  status: "success" | "error"
  colorTreatment?: "black" | "brand-colors" | "dark-bg"
  error?: string
}

export interface BatchGenerateResponse {
  results: LogoGenerationResult[]
}

// ============================================================================
// Sequential Generation Types
// ============================================================================

export interface SequentialGenerationStep {
  step: number
  archetype: LogoArchetype
  prompt: string
  requiresPreviousImage: boolean
  aspectRatio: string
  previousImageUrl?: string
}

export interface SequentialGenerationRequest {
  mode: "logo-sequential"
  steps: SequentialGenerationStep[]
}

export interface SequentialGenerationResponse {
  results: Array<{
    step: number
    archetype: LogoArchetype
    url: string
    prompt: string
    status: "success" | "error"
    error?: string
  }>
}
