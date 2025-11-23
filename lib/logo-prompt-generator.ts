/**
 * Logo Prompt Generator
 *
 * Modular system for generating logo prompts based on archetypes.
 * Each archetype has configurable options that can be easily extended.
 */

import type { LogoConcept, LogoArchetype } from "@/types/logo-api"

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

// ============================================================================
// TYPES
// ============================================================================

export interface LogomarkPromptOptions {
  companyName: string
  visualObject: string
  visualStyle: string
  primaryColor: string
  secondaryColor?: string
}

export interface WordmarkPromptOptions {
  companyName: string
  adjective?: WordmarkAdjective | string // Allow custom adjectives too
  additionalStyles?: string[]            // From concept (e.g., ["bold", "organic"])
  strokeColor?: string                   // Default: "black"
  colorTreatment: ColorTreatment
}

export interface LettermarkPromptOptions {
  companyName: string
  enclosingShape?: LettermarkShape | null // null = no enclosure
  additionalStyles?: string[]
  primaryColor?: string
  secondaryColor?: string
  colorTreatment?: ColorTreatment
}

export interface GenerateLogoPromptsParams {
  companyName: string
  concept: LogoConcept
  archetype: LogoArchetype
  colorTreatment?: ColorTreatment
  mode?: LiteralMarkMode  // For literal marks
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
    colorTreatment
  } = options

  // Determine color and background based on treatment
  let actualStrokeColor: string
  let background: string

  switch (colorTreatment) {
    case "black":
      actualStrokeColor = "Black"
      background = "Fully white background"
      break
    case "brand-colors":
      actualStrokeColor = strokeColor
      background = "Fully white background"
      break
    case "dark-bg":
      actualStrokeColor = "White"
      background = "Dark background"
      break
  }

  const parts = [
    `Wordmark for "${companyName}".`,
    `${actualStrokeColor.charAt(0).toUpperCase() + actualStrokeColor.slice(1)} stroke.`,
    "Single-line.",
    "Fully flat.",
    `${adjective}.`,
  ]

  // Add additional styles
  if (additionalStyles.length > 0) {
    parts.push(`${additionalStyles.join(", ")}.`)
  }

  parts.push(background + ".")
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
  const {
    companyName,
    additionalStyles = [],
    primaryColor,
    secondaryColor
  } = options
  const letters = extractLetters(companyName)

  const parts = [
    `lettermark "${letters}".`,
  ]

  if (additionalStyles.length > 0) {
    parts.push(`${additionalStyles.join(", ")}.`)
  }

  if (primaryColor) {
    parts.push(`Primary color: ${primaryColor}.`)
  }

  if (secondaryColor) {
    parts.push(`Secondary color: ${secondaryColor}.`)
  }

  parts.push("No extra text.")
  parts.push("White background.")

  return parts.join(" ")
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
 * Generate derived lettermark prompt (based on wordmark)
 */
