"use client"

import { useLogoCreation } from "@/hooks/use-logo-creation"
import { BrandInputSection } from "./brand-input-section"
import { ConceptSelector } from "./concept-selector"
import { LogoGenerationProgress } from "./logo-generation-progress"
import { LogoGrid } from "./logo-grid"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Wand2 } from "lucide-react"

export function LogoCreatorMain() {
    const {
        currentStep,
        brandDetails,
        setBrandDetails,
        concepts,
        isGeneratingConcepts,
        generateConcepts,
        selectedConcept,
        selectConcept,
        logoPrompts,
        setLogoPrompts,
        variations,
        isGeneratingLogos,
        generateLogos,
        cancelGeneration,
        regenerateVariation,
        goBack,
        reset,
        selectVariation
    } = useLogoCreation()

    return (
        <div className="container mx-auto py-8 px-4 min-h-[calc(100vh-4rem)]">
            {/* Progress Indicator - Simple version */}
            <div className="flex justify-center mb-8">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span className={currentStep === 'brand-input' ? "font-bold text-primary" : ""}>Brand</span>
                    <span>→</span>
                    <span className={currentStep === 'concept-selection' ? "font-bold text-primary" : ""}>Concepts</span>
                    <span>→</span>
                    <span className={currentStep === 'prompt-preview' ? "font-bold text-primary" : ""}>Preview</span>
                    <span>→</span>
                    <span className={currentStep === 'generation' || currentStep === 'results' ? "font-bold text-primary" : ""}>Results</span>
                </div>
            </div>

            {/* Step 1: Brand Input */}
            {currentStep === 'brand-input' && (
                <BrandInputSection
                    brandDetails={brandDetails}
                    setBrandDetails={setBrandDetails}
                    onGenerate={generateConcepts}
                    isGenerating={isGeneratingConcepts}
                />
            )}

            {/* Step 2: Concept Selection */}
            {currentStep === 'concept-selection' && (
                <ConceptSelector
                    concepts={concepts}
                    selectedConcept={selectedConcept}
                    onSelect={selectConcept}
                    onBack={goBack}
                />
            )}

            {/* Step 3: Prompt Preview */}
            {currentStep === 'prompt-preview' && selectedConcept && (
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight">Review & Generate</h2>
                        <p className="text-muted-foreground">
                            We've crafted prompts for each logo type based on your selected concept. You can tweak them if you like.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Literal Mark Prompt</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    value={logoPrompts.literal}
                                    onChange={(e) => setLogoPrompts({ ...logoPrompts, literal: e.target.value })}
                                    rows={6}
                                    className="resize-none"
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Wordmark Prompt</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    value={logoPrompts.wordmark}
                                    onChange={(e) => setLogoPrompts({ ...logoPrompts, wordmark: e.target.value })}
                                    rows={6}
                                    className="resize-none"
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Derived Lettermark</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    value={logoPrompts.lettermarkDerived}
                                    onChange={(e) => setLogoPrompts({ ...logoPrompts, lettermarkDerived: e.target.value })}
                                    rows={6}
                                    className="resize-none"
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex justify-between gap-4 pt-4 max-w-2xl mx-auto">
                        <Button variant="outline" onClick={goBack}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button onClick={generateLogos} className="w-full sm:w-auto">
                            <Wand2 className="mr-2 h-4 w-4" /> Create Logo Variations
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 4: Generation Progress */}
            {currentStep === 'generation' && (
                <LogoGenerationProgress
                    variations={variations}
                    onCancel={cancelGeneration}
                />
            )}

            {/* Step 5: Results */}
            {currentStep === 'results' && (
                <LogoGrid
                    variations={variations}
                    onRegenerate={regenerateVariation}
                    onSelect={selectVariation}
                    onReset={reset}
                />
            )}
        </div>
    )
}
