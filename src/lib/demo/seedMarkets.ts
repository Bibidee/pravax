import type { MarketRecord } from "@/lib/schemas/market";
import type { Resolution } from "@/lib/schemas/resolution";
import type { Challenge } from "@/lib/schemas/challenge";

/**
 * Illustrative market templates only. These are never presented as on-chain
 * data — every surface that renders them must show a "Template" / "Demo
 * mode" label. They exist to demonstrate the resolution constitution format
 * and the UNRESOLVED end state before any real deployment is live.
 */
export type DemoMarket = {
  id: string;
  market: MarketRecord;
  resolution?: Resolution;
  challenges?: Challenge[];
};

export const DEMO_MARKETS: DemoMarket[] = [
  {
    id: "demo-atlas-v2",
    market: {
      question: "Will Atlas publish a stable v2.0 release before 00:00 UTC on 1 December 2026?",
      category: "SOFTWARE",
      outcomes: ["YES", "NO"],
      close_at: "2026-11-25T00:00:00Z",
      resolve_after: "2026-12-01T00:15:00Z",
      event_deadline: "2026-12-01T00:00:00Z",
      primary_sources: ["https://github.com/example/atlas/releases"],
      secondary_sources: ["https://example.com/atlas-blog"],
      definition:
        "Release means a public stable v2.0 release, not an alpha, beta, RC, branch, tag without release notes, or private build.",
      invalid_if: ["project repository becomes permanently inaccessible before close"],
      ambiguity_policy: "Return UNRESOLVED when evidence is insufficient or materially conflicting.",
      creator: "0xDEMOCREATOR00000000000000000000000001",
      constitution_hash: "demo-hash-atlas-v2",
      created_at: "2026-06-01T00:00:00Z",
      locked_at: "2026-11-25T00:00:00Z",
      state: "OPEN",
    },
  },
  {
    id: "demo-league-final",
    market: {
      question: "Will Harborline FC win the 2026 Coastal Cup Final on 14 December 2026?",
      category: "SPORTS",
      outcomes: ["YES", "NO"],
      close_at: "2026-12-14T18:00:00Z",
      resolve_after: "2026-12-14T23:00:00Z",
      event_deadline: "2026-12-14T22:00:00Z",
      primary_sources: ["https://www.coastalcup.example/results"],
      secondary_sources: ["https://sportswire.example/coastalcup"],
      definition:
        "Win means Harborline FC is declared the official winner of the Coastal Cup Final by the league, including any decision on extra time or penalties.",
      invalid_if: ["the final is cancelled and not rescheduled before the resolution window closes"],
      ambiguity_policy: "Return UNRESOLVED if the official league result is not published before the resolution window closes.",
      creator: "0xDEMOCREATOR00000000000000000000000001",
      constitution_hash: "demo-hash-league-final",
      created_at: "2026-06-10T00:00:00Z",
      locked_at: "2026-12-14T18:00:00Z",
      challenge_deadline: "2026-12-16T22:05:00Z",
      state: "FINAL",
    },
    resolution: {
      verdict: "YES",
      confidence: 93,
      rule_interpretation:
        "The league's official results page constitutes the authoritative source for the winner of the final.",
      evidence: [
        {
          url: "https://www.coastalcup.example/results",
          source_role: "PRIMARY",
          claim: "Harborline FC defeated Meridian United 2-1 in the Coastal Cup Final.",
          published_at: "2026-12-14T22:10:00Z",
          event_time: "2026-12-14T22:00:00Z",
        },
      ],
      conflicts: [],
      reasoning_summary:
        "Official league source confirms Harborline FC as the winner within the resolution window; no conflicting reports found.",
      resolved_at: "2026-12-14T23:05:00Z",
    },
  },
  {
    id: "demo-agency-announcement",
    market: {
      question: "Will the Meridian Space Agency officially announce a crewed Mars flyby mission before 00:00 UTC on 1 March 2027?",
      category: "ANNOUNCEMENT",
      outcomes: ["YES", "NO"],
      close_at: "2027-02-20T00:00:00Z",
      resolve_after: "2027-03-01T00:15:00Z",
      event_deadline: "2027-03-01T00:00:00Z",
      primary_sources: ["https://www.meridianspace.example/press"],
      secondary_sources: ["https://spacenews.example/meridian"],
      definition:
        "Official announcement means a press release or public statement from the agency's official channels explicitly confirming a crewed Mars flyby mission, not a rumor, leak, or unofficial roadmap slide.",
      invalid_if: ["the agency is dissolved or merged before the close date"],
      ambiguity_policy: "Return UNRESOLVED when reporting is inconsistent about whether the statement was official.",
      creator: "0xDEMOCREATOR00000000000000000000000001",
      constitution_hash: "demo-hash-agency-announcement",
      created_at: "2026-09-01T00:00:00Z",
      locked_at: "2027-02-20T00:00:00Z",
      challenge_deadline: "2027-03-03T00:20:00Z",
      state: "UNRESOLVED",
    },
    resolution: {
      verdict: "UNRESOLVED",
      confidence: 38,
      rule_interpretation:
        "An official announcement requires a statement from the agency's own channels; third-party reporting alone does not satisfy the rule.",
      evidence: [
        {
          url: "https://spacenews.example/meridian",
          source_role: "SECONDARY",
          claim: "Sources familiar with the matter say a crewed Mars flyby announcement is imminent.",
          published_at: "2027-02-27T09:00:00Z",
          event_time: null,
        },
        {
          url: "https://www.meridianspace.example/press",
          source_role: "PRIMARY",
          claim: "No press release matching this description was found on the agency's official press page as of the resolution window.",
          published_at: null,
          event_time: null,
        },
      ],
      conflicts: [
        "Secondary reporting claims an announcement is imminent, but no primary-source statement exists as of the event deadline.",
      ],
      reasoning_summary:
        "The rule requires an official statement from the agency's own channels. Only unofficial, secondary reporting exists as of the deadline, and the primary source shows no matching release. Evidence is materially insufficient to resolve YES or NO, so the ambiguity policy applies.",
      resolved_at: "2027-03-01T00:20:00Z",
    },
  },
];

export function getDemoMarket(id: string): DemoMarket | undefined {
  return DEMO_MARKETS.find((m) => m.id === id);
}
