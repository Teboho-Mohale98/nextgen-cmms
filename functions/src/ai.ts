import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { db } from './index'

const SAFETY_FACTOR = Number(process.env.FORECAST_SAFETY_FACTOR ?? 1.5)

interface AiRequest {
  workOrderId?: string
  assetId?: string
  mode: 'root_cause' | 'parts_forecast'
}

interface AiResponse {
  summary: string
  suggestions: string[]
  confidence: number
  provider: 'openai' | 'gemini' | 'rules'
}

/**
 * aiAnalyze - AI-powered maintenance copilot.
 *
 * modes:
 *  - root_cause:  scans historical work orders for an asset, groups by
 *                 title/priority and asks the LLM for the likely failure
 *                 mode + recommended corrective/preventive actions.
 *  - parts_forecast: reads inventory reorder state + recent failure-prone
 *                 assets to forecast a consolidated purchase requisition.
 *
 * Falls back to a transparent rule-based engine when no API key is set -
 * the UI continues to work in any environment. Configure keys via
 * `functions/.env` (OPENAI_API_KEY / GEMINI_API_KEY / AI_PROVIDER).
 */
export const aiAnalyze = onCall<AiRequest>(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.')
  const mode = request.data?.mode
  if (mode !== 'root_cause' && mode !== 'parts_forecast') {
    throw new HttpsError('invalid-argument', 'mode must be root_cause | parts_forecast')
  }

  const provider: 'openai' | 'gemini' | 'rules' =
    process.env.AI_PROVIDER === 'gemini' && process.env.GEMINI_API_KEY
      ? 'gemini'
      : process.env.AI_PROVIDER === 'openai' && process.env.OPENAI_API_KEY
        ? 'openai'
        : 'rules'

  try {
    if (mode === 'root_cause') {
      const context = await buildRootCauseContext(request.data)
      if (provider === 'rules') return ruleRootCause(context)
      return await llmRootCause(context, provider as 'openai' | 'gemini')
    }

    const context = await buildForecastContext()
    if (provider === 'rules') return ruleForecast(context)
    return await llmForecast(context, provider as 'openai' | 'gemini')
  } catch (err) {
    logger.error('aiAnalyze failed', err)
    throw new HttpsError('internal', 'AI analysis failed.')
  }
})

/* ---------------- context builders ---------------- */

interface RootCauseContext {
  assetName?: string
  openCount: number
  recent: Array<{ title: string; priority: string; status: string; createdAt: string }>
}

interface ForecastContext {
  lowStock: Array<{ name: string; partNumber: string; qty: number; min: number; current: number }>
  failRate: number
  totalParts: number
  wornAssets: Array<{ name: string; runHours: number; hoursMax: number }>
}

async function buildRootCauseContext(req: AiRequest): Promise<RootCauseContext> {
  const base = db.collection('workorders')
  const scoped = req.assetId ? base.where('assetId', '==', req.assetId) : base
  const snap = await scoped.orderBy('createdAt', 'desc').limit(40).get()

  const rows = snap.docs.map((d) => {
    const data = d.data()
    return {
      title: String(data.title ?? ''),
      priority: String(data.priority ?? ''),
      status: String(data.status ?? ''),
      createdAt: String(data.createdAt ?? ''),
    }
  })
  const openRows = rows.filter((r) => r.status !== 'completed')

  let assetName: string | undefined
  if (req.assetId) {
    const asset = await db.collection('assets').doc(req.assetId).get()
    assetName = asset.exists ? (asset.data()?.name as string) : undefined
  }

  return { assetName, openCount: openRows.length, recent: rows.slice(0, 25) }
}

