import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jobs } from '../../store'

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobId } = await params
  const job = jobs.get(jobId)
  if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })

  return NextResponse.json({
    status: job.status,
    progress: job.progress,
    outputName: job.outputName,
    error: job.error,
  })
}
