# Single-thread anonymous BBS

All visitors see one continuing thread; new threads cannot be created. The design is inspired by old 2channel-style message boards, but this is an independent site.

## After creating a Cloudflare account
From this directory `bbs/worker`:

1. `npx wrangler login`
2. `npx wrangler d1 create kiyotada-bbs`
3. Copy `wrangler.toml.example` to `wrangler.toml`, and replace the D1 UUID.
4. `npx wrangler d1 execute kiyotada-bbs --remote --file schema.sql`
5. Create a Turnstile widget in Cloudflare, with hostname `kiyotadamori.github.io`. Record the **public sitekey** and the **private secret**.
6. `npx wrangler secret put TURNSTILE_SECRET` and enter its private secret.
7. `npx wrangler secret put RATE_LIMIT_SALT` and enter a long random string (32+ characters).
8. `npx wrangler secret put ADMIN_TOKEN` and enter a different long random string.
9. `npx wrangler deploy`
10. Update `bbs/config.js` with the actual HTTPS Worker URL (`apiBase`) and public Turnstile sitekey (`turnstileSitekey`). Commit the change to `main`.

If Cloudflare requires the Worker to exist before secrets can be added, deploy once immediately after step 4, then set secrets and redeploy.

Open `https://kiyotadamori.github.io/mywebsite/bbs/` in an incognito window. Test reading and posting. An initial system notice (post #1) is seeded by `schema.sql`.

### Moderation

The owner can soft-delete an individual post with an HTTP DELETE to `/api/posts/POST_UUID` and the header `Authorization: Bearer ADMIN_TOKEN`. Keep the admin token out of GitHub.

### Important limitations

No account is required, but Cloudflare and other network providers may process metadata; perfect untraceability is not promised. Posts are publicly visible. The system uses server-side Turnstile verification, hourly rate buckets with HMAC-derived identifiers, content limits, and safe client-side text rendering. This is a small beta, not a high-traffic or high-abuse production service. Keep the Worker token secrets private. The static website alone cannot accept posts.
