import { LogoGenerationResult } from "@/types/logo-api"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Loader2, XCircle } from "lucide-react"

interface LogoGenerationProgressProps {
    variations: LogoGenerationResult[]
    onCancel: () => void
}

export function LogoGenerationProgress({ variations, onCancel }: LogoGenerationProgressProps) {
    // Calculate progress
    const total = 9 // We know we're generating 9 variations
    const completed = variations.filter(v => v.status === 'success' || v.status === 'error').length
    const progress = Math.round((completed / total) * 100)

    // Group by type for detailed status
    const logomarks = variations.filter(v => v.type === 'logomark')
    const lettermarks = variations.filter(v => v.type === 'lettermark')
    const wordmarks = variations.filter(v => v.type === 'wordmark')

    const getGroupProgress = (group: LogoGenerationResult[], expectedCount: number) => {
        const done = group.filter(v => v.status === 'success' || v.status === 'error').length
        return Math.round((done / expectedCount) * 100)
    }

    return (
        <div className="w-full max-w-md mx-auto space-y-8 py-12">
            <div className="text-center space-y-4">
                <div className="relative inline-flex">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                        {progress}%
                    </div>
                </div>
                <h2 className="text-2xl font-bold">Creating your logo variations...</h2>
                <p className="text-muted-foreground">
                    Our AI is generating 9 unique designs based on your concept.
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span>Logo Marks</span>
                        <span className="text-muted-foreground">{logomarks.length}/3</span>
                    </div>
                    <Progress value={getGroupProgress(logomarks, 3)} className="h-2" />
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span>Lettermarks</span>
                        <span className="text-muted-foreground">{lettermarks.length}/3</span>
                    </div>
                    <Progress value={getGroupProgress(lettermarks, 3)} className="h-2" />
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span>Wordmarks</span>
                        <span className="text-muted-foreground">{wordmarks.length}/3</span>
                    </div>
                    <Progress value={getGroupProgress(wordmarks, 3)} className="h-2" />
                </div>
            </div>

            <div className="flex justify-center">
                <Button variant="ghost" onClick={onCancel} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Generation
                </Button>
            </div>
        </div>
    )
}
