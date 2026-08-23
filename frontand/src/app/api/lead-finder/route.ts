import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const YT_BASE = 'https://www.googleapis.com/youtube/v3'

function getYouTubeKeys(): string[] {
  const keysString = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEYS || ''
  const keys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0)
  if (keys.length === 0) throw new Error('YouTube API key not configured.')
  return keys
}

let activeKeyIndex = 0

// Fetch YouTube API with automatic key rotation / fallback if quota is exceeded (403/429)
async function fetchYouTubeApi(endpoint: string, params: URLSearchParams): Promise<Response | null> {
  const keys = getYouTubeKeys()
  let lastResponse: Response | null = null

  // Try starting from activeKeyIndex, then wrap around
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const keyIndex = (activeKeyIndex + attempt) % keys.length
    const apiKey = keys[keyIndex]

    const currentParams = new URLSearchParams(params)
    currentParams.set('key', apiKey)

    try {
      const res = await fetch(`${YT_BASE}/${endpoint}?${currentParams}`)
      if (res.ok) {
        // Keep activeKeyIndex pointing to this working key
        activeKeyIndex = keyIndex
        return res
      }

      const errData = await res.clone().json().catch(() => ({}))
      const isQuotaOrAuthError = res.status === 403 || res.status === 429 || res.status === 401

      console.warn(`[YouTube Key Warning] Key ${apiKey.slice(0, 8)}... failed (${res.status}):`, errData?.error?.message || res.statusText)
      lastResponse = res

      // If quota or auth error, automatically rotate to the next key!
      if (isQuotaOrAuthError) {
        continue
      }
      return res
    } catch (err) {
      console.error(`[YouTube Key Error] with key ${apiKey.slice(0, 8)}...`, err)
    }
  }

  return lastResponse
}

// Extract emails from text
function extractEmails(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)
  return matches ? [...new Set(matches)] : []
}

// Extract Instagram handles from text
function extractInstagram(text: string): string | null {
  const urlMatch = text.match(/(?:instagram\.com\/)([a-zA-Z0-9_.]{1,30})/i)
  if (urlMatch) return urlMatch[1]
  const mentionMatch = text.match(/(?:instagram|ig)\s*[:：]\s*@?([a-zA-Z0-9_.]{1,30})/i)
  if (mentionMatch) return mentionMatch[1]
  return null
}

// Extract Twitter/X handles
function extractTwitter(text: string): string | null {
  const urlMatch = text.match(/(?:twitter\.com\/|x\.com\/)([a-zA-Z0-9_]{1,15})/i)
  if (urlMatch) return urlMatch[1]
  const mentionMatch = text.match(/(?:twitter|x\.com)\s*[:：]\s*@?([a-zA-Z0-9_]{1,15})/i)
  if (mentionMatch) return mentionMatch[1]
  return null
}

// Search YouTube videos by keyword with a specific sort order
async function searchVideos(
  keyword: string,
  order: string,
  regionCode?: string,
  maxResults = 50
): Promise<{ channelId: string; videoId: string }[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    q: keyword,
    type: 'video',
    order,
    maxResults: String(maxResults),
  })
  if (regionCode) params.set('regionCode', regionCode)

  const res = await fetchYouTubeApi('search', params)
  if (!res || !res.ok) return []
  const data = await res.json()
  return (data.items || []).map((item: any) => ({
    channelId: item.snippet.channelId,
    videoId: item.id.videoId,
  }))
}

// Batch fetch channel details (max 50 IDs per call)
async function fetchChannels(channelIds: string[]) {
  const results: any[] = []
  for (let i = 0; i < channelIds.length; i += 50) {
    const batch = channelIds.slice(i, i + 50)
    const params = new URLSearchParams({
      part: 'snippet,statistics,brandingSettings,contentDetails',
      id: batch.join(','),
    })
    const res = await fetchYouTubeApi('channels', params)
    if (!res || !res.ok) continue
    const data = await res.json()
    results.push(...(data.items || []))
  }
  return results
}

// Get latest video from a channel's uploads playlist
async function getLatestVideoDescription(uploadsPlaylistId: string): Promise<string> {
  try {
    const plParams = new URLSearchParams({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: '1',
    })
    const plRes = await fetchYouTubeApi('playlistItems', plParams)
    if (!plRes || !plRes.ok) return ''
    const plData = await plRes.json()
    const videoId = plData.items?.[0]?.snippet?.resourceId?.videoId
    if (!videoId) return ''

    const vParams = new URLSearchParams({
      part: 'snippet',
      id: videoId,
    })
    const vRes = await fetchYouTubeApi('videos', vParams)
    if (!vRes || !vRes.ok) return ''
    const vData = await vRes.json()
    return vData.items?.[0]?.snippet?.description || ''
  } catch {
    return ''
  }
}

