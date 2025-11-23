import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createGateway } from "@ai-sdk/gateway"
import type {
  BatchGenerateRequest,
  BatchGenerateResponse,
  LogoGenerationRequest,
  LogoGenerationResult,
} from "@/types/logo-api"

export const dynamic = "force-dynamic"

const MAX_PROMPT_LENGTH = 5000
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

interface GenerateImageResponse {
  url: string
  prompt: string
  description?: string
}

interface ErrorResponse {
  error: string
  message?: string
  details?: string
}

// Gemini aspect ratio mapping
const GEMINI_ASPECT_RATIO_MAP: Record<string, string> = {
  portrait: "9:16",
  landscape: "16:9",
  wide: "21:9",
  "4:3": "4:3",
  "3:4": "3:4",
  "3:2": "3:2",
  "2:3": "2:3",
  "5:4": "5:4",
  "4:5": "4:5",
  square: "1:1",
  "16:9": "16:9",
  "1:1": "1:1",
}

/**
 * Handle batch logo generation
 */
async function handleBatchGeneration(
  body: BatchGenerateRequest,
  apiKey: string,
): Promise<NextResponse<BatchGenerateResponse | ErrorResponse>> {
  const { requests } = body

  if (!requests || !Array.isArray(requests) || requests.length === 0) {
    return NextResponse.json<ErrorResponse>(
      { error: "Batch requests array is required and must not be empty" },
      { status: 400 },
    )
  }

  if (requests.length > 20) {
    return NextResponse.json<ErrorResponse>(
      { error: "Maximum 20 batch requests allowed" },
      { status: 400 },
    )
  }

  const gateway = createGateway({
    apiKey: apiKey,
  })

  const model = gateway("google/gemini-3-pro-image")

  // Process all requests in parallel
  const results = await Promise.allSettled(
    requests.map(async (req: LogoGenerationRequest): Promise<LogoGenerationResult> => {
      try {
        const imageUrl = await generateSingleImage(model, req.prompt, req.aspectRatio, req.previousImageUrl)

        return {
          id: req.id,
          type: req.type,
          url: imageUrl,
          prompt: req.prompt,
          status: "success",
        }
      } catch (error) {
        return {
          id: req.id,
          type: req.type,
          url: "",
          prompt: req.prompt,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    }),
  )

  // Map settled promises to results
  const logoResults: LogoGenerationResult[] = results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value
    } else {
      return {
        id: requests[index].id,
        type: requests[index].type,
        url: "",
        prompt: requests[index].prompt,
        status: "error",
        error: result.reason instanceof Error ? result.reason.message : "Generation failed",
      }
    }
  })

  return NextResponse.json<BatchGenerateResponse>({
    results: logoResults,
  })
}

/**
 * Helper function to generate a single image using Gemini
 */
