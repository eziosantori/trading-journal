import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTrade } from '@/lib/api'
import { getChecklist } from '@/lib/checklist'
import { riskAmount, positionSize, rrRatio, isRiskWithinLimit } from '@/lib/calculations'
import { useAccounts } from '@/hooks/useDashboard'
import { useInstruments } from '@/hooks/useInstruments'
import { useUIStore } from '@/stores/uiStore'
import type {
  TradeDirection,
  SetupType,
  Timeframe,
  Emotion,
  CreateTrade as CreateTradeType,
  Account,
  Instrument,
} from '@/lib/schema'
import { InstrumentCombobox } from '@/components/InstrumentCombobox'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

interface Prefill {
  entryPrice?: number
  sl?: number
  tp?: number
  size?: number
  riskPercent?: number
  riskAmount?: number
  rrRatio?: number
}

type CalcMode = 'sl-size' | 'risk-pct'

interface FormData {
  accountId: string
  instrumentId: string
  direction: TradeDirection | ''
  setupType: SetupType | ''
  timeframe: Timeframe
  openDate: string
  // Step 3 — Prezzi & Rischio
  calcMode: CalcMode
  entryPrice: string
  sl: string
  tp: string
  size: string       // editable in sl-size, computed in risk-pct
  riskPercent: string // editable in risk-pct, computed in sl-size
  spread: string     // optional, at time of opening
  // Step 4 — Contesto
  emotion: Emotion | ''
  leverage: string   // auto-filled from instrument (readonly)
  atr14: string
  // Step 5 — Nota
  preTradeNote: string
}

// ── Constants ──────────────────────────────────────────────────────────────

const TIMEFRAMES: Timeframe[] = ['M5', 'M15', 'M30', '1h', '4h', 'D', 'W']

const SETUP_TYPES: SetupType[] = [
  'Trend Following',
  'Pullback to S/R',
  'Breakout',
  'Range Trading',
  'Mean Reversion',
]
const EMOTIONS: Emotion[] = ['Calm', 'Confident', 'Neutral', 'Uncertain', 'Rushed', 'Frustrated']
const STEP_LABELS = ['Strumento & Setup', 'Checklist', 'Prezzi & Rischio', 'Contesto', 'Nota Pre-trade']

// ── Helpers ────────────────────────────────────────────────────────────────

function nowLocal() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function str(n?: number) {
  return n != null ? String(n) : ''
}

function n(s: string) {
  return parseFloat(s) || 0
}

function buildInitialData(prefill?: Prefill, activeAccountId?: string | null): FormData {
  return {
    accountId: activeAccountId ?? '',
    instrumentId: '',
    direction: 'Long',
    setupType: '',
    timeframe: '1h' as Timeframe,
    openDate: nowLocal(),
    calcMode: 'sl-size',
    entryPrice: str(prefill?.entryPrice),
    sl: str(prefill?.sl),
    tp: str(prefill?.tp),
    size: str(prefill?.size),
    riskPercent: str(prefill?.riskPercent),
    spread: '',
    emotion: '',
    leverage: '',
    atr14: '',
    preTradeNote: '',
  }
}

interface Computed {
  riskPct: number
  riskDollar: number
  size: number
  rr: number | null
}

function computePriceFields(data: FormData, balance: number, pipValue: number): Computed {
  const entry = n(data.entryPrice)
  const sl = n(data.sl)
  const tp = n(data.tp)

  let size: number, riskPct: number, riskDollar: number

  if (data.calcMode === 'sl-size') {
    size = n(data.size)
    const slDist = Math.abs(entry - sl)
    riskDollar = slDist * size * pipValue
    riskPct = balance > 0 ? (riskDollar / balance) * 100 : 0
  } else {
    riskPct = n(data.riskPercent)
    riskDollar = riskAmount(balance, riskPct)
    size = positionSize(balance, riskPct, entry, sl, pipValue)
  }

  const rr = tp > 0 && sl > 0 && entry > 0 ? rrRatio(entry, sl, tp) : null
  return { size, riskPct, riskDollar, rr }
}

// ── Validation ──────────────────────────────────────────────────────────────