// Get the latest video publish date from a channel's uploads playlist
async function getLatestVideoDate(uploadsPlaylistId: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: '1',
    })
    const res = await fetchYouTubeApi('playlistItems', params)
    if (!res || !res.ok) return null
    const data = await res.json()
    return data.items?.[0]?.snippet?.publishedAt || null
  } catch {
    return null
  }
}

// Helper to parse ISO 8601 duration string into seconds (e.g. PT4M12S -> 252)
function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)
  return hours * 3600 + minutes * 60 + seconds
}

// Check if a channel's last 3 videos contain at least one long-form video (> 3 mins / 180s)
async function checkChannelHasLongFormVideos(uploadsPlaylistId: string): Promise<boolean> {
  try {
    const plParams = new URLSearchParams({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: '3',
    })
    const plRes = await fetchYouTubeApi('playlistItems', plParams)
    if (!plRes || !plRes.ok) return true
    const plData = await plRes.json()
    const videoIds = (plData.items || [])
      .map((item: any) => item.snippet?.resourceId?.videoId)
      .filter(Boolean)

    if (videoIds.length === 0) return true

    const vParams = new URLSearchParams({
      part: 'contentDetails',
      id: videoIds.join(','),
    })
    const vRes = await fetchYouTubeApi('videos', vParams)
    if (!vRes || !vRes.ok) return true
    const vData = await vRes.json()

    // Channel is valid if at least one of its latest 3 videos is >= 3 minutes (180s)
    const hasLongForm = (vData.items || []).some((v: any) => {
      const sec = parseISO8601Duration(v.contentDetails?.duration || '')
      return sec >= 180 // 3 minutes or longer
    })

    return hasLongForm
  } catch {
    return true // Safe fallback if API fails
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { niche, keywords, filters } = body as {
      niche: string
      keywords: string[]
      filters?: {
        countries?: string[]
        minSubs?: number
        maxSubs?: number
        lastUploadDays?: number
      }
    }

    if (!niche && (!keywords || keywords.length === 0)) {
      return NextResponse.json({ error: 'Niche or keywords required.' }, { status: 400 })
    }

    const searchKeywords = keywords && keywords.length > 0 ? keywords : [niche]
    const sortOrders = ['relevance', 'viewCount', 'date']

    // If exactly one country is selected, restrict API search to that region.
    // Otherwise, search globally and filter locally.
    const searchRegion = filters?.countries && filters.countries.length === 1 ? filters.countries[0] : undefined

    // Step 1: Search videos with all keywords × sort orders
    const channelVideoMap = new Map<string, string>() // channelId → first videoId

    for (const keyword of searchKeywords.slice(0, 10)) {
      for (const order of sortOrders) {
        const results = await searchVideos(keyword, order, searchRegion, 50)
        for (const r of results) {
          if (!channelVideoMap.has(r.channelId)) {
            channelVideoMap.set(r.channelId, r.videoId)
          }
        }
      }
    }

    const uniqueChannelIds = [...channelVideoMap.keys()]

    if (uniqueChannelIds.length === 0) {
      return NextResponse.json({ leads: [], total: 0, message: 'No channels found for this niche.' })
    }

    // Step 2: Batch fetch channel details
    const channels = await fetchChannels(uniqueChannelIds)

    // Step 3: Process each channel
    const leads: any[] = []

    // Channels that need fallback (no email in about)
    const needFallback: { channel: any; uploadsPlaylistId: string }[] = []

    for (const ch of channels) {
      const subs = parseInt(ch.statistics?.subscriberCount || '0', 10)
      const description = ch.snippet?.description || ''
      const country = ch.snippet?.country || ''

      // Apply subscriber filter
      if (filters?.minSubs && subs < filters.minSubs) continue
      if (filters?.maxSubs && subs > filters.maxSubs) continue

      // Excluded countries for global search (India, Bangladesh, Pakistan, Nepal, Sri Lanka, Nigeria)
      const BLOCKED_GLOBAL_COUNTRIES = new Set(['IN', 'BD', 'PK', 'LK', 'NP', 'NG'])

      // Apply countries array filter locally (case-insensitive)
      if (filters?.countries && filters.countries.length > 0) {
        if (!country || !filters.countries.map(c => c.toUpperCase()).includes(country.toUpperCase())) {
          continue
        }
      } else {
        // Global search mode: Block channels registered in low-tier/spammy regions
        if (country && BLOCKED_GLOBAL_COUNTRIES.has(country.toUpperCase())) {
          continue
        }
        // Also filter out channels with Hindi (Devanagari) or Bengali script in title/description
        const title = ch.snippet?.title || ''
        const combinedText = `${title} ${description}`
        if (/[\u0900-\u097F\u0980-\u09FF]/.test(combinedText)) {
          continue
        }
      }

      const emails = extractEmails(description)
      const instagram = extractInstagram(description)
      const twitter = extractTwitter(description)

      const uploadsPlaylistId = ch.contentDetails?.relatedPlaylists?.uploads || ''

      const totalViews = parseInt(ch.statistics?.viewCount || '0', 10)
      const videoCount = parseInt(ch.statistics?.videoCount || '0', 10)

      const lead = {
        channelId: ch.id || '',
        name: ch.snippet?.title || '',
        thumbnail: ch.snippet?.thumbnails?.medium?.url || ch.snippet?.thumbnails?.default?.url || '',
        subscribers: isNaN(subs) ? 0 : subs,
        totalViews: isNaN(totalViews) ? 0 : totalViews,
        videoCount: isNaN(videoCount) ? 0 : videoCount,
        country: country || '',
        description: (description || '').slice(0, 300),
        email: emails[0] || null,
        instagram: instagram || null,
        twitter: twitter || null,
        channelUrl: `https://www.youtube.com/channel/${ch.id}`,
        lastUpload: null as string | null,
      }

      if (!lead.email && uploadsPlaylistId) {
        needFallback.push({ channel: lead, uploadsPlaylistId })
      } else {
        leads.push(lead)
      }
    }

    // Step 4: Fallback — fetch latest video description for channels without email
    const fallbackBatch = needFallback.slice(0, 50)
    for (const { channel, uploadsPlaylistId } of fallbackBatch) {
      const videoDesc = await getLatestVideoDescription(uploadsPlaylistId)
      if (videoDesc) {
        const emails = extractEmails(videoDesc)
        const instagram = extractInstagram(videoDesc)
        const twitter = extractTwitter(videoDesc)
        if (emails[0]) channel.email = emails[0]
        if (instagram && !channel.instagram) channel.instagram = instagram
        if (twitter && !channel.twitter) channel.twitter = twitter
      }
      leads.push(channel)
    }
    // Add remaining without fallback
    for (const { channel } of needFallback.slice(50)) {
      leads.push(channel)
    }

    // Step 5: Fetch last upload dates for all leads (batch)
    const leadsWithUploads = leads.filter(l => {
      const ch = channels.find((c: any) => c.id === l.channelId)
      return ch?.contentDetails?.relatedPlaylists?.uploads
    })

    const uploadDatePromises = leadsWithUploads.slice(0, 100).map(async (lead) => {
      const ch = channels.find((c: any) => c.id === lead.channelId)
      const uploadsId = ch?.contentDetails?.relatedPlaylists?.uploads
      if (!uploadsId) return
      const date = await getLatestVideoDate(uploadsId)
      lead.lastUpload = date
    })
    await Promise.all(uploadDatePromises)

    // Step 6: Apply last upload filter
    let filteredLeads = leads
    if (filters?.lastUploadDays) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - filters.lastUploadDays)
      filteredLeads = leads.filter(l => {
        if (!l.lastUpload) return true // include if unknown
        return new Date(l.lastUpload) >= cutoff
      })
    }

    // Step 7: Filter out Shorts-only channels (check if last 3 videos have at least one video >= 3 mins / 180s)
    const longFormCheckPromises = filteredLeads.map(async (lead) => {
      const ch = channels.find((c: any) => c.id === lead.channelId)
      const uploadsId = ch?.contentDetails?.relatedPlaylists?.uploads
      if (!uploadsId) return { lead, isLongForm: true }
      const isLongForm = await checkChannelHasLongFormVideos(uploadsId)
      return { lead, isLongForm }
    })

    const validatedResults = await Promise.all(longFormCheckPromises)
    filteredLeads = validatedResults
      .filter(r => r.isLongForm)
      .map(r => r.lead)

    // Sort by subscribers descending
    filteredLeads.sort((a, b) => b.subscribers - a.subscribers)

    // Save to history in background if user is authenticated
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user && filteredLeads.length > 0) {
        // Deep sanitize: replace NaN/undefined/Infinity anywhere in the object tree
        function deepClean(obj: any): any {
          if (obj === null || obj === undefined) return null
          if (typeof obj === 'number') {
            if (isNaN(obj) || !isFinite(obj)) return 0
            return obj
          }
          if (typeof obj === 'string') return obj
          if (typeof obj === 'boolean') return obj
          if (Array.isArray(obj)) return obj.map(deepClean)
          if (typeof obj === 'object') {
            const clean: any = {}
            for (const key of Object.keys(obj)) {
              clean[key] = deepClean(obj[key])
            }
            return clean
          }
          return null
        }
        const cleanLeads = deepClean(filteredLeads)
        const { error: insertError } = await supabase.from('lead_finder_history').insert({
          user_id: user.id,
          niche: niche.trim(),
          leads: cleanLeads,
        })
        const fs = require('fs')
        if (insertError) {
          console.error('[Lead Finder History Insert Error]', insertError)
          fs.appendFileSync('supabase-debug.log', `[Insert Error] ${new Date().toISOString()}: ${JSON.stringify(insertError)}\n`)
        } else {
          fs.appendFileSync('supabase-debug.log', `[Insert Success] ${new Date().toISOString()}: Saved "${niche}" for user ${user.id}\n`)
        }
      } else {
        const fs = require('fs')
        fs.appendFileSync('supabase-debug.log', `[Insert Skipped] ${new Date().toISOString()}: User is ${user ? user.id : 'null'} / Leads count is ${filteredLeads.length}\n`)
      }
    } catch (saveError: any) {
      console.warn('[Lead Finder History Save Error]', saveError)
      const fs = require('fs')
      fs.appendFileSync('supabase-debug.log', `[Save Catch Error] ${new Date().toISOString()}: ${saveError.message || saveError}\n`)
    }

    return NextResponse.json({
      leads: filteredLeads,
      total: filteredLeads.length,
      totalSearched: uniqueChannelIds.length,
    })
  } catch (error: any) {
    console.error('[Lead Finder API]', error)
    return NextResponse.json(
      { error: error.message || 'Something went wrong.' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const fs = require('fs')

    if (!user) {
      fs.appendFileSync('supabase-debug.log', `[GET Unauthorized] ${new Date().toISOString()}\n`)
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('lead_finder_history')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      fs.appendFileSync('supabase-debug.log', `[GET Error] ${new Date().toISOString()}: ${JSON.stringify(error)}\n`)
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return NextResponse.json({ history: [] })
      }
      throw error
    }

    fs.appendFileSync('supabase-debug.log', `[GET Success] ${new Date().toISOString()}: Found ${data ? data.length : 0} items for user ${user.id}\n`)
    return NextResponse.json({ history: data || [] })
  } catch (error: any) {
    console.error('[Lead Finder History GET Error]', error)
    const fs = require('fs')
    fs.appendFileSync('supabase-debug.log', `[GET Catch Error] ${new Date().toISOString()}: ${error.message || error}\n`)
    return NextResponse.json({ error: error.message || 'Failed to fetch history.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const fs = require('fs')
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    fs.appendFileSync('supabase-debug.log', `[DELETE Attempt] ${new Date().toISOString()}: id=${id}\n`)

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      fs.appendFileSync('supabase-debug.log', `[DELETE Unauthorized] ${new Date().toISOString()}\n`)
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    fs.appendFileSync('supabase-debug.log', `[DELETE User] ${new Date().toISOString()}: ${user.id}\n`)

    let query = supabase
      .from('lead_finder_history')
      .delete()
      .eq('user_id', user.id) // security: only delete own records

    if (id !== 'all') {
      query = query.eq('id', id)
    }

    const { data, error } = await query.select()
    fs.appendFileSync('supabase-debug.log', `[DELETE Executed] ${new Date().toISOString()}: error=${error}, data=${JSON.stringify(data)}\n`)

    if (error) {
      fs.appendFileSync('supabase-debug.log', `[DELETE Error] ${new Date().toISOString()}: ${error.message}\n`)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: data })
  } catch (error: any) {
    fs.appendFileSync('supabase-debug.log', `[DELETE Catch Error] ${new Date().toISOString()}: ${error.message || error}\n`)
    return NextResponse.json({ error: error.message || 'Failed to delete.' }, { status: 500 })
  }
}
