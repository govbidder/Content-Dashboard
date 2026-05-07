export type Period = 7 | 14 | 30 | 90

export type Tab =
  | 'dashboard'
  | 'reels'
  | 'historias'
  | 'publicaciones'
  | 'competencia'
  | 'referencias'
  | 'demografia'

export interface GlobalStats {
  views: number
  followers: number
  engagementRate: number
}

export interface DashboardStats {
  impressions: number
  avgDailyReach: number
  impressionsChange: number
  profileConversionRate: number
  profileVisits: number
  newFollowers: number
  conversionChange: number
  profileGrowth: number
  growthLast30: number
  trafficOrganic: number
  trafficPaid: number
  likes: number
  saves: number
  comments: number
  engagementRate: number
  bestReelViews: number
  chartData: { date: string; impressions: number; reach: number }[]
  interactionsData: { date: string; likes: number; saves: number; comments: number }[]
  viewsGoalPct: number
  followersGoalPct: number
}

export interface Reel {
  id: string
  thumbnail: string
  title: string
  caption: string
  duration: string
  publishedAt: string
  views: number
  viewsOrganic: number
  viewsPaid: number
  likes: number
  saves: number
  comments: number
  shares: number
  organicPercent: number
  multiplier: number
  isAd: boolean
  isTrialReel: boolean
}

export interface Story {
  id: string
  thumbnail: string
  publishedAt: string
  reach: number
  impressions: number
  replies: number
  stickerTaps: number
  exits: number
  completionRate: number
}

export interface Post {
  id: string
  thumbnail: string
  caption: string
  publishedAt: string
  reach: number
  impressions: number
  likes: number
  saves: number
  comments: number
  shares: number
  engagementRate: number
}

export interface Competitor {
  id: string
  username: string
  avatar: string
  followers: number
  followersChange: number
  engagementRate: number
  postsPerWeek: number
  avgViews: number
  avgLikes: number
}

// ─── Tareas ────────────────────────────────────────────────────────────────

export type TaskColumnId = 'por-hacer' | 'en-proceso' | 'listo'

export interface TaskLabel {
  text: string
  color: string
}

export interface Task {
  id: string
  title: string
  description?: string
  dueDate?: string
  label?: TaskLabel
  columnId: TaskColumnId
  createdAt: string
  order: number
}

// ─── Unified content status (shared between Pipeline and Calendar) ────────────

/** Single source of truth for content lifecycle:
 *  Drafts → En proceso → Programado → Publicado
 */
export type UnifiedStatus = 'drafts' | 'en-proceso' | 'programado' | 'publicado'


// ─── Content categories ───────────────────────────────────────────────────────

export type PipelineCategory = 'motivacional' | 'educacional' | 'humor' | 'personal' | 'otro'
export type ReelCategory = 'viral' | 'nicho'
export type HistoriaCategory = 'lifestyle' | 'dolor' | 'deseo'
export type ContentCategory = PipelineCategory | ReelCategory | HistoriaCategory

/** Media-shape metadata for a content piece. Independent of which calendar
 *  workspace hosts the piece (see ContentWorkspace). */
export type ContentFormat = 'reel' | 'carrusel' | 'historia' | 'foto' | 'video-largo' | 'meme'

/** Calendar workspace discriminant. The app has exactly two planning calendars
 *  (Cal.Reels, Cal.Historias), each with its own category vocabulary.
 *  This is NOT the media format — a 'reel' workspace piece may have format: 'carrusel'.
 *  Do NOT widen this union to match ContentFormat. */
export type ContentWorkspace = 'reel' | 'historia'

export type ContentPlatform = 'instagram' | 'tiktok' | 'youtube' | 'threads'

// ─── Unified content piece (single store: eternity_content) ──────────────────

/**
 * One record represents one piece of content.
 * - Always visible in the Pipeline (grouped by status).
 * - Visible in Cal.Reels/Cal.Historias only when `date` is set and `type` matches.
 */
export interface ContentPiece {
  id: string
  title: string
  description: string
  /** Calendar workspace — see ContentWorkspace for rationale. */
  type: ContentWorkspace
  status: UnifiedStatus
  color: string
  category?: ContentCategory
  emoji?: string
  // Calendar fields — item appears in calendar only when date is set
  date?: string
  endDate?: string
  // Pipeline enrichment fields (optional)
  /** Media-shape tag (may differ from workspace, e.g. a 'reel' workspace piece
   *  delivered as a 'carrusel'). */
  format?: ContentFormat
  platform?: ContentPlatform
  createdAt: string
  order: number
}

/** Calendar views only receive items where date is guaranteed present */
export type ContentItem = ContentPiece & { date: string }

// ─── Calendario Grid ──────────────────────────────────────────────────────────

export interface GridCell {
  date: Date
  isCurrent: boolean  // false = neighboring month (previous/next)
}

// ─── Content Templates ───────────────────────────────────────────────────────

export interface ContentTemplate {
  id: string
  name: string
  status: UnifiedStatus
  color: string
  category?: ContentCategory
  description?: string
}

// ─── Guiones ──────────────────────────────────────────────────────────────────

export interface GuionTab {
  id: string
  name: string
  emoji: string   // empty = no emoji (shows default dot)
  createdAt: string
}

export interface GuionItem {
  id: string
  tabId: string   // parent tab
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

// ─── Bases de negocio v2 ─────────────────────────────────────────────────────

export interface ICPData {
  nombre: string
  edad: string
  ingresos: string
  nicho: string
  rol: string
  dolores: string[]
  deseos: string[]
  creencias: string[]
  updatedAt: string
}

export interface ChipListData {
  items: string[]
  updatedAt: string
}

export interface OfertaData {
  nombre: string
  precio: string
  promesa: string
  paraQuien: string
  incluye: string[]
  updatedAt: string
}

export interface InsightItem {
  id: string
  title: string
  body: string
  createdAt: string
}

export interface InsightsData {
  items: InsightItem[]
}

export interface CompetitorEntry {
  id: string
  nombre: string
  fortalezas: string[]
  debilidades: string[]
  diferenciador: string
}

export interface CompetenciaData {
  items: CompetitorEntry[]
}

// ─── Baúl de ideas ────────────────────────────────────────────────────────

export interface IdeaItem {
  id: string
  title: string
  format: ContentFormat
  notes?: string
  referenceUrl?: string
  createdAt: string
}
