import { NextResponse } from 'next/server'

export const maxDuration = 30

function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^"&?\/\s]{11})/i
  )
  return match ? match[1] : url.length === 11 ? url : null
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function parseJson3Captions(data: any): string {
  const events: any[] = data?.events ?? []
  const lines: string[] = []
  for (const event of events) {
    if (!event.segs) continue
    const offset: number = event.tStartMs ?? 0
    const text = event.segs
      .map((s: any) => s.utf8 ?? '')
      .join('')
      .replace(/\n/g, ' ')
      .trim()
    if (text && text !== '\n') lines.push(`[${formatTime(offset)}] ${text}`)
  }
  return lines.join('\n')
}

function parseXmlCaptions(xml: string): string {
  const lines: string[] = []
  const regex = /<text start="([^"]+)"[^>]*>([^<]*)<\/text>/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(xml)) !== null) {
    const offset = parseFloat(m[1]) * 1000
    const text = m[2]
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
    if (text) lines.push(`[${formatTime(offset)}] ${text}`)
  }
  return lines.join('\n')
}

// ── Strategy 1: YouTube InnerTube API (same as YouTube mobile app) ──────────
async function fetchViaInnerTube(videoId: string): Promise<string> {
  const INNERTUBE_CONTEXT = {
    client: {
      clientName: 'WEB',
      clientVersion: '2.20240101.00.00',
      hl: 'en',
      gl: 'US',
    },
  }

  const playerRes = await fetch('https://www.youtube.com/youtubei/v1/player', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-YouTube-Client-Name': '1',
      'X-YouTube-Client-Version': '2.20240101.00.00',
    },
    body: JSON.stringify({ videoId, context: INNERTUBE_CONTEXT }),
  })

  if (!playerRes.ok) throw new Error(`InnerTube /player returned HTTP ${playerRes.status}`)

  const playerData = await playerRes.json()

  const status: string = playerData?.playabilityStatus?.status ?? ''
  if (status === 'LOGIN_REQUIRED') throw new Error('PRIVATE_OR_RESTRICTED')
  if (status === 'ERROR') throw new Error('VIDEO_UNAVAILABLE')
  if (status === 'LIVE_STREAM') throw new Error('LIVE_STREAM')

  const tracks: any[] =
    playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []

  if (!tracks.length) throw new Error('NO_TRANSCRIPT')

  // Prefer manual English → auto English → any
  const track =
    tracks.find((t) => t.languageCode === 'en' && !t.kind) ||
    tracks.find((t) => t.languageCode === 'en') ||
    tracks.find((t) => !t.kind) ||
    tracks[0]

  // Fetch captions in JSON3 format (easier to parse)
  const captionUrl = `${track.baseUrl}&fmt=json3`
  const captionRes = await fetch(captionUrl)
  if (!captionRes.ok) throw new Error(`Caption fetch returned HTTP ${captionRes.status}`)

  const captionData = await captionRes.json()
  const transcript = parseJson3Captions(captionData)
  if (!transcript) throw new Error('NO_TRANSCRIPT')
  return transcript
}

// ── Strategy 2: Direct timedtext API (fallback) ──────────────────────────────
async function fetchViaTimedText(videoId: string): Promise<string> {
  const langs = ['en', 'a.en', 'ar', 'fr', 'es', 'pt', 'de', 'hi']

  for (const lang of langs) {
    const isAuto = lang.startsWith('a.')
    const code = isAuto ? lang.slice(2) : lang
    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${code}${isAuto ? '&kind=asr' : ''}&fmt=json3`

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
      })
      if (!res.ok) continue
      const data = await res.json()
      const transcript = parseJson3Captions(data)
      if (transcript) return transcript
    } catch {
      continue
    }
  }
  throw new Error('NO_TRANSCRIPT')
}

// ── Strategy 3: XML timedtext (last resort) ───────────────────────────────────
async function fetchViaXmlTimedText(videoId: string): Promise<string> {
  const langs = ['en', 'ar', 'fr', 'es']
  for (const lang of langs) {
    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const xml = await res.text()
      const transcript = parseXmlCaptions(xml)
      if (transcript) return transcript
    } catch {
      continue
    }
  }
  throw new Error('NO_TRANSCRIPT')
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    if (!url) {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 })
    }

    const videoId = extractVideoId(url)
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL.' }, { status: 400 })
    }

    // Try all strategies in order
    const strategies = [
      { name: 'InnerTube', fn: () => fetchViaInnerTube(videoId) },
      { name: 'TimedText JSON3', fn: () => fetchViaTimedText(videoId) },
      { name: 'TimedText XML', fn: () => fetchViaXmlTimedText(videoId) },
    ]

    let lastError: any = null
    for (const { name, fn } of strategies) {
      try {
        const transcript = await fn()
        console.log(`[Transcript] Success via ${name} for video ${videoId}`)
        return NextResponse.json({ transcript })
      } catch (err: any) {
        console.warn(`[Transcript] ${name} failed:`, err.message)
        lastError = err
        // Don't try more if the video itself is unavailable
        if (
          err.message === 'PRIVATE_OR_RESTRICTED' ||
          err.message === 'VIDEO_UNAVAILABLE' ||
          err.message === 'LIVE_STREAM'
        ) {
          break
        }
      }
    }

    // Map internal error codes to user messages
    const msg = lastError?.message ?? 'NO_TRANSCRIPT'
    if (msg === 'PRIVATE_OR_RESTRICTED') {
      return NextResponse.json(
        { error: 'This video is private or age-restricted and cannot be accessed.' },
        { status: 403 }
      )
    }
    if (msg === 'VIDEO_UNAVAILABLE') {
      return NextResponse.json(
        { error: 'This video is unavailable. It may have been deleted or is geo-restricted.' },
        { status: 404 }
      )
    }
    if (msg === 'LIVE_STREAM') {
      return NextResponse.json(
        { error: 'Live streams do not have transcripts. Please try after the stream ends and captions are generated.' },
        { status: 422 }
      )
    }

    return NextResponse.json(
      {
        error:
          "No transcript found for this video. The video may not have captions enabled, or they are auto-generated and still processing. Try a video with closed captions.",
      },
      { status: 404 }
    )
  } catch (error: any) {
    console.error('[Transcript] Unexpected error:', error?.message)
    return NextResponse.json({ error: 'Server error: ' + (error?.message ?? 'Unknown') }, { status: 500 })
  }
}
