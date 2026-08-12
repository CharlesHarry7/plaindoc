# PlainDoc

One-click plain-language decode for high-stakes documents (leases, bills, offer letters).

- Landing + decode UI in `out/`
- Cloudflare Pages Functions in `functions/api/`
- Stripe Checkout (one-time $9 / $29) — wire secrets, reuse existing Stripe account
- Separate from DreamUtopia — do not merge stacks

## Quick start

1. Set Cloudflare Pages project root to `out/`, functions to `functions/`
2. Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENAI_API_KEY` (or any LLM)
3. Stripe Price IDs in `functions/api/stripe/checkout.js` (`PRICE_SINGLE`, `PRICE_PACK5`)
4. Deploy → open site → pay → paste text → get decode

## Pricing (MVP)

| Pack | Price | Decodes |
|------|-------|---------|
| Single | $9 | 1 |
| Pack5 | $29 | 5 |

## Status

Skeleton for review — LLM + Stripe live keys not committed.
