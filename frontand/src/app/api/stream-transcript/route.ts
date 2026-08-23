import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import path from 'path'
import fs from 'fs'
import os from 'os'
import crypto from 'crypto'
import YTDlpWrap from 'yt-dlp-wrap'
import Groq from 'groq-sdk'

export const maxDuration = 300

// Reuse the same yt-dlp binary from clip-maker
let ytDlpDownloadPromise: Promise<string> | null = null

async function ensureYtDlp(): Promise<string> {
  const ytDlpPath = path.join(
    process.cwd(), 'node_modules', 'yt-dlp-wrap',
    os.platform() === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  )
  if (fs.existsSync(ytDlpPath)) return ytDlpPath

  if (!ytDlpDownloadPromise) {
    ytDlpDownloadPromise = (async () => {
      const dir = path.dirname(ytDlpPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      await YTDlpWrap.downloadFromGithub(ytDlpPath)
      if (os.platform() !== 'win32') fs.chmodSync(ytDlpPath, '755')
      return ytDlpPath
    })()
  }
  return ytDlpDownloadPromise
}

// Download audio-only from any platform URL supported by yt-dlp
async function downloadAudio(url: string, outputPath: string): Promise<void> {
  const ytDlpPath = await ensureYtDlp()
  const ytDlp = new YTDlpWrap(ytDlpPath)

  const args = [
    url,
    '-f', 'bestaudio[ext=m4a]/bestaudio/best',
    '--no-playlist',
    '--no-cache-dir',
    '--no-part',
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '5',        // 128kbps - enough for Whisper
    '--postprocessor-args', '-ar 16000 -ac 1',  // 16kHz mono - optimal for Whisper
    '-o', outputPath,
  ]

  return new Promise((resolve, reject) => {
    const emitter = ytDlp.exec(args)
    emitter.on('close', resolve as any)
    emitter.on('error', reject)
  })
}

// Split large audio file into chunks under 25MB (Groq Whisper limit)
function getFileSizeMB(filePath: string): number {
  return fs.statSync(filePath).size / (1024 * 1024)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
  }

  const groqKey = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY
  if (!groqKey) {
    return NextResponse.json({ error: 'Server error: Groq API key not configured.' }, { status: 500 })
  }

  let audioPath: string | null = null

  try {
    const body = await req.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Stream URL is required.' }, { status: 400 })
    }

    // Detect platform
    const urlLower = url.toLowerCase()
    const isTwitch = urlLower.includes('twitch.tv')
    const isKick = urlLower.includes('kick.com')

    if (!isTwitch && !isKick) {
      return NextResponse.json({ error: 'Only Twitch and Kick URLs are supported.' }, { status: 400 })
    }

    // Create temp path for audio
    const tmpDir = os.tmpdir()
    const jobId = crypto.randomBytes(8).toString('hex')
    // yt-dlp will add .mp3 extension automatically
    const audioBase = path.join(tmpDir, `stream_audio_${jobId}`)
    audioPath = audioBase + '.mp3'

    // Step 1: Download audio only
    console.log(`[stream-transcript] Downloading audio from: ${url}`)
    await downloadAudio(url, audioBase + '.%(ext)s')

    // Confirm file exists
    if (!fs.existsSync(audioPath)) {
      // Try other possible extensions
      for (const ext of ['m4a', 'opus', 'webm', 'ogg']) {
        const alt = audioBase + '.' + ext
        if (fs.existsSync(alt)) { audioPath = alt; break }
      }
    }

    if (!audioPath || !fs.existsSync(audioPath)) {
      return NextResponse.json({ error: 'Failed to download audio from stream.' }, { status: 500 })
    }

    const fileSizeMB = getFileSizeMB(audioPath)
    console.log(`[stream-transcript] Audio downloaded: ${fileSizeMB.toFixed(1)}MB`)

    // Groq Whisper limit is 25MB
    if (fileSizeMB > 24) {
      return NextResponse.json({
        error: `Audio file is too large (${fileSizeMB.toFixed(0)}MB). Please use a shorter VOD or clip (under ~3 hours).`
      }, { status: 400 })
    }

    // Step 2: Transcribe with Groq Whisper
    const keys = groqKey.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0)
    const apiKey = keys[Math.floor(Math.random() * keys.length)]
    const groq = new Groq({ apiKey })

    console.log(`[stream-transcript] Transcribing with Groq Whisper...`)
    const audioStream = fs.createReadStream(audioPath)

    const transcription = await groq.audio.transcriptions.create({
      file: audioStream as any,
      model: 'whisper-large-v3-turbo',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })

    // Step 3: Format transcript with timestamps (same format as youtube-transcript)
    const segments = (transcription as any).segments || []
    let transcript = ''

    if (segments.length > 0) {
      transcript = segments.map((seg: any) => {
        const startSec = Math.round(seg.start)
        const h = Math.floor(startSec / 3600)
        const m = Math.floor((startSec % 3600) / 60)
        const s = startSec % 60
        const ts = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        return `[${ts}] ${seg.text.trim()}`
      }).join('\n')
    } else {
      transcript = (transcription as any).text || ''
    }

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json({ error: 'No speech detected in the stream audio.' }, { status: 404 })
    }

    return NextResponse.json({ transcript, hasTimestamps: segments.length > 0 })

  } catch (err: any) {
    console.error('[stream-transcript] Error:', err)
    const msg = err?.message || 'Failed to process stream'
    if (msg.includes('403') || msg.includes('forbidden')) {
      return NextResponse.json({ error: 'Stream platform blocked the request. Try a different VOD URL.' }, { status: 403 })
    }
    if (msg.includes('404') || msg.includes('not found')) {
      return NextResponse.json({ error: 'Stream VOD not found. Make sure the VOD is public and available.' }, { status: 404 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    // Clean up temp audio file
    if (audioPath && fs.existsSync(audioPath)) {
      try { fs.unlinkSync(audioPath) } catch { }
    }
  }
}
