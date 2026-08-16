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

## Verification

The current Studionet deployment completed a live end-to-end settlement round: create, stake on
both outcomes, lock, resolve, challenge, review, finalize, winner claim, loser zero entitlement,
and duplicate-claim rejection. The contract logic suite has 38 passing tests, including payouts,
refunds, repeat-claim prevention, and challenge-timeout recovery.

## Technology

GenLayer Intelligent Contract (Python), GenLayer JavaScript SDK, Next.js, TypeScript, and Tailwind CSS.

> Pravax currently operates on Studionet with test credits and is not a licensed wagering product.
