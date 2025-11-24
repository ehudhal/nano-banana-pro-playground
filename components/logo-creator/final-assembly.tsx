import { LogoGenerationResult } from "@/types/logo-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface FinalAssemblyProps {
    variations: LogoGenerationResult[]
    selectedLiteralMarkId: string | null
    selectedWordmarkId: string | null
    onSelectLiteralMark: (id: string) => void
    onSelectWordmark: (id: string) => void
    onReset: () => void
}

export function FinalAssembly({
    variations,
    selectedLiteralMarkId,
    selectedWordmarkId,
    onSelectLiteralMark,
    onSelectWordmark,
    onReset
}: FinalAssemblyProps) {
    // Filter variations by type
    const literalMarks = variations.filter(v => v.type === 'literal' && v.url)
    const wordmarks = variations.filter(v => v.type === 'wordmark' && v.url)

    // Get selected images
    const selectedLiteralMark = variations.find(v => v.id === selectedLiteralMarkId)
    const selectedWordmark = variations.find(v => v.id === selectedWordmarkId)

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Assemble Your Logo</h2>
                <p className="text-muted-foreground">
                    Select a symbol and a wordmark to see them combined.
                </p>
            </div>

            {/* Preview Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Light Theme Preview */}
                <div className="space-y-2">
                    <h3 className="font-medium text-sm text-muted-foreground text-center">Light Theme</h3>
                    <div className="aspect-video bg-white rounded-lg border shadow-sm flex items-center justify-center p-8 gap-2 overflow-hidden">
                        {selectedLiteralMark ? (() => {
                            // Resolve the brand-colored version for light theme
                            // 1. Get base ID (remove -brand or -dark suffix)
                            const baseId = selectedLiteralMark.id.replace(/-brand$/, '').replace(/-dark$/, '')
                            // 2. Try to find the brand variant
                            const brandVariant = variations.find(v => v.id === `${baseId}-brand`)
                            // 3. Fallback to selected mark if brand variant not found
                            const displayUrl = brandVariant?.url || selectedLiteralMark.url

                            return (
                                <img
                                    src={displayUrl}
                                    alt="Selected Symbol"
                                    className="h-2/3 w-auto object-contain"
                                />
                            )
                        })() : (
                            <div className="h-24 w-24 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs text-center p-2">
                                Select Symbol
                            </div>
                        )}

                        {selectedWordmark ? (
                            <img
                                src={selectedWordmark.url}
                                alt="Selected Wordmark"
                                className="h-2/3 w-auto object-contain"
                            />
                        ) : (
                            <div className="h-16 w-48 rounded border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs">
                                Select Wordmark
                            </div>
                        )}
                    </div>
                </div>

                {/* Dark Theme Preview */}
                <div className="space-y-2">
                    <h3 className="font-medium text-sm text-muted-foreground text-center">Dark Theme</h3>
                    <div className="aspect-video bg-slate-950 rounded-lg border shadow-sm flex items-center justify-center p-8 gap-2 overflow-hidden">
                        {selectedLiteralMark ? (() => {
                            // Resolve the dark-bg version for dark theme
                            // 1. Get base ID (remove -brand or -dark suffix)
                            const baseId = selectedLiteralMark.id.replace(/-brand$/, '').replace(/-dark$/, '')
                            // 2. Try to find the dark variant
                            const darkVariant = variations.find(v => v.id === `${baseId}-dark`)
                            // 3. Fallback to selected mark if dark variant not found
                            const displayUrl = darkVariant?.url || selectedLiteralMark.url

                            return (
                                <img
                                    src={displayUrl}
                                    alt="Selected Symbol"
                                    className="h-2/3 w-auto object-contain"
                                />
                            )
                        })() : (
                            <div className="h-24 w-24 rounded-full border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-700 text-xs text-center p-2">
                                Select Symbol
                            </div>
                        )}

                        {selectedWordmark ? (
                            <img
                                src={selectedWordmark.url}
                                alt="Selected Wordmark"
                                className="h-2/3 w-auto object-contain invert filter" // Wordmarks are usually black, so invert for dark theme
                            />
                        ) : (
                            <div className="h-16 w-48 rounded border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-700 text-xs">
                                Select Wordmark
                            </div>
                        )}
                    </div>
                </div>
            </div>

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

            <div className="flex justify-center pt-8 gap-4">
                <Button variant="outline" onClick={onReset}>
                    Start Over
                </Button>
                <Button disabled={!selectedLiteralMarkId || !selectedWordmarkId}>
                    <Download className="mr-2 h-4 w-4" /> Export Final Logo
                </Button>
            </div>
        </div>
    )
}
