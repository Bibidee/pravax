# Pravax — Project Information

Pravax is a GenLayer-native evidence-resolution protocol for prediction markets. Instead of
settling a market from a price feed or a centralized administrator, the contract locks a clear
resolution constitution and asks GenLayer validators to assess public web evidence against it.

## Live links

- **Application:** https://the-pravax.vercel.app/
- **Source repository:** https://github.com/Bibidee/pravax
- **Studionet contract:** `0x0883d77d7cE94A87F7d41165E2329A67dFcA8Fc9`

## What it supports

- Permissionless market creation with locked resolution rules and source policy.
- YES/NO positions, deterministic locking, evidence-based AI resolution, and independent challenges.
- Claimable final settlement: winning positions split the escrow pool; UNRESOLVED or INVALID
  markets refund stake principal.
- A permissionless challenge-expiry recovery path, so an abandoned free challenge cannot leave
  market escrow locked indefinitely.

## Team-requested hardening: completed

The requested work was:

> Add an end-user settlement flow wired to `getClaimable` and `claim`, with tests for winner
> payouts, refunds, and repeat-claim prevention. Add a timeout or recovery path so a free,
> unreviewed challenge cannot leave escrow stuck indefinitely.

Pravax now implements each part of that request:

| Team request | Delivered change |
| --- | --- |
| End-user settlement | Final market pages read each wallet's `getClaimable` entitlement and provide a **Claim settlement** action wired to `claim`. |
| Winner payouts | Final YES/NO markets distribute the complete escrow pool pro rata across winning positions. |
| Refunds | `UNRESOLVED` and `INVALID` results make every staker's principal claimable. |
| Repeat-claim prevention | The contract records claims per position and rejects a second claim. |
| Escrow recovery | New permissionless `expire_challenge(market_id)` finalizes an unreviewed challenged market as `UNRESOLVED` once its published review deadline has passed, allowing principal refunds. |

The frontend exposes the recovery action as **Recover funds** when a challenge deadline has passed.

## Verification

The current Studionet deployment completed a live end-to-end settlement round: create, stake on
both outcomes, lock, resolve, challenge, review, finalize, winner claim, loser zero entitlement,
and duplicate-claim rejection. The 0.15 GEN escrow was transferred to the winning position; the
repeat claim was rejected as expected. The contract logic suite has 38 passing tests, including
winner payouts, UNRESOLVED refunds, repeat-claim prevention, and challenge-timeout recovery.

## Technology

GenLayer Intelligent Contract (Python), GenLayer JavaScript SDK, Next.js, TypeScript, and Tailwind CSS.

> Pravax currently operates on Studionet with test credits and is not a licensed wagering product.
