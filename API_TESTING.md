# API Testing Guide

This document provides examples for testing the Logo Creator API endpoints.

## Prerequisites

Before testing, ensure you have the following environment variables configured in `.env.local`:

```bash
AI_GATEWAY_API_KEY=your-vercel-ai-gateway-key
OPENAI_API_KEY=your-openai-api-key
```

Install the new dependency:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

---

## 1. Generate Concepts API

**Endpoint:** `POST /api/generate-concepts`

**Purpose:** Generate 3 distinct visual concepts for a logo based on company name and description.

### Request Example

```bash
curl -X POST http://localhost:3000/api/generate-concepts \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Design Rails",
    "description": "A modern web design agency focused on creating beautiful, accessible websites"
  }'
```

### Expected Response

```json
{
  "concepts": [
    {
      "id": "concept-1",
      "visualObject": "intersecting rail tracks forming star",
      "visualStyle": "Modern, Geometric, Clean",
      "brandColors": {
        "primary": {
          "name": "Deep Blue",
          "hex": "#1E3A8A"
        },
        "secondary": {
          "name": "Coral",
          "hex": "#FF6B6B"
        }
      },
      "rationale": "Rails suggest structure and direction, while the star formation represents excellence in design"
    },
    {
      "id": "concept-2",
      "visualObject": "flowing brush stroke",
      "visualStyle": "Organic, Dynamic, Flowing",
      "brandColors": {
        "primary": {
          "name": "Forest Green",
          "hex": "#10B981"
        },
        "secondary": {
          "name": "Warm Orange",
          "hex": "#F59E0B"
        }
      },
      "rationale": "The brush stroke represents creativity and the artistic nature of design work"
    },
    {
      "id": "concept-3",
      "visualObject": "compass pointing forward",
      "visualStyle": "Bold, Minimal, Sharp",
      "brandColors": {
        "primary": {
          "name": "Navy Blue",
          "hex": "#0F172A"
        },
        "secondary": {
          "name": "Electric Cyan",
          "hex": "#06B6D4"
        }
      },
      "rationale": "Compass shows guidance and navigation, representing the agency's role in guiding clients"
    }
  ]
}
```

### Error Responses

**Missing Company Name:**
```json
{
  "error": "Company name is required"
}
```

**Missing API Key:**
```json
{
  "error": "Configuration error",
  "details": "No OpenAI API key configured. Please add OPENAI_API_KEY to environment variables."
}
```

---

## 2. Batch Logo Generation API

**Endpoint:** `POST /api/generate-image`

**Purpose:** Generate multiple logo variations in a single request (supports up to 20 concurrent generations).

### Request Example - Wordmark Generation

```bash
curl -X POST http://localhost:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "logo-batch",
    "requests": [
      {
        "id": "wordmark-1",
        "type": "wordmark",
        "prompt": "Wordmark for \"Design Rails\". Black stroke. Single-line. Fully flat. Handwritten elegance. dynamic. Fully white background. No extra text.",
        "aspectRatio": "16:9"
      },
      {
        "id": "wordmark-2",
        "type": "wordmark",
        "prompt": "Wordmark for \"Design Rails\". Black stroke. Single-line. Fully flat. Ligature-heavy. bold. Fully white background. No extra text.",
        "aspectRatio": "16:9"
      },
      {
        "id": "wordmark-3",
        "type": "wordmark",
        "prompt": "Wordmark for \"Design Rails\". Black stroke. Single-line. Fully flat. Script/Calligraphic. elegant. Fully white background. No extra text.",
        "aspectRatio": "16:9"
      }
    ]
  }'
```

### Request Example - Sequential Generation (Lettermark from Wordmark)

This example shows how to generate a lettermark using a previously generated wordmark as input:

```bash
curl -X POST http://localhost:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "logo-batch",
    "requests": [
      {
        "id": "lettermark-1",
        "type": "lettermark",
        "prompt": "lettermark \"DR\". No extra text. White background.",
        "aspectRatio": "1:1",
        "previousImageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
      },
      {
        "id": "lettermark-enclosed-1",
        "type": "lettermark",
        "prompt": "Enclosed in a circle",
        "aspectRatio": "1:1",
        "previousImageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
      }
    ]
  }'
```

### Expected Response

```json
{
  "results": [
    {
      "id": "wordmark-1",
      "type": "wordmark",
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
      "prompt": "Wordmark for \"Design Rails\". Black stroke...",
      "status": "success"
    },
    {
      "id": "wordmark-2",
      "type": "wordmark",
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
      "prompt": "Wordmark for \"Design Rails\". Black stroke...",
      "status": "success"
    },
    {
      "id": "wordmark-3",
      "type": "wordmark",
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
      "prompt": "Wordmark for \"Design Rails\". Black stroke...",
      "status": "success"
    }
  ]
}
```

### Error Response (Partial Failures)

If some requests succeed and others fail:

```json
{
  "results": [
    {
      "id": "wordmark-1",
      "type": "wordmark",
      "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
      "prompt": "Wordmark for \"Design Rails\"...",
      "status": "success"
    },
    {
      "id": "wordmark-2",
      "type": "wordmark",
      "url": "",
      "prompt": "Wordmark for \"Design Rails\"...",
      "status": "error",
      "error": "No image generated from model"
    }
  ]
}
```

---

## 3. Testing with the Prompt Generator

You can use the prompt generator library to create proper prompts:

### JavaScript/TypeScript Example

