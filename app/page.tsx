"use client"

import { useState } from "react"
import { ImageCombiner } from "@/components/image-combiner"
import { LogoCreatorMain } from "@/components/logo-creator/logo-creator-main"
import { Button } from "@/components/ui/button"
import { ImageIcon, PenTool } from "lucide-react"

export default function Home() {
  const [mode, setMode] = useState<'image-generator' | 'logo-creator'>('logo-creator')

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Mode Toggle Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-center">
          <div className="flex items-center p-1 bg-muted rounded-lg">
            <Button
              variant={mode === 'image-generator' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('image-generator')}
              className="gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              Image Generator
            </Button>
            <Button
              variant={mode === 'logo-creator' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('logo-creator')}
              className="gap-2"
            >
              <PenTool className="h-4 w-4" />
              Logo Creator
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        {mode === 'image-generator' ? (
          <ImageCombiner />
        ) : (
          <LogoCreatorMain />
        )}
      </div>
    </main>
  )
}
