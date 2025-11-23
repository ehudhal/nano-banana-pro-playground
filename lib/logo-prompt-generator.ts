/**
 * Logo Prompt Generator
 *
 * Modular system for generating logo prompts based on archetypes.
 * Each archetype has configurable options that can be easily extended.
 */

import type { LogoConcept } from "@/components/image-combiner/types"

// ============================================================================
// CONFIGURATION - Add new options here
// ============================================================================

/**
 * Wordmark style adjectives
 * Add new styles to this array to extend wordmark options
 */
export const WORDMARK_ADJECTIVES = [
  "Ligature-heavy",
  "Handwritten elegance",
  "Script/Calligraphic",
  "Decorative",
  "Stencil - Military/industrial cutout",
] as const

export type WordmarkAdjective = typeof WORDMARK_ADJECTIVES[number]

/**
 * Lettermark enclosing shapes
 * Add new shapes to this array to extend lettermark enclosure options
 */
export const LETTERMARK_SHAPES = [
  "circle",
  "square",
] as const

export type LettermarkShape = typeof LETTERMARK_SHAPES[number]

/**
 * Logo archetype types
 */
export type LogoArchetype = "wordmark" | "lettermark" | "lettermark-enclosed"

// ============================================================================
// TYPES
// ============================================================================

export interface WordmarkPromptOptions {
  companyName: string
  adjective?: WordmarkAdjective | string // Allow custom adjectives too
  additionalStyles?: string[]            // From concept (e.g., ["bold", "organic"])
  strokeColor?: string                   // Default: "black"
}

export interface LettermarkPromptOptions {
  companyName: string
  enclosingShape?: LettermarkShape | null // null = no enclosure
  additionalStyles?: string[]
}

export interface GenerateLogoPromptsParams {
  companyName: string
  concept: LogoConcept
  archetype: LogoArchetype
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract first letter(s) from company name
 * - Single word: first letter (e.g., "Acme" → "A")
 * - Two words: first letter of each (e.g., "Design Rails" → "DR")
 */
export function extractLetters(companyName: string): string {
  const words = companyName.trim().split(/\s+/)

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase()
  }

  if (words.length >= 2) {
    return words[0].charAt(0).toUpperCase() + words[1].charAt(0).toUpperCase()
  }

  return words[0].charAt(0).toUpperCase()
}

/**
 * Select the most appropriate wordmark adjective based on concept style
 */
export function selectWordmarkAdjective(conceptStyle: string): WordmarkAdjective {
  const style = conceptStyle.toLowerCase()

  // Style matching logic
  if (style.includes("script") || style.includes("calligraph") || style.includes("flowing")) {
    return "Script/Calligraphic"
  }
  if (style.includes("handwritten") || style.includes("elegant") || style.includes("organic")) {
    return "Handwritten elegance"
  }
  if (style.includes("decorative") || style.includes("ornate")) {
    return "Decorative"
  }
  if (style.includes("industrial") || style.includes("military") || style.includes("stencil")) {
    return "Stencil - Military/industrial cutout"
  }
  if (style.includes("connect") || style.includes("ligature") || style.includes("modern")) {
    return "Ligature-heavy"
  }

  // Default to ligature-heavy for modern/minimal styles
  return "Ligature-heavy"
}

/**
 * Parse concept visual style into array of style keywords
 */
export function parseConceptStyles(visualStyle: string): string[] {
  return visualStyle
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0)
}

// ============================================================================
// PROMPT GENERATORS
// ============================================================================

/**
 * Generate wordmark prompt
 *
 * Format:
 * Wordmark for "[Company Name]". [color] stroke. Single-line. Fully flat.
 * [adjective]. [additional styles]. Fully white background. No extra text.
 */
export function generateWordmarkPrompt(options: WordmarkPromptOptions): string {
  const {
    companyName,
    adjective = "Ligature-heavy",
    additionalStyles = [],
    strokeColor = "black",
  } = options

  const parts = [
    `Wordmark for "${companyName}".`,
    `${strokeColor.charAt(0).toUpperCase() + strokeColor.slice(1)} stroke.`,
    "Single-line.",
    "Fully flat.",
    `${adjective}.`,
  ]

  // Add additional styles
  if (additionalStyles.length > 0) {
    parts.push(`${additionalStyles.join(", ")}.`)
  }

  parts.push("Fully white background.")
  parts.push("No extra text.")

  return parts.join(" ")
}

/**
 * Generate plain lettermark prompt (no enclosure)
 *
 * Format:
 * lettermark "[letters]". No extra text. White background.
 *
 * Note: This requires the wordmark image as input to the LLM
 */
