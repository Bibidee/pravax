import { z } from "zod";

export const VerdictSchema = z.enum(["YES", "NO", "INVALID", "UNRESOLVED"]);
export type Verdict = z.infer<typeof VerdictSchema>;

export const SourceRoleSchema = z.enum(["PRIMARY", "SECONDARY"]);
export type SourceRole = z.infer<typeof SourceRoleSchema>;

export const EvidenceItemSchema = z.object({
  url: z.string(),
  source_role: SourceRoleSchema,
  claim: z.string(),
  published_at: z.string().nullable().optional(),
  event_time: z.string().nullable().optional(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const ResolutionSchema = z.object({
  verdict: VerdictSchema,
  confidence: z.number().min(0).max(100),
  rule_interpretation: z.string(),
  evidence: z.array(EvidenceItemSchema).default([]),
  conflicts: z.array(z.string()).default([]),
  reasoning_summary: z.string(),
  resolved_at: z.string(),
  reviewed_challenge_id: z.string().optional(),
});
export type Resolution = z.infer<typeof ResolutionSchema>;
