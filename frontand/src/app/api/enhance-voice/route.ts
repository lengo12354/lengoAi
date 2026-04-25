import { NextResponse } from 'next/server'
import path from 'path'
import crypto from 'crypto'

export const maxDuration = 300 // 5 minutes timeout for Dolby API polling

const DOLBY_API_KEY = process.env.DOLBY_API_KEY

export async function POST(req: Request) {
  try {
    if (!DOLBY_API_KEY) {
      return NextResponse.json({ error: 'DOLBY_API_KEY environment variable is missing. Please add it to your .env file from dashboard.dolby.io' }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file size limit (100MB)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 100MB limit' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Generate random filenames
    const randId = crypto.randomBytes(16).toString('hex')
    const originalExt = path.extname(file.name) || '.tmp'
    
    // Dolby temporary storage paths
    const inputDlb = `dlb://in/${randId}${originalExt}`
    const outputDlb = `dlb://out/${randId}.wav`

    const headers = {
      'x-api-key': DOLBY_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    console.log(`[Dolby.io] Requesting upload URL for ${file.name}...`)
    
    // 1. Get Upload URL
    const inputRes = await fetch('https://api.dolby.com/media/input', {
      method: 'POST',
      headers,
      body: JSON.stringify({ url: inputDlb })
    })
    if (!inputRes.ok) throw new Error(`Failed to get input URL: ${await inputRes.text()}`)
    const { url: uploadUrl } = await inputRes.json()

    console.log(`[Dolby.io] Uploading file to Dolby storage...`)
    
    // 2. Upload the file
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: buffer
    })
    if (!uploadRes.ok) throw new Error(`Failed to upload file to Dolby`)

    console.log(`[Dolby.io] Starting enhancement job...`)
    
    // 3. Start Enhancement Job (Podcast mode)
    const enhanceRes = await fetch('https://api.dolby.com/media/enhance', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        input: inputDlb,
        output: outputDlb,
        content: { type: 'podcast' } // Optimizes for speech/podcast voice
      })
    })
    if (!enhanceRes.ok) throw new Error(`Failed to start enhance job: ${await enhanceRes.text()}`)
    const { job_id } = await enhanceRes.json()

    console.log(`[Dolby.io] Polling job status (ID: ${job_id})...`)
    
    // 4. Poll for completion
    let jobStatus = 'Processing'
    while (jobStatus === 'Processing' || jobStatus === 'Pending') {
      await new Promise(resolve => setTimeout(resolve, 3000)) // Wait 3 seconds
      const statusRes = await fetch(`https://api.dolby.com/media/enhance?job_id=${job_id}`, {
        method: 'GET',
        headers: { 'x-api-key': DOLBY_API_KEY, 'Accept': 'application/json' }
      })
      if (!statusRes.ok) throw new Error(`Failed to check job status: ${await statusRes.text()}`)
      const statusData = await statusRes.json()
      jobStatus = statusData.status
      if (jobStatus === 'Failed') throw new Error(`Dolby API failed to process the audio: ${JSON.stringify(statusData)}`)
    }

    console.log(`[Dolby.io] Job complete! Requesting download URL...`)
    
    // 5. Get Download URL
    const outputRes = await fetch('https://api.dolby.com/media/output', {
      method: 'POST',
      headers,
      body: JSON.stringify({ url: outputDlb })
    })
    if (!outputRes.ok) throw new Error(`Failed to get output URL: ${await outputRes.text()}`)
    const { url: downloadUrl } = await outputRes.json()

    console.log(`[Dolby.io] Downloading enhanced audio...`)
    
    // 6. Download the result
    const downloadRes = await fetch(downloadUrl)
    if (!downloadRes.ok) throw new Error(`Failed to download enhanced file`)
    
    const cleanedBuffer = Buffer.from(await downloadRes.arrayBuffer())

    // Return the audio file
    return new NextResponse(cleanedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': `attachment; filename="enhanced_${file.name.replace(/\.[^/.]+$/, "")}.wav"`,
      },
    })

  } catch (error: any) {
    console.error('Audio enhancement error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
