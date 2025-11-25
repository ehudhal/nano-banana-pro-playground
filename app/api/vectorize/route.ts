import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface VectorizeRequest {
  imageBase64: string // Base64 encoded PNG image
  backgroundColor: "white" | "black" // The background color to remove
}

interface VectorizeResponse {
  svg: string // SVG content with transparent background
}

interface ErrorResponse {
  error: string
  details?: string
}

/**
 * Call vectorizer.ai API to convert PNG to SVG
 */
async function vectorizeImage(imageBase64: string): Promise<string> {
  const apiId = process.env.VECTORIZER_API_ID
  const apiSecret = process.env.VECTORIZER_API_SECRET

  if (!apiId || !apiSecret) {
    throw new Error("Vectorizer API credentials not configured")
  }

  // Remove data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "")

  const formData = new FormData()
  formData.append("image.base64", base64Data)
  formData.append("output.file_format", "svg")
  formData.append("processing.max_colors", "0") // Unlimited colors

  const response = await fetch("https://api.vectorizer.ai/api/v1/vectorize", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${apiId}:${apiSecret}`).toString("base64"),
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Vectorizer API error: ${response.status} - ${errorText}`)
  }

  return await response.text() // Returns SVG content directly
}

/**
 * Detect the background color by finding the first path element that forms a full-canvas rectangle.
 * The background is typically the first filled path that covers all 4 corners of the viewBox.
 */
function detectBackgroundColor(svgContent: string): string | null {
  // Extract viewBox dimensions
  const viewBoxMatch = svgContent.match(/viewBox=["']([^"']*)["']/)
  if (!viewBoxMatch) return null

  const parts = viewBoxMatch[1].split(/\s+/).map(Number)
  const viewBoxWidth = parts[2] || 0
  const viewBoxHeight = parts[3] || 0

  if (!viewBoxWidth || !viewBoxHeight) return null

  // Look for a path with fill that starts at a corner and covers the full canvas
  // Common patterns:
  // 1. "M 1024.00 0.00 L 1024.00 1024.00 L 0.00 1024.00 L 0.00 0.00" (clockwise from top-right)
  // 2. "M 0 0 L width 0 L width height L 0 height" (clockwise from top-left)

  // Pattern 1: Starting from top-right corner (width, 0)
  const pattern1 = new RegExp(
    `<path\\s+fill=["']([^"']+)["']\\s+d=["']\\s*M\\s+${viewBoxWidth}(\\.\\d+)?\\s+0(\\.\\d+)?`,
    'i'
  )

  // Pattern 2: Starting from top-left corner (0, 0)
  const pattern2 = new RegExp(
    `<path\\s+fill=["']([^"']+)["']\\s+d=["']\\s*M\\s+0(\\.\\d+)?\\s+0(\\.\\d+)?\\s+L\\s+${viewBoxWidth}`,
    'i'
  )

  let match = svgContent.match(pattern1)
  if (match && match[1]) {
    console.log(`[DEBUG] Detected background color (pattern 1): ${match[1]}`)
    return match[1]
  }

  match = svgContent.match(pattern2)
  if (match && match[1]) {
    console.log(`[DEBUG] Detected background color (pattern 2): ${match[1]}`)
    return match[1]
  }

  // Pattern 3: Look for a rect covering full canvas
  const rectPattern = new RegExp(
    `<rect[^>]*fill=["']([^"']+)["'][^>]*width=["']${viewBoxWidth}(\\.\\d+)?["'][^>]*height=["']${viewBoxHeight}(\\.\\d+)?["']`,
    'i'
  )
  match = svgContent.match(rectPattern)
  if (match && match[1]) {
    console.log(`[DEBUG] Detected background color (rect): ${match[1]}`)
    return match[1]
  }

  return null
}

/**
 * Remove background from SVG by detecting the background color and removing all elements with that color.
 * The background color is detected by finding the first large shape that covers the full canvas.
 */
