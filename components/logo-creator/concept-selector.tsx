import { LogoConcept } from "@/types/logo-api"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

interface ConceptSelectorProps {
    concepts: LogoConcept[]
    selectedConcept: LogoConcept | null
    onSelect: (conceptId: string) => void
    onBack: () => void
}

export function ConceptSelector({
    concepts,
    selectedConcept,
    onSelect,
    onBack
}: ConceptSelectorProps) {
    return (
        <div className="w-full max-w-5xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Choose Your Visual Direction</h2>
                <p className="text-muted-foreground">
                    Select the concept that best fits your brand vision.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {concepts.map((concept) => {
                    const isSelected = selectedConcept?.id === concept.id

                    return (
                        <Card
                            key={concept.id}
                            className={`cursor-pointer transition-all hover:border-primary ${isSelected ? "border-primary ring-2 ring-primary ring-offset-2" : ""
                                }`}
                            onClick={() => onSelect(concept.id)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">Concept {concept.id.split('-').pop()}</CardTitle>
                                    {isSelected && <Badge variant="default"><Check className="h-3 w-3 mr-1" /> Selected</Badge>}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Visual Object</h4>
                                    <p className="font-medium">{concept.visualObject}</p>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Style</h4>
                                    <p className="text-sm">{concept.visualStyle}</p>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Brand Colors</h4>
                                    <div className="flex gap-3">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-6 h-6 rounded-full border shadow-sm"
                                                style={{ backgroundColor: concept.brandColors.primary.hex }}
                                                title={`${concept.brandColors.primary.name} (${concept.brandColors.primary.hex})`}
                                            />
                                            <span className="text-xs text-muted-foreground">{concept.brandColors.primary.name}</span>
                                        </div>
                                        {concept.brandColors.secondary && (
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-6 h-6 rounded-full border shadow-sm"
                                                    style={{ backgroundColor: concept.brandColors.secondary.hex }}
                                                    title={`${concept.brandColors.secondary.name} (${concept.brandColors.secondary.hex})`}
                                                />
                                                <span className="text-xs text-muted-foreground">{concept.brandColors.secondary.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {concept.rationale && (
                                    <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground italic">
                                        "{concept.rationale}"
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={onBack}>
                    Back to Brand Input
                </Button>
            </div>
        </div>
    )
}
