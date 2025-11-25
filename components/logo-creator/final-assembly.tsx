import { useState, useEffect, useCallback } from "react"
import { LogoGenerationResult } from "@/types/logo-api"
import { Button } from "@/components/ui/button"
import { Check, Download, Loader2, FileDown, FlaskConical } from "lucide-react"

interface VectorizedLogos {
    // Key is the base ID of the literal mark
    [baseId: string]: {
        brandSvg?: string // SVG for light theme (brand colors on transparent)
        darkSvg?: string // SVG for dark theme (dark-bg variant on transparent)
        wordmarkSvg?: string // SVG for wordmark
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

export function FinalAssembly({
    variations,
    selectedLiteralMarkId,
    selectedWordmarkId,
    onSelectLiteralMark,
    onSelectWordmark,
    onReset,
    onSaveTestData
}: FinalAssemblyProps) {
    // Track vectorized SVGs for selected logos
    const [vectorizedLogos, setVectorizedLogos] = useState<VectorizedLogos>({})

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
                const results: { brandSvg?: string; darkSvg?: string } = {}

                // Vectorize brand variant (white background -> transparent)
                if (brandVariant?.url) {
                    console.log('[DEBUG] Vectorizing brand variant:', brandVariant.id)
                    results.brandSvg = await vectorizeImage(brandVariant.url, "white")
                }

                // Vectorize dark variant (black background -> transparent)
                if (darkVariant?.url) {
                    console.log('[DEBUG] Vectorizing dark variant:', darkVariant.id)
                    results.darkSvg = await vectorizeImage(darkVariant.url, "black")
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

                setVectorizedLogos(prev => ({
                    ...prev,
                    [selectedWordmarkId]: {
                        wordmarkSvg,
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

    // Render SVG content inline
    const renderSvg = (svgContent: string, className: string) => {
        return (
            <div
                className={className}
                dangerouslySetInnerHTML={{ __html: svgContent }}
            />
        )
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Assemble Your Logo</h2>
                <p className="text-muted-foreground">
                    Select a symbol and a wordmark to see them combined as SVG.
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
                    <div className="aspect-video bg-white rounded-lg border shadow-sm flex items-center justify-center p-8 gap-4 overflow-hidden relative">
                        {selectedLiteralMark ? (
                            literalVectorStatus?.brandSvg ? (
                                renderSvg(literalVectorStatus.brandSvg, "h-2/3 w-auto [&>svg]:h-full [&>svg]:w-auto")
                            ) : literalVectorStatus?.isVectorizing ? (
                                <div className="h-24 w-24 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
                                </div>
                            ) : (() => {
                                // Fallback to raster image while not vectorized
                                const baseId = selectedLiteralMark.id.replace(/-brand$/, '').replace(/-dark$/, '')
                                const brandVariant = variations.find(v => v.id === `${baseId}-brand`)
                                const displayUrl = brandVariant?.url || selectedLiteralMark.url
                                return (
                                    <img
                                        src={displayUrl}
                                        alt="Selected Symbol"
                                        className="h-2/3 w-auto object-contain"
                                    />
                                )
                            })()
                        ) : (
                            <div className="h-24 w-24 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs text-center p-2">
                                Select Symbol
                            </div>
                        )}

                        {selectedWordmark ? (
                            wordmarkVectorStatus?.wordmarkSvg ? (
                                renderSvg(wordmarkVectorStatus.wordmarkSvg, "h-2/3 w-auto [&>svg]:h-full [&>svg]:w-auto")
                            ) : wordmarkVectorStatus?.isVectorizing ? (
                                <div className="h-16 w-32 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                                </div>
                            ) : (
                                <img
                                    src={selectedWordmark.url}
                                    alt="Selected Wordmark"
                                    className="h-2/3 w-auto object-contain"
                                />
                            )
                        ) : (
                            <div className="h-16 w-48 rounded border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs">
                                Select Wordmark
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
                    <div className="aspect-video bg-slate-950 rounded-lg border shadow-sm flex items-center justify-center p-8 gap-4 overflow-hidden relative">
                        {selectedLiteralMark ? (
                            literalVectorStatus?.darkSvg ? (
                                renderSvg(literalVectorStatus.darkSvg, "h-2/3 w-auto [&>svg]:h-full [&>svg]:w-auto")
                            ) : literalVectorStatus?.isVectorizing ? (
                                <div className="h-24 w-24 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
                                </div>
                            ) : (() => {
                                // Fallback to raster image
                                const baseId = selectedLiteralMark.id.replace(/-brand$/, '').replace(/-dark$/, '')
                                const darkVariant = variations.find(v => v.id === `${baseId}-dark`)
                                const displayUrl = darkVariant?.url || selectedLiteralMark.url
                                return (
                                    <img
                                        src={displayUrl}
                                        alt="Selected Symbol"
                                        className="h-2/3 w-auto object-contain"
                                    />
                                )
                            })()
                        ) : (
                            <div className="h-24 w-24 rounded-full border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-700 text-xs text-center p-2">
                                Select Symbol
                            </div>
                        )}

                        {selectedWordmark ? (
                            wordmarkVectorStatus?.wordmarkSvg ? (
                                // Invert the wordmark SVG for dark theme
                                renderSvg(wordmarkVectorStatus.wordmarkSvg, "h-2/3 w-auto [&>svg]:h-full [&>svg]:w-auto invert")
                            ) : wordmarkVectorStatus?.isVectorizing ? (
                                <div className="h-16 w-32 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                                </div>
                            ) : (
                                <img
                                    src={selectedWordmark.url}
                                    alt="Selected Wordmark"
                                    className="h-2/3 w-auto object-contain invert filter"
                                />
                            )
                        ) : (
                            <div className="h-16 w-48 rounded border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-700 text-xs">
                                Select Wordmark
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

            {/* Selection Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t">
                {/* Literal Marks Selection */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">1. Choose a Symbol</h3>
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

                {/* Wordmarks Selection */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">2. Choose a Wordmark</h3>
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