function removeBackgroundFromSvg(
  svgContent: string,
  _backgroundColor: "white" | "black" // kept for API compatibility but we auto-detect now
): string {
  // Auto-detect the actual background color from the SVG
  const detectedColor = detectBackgroundColor(svgContent)

  if (!detectedColor) {
    console.log('[DEBUG] Could not detect background color, returning original SVG')
    return svgContent
  }

  console.log(`[DEBUG] Will remove all elements with fill: ${detectedColor}`)

  let processedSvg = svgContent

  // Escape the color for use in regex (handle # and other special chars)
  const escapedColor = detectedColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Strategy 1: Remove path elements with the detected background color
  // This handles the main background rectangle
  const pathPattern = new RegExp(
    `<path\\s+fill=["']${escapedColor}["'][^>]*(?:/>|>[^<]*</path>)`,
    'gi'
  )
  processedSvg = processedSvg.replace(pathPattern, (match) => {
    console.log(`[DEBUG] Removing path with background color`)
    return '<!-- background removed -->'
  })

  // Strategy 2: Replace fill="color" with fill="none" for remaining elements
  // This catches any other shapes using the same background color
  const fillPattern = new RegExp(`fill=["']${escapedColor}["']`, 'gi')
  processedSvg = processedSvg.replace(fillPattern, 'fill="none"')

  // Strategy 3: Remove rect elements with the background color
  const rectPattern = new RegExp(
    `<rect[^>]*fill=["']${escapedColor}["'][^>]*(?:/>|>)`,
    'gi'
  )
  processedSvg = processedSvg.replace(rectPattern, '<!-- background rect removed -->')

  // Strategy 4: Remove border strokes that trace the canvas edge
  // These are paths with stroke that start near 0,0 and trace around the viewBox
  // Example: <path stroke="#424c56" ... fill="none" d=" M 0.89 0.89 L 0.89 1023.11 L 1023.11 1023.11 L 1023.11 0.89 L 0.89 0.89"/>
  const viewBoxMatch2 = processedSvg.match(/viewBox=["']([^"']*)["']/)
  if (viewBoxMatch2) {
    const parts = viewBoxMatch2[1].split(/\s+/).map(Number)
    const vbWidth = parts[2] || 0
    const vbHeight = parts[3] || 0

    if (vbWidth && vbHeight) {
      // Match any path element with a stroke attribute (attributes can be in any order)
      const pathWithStrokePattern = /<path\s+[^>]*stroke=["'][^"']+["'][^>]*>/gi

      processedSvg = processedSvg.replace(pathWithStrokePattern, (match) => {
        // Extract the d attribute value
        const dMatch = match.match(/d=["']([^"']*)["']/)
        if (!dMatch) return match

        const pathData = dMatch[1]

        // Check if this path traces the border (rectangular path near canvas edges)
        // Look for a path that:
        // 1. Starts near a corner (M followed by small values or values near width/height)
        // 2. Contains coordinates near all 4 edges

        // Extract all coordinate pairs from the path
        const coords = pathData.match(/[\d.]+/g)?.map(Number) || []
        if (coords.length < 8) return match // Need at least 4 points (8 values)

        // Check if coordinates span the full canvas (within 5px tolerance)
        const tolerance = 5
        const hasNearZeroX = coords.some((v, i) => i % 2 === 0 && v < tolerance)
        const hasNearZeroY = coords.some((v, i) => i % 2 === 1 && v < tolerance)
        const hasNearWidthX = coords.some((v, i) => i % 2 === 0 && v > vbWidth - tolerance)
        const hasNearHeightY = coords.some((v, i) => i % 2 === 1 && v > vbHeight - tolerance)

        // If this path touches all 4 edges, it's a border
        if (hasNearZeroX && hasNearZeroY && hasNearWidthX && hasNearHeightY) {
          console.log('[DEBUG] Removing border stroke path that traces canvas edges')
          return '<!-- border stroke removed -->'
        }
        return match
      })
    }
  }

  return processedSvg
}

export async function POST(request: NextRequest) {
  try {
    const totalStart = performance.now()

    const body = (await request.json()) as VectorizeRequest
    const { imageBase64, backgroundColor } = body

    if (!imageBase64) {
      return NextResponse.json<ErrorResponse>({ error: "imageBase64 is required" }, { status: 400 })
    }

    if (!backgroundColor || !["white", "black"].includes(backgroundColor)) {
      return NextResponse.json<ErrorResponse>(
        { error: "backgroundColor must be 'white' or 'black'" },
        { status: 400 }
      )
    }

    // Step 1: Vectorize the PNG to SVG
    const vectorizeStart = performance.now()
    const rawSvg = await vectorizeImage(imageBase64)
    const vectorizeTime = performance.now() - vectorizeStart
    console.log(`[TIMING] Vectorizer.ai API: ${(vectorizeTime / 1000).toFixed(2)}s`)

    // Debug: Log first 500 chars of SVG to understand structure
    console.log(`[DEBUG] Raw SVG preview (first 500 chars):\n${rawSvg.substring(0, 500)}`)

    // Step 2: Remove background programmatically
    const bgRemovalStart = performance.now()
    const transparentSvg = removeBackgroundFromSvg(rawSvg, backgroundColor)
    const bgRemovalTime = performance.now() - bgRemovalStart
    console.log(`[TIMING] Background removal: ${bgRemovalTime.toFixed(2)}ms`)

    // Debug: Check if anything changed
    const changed = rawSvg !== transparentSvg
    console.log(`[DEBUG] SVG modified: ${changed}`)

    const totalTime = performance.now() - totalStart
    console.log(`[TIMING] Total vectorize: ${(totalTime / 1000).toFixed(2)}s`)

    return NextResponse.json<VectorizeResponse>({
      svg: transparentSvg,
    })
  } catch (error) {
    console.error("Error in vectorize route:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json<ErrorResponse>(
      {
        error: "Failed to vectorize image",
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
