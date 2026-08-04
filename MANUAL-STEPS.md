# MANUAL-STEPS.md

Everything here needs a human with account access — none of it can be scripted
from this repo. All of it is **free**: no step below requires a paid plan, and
where a card might be requested it is called out explicitly.

Legend:

- 🔴 **Blocking** — later steps cannot happen until this is done.
- 🟡 **Parallel** — can be done at any time, including while waiting on reviews.

Realistic timing: steps 1–4 involve Meta reviews that take anywhere from a few
hours to several business days. Steps 8–10 are yours alone and take minutes.
Do the parallel work while the reviews sit in a queue.

---

## 1. 🔴 Meta Business Portfolio

Create the business account everything else hangs off.

1. Go to <https://business.facebook.com> and create a Business Portfolio
   (formerly "Business Manager").
2. Fill in the legal business name, address and website exactly as they appear on
   your CNPJ registration. Mismatches are the single most common cause of
   verification rejection.
3. Note the **Business Portfolio ID** — you will need it repeatedly.

**Blocks:** everything.
**Cost:** free.

---

## 2. 🔴 Business Verification

Meta must confirm the business is real before you can scale past a handful of
client numbers.

1. In Business Settings → **Business Info** → start **Verification**.
2. Upload documents proving the legal entity and address. For a Brazilian company
   the usual set is: Cartão CNPJ, Contrato Social, and a recent utility bill or
   bank statement in the company name.
3. Confirm the phone number and domain if asked.

**Blocks:** Tech Provider onboarding, App Review, raising the client cap.
**Cost:** free.
**Wait:** commonly a few days; can be longer if documents are rejected. Start it
first and do steps 3, 8, 9 and 10 while waiting.

---

## 3. 🔴 360dialog Partner account (Direct Payment)

1. Apply at <https://www.360dialog.com/partner-program> (or the current partner
   signup URL) and choose the **Direct Payment** model, where your clients pay
   360dialog directly. This avoids you fronting WhatsApp costs.
2. Connect the Meta Business Portfolio from step 1.
3. Once approved, open the **Partner Hub** and record:
   - **Partner ID** → `D360_PARTNER_ID`
   - Partner account username / password → `D360_PARTNER_USERNAME` /
     `D360_PARTNER_PASSWORD`

**Blocks:** steps 4 and 7.
**Cost:** free to become a partner. Clients pay their own WhatsApp usage.

---

## 4. 🔴 Tech Provider onboarding

This is what unlocks **Integrated Onboarding** (Embedded Signup) — the flow that
lets a business connect its own number without you touching credentials.

1. In the Meta App Dashboard, complete the **Tech Provider** / Solution Partner
   onboarding for your app.
2. Add the WhatsApp product and configure the Embedded Signup settings.
3. Meta reviews the submission.

**Blocks:** step 5 (App Review) and step 9 (you cannot get the onboarding link
until this is approved).
**Cost:** free.

---

## 5. 🟡 App Review — raise the onboarding cap

New Tech Providers are capped at a small number of onboarded clients (commonly
10) until reviewed.

1. In the Meta App Dashboard → **App Review**, request the WhatsApp Business
   permissions your flow uses (typically `whatsapp_business_management` and
   `whatsapp_business_messaging`).
2. Provide a screencast of the full onboarding path — the `/comecar` page, the
   Embedded Signup window, and the `/onboarding/sucesso` confirmation. Both pages
   are already deployed, so record them straight from the live site.
3. Submit and wait.

**Parallel:** you can onboard your first clients under the initial cap while this
is in review. Do not wait for it before selling.
**Cost:** free.

---

## 6. 🟡 Supabase project

1. Create a free project at <https://supabase.com/dashboard>. Pick the region
   closest to Brazil (`sa-east-1` / São Paulo if offered).
2. Open **SQL Editor → New query**, paste the whole of `schema.sql`, run it.
3. Verify under **Table Editor** that `whatsapp_clients` and `leads` exist and
   both show RLS enabled.
