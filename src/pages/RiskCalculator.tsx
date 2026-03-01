import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { positionSize, riskAmount, rrRatio } from '@/lib/calculations'

interface CalcState {
  balance: string
  riskPct: string
  entry: string
  sl: string
  tp: string
  pipValue: string
}

const INITIAL: CalcState = {
  balance: '',
  riskPct: '1',
  entry: '',
  sl: '',
  tp: '',
  pipValue: '',
}

export default function RiskCalculator() {
  const [values, setValues] = useState<CalcState>(INITIAL)
  const navigate = useNavigate()

  const set = (key: keyof CalcState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  const n = (s: string) => parseFloat(s) || 0

  const risk = riskAmount(n(values.balance), n(values.riskPct))
  const size = positionSize(n(values.balance), n(values.riskPct), n(values.entry), n(values.sl), n(values.pipValue))
  const rr = values.tp ? rrRatio(n(values.entry), n(values.sl), n(values.tp)) : null

  const canRegister = n(values.balance) > 0 && n(values.entry) > 0 && n(values.sl) > 0

  function handleRegister() {
    navigate('/log-trade', {
      state: {
        prefill: {
          entryPrice: n(values.entry),
          sl: n(values.sl),
          tp: n(values.tp) || undefined,
          size: parseFloat(size.toFixed(4)),
          riskPercent: n(values.riskPct),
          riskAmount: parseFloat(risk.toFixed(2)),
          rrRatio: rr ? parseFloat(rr.toFixed(2)) : undefined,
        },
      },
    })
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6">Risk Calculator</h2>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        {(
          [
            { label: 'Account Balance ($)', key: 'balance', placeholder: '193564' },
            { label: 'Risk (%)', key: 'riskPct', placeholder: '1' },
            { label: 'Entry Price', key: 'entry', placeholder: '0.00' },
            { label: 'Stop Loss Price', key: 'sl', placeholder: '0.00' },
            { label: 'Take Profit Price (optional)', key: 'tp', placeholder: '0.00' },
            { label: 'Pip Value (per lot)', key: 'pipValue', placeholder: '10' },
          ] as const
        ).map(({ label, key, placeholder }) => (
          <div key={key}>
            <label className="text-sm font-medium block mb-1">{label}</label>
            <input
              type="number"
              value={values[key]}
              onChange={set(key)}
              placeholder={placeholder}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ))}
      </div>

      {/* Results */}
      <div className="rounded-lg border bg-card p-6 mt-4 space-y-3">
        <p className="text-sm font-medium mb-2">Calculated Values</p>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Risk Amount</span>
          <span className="font-mono font-medium">${risk.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Position Size (lots)</span>
          <span className="font-mono font-medium">{size > 0 ? size.toFixed(4) : '—'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">R:R Ratio</span>
          <span className="font-mono font-medium">{rr != null ? rr.toFixed(2) : '—'}</span>
        </div>
      </div>

      <button
        onClick={handleRegister}
        disabled={!canRegister}
        className="mt-4 w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        Register Trade →
      </button>
    </div>
  )
}