function isStep1Valid(d: FormData) {
  return !!(d.accountId && d.instrumentId && d.direction && d.setupType && d.openDate)
}

function isStep3Valid(d: FormData) {
  const pos = (s: string) => parseFloat(s) > 0
  if (d.calcMode === 'sl-size') return pos(d.entryPrice) && pos(d.sl) && pos(d.size)
  return pos(d.riskPercent) && pos(d.entryPrice) && pos(d.sl)
}

// ── Shared styles ──────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const readonlyCls =
  'w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground font-mono cursor-default'
const labelCls = 'text-sm font-medium block mb-1'

function ReadonlyField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <label className={cn(labelCls, 'text-muted-foreground')}>
        {label} <span className="text-xs font-normal opacity-60">(calcolato)</span>
      </label>
      <div className={readonlyCls}>{value || '—'}</div>
    </div>
  )
}

// ── Step 1: Strumento & Setup ──────────────────────────────────────────────

function StepInstrumentSetup({
  data,
  accounts,
  instruments,
  onChange,
}: {
  data: FormData
  accounts: Account[]
  instruments: Instrument[]
  onChange: (key: keyof FormData, value: string) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Account *</label>
        <select
          value={data.accountId}
          onChange={(e) => onChange('accountId', e.target.value)}
          className={inputCls}
        >
          <option value="">Seleziona account...</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Strumento *</label>
        <InstrumentCombobox
          instruments={instruments}
          value={data.instrumentId}
          onChange={(id) => onChange('instrumentId', id)}
        />
      </div>

      <div>
        <label className={labelCls}>Direzione *</label>
        <div className="flex gap-2">
          {(['Long', 'Short'] as TradeDirection[]).map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => onChange('direction', dir)}
              className={cn(
                'flex-1 rounded-md border py-2 text-sm font-medium transition-colors',
                data.direction === dir
                  ? dir === 'Long'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-red-500/20 border-red-500 text-red-400'
                  : 'border-input text-muted-foreground hover:border-foreground/30',
              )}
            >
              {dir === 'Long' ? '▲ Long' : '▼ Short'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Setup Type *</label>
        <select
          value={data.setupType}
          onChange={(e) => onChange('setupType', e.target.value)}
          className={inputCls}
        >
          <option value="">Seleziona setup...</option>
          {SETUP_TYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Timeframe operativo *</label>
        <div className="flex gap-1.5 flex-wrap">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onChange('timeframe', tf)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm font-mono transition-colors',
                data.timeframe === tf
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-input text-muted-foreground hover:border-foreground/30',
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Data apertura *</label>
        <input
          type="datetime-local"
          value={data.openDate}
          onChange={(e) => onChange('openDate', e.target.value)}
          className={inputCls}
        />
      </div>
    </div>
  )
}

// ── Step 2: Checklist ──────────────────────────────────────────────────────

function StepChecklist({
  setupType,
  checkedItems,
  isOfficeDay,
  onToggleItem,
  onToggleOfficeDay,
}: {
  setupType: SetupType
  checkedItems: Set<string>
  isOfficeDay: boolean
  onToggleItem: (id: string) => void
  onToggleOfficeDay: () => void
}) {
  const items = getChecklist(setupType, isOfficeDay)
  const score = Math.round((checkedItems.size / items.length) * 100)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isOfficeDay}
            onChange={onToggleOfficeDay}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm">Oggi è un giorno di ufficio</span>
        </label>
        <span
          className={cn(
            'text-sm font-mono font-semibold',
            score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-muted-foreground',
          )}
        >
          {checkedItems.size}/{items.length} ({score}%)
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <label
            key={item.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors',
              checkedItems.has(item.id)
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-input hover:border-foreground/20',
            )}
          >
            <input
              type="checkbox"
              checked={checkedItems.has(item.id)}
              onChange={() => onToggleItem(item.id)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-input"
            />
            <span className="text-sm leading-relaxed">
              <span className="text-muted-foreground text-xs font-mono mr-1">[{item.id}]</span>
              {item.text}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ── Step 3: Prezzi & Rischio ───────────────────────────────────────────────

function StepPricesRisk({
  data,
  onChange,
  balance,
  pipValue,
}: {
  data: FormData
  onChange: (key: keyof FormData, value: string) => void
  balance: number
  pipValue: number
}) {
  const computed = computePriceFields(data, balance, pipValue)
  const isModeA = data.calcMode === 'sl-size'

  const riskWarning = isModeA
    ? !isRiskWithinLimit(computed.riskPct)
    : !isRiskWithinLimit(n(data.riskPercent))

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div>
        <label className={labelCls}>Modalità inserimento</label>
        <div className="flex gap-2">
          {(['sl-size', 'risk-pct'] as CalcMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange('calcMode', mode)}
              className={cn(
                'flex-1 rounded-md border py-1.5 text-sm transition-colors',
                data.calcMode === mode
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-input text-muted-foreground hover:border-foreground/30',
              )}
            >
              {mode === 'sl-size' ? 'SL + Lotti → Risk' : 'Risk% → Lotti'}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {isModeA
            ? 'Inserisci Entry, SL e Position Size — Risk% e $Risk vengono calcolati.'
            : 'Inserisci Risk% e prezzi — Position Size viene calcolata.'}
          {balance > 0 && (
            <span className="ml-1 font-mono">Balance: ${balance.toLocaleString('en-US')}</span>
          )}
        </p>
      </div>

      {/* Common: Entry */}
      <div>
        <label className={labelCls}>Entry Price *</label>
        <input
          type="number"
          step="any"
          value={data.entryPrice}
          onChange={(e) => onChange('entryPrice', e.target.value)}
          placeholder="0.00"
          className={cn(inputCls, 'font-mono')}
        />
      </div>

      {/* Common: SL */}
      <div>
        <label className={labelCls}>Stop Loss *</label>
        <input
          type="number"
          step="any"
          value={data.sl}
          onChange={(e) => onChange('sl', e.target.value)}
          placeholder="0.00"
          className={cn(inputCls, 'font-mono')}
        />
      </div>

      {/* Common: TP */}
      <div>
        <label className={labelCls}>Take Profit (opzionale)</label>
        <input
          type="number"
          step="any"
          value={data.tp}
          onChange={(e) => onChange('tp', e.target.value)}
          placeholder="0.00"
          className={cn(inputCls, 'font-mono')}
        />
      </div>

      {/* Common: Spread */}
      <div>
        <label className={labelCls}>Spread all'apertura (opzionale)</label>
        <input
          type="number"
          step="any"
          value={data.spread}
          onChange={(e) => onChange('spread', e.target.value)}
          placeholder="0.00"
          className={cn(inputCls, 'font-mono')}
        />
      </div>

      {/* Mode A: editable Size */}
      {isModeA && (
        <div>
          <label className={labelCls}>Position Size (lots) *</label>
          <input
            type="number"
            step="any"
            value={data.size}
            onChange={(e) => onChange('size', e.target.value)}
            placeholder="0.0000"
            className={cn(inputCls, 'font-mono')}
          />
        </div>
      )}

      {/* Mode B: editable Risk% */}
      {!isModeA && (
        <div>
          <label className={cn(labelCls, riskWarning && 'text-amber-400')}>
            Risk % *{riskWarning && <span className="ml-1 text-xs font-normal">(⚠ supera il 2%)</span>}
          </label>
          <input
            type="number"
            step="any"
            value={data.riskPercent}
            onChange={(e) => onChange('riskPercent', e.target.value)}
            placeholder="1"
            className={cn(inputCls, 'font-mono', riskWarning && 'border-amber-500/50')}
          />
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-input pt-4 space-y-4">
        <p className="text-xs text-muted-foreground -mb-2">Valori calcolati</p>

        {/* Mode A: computed Risk% and $Risk */}
        {isModeA && (
          <>
            <ReadonlyField
              label="Risk %"
              value={
                computed.riskPct > 0
                  ? `${computed.riskPct.toFixed(2)}%${!isRiskWithinLimit(computed.riskPct) ? ' ⚠' : ''}`
                  : ''
              }
            />
            <ReadonlyField
              label="Risk Amount ($)"
              value={computed.riskDollar > 0 ? `$${computed.riskDollar.toFixed(2)}` : ''}
            />
          </>
        )}

        {/* Mode B: computed Size and $Risk */}
        {!isModeA && (
          <>
            <ReadonlyField
              label="Position Size (lots)"
              value={computed.size > 0 ? computed.size.toFixed(4) : ''}
            />
            <ReadonlyField
              label="Risk Amount ($)"
              value={computed.riskDollar > 0 ? `$${computed.riskDollar.toFixed(2)}` : ''}
            />
          </>
        )}

        <ReadonlyField
          label="R:R Ratio"
          value={computed.rr != null ? computed.rr.toFixed(2) : ''}
        />
      </div>
    </div>
  )
}

// ── Step 4: Contesto ───────────────────────────────────────────────────────

function StepContext({
  data,
  onChange,
  instrumentName,
}: {
  data: FormData
  onChange: (key: keyof FormData, value: string) => void
  instrumentName: string
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Emozione (opzionale)</label>
        <select
          value={data.emotion}
          onChange={(e) => onChange('emotion', e.target.value)}
          className={inputCls}
        >
          <option value="">Seleziona...</option>
          {EMOTIONS.map((em) => (
            <option key={em} value={em}>
              {em}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={cn(labelCls, 'text-muted-foreground')}>
          Leva{' '}
          {instrumentName && (
            <span className="text-xs font-normal opacity-60">
              (da strumento: {instrumentName})
            </span>
          )}
        </label>
        <div className={readonlyCls}>
          {data.leverage ? `${data.leverage}×` : '—'}
        </div>
      </div>

      <div>
        <label className={labelCls}>ATR(14) (opzionale)</label>
        <input
          type="number"
          step="any"
          value={data.atr14}
          onChange={(e) => onChange('atr14', e.target.value)}
          placeholder="0.00"
          className={cn(inputCls, 'font-mono')}
        />
      </div>
    </div>
  )
}

// ── Step 5: Nota Pre-trade ─────────────────────────────────────────────────

function StepPreTradeNote({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const isEmpty = value.trim().length === 0
  return (
    <div>
      <label className={labelCls}>
        Nota Pre-trade *{' '}
        <span className="text-muted-foreground font-normal text-xs">(obbligatoria)</span>
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Descrivi il setup, il contesto di mercato e la tua tesi di trading..."
        rows={10}
        className={cn(
          inputCls,
          'resize-none leading-relaxed',
          isEmpty && 'border-amber-500/50',
        )}
      />
      <p className="text-xs text-muted-foreground mt-1 text-right">{value.length} caratteri</p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function LogTrade() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const activeAccountId = useUIStore((s) => s.activeAccountId)

  const prefill = (location.state as { prefill?: Prefill } | null)?.prefill

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [data, setData] = useState<FormData>(() => buildInitialData(prefill, activeAccountId))
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [isOfficeDay, setIsOfficeDay] = useState(false)

  const { data: accounts = [], isLoading: accountsLoading } = useAccounts()
  const { data: instruments = [], isLoading: instrumentsLoading } = useInstruments()

  const selectedAccount = accounts.find((a) => a.id === data.accountId) ?? null
  const selectedInstrument = instruments.find((i) => i.id === data.instrumentId) ?? null
  const balance = selectedAccount?.balance ?? 0
  const pipValue = selectedInstrument?.pipValue ?? 0

  const mutation = useMutation({
    mutationFn: createTrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      navigate('/trades')
    },
  })

  function onChange(key: keyof FormData, value: string) {
    // Auto-fill leverage (readonly) when instrument changes
    if (key === 'instrumentId') {
      const inst = instruments.find((i) => i.id === value)
      setData((prev) => ({
        ...prev,
        instrumentId: value,
        leverage: inst ? String(inst.leverage) : prev.leverage,
      }))
      return
    }
    setData((prev) => ({ ...prev, [key]: value }))
  }

  function toggleItem(id: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function canProceed() {
    if (step === 1) return isStep1Valid(data)
    if (step === 3) return isStep3Valid(data)
    return true
  }

  function handleSubmit() {
    if (!data.setupType || !data.direction) return

    const setupType = data.setupType as SetupType
    const items = getChecklist(setupType, isOfficeDay)
    const checklistScore = Math.round((checkedItems.size / items.length) * 100)

    const { size, riskPct, riskDollar, rr } = computePriceFields(data, balance, pipValue)

    const payload: CreateTradeType = {
      direction: data.direction as TradeDirection,
      entryPrice: n(data.entryPrice),
      sl: n(data.sl),
      tp: data.tp ? n(data.tp) : undefined,
      size,
      riskPercent: riskPct,
      riskAmount: riskDollar,
      rrRatio: rr ?? undefined,
      leverage: data.leverage ? n(data.leverage) : undefined,
      atr14: data.atr14 ? n(data.atr14) : undefined,
      spread: data.spread ? n(data.spread) : undefined,
      status: 'Open',
      setupType,
      timeframe: data.timeframe,
      emotion: data.emotion ? (data.emotion as Emotion) : undefined,
      mistakes: [],
      preTradeNote: data.preTradeNote,
      checklistScore,
      tags: [],
      openDate: new Date(data.openDate).toISOString(),
      accountId: data.accountId,
      instrumentId: data.instrumentId,
    }

    mutation.mutate(payload)
  }

  const isLoading = accountsLoading || instrumentsLoading

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Log Trade</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Nota pre-trade e checklist sono obbligatorie.
      </p>

      {/* Progress indicator */}
      <div className="flex items-center gap-1 mb-6">
        {STEP_LABELS.map((label, i) => {
          const s = (i + 1) as 1 | 2 | 3 | 4 | 5
          const active = step === s
          const done = step > s
          return (
            <div key={s} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                    done
                      ? 'bg-primary border-primary text-primary-foreground'
                      : active
                        ? 'border-primary text-primary'
                        : 'border-muted-foreground/30 text-muted-foreground/50',
                  )}
                >
                  {done ? '✓' : s}
                </div>
                <span
                  className={cn(
                    'text-[10px] mt-1 text-center leading-tight hidden sm:block',
                    active ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-1 mb-4',
                    done ? 'bg-primary' : 'bg-muted-foreground/20',
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Form card */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-base font-semibold mb-4">
          Step {step} — {STEP_LABELS[step - 1]}
        </h3>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Caricamento...</div>
        ) : (
          <>
            {step === 1 && (
              <StepInstrumentSetup
                data={data}
                accounts={accounts}
                instruments={instruments}
                onChange={onChange}
              />
            )}
            {step === 2 && data.setupType && (
              <StepChecklist
                setupType={data.setupType as SetupType}
                checkedItems={checkedItems}
                isOfficeDay={isOfficeDay}
                onToggleItem={toggleItem}
                onToggleOfficeDay={() => setIsOfficeDay((v) => !v)}
              />
            )}
            {step === 3 && (
              <StepPricesRisk
                data={data}
                onChange={onChange}
                balance={balance}
                pipValue={pipValue}
              />
            )}
            {step === 4 && (
              <StepContext
                data={data}
                onChange={onChange}
                instrumentName={selectedInstrument?.symbol ?? ''}
              />
            )}
            {step === 5 && (
              <StepPreTradeNote
                value={data.preTradeNote}
                onChange={(v) => onChange('preTradeNote', v)}
              />
            )}
          </>
        )}
      </div>

      {/* Error */}
      {mutation.isError && (
        <p className="text-sm text-red-400 mt-3">
          Errore: {(mutation.error as Error).message}
        </p>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4 | 5)}
          disabled={step === 1}
          className="flex-1 rounded-md border border-input py-2.5 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent transition-colors"
        >
          ← Indietro
        </button>

        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5)}
            disabled={!canProceed()}
            className="flex-1 rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Avanti →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending || data.preTradeNote.trim().length === 0}
            className="flex-1 rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {mutation.isPending ? 'Salvataggio...' : 'Salva Trade ✓'}
          </button>
        )}
      </div>
    </div>
  )
}
