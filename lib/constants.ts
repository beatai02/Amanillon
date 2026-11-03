export const TIMEFRAMES = [
  "MN",
  "W",
  "2D",
  "D",
  "H16",
  "H14",
  "H12",
  "H10",
  "H8",
  "H6",
  "H4",
  "H3",
  "H2",
  "H1",
] as const;

export const TIMEFRAME_RANK: Record<(typeof TIMEFRAMES)[number], number> = {
  MN: 14,
  W: 13,
  "2D": 12,
  D: 11,
  H16: 10,
  H14: 9,
  H12: 8,
  H10: 7,
  H8: 6,
  H6: 5,
  H4: 4,
  H3: 3,
  H2: 2,
  H1: 1,
};

export const SETUP_TYPES = [
  "Trend Following",
  "Reversals",
  "Retest of Breakout",
  "Price Action",
  "Supply & Demand",
  "Support/Resistance",
] as const;

export const CONFLUENCES = [
  "Fundamentals",
  "Price Action",
  "Technical Indicator",
  "Sentiment",
] as const;

export const APPROACHES = ["conservative", "aggressive"] as const;
export const TRADING_STYLES = ["intraday", "swing", "positional"] as const;
export const PREP_STATUSES = ["preparing", "draft", "active"] as const;
export const USAGE_STATUSES = ["live", "not_using"] as const;
export const ACCOUNT_TYPES = ["demo", "live", "prop"] as const;
export const DIRECTIONS = ["long", "short"] as const;
export const RISK_MODES = ["amount", "percent"] as const;

export const TRADE_STATUSES = [
  "entry_planned",
  "entry_placed",
  "entry_triggered",
  "entry_cancelled",
  "entry_missed",
  "trade_sl_hit",
  "trade_close_with_profit",
  "trade_exit_in_mid",
] as const;

export const OPEN_STATUSES = [
  "entry_planned",
  "entry_placed",
  "entry_triggered",
] as const;

export const CLOSED_STATUSES = [
  "trade_sl_hit",
  "trade_close_with_profit",
  "trade_exit_in_mid",
] as const;

export const TRADE_STATUS_LABELS: Record<(typeof TRADE_STATUSES)[number], string> = {
  entry_planned: "Entry planned",
  entry_placed: "Entry placed",
  entry_triggered: "Entry triggered",
  entry_cancelled: "Entry cancelled",
  entry_missed: "Entry missed",
  trade_sl_hit: "Stop loss hit",
  trade_close_with_profit: "Closed with profit",
  trade_exit_in_mid: "Exited mid-trade",
};

export const DEMO_COOKIE = "amanillon-demo";
export const MAX_PLAYBOOK_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