async function generateSingleImage(
  model: any,
  prompt: string,
  aspectRatio: string,
  previousImageUrl?: string,
): Promise<string> {
  const geminiAspectRatio = GEMINI_ASPECT_RATIO_MAP[aspectRatio] || "1:1"

  // If there's a previous image (for sequential generation), include it
  if (previousImageUrl) {
    const messageParts: Array<{ type: "text" | "image"; text?: string; image?: string }> = []

    messageParts.push({ type: "image", image: previousImageUrl })
    messageParts.push({ type: "text", text: prompt })

    const result = await generateText({
      model,
      messages: [
        {
          role: "user",
          // @ts-ignore - Type issue with content parts
          content: messageParts,
        },
      ],
      providerOptions: {
        google: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: geminiAspectRatio,
          },
        },
      },
    })

    const imageFiles = result.files?.filter((f) => f.mediaType?.startsWith("image/")) || []
    if (imageFiles.length === 0) {
      throw new Error("No image generated from model")
    }

    const firstImage = imageFiles[0]
    return `data:${firstImage.mediaType};base64,${firstImage.base64}`
  } else {
    // No previous image, generate from prompt only
    const result = await generateText({
      model,
      prompt,
      providerOptions: {
        google: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: geminiAspectRatio,
          },
        },
      },
    })

    const imageFiles = result.files?.filter((f) => f.mediaType?.startsWith("image/")) || []
    if (imageFiles.length === 0) {
      throw new Error("No image generated from model")
    }

    const firstImage = imageFiles[0]
    return `data:${firstImage.mediaType};base64,${firstImage.base64}`
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.AI_GATEWAY_API_KEY

    if (!apiKey) {
      return NextResponse.json<ErrorResponse>(
        {
          error: "Configuration error",
          details: "No AI Gateway API key configured. Please add AI_GATEWAY_API_KEY to environment variables.",
        },
        { status: 500 },
      )
    }

    // Check if this is a JSON request (batch mode) or FormData (legacy mode)
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      // Handle JSON request for batch mode
      const body = await request.json()

      if (body.mode === "logo-batch") {
        return handleBatchGeneration(body as BatchGenerateRequest, apiKey)
      }

      return NextResponse.json<ErrorResponse>(
        { error: "Invalid mode for JSON request" },
        { status: 400 },
      )
    }

    // Handle legacy FormData request
    const formData = await request.formData()
    const mode = formData.get("mode") as string
    const prompt = formData.get("prompt") as string
    const aspectRatio = formData.get("aspectRatio") as string

    if (!mode) {
      return NextResponse.json<ErrorResponse>({ error: "Mode is required" }, { status: 400 })
    }

    if (!prompt?.trim()) {
      return NextResponse.json<ErrorResponse>({ error: "Prompt is required" }, { status: 400 })
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json<ErrorResponse>(
        { error: `Prompt too long. Maximum ${MAX_PROMPT_LENGTH} characters allowed.` },
        { status: 400 },
      )
    }

    const geminiAspectRatio = GEMINI_ASPECT_RATIO_MAP[aspectRatio] || "1:1"

    const gateway = createGateway({
      apiKey: apiKey,
    })

    const model = gateway("google/gemini-3-pro-image")

    if (mode === "text-to-image") {
      const imageGenerationPrompt = `Generate a high-quality image based on this description: ${prompt}. The image should be visually appealing and match the description as closely as possible.`

      const result = await generateText({
        model,
        prompt: imageGenerationPrompt,
        providerOptions: {
          google: {
            responseModalities: ["IMAGE"],
            imageConfig: {
              aspectRatio: geminiAspectRatio,
            },
          },
        },
      })

      const imageFiles = result.files?.filter((f) => f.mediaType?.startsWith("image/")) || []

      if (imageFiles.length === 0) {
        return NextResponse.json<ErrorResponse>(
          { error: "No image generated", details: "The model did not return any images" },
          { status: 500 },
        )
      }

      const firstImage = imageFiles[0]
      const imageUrl = `data:${firstImage.mediaType};base64,${firstImage.base64}`

      return NextResponse.json<GenerateImageResponse>({
        url: imageUrl,
        prompt: prompt,
        description: result.text || "",
      })
    } else if (mode === "image-editing") {
      const image1 = formData.get("image1") as File
      const image2 = formData.get("image2") as File
      const image1Url = formData.get("image1Url") as string
      const image2Url = formData.get("image2Url") as string

      const hasImage1 = image1 || image1Url
      const hasImage2 = image2 || image2Url

      if (!hasImage1) {
        return NextResponse.json<ErrorResponse>(
          { error: "At least one image is required for editing mode" },
          { status: 400 },
        )
      }

      if (image1) {
        if (image1.size > MAX_FILE_SIZE) {
          return NextResponse.json<ErrorResponse>(
            { error: `Image 1 too large. Maximum ${MAX_FILE_SIZE / 1024 / 1024}MB allowed.` },
            { status: 400 },
          )
        }
        if (!ALLOWED_IMAGE_TYPES.includes(image1.type)) {
          return NextResponse.json<ErrorResponse>(
            { error: "Image 1 has invalid format. Allowed: JPEG, PNG, WebP, GIF" },
            { status: 400 },
          )
        }
      }

      if (image2) {
        if (image2.size > MAX_FILE_SIZE) {
          return NextResponse.json<ErrorResponse>(
            { error: `Image 2 too large. Maximum ${MAX_FILE_SIZE / 1024 / 1024}MB allowed.` },
            { status: 400 },
          )
        }
        if (!ALLOWED_IMAGE_TYPES.includes(image2.type)) {
          return NextResponse.json<ErrorResponse>(
            { error: "Image 2 has invalid format. Allowed: JPEG, PNG, WebP, GIF" },
            { status: 400 },
          )
        }
      }

      const convertToDataUrl = async (source: File | string): Promise<string> => {
        if (typeof source === "string") {
          const response = await fetch(source)
          const arrayBuffer = await response.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const base64 = buffer.toString("base64")
          const contentType = response.headers.get("content-type") || "image/jpeg"
          return `data:${contentType};base64,${base64}`
        } else {
          const arrayBuffer = await source.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const base64 = buffer.toString("base64")
          return `data:${source.type};base64,${base64}`
        }
      }

      const image1DataUrl = await convertToDataUrl(hasImage1 ? image1 || image1Url : "")
      const image2DataUrl = hasImage2 ? await convertToDataUrl(image2 || image2Url) : null

      const messageParts: Array<{ type: "text" | "image"; text?: string; image?: string }> = []

      messageParts.push({ type: "image", image: image1DataUrl })
      if (image2DataUrl) {
        messageParts.push({ type: "image", image: image2DataUrl })
      }

      const editingPrompt = hasImage2
        ? `${prompt}. Combine these two images creatively while following the instructions.`
        : `${prompt}. Edit or transform this image based on the instructions.`

      messageParts.push({ type: "text", text: editingPrompt })

      const result = await generateText({
        model,
        messages: [
          {
            role: "user",
            // @ts-ignore - Type issue with content parts
            content: messageParts,
          },
        ],
        providerOptions: {
          google: {
            responseModalities: ["IMAGE"],
            imageConfig: {
              aspectRatio: geminiAspectRatio,
            },
          },
        },
      })

      const imageFiles = result.files?.filter((f) => f.mediaType?.startsWith("image/")) || []

      if (imageFiles.length === 0) {
        return NextResponse.json<ErrorResponse>(
          { error: "No image generated", details: "The model did not return any images" },
          { status: 500 },
        )
      }

      const firstImage = imageFiles[0]
      const imageUrl = `data:${firstImage.mediaType};base64,${firstImage.base64}`

      return NextResponse.json<GenerateImageResponse>({
        url: imageUrl,
        prompt: editingPrompt,
        description: result.text || "",
      })
    } else {
      return NextResponse.json<ErrorResponse>(
        { error: "Invalid mode", details: "Mode must be 'text-to-image' or 'image-editing'" },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Error in generate-image route:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json<ErrorResponse>(
      {
        error: "Failed to generate image",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
