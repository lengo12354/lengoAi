import { NextResponse } from 'next/server'

export const maxDuration = 60 // 60 seconds timeout

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const language = formData.get('language') as string | null  // e.g. 'en', 'fr', 'ar', 'auto'
    const granularity = formData.get('granularity') as string | null  // 'segment' | 'word'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file size limit (100MB)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 100MB limit' }, { status: 400 })
    }

    // Prepare FormData for Groq
    const groqFormData = new FormData()
    groqFormData.append('file', file)
    groqFormData.append('model', 'whisper-large-v3-turbo')
    groqFormData.append('response_format', 'verbose_json')

    // Set language if not auto-detect
    // Avoid passing custom Darija codes to Whisper, let it auto-detect
    if (language && language !== 'auto' && !language.startsWith('darija')) {
      groqFormData.append('language', language)
    }

    // Set timestamp granularity
    if (granularity === 'word') {
      groqFormData.append('timestamp_granularities[]', 'word')
    } else {
      groqFormData.append('timestamp_granularities[]', 'segment')
    }

    console.log(`Sending to Groq API... File: ${(file.size / 1024 / 1024).toFixed(2)}MB | Lang: ${language || 'auto'} | Granularity: ${granularity || 'segment'}`)

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: groqFormData as any
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Groq API Error:', errorData)
      return NextResponse.json({ error: errorData?.error?.message || 'Failed to transcribe audio' }, { status: response.status })
    }

    const data = await response.json()

    // For word-level, Groq returns data.words instead of data.segments
    let segments = granularity === 'word'
      ? (data.words || []).map((w: any) => ({ text: w.word, start: w.start, end: w.end }))
      : (data.segments || [])

    let finalText = data.text

    // If Darija was selected, translate with Groq LLM
    if (language === 'darija-ar' || language === 'darija-fr') {
      const scriptInstruction = language === 'darija-ar'
        ? 'Translate the following text into Moroccan Darija written in Arabic script (الدارجة المغربية). Keep the same meaning and tone. Output ONLY the translated text, no explanations.'
        : 'Translate the following text into Moroccan Darija written in Latin/French script (e.g. "kifach ndir hada", "wach nta mzyan"). Keep the same meaning and tone. Output ONLY the translated Darija text, no explanations.'

      // Translate each segment
      if (segments.length > 0) {
        const translated = await Promise.all(segments.map(async (seg: any) => {
          const llmRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama3-8b-8192',
              messages: [
                { role: 'system', content: scriptInstruction },
                { role: 'user', content: seg.text }
              ],
              max_tokens: 200,
              temperature: 0.3,
            }),
          })
          const llmData = await llmRes.json()
          return { ...seg, text: llmData.choices?.[0]?.message?.content?.trim() || seg.text }
        }))
        segments = translated
        finalText = translated.map((s: any) => s.text).join(' ')
      } else {
        // Translate full text if no segments
        const llmRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [
              { role: 'system', content: scriptInstruction },
              { role: 'user', content: data.text }
            ],
            max_tokens: 1000,
            temperature: 0.3,
          }),
        })
        const llmData = await llmRes.json()
        finalText = llmData.choices?.[0]?.message?.content?.trim() || data.text
      }
    }

    return NextResponse.json({
      text: finalText,
      segments,
    })

  } catch (error: any) {
    console.error('Transcription error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
