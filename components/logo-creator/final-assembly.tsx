import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { LogoGenerationResult } from "@/types/logo-api"
import { Button } from "@/components/ui/button"
import { Check, Download, Loader2, FileDown, FlaskConical } from "lucide-react"

/**
 * Get the bounding box of SVG content by rendering it offscreen
 */
function getSvgBBox(svgContent: string): Promise<{ x: number; y: number; width: number; height: number } | null> {
    return new Promise((resolve) => {
        const container = document.createElement('div')
        container.style.position = 'absolute'
        container.style.visibility = 'hidden'
        container.style.pointerEvents = 'none'
        container.innerHTML = svgContent
        document.body.appendChild(container)

        requestAnimationFrame(() => {
            try {
                const svgElement = container.querySelector('svg')
                if (svgElement) {
                    const bbox = svgElement.getBBox()
                    resolve({ x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height })
                } else {
                    resolve(null)
                }
            } catch (e) {
                console.error('[DEBUG] getBBox failed:', e)
                resolve(null)
            } finally {
                document.body.removeChild(container)
            }
        })
    })
}

/**
 * Modify SVG to crop viewBox to actual content bounding box
 */
function cropSvgToContent(svgContent: string, bbox: { x: number; y: number; width: number; height: number }): string {
    // Add a small padding around the content
    const padding = Math.min(bbox.width, bbox.height) * 0.05
    const newViewBox = `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`

    // Replace or add viewBox attribute
    if (svgContent.includes('viewBox=')) {
        return svgContent.replace(/viewBox=["'][^"']*["']/, `viewBox="${newViewBox}"`)
    } else {
        return svgContent.replace('<svg', `<svg viewBox="${newViewBox}"`)
    }
}

interface VectorizedLogos {
    // Key is the base ID of the literal mark
    [baseId: string]: {
        brandSvg?: string // SVG for light theme (brand colors on transparent)
        darkSvg?: string // SVG for dark theme (dark-bg variant on transparent)
        wordmarkSvg?: string // SVG for wordmark
        // Cropped versions with viewBox adjusted to content
        brandSvgCropped?: string
        darkSvgCropped?: string
        wordmarkSvgCropped?: string
        // Bounding boxes for aspect ratio calculations
        brandBBox?: { x: number; y: number; width: number; height: number }
        darkBBox?: { x: number; y: number; width: number; height: number }
        wordmarkBBox?: { x: number; y: number; width: number; height: number }
        isVectorizing: boolean
        error?: string
    }
}

interface FinalAssemblyProps {
    variations: LogoGenerationResult[]
    selectedLiteralMarkId: string | null
    selectedWordmarkId: string | null
    onSelectLiteralMark: (id: string) => void
    onSelectWordmark: (id: string) => void
    onReset: () => void
    onSaveTestData?: () => void
}

const VECTORIZED_STORAGE_KEY = 'nb_vectorized_logos'

// Load vectorized logos from localStorage
function loadVectorizedLogos(): VectorizedLogos {
    if (typeof window === 'undefined') return {}
    try {
        const saved = localStorage.getItem(VECTORIZED_STORAGE_KEY)
        if (saved) {
            const parsed = JSON.parse(saved)
            console.log('[DEBUG] Loaded vectorized logos from localStorage:', Object.keys(parsed))
            return parsed
        }
    } catch (e) {
        console.error('[DEBUG] Failed to load vectorized logos:', e)
    }
    return {}
}

// Save vectorized logos to localStorage
function saveVectorizedLogos(logos: VectorizedLogos) {
    if (typeof window === 'undefined') return
    try {
        // Only save completed vectorizations (not in-progress or errors)
        const toSave: VectorizedLogos = {}
        for (const [key, value] of Object.entries(logos)) {
            if (!value.isVectorizing && !value.error && (value.brandSvg || value.darkSvg || value.wordmarkSvg)) {
                toSave[key] = {
                    brandSvg: value.brandSvg,
                    darkSvg: value.darkSvg,
                    wordmarkSvg: value.wordmarkSvg,
                    brandSvgCropped: value.brandSvgCropped,
                    darkSvgCropped: value.darkSvgCropped,
                    wordmarkSvgCropped: value.wordmarkSvgCropped,
                    brandBBox: value.brandBBox,
                    darkBBox: value.darkBBox,
                    wordmarkBBox: value.wordmarkBBox,
                    isVectorizing: false
                }
            }
        }
        localStorage.setItem(VECTORIZED_STORAGE_KEY, JSON.stringify(toSave))
        console.log('[DEBUG] Saved vectorized logos to localStorage:', Object.keys(toSave))
    } catch (e) {
        console.error('[DEBUG] Failed to save vectorized logos:', e)
    }
}