4. From **Project Settings → API**, copy:
   - Project URL → `SUPABASE_URL`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`

> The `service_role` key bypasses Row Level Security. It belongs only in Vercel
> environment variables. Never put it in `script.js`, an HTML file, or anything
> the browser downloads.

**Parallel:** do this immediately, it does not depend on Meta.
**Cost:** free tier. No card required.

---

## 7. 🔴 Partner Hub webhook + redirect URLs

Do this once step 3 is approved and the site is deployed.

1. Partner Hub → **Organization → Webhooks** (or Integrations), set the partner
   webhook URL to:

   ```
   https://conversia-site.vercel.app/api/partner-events
   ```

   Replace the host with your custom domain once it is live, and update
   `PUBLIC_BASE_URL` to match.

2. Set the **Redirect URL** used after Embedded Signup to:

   ```
   https://conversia-site.vercel.app/onboarding/sucesso
   ```

3. If the Partner Hub offers a signing secret for webhooks, generate it and store
   it as `D360_PARTNER_WEBHOOK_SECRET`.

4. **Discover the real payload shape.** Temporarily set `D360_ALLOW_UNSIGNED=true`
   in Vercel, trigger a test event, then open **Vercel → Deployments → Functions →
   `partner-events` logs**. The function logs the entire payload and the fields it
   extracted. Confirm:
   - the signature header name → set `D360_SIGNATURE_HEADER` if it is not
     `x-360dialog-signature`
   - the event name for a live channel
   - the field names for channel id, client id and phone number id

   Then **set `D360_ALLOW_UNSIGNED=false`** and confirm a signed event still
   verifies. Do not leave it on `true`.

5. While you are there, check the three calls in `api/_lib/d360.js` against the
   current docs at <https://docs.360dialog.com/partner/>: token, API key
   generation, and webhook registration. They are isolated in that one file so
   this is a five-minute check.

**Blocks:** automatic provisioning of new clients.
**Cost:** free.

---

## 8. 🟡 Vercel environment variables

**Vercel → conversia-site → Settings → Environment Variables.** Add each of these
for **Production, Preview and Development**. Descriptions are in `.env.example`.

Generate the two bridge secrets first:

```bash
openssl rand -hex 32
```

| Variable | Where it comes from |
| --- | --- |
| `SUPABASE_URL` | Step 6 |
| `SUPABASE_SERVICE_ROLE_KEY` | Step 6 |
| `D360_PARTNER_ID` | Step 3 |
| `D360_PARTNER_USERNAME` | Step 3 |
| `D360_PARTNER_PASSWORD` | Step 3 |
| `D360_PARTNER_WEBHOOK_SECRET` | Step 7 |
| `D360_SIGNATURE_HEADER` | Step 7 (only if not the default) |
| `BRIDGE_INBOUND_SECRET` | `openssl rand -hex 32` |
| `BRIDGE_SEND_SECRET` | `openssl rand -hex 32` |
| `MAKE_WEBHOOK_URL` | Step 10 |
| `PUBLIC_BASE_URL` | Your live origin, no trailing slash |

Redeploy after adding them — Vercel does not apply new variables to an existing
deployment.

**Parallel:** yes, as values become available.
**Cost:** free.

---

## 9. 🟡 Fill in the two site placeholders

Both are single-line edits, then `git push`.

1. **WhatsApp number** — `script.js`, the `WHATSAPP_NUMBER` constant near the top.
   International format, digits only: `5511987654321`. Until this is set, every
   "Falar no WhatsApp" button quietly falls back to scrolling to the contact form.

2. **Onboarding link** — `comecar.html`, the `href` on `#onboarding-link`, marked
   `[COLE-AQUI-O-LINK-DE-ONBOARDING-DO-360DIALOG]`. You get this URL from the
   Partner Hub after step 4 is approved. Until it is a real `https://` URL the
   button stays disabled and a fallback message points visitors to WhatsApp.

Also worth confirming: the contact e-mail in the footer of `index.html` currently
reads `contato@conversia.com.br`.

**Parallel:** the WhatsApp number can be set right now. The onboarding link waits
on step 4.
**Cost:** free.

---

## 10. 🟡 Make.com scenario

Free tier gives 1,000 operations/month — enough to pilot, not enough for volume.

1. Create a scenario starting with a **Custom webhook** module. Copy its URL into
   `MAKE_WEBHOOK_URL`.
2. The payload `/api/inbound` sends looks like:

   ```json
   {
     "client_id": "…",
     "business_name": "…",
     "phone_number_id": "…",
     "contact": { "wa_id": "5511…", "name": "Ana" },
     "message": {
       "id": "wamid…", "from": "5511…", "type": "text|image|audio",
       "text": "…", "media_id": "…", "mime_type": "…", "caption": "…"
     },
     "received_at": "2026-08-04T12:00:00.000Z"
   }
   ```

3. Branch on `message.type`:
   - `text` → straight to Relevance AI
   - `image` → download media using the channel API key, then Groq vision
   - `audio` / `voice` → download media, then Groq Whisper for transcription

   > Media download needs that channel's 360dialog API key, which by design never
   > leaves the server. Either add a small `/api/media` endpoint following the
   > same shared-secret pattern as `/api/send`, or have Make call `/api/send`-style
   > auth against a new route. Do not put the API key into Make.

4. End the scenario with an **HTTP → Make a request** module:

   - URL: `https://conversia-site.vercel.app/api/send`
   - Method: `POST`
   - Header: `x-bridge-secret: <BRIDGE_SEND_SECRET>`
   - Body:

     ```json
     { "client_id": "{{client_id}}", "to": "{{contact.wa_id}}", "text": "{{resposta}}" }
     ```

**Parallel:** yes, but you need step 8 done to have the secret.
**Cost:** free tier.

---

## Suggested order

```
Day 1   → 1, 2 (submit and wait), 6, 8 (partial), 9 (WhatsApp number)
Wait    → 3, 4 in review
Then    → 7, 9 (onboarding link), 10, 8 (remaining values)
Later   → 5 (App Review to raise the cap), once you have real traffic to show
```

## Smoke tests

Once steps 6, 8 and 9 are done, verify from a terminal.

Lead form — should return `201` and add a row in Supabase:

```bash
curl -s -X POST https://conversia-site.vercel.app/api/leads -H 'Content-Type: application/json' -d '{"nome":"Teste","whatsapp":"11987654321","segmento":"Outro","consentimento":true}'
```

Send endpoint without a secret — must return `401`:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://conversia-site.vercel.app/api/send -H 'Content-Type: application/json' -d '{"client_id":"x","to":"1","text":"y"}'
```

Partner webhook without a signature — must return `401` once
`D360_ALLOW_UNSIGNED` is `false`:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://conversia-site.vercel.app/api/partner-events -H 'Content-Type: application/json' -d '{}'
```
