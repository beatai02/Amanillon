import { z } from "zod";
import {
  ACCOUNT_TYPES,
  APPROACHES,
  CONFLUENCES,
  DIRECTIONS,
  PREP_STATUSES,
  RISK_MODES,
  SETUP_TYPES,
  TIMEFRAMES,
  TRADE_STATUSES,
  TRADING_STYLES,
  USAGE_STATUSES,
} from "./constants";

export const emailSchema = z.email("Enter a valid email");
export const passwordSchema = z.string().min(8, "Use at least 8 characters");

export const authSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupSchema = authSchema.extend({
  displayName: z.string().min(1, "Name is required").max(80),
});

export const resetRequestSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const accountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(80),
  accountType: z.enum(ACCOUNT_TYPES),
  size: z.coerce.number().positive("Account size must be greater than 0"),
  currency: z.string().min(3).max(8).default("USD"),
  allowedRiskPct: z.coerce
    .number()
    .positive("Risk % must be greater than 0")
    .max(100),
  isActive: z.boolean().default(true),
});

const timeframeArray = z.array(z.enum(TIMEFRAMES));

export const playbookIdentitySchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  approach: z.enum(APPROACHES).optional(),
  tradingStyle: z.enum(TRADING_STYLES).optional(),
  setupTypes: z.array(z.enum(SETUP_TYPES)).default([]),
  confluences: z.array(z.string()).default([]),
  htf: timeframeArray.default([]),
  intermediateTf: timeframeArray.default([]),
  entryTf: timeframeArray.default([]),
});

export const playbookCriteriaSchema = z.object({
  checklist: z.string().min(1, "Checklist is required"),
  entryCriteria: z.string().min(1, "Entry criteria are required"),
  exitCriteria: z.string().min(1, "Exit criteria are required"),
  slManagement: z.string().min(1, "Stop-loss management is required"),
});

export const playbookRiskSchema = z.object({
  riskPerTradePct: z.coerce.number().positive().max(100),
  avgPlannedRr: z.coerce.number().positive(),
  plannedRPerYear: z.coerce.number().positive(),
  prepStatus: z.enum(PREP_STATUSES),
  usageStatus: z.enum(USAGE_STATUSES),
});

export const playbookDraftSchema = playbookIdentitySchema
  .partial({ name: true })
  .extend({
    name: z.string().max(120).optional().or(z.literal("")),
    checklist: z.string().optional(),
    entryCriteria: z.string().optional(),
    exitCriteria: z.string().optional(),
    slManagement: z.string().optional(),
    riskPerTradePct: z.coerce.number().positive().max(100).optional().nullable(),
    avgPlannedRr: z.coerce.number().positive().optional().nullable(),
    plannedRPerYear: z.coerce.number().positive().optional().nullable(),
    prepStatus: z.enum(PREP_STATUSES).default("draft"),
    usageStatus: z.enum(USAGE_STATUSES).default("not_using"),
  });

export const playbookActiveSchema = playbookIdentitySchema
  .extend(playbookCriteriaSchema.shape)
  .extend(playbookRiskSchema.shape)
  .superRefine((value, ctx) => {
    if (value.usageStatus === "live" && value.prepStatus !== "active") {
      ctx.addIssue({
        code: "custom",
        path: ["usageStatus"],
        message: "Only an Active playbook can go Live",
      });
    }
  });

export function canGoLive(prepStatus: string) {
  return prepStatus === "active";
}

export const tradeSchema = z
  .object({
    playbookId: z.string().min(1, "Pick a live playbook"),
    accountId: z.string().min(1, "Pick an account"),
    symbolId: z.string().min(1, "Pick a symbol"),
    status: z.enum(TRADE_STATUSES),
    openedAt: z.string().min(1, "Open time is required"),
    closedAt: z.string().optional().nullable(),
    htf: timeframeArray.min(1, "Select at least one higher timeframe"),
    entryTf: timeframeArray.min(1, "Select at least one entry timeframe"),
    direction: z.enum(DIRECTIONS),
    quantity: z.coerce.number().positive("Quantity must be greater than 0"),
    entry: z.coerce.number().positive("Entry is required"),
    stopLoss: z.coerce.number().positive("Stop loss is required"),
    takeProfit: z.coerce.number().positive().optional().nullable(),
    exitPrice: z.coerce.number().positive().optional().nullable(),
    riskMode: z.enum(RISK_MODES),
    riskValue: z.coerce.number().positive("Risk value is required"),
    reasoning: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.entry === value.stopLoss) {
      ctx.addIssue({
        code: "custom",
        path: ["stopLoss"],
        message: "Stop loss must differ from entry",
      });
    }
    const closed = [
      "trade_sl_hit",
      "trade_close_with_profit",
      "trade_exit_in_mid",
    ].includes(value.status);
    if (closed && !value.exitPrice) {
      ctx.addIssue({
        code: "custom",
        path: ["exitPrice"],
        message: "A closed status needs an exit price",
      });
    }
  });

export type AccountInput = z.infer<typeof accountSchema>;
export type PlaybookActiveInput = z.infer<typeof playbookActiveSchema>;
export type PlaybookDraftInput = z.infer<typeof playbookDraftSchema>;
export const reviewSchema = z.object({
  tradeId: z.string().min(1),
  checklist: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      followed: z.boolean(),
    }),
  ),
  emotions: z.array(z.string()).default([]),
  mistakes: z.array(z.string()).default([]),
  lessons: z.string().optional().default(""),
  rating: z.coerce.number().min(1).max(5).nullable().optional(),
});

export type TradeInput = z.infer<typeof tradeSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export const extraConfluences = CONFLUENCES;