// Fixed frame dimensions (the dashed placeholder sizes)
// These are base sizes that get scaled up to fill the preview container
const FRAME = {
    // Mark frame: square
    markSize: 80, // 80x80 pixels base
    // Wordmark frame: wider rectangle
    wordmarkWidth: 160,
    wordmarkHeight: 48,
    // Gap between mark and wordmark
    gap: 16,
}

// Scale factor to make the logo lockup fill more of the preview card
// The preview card is aspect-video (16:9), so we want the lockup to use ~60-70% of the width
const PREVIEW_SCALE = 2.0

export function FinalAssembly({
    variations,
    selectedLiteralMarkId,
    selectedWordmarkId,
    onSelectLiteralMark,
    onSelectWordmark,
    onReset,
    onSaveTestData
}: FinalAssemblyProps) {
    // Track vectorized SVGs for selected logos - initialize from localStorage
    const [vectorizedLogos, setVectorizedLogos] = useState<VectorizedLogos>(() => loadVectorizedLogos())

    // Save vectorized logos to localStorage whenever they change
    useEffect(() => {
        saveVectorizedLogos(vectorizedLogos)
    }, [vectorizedLogos])

    // Filter variations by type - only show black versions for selection (base previews)
    const literalMarks = variations.filter(v =>
        v.type === 'literal' &&
        v.url &&
        v.colorTreatment === 'black'
    )
    const wordmarks = variations.filter(v => v.type === 'wordmark' && v.url)

    // Debug: log all variation IDs to understand structure
    console.log('[DEBUG] All variation IDs:', variations.map(v => ({ id: v.id, type: v.type, colorTreatment: v.colorTreatment, hasUrl: !!v.url })))
    console.log('[DEBUG] Black literal marks for selection:', literalMarks.map(v => v.id))

    // Get selected images
    const selectedLiteralMark = variations.find(v => v.id === selectedLiteralMarkId)
    const selectedWordmark = variations.find(v => v.id === selectedWordmarkId)

    // Vectorize a single image
    const vectorizeImage = useCallback(async (
        imageUrl: string,
        backgroundColor: "white" | "black"
    ): Promise<string> => {
        const response = await fetch('/api/vectorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageBase64: imageUrl,
                backgroundColor
            })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.details || error.error || 'Vectorization failed')
        }

        const data = await response.json()
        return data.svg
    }, [])

    // Vectorize when a literal mark is selected
    useEffect(() => {
        if (!selectedLiteralMarkId) return

        // Get base ID for the selected mark
        const baseId = selectedLiteralMarkId.replace(/-brand$/, '').replace(/-dark$/, '')

        console.log('[DEBUG] Selected literal mark:', selectedLiteralMarkId)
        console.log('[DEBUG] Base ID:', baseId)
        console.log('[DEBUG] Vectorized logos keys:', Object.keys(vectorizedLogos))

        // Check if already vectorized or vectorizing
        if (vectorizedLogos[baseId]?.brandSvg || vectorizedLogos[baseId]?.isVectorizing) {
            console.log('[DEBUG] Already vectorized or vectorizing, skipping')
            return
        }

        // Find the brand and dark variants
        const brandVariant = variations.find(v => v.id === `${baseId}-brand`)
        const darkVariant = variations.find(v => v.id === `${baseId}-dark`)

        console.log('[DEBUG] Looking for brand variant with ID:', `${baseId}-brand`)
        console.log('[DEBUG] Looking for dark variant with ID:', `${baseId}-dark`)
        console.log('[DEBUG] Brand variant found:', brandVariant?.id, 'has URL:', !!brandVariant?.url)
        console.log('[DEBUG] Dark variant found:', darkVariant?.id, 'has URL:', !!darkVariant?.url)

        // Log all available variation IDs that match this base
        const relatedVariations = variations.filter(v => v.id.startsWith(baseId))
        console.log('[DEBUG] Related variations:', relatedVariations.map(v => ({ id: v.id, colorTreatment: v.colorTreatment, hasUrl: !!v.url })))

        if (!brandVariant?.url && !darkVariant?.url) {
            // No color variants available, skip vectorization
            return
        }

        // Start vectorization
        setVectorizedLogos(prev => ({
            ...prev,
            [baseId]: { isVectorizing: true }
        }))

        const vectorize = async () => {
            try {
                const results: {
                    brandSvg?: string
                    darkSvg?: string
                    brandSvgCropped?: string
                    darkSvgCropped?: string
                    brandBBox?: { x: number; y: number; width: number; height: number }
                    darkBBox?: { x: number; y: number; width: number; height: number }
                } = {}

                // Vectorize brand variant (white background -> transparent)
                if (brandVariant?.url) {
                    console.log('[DEBUG] Vectorizing brand variant:', brandVariant.id)
                    results.brandSvg = await vectorizeImage(brandVariant.url, "white")
                    // Get bounding box and create cropped version
                    const bbox = await getSvgBBox(results.brandSvg)
                    if (bbox) {
                        results.brandBBox = bbox
                        results.brandSvgCropped = cropSvgToContent(results.brandSvg, bbox)
                        console.log('[DEBUG] Brand SVG cropped, bbox:', bbox)
                    }
                }

                // Vectorize dark variant (black background -> transparent)
                if (darkVariant?.url) {
                    console.log('[DEBUG] Vectorizing dark variant:', darkVariant.id)
                    results.darkSvg = await vectorizeImage(darkVariant.url, "black")
                    // Get bounding box and create cropped version
                    const bbox = await getSvgBBox(results.darkSvg)
                    if (bbox) {
                        results.darkBBox = bbox
                        results.darkSvgCropped = cropSvgToContent(results.darkSvg, bbox)
                        console.log('[DEBUG] Dark SVG cropped, bbox:', bbox)
                    }
                } else {
                    console.log('[DEBUG] No dark variant found!')
                }

                console.log('[DEBUG] Vectorization complete. Results:', {
                    hasBrandSvg: !!results.brandSvg,
                    hasDarkSvg: !!results.darkSvg,
                    brandSvgLength: results.brandSvg?.length,
                    darkSvgLength: results.darkSvg?.length
                })

                setVectorizedLogos(prev => ({
                    ...prev,
                    [baseId]: {
                        ...results,
                        isVectorizing: false
                    }
                }))
            } catch (error) {
                console.error('Vectorization error:', error)
                setVectorizedLogos(prev => ({
                    ...prev,
                    [baseId]: {
                        isVectorizing: false,
                        error: error instanceof Error ? error.message : 'Vectorization failed'
                    }
                }))
            }
        }

        vectorize()
    }, [selectedLiteralMarkId, variations, vectorizedLogos, vectorizeImage])

    // Vectorize wordmark when selected
    useEffect(() => {
        if (!selectedWordmarkId) return

        // Check if already vectorized or vectorizing
        if (vectorizedLogos[selectedWordmarkId]?.wordmarkSvg || vectorizedLogos[selectedWordmarkId]?.isVectorizing) {
            return
        }

        const wordmark = variations.find(v => v.id === selectedWordmarkId)
        if (!wordmark?.url) return

        // Start vectorization
        setVectorizedLogos(prev => ({
            ...prev,
            [selectedWordmarkId]: { isVectorizing: true }
        }))

        const vectorize = async () => {
            try {
                // Wordmarks are black on white background
                const wordmarkSvg = await vectorizeImage(wordmark.url, "white")

                // Get bounding box and create cropped version
                const bbox = await getSvgBBox(wordmarkSvg)
                let wordmarkSvgCropped: string | undefined
                let wordmarkBBox: { x: number; y: number; width: number; height: number } | undefined

                if (bbox) {
                    wordmarkBBox = bbox
                    wordmarkSvgCropped = cropSvgToContent(wordmarkSvg, bbox)
                    console.log('[DEBUG] Wordmark SVG cropped, bbox:', bbox)
                }

                setVectorizedLogos(prev => ({
                    ...prev,
                    [selectedWordmarkId]: {
                        wordmarkSvg,
                        wordmarkSvgCropped,
                        wordmarkBBox,
                        isVectorizing: false
                    }
                }))
            } catch (error) {
                console.error('Wordmark vectorization error:', error)
                setVectorizedLogos(prev => ({
                    ...prev,
                    [selectedWordmarkId]: {
                        isVectorizing: false,
                        error: error instanceof Error ? error.message : 'Vectorization failed'
                    }
                }))
            }
        }

        vectorize()
    }, [selectedWordmarkId, variations, vectorizedLogos, vectorizeImage])

    // Get vectorization status for selected literal mark
    const getSelectedLiteralVectorStatus = () => {
        if (!selectedLiteralMarkId) return null
        const baseId = selectedLiteralMarkId.replace(/-brand$/, '').replace(/-dark$/, '')
        return vectorizedLogos[baseId]
    }

    // Get vectorization status for selected wordmark
    const getSelectedWordmarkVectorStatus = () => {
        if (!selectedWordmarkId) return null
        return vectorizedLogos[selectedWordmarkId]
    }

    const literalVectorStatus = getSelectedLiteralVectorStatus()
    const wordmarkVectorStatus = getSelectedWordmarkVectorStatus()

    // Check if both are vectorized and ready for export
    const isReadyForExport =
        selectedLiteralMarkId &&
        selectedWordmarkId &&
        literalVectorStatus?.brandSvg &&
        wordmarkVectorStatus?.wordmarkSvg

    const isVectorizing = literalVectorStatus?.isVectorizing || wordmarkVectorStatus?.isVectorizing

    // Reference to container for measuring actual pixel dimensions
    const containerRef = useRef<HTMLDivElement>(null)

    // Calculate layout based on wordmark selection
    // The wordmark drives the scaling - if it's too wide, we scale everything down
    const layout = useMemo(() => {
        // Use the stored bounding boxes from vectorization
        const wordmarkBBox = wordmarkVectorStatus?.wordmarkBBox
        const markBBox = literalVectorStatus?.brandBBox || literalVectorStatus?.darkBBox

        // Apply preview scale to base dimensions
        const baseMarkSize = FRAME.markSize * PREVIEW_SCALE
        const baseWordmarkWidth = FRAME.wordmarkWidth * PREVIEW_SCALE
        const baseWordmarkHeight = FRAME.wordmarkHeight * PREVIEW_SCALE
        const baseGap = FRAME.gap * PREVIEW_SCALE

        // Default frame dimensions (when nothing is selected or no SVG yet)
        const defaultLayout = {
            scaleFactor: PREVIEW_SCALE,
            markSize: baseMarkSize,
            markWidth: baseMarkSize,
            markHeight: baseMarkSize,
            wordmarkWidth: baseWordmarkWidth,
            wordmarkHeight: baseWordmarkHeight,
            gap: baseGap,
        }

        if (!wordmarkBBox) {
            return defaultLayout
        }

        // Calculate wordmark aspect ratio from actual content
        const wordmarkAspectRatio = wordmarkBBox.width / wordmarkBBox.height

        // The wordmark height should fill the frame height
        // Calculate what width that would produce
        const targetWordmarkHeight = baseWordmarkHeight
        const naturalWordmarkWidth = targetWordmarkHeight * wordmarkAspectRatio

        // If the wordmark would exceed the frame width, we need to scale down
        let scaleFactor = PREVIEW_SCALE
        if (naturalWordmarkWidth > baseWordmarkWidth) {
            scaleFactor = PREVIEW_SCALE * (baseWordmarkWidth / naturalWordmarkWidth)
        }

        // Apply scale factor to all dimensions
        const scaledWordmarkHeight = FRAME.wordmarkHeight * scaleFactor
        const scaledWordmarkWidth = scaledWordmarkHeight * wordmarkAspectRatio

        // Calculate mark dimensions - preserve aspect ratio if we have bbox
        let scaledMarkWidth = FRAME.markSize * scaleFactor
        let scaledMarkHeight = FRAME.markSize * scaleFactor
        if (markBBox) {
            const markAspectRatio = markBBox.width / markBBox.height
            // Fit within the scaled mark frame while preserving aspect ratio
            if (markAspectRatio > 1) {
                // Wider than tall
                scaledMarkHeight = scaledMarkWidth / markAspectRatio
            } else {
                // Taller than wide
                scaledMarkWidth = scaledMarkHeight * markAspectRatio
            }
        }
        const scaledGap = FRAME.gap * scaleFactor

        console.log('[DEBUG layout]', {
            wordmarkAspectRatio,
            targetWordmarkHeight,
            naturalWordmarkWidth,
            scaleFactor,
            scaledWordmarkHeight,
            scaledWordmarkWidth,
            scaledMarkWidth,
            scaledMarkHeight,
            scaledGap,
        })

        return {
            scaleFactor,
            markSize: FRAME.markSize * scaleFactor, // For fallback/placeholder
            markWidth: scaledMarkWidth,
            markHeight: scaledMarkHeight,
            wordmarkWidth: scaledWordmarkWidth,
            wordmarkHeight: scaledWordmarkHeight,
            gap: scaledGap,
        }
    }, [wordmarkVectorStatus?.wordmarkBBox, literalVectorStatus?.brandBBox, literalVectorStatus?.darkBBox])

    // Download SVG file
    const downloadSvg = useCallback((svgContent: string, filename: string) => {
        const blob = new Blob([svgContent], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }, [])

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Assemble Your Logo</h2>
                <p className="text-muted-foreground">
                    Select a wordmark first, then choose a symbol to complete your logo.
                </p>
            </div>

            {/* Preview Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Light Theme Preview */}
                <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <h3 className="font-medium text-sm text-muted-foreground">Light Theme</h3>
                        {literalVectorStatus?.isVectorizing && (
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                        )}
                    </div>
                    <div
                        ref={containerRef}
                        className="aspect-video bg-white rounded-lg border shadow-sm flex items-center justify-center p-4 overflow-hidden relative"
                        style={{ gap: `${layout.gap}px` }}
                    >
                        {/* Mark frame/content */}
                        {selectedLiteralMark && literalVectorStatus?.brandSvgCropped ? (
                            <div
                                className="[&>svg]:h-full [&>svg]:w-full flex-shrink-0"
                                style={{
                                    width: layout.markWidth,
                                    height: layout.markHeight
                                }}
                                dangerouslySetInnerHTML={{ __html: literalVectorStatus.brandSvgCropped }}
                            />
                        ) : selectedLiteralMark && literalVectorStatus?.isVectorizing ? (
                            <div
                                className="flex items-center justify-center flex-shrink-0"
                                style={{ width: layout.markSize, height: layout.markSize }}
                            >
                                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                            </div>
                        ) : selectedLiteralMark ? (
                            // Fallback to raster image
                            (() => {
                                const baseId = selectedLiteralMark.id.replace(/-brand$/, '').replace(/-dark$/, '')
                                const brandVariant = variations.find(v => v.id === `${baseId}-brand`)
                                const displayUrl = brandVariant?.url || selectedLiteralMark.url
                                return (
                                    <img
                                        src={displayUrl}
                                        alt="Selected Symbol"
                                        className="object-contain flex-shrink-0"
                                        style={{ width: layout.markSize, height: layout.markSize }}
                                    />
                                )
                            })()
                        ) : (
                            // Dashed placeholder for mark
                            <div
                                className="rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs text-center p-2 flex-shrink-0"
                                style={{ width: layout.markSize, height: layout.markSize }}
                            >
                                Symbol
                            </div>
                        )}

                        {/* Wordmark frame/content */}
                        {selectedWordmark && wordmarkVectorStatus?.wordmarkSvgCropped ? (
                            <div
                                className="[&>svg]:h-full [&>svg]:w-full flex-shrink-0"
                                style={{
                                    width: layout.wordmarkWidth,
                                    height: layout.wordmarkHeight
                                }}
                                dangerouslySetInnerHTML={{ __html: wordmarkVectorStatus.wordmarkSvgCropped }}
                            />
                        ) : selectedWordmark && wordmarkVectorStatus?.isVectorizing ? (
                            <div
                                className="flex items-center justify-center flex-shrink-0"
                                style={{ width: layout.wordmarkWidth, height: layout.wordmarkHeight }}
                            >
                                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                            </div>
                        ) : selectedWordmark ? (
                            // Fallback to raster
                            <img
                                src={selectedWordmark.url}
                                alt="Selected Wordmark"
                                className="object-contain flex-shrink-0"
                                style={{ width: layout.wordmarkWidth, height: layout.wordmarkHeight }}
                            />
                        ) : (
                            // Dashed placeholder for wordmark
                            <div
                                className="rounded border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs flex-shrink-0"
                                style={{ width: layout.wordmarkWidth, height: layout.wordmarkHeight }}
                            >
                                Wordmark
                            </div>
                        )}

                        {/* Download buttons for light theme */}
                        {(literalVectorStatus?.brandSvg || wordmarkVectorStatus?.wordmarkSvg) && (
                            <div className="absolute bottom-2 right-2 flex gap-1">
                                {literalVectorStatus?.brandSvg && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="h-7 text-xs"
                                        onClick={() => downloadSvg(literalVectorStatus.brandSvg!, 'logo-mark-light.svg')}
                                    >
                                        <FileDown className="w-3 h-3 mr-1" /> Mark
                                    </Button>
                                )}
                                {wordmarkVectorStatus?.wordmarkSvg && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="h-7 text-xs"
                                        onClick={() => downloadSvg(wordmarkVectorStatus.wordmarkSvg!, 'wordmark.svg')}
                                    >
                                        <FileDown className="w-3 h-3 mr-1" /> Wordmark
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Dark Theme Preview */}
                <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <h3 className="font-medium text-sm text-muted-foreground">Dark Theme</h3>
                        {literalVectorStatus?.isVectorizing && (
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                        )}
                    </div>
                    <div
                        className="aspect-video bg-slate-950 rounded-lg border shadow-sm flex items-center justify-center p-4 overflow-hidden relative"
                        style={{ gap: `${layout.gap}px` }}
                    >
                        {/* Mark frame/content */}
                        {selectedLiteralMark && literalVectorStatus?.darkSvgCropped ? (
                            <div
                                className="[&>svg]:h-full [&>svg]:w-full flex-shrink-0"
                                style={{
                                    width: layout.markWidth,
                                    height: layout.markHeight
                                }}
                                dangerouslySetInnerHTML={{ __html: literalVectorStatus.darkSvgCropped }}
                            />
                        ) : selectedLiteralMark && literalVectorStatus?.isVectorizing ? (
                            <div
                                className="flex items-center justify-center flex-shrink-0"
                                style={{ width: layout.markSize, height: layout.markSize }}
                            >
                                <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                            </div>
                        ) : selectedLiteralMark ? (
                            // Fallback to raster
                            (() => {
                                const baseId = selectedLiteralMark.id.replace(/-brand$/, '').replace(/-dark$/, '')
                                const darkVariant = variations.find(v => v.id === `${baseId}-dark`)
                                const displayUrl = darkVariant?.url || selectedLiteralMark.url
                                return (
                                    <img
                                        src={displayUrl}
                                        alt="Selected Symbol"
                                        className="object-contain flex-shrink-0"
                                        style={{ width: layout.markSize, height: layout.markSize }}
                                    />
                                )
                            })()
                        ) : (
                            // Dashed placeholder
                            <div
                                className="rounded-lg border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-700 text-xs text-center p-2 flex-shrink-0"
                                style={{ width: layout.markSize, height: layout.markSize }}
                            >
                                Symbol
                            </div>
                        )}

                        {/* Wordmark frame/content */}
                        {selectedWordmark && wordmarkVectorStatus?.wordmarkSvgCropped ? (
                            <div
                                className="[&>svg]:h-full [&>svg]:w-full invert flex-shrink-0"
                                style={{
                                    width: layout.wordmarkWidth,
                                    height: layout.wordmarkHeight
                                }}
                                dangerouslySetInnerHTML={{ __html: wordmarkVectorStatus.wordmarkSvgCropped }}
                            />
                        ) : selectedWordmark && wordmarkVectorStatus?.isVectorizing ? (
                            <div
                                className="flex items-center justify-center flex-shrink-0"
                                style={{ width: layout.wordmarkWidth, height: layout.wordmarkHeight }}
                            >
                                <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
                            </div>
                        ) : selectedWordmark ? (
                            // Fallback to raster
                            <img
                                src={selectedWordmark.url}
                                alt="Selected Wordmark"
                                className="object-contain invert filter flex-shrink-0"
                                style={{ width: layout.wordmarkWidth, height: layout.wordmarkHeight }}
                            />
                        ) : (
                            // Dashed placeholder
                            <div
                                className="rounded border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-700 text-xs flex-shrink-0"
                                style={{ width: layout.wordmarkWidth, height: layout.wordmarkHeight }}
                            >
                                Wordmark
                            </div>
                        )}

                        {/* Download buttons for dark theme */}
                        {literalVectorStatus?.darkSvg && (
                            <div className="absolute bottom-2 right-2 flex gap-1">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 text-xs"
                                    onClick={() => downloadSvg(literalVectorStatus.darkSvg!, 'logo-mark-dark.svg')}
                                >
                                    <FileDown className="w-3 h-3 mr-1" /> Mark (Dark)
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Vectorization Status */}
            {(literalVectorStatus?.error || wordmarkVectorStatus?.error) && (
                <div className="text-center text-sm text-red-500">
                    {literalVectorStatus?.error || wordmarkVectorStatus?.error}
                </div>
            )}

            {/* Selection Section - Wordmark first */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t">
                {/* Wordmarks Selection - First */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">1. Choose a Wordmark</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {wordmarks.map((mark) => (
                            <div
                                key={mark.id}
                                className={`relative aspect-video rounded-md overflow-hidden border cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${selectedWordmarkId === mark.id ? 'ring-2 ring-primary border-primary' : 'border-border'
                                    }`}
                                onClick={() => onSelectWordmark(mark.id)}
                            >
                                <img
                                    src={mark.url}
                                    alt="Wordmark Option"
                                    className="w-full h-full object-cover"
                                />
                                {selectedWordmarkId === mark.id && (
                                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                                        <Check className="w-3 h-3" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Literal Marks Selection - Second */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">2. Choose a Symbol</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {literalMarks.map((mark) => (
                            <div
                                key={mark.id}
                                className={`relative aspect-square rounded-md overflow-hidden border cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${selectedLiteralMarkId === mark.id ? 'ring-2 ring-primary border-primary' : 'border-border'
                                    }`}
                                onClick={() => onSelectLiteralMark(mark.id)}
                            >
                                <img
                                    src={mark.url}
                                    alt="Literal Mark Option"
                                    className="w-full h-full object-cover"
                                />
                                {selectedLiteralMarkId === mark.id && (
                                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                                        <Check className="w-3 h-3" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-center pt-8 gap-4 flex-wrap">
                <Button variant="outline" onClick={onReset}>
                    Start Over
                </Button>
                {onSaveTestData && (
                    <Button variant="outline" onClick={onSaveTestData}>
                        <FlaskConical className="mr-2 h-4 w-4" /> Save Test Data
                    </Button>
                )}
                <Button disabled={!isReadyForExport || isVectorizing}>
                    {isVectorizing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Vectorizing...
                        </>
                    ) : (
                        <>
                            <Download className="mr-2 h-4 w-4" /> Export Final Logo
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
