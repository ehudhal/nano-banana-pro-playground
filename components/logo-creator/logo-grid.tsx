import { LogoGenerationResult } from "@/types/logo-api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, RefreshCw, Maximize2 } from "lucide-react"
import Image from "next/image"

interface LogoGridProps {
    variations: LogoGenerationResult[]
    onRegenerate: (id: string) => void
    onSelect: (id: string) => void
    onReset: () => void
    onAssemble: () => void
}

export function LogoGrid({ variations, onRegenerate, onSelect, onReset, onAssemble }: LogoGridProps) {
    const getSectionTitle = (type: string) => {
        switch (type) {
            case 'logomark': return 'Logo Marks'
            case 'literal': return 'Literal Marks'
            case 'wordmark': return 'Wordmarks'
            case 'lettermark-derived': return 'Derived Lettermarks'
            default: return ''
        }
    }

    const literals = variations.filter(v => v.type === 'literal')
    const wordmarks = variations.filter(v => v.type === 'wordmark')

    const LogoCard = ({ item }: { item: LogoGenerationResult }) => (
        <Card className="overflow-hidden group relative aspect-square">
            <CardContent className="p-0 h-full w-full relative bg-white flex items-center justify-center">
                {item.status === 'success' && item.url ? (
                    <>
                        <div className="relative w-full h-full">
                            <Image
                                src={item.url}
                                alt={`Generated ${item.type}`}
                                fill
                                className="object-contain p-4"
                            />
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="icon" variant="secondary" onClick={() => window.open(item.url, '_blank')}>
                                <Maximize2 className="h-4 w-4" />
                            </Button>
                            <a href={item.url} download={`logo-${item.id}.png`}>
                                <Button size="icon" variant="secondary">
                                    <Download className="h-4 w-4" />
                                </Button>
                            </a>
                        </div>
                    </>
                ) : item.status === 'error' ? (
                    <div className="text-center p-4">
                        <p className="text-destructive text-sm mb-2">Generation Failed</p>
                        <Button size="sm" variant="outline" onClick={() => onRegenerate(item.id)}>
                            <RefreshCw className="h-3 w-3 mr-2" /> Retry
                        </Button>
                    </div>
                ) : (
                    <div className="animate-pulse bg-muted w-full h-full" />
                )}
            </CardContent>
        </Card>
    )

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Your Logo Options</h2>
                    <p className="text-muted-foreground">
                        Browse, download, or regenerate your favorites.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onReset}>Start Over</Button>
                    <Button onClick={onAssemble}>Proceed to Assembly</Button>
                </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="letters">Letters</TabsTrigger>
                    <TabsTrigger value="words">Words</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
                        {/* Group by type visually */}
                        <div className="col-span-full mb-2 font-semibold text-lg">Literal Marks</div>
                        {literals.map(item => <LogoCard key={item.id} item={item} />)}

                        <div className="col-span-full mt-6 mb-2 font-semibold text-lg">Derived Lettermarks</div>
                        {variations.filter(v => v.type === 'lettermark-derived').map(item => <LogoCard key={item.id} item={item} />)}

                        <div className="col-span-full mt-6 mb-2 font-semibold text-lg">Wordmarks</div>
                        {wordmarks.map(item => <LogoCard key={item.id} item={item} />)}
                    </div>
                </TabsContent>

                <TabsContent value="letters" className="mt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {literals.map(item => <LogoCard key={item.id} item={item} />)}
                    </div>
                </TabsContent>

                <TabsContent value="words" className="mt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {wordmarks.map(item => <LogoCard key={item.id} item={item} />)}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
