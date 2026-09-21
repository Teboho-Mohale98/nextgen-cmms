import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/firebaseConfig'
import { notify } from '@/stores/toastStore'
import type { UserRole } from '@/types'

export const functions = getFunctions(app)

export interface RoleChangeInput {
  targetUid: string
  role: UserRole
}

/** Invokes `setUserRole` cloud function (admin only guard lives server-side). */
export async function setUserRoleRemote(targetUid: string, role: UserRole): Promise<void> {
  const fn = httpsCallable<RoleChangeInput, { ok: boolean }>(functions, 'setUserRole')
  await fn({ targetUid, role })
  notify.success('Role updated', `User ${targetUid} granted ${role} access.`)
}

export interface AiAnalysisInput {
  workOrderId?: string
  assetId?: string
  mode: 'root_cause' | 'parts_forecast'
}

export interface AiAnalysisResult {
  summary: string
  suggestions: string[]
  confidence: number
  provider: 'openai' | 'gemini' | 'rules'
}

/** Invokes the AI analysis / forecasting Cloud Function. */
export async function runAiAnalysis(input: AiAnalysisInput): Promise<AiAnalysisResult> {
  const fn = httpsCallable<AiAnalysisInput, AiAnalysisResult>(functions, 'aiAnalyze')
  const res = await fn(input)
  return res.data
}