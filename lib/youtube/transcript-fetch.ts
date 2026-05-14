/**
 * YouTube transcript fetcher — Innertube API primary, watch-page fallback.
 *
 * Strategy:
 *   1. POST to YouTube's internal Innertube API with ANDROID client context.
 *      This endpoint works from cloud/server IPs and does not trigger bot
 *      detection the way the watch page does.
 *   2. Fall back to scraping `youtube.com/watch?v=` (works on local IPs,
 *      fails on Vercel with LOGIN_REQUIRED for most videos).
 *
 * No YouTube Data API key required for transcript — only for metadata.
 */

export interface YouTubeTranscriptResult {
  transcript: string | null
  /** 'watch_page' | null when failed. */
  provider: 'watch_page' | null
  /** Hint for the caller — e.g. 'no_captions_found', 'consent_wall'. */
  reason?: string
}

export interface YouTubeMetadata {
  title: string | null
  creator: string | null
  thumbnail: string | null
  duration: string | null
}

// ─── URL → videoId ───────────────────────────────────────────────────────────

const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  /youtube\.com\/shorts\/([^&\n?#]+)/,
]

export function extractYouTubeId(url: string): string | null {
  for (const p of YT_PATTERNS) {
    const m = url.match(p)
    if (m) return m[1] ?? null
  }
  return null
}

export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url)
}

// ─── Caption XML parsing ─────────────────────────────────────────────────────

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
}

function stripXmlTags(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseCaptionXml(xml: string): string | null {
  const textMatches = [...xml.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi)]
  if (textMatches.length) {
    const text = textMatches
      .map((m) => stripXmlTags(m[1] ?? ''))
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text || null
  }

  const paragraphMatches = [...xml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
  if (paragraphMatches.length) {
    const text = paragraphMatches
      .map((m) => {
        const inner = m[1] ?? ''
        const segs = [...inner.matchAll(/<s\b[^>]*>([\s\S]*?)<\/s>/gi)]
        if (segs.length) {
          return segs
            .map((s) => stripXmlTags(s[1] ?? ''))
            .filter(Boolean)
            .join(' ')
        }
        return stripXmlTags(inner)
      })
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text || null
  }

  return null
}

interface PlayerResponse {
  playabilityStatus?: { status?: string; reason?: string }
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: Array<{ baseUrl?: string; languageCode?: string; kind?: string }>
    }
  }
  videoDetails?: { title?: string; author?: string; lengthSeconds?: string; thumbnail?: { thumbnails?: Array<{ url: string }> } }
}

function extractPlayerResponse(html: string): PlayerResponse | null {
  const patterns = [
    /ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\})\s*;/,
    /window\[["']ytInitialPlayerResponse["']\]\s*=\s*(\{[\s\S]*?\})\s*;/,
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (!m?.[1]) continue
    try {
      return JSON.parse(m[1]) as PlayerResponse
    } catch {
      continue
    }
  }
  return null
}

// ─── Transcript fetcher ───────────────────────────────────────────────────────

// Public Innertube API key (embedded in YouTube's own web/Android clients).
const INNERTUBE_KEY = 'AIzaSyA8eiZmM1fanX9Dz5M9NuLLZFQb1ISFjFQ'

// Reused for both Innertube caption downloads and watch-page fallback.
const YT_BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Cookie': 'CONSENT=YES+cb; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpeF8yMDIzMDkyOC4xXzAxJzAuNzI2',
}

function pickCaptionTrack(tracks: Array<{ baseUrl?: string; languageCode?: string; kind?: string }>) {
  return (
    tracks.find((t) => !t.kind && t.languageCode === 'es') ??
    tracks.find((t) => !t.kind && t.languageCode?.startsWith('es')) ??
    tracks.find((t) => !t.kind && t.languageCode === 'en') ??
    tracks.find((t) => !t.kind) ??
    tracks.find((t) => t.languageCode === 'es') ??
    tracks[0]
  )
}

async function downloadCaptionTrack(baseUrl: string): Promise<YouTubeTranscriptResult> {
  const captionUrl = baseUrl.includes('fmt=') ? baseUrl : `${baseUrl}&fmt=srv3`
  const capRes = await fetch(captionUrl, {
    headers: YT_BROWSER_HEADERS,
    signal: AbortSignal.timeout(20_000),
  })
  if (!capRes.ok) {
    return { transcript: null, provider: 'watch_page', reason: `caption_http_${capRes.status}` }
  }
  const xml = await capRes.text()
  const transcript = parseCaptionXml(xml)
  if (!transcript) {
    return { transcript: null, provider: 'watch_page', reason: 'caption_parse_failed' }
  }
  return { transcript, provider: 'watch_page' }
}

