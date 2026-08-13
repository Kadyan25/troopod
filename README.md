# Purelane — Troopod AI Product Engineer Assignment

Five production Shopify sections, built on a clean Dawn v16.0.0 baseline, porting [`purelane-homepage.html`](https://troopodaiengineerassignment.pages.dev/) — a static design prototype for a plant-based homecare brand — into merchant-editable, theme-editor-safe Liquid.

## What's built

| Section | File | Status |
|---|---|---|
| Hero | `sections/purelane-hero.liquid` | Done |
| Shop / product grid | `sections/purelane-shop.liquid` | Done |
| Best-selling combos | `sections/purelane-combos.liquid` | Done |
| Bundles | `sections/purelane-bundles.liquid` | Done |
| Reviews rail | `sections/purelane-reviews.liquid` | Done |

All five are wired into `templates/index.json` in the prototype's own page order (Hero → Reviews → Combos → Bundles → Shop). Bonus sections from the prototype (ingredients, pillars, proof/stats, full-range strip, why-bundles, categories, trust bar, signup, footer, sticky CTA) were not built — see "What I cut" below.

## Setup

1. **Shopify Partner account + dev store**, clean Dawn install. (Not something I can do on your behalf — needs your own login.)
2. Seed ≥ 8 products, including 1 sold out, 1 with no image, 1 with a long title. The shop grid, combo thumbnails, and bundle tier previews all reference real products by handle/reference, so real product data is required before these sections show anything beyond their empty states.
3. **Provision the custom data model** — three metaobject types (`combo`, `bundle_tier`, `review`) and three product metafields (`custom.rating`, `custom.review_count`, `custom.badge`) that these sections depend on, none of which exist as native Shopify fields:
   ```bash
   cp .env.example .env   # fill in your store domain + Admin API token
   node scripts/provision-shopify-data.mjs --dry-run   # review first
   node scripts/provision-shopify-data.mjs             # apply
   ```
   Full field spec: `scripts/shopify-data-model.json`. See that file's `_comment` and the script's own header for the Admin API scopes the custom app token needs.
4. Add `combo` / `bundle_tier` / `review` entries in **Content → Metaobjects**, referencing your real seeded products.
5. `shopify theme dev` to preview locally, or push straight to the dev store.

## Build notes

### What I'd flag about the original file
- **Two full CSS themes ship in one file.** A dark "V1" block is followed by an unconditional light "V2 — brand colours" override block that always wins in the cascade — V1's color declarations are dead weight, never rendered. I ported the resolved (V2/light-on-dark-ink) palette only, not both.
- **`#shop` renders its first 4 products twice** — once via a placeholder `.pimg` system, once via hand-drawn inline SVG bottle art. Reads like leftover prototype iteration, not an intentional 8-card design. I built the shop grid to genuinely reflect however many products the connected collection has, rather than preserve the duplication.
- **No field in the file is real data.** Every price, rating, review count, and combo/bundle definition is a hardcoded string, by design — it's a static prototype. All of it needed a real home in Shopify (see architecture below).
- **The animated background/scene system** (`.scenes`, 4 layered SVG turbulence filters, scroll-driven crossfade, mousemove parallax, per-section `data-scene` zone tracking) is expensive and page-wide, tightly coupled to a fixed section order. I did not port it — see "What I cut."

### What I changed in the code, and why
- **Metaobjects, not hardcoded blocks, for combos/bundle tiers/reviews.** Blocks would have been simpler to wire, but this content is genuinely reusable/manager-owned data (a combo referencing real products, a review with a star count) that a marketing team should be able to add from **Content → Metaobjects** without touching the theme editor's block tree. Full reasoning in `architecture.md` §3.
- **One shared card snippet** (`snippets/purelane-card-product.liquid`) for the Shop grid, built to handle three states as first-class, not bolted on: no image → branded placeholder via `placeholder_svg_tag`, not a broken `<img>`; sold out → real disabled state via Dawn's own `product-form` custom element, not just visual muting; very long title → no fixed-height clipping, the card grows (this was already correctly handled by the prototype's own flex layout — one case where the original CSS didn't need fixing, just porting).
- **Real add-to-cart everywhere.** Shop cards use Dawn's own `<product-form>` custom element (same AJAX cart/cart-drawer wiring as stock Dawn, rather than reinventing it). Combo cards use the Cart AJAX API directly to add every product in the combo in one request, since the classic form-post `/cart/add` endpoint only accepts one variant at a time.
- **Self-hosted fonts.** Replaced the prototype's Google Fonts `<link>` (render-blocking third-party origin) with the same two variable font files (Outfit, Inter — Open Font License) served from theme assets.
- **Prefixed design tokens** (`--purelane-*` CSS custom properties) instead of the prototype's bare `--ink`/`--brand`/etc., so nothing collides with Dawn's own `:root` variables or another app's.

### The one limitation I didn't build around
**Bundles' "Build this box" implies real mix-and-match pricing** — pick any N products, pay one flat price regardless of which N. Stock Dawn with no apps and no Shopify Functions cannot do that; it needs either a Shopify Function-based cart/bundle discount or a paid bundles app, which is outside "a clean install of Dawn." I built the tier cards pixel-accurately and routed the CTA to a real, honest link (a collection you configure) rather than fake a picker UI that doesn't work. The Combos rail has the same underlying gap and the same honest answer: "Shop bundle" adds the combo's real products to a real cart at their real individual prices — it does not fake the combo's promotional flat price, because that's the same missing discount mechanism. Both are called out in-editor (block `info` text) and in a visible note under the combos rail, not buried.

### What I'd do with more time
- Wire up the animated background/scene system as a proper `theme.liquid`-level include, with the CWV budgeting described in `architecture.md` §6 (throttled scroll handler, fewer simultaneous SVG turbulence filters).
- Build the bonus sections (trust bar and ingredients grid first — cheapest, highest visual completeness gain).
- Translate the new `purelane.*` locale keys into Dawn's other ~30 shipped languages (`theme check` currently flags these as `MatchingTranslations` errors against every non-English locale file — expected, since I only populated `en.default.json`; a real multi-market launch needs the rest).
- A real reviews app integration instead of hand-entered `review` metaobjects, and a real ratings source instead of the manually-set `custom.rating` / `custom.review_count` metafields.
- Live pixel-diff and Core Web Vitals numbers from an actual connected dev store — everything in this build was verified statically (Liquid syntax via `shopify theme check`, cross-referenced CSS-class usage, hand-traced editor load/unload wiring) since no dev store exists yet to preview against.

## AI workflow notes

**What I delegated:** the entire build — extracting the prototype's real structure (had to pull it via the browser's runtime DOM rather than a static download, since the page serves it as a base64 blob for a client-side download button, not a real file at a stable URL), porting ~1,700 lines of prototype HTML/CSS/JS into Shopify's block/schema/metaobject model, writing the card/price/heading snippets, all five sections' Liquid + CSS + JS, the metafield/metaobject provisioning script, and the git history itself (one commit per phase, as instructed).