export function generateDerivedLettermarkPrompt(options: LettermarkPromptOptions): string {
  const { companyName, colorTreatment = "black" } = options
  const letters = extractLetters(companyName)

  let colorInstruction: string
  let background: string

  switch (colorTreatment) {
    case "black":
      colorInstruction = "Use black color"
      background = "white background"
      break
    case "brand-colors":
      colorInstruction = "Maintain the exact same font, weight, and color"
      background = "white background"
      break
    case "dark-bg":
      colorInstruction = "Use white color"
      background = "dark background"
      break
  }

  return `Create a 1:1 lettermark for "${letters}" derived from the style of the provided wordmark. ${colorInstruction}. Isolate the initials on a ${background}.`
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate logo prompt based on archetype and concept
 *
 * This is the main entry point for logo prompt generation
 */
export type LiteralMarkMode = "straight-forward" | "conceptual" | "continuous-line"
export type ColorTreatment = "black" | "brand-colors" | "dark-bg"

export interface LiteralMarkPromptOptions {
  companyName: string
  mode: LiteralMarkMode
  visualObject?: string
  visualStyle?: string
  primaryColor: string
  secondaryColor?: string
  colorTreatment: ColorTreatment
}

// ... (keep existing interfaces)

/**
 * Generate literal mark prompt based on mode
 */
export function generateLiteralMarkPrompt(options: LiteralMarkPromptOptions): string {
  const {
    companyName,
    mode,
    visualObject,
    visualStyle,
    primaryColor,
    secondaryColor,
    colorTreatment
  } = options

  // Determine color based on treatment
  let colors: string
  let background: string

  switch (colorTreatment) {
    case "black":
      colors = "Black"
      background = "White background"
      break
    case "brand-colors":
      // AI-generated color styles with contrast requirements
      colors = "Generate a color style (gradient or flat colors). Ensure sufficient contrast on white background"
      background = "White background"
      break
    case "dark-bg":
      // For dark backgrounds, reference the colored light version and ensure contrast
      colors = "Ensure sufficient contrast on dark background"
      background = "Dark background"
      break
  }

  const letters = extractLetters(companyName)

  switch (mode) {
    case "straight-forward":
      return `Logo mark. Minimalist. Fully flat. ${background}. No text. ${colors}. ${visualStyle || "bold"}. ${visualObject || "Abstract geometric shape"}.`

    case "conceptual":
      return `Logo mark for ${companyName}. Contemporary minimalism with conceptual depth. ${colors}. ${visualStyle || "bold"}. ${background}. No extra text.`

    case "continuous-line":
      return `Minimal continuous-line logo mark. Monoline. Use uniform stroke width with fully rounded corners, and visually merge simple concepts ${visualObject || "abstract shapes"}, "${letters}". ${colors}. The result should feel friendly, simple, and easy to recognize at small sizes. ${background}. Fully flat.`

    default:
      return `Logo mark for ${companyName}. ${colors}.`
  }
}

// ... (keep existing functions)

/**
 * Generate logo prompt based on archetype and concept
 *
 * This is the main entry point for logo prompt generation
 */
export function generateLogoPrompt(params: GenerateLogoPromptsParams): string {
  const { companyName, concept, archetype, colorTreatment = "black", mode = "straight-forward" } = params

  // Parse concept styles
  const additionalStyles = parseConceptStyles(concept.visualStyle)
  const primaryColor = `${concept.brandColors.primary.name} ${concept.brandColors.primary.hex}`
  const secondaryColor = concept.brandColors.secondary
    ? `${concept.brandColors.secondary.name} ${concept.brandColors.secondary.hex}`
    : undefined

  switch (archetype) {
    case "wordmark": {
      const adjective = selectWordmarkAdjective(concept.visualStyle)
      return generateWordmarkPrompt({
        companyName,
        adjective,
        additionalStyles,
        strokeColor: concept.brandColors.primary.name,
        colorTreatment
      })
    }

    case "literal": {
      return generateLiteralMarkPrompt({
        companyName,
        mode,
        visualObject: concept.visualObject,
        visualStyle: concept.visualStyle,
        primaryColor,
        secondaryColor,
        colorTreatment
      })
    }

    case "lettermark-derived": {
      return generateDerivedLettermarkPrompt({
        companyName,
        additionalStyles,
        primaryColor,
        secondaryColor,
        colorTreatment
      })
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
      colorTreatment: "black"
    }),
    requiresPreviousImage: false,
    aspectRatio: "16:9",
    description: "Generate base wordmark",
  })

  // Step 2: Generate lettermark from wordmark
  steps.push({
    step: 2,
    archetype: "lettermark-derived",
    prompt: generateDerivedLettermarkPrompt({ companyName }),
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
  literal: {
    input: {
      companyName: "Design Rails",
      mode: "conceptual" as LiteralMarkMode,
      primaryColor: "Black",
    },
    expectedOutput: 'Logo mark for Design Rails. Contemporary minimalism with conceptual depth. Colors: Black. bold. Full white background. No extra text.',
  },
  literalSingleWord: {
    input: {
      companyName: "Acme",
      mode: "straight-forward" as LiteralMarkMode,
      primaryColor: "Black",
    },
    expectedOutput: 'Logo mark. Minimalist. Fully flat. Fully white background. No text. Colors: Black. Abstract geometric shape.',
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
