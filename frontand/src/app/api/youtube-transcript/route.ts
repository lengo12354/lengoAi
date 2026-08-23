import { NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import * as he from 'he' // For HTML entity decoding, let's see if we need it

// Manual fetcher bypassing EU consent
async function fetchTranscriptManually(videoId: string) {
  // 1. Fetch watch page with Consent cookie
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+478'
    }
  });
  const html = await res.text();

  // 2. Extract captions data
  const playerResMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+meta|<\/script|\n)/);
  if (!playerResMatch) throw new Error('Could not find player response');
  
  const playerRes = JSON.parse(playerResMatch[1]);
  const captions = playerRes?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  
  if (!captions || captions.length === 0) {
    throw new Error('No captions found in player response');
  }

  // 3. Find English or first available caption track
  let track = captions.find((c: any) => c.languageCode === 'en' || c.languageCode === 'ar' || c.languageCode === 'fr');
  if (!track) track = captions[0];

  // 4. Fetch the XML transcript
  const xmlRes = await fetch(track.baseUrl);
  const xml = await xmlRes.text();

  // 5. Parse XML (simple regex parsing since it's just <text start="x" dur="y">text</text>)
  const matches = [...xml.matchAll(/<text start="([^"]+)"(?: dur="[^"]+")?[^>]*>([^<]+)<\/text>/g)];
  
  if (matches.length === 0) throw new Error('Could not parse XML transcript');

  return matches.map(m => ({
    offset: parseFloat(m[1]) * 1000, // convert seconds to ms
    text: m[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
  }));
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 })

    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^"&?\/\s]{11})/i)
    const videoId = videoIdMatch ? videoIdMatch[1] : url

    let transcriptResponse = null;
    let lastError = '';

    // Try manual fetch with Consent bypass first
    try {
      transcriptResponse = await fetchTranscriptManually(videoId);
    } catch (manualErr: any) {
      console.log('[YouTube Transcript] Manual fetch failed:', manualErr.message);
      
      // Fallback to library
      transcriptResponse = await YoutubeTranscript.fetchTranscript(videoId).catch(err => {
        lastError = err.message || String(err);
        return null;
      });
    }

    if (!transcriptResponse || transcriptResponse.length === 0) {
      return NextResponse.json({ 
        error: `[DEBUG] Transcript fetch failed. Server Error: ${lastError || 'Empty response'}` 
      }, { status: 404 })
    }

    // Format the transcript for Gemini (include timestamps so Gemini can reference them)
    const formattedTranscript = transcriptResponse.map(t => {
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
    let errMsg = error.message || 'Failed to fetch transcript.'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
