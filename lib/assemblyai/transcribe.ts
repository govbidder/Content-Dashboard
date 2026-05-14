import { AssemblyAI } from 'assemblyai'

export interface TranscriptionResult {
  text: string
  language: string
  costUsd: number
  durationSec?: number
  raw: unknown
}

// AssemblyAI pricing: $0.37/hour for Nano, $0.65/hour for Best
const COST_PER_AUDIO_HOUR_USD = 0.37

export async function transcribeFromUrl(audioUrl: string): Promise<TranscriptionResult> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY
  if (!apiKey) throw new Error('ASSEMBLYAI_API_KEY is not configured')

  const client = new AssemblyAI({ apiKey })

  const transcript = await client.transcripts.transcribe({
    audio_url: audioUrl,
    speech_models: ['nano'],
    language_detection: true,
  })

  if (transcript.status === 'error') {
    throw new Error(`AssemblyAI transcription failed: ${transcript.error ?? 'unknown error'}`)
  }

  const text = transcript.text ?? ''
  const language = transcript.language_code ?? 'unknown'
  const durationSec = transcript.audio_duration ?? undefined
  const costUsd = durationSec != null ? (durationSec / 3600) * COST_PER_AUDIO_HOUR_USD : 0

  return { text, language, costUsd, durationSec, raw: transcript }
}
