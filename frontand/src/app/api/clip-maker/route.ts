import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import crypto from 'crypto'
import YTDlpWrap from 'yt-dlp-wrap'
import { jobs } from './store'

export const maxDuration = 300

// Parse "HH:MM:SS" or "MM:SS" or plain seconds to number
function parseTimestamp(ts: string): number {
  const parts = ts.trim().split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parseFloat(ts) || 0
}

function getFFmpegPath(): string {
  const p = path.join(
    process.cwd(), 'node_modules', 'ffmpeg-static',
    os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  )
  if (!fs.existsSync(p)) throw new Error('FFmpeg binary not found at: ' + p)
  return p
}

let ytDlpDownloadPromise: Promise<string> | null = null;

async function ensureYtDlp(): Promise<string> {
  const ytDlpPath = path.join(
    process.cwd(), 'node_modules', 'yt-dlp-wrap',
    os.platform() === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  )
  if (fs.existsSync(ytDlpPath)) return ytDlpPath;

  if (!ytDlpDownloadPromise) {
    ytDlpDownloadPromise = (async () => {
      const dir = path.dirname(ytDlpPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      await YTDlpWrap.downloadFromGithub(ytDlpPath)
      if (os.platform() !== 'win32') fs.chmodSync(ytDlpPath, '755')
      return ytDlpPath
    })()
  }

  return ytDlpDownloadPromise;
}

// Step 1: Download section with yt-dlp
async function downloadSectionWithYtDlp(
  youtubeUrl: string,
  startSec: number,
  endSec: number,
  tempPath: string,
  ffmpegPath: string
): Promise<void> {
  const ytDlpPath = await ensureYtDlp()
  const ytDlp = new YTDlpWrap(ytDlpPath)

  console.log('[YT-DLP] ==============================');
  console.log('[YT-DLP] Attempting to download section for:', youtubeUrl);
  console.log('[YT-DLP] Environment:', { 
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV
  });

  // Log yt-dlp version
  try {
    await new Promise((res) => {
      let v = '';
      const p = spawn(ytDlpPath, ['--version']);
      p.stdout.on('data', d => v += d.toString());
      p.on('close', () => { console.log('[YT-DLP] Version:', v.trim()); res(null); });
      p.on('error', () => res(null));
    });
  } catch(e) { console.error('[YT-DLP] Failed to get version', e); }

  const ytDlpArgs = [
    youtubeUrl,
    '-f', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
    '-S', 'res:1080,ext:mp4:m4a',
    '--merge-output-format', 'mp4',
    '--download-sections', `*${startSec}-${endSec}`,
    '--ffmpeg-location', ffmpegPath,
    '--no-cache-dir',
    '--no-part',
    '-o', tempPath
  ]

  console.log('[YT-DLP] Executing with args:', ytDlpArgs.join(' '));

  return new Promise((resolve, reject) => {
    const ytDlpEmitter = ytDlp.exec(ytDlpArgs)

    let stdout = ''
    let stderr = ''
    ytDlpEmitter.on('ytDlpEvent', (eventType, eventData) => {
      if (eventType === 'youtubeDlEvent') stdout += eventData + '\n'
    })
    ytDlpEmitter.on('close', () => {
      console.log('[YT-DLP] Process closed. Output exists?', fs.existsSync(tempPath))
      if (!fs.existsSync(tempPath)) {
        console.error('[YT-DLP] Original stderr:\n', stderr)
        console.error('[YT-DLP] Original stdout:\n', stdout)
      }
      if (fs.existsSync(tempPath)) resolve()
      else reject(new Error(`yt-dlp failed to create output file. Log: ${stderr}`))
    })
    ytDlpEmitter.on('error', (error) => {
      console.error('[YT-DLP] Execution error:', error)
      stderr += error.message
      reject(error)
    })
  })
}

// Step 2: Run FFmpeg on the temp file
async function runFFmpegFromYouTube(
  jobId: string,
  youtubeUrl: string,
  startSec: number,
  endSec: number,
  format: '16:9' | '9:16' | '1:1',
  cropX: number,
  cropData: { x: number; y: number; width: number; height: number } | null
) {
  const duration = endSec - startSec
  const outputName = `clip_${jobId}.mp4`
  const outputPath = path.join(os.tmpdir(), outputName)
  const tempInput = path.join(os.tmpdir(), `yt_${jobId}.mp4`)
  const ffmpegPath = getFFmpegPath()

  // Update progress: downloading phase (0→50%)
  jobs.set(jobId, { status: 'processing', progress: 5 })

  try {
    await downloadSectionWithYtDlp(youtubeUrl, startSec, endSec, tempInput, ffmpegPath)
  } catch (err: any) {
    jobs.set(jobId, { status: 'error', progress: 0, error: `YouTube download failed: ${err.message}` })
    throw err
  }

  // Update: download done, now encoding (50→100%)
  jobs.set(jobId, { status: 'processing', progress: 50 })

  let vfFilter = ''

  if (format === '9:16') {
    if (cropData) {
      const { x, y, width, height } = cropData
      vfFilter = `crop=${Math.round(width)}:${Math.round(height)}:${Math.round(x)}:${Math.round(y)},scale=1080:1920:flags=lanczos`
    } else {
      vfFilter = `crop='ih*9/16':'ih':'(iw-ih*9/16)*${cropX}':0,scale=1080:1920:flags=lanczos`
    }
  } else if (format === '1:1') {
    vfFilter = `crop='min(iw,ih)':'min(iw,ih)':'(iw-min(iw,ih))*${cropX}':'(ih-min(iw,ih))/2',scale=1080:1080:flags=lanczos`
  } else if (format === '16:9') {
    // No scaling — yt-dlp already downloaded the best resolution natively
    // Applying scale would either upscale (pixelation) or be redundant
    vfFilter = ''
  }

  // We already downloaded only the required section, so no need for -ss here.
  const args: string[] = [
    '-y',
    '-i', tempInput,
  ]

  if (vfFilter) {
    args.push('-vf', vfFilter)
  }

  args.push(
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-threads', '2',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    outputPath
  )

  return new Promise<void>((resolve, reject) => {
    const ff = spawn(ffmpegPath, args)

    let stderr = ''
    ff.stderr.on('data', (chunk: Buffer) => {
      const line = chunk.toString()
      stderr += line
      const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/)
      if (timeMatch) {
        const elapsed =
          parseInt(timeMatch[1]) * 3600 +
          parseInt(timeMatch[2]) * 60 +
          parseFloat(timeMatch[3])
        // Map encoding progress from 50%→99%
        const encodePct = Math.min(1, elapsed / duration)
        const pct = Math.round(50 + encodePct * 49)
        const existing = jobs.get(jobId)
        if (existing) jobs.set(jobId, { ...existing, progress: pct })
      }
    })

    ff.on('close', (code) => {
      // Always clean up temp input
      try { if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput) } catch { }

      if (code === 0) {
        jobs.set(jobId, { status: 'done', progress: 100, outputPath, outputName })
        resolve()
      } else {
        // Show last 400 chars of stderr so user sees what actually failed
        const errDetail = stderr.slice(-400).trim()
        jobs.set(jobId, { status: 'error', progress: 0, error: errDetail || `FFmpeg failed (code ${code})` })
        reject(new Error(errDetail))
      }
    })

    ff.on('error', (err) => {
      try { if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput) } catch { }
      jobs.set(jobId, { status: 'error', progress: 0, error: err.message })
      reject(err)
    })
  })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const youtubeUrl = (formData.get('youtubeUrl') as string | null)?.trim()
    const startTs = (formData.get('start') as string | null)?.trim()
    const endTs = (formData.get('end') as string | null)?.trim()
    const format = ((formData.get('format') as string | null) || '16:9') as '16:9' | '9:16' | '1:1'

    let cropX = 0.5
    const cropXRaw = formData.get('cropX') as string | null
    if (cropXRaw) {
      const parsed = parseFloat(cropXRaw)
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) cropX = parsed
    }

    const cropRaw = formData.get('crop') as string | null

    if (!youtubeUrl) return NextResponse.json({ error: 'YouTube URL is required.' }, { status: 400 })
    const isYtUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(youtubeUrl)
    if (!isYtUrl) return NextResponse.json({ error: 'Invalid YouTube URL.' }, { status: 400 })
    if (!startTs || !endTs) return NextResponse.json({ error: 'Start and end timestamps are required.' }, { status: 400 })
    if (!['16:9', '9:16', '1:1'].includes(format)) return NextResponse.json({ error: 'Invalid format.' }, { status: 400 })

    let startSec = parseTimestamp(startTs)
    let endSec = parseTimestamp(endTs)

    // Add padding to prevent cutting off speech prematurely
    startSec = Math.max(0, startSec - 0.5)
    // No end padding as requested

    if (endSec <= startSec) return NextResponse.json({ error: 'End time must be after start time.' }, { status: 400 })
    if (endSec - startSec > 3600) return NextResponse.json({ error: 'Clip cannot exceed 1 hour.' }, { status: 400 })

    let cropData = null
    if (format === '9:16' && cropRaw) {
      try { cropData = JSON.parse(cropRaw) } catch { cropData = null }
    }

    const jobId = crypto.randomBytes(16).toString('hex')
    jobs.set(jobId, { status: 'processing', progress: 0 })

    // Fire-and-forget
    runFFmpegFromYouTube(jobId, youtubeUrl, startSec, endSec, format, cropX, cropData)
      .catch(() => { })

    return NextResponse.json({ jobId })
  } catch (error: any) {
    console.error('Clip Maker POST error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
