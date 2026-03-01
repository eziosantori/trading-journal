/**
 * Core risk management calculations.
 * All functions are pure — no side effects, no external dependencies.
 * Unit tested in src/lib/calculations.test.ts
 */

/**
 * Calculates the dollar amount at risk.
 * @param accountBalance - Current account balance in USD
 * @param riskPercent - Risk as a percentage (e.g. 1.5 for 1.5%)
 */
export function riskAmount(accountBalance: number, riskPercent: number): number {
  return accountBalance * (riskPercent / 100)
}

/**
 * Calculates risk percentage from a dollar risk amount.
 */
export function riskPercent(accountBalance: number, riskDollars: number): number {
  if (accountBalance === 0) return 0
  return (riskDollars / accountBalance) * 100
}

/**
 * Calculates position size in lots/contracts.
 *
 * Formula: riskDollars / (slDistance * pipValue)
 *
 * @param accountBalance - Account balance in USD
 * @param riskPct - Risk as a percentage (e.g. 1.5 for 1.5%)
 * @param entryPrice - Entry price
 * @param slPrice - Stop loss price
 * @param pipValue - Value per pip/point per 1 lot in account currency
 *                   (retrieved from the Instrument record)
 */
export function positionSize(
  accountBalance: number,
  riskPct: number,
  entryPrice: number,
  slPrice: number,
  pipValue: number,
): number {
  const risk = riskAmount(accountBalance, riskPct)
  const slDistance = Math.abs(entryPrice - slPrice)
  if (slDistance === 0 || pipValue === 0) return 0
  return risk / (slDistance * pipValue)
}

/**
 * Calculates the Risk:Reward ratio.
 * Returns 0 if SL distance is zero.
 */
export function rrRatio(entryPrice: number, slPrice: number, tpPrice: number): number {
  const risk = Math.abs(entryPrice - slPrice)
  const reward = Math.abs(tpPrice - entryPrice)
  if (risk === 0) return 0
  return reward / risk
}

/**
 * Suggests a stop loss price based on ATR multiple.
 * Default multiplier is 1.5× ATR (minimum per trading rules).
 */
export function atrStopLoss(
  entryPrice: number,
  direction: 'Long' | 'Short',
  atr: number,
  multiplier = 1.5,
): number {
  const distance = atr * multiplier
  return direction === 'Long' ? entryPrice - distance : entryPrice + distance
}

/**
 * Calculates P&L for a closed trade.
 * @param direction - 'Long' or 'Short'
 * @param entryPrice - Entry price
 * @param exitPrice - Exit price
 * @param size - Position size in lots
 * @param pipValue - Value per pip per lot in account currency
 */
export function tradePnL(
  direction: 'Long' | 'Short',
  entryPrice: number,
  exitPrice: number,
  size: number,
  pipValue: number,
): number {
  const priceDiff = direction === 'Long' ? exitPrice - entryPrice : entryPrice - exitPrice
  return priceDiff * size * pipValue
}

/**
 * Checks if the risk percentage is within the allowed limit.
 * Per trading rules, max risk per trade is 2%.
 */
export function isRiskWithinLimit(riskPct: number, maxRiskPct = 2): boolean {
  return riskPct <= maxRiskPct
}
