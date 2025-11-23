import { useState, useCallback, useEffect } from "react"
import {
    BrandInput,
    LogoConcept,
    LogoGenerationResult,
    LogoGenerationRequest,
    LogoArchetype,
    BatchGenerateRequest,
    GenerateConceptsRequest,
    GenerateConceptsResponse,
    BatchGenerateResponse
} from "@/types/logo-api"
import { generateLogoPrompt, getLettermarkSequence } from "@/lib/logo-prompt-generator"

export type LogoCreationStep =
    | 'brand-input'
    | 'concept-selection'
    | 'prompt-preview'
    | 'generation'
    | 'results'

interface UseLogoCreationReturn {
    // Current step in workflow
    currentStep: LogoCreationStep

    // Brand details
    brandDetails: BrandInput
    setBrandDetails: (details: BrandInput) => void

    // Concepts
    concepts: LogoConcept[]
    isGeneratingConcepts: boolean
    generateConcepts: () => Promise<void>

    // Selected concept
    selectedConcept: LogoConcept | null
    selectConcept: (conceptId: string) => void

    // Prompt
    logoPrompts: {
        literal: string
        wordmark: string
        lettermarkDerived: string
    }
    setLogoPrompts: (prompts: { literal: string; wordmark: string; lettermarkDerived: string }) => void

    // Generation
    variations: LogoGenerationResult[]
    isGeneratingLogos: boolean
    generateLogos: () => Promise<void>
    cancelGeneration: () => void
    regenerateVariation: (id: string) => Promise<void>

    // Navigation
    goToStep: (step: LogoCreationStep) => void
    goBack: () => void
    reset: () => void

    // Selected result
    selectedVariation: LogoGenerationResult | null
    selectVariation: (id: string) => void
}

