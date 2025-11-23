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
    logoPrompt: string
    setLogoPrompt: (prompt: string) => void

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
    const [logoPrompt, setLogoPrompt] = useState("")

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
        setLogoPrompt("")
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
            // Generate initial prompt based on concept
            // Defaulting to a wordmark prompt for the preview, but the actual generation will use specific prompts
            const initialPrompt = generateLogoPrompt({
                companyName: brandDetails.companyName,
                concept: concept,
                archetype: 'wordmark'
            })
            setLogoPrompt(initialPrompt)
            setCurrentStep('prompt-preview')
        }
    }, [concepts, brandDetails.companyName])

    const generateLogos = useCallback(async () => {
        if (!selectedConcept) return

        setIsGeneratingLogos(true)
        setCurrentStep('generation')

        const controller = new AbortController()
        setAbortController(controller)

        // Prepare batch requests
        // 3 Logo Marks, 3 Lettermarks, 3 Wordmarks
        const requests = []

        // Logo Marks (Visual Object focused)
        for (let i = 0; i < 3; i++) {
            requests.push({
                id: `logomark-${i}`,
                type: 'logomark' as LogoArchetype,
                prompt: `Logo mark for ${brandDetails.companyName}. ${selectedConcept.visualObject}. ${selectedConcept.visualStyle}. Colors: ${selectedConcept.brandColors.primary.name} ${selectedConcept.brandColors.primary.hex}. Minimal, iconic, vector style. No text.`,
                aspectRatio: '1:1'
            })
        }

        // Lettermarks
        for (let i = 0; i < 3; i++) {
            requests.push({
                id: `lettermark-${i}`,
                type: 'lettermark' as LogoArchetype,
                prompt: `Lettermark logo for ${brandDetails.companyName}. Initials. ${selectedConcept.visualStyle}. Colors: ${selectedConcept.brandColors.primary.name} ${selectedConcept.brandColors.primary.hex}. Typography focused.`,
                aspectRatio: '1:1'
            })
        }

        // Wordmarks
        for (let i = 0; i < 3; i++) {
            requests.push({
                id: `wordmark-${i}`,
                type: 'wordmark' as LogoArchetype,
                prompt: `Wordmark logo for ${brandDetails.companyName}. Full name. ${selectedConcept.visualStyle}. Colors: ${selectedConcept.brandColors.primary.name} ${selectedConcept.brandColors.primary.hex}. Professional typography.`,
                aspectRatio: '16:9'
            })
        }

        // Initialize variations with loading state
        setVariations(requests.map(req => ({
            id: req.id,
            type: req.type,
            url: '',
            prompt: req.prompt,
            status: 'success' // Temporarily using success to match type, but in reality we'd want a loading state in the UI
        })))

        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'logo-batch',
                    requests
                } as BatchGenerateRequest),
                signal: controller.signal
            })

            if (!response.ok) throw new Error('Failed to generate logos')

            const data = await response.json() as BatchGenerateResponse
            setVariations(data.results)
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
        logoPrompt,
        setLogoPrompt,
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