async function buildForecastContext(): Promise<ForecastContext> {
  const parts = await db.collection('inventoryParts').get()
  const lowStock = parts.docs
    .map((d) => {
      const data = d.data()
      return {
        name: String(data.name ?? ''),
        partNumber: String(data.partNumber ?? ''),
        qty: Number(data.quantityOnHand ?? 0),
        min: Number(data.minReorderPoint ?? 0),
        current: Number(data.reorderQty ?? Math.max(Number(data.minReorderPoint ?? 0) * 2, 5)),
      }
    })
    .filter((p) => p.qty < p.min * SAFETY_FACTOR)

  const assets = await db.collection('assets').get()
  const wornAssets = assets.docs
    .map((d) => {
      const data = d.data()
      const m = data.metrics ?? {}
      const t = data.thresholds ?? {}
      return {
        name: String(data.name ?? ''),
        runHours: Number(m.runHours ?? 0),
        hoursMax: Number(t.runHoursMax ?? 1),
      }
    })
    .filter((a) => a.runHours > a.hoursMax * 0.85)

  const completed = await db
    .collection('workorders')
    .where('status', '==', 'completed')
    .count()
    .get()
  const completedCount = completed.data().count
  const failRate = completedCount > 0 ? Math.min(1, completedCount / Math.max(1, parts.size * 5)) : 0

  return { lowStock, failRate, totalParts: parts.size, wornAssets }
}

/* ---------------- rule-based engines ---------------- */

function ruleRootCause(context: RootCauseContext): AiResponse {
  const open = context.recent.filter((r) => r.status !== 'completed')
  const priorities = open.map((r) => r.priority).filter((p) => p === 'critical' || p === 'high')
  const suggestions: string[] = [
    'Trend similar failure titles to identify a dominating failure mode (e.g. recurring bearing or coupler failures).',
    context.openCount > 5
      ? 'Backlog exceeding 5 open jobs - consider dedicating a second technician to this asset family.'
      : 'Backlog is within normal limits.',
  ]
  if (priorities.length > 2) {
    suggestions.push('More than 2 open critical/high jobs - escalate to production planner.')
  }
  return {
    summary: `${context.assetName ?? 'Asset'} has ${context.openCount} open job(s) across ${context.recent.length} records. ${priorities.length} high/critical priority job(s).`,
    suggestions,
    confidence: 0.72,
    provider: 'rules',
  }
}

function ruleForecast(context: ForecastContext): AiResponse {
  const names = context.lowStock.map((p) => p.name).join(', ') || 'none currently at reorder band'
  const quant = context.lowStock.reduce((acc, p) => acc + p.current - p.qty, 0) || 0
  return {
    summary: `${context.totalParts} parts on record. ${context.lowStock.length} below/at the reorder band (${names}). Unit demand trend implies ~${quant} units in the next cycle.`,
    suggestions: [
      'Consolidate low-stock items into a single weekly purchase requisition to cut shipping cost.',
      `Safeguard wear items for ${context.wornAssets.length} asset(s) approaching the run-hours service band.`,
    ],
    confidence: 0.68,
    provider: 'rules',
  }
}

/* ---------------- LLM wrappers (OpenAI / Gemini) ---------------- */

async function llmRootCause(
  context: RootCauseContext,
  provider: 'openai' | 'gemini',
): Promise<AiResponse> {
  const prompt = [
    'You are a reliability-engineer copilot for a CMMS.',
    'Analyze the work order history and return JSON: { summary, suggestions: string[], confidence }.',
    'History:',
    JSON.stringify(context.recent),
  ].join('\n')

  const raw = await callLLM(prompt, provider)
  return parseLlm(raw, provider)
}

async function llmForecast(
  context: ForecastContext,
  provider: 'openai' | 'gemini',
): Promise<AiResponse> {
  const prompt = [
    'You are a spare-parts forecaster for a CMMS.',
    'Given inventory + run-hour data, propose a consolidated purchase plan. Return JSON: { summary, suggestions: string[], confidence }.',
    'Data:',
    JSON.stringify(context),
  ].join('\n')

  const raw = await callLLM(prompt, provider)
  return parseLlm(raw, provider)
}

async function callLLM(prompt: string, provider: 'openai' | 'gemini'): Promise<string> {
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    })
    if (!res.ok) throw new Error(`OpenAI ${res.status}`)
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    return data.choices?.[0]?.message?.content ?? '{}'
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
}

function parseLlm(raw: string, provider: 'openai' | 'gemini'): AiResponse {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('LLM returned malformed JSON.')
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
    summary?: string
    suggestions?: string[]
    confidence?: number
  }
  return {
    summary: String(parsed.summary ?? 'No summary returned.'),
    suggestions: (parsed.suggestions ?? []).map((s) => String(s)).slice(0, 6),
    confidence: Number(parsed.confidence ?? 0.6),
    provider,
  }
}