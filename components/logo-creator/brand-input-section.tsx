import { useState } from "react"
import { BrandInput } from "@/types/logo-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, FlaskConical } from "lucide-react"

interface BrandInputSectionProps {
    brandDetails: BrandInput
    setBrandDetails: (details: BrandInput) => void
    onGenerate: () => void
    isGenerating: boolean
    // Test mode props
    onLoadTestData?: () => boolean
    hasTestData?: boolean
}

export function BrandInputSection({
    brandDetails,
    setBrandDetails,
    onGenerate,
    isGenerating,
    onLoadTestData,
    hasTestData
}: BrandInputSectionProps) {
    const [errors, setErrors] = useState<{ companyName?: string, description?: string }>({})

    const validate = () => {
        const newErrors: { companyName?: string, description?: string } = {}
        let isValid = true

        if (!brandDetails.companyName.trim()) {
            newErrors.companyName = "Company name is required"
            isValid = false
        } else if (brandDetails.companyName.length > 50) {
            newErrors.companyName = "Company name must be 50 characters or less"
            isValid = false
        }

        if (!brandDetails.description.trim()) {
            newErrors.description = "Description is required"
            isValid = false
        } else if (brandDetails.description.length > 200) {
            newErrors.description = "Description must be 200 characters or less"
            isValid = false
        }

        setErrors(newErrors)
        return isValid
    }

    const handleSubmit = () => {
        if (validate()) {
            onGenerate()
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Create Your Brand Identity</h2>
                <p className="text-muted-foreground">
                    Tell us about your company and we'll generate unique logo concepts for you.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Brand Details</CardTitle>
                    <CardDescription>
                        Enter your company name and a short description of what you do.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input
                            id="companyName"
                            placeholder="e.g. Nano Banana Pro"
                            value={brandDetails.companyName}
                            onChange={(e) => setBrandDetails({ ...brandDetails, companyName: e.target.value })}
                            maxLength={50}
                            className={`${errors.companyName ? "border-destructive" : "border-primary/20"} bg-secondary/30 focus-visible:bg-background transition-colors h-12 text-lg`}
                        />
                        <div className="flex justify-between text-xs">
                            <span className="text-destructive">{errors.companyName}</span>
                            <span className="text-muted-foreground">{brandDetails.companyName.length}/50</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">What does your company do?</Label>
                        <Textarea
                            id="description"
                            placeholder="e.g. AI-powered creative tools for developers and designers."
                            value={brandDetails.description}
                            onChange={(e) => setBrandDetails({ ...brandDetails, description: e.target.value })}
                            maxLength={200}
                            className={`resize-none ${errors.description ? "border-destructive" : "border-primary/20"} bg-secondary/30 focus-visible:bg-background transition-colors min-h-[100px] text-base`}
                            rows={3}
                        />
                        <div className="flex justify-between text-xs">
                            <span className="text-destructive">{errors.description}</span>
                            <span className="text-muted-foreground">{brandDetails.description.length}/200</span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating Concepts...
                            </>
                        ) : (
                            "Generate Concepts"
                        )}
                    </Button>

                    {/* Test mode: Load saved data */}
                    {hasTestData && onLoadTestData && (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={onLoadTestData}
                            disabled={isGenerating}
                        >
                            <FlaskConical className="mr-2 h-4 w-4" />
                            Load Test Data (Skip to Assembly)
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}
