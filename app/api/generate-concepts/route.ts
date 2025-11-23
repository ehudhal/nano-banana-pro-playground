import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createGateway } from "@ai-sdk/gateway"
import type {
  GenerateConceptsRequest,
  GenerateConceptsResponse,
  GenerateConceptsErrorResponse,
  LogoConcept,
} from "@/types/logo-api"

export const dynamic = "force-dynamic"

const SYSTEM_PROMPT = `You are a brand identity expert. Generate 3 distinct visual concepts for a logo.

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

Return ONLY valid JSON with this exact structure:
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
}`

export async function POST(request: NextRequest) {
  try {
    // Check for AI Gateway API key
    const apiKey = process.env.AI_GATEWAY_API_KEY

    if (!apiKey) {
      return NextResponse.json<GenerateConceptsErrorResponse>(
        {
          error: "Configuration error",
          details: "No AI Gateway API key configured. Please add AI_GATEWAY_API_KEY to environment variables.",
        },
        { status: 500 },
      )
    }

    // Parse request body
    const body = (await request.json()) as GenerateConceptsRequest

    const { companyName, description } = body

    // Validation
    if (!companyName?.trim()) {
      return NextResponse.json<GenerateConceptsErrorResponse>(
        { error: "Company name is required" },
        { status: 400 },
      )
    }

    if (!description?.trim()) {
      return NextResponse.json<GenerateConceptsErrorResponse>(
        { error: "Company description is required" },
        { status: 400 },
      )
    }

    if (companyName.length > 50) {
      return NextResponse.json<GenerateConceptsErrorResponse>(
        { error: "Company name must be 50 characters or less" },
        { status: 400 },
      )
    }

    if (description.length > 200) {
      return NextResponse.json<GenerateConceptsErrorResponse>(
        { error: "Description must be 200 characters or less" },
        { status: 400 },
      )
    }

    // Create Gateway client
    const gateway = createGateway({
      apiKey: apiKey,
    })

    // Generate concepts using GPT
    const userPrompt = `Company: ${companyName}
Description: ${description}

Generate 3 distinct visual concepts for this brand's logo.`

    const result = await generateText({
      model: gateway("openai/gpt-4o"), // Use GPT-4o via gateway
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.8, // Higher temperature for more creative concepts
    })

    // Parse the JSON response
    let parsedResponse: { concepts: LogoConcept[] }
    try {
      // Extract JSON from response (handle potential markdown code blocks)
      const text = result.text.trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)

      if (!jsonMatch) {
        throw new Error("No JSON found in response")
      }

      parsedResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error("Failed to parse GPT response:", result.text)
      return NextResponse.json<GenerateConceptsErrorResponse>(
        {
          error: "Failed to parse concept generation response",
          details: parseError instanceof Error ? parseError.message : "Invalid JSON format",
        },
        { status: 500 },
      )
    }

    // Validate the response structure
    if (!parsedResponse.concepts || !Array.isArray(parsedResponse.concepts)) {
      return NextResponse.json<GenerateConceptsErrorResponse>(
        {
          error: "Invalid response structure",
          details: "Expected an array of concepts",
        },
        { status: 500 },
      )
    }

    if (parsedResponse.concepts.length !== 3) {
      console.warn(`Expected 3 concepts, got ${parsedResponse.concepts.length}`)
    }

    // Ensure all concepts have required fields
    const validatedConcepts = parsedResponse.concepts.slice(0, 3).map((concept, index) => ({
      id: concept.id || `concept-${index + 1}`,
      visualObject: concept.visualObject || "",
      visualStyle: concept.visualStyle || "",
      brandColors: {
        primary: {
          name: concept.brandColors?.primary?.name || "Primary",
          hex: concept.brandColors?.primary?.hex || "#000000",
        },
        secondary: concept.brandColors?.secondary
          ? {
            name: concept.brandColors.secondary.name,
            hex: concept.brandColors.secondary.hex,
          }
          : undefined,
      },
      rationale: concept.rationale,
    }))

    return NextResponse.json<GenerateConceptsResponse>({
      concepts: validatedConcepts,
    })
  } catch (error) {
    console.error("Error in generate-concepts route:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json<GenerateConceptsErrorResponse>(
      {
        error: "Failed to generate concepts",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
