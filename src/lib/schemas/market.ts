import { z } from "zod";

// z.string().url() alone accepts any syntactically valid URL scheme — a typo
// like "ttps://example.com" (missing the leading "h") still parses as a
// technically valid URL with a custom scheme, so it passes silently. Since
// primary/secondary sources get locked immutably on-chain and are what
// GenVM actually fetches during resolution, require http(s) explicitly so a
// broken source is caught in the composer, not discovered after lock via a
// failed web fetch.
const httpUrl = z
  .string()
  .url("Must be a valid URL")
  .refine((url) => /^https?:\/\//i.test(url), {
    message: "URL must start with http:// or https://",
  });

export const MarketStateSchema = z.enum(["OPEN", "LOCKED", "CHALLENGE_WINDOW", "CHALLENGED", "FINAL"]);
export type MarketState = z.infer<typeof MarketStateSchema>;

export const MarketCategorySchema = z.enum([
  "SOFTWARE",
  "SPORTS",
  "ANNOUNCEMENT",
  "OTHER",
]);
export type MarketCategory = z.infer<typeof MarketCategorySchema>;

// Kept as a plain object schema (not refined) so MarketRecordSchema below can
// still use .extend() — Zod's .refine()/.superRefine() return a ZodEffects
// wrapper that no longer supports .extend().
const ResolutionConstitutionObject = z.object({
  question: z.string().min(12, "Question must be specific enough to resolve unambiguously").max(2000),
  category: MarketCategorySchema.default("OTHER"),
  outcomes: z.tuple([z.literal("YES"), z.literal("NO")]),
  close_at: z.string().min(1, "Close at is required").datetime({ offset: true }).or(z.string().min(1, "Close at is required")),
  resolve_after: z.string().min(1, "Resolves after is required").datetime({ offset: true }).or(z.string().min(1, "Resolves after is required")),
  event_deadline: z.string().min(1, "Event deadline is required").datetime({ offset: true }).or(z.string().min(1, "Event deadline is required")),
  primary_sources: z.array(httpUrl).min(1, "At least one primary source is required"),
  secondary_sources: z.array(httpUrl).default([]),
  definition: z.string().min(10, "Define exactly what counts as a qualifying event").max(2000),
  invalid_if: z.array(z.string().max(2000)).max(12).default([]),
  ambiguity_policy: z.string().min(10, "State how ambiguous or conflicting evidence is handled").max(2000),
  clarification_notes: z.string().optional(),
});

// The contract enforces close_at <= event_deadline <= resolve_after and
// rejects the whole transaction on-chain if violated. Checking the same
// ordering here catches a mistake (e.g. a wrong month) in the composer
// before submitting, instead of after a real consensus round confirms the
// contract's rejection.
export const ResolutionConstitutionSchema = ResolutionConstitutionObject.superRefine((data, ctx) => {
  const closeAt = Date.parse(data.close_at);
  const eventDeadline = Date.parse(data.event_deadline);
  const resolveAfter = Date.parse(data.resolve_after);

  if (!Number.isNaN(closeAt) && !Number.isNaN(eventDeadline) && closeAt > eventDeadline) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["event_deadline"],
      message: "Event deadline must not be before close at",
    });
  }
  if (!Number.isNaN(eventDeadline) && !Number.isNaN(resolveAfter) && eventDeadline > resolveAfter) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["resolve_after"],
      message: "Resolves after must not be before event deadline",
    });
  }
});
export type ResolutionConstitution = z.infer<typeof ResolutionConstitutionSchema>;

export const MarketRecordSchema = ResolutionConstitutionObject.extend({
  creator: z.string(),
  created_at: z.string(),
  locked_at: z.string().optional(),
  challenge_deadline: z.string().optional(),
  reviewed_at: z.string().optional(),
  finalized_at: z.string().optional(),
  state: MarketStateSchema,
});
export type MarketRecord = z.infer<typeof MarketRecordSchema>;

export const PositionSchema = z.object({
  position_id: z.string(),
  outcome: z.enum(["YES", "NO"]),
  amount: z.number().positive(),
  holder: z.string(),
  recorded_at: z.string(),
});
export type Position = z.infer<typeof PositionSchema>;
