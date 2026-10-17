# Anonymous BBS setup

GitHub Pages serves the frontend at `/mywebsite/bbs/`; Cloudflare Workers + D1 stores threads and replies. No visitor account is required.

1. Install Wrangler and authenticate: `npx wrangler login`.
2. From `bbs/worker/`, run `npx wrangler d1 create kiyotada-bbs`.
3. Copy `wrangler.toml.example` to `wrangler.toml` and replace `REPLACE_WITH_D1_UUID`.
4. Run `npx wrangler d1 execute kiyotada-bbs --remote --file schema.sql`.
5. Create a Cloudflare Turnstile widget allowing `kiyotadamori.github.io` and save its public sitekey and private secret.
6. Add Worker secrets using `npx wrangler secret put TURNSTILE_SECRET`, `npx wrangler secret put ADMIN_TOKEN`, and `npx wrangler secret put RATE_LIMIT_SALT`.
7. Deploy from `bbs/worker/` with `npx wrangler deploy`.
8. Put the deployed HTTPS worker URL and the PUBLIC Turnstile sitekey in `bbs/config.js`. Never put secrets there.
9. Check anonymous posting, replies, rate limits, mobile layout and moderation before publicizing.

Moderation: DELETE `/api/threads/:id` or `/api/posts/:id` with `Authorization: Bearer <ADMIN_TOKEN>`.
Visitors have no accounts. Content is public, but network/CDN operators may still process connection metadata; do not promise perfect anonymity.
Do not use GitHub Pages as a permanent database or store private tokens in the repository.
Back-end setup is not yet complete; the frontend deliberately displays a setup notice instead of pretending submissions work.
Cloudflare free tiers have usage ceilings; check billing and traffic limits before deployment.
Rate limit hashes are hour-scoped and do not retain raw IP addresses; clean old keys periodically with `DELETE FROM rate_limits` if required.