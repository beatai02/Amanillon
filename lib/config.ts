export const APP_NAME = "Amanillon";

/** Win if actual R is above this value after the breakeven band is applied. */
export const WIN_R_THRESHOLD = 0;

/** A closed trade is breakeven when |actual R| is below this band. */
export const BREAKEVEN_R_ABS = 0.1;

/** A new trade opened this soon after a losing close is flagged as revenge. */
export const REVENGE_WINDOW_MINUTES = 15;

/** More trades than this on one UTC calendar day is flagged as overtrading. */
export const DAILY_TRADE_LIMIT = 5;

/** Drawdown warning line in account currency (closed-trade equity). */
export const DRAWDOWN_LINE = -2000;

/**
 * Position sizing and P&L stay in the trading account's currency.
 * No FX conversion is applied in this MVP.
 */
export const APPLY_FX_CONVERSION = false;

/** Open email sign-up. Supabase must send a confirmation email. */
export const OPEN_EMAIL_SIGNUP = true;
export const REQUIRE_EMAIL_CONFIRMATION = true;

export const EMOTION_TAGS = [
  "Fear",
  "Greed",
  "FOMO",
  "Impatience",
  "Revenge",
  "Confidence",
  "Boredom",
  "Hesitation",
] as const;

export const MISTAKE_TAGS = [
  "Early entry",
  "Late entry",
  "Moved stop",
  "Skipped stop",
  "Oversized",
  "Cut winner",
  "Held loser",
  "No plan",
] as const;

export const SESSION_HOURS = {
  asia: { start: 0, end: 8, label: "Asia" },
  london: { start: 8, end: 13, label: "London" },
  newYork: { start: 13, end: 22, label: "New York" },
} as const;
