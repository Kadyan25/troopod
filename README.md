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
- Two full CSS themes in one file. A dark "V1" block, then a light "V2" block that always overrides it. V1's colors never actually render — it's dead code. I only ported the V2 (light-on-dark) palette.
- The shop grid renders its first 4 products twice — once as placeholder art, once as hand-drawn SVG bottles. Looks like leftover work from building the prototype, not an intentional 8-card design. My shop grid just shows whatever products are in the connected collection, no duplication.
- Nothing in the file is real data. Every price, rating, review count, combo, and bundle is a hardcoded string. Fine for a prototype, but all of it needed a real home in Shopify.
- The animated background (scenes, 4 layered SVG filters, scroll crossfade, mouse parallax, per-section scene tracking) is heavy and spans the whole page. I skipped it — see "what I'd do with more time" below.

### What I changed, and why
- Combos, bundle tiers, and reviews are metaobjects, not hardcoded blocks. Blocks would've been simpler to wire up, but this is content a marketing person should be able to add themselves from Content → Metaobjects, without opening the theme editor. Full reasoning in `architecture.md`.
- One shared card snippet for the shop grid, built to handle three things properly instead of as afterthoughts: no image (real placeholder, not a broken `<img>`), sold out (real disabled state through Dawn's own `product-form`, not just greyed out), long title (card just grows, no clipping — this one was already handled fine in the original CSS, didn't need to touch it).
- Add-to-cart is real everywhere. Shop cards use Dawn's own `product-form` element (same cart/cart-drawer wiring Dawn already ships, didn't rebuild it). Combo cards add every product in the combo in one request through the cart API, since the plain form only takes one variant at a time.
- Self-hosted fonts instead of the prototype's Google Fonts link, so there's one less external request.
- All my CSS variables are prefixed (`--purelane-*`) instead of the prototype's bare `--ink`/`--brand`/etc., so nothing clashes with Dawn's own variables.

### The one thing I didn't build around
Bundles' "Build this box" and Combos' "Shop bundle" both imply real mix-and-match pricing — pick any products, pay one flat price. Stock Dawn with no apps can't do that, it needs a Shopify Function or a paid bundles app. So instead of building a picker that doesn't actually work, both buttons do something real: Bundles links to a real collection you set, Combos adds the real products to a real cart at their real prices (not the flat combo price — that's the same missing piece). Both say what they actually do, in the editor and on the page, not buried.

### What I'd do with more time
- Build the animated background as a proper `theme.liquid` include, with the perf budget written up in `architecture.md` (throttle the scroll handler, fewer SVG filters running at once).
- Build the bonus sections — trust bar and ingredients grid first, cheapest and most visible.
- Translate the new locale strings into Dawn's other ~30 languages (`theme check` flags these as missing right now, since I only filled in English).
- A real reviews app instead of hand-entered review metaobjects, real ratings source instead of manually set rating/review_count fields.
- Actual pixel comparisons and Core Web Vitals numbers now that there's a real store connected — everything up to that point was checked statically (`theme check`, cross-checking CSS classes by hand, tracing through the editor load/unload code).

## AI workflow notes

**What I handed off:** the whole build. Pulling the prototype's real structure (had to grab it from the page's own JS, since it's served as a base64 blob behind a download button, not a real file at a URL), porting about 1,700 lines of HTML/CSS/JS into Shopify's sections/blocks/metaobjects, writing all the snippets, all five sections, the provisioning script, and the git history itself, one commit per phase.

**What needed catching:** two real bugs came from chaining Liquid's `t` and `money` filters in the wrong order — translating the text first, then trying to format the already-translated sentence as money, instead of formatting the number first and dropping it into the translation. Both were in the Bundles per-product price line and would've shown garbage in production. Caught by reading the code again, not by the linter — `theme check` checks syntax and schema shape, it has no idea about filter order. Smaller one: I typed `purelane-kicker` in two places when the CSS actually defines it as just `.kicker` (on purpose, matching the prototype's own naming) — a silent visual bug, not an error. Found that by writing a quick script to cross-check every class used in the Liquid files against every class actually defined in CSS.

**What I'd systematize:** run that class cross-check after every section, not just once at the end — it would've caught the kicker bug right away instead of later. Same idea for a filter-order check on `t`/`money`/`date` chains, since that's a mistake AI-written Liquid makes specifically — looks fine on both ends, valid syntax, wrong once you actually read what it does. And I'd write the metaobject/metafield provisioning script before writing a single section, not after — most of the guessing in this build was from not having a real store yet, and once I pointed the script at a real one, it immediately caught something (`min`/`max` validations aren't supported on product reference lists) that no amount of local checking would've found.

## Deliverables checklist

- [x] Dev store URL + password
- [x] GitHub repo, real commit history (one commit per phase)
- [x] Metafield/metaobject definitions — created live on the store, spec + provisioning script in `scripts/`
- [x] Build notes — above
- [x] AI workflow notes — above
