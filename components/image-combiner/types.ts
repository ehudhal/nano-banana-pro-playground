import type React from "react"

export interface GeneratedImage {
  url: string
  prompt: string
  description?: string
}

export interface Generation {
  id: string
  status: "loading" | "complete" | "error"
  progress: number
  imageUrl: string | null
  prompt: string
  error?: string
  timestamp: number
  abortController?: AbortController
  thumbnailLoaded?: boolean
  createdAt?: string
  aspectRatio?: string
  mode?: string
}

export type AspectRatioOption = {
  value: string
  label: string
  ratio: number
  icon: React.ReactNode
}

// Logo Creator Types
export interface LogoConcept {
  id: string
  visualObject: string
  visualStyle: string
  brandColors: {
    primary: {
      name: string
      hex: string
    }
    secondary?: {
      name: string
      hex: string
    }
  }
  rationale?: string
}