// Primary strategy: YouTube Innertube API with ANDROID client context.
// Works from cloud/server IPs — avoids the LOGIN_REQUIRED bot detection
// that the watch-page scrape triggers on Vercel's IP range.
async function fetchFromInnertube(videoId: string): Promise<YouTubeTranscriptResult> {
  try {
    const body = {
      videoId,
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '19.09.37',
          androidSdkVersion: 30,
          hl: 'es',
          gl: 'AR',
        },
      },
    }

    const res = await fetch(
      `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}&prettyPrint=false`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
          'X-YouTube-Client-Name': '3',
          'X-YouTube-Client-Version': '19.09.37',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      }
    )

    if (!res.ok) {
      return { transcript: null, provider: 'watch_page', reason: `innertube_http_${res.status}` }
    }

    const player = (await res.json()) as PlayerResponse
    const status = player?.playabilityStatus?.status
    const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []

    if (!tracks.length) {
      const reason =
        status === 'LOGIN_REQUIRED' ? 'login_required'
        : status === 'AGE_CHECK_REQUIRED' ? 'age_restricted'
        : !player ? 'player_response_missing'
        : 'no_caption_tracks'
      return { transcript: null, provider: 'watch_page', reason }
    }

    const preferred = pickCaptionTrack(tracks)
    if (!preferred?.baseUrl) {
      return { transcript: null, provider: 'watch_page', reason: 'caption_track_no_base_url' }
    }

    return await downloadCaptionTrack(preferred.baseUrl)
  } catch (err) {
    return {
      transcript: null,
      provider: 'watch_page',
      reason: 'innertube_exception:' + (err instanceof Error ? err.message : String(err)),
    }
  }
}

// Fallback: scrape the watch page directly (works locally, blocked on Vercel).
async function fetchFromWatchPage(videoId: string): Promise<YouTubeTranscriptResult> {
  try {
    const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: YT_BROWSER_HEADERS,
      signal: AbortSignal.timeout(20_000),
    })
    if (!watchRes.ok) {
      return { transcript: null, provider: 'watch_page', reason: `watch_http_${watchRes.status}` }
    }
    const html = await watchRes.text()

    if (html.includes('consent.youtube.com') || html.includes('before you continue')) {
      return { transcript: null, provider: 'watch_page', reason: 'consent_wall' }
    }

    const playerResponse = extractPlayerResponse(html)
    const status = playerResponse?.playabilityStatus?.status
    const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []

    if (!tracks.length) {
      const reason =
        status === 'LOGIN_REQUIRED' ? 'login_required'
        : status === 'AGE_CHECK_REQUIRED' ? 'age_restricted'
        : !playerResponse ? 'player_response_missing'
        : 'no_caption_tracks'
      return { transcript: null, provider: 'watch_page', reason }
    }

    const preferred = pickCaptionTrack(tracks)
    if (!preferred?.baseUrl) {
      return { transcript: null, provider: 'watch_page', reason: 'caption_track_no_base_url' }
    }

    return await downloadCaptionTrack(preferred.baseUrl)
  } catch (err) {
    return {
      transcript: null,
      provider: 'watch_page',
      reason: 'watch_exception:' + (err instanceof Error ? err.message : String(err)),
    }
  }
}

/**
 * Get a YouTube transcript. Tries Innertube (ANDROID) first — works from cloud
 * IPs. Falls back to watch-page scrape if Innertube returns no captions.
 */
export async function getYouTubeTranscript(videoId: string): Promise<YouTubeTranscriptResult> {
  const innertube = await fetchFromInnertube(videoId)
  if (innertube.transcript) return innertube

  console.warn(`[transcript] Innertube ${videoId} failed (${innertube.reason}) — trying watch page`)
  const watchPage = await fetchFromWatchPage(videoId)
  if (!watchPage.transcript) {
    console.warn(`[transcript] YouTube ${videoId} failed — reason: ${watchPage.reason}`)
  }
  return watchPage
}

/**
 * Best-effort metadata from the watch page (no YouTube Data API key required).
 * Returns nulls for fields that couldn't be parsed.
 */
export async function getYouTubeMetadataFromWatchPage(videoId: string): Promise<YouTubeMetadata> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return { title: null, creator: null, thumbnail: null, duration: null }

    const html = await res.text()
    const player = extractPlayerResponse(html)
    const details = player?.videoDetails

    let duration: string | null = null
    const seconds = details?.lengthSeconds ? Number(details.lengthSeconds) : NaN
    if (Number.isFinite(seconds) && seconds > 0) {
      const h = Math.floor(seconds / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      const s = String(Math.round(seconds % 60)).padStart(2, '0')
      duration = h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${s}`
        : `${m}:${s}`
    }

    const thumbnails = details?.thumbnail?.thumbnails ?? []
    const thumbnail = thumbnails[thumbnails.length - 1]?.url ?? null

    return {
      title: details?.title ?? null,
      creator: details?.author ?? null,
      thumbnail,
      duration,
    }
  } catch {
    return { title: null, creator: null, thumbnail: null, duration: null }
  }
}
