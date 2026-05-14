/**
 * Instagram URL resolver — resolve a single Instagram post/reel URL into the
 * fields needed for transcription (videoUrl, caption, username, duration).
 *
 * Why a separate file from `instagram-reel-scraper.ts`:
 *   - That scraper is keyed by USERNAME and runs the official reel scraper
 *     for batch competitor work.
 *   - This resolver is keyed by URL and tries multiple actors that accept
 *     `directUrls`, falling back to the username-based scraper only as a
 *     last resort. Use case: the user pastes a single URL in `/transcript`.
 *
 * Ported from Smart-Scale's `runApifyInstagramResolvers` in
 * `app/api/transcript/route.ts`. Uses APIFY_API_TOKEN (project standard env
 * name; Smart-Scale uses APIFY_TOKEN).
 */

const APIFY_BASE = 'https://api.apify.com/v2'

export interface InstagramResolved {
  videoUrl: string | null
  caption: string | null
  username: string | null
  /** Formatted MM:SS or HH:MM:SS, or null if not derivable. */
  duration: string | null
}

interface ApifyItem {
  videoUrl?: string
  video_url?: string
  videoUrlHd?: string
  videoUrlSd?: string
  videoPlaybackUrl?: string
  mediaUrl?: string
  video?: string
  downloadUrl?: string
  postVideoUrl?: string
  media?: { videoUrl?: string }
  // Some scrapers return a `videos` array with {url, ...} entries
  videos?: Array<{ url?: string; src?: string }>
  caption?: string
  text?: string
  description?: string
  title?: string
  type?: string
  ownerUsername?: string
  username?: string
  authorUsername?: string
  owner?: { username?: string }
  author?: { username?: string }
  videoDuration?: number
  duration?: number
  video_duration?: number
  shortCode?: string
  code?: string
  shortcode?: string
}

interface ActorAttempt {
  id: string
  buildInputs: (url: string) => Record<string, unknown>[]
}

const DIRECT_URL_ACTORS: ActorAttempt[] = [
  {
    id: 'apify~instagram-scraper',
    buildInputs: (url) => [
      { directUrls: [url], resultsType: 'posts', resultsLimit: 1 },
      { directUrls: [url], resultsType: 'details', resultsLimit: 1 },
    ],
  },
  {
    id: 'clockworks~instagram-scraper',
    buildInputs: (url) => [
      { directUrls: [url], resultsType: 'posts', resultsLimit: 1 },
    ],
  },
]

function pickVideoUrl(item: ApifyItem): string | null {
  return (
    item.videoUrl ??
    item.video_url ??
    item.videoUrlHd ??
    item.videoUrlSd ??
    item.videoPlaybackUrl ??
    item.mediaUrl ??
    item.video ??
    item.downloadUrl ??
    item.postVideoUrl ??
    item.media?.videoUrl ??
    item.videos?.[0]?.url ??
    item.videos?.[0]?.src ??
    null
  )
}

function pickCaption(item: ApifyItem): string | null {
  return item.caption ?? item.text ?? item.description ?? item.title ?? null
}

function pickUsername(item: ApifyItem): string | null {
  return (
    item.ownerUsername ??
    item.username ??
    item.authorUsername ??
    item.owner?.username ??
    item.author?.username ??
    null
  )
}

function pickDuration(item: ApifyItem): string | null {
  const raw = item.videoDuration ?? item.duration ?? item.video_duration
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return null
  const total = Math.round(raw)
  const m = Math.floor(total / 60)
  const s = String(total % 60).padStart(2, '0')
  return `${m}:${s}`
}

async function runActor(
  actorId: string,
  input: Record<string, unknown>,
): Promise<ApifyItem | null> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) return null

  const endpoint =
    `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items` +
    `?token=${token}&timeout=90&memory=1024`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(110_000),
  })

  if (!res.ok) return null

  const text = await res.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }

  const item = Array.isArray(data)
    ? (data[0] as ApifyItem | undefined)
    : ((data as { items?: ApifyItem[] }).items?.[0] as ApifyItem | undefined)
  return item ?? null
}

function extractShortcodeAndUsername(rawUrl: string): {
  shortCode: string | null
  username: string | null
  normalizedUrl: string
} {
  const normalizedUrl = rawUrl.replace(/\/+$/, '').replace('/reels/', '/reel/')
  const shortCode =
    normalizedUrl.match(/\/(p|reel|reels|tv)\/([^/?#]+)/)?.[2] ?? null
  let username: string | null = null
  const m = normalizedUrl.match(/instagram\.com\/([^/?#]+)\/(p|reel|reels|tv)\//)
  if (m?.[1] && !['p', 'reel', 'reels', 'tv'].includes(m[1])) {
    username = m[1]
  }
  return { shortCode, username, normalizedUrl }
}

/**
 * Try every available Apify resolver for an Instagram URL until one returns
 * an item with the fields we need. Returns null if every actor fails.
 */
export async function resolveInstagramUrl(rawUrl: string): Promise<InstagramResolved | null> {
  if (!process.env.APIFY_API_TOKEN) return null

  const { shortCode, username, normalizedUrl } = extractShortcodeAndUsername(rawUrl)
  const base = normalizedUrl
  const withSlash = `${base}/`

  // Pass 1 — actors that accept `directUrls`. Try with and without trailing slash.
  // Only accept an item if it actually has a videoUrl — otherwise keep trying.
  for (const actor of DIRECT_URL_ACTORS) {
    for (const url of [withSlash, base]) {
      for (const input of actor.buildInputs(url)) {
        const item = await runActor(actor.id, input)
        const videoUrl = item ? pickVideoUrl(item) : null
        if (videoUrl) {
          return {
            videoUrl,
            caption: pickCaption(item!),
            username: pickUsername(item!) ?? username,
            duration: pickDuration(item!),
          }
        }
        if (item) {
          console.warn('[instagram-resolver] item has no videoUrl. keys:', Object.keys(item).join(', '))
        }
      }
    }
  }

  // Pass 2 — fallback: username-keyed reel scraper. Only works when the URL
  // contained a username (e.g. instagram.com/USER/reel/CODE/). Pulls the user's
  // recent reels and matches by shortCode.
  if (username && shortCode) {
    const item = await runActor('apify~instagram-reel-scraper', {
      username,
      resultsLimit: 20,
    })
    const videoUrl = item ? pickVideoUrl(item) : null
    if (videoUrl) {
      return {
        videoUrl,
        caption: pickCaption(item!),
        username: pickUsername(item!) ?? username,
        duration: pickDuration(item!),
      }
    }
  }

  return null
}

export function isInstagramUrl(url: string): boolean {
  return /instagram\.com\/(p|reel|reels|tv)\//i.test(url)
}
