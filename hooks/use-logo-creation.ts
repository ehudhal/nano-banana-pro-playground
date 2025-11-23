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

            // Initialize placeholders for derived lettermarks (generated after wordmarks)
            const derivedLettermarkIds = Array.from({ length: 3 }, (_, i) => `lettermark-derived-${i}`)

            // Initialize variations with placeholders
            const allPlaceholders = [
                ...phase1Requests.map(req => ({
                    id: req.id,
                    type: req.type,
                    url: '',
                    prompt: req.prompt,
                    status: 'success' as const,
                    colorTreatment: 'black' as const
                })),
                ...derivedLettermarkIds.map(id => ({
                    id,
                    type: 'lettermark-derived' as LogoArchetype,
                    url: '',
                    prompt: '',
                    status: 'success' as const,
                    colorTreatment: 'black' as const
                }))
            ]

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

            if (!response1.ok) {
                const errorData = await response1.json().catch(() => ({}))
                console.error('Phase 1 API Error:', errorData)
                throw new Error(errorData.error || 'Failed to generate phase 1 logos')
            }

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

            // ====== Generate Derived Lettermarks from first wordmark ======
            const wordmarkResult = data1.results.find(r => r.type === 'wordmark' && r.url)
            let derivedResults: LogoGenerationResult[] = []

            if (wordmarkResult && wordmarkResult.url) {
                const derivedRequests: LogoGenerationRequest[] = []

                for (let i = 0; i < 3; i++) {
                    const prompt = generateLogoPrompt({
                        companyName: brandDetails.companyName,
                        concept: selectedConcept,
                        archetype: 'lettermark-derived',
                        colorTreatment: 'black'
                    })

                    derivedRequests.push({
                        id: derivedLettermarkIds[i],
                        type: 'lettermark-derived' as LogoArchetype,
                        prompt,
                        aspectRatio: '1:1',
                        previousImageUrl: wordmarkResult.url
                    })
                }

                const derivedResponse = await fetch('/api/generate-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mode: 'logo-batch',
                        requests: derivedRequests
                    } as BatchGenerateRequest),
                    signal: controller.signal
                })

                if (derivedResponse.ok) {
                    const derivedData = await derivedResponse.json() as BatchGenerateResponse
                    derivedResults = derivedData.results.filter(r => r.url)

                    setVariations(prev => {
                        const newVariations = [...prev]
                        derivedData.results.forEach(result => {
                            const index = newVariations.findIndex(v => v.id === result.id)
                            if (index !== -1) {
                                newVariations[index] = { ...result, colorTreatment: 'black' }
                            }
                        })
                        return newVariations
                    })
                }
            }

            // ====== PHASE 2: Generate Color Variants ======
            // Collect all successfully generated black logos from Phase 1
            const allBlackLogos: LogoGenerationResult[] = [
                ...data1.results.filter(r => r.url),
                ...derivedResults
            ]

            console.log(`Phase 1 complete. Generated ${allBlackLogos.length} black logos. Starting Phase 2...`)

            // Only proceed with Phase 2 if we have black logos
            if (allBlackLogos.length > 0) {
                const phase2Requests: LogoGenerationRequest[] = []

                // For each black logo, generate brand-colors and dark-bg versions
                allBlackLogos.forEach(blackLogo => {
                    // Extract mode from literal IDs (e.g., "literal-straight-forward-0")
                    const modeMatch = blackLogo.id.match(/literal-(\w+-?\w*)-/)
                    const mode = modeMatch ? modeMatch[1] as 'straight-forward' | 'conceptual' | 'continuous-line' : 'straight-forward'

                    // Brand colors version
                    const brandColorsPrompt = generateLogoPrompt({
                        companyName: brandDetails.companyName,
                        concept: selectedConcept,
                        archetype: blackLogo.type,
                        mode: blackLogo.type === 'literal' ? mode : undefined,
                        colorTreatment: 'brand-colors'
                    })

                    phase2Requests.push({
                        id: `${blackLogo.id}-brand`,
                        type: blackLogo.type,
                        prompt: brandColorsPrompt,
                        aspectRatio: blackLogo.type === 'wordmark' ? '16:9' : '1:1',
                        previousImageUrl: blackLogo.url
                    })

                    // Dark background version
                    const darkBgPrompt = generateLogoPrompt({
                        companyName: brandDetails.companyName,
                        concept: selectedConcept,
                        archetype: blackLogo.type,
                        mode: blackLogo.type === 'literal' ? mode : undefined,
                        colorTreatment: 'dark-bg'
                    })

                    phase2Requests.push({
                        id: `${blackLogo.id}-dark`,
                        type: blackLogo.type,
                        prompt: darkBgPrompt,
                        aspectRatio: blackLogo.type === 'wordmark' ? '16:9' : '1:1',
                        previousImageUrl: blackLogo.url
                    })
                })

                // Add placeholders for phase 2
                setVariations(prev => [
                    ...prev,
                    ...phase2Requests.map(req => ({
                        id: req.id,
                        type: req.type,
                        url: '',
                        prompt: req.prompt,
                        status: 'success' as const,
                        colorTreatment: req.id.endsWith('-brand') ? 'brand-colors' as const : 'dark-bg' as const
                    }))
                ])

                console.log(`Phase 2: Generating ${phase2Requests.length} color variants...`)

                // Execute Phase 2 in batches (API limit is 20 per batch)
                const BATCH_SIZE = 20
                const batches: LogoGenerationRequest[][] = []

                for (let i = 0; i < phase2Requests.length; i += BATCH_SIZE) {
                    batches.push(phase2Requests.slice(i, i + BATCH_SIZE))
                }

                console.log(`Phase 2: Split into ${batches.length} batches`)

                // Process each batch sequentially
                for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                    const batch = batches[batchIndex]
                    console.log(`Phase 2: Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} requests)`)

                    const response2 = await fetch('/api/generate-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            mode: 'logo-batch',
                            requests: batch
                        } as BatchGenerateRequest),
                        signal: controller.signal
                    })

                    if (!response2.ok) {
                        const errorData = await response2.json().catch(() => ({}))
                        console.error(`Phase 2 Batch ${batchIndex + 1} API Error:`, errorData)
                        continue // Skip to next batch on error
                    }

                    const data2 = await response2.json() as BatchGenerateResponse

                    setVariations(prev => {
                        const newVariations = [...prev]
                        data2.results.forEach(result => {
                            const index = newVariations.findIndex(v => v.id === result.id)
                            if (index !== -1) {
                                const colorTreatment = result.id.endsWith('-brand') ? 'brand-colors' as const : 'dark-bg' as const
                                newVariations[index] = { ...result, colorTreatment }
                            }
                        })
                        return newVariations
                    })

                    console.log(`Phase 2: Batch ${batchIndex + 1}/${batches.length} complete`)
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