export function useLogoCreation(): UseLogoCreationReturn {
    // State
    const [currentStep, setCurrentStep] = useState<LogoCreationStep>('brand-input')
    const [brandDetails, setBrandDetails] = useState<BrandInput>({ companyName: "", description: "" })

    const [concepts, setConcepts] = useState<LogoConcept[]>([])
    const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false)

    const [selectedConcept, setSelectedConcept] = useState<LogoConcept | null>(null)
    const [logoPrompts, setLogoPrompts] = useState({
        literal: "",
        wordmark: "",
        lettermarkDerived: ""
    })

    const [variations, setVariations] = useState<LogoGenerationResult[]>([])
    const [isGeneratingLogos, setIsGeneratingLogos] = useState(false)
    const [abortController, setAbortController] = useState<AbortController | null>(null)

    const [selectedVariation, setSelectedVariation] = useState<LogoGenerationResult | null>(null)

    // Navigation helpers
    const goToStep = useCallback((step: LogoCreationStep) => {
        setCurrentStep(step)
    }, [])

    const goBack = useCallback(() => {
        switch (currentStep) {
            case 'concept-selection':
                setCurrentStep('brand-input')
                break
            case 'prompt-preview':
                setCurrentStep('concept-selection')
                break
            case 'generation':
                // If generating, should probably cancel first? 
                // For now, just go back to preview
                setCurrentStep('prompt-preview')
                break
            case 'results':
                setCurrentStep('prompt-preview')
                break
            default:
                break
        }
    }, [currentStep])

    const reset = useCallback(() => {
        setCurrentStep('brand-input')
        setBrandDetails({ companyName: "", description: "" })
        setConcepts([])
        setSelectedConcept(null)
        setLogoPrompts({ literal: "", wordmark: "", lettermarkDerived: "" })
        setVariations([])
        setSelectedVariation(null)
    }, [])

    // API Interactions
    const generateConcepts = useCallback(async () => {
        if (!brandDetails.companyName || !brandDetails.description) return

        setIsGeneratingConcepts(true)
        try {
            const response = await fetch('/api/generate-concepts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(brandDetails as GenerateConceptsRequest)
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                console.error('API Error Response:', errorData)
                throw new Error(errorData.error || errorData.details || 'Failed to generate concepts')
            }

            const data = await response.json() as GenerateConceptsResponse
            setConcepts(data.concepts)
            setCurrentStep('concept-selection')
        } catch (error) {
            console.error('Error generating concepts:', error)
            alert(error instanceof Error ? error.message : 'Failed to generate concepts')
        } finally {
            setIsGeneratingConcepts(false)
        }
    }, [brandDetails])

    const selectConcept = useCallback((conceptId: string) => {
        const concept = concepts.find(c => c.id === conceptId)
        if (concept) {
            setSelectedConcept(concept)

            // Generate all prompts
            const literalPrompt = generateLogoPrompt({
                companyName: brandDetails.companyName,
                concept: concept,
                archetype: 'literal'
            })

            const wordmarkPrompt = generateLogoPrompt({
                companyName: brandDetails.companyName,
                concept: concept,
                archetype: 'wordmark'
            })

            const lettermarkDerivedPrompt = generateLogoPrompt({
                companyName: brandDetails.companyName,
                concept: concept,
                archetype: 'lettermark-derived'
            })

            setLogoPrompts({
                literal: literalPrompt,
                wordmark: wordmarkPrompt,
                lettermarkDerived: lettermarkDerivedPrompt
            })
            setCurrentStep('prompt-preview')
        }
    }, [concepts, brandDetails.companyName])

    const generateLogos = useCallback(async () => {
        if (!selectedConcept) return

        setIsGeneratingLogos(true)
        setCurrentStep('generation')

        const controller = new AbortController()
        setAbortController(controller)

        try {
            // ====== PHASE 1: Generate Black Versions ======
            const phase1Requests: LogoGenerationRequest[] = []

            // Generate 3 literal marks for each mode (9 total)
            const literalModes: Array<'straight-forward' | 'conceptual' | 'continuous-line'> = ['straight-forward', 'conceptual', 'continuous-line']

            literalModes.forEach(mode => {
                for (let i = 0; i < 3; i++) {
                    const prompt = generateLogoPrompt({
                        companyName: brandDetails.companyName,
                        concept: selectedConcept,
                        archetype: 'literal',
                        mode,
                        colorTreatment: 'black'
                    })

                    phase1Requests.push({
                        id: `literal-${mode}-${i}`,
                        type: 'literal' as LogoArchetype,
                        prompt,
                        aspectRatio: '1:1'
                    })
                }
            })

            // Generate 3 wordmarks
            for (let i = 0; i < 3; i++) {
                const prompt = generateLogoPrompt({
                    companyName: brandDetails.companyName,
                    concept: selectedConcept,
                    archetype: 'wordmark',
                    colorTreatment: 'black'
                })

                phase1Requests.push({
                    id: `wordmark-${i}`,
                    type: 'wordmark' as LogoArchetype,
                    prompt,
                    aspectRatio: '16:9'
                })
            }

            // Initialize variations with placeholders
            const allPlaceholders = phase1Requests.map(req => ({
                id: req.id,
                type: req.type,
                url: '',
                prompt: req.prompt,
                status: 'success' as const,
                colorTreatment: 'black' as const
            }))

            setVariations(allPlaceholders)

            // Execute Phase 1
            const response1 = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'logo-batch',
                    requests: phase1Requests
                } as BatchGenerateRequest),
                signal: controller.signal
            })

            if (!response1.ok) throw new Error('Failed to generate phase 1 logos')

            const data1 = await response1.json() as BatchGenerateResponse

            // Update variations with Phase 1 results
            setVariations(prev => {
                const newVariations = [...prev]
                data1.results.forEach(result => {
                    const index = newVariations.findIndex(v => v.id === result.id)
                    if (index !== -1) {
                        newVariations[index] = { ...result, colorTreatment: 'black' }
                    }
                })
                return newVariations
            })


            // ====== PHASE 2: Generate Color Variants (Literal Marks Only) ======
            // Get all successfully generated black logos
            const currentVariations = await new Promise<LogoGenerationResult[]>(resolve => {
                setVariations(prev => {
                    resolve(prev.filter(v => v.url && v.colorTreatment === 'black'))
                    return prev
                })
            })

            const phase2ColorRequests: LogoGenerationRequest[] = []
            const phase2DarkRequests: LogoGenerationRequest[] = []
            const coloredLogoMap = new Map<string, string>() // Map black ID to colored ID

            // For each black logo, generate colored versions (ONLY for literal marks)
            currentVariations.forEach(blackLogo => {
                // Only color literal marks
                if (blackLogo.type !== 'literal') {
                    return
                }

                // Extract mode from literal IDs (e.g., "literal-straight-forward-0")
                const modeMatch = blackLogo.id.match(/literal-(\w+-?\w*)-/)
                const mode = modeMatch ? modeMatch[1] as 'straight-forward' | 'conceptual' | 'continuous-line' : 'straight-forward'

                // Colored version for light background (AI-generated colors)
                const brandColorsPrompt = generateLogoPrompt({
                    companyName: brandDetails.companyName,
                    concept: selectedConcept,
                    archetype: blackLogo.type,
                    mode: mode,
                    colorTreatment: 'brand-colors'
                })

                const coloredId = `${blackLogo.id}-brand`
                coloredLogoMap.set(blackLogo.id, coloredId)

                phase2ColorRequests.push({
                    id: coloredId,
                    type: blackLogo.type,
                    prompt: brandColorsPrompt,
                    aspectRatio: '1:1',
                    previousImageUrl: blackLogo.url
                })
            })

            // Add placeholders for phase 2 colored versions
            setVariations(prev => [
                ...prev,
                ...phase2ColorRequests.map(req => ({
                    id: req.id,
                    type: req.type,
                    url: '',
                    prompt: req.prompt,
                    status: 'success' as const,
                    colorTreatment: 'brand-colors' as const
                }))
            ])

            // Execute Phase 2A: Generate colored versions for light background
            if (phase2ColorRequests.length > 0) {
                const response2a = await fetch('/api/generate-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mode: 'logo-batch',
                        requests: phase2ColorRequests
                    } as BatchGenerateRequest),
                    signal: controller.signal
                })

                if (response2a.ok) {
                    const data2a = await response2a.json() as BatchGenerateResponse

                    // Update variations with colored results
                    setVariations(prev => {
                        const newVariations = [...prev]
                        data2a.results.forEach(result => {
                            const index = newVariations.findIndex(v => v.id === result.id)
                            if (index !== -1) {
                                newVariations[index] = { ...result, colorTreatment: 'brand-colors' }
                            }
                        })
                        return newVariations
                    })

                    // Phase 2B: Generate dark background versions using colored versions as input
                    data2a.results.forEach(coloredResult => {
                        if (coloredResult.url && coloredResult.type === 'literal') {
                            // Extract mode and original info from the colored ID
                            const blackId = coloredResult.id.replace('-brand', '')
                            const modeMatch = blackId.match(/literal-(\w+-?\w*)-/)
                            const mode = modeMatch ? modeMatch[1] as 'straight-forward' | 'conceptual' | 'continuous-line' : 'straight-forward'

                            const darkBgPrompt = generateLogoPrompt({
                                companyName: brandDetails.companyName,
                                concept: selectedConcept,
                                archetype: 'literal',
                                mode: mode,
                                colorTreatment: 'dark-bg'
                            })

                            phase2DarkRequests.push({
                                id: `${blackId}-dark`,
                                type: 'literal',
                                prompt: darkBgPrompt,
                                aspectRatio: '1:1',
                                previousImageUrl: coloredResult.url // Use colored version as input
                            })
                        }
                    })

                    // Add placeholders for dark background versions
                    setVariations(prev => [
                        ...prev,
                        ...phase2DarkRequests.map(req => ({
                            id: req.id,
                            type: req.type,
                            url: '',
                            prompt: req.prompt,
                            status: 'success' as const,
                            colorTreatment: 'dark-bg' as const
                        }))
                    ])

                    // Execute Phase 2B: Generate dark background versions
                    if (phase2DarkRequests.length > 0) {
                        const response2b = await fetch('/api/generate-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                mode: 'logo-batch',
                                requests: phase2DarkRequests
                            } as BatchGenerateRequest),
                            signal: controller.signal
                        })

                        if (response2b.ok) {
                            const data2b = await response2b.json() as BatchGenerateResponse

                            setVariations(prev => {
                                const newVariations = [...prev]
                                data2b.results.forEach(result => {
                                    const index = newVariations.findIndex(v => v.id === result.id)
                                    if (index !== -1) {
                                        newVariations[index] = { ...result, colorTreatment: 'dark-bg' }
                                    }
                                })
                                return newVariations
                            })
                        }
                    }
                }
            }

            setCurrentStep('results')
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('Generation cancelled')
            } else {
                console.error('Error generating logos:', error)
            }
        } finally {
            setIsGeneratingLogos(false)
            setAbortController(null)
        }
    }, [brandDetails.companyName, selectedConcept])

    const cancelGeneration = useCallback(() => {
        if (abortController) {
            abortController.abort()
            setIsGeneratingLogos(false)
            setAbortController(null)
        }
    }, [abortController])

    const regenerateVariation = useCallback(async (id: string) => {
        // Implementation for single regeneration would go here
        // For now, just a placeholder
        console.log('Regenerate', id)
    }, [])

    const selectVariation = useCallback((id: string) => {
        const variation = variations.find(v => v.id === id)
        setSelectedVariation(variation || null)
    }, [variations])

    return {
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
        goToStep,
        goBack,
        reset,
        selectedVariation,
        selectVariation
    }
}
