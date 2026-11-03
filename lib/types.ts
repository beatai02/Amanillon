import type {
  ACCOUNT_TYPES,
  APPROACHES,
  DIRECTIONS,
  PREP_STATUSES,
  RISK_MODES,
  TRADE_STATUSES,
  TRADING_STYLES,
  USAGE_STATUSES,
} from "./constants";

export type Approach = (typeof APPROACHES)[number];
export type TradingStyle = (typeof TRADING_STYLES)[number];
export type PrepStatus = (typeof PREP_STATUSES)[number];
export type UsageStatus = (typeof USAGE_STATUSES)[number];
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type Direction = (typeof DIRECTIONS)[number];
export type RiskMode = (typeof RISK_MODES)[number];
export type TradeStatus = (typeof TRADE_STATUSES)[number];

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
};

export type Profile = {
  id: string;
  displayName: string | null;
  timezone: string;
  baseCurrency: string;
};

export type TradingAccount = {
  id: string;
  userId: string;
  name: string;
  accountType: AccountType;
  size: number;
  currency: string;
  allowedRiskPct: number;
  isActive: boolean;
  createdAt: string;
};

export type SymbolRow = {
  id: string;
  code: string;
  name: string;
  assetClass: string;
  isFutures: boolean;
  contractSize: number;
  lotStep: number;
  calcCurrency: string;
};

export type PlaybookImage = {
  id: string;
  playbookId: string;
  storagePath: string;
  sort: number;
  signedUrl?: string | null;
};

export type Playbook = {
  id: string;
  userId: string;
  name: string;
  approach: Approach | null;
  tradingStyle: TradingStyle | null;
  setupTypes: string[];
  confluences: string[];
  htf: string[];
  intermediateTf: string[];
  entryTf: string[];
  checklist: string | null;
  entryCriteria: string | null;
  exitCriteria: string | null;
  slManagement: string | null;
  riskPerTradePct: number | null;
  avgPlannedRr: number | null;
  plannedRPerYear: number | null;
  prepStatus: PrepStatus;
  usageStatus: UsageStatus;
  createdAt: string;
  updatedAt: string;
  images: PlaybookImage[];
  tradeCount?: number;
};

export type PlaybookSnapshot = Omit<
  Playbook,
  "userId" | "createdAt" | "updatedAt" | "images" | "tradeCount" | "prepStatus" | "usageStatus"
> & {
  prepStatus: PrepStatus;
  usageStatus: UsageStatus;
};

export type Trade = {
  id: string;
  userId: string;
  accountId: string | null;
  playbookId: string | null;
  playbookSnapshot: PlaybookSnapshot;
  symbolId: string | null;
  direction: Direction;
  status: TradeStatus;
  htf: string[];
  entryTf: string[];
  entry: number;
  stopLoss: number;
  takeProfit: number | null;
  exitPrice: number | null;
  quantity: number;
  riskMode: RiskMode | null;
  riskValue: number | null;
  riskAmount: number | null;
  contractSizeUsed: number | null;
  fxRateUsed: number | null;
  plannedRr: number | null;
  actualRr: number | null;
  pnlGross: number | null;
  reasoning: string | null;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  closingEvidencePath: string | null;
  createdAt: string;
  updatedAt: string;
  account?: TradingAccount | null;
  symbol?: SymbolRow | null;
  images?: TradeImage[];
  review?: TradeReview | null;
};

export type TradeImageKind = "setup" | "reference" | "closing";

export type TradeImage = {
  id: string;
  tradeId: string;
  kind: TradeImageKind;
  storagePath: string;
  signedUrl?: string | null;
};

export type ChecklistItem = {
  id: string;
  label: string;
  followed: boolean;
};

export type TradeReview = {
  tradeId: string;
  userId: string;
  checklist: ChecklistItem[];
  emotions: string[];
  mistakes: string[];
  lessons: string;
  rating: number | null;
  updatedAt: string;
};

export type JournalTab = "open" | "closed" | "missed" | "cancelled";

export type JournalFilters = {
  accountId?: string;
  playbookId?: string;
  assetClass?: string;
  from?: string;
  to?: string;
};
