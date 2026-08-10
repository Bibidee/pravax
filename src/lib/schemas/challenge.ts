import { z } from "zod";
import { VerdictSchema } from "./resolution";

// See src/lib/schemas/market.ts for why plain z.string().url() isn't enough
// (it accepts any syntactically valid scheme, so a typo like "ttps://" slips
// through undetected).
const httpUrl = z
  .string()
  .url("Must be a valid URL")
  .refine((url) => /^https?:\/\//i.test(url), {
    message: "URL must start with http:// or https://",
  });

export const ChallengeSchema = z.object({
  challenge_id: z.string(),
  challenged_verdict: VerdictSchema,
  claimed_verdict: VerdictSchema,
  disputed_rule: z.string().min(5),
  evidence_urls: z.array(httpUrl).min(1, "At least one counter-evidence URL is required"),
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
