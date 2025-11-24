import { LogoConcept } from "@/types/logo-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Check } from "lucide-react"

interface ConceptSelectorProps {
    concepts: LogoConcept[]
    selectedConcept: LogoConcept | null
    onSelect: (conceptId: string) => void
    onUpdateConcept: (concept: LogoConcept) => void
    onBack: () => void
}

export function ConceptSelector({
    concepts,
    selectedConcept,
    onSelect,
    onUpdateConcept,
    onBack
}: ConceptSelectorProps) {
    return (
        <div className="w-full max-w-7xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Choose Your Visual Direction</h2>
                <p className="text-muted-foreground">
                    Select the concept that best fits your brand vision. You can edit the details below to refine the direction.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
                {concepts.map((concept) => {
                    const isSelected = selectedConcept?.id === concept.id

                    return (
                        <Card
                            key={concept.id}
                            className={`transition-all hover:border-primary cursor-pointer relative flex flex-col ${isSelected ? "border-primary ring-2 ring-primary ring-offset-2" : ""
                                }`}
                            onClick={() => onSelect(concept.id)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">Concept {concept.id.split('-').pop()}</CardTitle>
                                    {isSelected && <Badge variant="default"><Check className="h-3 w-3 mr-1" /> Selected</Badge>}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-1 flex flex-col">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Visual Object</label>
                                    <Input
                                        value={concept.visualObject}
                                        onChange={(e) => onUpdateConcept({ ...concept, visualObject: e.target.value })}
                                        className="h-8 text-sm"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Style</label>
                                    <Input
                                        value={concept.visualStyle}
                                        onChange={(e) => onUpdateConcept({ ...concept, visualStyle: e.target.value })}
                                        className="h-8 text-sm"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Brand Colors</label>
                                    <div className="grid gap-2">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-8 h-8 rounded border shadow-sm shrink-0"
                                                style={{ backgroundColor: concept.brandColors.primary.hex }}
                                            />
                                            <div className="flex-1 space-y-1">
                                                <Input
                                                    value={concept.brandColors.primary.name}
                                                    onChange={(e) => onUpdateConcept({
                                                        ...concept,
                                                        brandColors: {
                                                            ...concept.brandColors,
                                                            primary: { ...concept.brandColors.primary, name: e.target.value }
                                                        }
                                                    })}
                                                    className="h-6 text-xs px-2"
                                                    placeholder="Color Name"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <Input
                                                    value={concept.brandColors.primary.hex}
                                                    onChange={(e) => onUpdateConcept({
                                                        ...concept,
                                                        brandColors: {
                                                            ...concept.brandColors,
                                                            primary: { ...concept.brandColors.primary, hex: e.target.value }
                                                        }
                                                    })}
                                                    className="h-6 text-xs px-2 font-mono"
                                                    placeholder="#HEX"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>

                                        {concept.brandColors.secondary && (
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-8 h-8 rounded border shadow-sm shrink-0"
                                                    style={{ backgroundColor: concept.brandColors.secondary.hex }}
                                                />
                                                <div className="flex-1 space-y-1">
                                                    <Input
                                                        value={concept.brandColors.secondary.name}
                                                        onChange={(e) => onUpdateConcept({
                                                            ...concept,
                                                            brandColors: {
                                                                ...concept.brandColors,
                                                                secondary: { ...concept.brandColors.secondary!, name: e.target.value }
                                                            }
                                                        })}
                                                        className="h-6 text-xs px-2"
                                                        placeholder="Color Name"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <Input
                                                        value={concept.brandColors.secondary.hex}
                                                        onChange={(e) => onUpdateConcept({
                                                            ...concept,
                                                            brandColors: {
                                                                ...concept.brandColors,
                                                                secondary: { ...concept.brandColors.secondary!, hex: e.target.value }
                                                            }
                                                        })}
                                                        className="h-6 text-xs px-2 font-mono"
                                                        placeholder="#HEX"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Rationale</label>
                                    <Textarea
                                        value={concept.rationale || ""}
                                        onChange={(e) => onUpdateConcept({ ...concept, rationale: e.target.value })}
                                        className="min-h-[60px] text-xs resize-none"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>

                                <div className="pt-4 mt-auto">
                                    <Button
                                        className="w-full"
                                        variant={isSelected ? "secondary" : "default"}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelect(concept.id);
                                        }}
                                    >
                                        {isSelected ? "Selected" : "Select this Concept"}
                                    </Button>
                                </div>
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
