import { useState, useCallback, useEffect } from "react"
import {
    BrandInput,
    LogoConcept,
    LogoGenerationResult,
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

            if (!response.ok) throw new Error('Failed to generate concepts')

            const data = await response.json() as GenerateConceptsResponse
            setConcepts(data.concepts)
            setCurrentStep('concept-selection')
        } catch (error) {
            console.error('Error generating concepts:', error)
            // TODO: Handle error state
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

        // Phase 1: Generate Wordmarks and Literal Marks
        const phase1Requests = []

        // Literal Marks
        for (let i = 0; i < 3; i++) {
            phase1Requests.push({
                id: `literal-${i}`,
                type: 'literal' as LogoArchetype,
                prompt: logoPrompts.literal,
                aspectRatio: '1:1'
            })
        }

        // Wordmarks
        for (let i = 0; i < 3; i++) {
            phase1Requests.push({
                id: `wordmark-${i}`,
                type: 'wordmark' as LogoArchetype,
                prompt: logoPrompts.wordmark,
                aspectRatio: '16:9'
            })
        }

        // Initialize variations with loading state
        // We also add placeholders for the derived lettermarks which will come in Phase 2
        const derivedPlaceholders = Array.from({ length: 3 }).map((_, i) => ({
            id: `lettermark-derived-${i}`,
            type: 'lettermark-derived' as LogoArchetype,
            url: '',
            prompt: logoPrompts.lettermarkDerived,
            status: 'success' // Placeholder
        }))

        setVariations([
            ...phase1Requests.map(req => ({
                id: req.id,
                type: req.type,
                url: '',
                prompt: req.prompt,
                status: 'success' as const
            })),
            ...derivedPlaceholders.map(p => ({ ...p, status: 'success' as const }))
        ])

        try {
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
            // We keep the derived placeholders for now
            const phase1Results = data1.results
            setVariations(prev => {
                const newVariations = [...prev]
                phase1Results.forEach(result => {
                    const index = newVariations.findIndex(v => v.id === result.id)
                    if (index !== -1) newVariations[index] = result
                })
                return newVariations
            })

            // Phase 2: Generate Derived Lettermarks using the first generated Wordmark
            const wordmarkResult = phase1Results.find(r => r.type === 'wordmark' && r.url)

            if (wordmarkResult && wordmarkResult.url) {
                const phase2Requests = []
                for (let i = 0; i < 3; i++) {
                    phase2Requests.push({
                        id: `lettermark-derived-${i}`,
                        type: 'lettermark-derived' as LogoArchetype,
                        prompt: logoPrompts.lettermarkDerived,
                        aspectRatio: '1:1',
                        previousImageUrl: wordmarkResult.url // Pass the wordmark image
                    })
                }

                const response2 = await fetch('/api/generate-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mode: 'logo-batch',
                        requests: phase2Requests
                    } as BatchGenerateRequest),
                    signal: controller.signal
                })

                if (!response2.ok) throw new Error('Failed to generate phase 2 logos')

                const data2 = await response2.json() as BatchGenerateResponse

                // Update variations with Phase 2 results
                setVariations(prev => {
                    const newVariations = [...prev]
                    data2.results.forEach(result => {
                        const index = newVariations.findIndex(v => v.id === result.id)
                        if (index !== -1) newVariations[index] = result
                    })
                    return newVariations
                })
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
    }, [brandDetails.companyName, selectedConcept, logoPrompts])

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
