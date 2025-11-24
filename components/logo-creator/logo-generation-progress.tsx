import { LogoGenerationResult } from "@/types/logo-api"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Loader2, XCircle } from "lucide-react"

interface LogoGenerationProgressProps {
    variations: LogoGenerationResult[]
    onCancel: () => void
}

export function LogoGenerationProgress({ variations, onCancel }: LogoGenerationProgressProps) {
    // Calculate counts
    const completedCount = variations.filter(v => v.status === 'success' || v.status === 'error').length
    const totalCount = variations.length

    // Group by type for detailed status
    const literals = variations.filter(v => v.type === 'literal')
    const wordmarks = variations.filter(v => v.type === 'wordmark')

    // Helper to get counts for a group
    const getGroupStatus = (group: LogoGenerationResult[]) => {
        const completed = group.filter(v => v.status === 'success' || v.status === 'error').length
        const total = group.length
        return { completed, total }
    }

    const literalStatus = getGroupStatus(literals)
    const wordmarkStatus = getGroupStatus(wordmarks)

    return (
        <div className="w-full max-w-md mx-auto space-y-8 py-12">
            <div className="text-center space-y-4">
                <div className="relative inline-flex">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Creating your logo variations...</h2>
                <p className="text-muted-foreground">
                    Generated {completedCount} variations so far
                </p>
            </div>

            <div className="space-y-4">
                {literals.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Literal Marks</span>
                            <span className="text-muted-foreground">
                                {literalStatus.completed}/{literalStatus.total}
                            </span>
                        </div>
                        <Progress
                            value={literalStatus.total > 0 ? (literalStatus.completed / literalStatus.total) * 100 : 0}
                            className="h-2"
                        />
                    </div>
                )}

                {wordmarks.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Wordmarks</span>
                            <span className="text-muted-foreground">
                                {wordmarkStatus.completed}/{wordmarkStatus.total}
                            </span>
                        </div>
                        <Progress
                            value={wordmarkStatus.total > 0 ? (wordmarkStatus.completed / wordmarkStatus.total) * 100 : 0}
                            className="h-2"
                        />
                    </div>
                )}
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