```typescript
import {
  generateLogoPrompt,
  getLettermarkSequence,
  WORDMARK_ADJECTIVES,
  LETTERMARK_SHAPES
} from '@/lib/logo-prompt-generator'

// Mock concept from GPT-5
const concept = {
  id: "concept-1",
  visualObject: "intersecting rail tracks",
  visualStyle: "Modern, Geometric, Clean",
  brandColors: {
    primary: { name: "Deep Blue", hex: "#1E3A8A" },
    secondary: { name: "Coral", hex: "#FF6B6B" }
  }
}

// Generate a wordmark prompt
const wordmarkPrompt = generateLogoPrompt({
  companyName: "Design Rails",
  concept,
  archetype: "wordmark"
})

console.log(wordmarkPrompt)
// Output: Wordmark for "Design Rails". Black stroke. Single-line.
//         Fully flat. Ligature-heavy. modern, geometric, clean.
//         Fully white background. No extra text.

// Get the complete lettermark sequence
const sequence = getLettermarkSequence(
  "Design Rails",
  concept,
  "circle" // or "square", or null
)

console.log(sequence)
// Output: [
//   { step: 1, archetype: 'wordmark', prompt: '...', ... },
//   { step: 2, archetype: 'lettermark', prompt: '...', requiresPreviousImage: true, ... },
//   { step: 3, archetype: 'lettermark-enclosed', prompt: '...', requiresPreviousImage: true, ... }
// ]
```

---

## 4. Full Workflow Test

Here's a complete workflow from concept generation to final logos:

### Step 1: Generate Concepts

```bash
CONCEPTS=$(curl -s -X POST http://localhost:3000/api/generate-concepts \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Design Rails",
    "description": "A modern web design agency"
  }')

echo $CONCEPTS
```

### Step 2: Extract First Concept (using jq)

```bash
CONCEPT=$(echo $CONCEPTS | jq '.concepts[0]')
echo $CONCEPT
```

### Step 3: Generate Wordmarks (using the concept)

```bash
curl -X POST http://localhost:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "logo-batch",
    "requests": [
      {
        "id": "wordmark-1",
        "type": "wordmark",
        "prompt": "Wordmark for \"Design Rails\". Black stroke. Single-line. Fully flat. Handwritten elegance. Fully white background. No extra text.",
        "aspectRatio": "16:9"
      }
    ]
  }' | jq '.'
```

---

## 5. Rate Limiting & Performance

### Current Limits

- **Concept Generation:** 1 request processes 3 concepts
- **Batch Generation:** Up to 20 requests per call
- **Parallel Processing:** All batch requests run concurrently

### Recommended Usage

For the logo creator workflow (9 total variations):
1. Generate 3 wordmarks in first batch
2. Use wordmark results to generate 3 lettermarks in second batch
3. Use lettermark results to generate 3 enclosed lettermarks in third batch

This ensures sequential dependencies are respected.

---

## 6. Error Scenarios to Test

### Test 1: Invalid Company Name
```bash
curl -X POST http://localhost:3000/api/generate-concepts \
  -H "Content-Type: application/json" \
  -d '{"companyName": "", "description": "test"}'
```

Expected: `{"error": "Company name is required"}`

### Test 2: Too Many Batch Requests
```bash
curl -X POST http://localhost:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "logo-batch",
    "requests": ['$(printf '{"id":"req-%d","type":"wordmark","prompt":"test","aspectRatio":"1:1"},' {1..21})']
  }'
```

Expected: `{"error": "Maximum 20 batch requests allowed"}`

### Test 3: Missing API Keys

Stop the server, remove API keys from `.env.local`, restart:

```bash
curl -X POST http://localhost:3000/api/generate-concepts \
  -H "Content-Type: application/json" \
  -d '{"companyName": "Test", "description": "test"}'
```

Expected: Configuration error message

---

## 7. Postman Collection

Import this collection into Postman for easier testing:

```json
{
  "info": {
    "name": "Logo Creator API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Generate Concepts",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"companyName\": \"Design Rails\",\n  \"description\": \"A modern web design agency\"\n}"
        },
        "url": {
          "raw": "http://localhost:3000/api/generate-concepts",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "generate-concepts"]
        }
      }
    },
    {
      "name": "Batch Generate Logos",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"mode\": \"logo-batch\",\n  \"requests\": [\n    {\n      \"id\": \"wordmark-1\",\n      \"type\": \"wordmark\",\n      \"prompt\": \"Wordmark for \\\"Design Rails\\\". Black stroke. Single-line. Fully flat. Handwritten elegance. Fully white background. No extra text.\",\n      \"aspectRatio\": \"16:9\"\n    }\n  ]\n}"
        },
        "url": {
          "raw": "http://localhost:3000/api/generate-image",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "generate-image"]
        }
      }
    }
  ]
}
```

---

## 8. Debugging Tips

### Enable Detailed Logging

Check the terminal where `npm run dev` is running for detailed error logs.

### Inspect Generated Prompts

Before sending to the API, log the prompts generated by the prompt generator:

```typescript
console.log('Generated prompt:', generateLogoPrompt({ ... }))
```

### Check Image Data

Base64 images can be viewed by copying the data URL and pasting into browser address bar:
```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...
```

---

## Next Steps

After verifying the APIs work:
1. Build the UI components (BrandInputSection, ConceptSelector, etc.)
2. Integrate the prompt generator with the UI
3. Implement the sequential generation flow
4. Add error handling and loading states
