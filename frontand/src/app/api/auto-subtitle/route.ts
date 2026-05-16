import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import crypto from 'crypto'
import { promisify } from 'util'
import Groq from 'groq-sdk'
import { generateGeminiContent } from '@/app/actions/gemini'

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

function wordsToSrt(words: Word[], options: { maxLength: number, minDuration: number, gapFrames: number, maxLines: number }): string {
  if (!words || words.length === 0) return ''

  const { maxLength, minDuration, gapFrames, maxLines } = options
  const gapSeconds = gapFrames / 24 // assuming 24 fps

  const PAUSE_THRESHOLD = 0.35

  const blocks: { start: number; end: number; lines: string[] }[] = []

  let currentBlockLines: string[] = []
  let currentLineWords: string[] = []
  let blockStart = words[0].start
  let prevEnd = words[0].end

  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const clean = stripPunctuation(w.word)
    if (!clean) { prevEnd = w.end; continue }

    const gap = i > 0 ? w.start - prevEnd : 0

    const currentLineLength = currentLineWords.join(' ').length
    const potentialLength = currentLineLength === 0 ? clean.length : currentLineLength + 1 + clean.length

    let startNewBlock = false
    let startNewLine = false

    if (gap > PAUSE_THRESHOLD) {
      startNewBlock = true
    } else if (potentialLength > maxLength) {
      if (currentBlockLines.length + 1 >= maxLines) {
        startNewBlock = true
      } else {
        startNewLine = true
      }
    }

    if (startNewBlock) {
      if (currentLineWords.length > 0) {
        currentBlockLines.push(currentLineWords.join(' '))
      }
      if (currentBlockLines.length > 0) {
        let finalEnd = prevEnd
        if (finalEnd - blockStart < minDuration) {
          finalEnd = blockStart + minDuration
        }
        blocks.push({ start: blockStart, end: finalEnd, lines: currentBlockLines })
      }

      currentBlockLines = []
      currentLineWords = [clean]
      blockStart = w.start
    } else if (startNewLine) {
      currentBlockLines.push(currentLineWords.join(' '))
      currentLineWords = [clean]
    } else {
      currentLineWords.push(clean)
    }

    prevEnd = w.end
  }

  if (currentLineWords.length > 0) {
    currentBlockLines.push(currentLineWords.join(' '))
  }
  if (currentBlockLines.length > 0) {
    let finalEnd = prevEnd
    if (finalEnd - blockStart < minDuration) {
      finalEnd = blockStart + minDuration
    }
    blocks.push({ start: blockStart, end: finalEnd, lines: currentBlockLines })
  }

  // apply gapFrames
  for (let i = 0; i < blocks.length - 1; i++) {
    const current = blocks[i]
    const next = blocks[i + 1]

    if (current.end > next.start - gapSeconds) {
      current.end = Math.max(current.start + 0.1, next.start - gapSeconds)
    }
  }

  return blocks
    .map((block, i) => `${i + 1}\n${toSrtTime(block.start)} --> ${toSrtTime(block.end)}\n${block.lines.join('\n')}`)
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

    const groqKeysString = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY
    if (!groqKeysString) {
      return NextResponse.json({ error: 'GROQ_API_KEYS are missing in .env.local' }, { status: 500 })
    }
    
    const groqKeys = groqKeysString.split(',').map(k => k.trim()).filter(k => k.length > 0)
    if (groqKeys.length === 0) {
      return NextResponse.json({ error: 'No valid GROQ_API_KEYS found.' }, { status: 500 })
    }

    const shuffledGroqKeys = [...groqKeys].sort(() => Math.random() - 0.5)

    async function transcribeWithGroq(options: any) {
      let lastError = null
      for (const key of shuffledGroqKeys) {
        try {
          const client = new Groq({ apiKey: key })
          // Re-create the stream on every attempt since the stream gets consumed
          const fileStream = fs.createReadStream(options.filePath)
          const result = await client.audio.transcriptions.create({
            ...options.params,
            file: fileStream
          })
          return result
        } catch (e: any) {
          console.warn(`[Groq Rotation] Key failed, trying next. Error: ${e.message}`)
          lastError = e
          continue
        }
      }
      throw new Error('⚠️ The server is currently under heavy load. Please try again in a few minutes.')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const randId = crypto.randomBytes(16).toString('hex')
    const originalExt = path.extname(file.name) || '.tmp'

    uploadedFilePath = path.join(os.tmpdir(), `${randId}_in${originalExt}`)
    fs.writeFileSync(uploadedFilePath, buffer)

    const ffmpegExePath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
    if (!fs.existsSync(ffmpegExePath)) throw new Error(`FFMPEG binary not found`)


    let srtOutput = ''

    const maxLength = parseInt((formData.get('maxLength') as string) || '42')
    const minDuration = parseFloat((formData.get('minDuration') as string) || '0')
    const gapFrames = parseInt((formData.get('gapFrames') as string) || '0')
    const maxLines = parseInt((formData.get('maxLines') as string) || '1')
    const srtOptions = { maxLength, minDuration, gapFrames, maxLines }

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
      const result = await transcribeWithGroq({
        filePath: mp3Path,
        params: {
          model: 'whisper-large-v3',
          response_format: 'verbose_json',
          timestamp_granularities: ['word'],
        }
      }) as any
      srtOutput = wordsToSrt(result.words || [], srtOptions)

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

        const result = await transcribeWithGroq({
          filePath: chunkFile,
          params: {
            model: 'whisper-large-v3',
            temperature: 0,
            prompt: 'واش، داك، دابا، آخاي، صافي، واخا، بغيت، كاين، مزيان، ولا، فاش، كيفاش، ما عرفتش، ماشي، برك، هادشي، لبارح، كاع، بزاف، شوية، راه، علاش، نتيا',
            response_format: 'verbose_json',
            timestamp_granularities: ['word'],
          }
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

      const arabicSrt = wordsToSrt(allWords, srtOptions)

      // Split SRT into batches of N blocks to reduce tokens per request
      function splitSrtBlocks(srt: string, batchSize: number): string[] {
        const blocks = srt.split(/\n\n+/).filter(b => b.trim())
        const batches: string[] = []
        for (let i = 0; i < blocks.length; i += batchSize) {
          batches.push(blocks.slice(i, i + batchSize).join('\n\n'))
        }
        return batches
      }

      async function processWithGemini(systemPrompt: string, srt: string): Promise<string> {
        const BATCH_SIZE = 50 // ~50 subtitle blocks per request = much fewer tokens
        const batches = splitSrtBlocks(srt, BATCH_SIZE)
        console.log(`[Auto-Subtitle] Processing ${batches.length} batch(es) with Gemini 2.5 Flash...`)
        const results: string[] = []
        for (const batch of batches) {
          const prompt = `${systemPrompt}\n\nSRT INPUT:\n${batch}`
          const raw = await generateGeminiContent(
            "You are a helpful assistant.", // Minimal system prompt as the main logic is in the user prompt below
            prompt,
            { temperature: 0.1, responseMimeType: "text/plain" }
          )
          const cleaned = raw.replace(/^```[\w]*\n?/gm, '').replace(/^```$/gm, '').trim()
          results.push(cleaned || batch)
        }
        return results.join('\n\n')
      }

      if (language === 'darija_ar') {
        console.log(`[Auto-Subtitle] Gemini 2.5 Flash → correcting Darija Arabic...`)
        const systemPrompt = `You are a Moroccan Darija transcription corrector.
Fix errors, split merged words, and convert to natural Darija.
STRICT RULES:
1. Keep ALL index numbers and timestamps EXACTLY as they are.
2. DO NOT MERGE lines or blocks together. Maintain the exact same number of lines and blocks. PRESERVE ALL LINE BREAKS (\n) inside the text blocks.
3. DO NOT add any punctuation (no periods, commas, or question marks). Strip them if present.
4. Do not translate to other languages.
5. If unclear, write [غير واضح].
Return ONLY valid SRT. No markdown, no explanation.`
        srtOutput = await processWithGemini(systemPrompt, arabicSrt)

      } else if (language === 'darija_fr') {
        console.log(`[Auto-Subtitle] Gemini 2.5 Flash → transliterating Darija to Franco...`)
        const systemPrompt = `You are a Moroccan Darija transliterator and corrector.
Convert SRT subtitle text from Arabic script to Moroccan Darija written in Latin/Franco script.
STRICT RULES:
1. Fix errors, split merged words, and convert to natural Darija.
2. DO NOT MERGE lines or blocks together. Maintain the exact same number of lines and blocks. PRESERVE ALL LINE BREAKS (\n) inside the text blocks.
3. DO NOT add any punctuation (no periods, commas, or question marks). Strip them if present.
4. Keep ALL index numbers EXACTLY (e.g. "1", "2")
5. Keep ALL timestamps EXACTLY (e.g. "00:00:01,500 --> 00:00:03,200")
6. ONLY convert the Arabic text lines to Franco/Latin — do NOT change timestamps or numbers
7. Do NOT translate to French or English — write how Moroccans pronounce it in Latin letters
8. Franco rules: ع=3, خ=kh, ش=ch, ح=7, غ=gh, ق=9, ر=r
9. Examples: "صافي"→"safi", "واش"→"wach", "دابا"→"daba", "آخاي"→"akhay", "ماشي"→"machi", "بزاف"→"bzzaf"
10. Output ONLY valid SRT. No explanations, no markdown.`
        srtOutput = await processWithGemini(systemPrompt, arabicSrt)
      }
    }

    // Cleanup files
    Promise.all([
      unlinkAsync(uploadedFilePath).catch(() => { }),
      mp3Path ? unlinkAsync(mp3Path).catch(() => { }) : Promise.resolve(),
      ...chunkFiles.map(f => unlinkAsync(f).catch(() => { }))
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
    } catch (e) { }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
