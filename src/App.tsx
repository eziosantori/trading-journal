import { Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Calculator,
  BarChart2,
  CheckSquare,
  Settings,
} from 'lucide-react'
import Dashboard from '@/pages/Dashboard'
import TradeLog from '@/pages/TradeLog'
import LogTrade from '@/pages/LogTrade'
import RiskCalculator from '@/pages/RiskCalculator'
import Analytics from '@/pages/Analytics'
import Routine from '@/pages/Routine'
import SettingsPage from '@/pages/Settings'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trades', icon: ClipboardList, label: 'Trade Log' },
  { to: '/log-trade', icon: PlusCircle, label: 'Log Trade' },
  { to: '/risk', icon: Calculator, label: 'Risk Calculator' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/routine', icon: CheckSquare, label: 'Routine' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function App() {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h1 className="font-bold text-lg tracking-tight">Trade Journal</h1>
          <p className="text-xs text-muted-foreground mt-0.5">FTMO #7489666</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trades" element={<TradeLog />} />
          <Route path="/log-trade" element={<LogTrade />} />
          <Route path="/risk" element={<RiskCalculator />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/routine" element={<Routine />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}