**Where it needed catching, not just generating:** two real semantic bugs came from filter-chaining Liquid's `t` (translate) and `money` filters in the wrong order — e.g. `'...key' | t: amount: per_product | money` translates first, *then* tries to format the resulting sentence as currency, instead of formatting the number first and interpolating the formatted string into the translation. Both were in the Bundles section's per-product-price note and would have silently rendered garbage in production; caught on a manual re-read, not by the linter (`shopify theme check` validates Liquid syntax and schema shape, not filter-order semantics — it had nothing to say about either bug). A second, smaller catch: I initially typed `purelane-kicker` in two places while the shared CSS defines the unprefixed `.kicker` (deliberately unprefixed to match the prototype's own typography-utility naming) — a silent visual bug, not a syntax error, so it also needed a manual cross-check between every class referenced in Liquid and every class actually defined in CSS (scripted after the fact, once I noticed the pattern, to catch anything else of the same shape — it found nothing else).

**What I'd systematize for twenty more of these:** the class-usage-vs-CSS-definition cross-check (a five-line Node script) should run automatically after every section, not just once at the end — it would have caught the kicker typo immediately instead of on a later pass. Same for a small Liquid lint step specifically for filter-chain order (`t` and `money`/`date`/etc. piped together) — theme-check doesn't catch this category, and it's exactly the kind of mistake an AI-authored Liquid pass makes: locally-well-formed on both sides, syntactically valid, semantically wrong at the filter boundary. I'd also pre-build the metafield/metaobject provisioning script (`scripts/provision-shopify-data.mjs`) as the very first step of any theme-plus-custom-data project, before writing a single section — most of the "does the Liquid render the right thing" uncertainty in this build came from not having a real store to point at yet, and a working provisioner collapses that gap to one command as soon as a dev store exists.

## Deliverables checklist

- [ ] Dev store URL + password — pending: needs a connected store (see Setup)
- [x] GitHub repo, real commit history (one commit per phase)
- [x] Metafield/metaobject definitions — spec + provisioning script in `scripts/`
- [x] Build notes — above
- [x] AI workflow notes — above
