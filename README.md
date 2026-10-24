# Purelane — Shopify Theme Build

Five production Shopify sections, built on a clean Dawn v16.0.0 baseline, porting a static design prototype for a plant-based homecare brand into merchant-editable, theme-editor-safe Liquid.

## What's built

| Section | File |
|---|---|
| Hero | `sections/purelane-hero.liquid` |
| Shop / product grid | `sections/purelane-shop.liquid` |
| Best-selling combos | `sections/purelane-combos.liquid` |
| Bundles | `sections/purelane-bundles.liquid` |
| Reviews rail | `sections/purelane-reviews.liquid` |
| Header (nav, ticker) | `sections/purelane-header.liquid` |
| Ingredients grid | `sections/purelane-ingredients.liquid` |
| Page background (scenes + water layers) | `snippets/purelane-water.liquid` |

Combos, bundle tiers, and reviews are backed by Shopify metaobjects rather than hardcoded blocks, so a marketing person can add content from Content → Metaobjects without opening the theme editor.

## Setup

1. Shopify Partner account + dev store, clean Dawn install.
2. Seed at least 8 products, including one sold out, one with no image, and one with a long title.
3. Provision the custom data model — three metaobject types (`combo`, `bundle_tier`, `review`) and three product metafields (`custom.rating`, `custom.review_count`, `custom.badge`):
   ```bash
   cp .env.example .env   # fill in your store domain + Admin API token
   node scripts/provision-shopify-data.mjs --dry-run   # review first
   node scripts/provision-shopify-data.mjs             # apply
   ```
   Full field spec: `scripts/shopify-data-model.json`.
4. Add `combo` / `bundle_tier` / `review` entries in Content → Metaobjects, referencing your seeded products.
5. `shopify theme dev` to preview locally, or push straight to the dev store.

## Stack

Shopify Liquid, Dawn v16 theme architecture, Shopify Admin API (metaobject/metafield provisioning).
