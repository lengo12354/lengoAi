import { NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import YTDlpWrap from 'yt-dlp-wrap'
import path from 'path'
import fs from 'fs'
import os from 'os'

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

// 1. Manual fetcher bypassing EU consent (sometimes works)
async function fetchTranscriptManually(videoId: string) {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+478'
    }
  });
  const html = await res.text();
  const playerResMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+meta|<\/script|\n)/);
  if (!playerResMatch) throw new Error('Could not find player response');
  const playerRes = JSON.parse(playerResMatch[1]);
  const captions = playerRes?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captions || captions.length === 0) throw new Error('No captions found in player response');
  let track = captions.find((c: any) => c.languageCode === 'en' || c.languageCode === 'ar' || c.languageCode === 'fr');
  if (!track) track = captions[0];
  const xmlRes = await fetch(track.baseUrl);
  const xml = await xmlRes.text();
  const matches = [...xml.matchAll(/<text start="([^"]+)"(?: dur="[^"]+")?[^>]*>([^<]+)<\/text>/g)];
  if (matches.length === 0) throw new Error('Could not parse XML transcript');
  return matches.map(m => ({
    offset: parseFloat(m[1]) * 1000,
    text: m[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
  }));
}

// 2. yt-dlp fetcher (bypasses most bots/IP blocks because it uses Android clients internally)
async function fetchTranscriptYtDlp(videoId: string) {
  const ytDlpPath = await ensureYtDlp();
  const ytDlp = new YTDlpWrap(ytDlpPath);
  
  const metadataStr = await ytDlp.execPromise([
    `https://www.youtube.com/watch?v=${videoId}`,
    '--dump-json',
    '--no-playlist'
  ]);
  
  const metadata = JSON.parse(metadataStr);
  let captionUrl = null;
  
  if (metadata.subtitles && Object.keys(metadata.subtitles).length > 0) {
    const enSub = metadata.subtitles.en || metadata.subtitles[Object.keys(metadata.subtitles)[0]];
    const json3 = enSub?.find((x: any) => x.ext === 'json3');
    if (json3) captionUrl = json3.url;
  }
  
  if (!captionUrl && metadata.automatic_captions) {
    const enSub = metadata.automatic_captions.en || metadata.automatic_captions[Object.keys(metadata.automatic_captions)[0]];
    if (enSub) {
      const json3 = enSub.find((x: any) => x.ext === 'json3');
      if (json3) captionUrl = json3.url;
    }
  }

  if (!captionUrl) throw new Error('No JSON3 caption URL found in yt-dlp metadata');

  const captionsRes = await fetch(captionUrl);
  const captionsData = await captionsRes.json();

  let transcriptLines: any[] = [];
  if (captionsData.events) {
    captionsData.events.forEach((e: any) => {
      if (e.segs && e.segs.length > 0) {
        const text = e.segs.map((s: any) => s.utf8).join('').replace(/\n/g, ' ').trim();
        if (text) {
          transcriptLines.push({ offset: e.tStartMs, text });
        }
      }
    });
  }
  
  if (transcriptLines.length === 0) throw new Error('Parsed captions were empty');
  return transcriptLines;
}


export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 })

    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^"&?\/\s]{11})/i)
    const videoId = videoIdMatch ? videoIdMatch[1] : url

    let transcriptResponse = null;
    let lastError = '';

    // Strategy 1: yt-dlp (Strongest against IP blocks)
    try {
      console.log('[YouTube Transcript] Attempting yt-dlp extraction...');
      transcriptResponse = await fetchTranscriptYtDlp(videoId);
    } catch (err: any) {
      console.log('[YouTube Transcript] yt-dlp failed:', err.message);
      lastError += `yt-dlp: ${err.message}. `;
      
      // Strategy 2: Manual fetch with Cookies
      try {
        console.log('[YouTube Transcript] Attempting Manual Cookie fetch...');
        transcriptResponse = await fetchTranscriptManually(videoId);
      } catch (manualErr: any) {
        console.log('[YouTube Transcript] Manual fetch failed:', manualErr.message);
        lastError += `Manual: ${manualErr.message}. `;
        
        // Strategy 3: Default youtube-transcript library
        try {
           transcriptResponse = await YoutubeTranscript.fetchTranscript(videoId);
        } catch (libErr: any) {
           lastError += `Lib: ${libErr.message}`;
        }
      }
    }

    if (!transcriptResponse || transcriptResponse.length === 0) {
      return NextResponse.json({ 
        error: `[DEBUG] Transcript fetch failed on all methods. Errors: ${lastError}` 
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
