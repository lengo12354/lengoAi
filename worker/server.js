const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { YoutubeTranscript } = require('youtube-transcript');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const YTDlpWrap = require('yt-dlp-wrap').default;

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: os.tmpdir() });
const jobs = new Map();

const getFFmpegPath = () => {
  const p = require('ffmpeg-static');
  if (!fs.existsSync(p)) throw new Error('FFmpeg binary not found at: ' + p);
  return p;
};

let ytDlpDownloadPromise = null;
const ensureYtDlp = async () => {
  const ytDlpPath = path.join(process.cwd(), os.platform() === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  if (fs.existsSync(ytDlpPath)) return ytDlpPath;

  if (!ytDlpDownloadPromise) {
    ytDlpDownloadPromise = (async () => {
      await YTDlpWrap.downloadFromGithub(ytDlpPath);
      if (os.platform() !== 'win32') fs.chmodSync(ytDlpPath, '755');
      return ytDlpPath;
    })();
  }
  return ytDlpDownloadPromise;
};

// --- YouTube Transcript Endpoint ---
async function fetchTranscriptManually(videoId) {
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

  let track = captions.find(c => c.languageCode === 'en' || c.languageCode === 'ar' || c.languageCode === 'fr');
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

app.post('/api/youtube-transcript', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'YouTube URL is required' });

    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^"&?\/\s]{11})/i);
    const videoId = videoIdMatch ? videoIdMatch[1] : url;

    let transcriptResponse = null;
    try {
      transcriptResponse = await fetchTranscriptManually(videoId);
    } catch (manualErr) {
      console.log('Manual fetch failed:', manualErr.message);
      transcriptResponse = await YoutubeTranscript.fetchTranscript(videoId).catch(() => null);
    }

    if (!transcriptResponse || transcriptResponse.length === 0) {
      return res.status(404).json({ error: 'Transcript fetch failed. Blocked by YouTube.' });
    }

    const formattedTranscript = transcriptResponse.map(t => {
      const offsetMs = Math.round(t.offset);
      const hours = Math.floor(offsetMs / 3600000);
      const minutes = Math.floor((offsetMs % 3600000) / 60000);
      const seconds = Math.floor((offsetMs % 60000) / 1000);
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      return `[${timeString}] ${t.text}`;
    }).join('\n');

    res.json({ transcript: formattedTranscript });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Clip Maker Endpoints ---
const parseTimestamp = (ts) => {
  const parts = String(ts).trim().split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseFloat(ts) || 0;
};

async function downloadSectionWithYtDlp(youtubeUrl, startSec, endSec, tempPath, ffmpegPath) {
  const ytDlpPath = await ensureYtDlp();
  const ytDlp = new YTDlpWrap(ytDlpPath);

  const ytDlpArgs = [
    youtubeUrl,
    '-f', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
    '-S', 'res:1080,ext:mp4:m4a',
    '--merge-output-format', 'mp4',
    '--download-sections', `*${startSec}-${endSec}`,
    '--ffmpeg-location', ffmpegPath,
    '--no-cache-dir',
    '--no-part',
    '-o', tempPath
  ];

  return new Promise((resolve, reject) => {
    const ytDlpEmitter = ytDlp.exec(ytDlpArgs);
    let stderr = '';
    ytDlpEmitter.on('close', () => {
      if (fs.existsSync(tempPath)) resolve();
      else reject(new Error(`yt-dlp failed. Log: ${stderr}`));
    });
    ytDlpEmitter.on('error', (error) => {
      stderr += error.message;
      reject(error);
    });
  });
}

async function runFFmpegFromYouTube(jobId, youtubeUrl, startSec, endSec, format, cropX, cropData) {
  const duration = endSec - startSec;
  const outputName = `clip_${jobId}.mp4`;
  const outputPath = path.join(os.tmpdir(), outputName);
  const tempInput = path.join(os.tmpdir(), `yt_${jobId}.mp4`);
  const ffmpegPath = getFFmpegPath();

  jobs.set(jobId, { status: 'processing', progress: 5 });

  try {
    await downloadSectionWithYtDlp(youtubeUrl, startSec, endSec, tempInput, ffmpegPath);
  } catch (err) {
    jobs.set(jobId, { status: 'error', progress: 0, error: err.message });
    throw err;
  }

  jobs.set(jobId, { status: 'processing', progress: 50 });

  let vfFilter = '';
  if (format === '9:16') {
    if (cropData) {
      vfFilter = `crop=${Math.round(cropData.width)}:${Math.round(cropData.height)}:${Math.round(cropData.x)}:${Math.round(cropData.y)},scale=1080:1920:flags=lanczos`;
    } else {
      vfFilter = `crop='ih*9/16':'ih':'(iw-ih*9/16)*${cropX}':0,scale=1080:1920:flags=lanczos`;
    }
  } else if (format === '1:1') {
    vfFilter = `crop='min(iw,ih)':'min(iw,ih)':'(iw-min(iw,ih))*${cropX}':'(ih-min(iw,ih))/2',scale=1080:1080:flags=lanczos`;
  }

  const args = ['-y', '-i', tempInput];
  if (vfFilter) args.push('-vf', vfFilter);
  args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-threads', '2', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', outputPath);

  return new Promise((resolve, reject) => {
    const ff = spawn(ffmpegPath, args);
    let stderr = '';
    ff.stderr.on('data', chunk => {
      const line = chunk.toString();
      stderr += line;
      const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/);
      if (timeMatch) {
        const elapsed = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseFloat(timeMatch[3]);
        const encodePct = Math.min(1, elapsed / duration);
        const pct = Math.round(50 + encodePct * 49);
        const existing = jobs.get(jobId);
        if (existing) jobs.set(jobId, { ...existing, progress: pct });
      }
    });
    ff.on('close', (code) => {
      try { if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput); } catch {}
      if (code === 0) {
        jobs.set(jobId, { status: 'done', progress: 100, outputPath, outputName });
        resolve();
      } else {
        jobs.set(jobId, { status: 'error', progress: 0, error: stderr.slice(-400) });
        reject(new Error(stderr.slice(-400)));
      }
    });
    ff.on('error', (err) => {
      try { if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput); } catch {}
      jobs.set(jobId, { status: 'error', progress: 0, error: err.message });
      reject(err);
    });
  });
}

app.post('/api/clip-maker', upload.none(), async (req, res) => {
  try {
    const { youtubeUrl, start, end, format, cropX, crop } = req.body;
    
    if (!youtubeUrl || !start || !end) return res.status(400).json({ error: 'Missing parameters' });

    let startSec = Math.max(0, parseTimestamp(start) - 0.5);
    let endSec = parseTimestamp(end);

    let parsedCropData = null;
    try { if (crop) parsedCropData = JSON.parse(crop); } catch {}

    const jobId = crypto.randomBytes(16).toString('hex');
    jobs.set(jobId, { status: 'processing', progress: 0 });

    runFFmpegFromYouTube(jobId, youtubeUrl, startSec, endSec, format || '16:9', parseFloat(cropX) || 0.5, parsedCropData).catch(() => {});

    res.json({ jobId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/clip-maker/status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ status: job.status, progress: job.progress, error: job.error, outputName: job.outputName });
});

app.get('/api/clip-maker/download/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job || job.status !== 'done' || !job.outputPath) return res.status(404).send('Not found');
  res.download(job.outputPath, job.outputName);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Worker running on port ${PORT}`);
});
