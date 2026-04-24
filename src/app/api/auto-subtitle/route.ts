import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import crypto from 'crypto'
import { promisify } from 'util'
import Groq from 'groq-sdk'

export const maxDuration = 300

const unlinkAsync = promisify(fs.unlink)

// Convert seconds to SRT timestamp format: 00:00:01,500
function toSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

// Strip all punctuation from text — Arabic and Latin
function stripPunctuation(text: string): string {
  return text
    .replace(/[.,،؟?!؛;:،"'«»()\[\]{}\-–—]/g, '') // common punctuation
    .replace(/\s+/g, ' ') // normalize spaces
    .trim()
}

// PAUSE_THRESHOLD: if silence between words > this value (seconds), start a new subtitle line
const PAUSE_THRESHOLD = 0.35

interface Word { word: string; start: number; end: number }

// Build SRT from word-level timestamps — one subtitle per natural spoken phrase (pause-based)
function wordsToSrt(words: Word[]): string {
  if (!words || words.length === 0) return ''

  const lines: { start: number; end: number; text: string }[] = []
  let currentWords: string[] = []
  let lineStart = words[0].start
  let prevEnd = words[0].end

  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const clean = stripPunctuation(w.word)
    if (!clean) { prevEnd = w.end; continue }

    const gap = i > 0 ? w.start - prevEnd : 0

    // New subtitle when there's a significant pause
    if (gap > PAUSE_THRESHOLD && currentWords.length > 0) {
      lines.push({ start: lineStart, end: prevEnd, text: currentWords.join(' ') })
      currentWords = []
      lineStart = w.start
    }

    currentWords.push(clean)
    prevEnd = w.end
  }

  // Push last line
  if (currentWords.length > 0) {
    lines.push({ start: lineStart, end: prevEnd, text: currentWords.join(' ') })
  }

  return lines
    .map((line, i) => `${i + 1}\n${toSrtTime(line.start)} --> ${toSrtTime(line.end)}\n${line.text}`)
    .join('\n\n')
}

export async function POST(req: Request) {
  let uploadedFilePath = ''
  let mp3Path = ''
  let chunkFiles: string[] = []

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const language = formData.get('language') as string | null

    if (!file || !language) {
      return NextResponse.json({ error: 'File and language are required' }, { status: 400 })
    }

    if (file.size > 200 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 200MB limit' }, { status: 400 })
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY is missing in .env.local' }, { status: 500 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const randId = crypto.randomBytes(16).toString('hex')
    const originalExt = path.extname(file.name) || '.tmp'

    uploadedFilePath = path.join(os.tmpdir(), `${randId}_in${originalExt}`)
    fs.writeFileSync(uploadedFilePath, buffer)

    const ffmpegExePath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
    if (!fs.existsSync(ffmpegExePath)) throw new Error(`FFMPEG binary not found`)

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    let srtOutput = ''

    if (language === 'other') {
      // Original logic for "other" languages
      mp3Path = path.join(os.tmpdir(), `${randId}_out.mp3`)
      console.log(`[Auto-Subtitle] Extracting audio for other language...`)
      await new Promise((resolve, reject) => {
        const ffmpeg = spawn(ffmpegExePath, [
          '-y', '-i', uploadedFilePath,
          '-vn', '-ac', '1', '-ar', '16000', '-ab', '64k',
          mp3Path
        ])
        let stderr = ''
        ffmpeg.stderr.on('data', (d) => { stderr += d.toString() })
        ffmpeg.on('close', (code) => code === 0 ? resolve(true) : reject(new Error(`FFMPEG failed: ${stderr}`)))
        ffmpeg.on('error', reject)
      })

      console.log(`[Auto-Subtitle] Whisper → auto-detect language...`)
      const result = await groq.audio.transcriptions.create({
        file: fs.createReadStream(mp3Path),
        model: 'whisper-large-v3',
        response_format: 'verbose_json',
        timestamp_granularities: ['word'],
      }) as any
      srtOutput = wordsToSrt(result.words || [])

    } else {
      // Advanced logic for Darija (darija_ar and darija_fr)
      console.log(`[Auto-Subtitle] Preprocessing and segmenting audio for Darija...`)
      const chunkPattern = path.join(os.tmpdir(), `${randId}_chunk_%03d.wav`)
      
      // Convert to 16kHz mono WAV, normalize (loudnorm), and split into 60s chunks
      await new Promise((resolve, reject) => {
        const ffmpeg = spawn(ffmpegExePath, [
          '-y', '-i', uploadedFilePath,
          '-vn', '-ac', '1', '-ar', '16000', '-af', 'loudnorm',
          '-f', 'segment', '-segment_time', '60',
          chunkPattern
        ])
        let stderr = ''
        ffmpeg.stderr.on('data', (d) => { stderr += d.toString() })
        ffmpeg.on('close', (code) => code === 0 ? resolve(true) : reject(new Error(`FFMPEG segment failed: ${stderr}`)))
        ffmpeg.on('error', reject)
      })

      // Find all generated chunk files
      const tmpFiles = fs.readdirSync(os.tmpdir())
      chunkFiles = tmpFiles
        .filter(f => f.startsWith(`${randId}_chunk_`) && f.endsWith('.wav'))
        .sort()
        .map(f => path.join(os.tmpdir(), f))

      console.log(`[Auto-Subtitle] Processing ${chunkFiles.length} chunks with Whisper (temp=0)...`)
      let allWords: Word[] = []
      
      for (let i = 0; i < chunkFiles.length; i++) {
        const chunkFile = chunkFiles[i]
        const offset = i * 60 // 60 seconds per chunk
        
        const result = await groq.audio.transcriptions.create({
          file: fs.createReadStream(chunkFile),
          model: 'whisper-large-v3',
          temperature: 0, // Enforce deterministic output
          // removed language: 'ar' to allow auto-detect as requested
          prompt: 'واش، داك، دابا، آخاي، صافي، واخا، بغيت، كاين، مزيان، ولا، فاش، كيفاش، ما عرفتش، ماشي، برك، هادشي، لبارح، كاع، بزاف، شوية، راه، علاش، نتيا',
          response_format: 'verbose_json',
          timestamp_granularities: ['word'],
        }) as any

        const words: Word[] = result.words || []
        for (const w of words) {
          allWords.push({
            word: w.word,
            start: w.start + offset,
            end: w.end + offset
          })
        }
      }

      const arabicSrt = wordsToSrt(allWords)

      if (language === 'darija_ar') {
        console.log(`[Auto-Subtitle] LLaMA-3 → correcting Darija Arabic...`)
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are a Moroccan Darija transcription corrector.
Fix errors, split merged words, and convert to natural Darija.
Keep timestamps EXACT.
Do not translate.
If unclear, write [غير واضح].
Return only SRT.`
            },
            { role: 'user', content: arabicSrt }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 4096,
        })
        srtOutput = completion.choices[0]?.message?.content || arabicSrt

      } else if (language === 'darija_fr') {
        console.log(`[Auto-Subtitle] LLaMA-3 → correcting and transliterating to Franco...`)
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are a Moroccan Darija transliterator and corrector.
Convert SRT subtitle text from Arabic script to Moroccan Darija written in Latin/Franco script.

STRICT RULES:
1. Fix errors, split merged words, and convert to natural Darija.
2. Read the full transcript first before translating.
3. Keep the Moroccan personality and humor.
4. Use common Darija words: واش، بزاف، دابا، خاصك، كاين
5. Never use Fusha words if a Darija equivalent exists.
6. Keep ALL index numbers EXACTLY (e.g. "1", "2")
7. Keep ALL timestamps EXACTLY (e.g. "00:00:01,500 --> 00:00:03,200")
8. ONLY convert the Arabic text lines to Franco/Latin — do NOT change timestamps or numbers
9. Do NOT translate to French or English — write how Moroccans pronounce it in Latin letters
10. Franco rules: ع=3, خ=kh, ش=ch, ح=7, غ=gh, ق=9, ر=r
11. Examples: "صافي"→"safi", "واش"→"wach", "دابا"→"daba", "آخاي"→"akhay", "ماشي"→"machi", "بزاف"→"bzzaf"
12. Output ONLY valid SRT. No explanations, no markdown.`
            },
            { role: 'user', content: arabicSrt }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 4096,
        })
        srtOutput = completion.choices[0]?.message?.content || arabicSrt
      }
    }

    // Cleanup files
    Promise.all([
      unlinkAsync(uploadedFilePath).catch(() => {}),
      mp3Path ? unlinkAsync(mp3Path).catch(() => {}) : Promise.resolve(),
      ...chunkFiles.map(f => unlinkAsync(f).catch(() => {}))
    ])

    return new NextResponse(srtOutput, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="subtitles_${file.name.replace(/\.[^/.]+$/, '')}.srt"`,
      },
    })

  } catch (error: any) {
    console.error('Auto-Subtitle error:', error)
    // Cleanup files on error
    try {
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) await unlinkAsync(uploadedFilePath)
      if (mp3Path && fs.existsSync(mp3Path)) await unlinkAsync(mp3Path)
      for (const f of chunkFiles) {
        if (fs.existsSync(f)) await unlinkAsync(f)
      }
    } catch (e) {}
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
