import { z } from "zod";
import { VerdictSchema } from "./resolution";

export const ChallengeSchema = z.object({
  challenge_id: z.string(),
  challenged_verdict: VerdictSchema,
  claimed_verdict: VerdictSchema,
  disputed_rule: z.string().min(5),
  evidence_urls: z.array(z.string().url()).min(1, "At least one counter-evidence URL is required"),
  explanation: z.string().min(10),
  challenger: z.string(),
  submitted_at: z.string(),
});
export type Challenge = z.infer<typeof ChallengeSchema>;

export const ChallengeFormSchema = ChallengeSchema.omit({
  challenge_id: true,
  challenger: true,
  submitted_at: true,
});
export type ChallengeForm = z.infer<typeof ChallengeFormSchema>;
