import { NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import fetch from 'node-fetch'
import { HttpsProxyAgent } from 'https-proxy-agent'

export const maxDuration = 30 // Set max duration for proxy rotation

const proxies = [
  'http://jyuwpvjy:eq5l8t8h85iv@31.59.20.176:6754',
  'http://jyuwpvjy:eq5l8t8h85iv@31.56.127.193:7684',
  'http://jyuwpvjy:eq5l8t8h85iv@45.38.107.97:6014',
  'http://jyuwpvjy:eq5l8t8h85iv@198.105.121.200:6462',
  'http://jyuwpvjy:eq5l8t8h85iv@64.137.96.74:6641',
  'http://jyuwpvjy:eq5l8t8h85iv@198.23.243.226:6361',
  'http://jyuwpvjy:eq5l8t8h85iv@38.154.185.97:6370',
  'http://jyuwpvjy:eq5l8t8h85iv@84.247.60.125:6095',
  'http://jyuwpvjy:eq5l8t8h85iv@142.111.67.146:5611',
  'http://jyuwpvjy:eq5l8t8h85iv@191.96.254.138:6185'
]

function getRandomProxy() {
  const randomIndex = Math.floor(Math.random() * proxies.length)
  return proxies[randomIndex]
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    if (!url) {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 })
    }

    // Extract Video ID manually to handle /live/, /shorts/, and other URL formats correctly
    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^"&?\/\s]{11})/i)
    const videoId = videoIdMatch ? videoIdMatch[1] : url

    // Select a random proxy for this request
    const proxyUrl = getRandomProxy()
    const proxyAgent = new HttpsProxyAgent(proxyUrl)

    // Custom fetch function that passes the proxy agent
    const customFetch = (requestUrl: any, options: any = {}) => {
      return fetch(requestUrl, { ...options, agent: proxyAgent }) as any
    }

    let transcriptResponse = await YoutubeTranscript.fetchTranscript(videoId, { fetch: customFetch }).catch(() => null)
    
    if (!transcriptResponse || transcriptResponse.length === 0) {
      // Fallback: try fetching explicitly by common languages if default fails
      const fallbackLangs = ['en', 'ar', 'fr', 'es', 'pt', 'de', 'hi', 'ja']
      for (const lang of fallbackLangs) {
        transcriptResponse = await YoutubeTranscript.fetchTranscript(videoId, { lang, fetch: customFetch }).catch(() => null)
        if (transcriptResponse && transcriptResponse.length > 0) {
          break
        }
      }
    }

    if (!transcriptResponse || transcriptResponse.length === 0) {
      return NextResponse.json({ error: 'No transcript found for this video' }, { status: 404 })
    }

    // Format the transcript for Gemini (include timestamps so Gemini can reference them)
    const formattedTranscript = transcriptResponse.map((t: any) => {
      // Convert offset in ms/sec to HH:MM:SS format
      const offsetMs = Math.round(t.offset)
      const hours = Math.floor(offsetMs / 3600000)
      const minutes = Math.floor((offsetMs % 3600000) / 60000)
      const seconds = Math.floor((offsetMs % 60000) / 1000)
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      return `[${timeString}] ${t.text}`
    }).join('\n')

    return NextResponse.json({ transcript: formattedTranscript })
  } catch (error: any) {
    console.error('YouTube Transcript Error:', error)
    
    let errMsg = error.message || 'Failed to fetch transcript. Video might not have closed captions.'
    
    // Make the error user-friendly if it's due to disabled/missing transcripts (like live streams)
    if (errMsg.includes('Transcript is disabled') || errMsg.includes('No transcript found')) {
      errMsg = "This video (or live stream) doesn't have subtitles available yet. Our AI needs captions to find the best moments. Please try a regular video that has closed captions."
    } else if (errMsg.includes('Video is unavailable')) {
      errMsg = "This video is unavailable. It might be private or deleted."
    }

    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