export function generateLettermarkPrompt(options: LettermarkPromptOptions): string {
  const { companyName } = options
  const letters = extractLetters(companyName)

  return `lettermark "${letters}". No extra text. White background.`
}

/**
 * Generate enclosed lettermark prompt
 *
 * Format:
 * Enclosed in a [shape]
 *
 * Note: This requires the lettermark image as input to the LLM
 */
export function generateEnclosedLettermarkPrompt(shape: LettermarkShape): string {
  return `Enclosed in a ${shape}`
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate logo prompt based on archetype and concept
 *
 * This is the main entry point for logo prompt generation
 */
export function generateLogoPrompt(params: GenerateLogoPromptsParams): string {
  const { companyName, concept, archetype } = params

  // Parse concept styles
  const additionalStyles = parseConceptStyles(concept.visualStyle)

  switch (archetype) {
    case "wordmark": {
      const adjective = selectWordmarkAdjective(concept.visualStyle)
      return generateWordmarkPrompt({
        companyName,
        adjective,
        additionalStyles,
        strokeColor: "black", // Could be derived from concept.brandColors
      })
    }

    case "lettermark": {
      return generateLettermarkPrompt({
        companyName,
        additionalStyles,
      })
    }

    case "lettermark-enclosed": {
      // For now, default to circle
      // In the UI, this would be user-selectable
      return generateEnclosedLettermarkPrompt("circle")
    }

    default:
      throw new Error(`Unknown archetype: ${archetype}`)
  }
}

// ============================================================================
// GENERATION SEQUENCE HELPERS
// ============================================================================

/**
 * Get the complete generation sequence for a lettermark with enclosure
 *
 * Returns array of steps, where each step requires the previous image as input
 */
export interface GenerationStep {
  step: number
  archetype: LogoArchetype
  prompt: string
  requiresPreviousImage: boolean
  aspectRatio: string
  description: string
}

export function getLettermarkSequence(
  companyName: string,
  concept: LogoConcept,
  enclosingShape?: LettermarkShape | null
): GenerationStep[] {
  const steps: GenerationStep[] = []

  // Step 1: Generate wordmark (used as input for lettermark)
  const wordmarkAdjective = selectWordmarkAdjective(concept.visualStyle)
  const additionalStyles = parseConceptStyles(concept.visualStyle)

  steps.push({
    step: 1,
    archetype: "wordmark",
    prompt: generateWordmarkPrompt({
      companyName,
      adjective: wordmarkAdjective,
      additionalStyles,
    }),
    requiresPreviousImage: false,
    aspectRatio: "16:9",
    description: "Generate base wordmark",
  })

  // Step 2: Generate lettermark from wordmark
  steps.push({
    step: 2,
    archetype: "lettermark",
    prompt: generateLettermarkPrompt({ companyName }),
    requiresPreviousImage: true,
    aspectRatio: "1:1",
    description: "Extract lettermark from wordmark",
  })

  // Step 3: Optionally enclose in shape
  if (enclosingShape) {
    steps.push({
      step: 3,
      archetype: "lettermark-enclosed",
      prompt: generateEnclosedLettermarkPrompt(enclosingShape),
      requiresPreviousImage: true,
      aspectRatio: "1:1",
      description: `Enclose lettermark in ${enclosingShape}`,
    })
  }

  return steps
}

// ============================================================================
// EXAMPLES & TESTING
// ============================================================================

/**
 * Example usage and expected outputs
 */
export const EXAMPLES = {
  wordmark: {
    input: {
      companyName: "Design Rails",
      adjective: "Handwritten elegance" as WordmarkAdjective,
      additionalStyles: ["dynamic"],
      strokeColor: "black",
    },
    expectedOutput:
      'Wordmark for "Design Rails". Black stroke. Single-line. Fully flat. Handwritten elegance. dynamic. Fully white background. No extra text.',
  },
  lettermark: {
    input: {
      companyName: "Design Rails",
    },
    expectedOutput: 'lettermark "DR". No extra text. White background.',
  },
  lettermarkSingleWord: {
    input: {
      companyName: "Acme",
    },
    expectedOutput: 'lettermark "A". No extra text. White background.',
  },
  enclosedCircle: {
    input: "circle" as LettermarkShape,
    expectedOutput: "Enclosed in a circle",
  },
  enclosedSquare: {
    input: "square" as LettermarkShape,
    expectedOutput: "Enclosed in a square",
  },
}
