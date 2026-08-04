# ConversIA

Marketing site + WhatsApp automation bridge for ConversIA, an agency that sets up
AI-powered WhatsApp attendance for small local businesses in Brazil.

Site copy is Brazilian Portuguese; code and comments are English.

## Stack

| Piece | What |
| --- | --- |
| Site | Static HTML + CSS + vanilla JS. No framework, no build step, no dependencies. |
| Functions | Vercel Serverless Functions in `/api` (Node.js, CommonJS, zero npm packages). |
| Data | Supabase (PostgREST over HTTPS, called with `fetch`). |
| WhatsApp | WhatsApp Business Platform via 360dialog (official BSP). |
| Orchestration | Make.com. |
| Hosting | Vercel — site and functions in the same project. |

Everything here runs on **Vercel Hobby + Supabase free tier**. There are no npm
dependencies at all, so there is nothing to install and no build to break.

## Layout

```
index.html              Marketing site (single page)
comecar.html            /comecar — onboarding entry point
onboarding/sucesso.html /onboarding/sucesso — post Embedded Signup landing
styles.css              Design tokens, light + dark themes
script.js               Nav, smooth scroll, WhatsApp links, form
vercel.json             Clean URLs, security headers, cache policy
schema.sql              Supabase tables — run once in the SQL Editor
.env.example            Every environment variable, documented
MANUAL-STEPS.md         The account setup only a human can do
api/
  _lib/http.js          Raw body reading, JSON replies, constant-time compare
  _lib/supabase.js      Supabase REST helpers
  _lib/d360.js          360dialog Partner API + WABA calls
  partner-events.js     POST /api/partner-events — 360dialog partner webhook
  inbound.js            POST /api/inbound     — inbound messages → Make
  send.js               POST /api/send        — Make → WhatsApp reply
  media.js              POST /api/media       — download a photo/voice note for Make
  leads.js              POST /api/leads       — site form → Supabase
```

Files under `/api` starting with `_` are shared modules, not routes — Vercel does
not expose them as endpoints.

## Running locally

The site is plain static files, so any server works:

```bash
python3 -m http.server 4321
```

That serves the pages but **not** `/api` — the form will fail. To run the
functions too, use the Vercel CLI (free, no card required):

```bash
npx vercel dev
```

Pull the environment variables down first, or create `.env.local` from
`.env.example`:

```bash
npx vercel env pull .env.local
```

## Deploying

The project is already connected to Vercel. Every push to `main` deploys:

```bash
git push
```

No build command, no output directory, no framework preset. Vercel serves the
static files from the repo root and turns each file in `/api` into a function.

## Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** for the
Production, Preview and Development scopes. Full descriptions live in
`.env.example`.

| Variable | Used by | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | all functions | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | all functions | **Secret.** Bypasses RLS. Server-side only. |
| `D360_PARTNER_ID` | partner-events | From the Partner Hub |
| `D360_PARTNER_USERNAME` | partner-events | Partner account login |
| `D360_PARTNER_PASSWORD` | partner-events | **Secret.** |
| `D360_PARTNER_WEBHOOK_SECRET` | partner-events | **Secret.** HMAC signing key |
| `D360_SIGNATURE_HEADER` | partner-events | Defaults to `x-360dialog-signature` |
| `D360_ALLOW_UNSIGNED` | partner-events | `true` only while discovering the payload shape |
| `BRIDGE_INBOUND_SECRET` | inbound | **Secret.** Appended as `?secret=…` to the webhook URL |
| `BRIDGE_SEND_SECRET` | send | **Secret.** Sent by Make as `x-bridge-secret` |
| `MAKE_WEBHOOK_URL` | inbound | Make custom-webhook URL |
| `PUBLIC_BASE_URL` | partner-events | This project's origin, no trailing slash |

The site's own WhatsApp number is **not** an environment variable — the static
front-end has no build step to read one. It lives in `WHATSAPP_NUMBER` at the top
of `script.js`.

## Database

Run `schema.sql` once in the Supabase SQL Editor. It creates:

- **`whatsapp_clients`** — one row per connected business, keyed by `client_id`,
  looked up by `phone_number_id` on every inbound message. Holds that channel's
  360dialog API key.
- **`leads`** — demo requests from the site form, with the LGPD opt-in recorded
  on the row.

Both tables have Row Level Security **enabled with no policies**, so the anon and
publishable keys can do nothing at all. Only the service-role key — used solely
inside serverless functions — can read or write them.

## How the bridge fits together

```
Business completes Embedded Signup
        │
        ▼
360dialog  ──"Channel Live"──▶  POST /api/partner-events
                                  ├─ generate that channel's API key
                                  ├─ register /api/inbound as its webhook
                                  └─ upsert into whatsapp_clients

Customer sends a WhatsApp message
        │
        ▼
360dialog  ─────────────────▶  POST /api/inbound
                                  ├─ look up business by phone_number_id
                                  └─ forward enriched payload ─▶ Make webhook
                                                                    │
                                        Groq (vision / Whisper)  ◀──┤
                                        Relevance AI (agent)     ◀──┤
                                                                    ▼
                                                          POST /api/send
                                                            ├─ look up api_key by client_id
                                                            └─ POST waba-v2.360dialog.io/messages
```

## Endpoints

### `POST /api/leads`
Public. Backs the site form. Validates, drops honeypot hits, inserts into `leads`.

```json
{ "nome": "Ana", "whatsapp": "(11) 98765-4321", "email": "ana@x.com.br",
  "segmento": "Salão ou barbearia", "mensagem": "…", "consentimento": true }
```

### `POST /api/partner-events`
Called by 360dialog. Verifies an HMAC-SHA256 signature over the raw body. Logs
every payload in full, which is how you confirm the real field names for your
account on the first live event.

### `POST /api/inbound`
Called by 360dialog per number. Protected by `?secret=` matching
`BRIDGE_INBOUND_SECRET`. Ignores delivery-status callbacks, forwards real
messages to Make, and always answers 200 so 360dialog never retries.

### `POST /api/send`
Called by Make. Requires `x-bridge-secret` or `Authorization: Bearer`. Accepts
either a shorthand or a full Cloud API message:

```json
{ "client_id": "abc", "to": "5511999999999", "text": "Olá!" }
{ "client_id": "abc", "message": { "messaging_product": "whatsapp", "…": "…" } }
```

### `POST /api/media`
Called by Make. Same shared secret as `/api/send`. Turns the `media_id` from an
inbound photo or voice note into bytes, so Groq vision / Whisper can read it —
without the channel API key ever being configured inside Make.

```json
{ "client_id": "abc", "media_id": "wamid…" }
→ { "ok": true, "mime_type": "audio/ogg", "size": 12345, "base64": "…" }
```

## Before this handles real traffic

- [ ] Set `WHATSAPP_NUMBER` in `script.js`. Until then every WhatsApp button
      falls back to scrolling to the contact form (no broken links, but no
      WhatsApp either).
- [ ] Paste the 360dialog onboarding URL into `comecar.html`. Until then the
      button is disabled and a fallback message points at WhatsApp.
- [ ] Confirm the contact e-mail in the footer of `index.html`.
- [ ] Run `schema.sql` in Supabase and set the environment variables.
- [ ] Work through `MANUAL-STEPS.md`.
- [ ] Verify the three 360dialog calls in `api/_lib/d360.js` against the current
      Partner API docs — they are isolated in that one file for exactly this reason.

## Notes

- Mobile-first, responsive from 320px up, light and dark themes.
- Semantic landmarks, skip link, visible focus rings, `prefers-reduced-motion`.
- No invented testimonials, client logos, metrics or prices anywhere in the copy.
