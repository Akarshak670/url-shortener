# URL Shortener

A minimal backend API for shortening URLs, built with Node.js, Express, and SQLite.

## Setup

```bash
npm install
npm start
```

The server starts on `http://localhost:3000` by default. Set `PORT` to use a different port:

```bash
PORT=4000 npm start
```

Data is stored in a local SQLite file, `data.sqlite`, created automatically on first run.

## Web UI

Open `http://localhost:3000/` in a browser for a simple UI: paste a URL (and an optional custom code), shorten it, copy the result, and browse/copy previously created links with their click counts. It's static files in `public/`, served by Express, calling the JSON API below.

## How it works

- Each shortened URL gets a unique `code` — either a random 7-character ID (via `nanoid`) or a custom code you supply.
- Visiting `/:code` looks up the stored URL, increments a click counter, and issues a 302 redirect.
- All data lives in one SQLite table (`links`): `code`, `url`, `clicks`, `created_at`.

## API

### `POST /api/shorten`

Create a short link.

**Body:**
```json
{ "url": "https://example.com/some/long/path", "code": "optional-custom-code" }
```

- `url` (required) — must be a valid `http://` or `https://` URL.
- `code` (optional) — 3–32 characters, letters/numbers/`_`/`-`. If omitted, a random code is generated. If provided and already taken, the request fails.

**Response `201`:**
```json
{
  "code": "abc1234",
  "url": "https://example.com/some/long/path",
  "shortUrl": "http://localhost:3000/abc1234",
  "createdAt": "2026-10-15 20:00:38"
}
```

**Errors:**
- `400` — missing/invalid `url`, or `code` fails the format check.
- `409` — requested custom `code` is already in use.

### `GET /:code`

Redirects (302) to the original URL for `code`, and increments its click count.

- `404` if `code` doesn't exist.

### `GET /api/links`

List all links, newest first (used by the UI).

**Response `200`:** array of objects shaped like the `POST /api/shorten` response.

### `GET /api/stats/:code`

Returns usage info for a short link.

**Response `200`:**
```json
{
  "code": "abc1234",
  "url": "https://example.com/some/long/path",
  "clicks": 3,
  "createdAt": "2026-10-15 20:00:38"
}
```

- `404` if `code` doesn't exist.

## Example (curl)

```bash
# Create a short link
curl -X POST http://localhost:3000/api/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'

# Visit it (follows the redirect) — replace <code> with the one you got back
curl -L http://localhost:3000/<code>

# Check stats
curl http://localhost:3000/api/stats/<code>
```

## Project structure

```
src/
  server.js   # Express app: routes for shorten, redirect, stats, static UI
  db.js       # SQLite connection + schema setup
public/
  index.html  # UI markup
  styles.css  # UI styling
  app.js      # UI logic (calls the JSON API)
package.json
data.sqlite   # created at runtime, not committed (see .gitignore)
```

## Notes

- There's no authentication — anyone who can reach the server can create and read links.
- Codes are case-sensitive; double-check for look-alike characters (`0`/`O`, `1`/`l`) when typing one by hand.
- Not yet implemented: link expiry, deleting links, rate limiting.
