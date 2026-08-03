# ConversIA — site institucional

Single-page marketing site for ConversIA, an AI automation agency serving the
Brazilian market. Plain HTML, CSS and vanilla JavaScript — no build step, no
dependencies.

| File | Purpose |
| --- | --- |
| `index.html` | All page content and structure |
| `styles.css` | Design tokens, layout, responsive rules |
| `script.js` | Nav, smooth scroll, FAQ accordion, form validation |

## Running locally

Any static file server works. For example:

```bash
python3 -m http.server 4321
```

Then open <http://localhost:4321>.

## Deploying

Zero-config static deploy on Vercel — import the repository and deploy with no
framework preset and no build command.

## Before going live

Placeholders are marked with `[BRACKETS]` throughout `index.html`.

- [ ] **WhatsApp number** — every CTA points at `wa.me/19787375032`. It appears
      9 times in `index.html`, plus the display text `+1 978-737-5032` in the footer.
- [ ] **`[SEU-DOMINIO]`** — Open Graph tags and the footer email address
- [ ] **`[X]` values** — implementation days, diagnosis length, response time
- [ ] **Stats** — `[8]s`, `-[40]%`, `+[3]x` in the Resultados section
- [ ] **`[LOGO CLIENTE 1-5]`** — replace with real logos or delete the `.logos` section
- [ ] **Testimonials** — `[DEPOIMENTO N]`, `[NOME DO CLIENTE]`, `[Cargo] — [Empresa]`
- [ ] **`[SEU CRM: ...]`** and **`[SEGMENTOS: ...]`**
- [ ] **FAQ 5** — describe the actual security measures
- [ ] **Footer** — CNPJ, address, business hours, social URLs, privacy/terms links
- [ ] **Form backend** — `script.js` currently logs the payload to the console
      (see the `TODO`); point it at Formspree, an n8n webhook, or your own endpoint
- [ ] **Favicon** and analytics snippet — neither is wired up yet

## Notes

- Copy is Brazilian Portuguese; code and comments are English.
- Mobile-first, responsive down to 320px.
- Semantic landmarks, skip link, and `prefers-reduced-motion` support.
- Text contrast meets WCAG AA (lowest measured pair is 4.3:1).
