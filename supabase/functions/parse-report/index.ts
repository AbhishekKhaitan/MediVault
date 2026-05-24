// supabase/functions/parse-report/index.ts
// Session 05 will build the full implementation.
// This is the brain of MediVault — OCR + Claude parsing.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_SYSTEM_PROMPT = `You are a medical record parser for Indian health records. Extract structured data from this lab report or prescription text. Return ONLY valid JSON with this exact structure:
{
  "document_type": "lab_report"|"prescription"|"discharge_summary"|"xray"|"other",
  "document_date": "YYYY-MM-DD or null",
  "doctor_name": "string or null",
  "hospital_name": "string or null",
  "lab_name": "string or null",
  "metrics": [
    {
      "name": "test name exactly as written",
      "value": numeric_value,
      "unit": "unit string",
      "reference_min": numeric or null,
      "reference_max": numeric or null,
      "is_flagged": true if outside reference range
    }
  ],
  "medications": [
    {
      "name": "drug name",
      "dosage": "500mg",
      "frequency": "twice daily",
      "duration": "5 days or null"
    }
  ],
  "plain_language_summary": "2-3 sentence explanation in simple English. A non-doctor Indian family member must understand it. Never use the word 'diagnosis'. Say what the numbers mean and if anything needs attention.",
  "flags": ["list of values outside normal range, in plain language"],
  "comparison_needed": true if this report type has been seen before for this member
}

Indian lab context: Common labs are Dr. Lal PathLabs, Thyrocare, SRL, Metropolis. H/L markers beside values indicate high/low. Hindi or regional language headers are possible — translate them. No preamble. No markdown. Return only the JSON object.`

const DISCLAIMER = 'This is for informational purposes only. Please consult your doctor for medical advice.'

const OCR_CONFIDENCE_THRESHOLD = 0.85

serve(async (req) => {
  try {
    const { documentId } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Fetch document record
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: 'Document not found' }), { status: 404 })
    }

    // Mark as processing
    await supabase
      .from('documents')
      .update({ parsing_status: 'processing' })
      .eq('id', documentId)

    // 2. Download image from Supabase Storage
    const { data: imageData, error: storageError } = await supabase.storage
      .from('documents')
      .download(doc.storage_path)

    if (storageError || !imageData) {
      throw new Error('Failed to download image from storage')
    }

    // 3. Send to Google Vision API for OCR
    const imageBytes = await imageData.arrayBuffer()
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBytes)))

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${Deno.env.get('GOOGLE_VISION_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Image },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          }],
        }),
      }
    )

    const visionData = await visionResponse.json()
    const annotation = visionData.responses?.[0]?.fullTextAnnotation
    const rawText = annotation?.text ?? ''

    // 4. Check confidence scores — flag numeric values below threshold
    const words = annotation?.pages?.[0]?.blocks
      ?.flatMap((b: any) => b.paragraphs)
      ?.flatMap((p: any) => p.words) ?? []

    const lowConfidenceValues: Array<{ text: string; confidence: number }> = []
    for (const word of words) {
      const confidence = word.confidence ?? 1
      const text = word.symbols?.map((s: any) => s.text).join('') ?? ''
      if (confidence < OCR_CONFIDENCE_THRESHOLD && /\d/.test(text)) {
        lowConfidenceValues.push({ text, confidence })
      }
    }

    const needsClarification = lowConfidenceValues.length > 0
      ? lowConfidenceValues.map((w) => ({
          field: w.text,
          question: `We couldn't read this value clearly (${(w.confidence * 100).toFixed(0)}% confident). What does it say?`,
          options: [],
          current_reading: w.text,
        }))
      : null

    // 5. Send OCR text to Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2048,
        system: CLAUDE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: rawText }],
      }),
    })

    const claudeData = await claudeResponse.json()
    const parsedText = claudeData.content?.[0]?.text ?? '{}'

    let parsed
    try {
      parsed = JSON.parse(parsedText)
    } catch {
      throw new Error('Claude returned invalid JSON')
    }

    // 6. Append disclaimer to summary
    if (parsed.plain_language_summary) {
      parsed.plain_language_summary = `${parsed.plain_language_summary} ${DISCLAIMER}`
    }

    // 7. Write metrics to health_metrics table
    if (parsed.metrics?.length > 0) {
      await supabase.from('health_metrics').insert(
        parsed.metrics.map((m: any) => ({
          family_id: doc.family_id,
          member_id: doc.member_id,
          document_id: documentId,
          metric_name: m.name,
          value: m.value,
          unit: m.unit,
          reference_min: m.reference_min,
          reference_max: m.reference_max,
          is_flagged: m.is_flagged,
          recorded_at: parsed.document_date ?? new Date().toISOString().split('T')[0],
        }))
      )
    }

    // 8. Write medications to medications table
    if (parsed.medications?.length > 0) {
      await supabase.from('medications').insert(
        parsed.medications.map((m: any) => ({
          family_id: doc.family_id,
          member_id: doc.member_id,
          document_id: documentId,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          is_active: true,
        }))
      )
    }

    // 9. Update document record
    await supabase
      .from('documents')
      .update({
        ocr_raw_text: rawText,
        ai_parsed: parsed,
        parsing_status: 'done',
        needs_user_clarification: needsClarification,
        doctor_name: parsed.doctor_name,
        hospital_name: parsed.hospital_name,
        document_date: parsed.document_date,
        document_type: parsed.document_type,
      })
      .eq('id', documentId)

    // 10. TODO (Session 07): Send push notification to family admin

    return new Response(JSON.stringify({ success: true, documentId }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('parse-report error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
