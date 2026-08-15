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
| Header (nav, ticker) | `sections/purelane-header.liquid` | Done (bonus) |
| Ingredients grid | `sections/purelane-ingredients.liquid` | Done (bonus) |
| Page background (scenes + water layers) | `snippets/purelane-water.liquid` | Done |

Everything is wired into `templates/index.json` in the prototype's own page order (Hero → Reviews → Ingredients → Combos → Bundles → Shop). The header and ingredients grid weren't part of the required five — I added them because without them the page didn't read as the same design. Still not built: pillars, proof/stats, full-range strip, why-bundles, categories, trust bar, signup, footer, sticky CTA.

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
- The animated background (4 scene gradients, 4 blend-mode SVG turbulence layers, bubbles, vignette, scroll crossfade, mouse parallax) is the expensive part of the page. It's ported in full, with the cost contained — see below.

### What I changed, and why
- Combos, bundle tiers, and reviews are metaobjects, not hardcoded blocks. Blocks would've been simpler to wire up, but this is content a marketing person should be able to add themselves from Content → Metaobjects, without opening the theme editor. Full reasoning in `architecture.md`.
- One shared card snippet for the shop grid, built to handle three things properly instead of as afterthoughts: no image (real placeholder, not a broken `<img>`), sold out (real disabled state through Dawn's own `product-form`, not just greyed out), long title (card just grows, no clipping — this one was already handled fine in the original CSS, didn't need to touch it).
- Add-to-cart is real everywhere. Shop cards use Dawn's own `product-form` element (same cart/cart-drawer wiring Dawn already ships, didn't rebuild it). Combo cards add every product in the combo in one request through the cart API, since the plain form only takes one variant at a time.
- Self-hosted fonts instead of the prototype's Google Fonts link, so there's one less external request.
- All my CSS variables are prefixed (`--purelane-*`) instead of the prototype's bare `--ink`/`--brand`/etc., so nothing clashes with Dawn's own variables.
- One shared background behind every section, in the layout rather than in any section, so it survives a merchant removing or reordering sections. Path data and filter values are the prototype's, unchanged. Two things I did change: the original repeats the same SVG `<defs>` ids in all four layers, so every `url(#id)` silently resolved to the first one — ids are namespaced per layer now. And the whole thing is inert under `prefers-reduced-motion`, with the layers fading out with scroll depth as the original does.

### The one thing I didn't build around
Bundles' "Build this box" and Combos' "Shop bundle" both imply real mix-and-match pricing — pick any products, pay one flat price. Stock Dawn with no apps can't do that, it needs a Shopify Function or a paid bundles app. So instead of building a picker that doesn't actually work, both buttons do something real: Bundles links to a real collection you set, Combos adds the real products to a real cart at their real prices (not the flat combo price — that's the same missing piece). Both say what they actually do, in the editor and on the page, not buried.

### What I'd do with more time
- Measure the water layers properly. They're rAF-throttled and cut off under reduced motion, but I haven't put real Core Web Vitals numbers against them on a mid-range phone.
- Build the remaining bonus sections — trust bar next, cheapest and most visible.
- Translate the new locale strings into Dawn's other ~30 languages (`theme check` flags these as missing right now, since I only filled in English).
- A real reviews app instead of hand-entered review metaobjects, real ratings source instead of manually set rating/review_count fields.
- Actual pixel comparisons and Core Web Vitals numbers now that there's a real store connected — everything up to that point was checked statically (`theme check`, cross-checking CSS classes by hand, tracing through the editor load/unload code).

## AI workflow notes

**What I handed off:** the whole build. Pulling the prototype's real structure (had to grab it from the page's own JS, since it's served as a base64 blob behind a download button, not a real file at a URL), porting about 1,700 lines of HTML/CSS/JS into Shopify's sections/blocks/metaobjects, writing all the snippets, all five sections, the provisioning script, and the git history itself, one commit per phase.

**What needed catching:** two real bugs came from chaining Liquid's `t` and `money` filters in the wrong order — translating the text first, then trying to format the already-translated sentence as money, instead of formatting the number first and dropping it into the translation. Both were in the Bundles per-product price line and would've shown garbage in production. Caught by reading the code again, not by the linter — `theme check` checks syntax and schema shape, it has no idea about filter order. Smaller one: I typed `purelane-kicker` in two places when the CSS actually defines it as just `.kicker` (on purpose, matching the prototype's own naming) — a silent visual bug, not an error. Found that by writing a quick script to cross-check every class used in the Liquid files against every class actually defined in CSS.

The biggest one only showed up against the real store: the shop grid used `collection.products | slice: 0, limit` to cap how many products render. That's valid Liquid, passes `theme check` clean, and is a completely reasonable-looking way to limit an array — except `collection.products` isn't a plain array, it's a paginated object, and `slice` on it silently returned a blank product for every card instead of erroring where the actual problem was. Every product card rendered a placeholder image and an empty title, and the page died at the add-to-cart form with "product form must be given a product" — a real Shopify error, but pointing at the wrong line. Took directly comparing against Dawn's own stock collection page (which rendered all 8 products fine, proving the data and Shopify's side were correct) to isolate that the bug was specifically in how I was looping, not the data. The fix is Dawn's own idiom: `for product in collection.products limit: n`, not a piped `slice`. Nothing local would've caught this — it needed a real collection with real products behind it.

The worst one was a plain reading failure, and it's worth being blunt about. The prototype ships two complete palettes — a dark V1 block, then a light "V2 — brand colours" block that overrides it unconditionally. I spotted that trap early enough to write it down in my own notes as a thing to watch. Then I built the entire theme off V1 anyway. Every token, every glass panel, every badge and pill was the wrong half of the file, and it stayed wrong until someone looked at the two pages side by side and said the colours don't match. Reading a file and noticing a problem is not the same as acting on it, and nothing in my process connected the two.

Four more that only a real render would show:

- Dawn's `base.css` hides empty elements (`div:empty { display: none }`). The background's gradient layers and vignette are empty by design, so all of them silently vanished and only the container's base colour showed. Nothing errors; the page just renders the wrong colour.
- Dawn's body is `display: flex`, and `base.css` puts a `z-index` on the header section group. A flex item with a z-index creates a stacking context even at `position: static`, which trapped the page-wide `z-index: -1` background inside the header and painted it over the entire page. The page looked like a blank green rectangle with a working navbar.
- Shopify resource settings in JSON templates store **handles**, not GIDs. I wrote GIDs. Metaobject and product references resolved to blank with no error and no warning — sections just quietly rendered their empty states.
- A `money` metafield's `.value` already coerces to subunits; a plain number setting doesn't. Mixing them put prices out by 100× — $49,900.00 instead of $499.00.

**What I'd systematize:** every one of these is invisible to `theme check` and invisible to reading the code. So: get a real store, real products and real metaobjects standing before writing a single section, then look at the rendered page after every section instead of at the end. Add a diff pass against the source design that compares computed values — background colours, type scale, spacing — rather than trusting that I ported the right numbers. And when I notice something odd in a source file, turn it into a checklist item immediately, because writing it in a notes file did nothing to stop me building on top of it.

## Deliverables checklist

- [x] Dev store URL + password
- [x] GitHub repo, real commit history (one commit per phase)
- [x] Metafield/metaobject definitions — created live on the store, spec + provisioning script in `scripts/`
- [x] Build notes — above
- [x] AI workflow notes — above
