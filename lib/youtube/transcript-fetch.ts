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

// Caption download headers — used for both Innertube and watch-page fallback.
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

interface InnertubeClientConfig {
  clientName: string
  clientVersion: string
  key: string
  userAgent?: string
}

async function fetchFromInnertubeClient(
  videoId: string,
  cfg: InnertubeClientConfig,
): Promise<YouTubeTranscriptResult> {
  try {
    const body = {
      videoId,
      context: {
        client: {
          clientName: cfg.clientName,
          clientVersion: cfg.clientVersion,
        },
      },
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (cfg.userAgent) headers['User-Agent'] = cfg.userAgent

    const res = await fetch(
      `https://www.youtube.com/youtubei/v1/player?key=${cfg.key}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      },
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
      reason: `innertube_exception:${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

// Embedded-player clients that work from cloud IPs (no 400).
// TVHTML5_SIMPLY_EMBEDDED and WEB_EMBEDDED are the only two confirmed to
// not get blocked. TVHTML5 (non-simplified) returns login_required from
// cloud IPs for many videos — removed.
const INNERTUBE_PLAYER_CLIENTS: InnertubeClientConfig[] = [
  {
    clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
    clientVersion: '2.0',
    key: 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
  },
  {
    clientName: 'WEB_EMBEDDED_PLAYER',
    clientVersion: '2.20210721.00.00',
    key: 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
  },
]

// Encode videoId as a minimal protobuf for /youtubei/v1/get_transcript.
// Wire format: field 1, type 2 (length-delimited) = 0x0A + length byte + bytes.
function encodeTranscriptParams(videoId: string): string {
  const id = new TextEncoder().encode(videoId)
  const proto = new Uint8Array([0x0a, id.length, ...id])
  return btoa(String.fromCharCode(...proto))
}

interface GetTranscriptSegment {
  snippet?: { runs?: Array<{ text?: string }> }
}
interface GetTranscriptResponse {
  actions?: Array<{
    updateEngagementPanelAction?: {
      content?: {
        transcriptRenderer?: {
          content?: {
            transcriptSearchPanelRenderer?: {
              body?: {
                transcriptSegmentListRenderer?: {
                  initialSegments?: Array<{
                    transcriptSegmentRenderer?: GetTranscriptSegment
                  }>
                }
              }
            }
          }
        }
      }
    }
  }>
}

// Secondary strategy: /youtubei/v1/get_transcript — the endpoint YouTube's
// own UI uses for the "Show transcript" button. Works for ASR captions that
// the /player endpoint doesn't expose in embedded contexts.
async function fetchFromGetTranscript(videoId: string): Promise<YouTubeTranscriptResult> {
  try {
    const params = encodeTranscriptParams(videoId)
    const body = {
      params,
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240101.00.00',
        },
      },
    }

    const res = await fetch(
      'https://www.youtube.com/youtubei/v1/get_transcript?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      },
    )

    if (!res.ok) {
      return { transcript: null, provider: 'watch_page', reason: `get_transcript_http_${res.status}` }
    }

    const data = (await res.json()) as GetTranscriptResponse
    const segments =
      data?.actions?.[0]
        ?.updateEngagementPanelAction?.content
        ?.transcriptRenderer?.content
        ?.transcriptSearchPanelRenderer?.body
        ?.transcriptSegmentListRenderer?.initialSegments ?? []

    if (!segments.length) {
      return { transcript: null, provider: 'watch_page', reason: 'get_transcript_no_segments' }
    }

    const text = segments
      .map((s) =>
        s.transcriptSegmentRenderer?.snippet?.runs
          ?.map((r) => r.text ?? '')
          .join('') ?? '',
      )
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!text) {
      return { transcript: null, provider: 'watch_page', reason: 'get_transcript_empty' }
    }

    return { transcript: text, provider: 'watch_page' }
  } catch (err) {
    return {
      transcript: null,
      provider: 'watch_page',
      reason: `get_transcript_exception:${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

async function fetchFromInnertube(videoId: string): Promise<YouTubeTranscriptResult> {
  // Pass 1: player endpoint via embedded clients (no caption tracks = continue).
  for (const cfg of INNERTUBE_PLAYER_CLIENTS) {
    const result = await fetchFromInnertubeClient(videoId, cfg)
    if (result.transcript) return result
    if (result.reason === 'age_restricted') return result
    console.warn(`[transcript] ${cfg.clientName} ${videoId} → ${result.reason}`)
  }

  // Pass 2: get_transcript endpoint — works for ASR captions unavailable via /player.
  console.warn(`[transcript] player clients exhausted for ${videoId}, trying get_transcript`)
  return fetchFromGetTranscript(videoId)
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

// ─── Apify youtube-transcript actor (primary) ────────────────────────────────

async function fetchFromApify(videoId: string): Promise<YouTubeTranscriptResult> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) return { transcript: null, provider: 'watch_page', reason: 'apify_token_missing' }

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/automation-lab~youtube-transcript/run-sync-get-dataset-items?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [`https://www.youtube.com/watch?v=${videoId}`],
          language: 'es',
          includeAutoGenerated: true,
          mergeSegments: true,
        }),
        signal: AbortSignal.timeout(120_000),
      },
    )

    if (!res.ok) {
      return { transcript: null, provider: 'watch_page', reason: `apify_http_${res.status}` }
    }

    const data = (await res.json()) as Array<Record<string, unknown>>
    const item = data?.[0] ?? null
    if (!item) return { transcript: null, provider: 'watch_page', reason: 'apify_empty' }

    const transcript = [
      item.fullText,
      item.transcript,
      item.text,
      item.captionsText,
      item.subtitlesText,
      Array.isArray(item.segments) ? item.segments.map((s: Record<string, unknown>) => s.text).filter(Boolean).join(' ') : null,
      Array.isArray(item.captions) ? item.captions.map((c: Record<string, unknown>) => c.text).filter(Boolean).join(' ') : null,
    ].find((v): v is string => typeof v === 'string' && v.trim().length > 0)?.trim() ?? null

    if (!transcript) {
      const err = typeof item.error === 'string' ? item.error.toLowerCase() : ''
      const reason = err.includes('login') || err.includes('age') || err.includes('private')
        ? 'login_required'
        : 'apify_no_text'
      return { transcript: null, provider: 'watch_page', reason }
    }

    return { transcript, provider: 'watch_page' }
  } catch (err) {
    return {
      transcript: null,
      provider: 'watch_page',
      reason: `apify_exception:${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/**
 * Get a YouTube transcript.
 * Strategy:
 *   1. Apify automation-lab~youtube-transcript — handles ASR from cloud IPs.
 *   2. Innertube embedded clients (TVHTML5, WEB_EMBEDDED) + get_transcript endpoint.
 *   3. Watch-page scrape fallback (works locally, blocked on Vercel).
 */
export async function getYouTubeTranscript(videoId: string): Promise<YouTubeTranscriptResult> {
  const apify = await fetchFromApify(videoId)
  if (apify.transcript) return apify
  if (apify.reason === 'login_required') return apify

  console.warn(`[transcript] Apify ${videoId} → ${apify.reason}, trying Innertube`)
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
