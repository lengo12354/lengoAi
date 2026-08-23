import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { transcript, numClips = 5, durationFormat = 'reel', hasTimestamps, selectedTypes, streamContext } = body

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'Transcript is required.' }, { status: 400 })
    }

    if (transcript.length > 500_000) {
      return NextResponse.json({ error: 'Transcript too large (max 500KB).' }, { status: 400 })
    }

    const keysString = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY
    if (!keysString) {
      return NextResponse.json({ error: 'Server error: API keys not configured.' }, { status: 500 })
    }
    const apiKeys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0)
    const shuffledKeys = [...apiKeys].sort(() => Math.random() - 0.5)

    const noTimestampWarning = !hasTimestamps
      ? `IMPORTANT: This transcript has NO timestamps. You must NOT invent timestamps. For every clip, set "start": null and "end": null, and add a note in the reason explaining timestamps are unavailable.`
      : `Use ONLY the exact timestamps present in the transcript. Do NOT invent or approximate timestamps.`

    const prompt = durationFormat === 'youtube' ? `You are an expert stream summarizer and segmenter.

${noTimestampWarning}

Analyze the transcript below and segment the entire video into LONG logical chapters/sections based on the topics discussed.
Each segment MUST BE AT LEAST 8 MINUTES LONG (if the source video allows it). Do NOT create short highlights!
Provide large, continuous blocks of content (e.g., 0:00 to 15:00 Reaction to..., 15:00 to 35:00 Playing game, 35:00 to 55:00 Q&A).
Combine smaller related topics into single long segments so that each returned clip is a substantial YouTube video on its own.

CRITICAL CONTENT FILTER RULE: Do NOT include or select any segments that involve discussions about sex, sexual topics, illicit drugs, or any NSFW (Not Safe For Work) content. Skip over these completely.

Return ONLY a valid JSON object in this exact structure:
{
  "clips": [
    {
      "clipNumber": 1,
      "start": "HH:MM:SS or null",
      "end": "HH:MM:SS or null",
      "score": 100,
      "type": "Educational",
      "title": "Short catchy title for this segment (e.g. 'Reacting to the Craziest Clip', 'Full Among Us Session'). MUST be in the SAME language as the transcript. Max 8 words."
    }
  ]
}

TRANSCRIPT:
${transcript}` : `You are an expert viral content strategist who identifies the strongest potential viral moments from transcripts.

${noTimestampWarning}

Analyze the transcript below and identify the TOP ${numClips} most viral moments.

CRITICAL RULE: IGNORE THE FIRST 3 MINUTES of the video (any timestamps before 00:03:00). The beginning is usually just an intro or a highlight reel of the best moments. Do NOT select any clips from this intro section!

CRITICAL CONTENT FILTER RULE: Do NOT select any clips that discuss sex, sexual topics, illicit drugs, or any explicitly NSFW (Not Safe For Work) content. Completely ignore these topics even if they seem viral.

Preferred clip length: between 30 seconds and 120 seconds. Do NOT create clips shorter than 30 seconds (they lack context). Do not exceed 120 seconds. Ensure it is a complete moment with context and payoff. VERY IMPORTANT: Do not cut the speech prematurely. Ensure the thought or sentence is fully finished before ending the clip.

${Array.isArray(selectedTypes) && selectedTypes.length > 0 ? `CRITICAL INSTRUCTION: The user specifically requested clips of the following types: ${selectedTypes.join(', ')}. You MUST prioritize finding clips that match these types.` : ''}

${streamContext ? `CRITICAL CONTEXT FROM USER: "${streamContext}". Use this context to find the best possible clips. For example, if it's a specific game, look for high-action moments, aces, or intense clutches. Follow the gameplay narrative.` : ''}

### CLIP SELECTION LOGIC
Do NOT just pick random interesting sentences, but also do NOT force every clip to be a "story" or have a long setup.

First, identify the type of moment. A clip can be any strong moment, such as:
- Strong statement / Strong opinion
- Funny moment / Joke / Punchline
- Reaction / Unexpected statement
- Controversial opinion / Interesting answer
- Emotional moment / Interesting fact
- Explanation / Debate / Argument
- Story / Surprise / Reveal

### CONTEXT RULE: Minimum necessary context + strongest moment
Determine how much context this specific type of moment needs:
- A strong quote may work almost by itself.
- A joke may need the setup + punchline.
- A story may need more context and a conclusion.
- A strong opinion may need the statement + enough explanation.
- A reaction may need the event or sentence that caused the reaction.

Include enough surrounding transcript to make the moment understandable and natural. Do NOT add unnecessary context just to make the clip longer.

### IMPORTANT DISTINCTIONS
- The strongest sentence does NOT always have to be the beginning of the clip. If the viewer needs one or two sentences before it to understand what is being discussed, include them. If it makes sense by itself, start close to the moment.
- Do not automatically extend the clip after the interesting statement. Only extend if the viewer needs the following context, answer, reaction, punchline, or conclusion.
- A clip does NOT need to tell a story. It only needs to be a strong, understandable, engaging moment that works as a standalone clip.

### QUALITY TEST
Before finalizing a clip's start and end, ask yourself:
"Does this selected section make sense and feel valuable on its own?"
If YES -> keep it.
If NO -> adjust the start/end to add the necessary context.
If adding context still does not make it a good standalone clip -> reject it entirely.

Return ONLY a valid JSON object in this exact structure (no markdown, no code blocks, no explanation):
{
  "clips": [
    {
      "clipNumber": 1,
      "start": "HH:MM:SS or null",
      "end": "HH:MM:SS or null",
      "score": 85,
      "type": "Story",
      "title": "Short catchy title for this viral moment. MUST be written in the SAME language as the transcript. Max 8 words."
    }
  ]
}

Valid types: Story, Funny, Emotional, Unexpected, Opinion, Educational, Controversial

TRANSCRIPT:
${transcript}`

    let lastError: any = null
    for (const apiKey of shuffledKeys) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                responseMimeType: 'application/json',
              },
            }),
          }
        )
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error?.message || `API error ${res.status}`)
        }
        const data = await res.json()
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (!raw) throw new Error('Empty response from Gemini.')

        // Parse and validate
        let parsed: any
        try {
          // Strip possible markdown fences
          const cleaned = raw.replace(/^```[\w]*\n?/gm, '').replace(/^```$/gm, '').trim()
          parsed = JSON.parse(cleaned)
        } catch {
          throw new Error('Invalid JSON from Gemini: ' + raw.substring(0, 200))
        }

        if (!parsed?.clips || !Array.isArray(parsed.clips)) {
          throw new Error('Malformed response: missing clips array.')
        }

        // Validate each clip
        const validTypes = ['Story', 'Funny', 'Emotional', 'Unexpected', 'Opinion', 'Educational', 'Controversial']
        const validClips = parsed.clips.map((c: any, i: number) => ({
          clipNumber: c.clipNumber ?? i + 1,
          start: typeof c.start === 'string' ? c.start : null,
          end: typeof c.end === 'string' ? c.end : null,
          score: typeof c.score === 'number' ? Math.min(100, Math.max(0, c.score)) : 50,
          type: validTypes.includes(c.type) ? c.type : 'Story',
          title: typeof c.title === 'string' ? c.title : '',
        }))

        return NextResponse.json({ clips: validClips, hasTimestamps })
      } catch (e: any) {
        console.warn('[Viral Clips] Key failed:', e.message)
        lastError = e
        continue
      }
    }

    throw lastError || new Error('All API keys failed.')
  } catch (error: any) {
    console.error('Viral Clips API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
