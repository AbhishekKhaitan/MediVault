// lib/ocr.ts — Google Vision API helpers (called from Edge Functions only)
// This file is a type-reference for the edge function — not called from the client.

export interface VisionWord {
  text: string
  confidence: number
}

export interface VisionResponse {
  fullText: string
  words: VisionWord[]
  lowConfidenceValues: VisionWord[]  // confidence < 0.85
}

// Confidence threshold for flagging values that need user clarification
export const OCR_CONFIDENCE_THRESHOLD = 0.85
