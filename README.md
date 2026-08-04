# Commently Discover

Cloudflare Worker that unfurls a URL into JSON the client can use to render an embed.

## Request

`GET` — no auth required.

Target URL is passed one of two ways (either is fine):

1. Query parameter:

   ```
   /?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ
   ```

2. Base64-encoded URL as the last path segment (`base64` of `https://example.com/` → `aHR0cHM6Ly9leGFtcGxlLmNvbS8=`):

   ```
   /aHR0cHM6Ly9leGFtcGxlLmNvbS8=
   ```

Optional params:

| Param  | Effect                                                              |
| ------ | ------------------------------------------------------------------- |
| `lang` | Overrides the `Accept-Language` header (e.g. `?lang=uk`, `?lang=en`) |

If no valid `http(s)` URL is found, the worker returns `400`.

### CORS

Cross-origin reads are only allowed from origins in the `ALLOWED_ORIGINS` env
var (comma-separated, configured in `wrangler.jsonc`). Responses reflect the
origin via `Access-Control-Allow-Origin` + `Vary: Origin`; disallowed origins
are blocked (`OPTIONS` → 403). Non-browser clients without an `Origin` header
are unaffected. If the var is unset/empty, all cross-origin reads are blocked.

## Responses

### `200` — `type: "iframe"`

Known platform embed URL (YouTube, Vimeo, Spotify, Instagram, TikTok, Steam, Mastodon, …). Client builds `<iframe src={iframeSrc}>`.

For platforms that only expose a JS widget (X/Twitter, Facebook, Telegram, Threads, Bluesky, Reddit) the worker serves its own embed page that loads the official widget script, and `iframeSrc` points at it (`/embed/{base64url}`). Client iframes it the same way — the page then pulls in the platform embed (frame-in-frame).

```json
{ "type": "iframe", "url": "https://…", "iframeSrc": "https://…/embed/…" }
```

Example for X:

```bash
curl "https://your-worker.workers.dev/?url=https%3A%2F%2Fx.com%2Fuser%2Fstatus%2F1234567890"
# { "type": "iframe", "url": "https://x.com/user/status/1234567890", "iframeSrc": "https://your-worker.workers.dev/embed/aHR0cHM6Ly94LmNvbS91c2VyL3N0YXR1cy8xMjM0NTY3ODkw" }
```

### `200` — `type: "card"`

Everything else: OG metadata + images as data URLs. Client builds a link preview card.

```json
{
  "type": "card",
  "url": "https://…",
  "title": "…",
  "description": "…",
  "image": "data:image/…;base64,…",
  "favicon": "data:image/…;base64,…",
  "siteName": "example.com"
}
```

### `400` — missing or invalid URL

```json
{ "error": "Bad Request" }
```

## Examples

```bash
curl "https://your-worker.workers.dev/?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ"
# { "type": "iframe", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "iframeSrc": "https://www.youtube.com/embed/dQw4w9WgXcQ" }

curl "https://your-worker.workers.dev/?url=https%3A%2F%2Fexample.com"
# { "type": "card", "url": "https://example.com", "title": "Example Domain", ... }
```

Also serves `favicon.ico`, `robots.txt`, and script-widget embed pages at `/embed/{base64url}`; successful responses are cached.

## Deploy

```bash
npm install
npx wrangler login   # if needed
npm run deploy
```

Local: `npm run dev` → usually `http://localhost:8787`.
