// Shared in-memory job store for clip-maker jobs.
// This lives as long as the Next.js dev/prod process, scoped to this module.

export type ClipJob = {
  status: 'processing' | 'done' | 'error'
  progress: number
  outputPath?: string
  outputName?: string
  error?: string
}

export const jobs = new Map<string, ClipJob>()
