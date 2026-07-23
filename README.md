# Commently Discover

Cloudflare Worker that unfurls a URL into JSON the client can use to render an embed.

## Response shapes

```json
{ "type": "iframe", "url": "https://…", "iframeSrc": "https://…/embed/…" }
```

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

- **iframe** — known platform embed URL (YouTube, Vimeo, Spotify, Instagram, Reddit, TikTok, Steam, Mastodon, …). Client builds `<iframe src={iframeSrc}>`.
- **card** — everything else: OG metadata + images as data URLs. Client builds a link preview card.

Request: `?url=https://…` or a base64 path segment. Optional `?lang=uk` / `Accept-Language`.

Also serves `favicon.ico` and `robots.txt`; successful responses are cached.

## Deploy

```bash
npm install
npx wrangler login   # if needed
npm run deploy
```

Local: `npm run dev` → usually `http://localhost:8787`.
