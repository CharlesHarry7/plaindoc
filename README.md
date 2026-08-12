# PlainDoc

One-click plain-language decode for high-stakes documents (leases, bills, offer letters).

## Stack

- Static UI: `out/`
- Cloudflare Pages Functions: `functions/api/`
- Stripe Checkout one-time packs ($9 / $29)
- Separate from DreamUtopia

## Endpoints

| Path | Purpose |
|------|---------|
| `/` | Landing |
| `/decode.html` | Paste + decode UI (sample lease button) |
| `/api/decode` | Heuristic demo or LLM if `OPENAI_API_KEY` |
| `/api/stripe/checkout` | Stripe Checkout session |
| `/api/stripe/webhook` | Payment webhook stub |
| `/api/health` | Binding readiness |

## Secrets (Pages)

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRICE_SINGLE`, `PRICE_PACK5`, `PUBLIC_BASE_URL`, optional `OPENAI_API_KEY`

## Deploy

```bash
npx wrangler pages deploy out --project-name=plaindoc
```
