import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jobs } from '../../store'
import fs from 'fs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobId } = await params
  const job = jobs.get(jobId)

  if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  if (job.status !== 'done') return NextResponse.json({ error: 'Job not ready.' }, { status: 400 })
  if (!job.outputPath || !fs.existsSync(job.outputPath)) {
    return NextResponse.json({ error: 'Output file not found.' }, { status: 404 })
  }

  const stat = fs.statSync(job.outputPath)
  const fileSize = stat.size
  const fileName = job.outputName || 'clip.mp4'
  const isDownload = req.nextUrl.searchParams.get('dl') === '1'

  // Handle range requests so <video> can seek + preview
  const rangeHeader = req.headers.get('range')

  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1
    const chunkSize = end - start + 1

    const stream = fs.createReadStream(job.outputPath, { start, end })
    // @ts-ignore
    return new NextResponse(stream, {
      status: 206,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Disposition': isDownload ? `attachment; filename="${fileName}"` : 'inline',
      },
    })
  }

  // Schedule cleanup after 1 hour
  setTimeout(() => {
    try { if (fs.existsSync(job.outputPath!)) fs.unlinkSync(job.outputPath!) } catch {}
  }, 3600000)
  setTimeout(() => { jobs.delete(jobId) }, 3600000)

  const stream = fs.createReadStream(job.outputPath)
  // @ts-ignore
  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Content-Length': String(fileSize),
      'Content-Disposition': isDownload ? `attachment; filename="${fileName}"` : 'inline',
    },
  })
}
