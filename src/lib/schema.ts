import { z } from 'zod'

// --- Enums ---

export const TradeDirectionSchema = z.enum(['Long', 'Short'])
export const TradeStatusSchema = z.enum(['Open', 'Closed', 'Partial'])

export const TimeframeSchema = z.enum(['M5', 'M15', 'M30', '1h', '4h', 'D', 'W'])

export const SetupTypeSchema = z.enum([
  'Trend Following',
  'Pullback to S/R',
  'Breakout',
  'Range Trading',
  'Mean Reversion',
])

export const EmotionSchema = z.enum([
  'Calm',
  'Confident',
  'Neutral',
  'Uncertain',
  'Rushed',
  'Frustrated',
])

export const MistakeSchema = z.enum([
  'FOMO',
  'Revenge Trading',
  'Overtrading',
  'No Pre-Trade Note',
  'Moved Stop Loss',
  'Ignored Checklist',
  'Wrong Position Size',
  'Traded Office Day',
  'Chased Entry',
  'Closed Too Early',
  'Excessive Risk',
  'Ignored Warnings',
])

// --- Partial Close ---

export const PartialCloseSchema = z.object({
  date: z.string(),
  size: z.number(),
  exitPrice: z.number(),
  pnl: z.number(),
})

export type PartialClose = z.infer<typeof PartialCloseSchema>

// --- Trade ---

export const TradeSchema = z.object({
  id: z.string(),
  name: z.string(),
  direction: TradeDirectionSchema,
  entryPrice: z.number(),
  exitPrice: z.number().nullable(),
  sl: z.number().nullable(),
  tp: z.number().nullable(),
  size: z.number(),
  pnl: z.number().nullable(),
  riskPercent: z.number().nullable(),
  riskAmount: z.number().nullable(),
  rrRatio: z.number().nullable(),
  leverage: z.number().nullable(),
  atr14: z.number().nullable(),
  spread: z.number().nullable(),
  status: TradeStatusSchema,
  setupType: SetupTypeSchema.nullable(),
  timeframe: TimeframeSchema.nullable(),
  emotion: EmotionSchema.nullable(),
  mistakes: z.array(MistakeSchema),
  preTradeNote: z.string().nullable(),
  lessonLearned: z.string().nullable(),
  notes: z.string().nullable(),
  checklistScore: z.number().nullable(),
  tags: z.array(z.string()),
  openDate: z.string().nullable(),
  closeDate: z.string().nullable(),
  accountId: z.string().nullable(),
  instrumentId: z.string().nullable(),
  partialCloses: z.array(PartialCloseSchema).default([]),
})

export const CreateTradeSchema = z.object({
  direction: TradeDirectionSchema,
  entryPrice: z.number().positive(),
  sl: z.number().positive(),
  tp: z.number().positive().optional(),
  size: z.number().positive(),
  riskPercent: z.number().positive().max(10),
  riskAmount: z.number().positive(),
  rrRatio: z.number().optional(),
  leverage: z.number().optional(),
  atr14: z.number().optional(),
  spread: z.number().optional(),
  status: TradeStatusSchema.default('Open'),
  setupType: SetupTypeSchema,
  timeframe: TimeframeSchema.default('1h'),
  emotion: EmotionSchema.optional(),
  mistakes: z.array(MistakeSchema).default([]),
  preTradeNote: z.string().min(1, 'Pre-trade note is required'),
  lessonLearned: z.string().optional(),
  notes: z.string().optional(),
  checklistScore: z.number().optional(),
  tags: z.array(z.string()).default([]),
  openDate: z.string(),
  closeDate: z.string().optional(),
  accountId: z.string(),
  instrumentId: z.string(),
})

/** Schema for partially or fully closing a trade. P&L is pre-calculated client-side. */
export const CloseTradeSchema = z.object({
  exitPrice: z.number().positive(),
  size: z.number().positive(),
  pnl: z.number(),          // this close's P&L (or total if isFinalClose)
  isFinalClose: z.boolean(),
  partialCloses: z.array(PartialCloseSchema), // full updated array incl. this close
})

export type CloseTradeRequest = z.infer<typeof CloseTradeSchema>

/** Schema for closing or updating an existing trade. */
export const UpdateTradeSchema = z.object({
  exitPrice: z.number().optional(),
  pnl: z.number().optional(),
  status: TradeStatusSchema.optional(),
  closeDate: z.string().optional(),
  lessonLearned: z.string().optional(),
  notes: z.string().optional(),
  mistakes: z.array(MistakeSchema).optional(),
})

export type UpdateTrade = z.infer<typeof UpdateTradeSchema>

// --- Account ---

export const AccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  broker: z.string().nullable(),
  balance: z.number(),
  startBalance: z.number().nullable(),
  currency: z.string().default('USD'),
  status: z.enum(['Active', 'Closed', 'Failed', 'Passed']),
  category: z.string().nullable(),
  challengeType: z.string().nullable(),
  profitTargetPct: z.number().nullable(),
  maxDailyLossPct: z.number().nullable(),
  maxOverallLossPct: z.number().nullable(),
  minTradingDays: z.number().nullable(),
  description: z.string().nullable(),
  date: z.string().nullable(),
})

// --- Instrument ---

export const InstrumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  type: z.enum(['index', 'forex', 'commodity', 'stock', 'crypto']),
  leverage: z.number(),
  marketOpen: z.string().nullable(),
  marketClose: z.string().nullable(),
  currency: z.string().nullable(),
  active: z.boolean(),
  pipValue: z.number(),
  contractSize: z.number(),
  tickSize: z.number(),
  atr14: z.number().nullable(),
  atrUpdatedAt: z.string().nullable(),
})

// --- Inferred types ---

export type Trade = z.infer<typeof TradeSchema>
export type CreateTrade = z.infer<typeof CreateTradeSchema>
export type Account = z.infer<typeof AccountSchema>
export type Instrument = z.infer<typeof InstrumentSchema>
export type TradeDirection = z.infer<typeof TradeDirectionSchema>
export type TradeStatus = z.infer<typeof TradeStatusSchema>
export type SetupType = z.infer<typeof SetupTypeSchema>
export type Emotion = z.infer<typeof EmotionSchema>
export type Mistake = z.infer<typeof MistakeSchema>
export type Timeframe = z.infer<typeof TimeframeSchema>
