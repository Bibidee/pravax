import { z } from "zod";

export const MarketStateSchema = z.enum([
  "DRAFT",
  "OPEN",
  "LOCKED",
  "AWAITING_RESOLUTION",
  "PROVISIONAL",
  "CHALLENGE_WINDOW",
  "CHALLENGED",
  "FINAL",
  "UNRESOLVED",
  "INVALID",
  "CANCELLED_BEFORE_LOCK",
]);
export type MarketState = z.infer<typeof MarketStateSchema>;

export const MarketCategorySchema = z.enum([
  "SOFTWARE",
  "SPORTS",
  "ANNOUNCEMENT",
  "OTHER",
]);
export type MarketCategory = z.infer<typeof MarketCategorySchema>;

export const ResolutionConstitutionSchema = z.object({
  question: z.string().min(12, "Question must be specific enough to resolve unambiguously"),
  category: MarketCategorySchema.default("OTHER"),
  outcomes: z.array(z.string().min(1)).min(2).max(6),
  close_at: z.string().datetime({ offset: true }).or(z.string().min(1)),
  resolve_after: z.string().datetime({ offset: true }).or(z.string().min(1)),
  event_deadline: z.string().datetime({ offset: true }).or(z.string().min(1)),
  primary_sources: z.array(z.string().url()).min(1, "At least one primary source is required"),
  secondary_sources: z.array(z.string().url()).default([]),
  definition: z.string().min(10, "Define exactly what counts as a qualifying event"),
  invalid_if: z.array(z.string()).default([]),
  ambiguity_policy: z.string().min(10, "State how ambiguous or conflicting evidence is handled"),
  clarification_notes: z.string().optional(),
});
export type ResolutionConstitution = z.infer<typeof ResolutionConstitutionSchema>;

export const MarketRecordSchema = ResolutionConstitutionSchema.extend({
  creator: z.string(),
  constitution_hash: z.string(),
  created_at: z.string(),
  locked_at: z.string().optional(),
  challenge_deadline: z.string().optional(),
  state: MarketStateSchema,
});
export type MarketRecord = z.infer<typeof MarketRecordSchema>;

export const PositionSchema = z.object({
  position_id: z.string(),
  outcome: z.string(),
  amount: z.number().positive(),
  holder: z.string(),
  recorded_at: z.string(),
});
export type Position = z.infer<typeof PositionSchema>;
