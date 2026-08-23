import { NextResponse } from 'next/server'

export const maxDuration = 30

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^"&?\/\s]{11})/i
  )
  return match ? match[1] : (url.length === 11 ? url : null)
}

// Parse YouTube XML caption format into structured entries
function parseCaptionXml(xml: string): { offset: number; text: string }[] {
  const results: { offset: number; text: string }[] = []
  const regex = /<text start="([^"]+)"[^>]*dur="([^"]+)"[^>]*>([^<]*)<\/text>/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(xml)) !== null) {
    const offset = parseFloat(m[1]) * 1000 // convert to ms
    const rawText = m[3]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .trim()
    if (rawText) results.push({ offset, text: rawText })
  }
  return results
}

// Format ms offset → HH:MM:SS
function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

async function fetchTranscriptFromYouTube(videoId: string): Promise<string> {
  // Real browser headers to bypass YouTube IP blocks on cloud providers
  const headers: HeadersInit = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Cookie: 'CONSENT=YES+cb.20210328-17-p0.en+FX+634; YSC=abc123; VISITOR_INFO1_LIVE=abc',
  }

  // 1. Fetch the YouTube video page
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, { headers })
  if (!pageRes.ok) throw new Error(`YouTube page returned ${pageRes.status}`)
  const html = await pageRes.text()

  // 2. Extract ytInitialPlayerResponse JSON from the page
  const playerMatch =
    html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;[\s\n]*(?:var|const|let|window|<)/) ||
    html.match(/ytInitialPlayerResponse\s*=\s*({[\s\S]+?})\s*;/)
  if (!playerMatch) throw new Error('Could not find player response in YouTube page.')

  let playerResponse: any
  try {
    playerResponse = JSON.parse(playerMatch[1])
  } catch {
    throw new Error('Failed to parse YouTube player response JSON.')
  }

  // 3. Get caption tracks
  const captionTracks: any[] =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []

  if (!captionTracks.length) {
    // Check if video exists but has no captions
    const status = playerResponse?.playabilityStatus?.status
    if (status === 'LOGIN_REQUIRED') throw new Error('Video is private or age-restricted.')
    if (status === 'ERROR') throw new Error('Video is unavailable.')
    throw new Error('No transcript found for this video')
  }

  // 4. Prefer: English manual → English auto → any manual → any track
  const preferred =
    captionTracks.find((t) => t.languageCode === 'en' && !t.kind) ||
    captionTracks.find((t) => t.languageCode === 'en') ||
    captionTracks.find((t) => !t.kind) ||
    captionTracks[0]

  const captionUrl: string = preferred.baseUrl

  // 5. Fetch the actual captions XML
  const captionRes = await fetch(captionUrl, { headers })
  if (!captionRes.ok) throw new Error(`Caption fetch failed with status ${captionRes.status}`)
  const captionXml = await captionRes.text()

  // 6. Parse & format with timestamps
  const entries = parseCaptionXml(captionXml)
  if (!entries.length) throw new Error('Transcript is empty or could not be parsed.')

  return entries.map((e) => `[${formatTime(e.offset)}] ${e.text}`).join('\n')
}

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

    const transcript = await fetchTranscriptFromYouTube(videoId)
    return NextResponse.json({ transcript })
  } catch (error: any) {
    console.error('YouTube Transcript Error:', error?.message)

    let errMsg: string = error?.message || 'Failed to fetch transcript.'

    if (
      errMsg.includes('No transcript') ||
      errMsg.includes('no caption') ||
      errMsg.includes('Transcript is disabled')
    ) {
      errMsg =
        "This video doesn't have captions/subtitles available. Our AI needs captions to find the best moments. Try a video that has closed captions enabled."
    } else if (errMsg.includes('private') || errMsg.includes('age-restricted')) {
      errMsg = 'This video is private or age-restricted and cannot be accessed.'
    } else if (errMsg.includes('unavailable')) {
      errMsg = 'This video is unavailable. It might be deleted or geo-restricted.'
    }

    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
