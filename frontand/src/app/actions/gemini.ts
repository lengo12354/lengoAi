'use server'

import { createClient } from '@/lib/supabase/server'

export async function generateGeminiContent(
  systemPrompt: string,
  userPrompt: string,
  generationConfig: any
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized. Please log in.')
  }

  // Read either GEMINI_API_KEYS (comma separated) or GEMINI_API_KEY (single)
  const keysString = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY
  
  if (!keysString) {
    throw new Error('Server error: API keys are not configured.')
  }

  // Parse keys and remove any empty spaces
  const apiKeys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0)
  
  if (apiKeys.length === 0) {
    throw new Error('Server error: No valid API keys found.')
  }

  // Randomize (shuffle) the array to distribute the load evenly across all keys (Load Balancing)
  const shuffledKeys = [...apiKeys].sort(() => Math.random() - 0.5)

  let lastError = null

  // Try each key one by one until one succeeds
  for (const apiKey of shuffledKeys) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: generationConfig,
          }),
        }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err?.error?.message || `API error ${res.status}`
        throw new Error(msg)
      }

      const data = await res.json()
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

      if (!raw) {
        throw new Error('Empty response from Gemini.')
      }

      // If successful, return the data and break out of the loop
      return raw

    } catch (error: any) {
      // If there is an error (like Quota Exceeded 429), save it and let the loop try the next key
      console.warn(`[API Rotation] Key failed, trying next. Error: ${error.message}`)
      lastError = error
      continue
    }
  }

  // If the loop finishes and we are here, it means ALL keys failed
  throw new Error('⚠️ The server is currently under heavy load. Please try again in a few minutes.')
}
