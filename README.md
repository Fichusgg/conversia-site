# ConversIA

Marketing site + WhatsApp automation bridge for ConversIA, an agency that sets up
AI-powered WhatsApp attendance for small local businesses in Brazil.

Site copy is Brazilian Portuguese; code and comments are English.

## Stack

| Piece | What |
| --- | --- |
| Site + dashboard | Next.js 15 (App Router, JavaScript, no TypeScript). |
| Auth | Supabase Auth, email + password. No public sign-up. |
| Bridge functions | `pages/api/*` — Node handlers with the raw body parser disabled. |
| Data | Supabase (`@supabase/supabase-js` server-side, `@supabase/ssr` for auth). |
| WhatsApp | WhatsApp Business Platform via 360dialog (official BSP). |
| Orchestration | Make.com. |
| Hosting | Vercel — site and functions in the same project. |

Everything here runs on **Vercel Hobby + Supabase free tier**.

The site is public. Everything under `/dashboard` is private: `middleware.js`
redirects anyone without a Supabase session to `/login` before a page renders.

## Layout

```
app/
  layout.jsx                  Root layout, fonts, metadata
  globals.css                 Design tokens, light + dark themes, dashboard styles
  page.jsx                    Marketing home
  comecar/page.jsx            /comecar — onboarding entry point
  onboarding/sucesso/page.jsx Post Embedded Signup landing
  login/                      Admin sign-in
  dashboard/
    layout.jsx                Shell: header, nav, sign out
    actions.js                Every dashboard write ('use server')
    page.jsx                  Visão geral
    clientes/                 List, create, and per-client editor
    onboarding/               Checklists with progress and notes
    modelos/                  Prompt template library
    leads/                    Leads inbox
components/site/              Header, footer, WhatsApp CTAs, contact form
lib/
  site.js                     Shared constants and formatting
  supabase/admin.js           Service-role client (server-only)
  supabase/server.js          Session-scoped client + requireAdmin()
  supabase/browser.js         Sign-in/out only
  bridge/                     Shared code for the WhatsApp bridge
pages/api/                    The five bridge endpoints
middleware.js                 Gates /dashboard, refreshes the session
supabase/schema.sql           All tables, RLS, grants and seed data
```

Bridge endpoints live in `pages/api` rather than `app/api` on purpose: they need
the Node `(req, res)` signature and the raw request bytes for the 360dialog HMAC,
which the Pages runtime gives directly once `bodyParser` is off.

## Running locally

```bash
npm install && npm run dev
```

Create `.env.local` from `.env.example` first, or pull the real values down:

```bash
npx vercel env pull .env.local
```

At minimum you need `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the dashboard to load.

## Deploying

The project is already connected to Vercel. Every push to `main` deploys:

```bash
git push
```

Vercel detects Next.js and runs `next build` — no manual settings needed.

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
| `NEXT_PUBLIC_SUPABASE_URL` | auth | Same as `SUPABASE_URL`; safe in the browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | auth | Publishable key. Public by design |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | site | Digits only, e.g. `5511987654321` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | site | Footer address |
| `NEXT_PUBLIC_ONBOARDING_URL` | /comecar | 360dialog Embedded Signup link |

`NEXT_PUBLIC_*` values are inlined into the browser bundle at build time, so
only public values belong there. Changing one requires a redeploy.

## Database

Run `supabase/schema.sql` in the Supabase SQL Editor. It is idempotent, so it is
safe to re-run after a change. It creates six tables:

| Table | Holds |
| --- | --- |
| `whatsapp_clients` | One row per connected channel. Written by the bridge. |
| `client_config` | How each business's assistant behaves. Edited in the dashboard. |
| `conversations` | Message log, written by the bridge / Make. |
| `leads` | Demo requests from the site form. |
| `onboarding_checklist` | Ten steps per client, seeded automatically on insert. |
| `prompt_templates` | Starter prompts for eight Brazilian business types. |

### How the data is protected

Row Level Security is on everywhere, with one policy per table allowing the
`authenticated` role full access. Since there is no public sign-up, that role is
just the agency admin.

RLS is row-level and cannot hide a *column*, so the two secrets are protected
separately with **column grants**:

- `whatsapp_clients.api_key`
- `client_config.cal_api_key`

Both are revoked from `anon` and `authenticated` entirely. Even a signed-in
browser session cannot read them — only the service-role key can, and that lives
solely in server code. The dashboard shows a masked hint (`••••abcd`) so you can
tell whether a key is set without ever transmitting it.

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

- [ ] Set `NEXT_PUBLIC_WHATSAPP_NUMBER`. Until then every WhatsApp button
      falls back to scrolling to the contact form (no broken links, but no
      WhatsApp either).
- [ ] Create the admin user in Supabase Auth — see `MANUAL-STEPS.md` step 0.
- [ ] Paste the 360dialog onboarding URL into `comecar.html`. Until then the
      button is disabled and a fallback message points at WhatsApp.
- [ ] Confirm the contact e-mail in the footer (`NEXT_PUBLIC_CONTACT_EMAIL`).
- [ ] Run `supabase/schema.sql` in Supabase and set the environment variables.
- [ ] Work through `MANUAL-STEPS.md`.
- [ ] Verify the three 360dialog calls in `lib/bridge/d360.js` against the current
      Partner API docs — they are isolated in that one file for exactly this reason.

## Notes

- Mobile-first, responsive from 320px up, light and dark themes.
- Semantic landmarks, skip link, visible focus rings, `prefers-reduced-motion`.
- No invented testimonials, client logos, metrics or prices anywhere in the copy.
