# Design System

Design is a first-class concern, not an afterthought. Every screen should look and feel like a professional trading tool — not a generic CRUD app.

---

## Principles

1. **Dark mode first.** Traders stare at screens for hours. Dark mode is the default. Light mode is secondary.
2. **Data density over decorative whitespace.** Trading apps need to show a lot of numbers. Compact, readable, not sparse.
3. **Semantic color is non-negotiable.** Profit = green, loss = red, everywhere, always. No exceptions.
4. **Numbers are typography.** Prices, P&L, percentages always use monospace font (`font-mono`). They must be scannable at a glance.
5. **Visual hierarchy drives decisions.** The most important number on any screen (current P&L, balance, FTMO status) must be visually dominant.

---

## Color Semantics

These are the semantic colors used throughout the app. They must be applied consistently — never use green for a loss or red for a profit, even in charts.

| Meaning | Tailwind class | Usage |
|---|---|---|
| Profit / positive | `text-emerald-400` (dark) / `text-emerald-600` (light) | P&L positive, win, target reached |
| Loss / negative | `text-red-400` (dark) / `text-red-500` (light) | P&L negative, loss, limit breached |
| Warning / at risk | `text-amber-400` | Approaching daily loss limit, rule violation |
| Neutral / open | `text-slate-400` | Open trade, pending, no result yet |
| Info / action | `text-blue-400` | Links, primary actions, callouts |

Define these as utility classes in `src/index.css` to avoid repetition:

```css
@layer utilities {
  .text-profit  { @apply text-emerald-400 dark:text-emerald-400; }
  .text-loss    { @apply text-red-400 dark:text-red-400; }
  .text-warning { @apply text-amber-400; }
}
```

---

## Typography

| Element | Classes |
|---|---|
| Page title | `text-2xl font-bold tracking-tight` |
| Section header | `text-sm font-semibold uppercase tracking-wider text-muted-foreground` |
| Card metric (large) | `text-3xl font-bold font-mono` |
| Price / number | `font-mono tabular-nums` |
| Label / caption | `text-xs text-muted-foreground` |

**Always use `tabular-nums` on number columns in tables** so digits align vertically.

---

## Component Patterns

### Metric Card

The primary building block of the Dashboard. Shows one key number.

```tsx
<div className="rounded-lg border bg-card p-4">
  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Today's P&L</p>
  <p className="mt-2 text-3xl font-bold font-mono text-profit">+$320.00</p>
  <p className="mt-1 text-xs text-muted-foreground">3 trades · 66% win rate</p>
</div>
```

### P&L Value (inline)

```tsx
// Use a helper component, not inline ternaries scattered everywhere
function PnL({ value }: { value: number }) {
  return (
    <span className={cn('font-mono tabular-nums', value >= 0 ? 'text-profit' : 'text-loss')}>
      {value >= 0 ? '+' : ''}{formatCurrency(value)}
    </span>
  )
}
```

### Status Badge

```tsx
// Trade status
const statusStyles = {
  Open:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Closed:  'bg-slate-500/10 text-slate-400 border-slate-500/20',
  Partial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}
```

### Progress Bar (FTMO)

```tsx
// Color changes based on value — green → amber → red as limit approaches
function FTMOBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min((used / limit) * 100, 100)
  const color = pct < 60 ? 'bg-emerald-500' : pct < 85 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
```

---

## Layout

### Sidebar
- Width: `w-56` (fixed, not collapsible in v1)
- Background: `bg-card` with `border-r`
- Active nav item: `bg-primary text-primary-foreground`
- Inactive: `text-muted-foreground hover:bg-accent`

### Page content
- Padding: `p-6` on all pages
- Max width on form pages: `max-w-2xl mx-auto`
- Max width on dashboard/tables: full width

### Tables (Trade Log)
- Use `text-sm` throughout
- Sticky header: `sticky top-0 bg-card z-10`
- Row hover: `hover:bg-muted/50`
- Alternating rows: avoid (too noisy with numbers)

---

## Dark Mode Setup

The app defaults to dark mode. Set the `dark` class on `<html>` at startup:

```tsx
// src/main.tsx — add before render
document.documentElement.classList.add('dark')
```

A toggle in Settings can switch between modes, stored in `localStorage`.

---

## shadcn/ui Usage Rules

- **Use shadcn components as the base.** Don't write raw `<button>` or `<input>` elements where a shadcn equivalent exists.
- **Add components with the CLI**: `pnpm dlx shadcn@latest add button input card table badge progress select`
- **Don't modify files in `src/components/ui/`** directly. Override with Tailwind classes at the usage site.
- **Use `cn()` for conditional classes**, never string concatenation.

---

## Charts (Recharts)

- Background: transparent (inherits card background)
- Grid lines: `stroke="hsl(var(--border))"` (subtle)
- Tooltip: styled to match card/popover theme
- Equity curve line: `stroke="hsl(var(--primary))"` with area fill at 10% opacity
- P&L bars: use `text-profit`/`text-loss` colors (emerald / red)
- Always include `ResponsiveContainer` wrapper

---

## Accessibility Baseline

- Color is never the *only* differentiator (pair color with a sign, icon, or label)
- All interactive elements are keyboard-navigable (shadcn handles this)
- Numbers include appropriate `aria-label` where context is ambiguous
