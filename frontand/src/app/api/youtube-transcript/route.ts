import { NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    if (!url) {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 })
    }

    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^"&?\/\s]{11})/i)
    const videoId = videoIdMatch ? videoIdMatch[1] : url

    console.log('[YouTube Transcript] ==============================');
    console.log('[YouTube Transcript] Received URL:', url);
    console.log('[YouTube Transcript] Extracted Video ID:', videoId);
    console.log('[YouTube Transcript] Environment:', { 
       NODE_ENV: process.env.NODE_ENV,
       VERCEL: process.env.VERCEL,
       VERCEL_ENV: process.env.VERCEL_ENV
    });

    console.log('[YouTube Transcript] Attempting default fetch...');
    let lastError = '';

    // [Vercel Debug] Let's do a manual fetch to see exactly what YouTube returns to Vercel
    try {
      const debugRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' }
      });
      const debugHtml = await debugRes.text();
      console.log(`[YouTube Transcript Debug] Watch page status: ${debugRes.status}`);
      console.log(`[YouTube Transcript Debug] HTML length: ${debugHtml.length}`);
      
      const isConsent = debugHtml.includes('consent.youtube.com') || debugHtml.includes('CONSENT');
      const isCaptcha = debugHtml.includes('google.com/recaptcha') || debugHtml.includes('captcha');
      const hasCaptions = debugHtml.includes('"captions":');
      const hasPlayerRes = debugHtml.includes('ytInitialPlayerResponse');
      
      console.log(`[YouTube Transcript Debug] Flags -> isConsent: ${isConsent}, isCaptcha: ${isCaptcha}, hasPlayerRes: ${hasPlayerRes}, hasCaptions: ${hasCaptions}`);
      
      if (!hasPlayerRes || !hasCaptions) {
        const snippet = debugHtml.substring(0, 500).replace(/\n/g, ' ');
        console.log(`[YouTube Transcript Debug] HTML Snippet: ${snippet}`);
        
        if (isConsent) lastError += ' [YouTube served a consent page blocking data]';
        else if (isCaptcha) lastError += ' [YouTube served a Captcha]';
        else lastError += ` [YouTube returned HTML without captions data (Status ${debugRes.status})]`;
      }
    } catch (e: any) {
      console.error(`[YouTube Transcript Debug] Manual fetch failed: ${e.message}`);
    }

    let transcriptResponse = await YoutubeTranscript.fetchTranscript(videoId).catch(err => {
      lastError = err.message || String(err);
      console.error('[YouTube Transcript] Default fetch failed with error:', lastError);
      return null;
    })
    
    if (!transcriptResponse || transcriptResponse.length === 0) {
      console.log('[YouTube Transcript] Default fetch empty or failed, trying fallbacks...');
      const fallbackLangs = ['en', 'ar', 'fr', 'es', 'pt', 'de', 'hi', 'ja']
      for (const lang of fallbackLangs) {
        transcriptResponse = await YoutubeTranscript.fetchTranscript(videoId, { lang }).catch(err => {
          lastError = err.message || String(err);
          console.error(`[YouTube Transcript] Fallback lang '${lang}' failed:`, lastError);
          return null;
        })
        if (transcriptResponse && transcriptResponse.length > 0) {
          console.log(`[YouTube Transcript] Success with fallback lang: ${lang}`);
          break
        }
      }
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
