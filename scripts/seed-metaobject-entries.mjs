#!/usr/bin/env node
/**
 * Seeds the combo / bundle_tier / review metaobject ENTRIES that the Combos,
 * Bundles and Reviews sections render. provision-shopify-data.mjs creates the
 * definitions (the shape); this creates the content that fills them, so the
 * three sections show something other than their empty states on a fresh store.
 *
 * Content follows the prototype (purelane-homepage.html #combos / #bundles /
 * #reviews). Combo and tier product references point at the real seeded
 * products, so nothing here is a hardcoded string pretending to be a product.
 *
 * Money fields are stamped with the shop's live currency, read at runtime — a
 * `money` metafield is rejected if its currency doesn't match the shop's. If
 * the store currency changes later, re-run this script.
 *
 * Re-runnable: entries are keyed by handle and updated in place if they exist.
 *
 * Scopes: write_metaobjects, read_metaobjects, read_metaobject_definitions,
 *         read_products
 *
 * Usage: node scripts/seed-metaobject-entries.mjs   (needs .env, see .env.example)
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_VERSION = '2025-07';

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const STORE = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
if (!STORE || !TOKEN) {
  console.error('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN in .env');
  process.exit(1);
}
const ENDPOINT = `https://${STORE}/admin/api/${API_VERSION}/graphql.json`;

async function gql(query, variables) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

const CONTEXT = await gql(`{
  shop { currencyCode }
  collectionByHandle(handle: "purelane") { products(first: 50) { nodes { id handle } } }
  metaobjectDefinitions(first: 20) { nodes { type capabilities { publishable { enabled } } } }
}`);

const CURRENCY = CONTEXT.shop.currencyCode;
const P = Object.fromEntries(CONTEXT.collectionByHandle.products.nodes.map((n) => [n.handle, n.id]));
const PUBLISHABLE = Object.fromEntries(
  CONTEXT.metaobjectDefinitions.nodes.map((n) => [n.type, n.capabilities?.publishable?.enabled === true])
);

const HANDWASH = P['gentle-hydrating-liquid-handwash'];
const DEGREASER = P['concentrated-multi-surface-plant-based-kitchen-degreaser-foaming-cleaner-spray-made-for-tough-grease-and-everyday-stains'];
const FLOOR = P['natural-herbal-floor-cleaner'];
const TOILET = P['non-toxic-toilet-cleaner'];
const MACHINE = P['washing-machine-cleaner-descaler'];
const BRASS = P['copper-bronze-brass-cleaner'];
const KITCHEN = P['foaming-kitchen-cleaner'];
const TAP = P['tap-cleaner-limescale-remover'];

const missing = Object.entries({ HANDWASH, DEGREASER, FLOOR, TOILET, MACHINE, BRASS, KITCHEN, TAP })
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  console.error(`Products not found in the "purelane" collection: ${missing.join(', ')}`);
  console.error('Run scripts/seed-products.mjs first.');
  process.exit(1);
}

const money = (amount) => JSON.stringify({ amount: String(amount), currency_code: CURRENCY });
const list = (arr) => JSON.stringify(arr);

// The sold-out product (MACHINE) is deliberately kept out of every combo:
// combo "Shop bundle" adds each product to the cart, and an out-of-stock line
// would fail the whole request. It still appears as a bundle-tier thumbnail,
// which is display-only, so that edge case stays covered.
const ENTRIES = [
  ...[
    {
      handle: 'kitchen-essentials',
      title: 'Kitchen essentials',
      products: [KITCHEN, DEGREASER, TAP],
      item_captions: ['Cuts grease instantly', 'Tackles baked-on grease', 'Melts hard water stains'],
      price: 499,
      compare_at_price: 897,
      savings_label: 'You save 398',
      flag: 'Most popular',
      description:
        'Includes: Foaming Kitchen Cleaner, Multi-Surface Degreaser & Tap Cleaner. Everything for a sparkling kitchen, no need to pick separately.',
      featured: false,
    },
    {
      handle: 'bathroom-deep-clean',
      title: 'Bathroom deep clean',
      products: [TOILET, TAP, HANDWASH],
      item_captions: ['Kills 99.9% germs', 'Melts hard water stains', 'Gentle hydration for hands'],
      price: 499,
      compare_at_price: 897,
      savings_label: 'You save 398',
      flag: '',
      description: 'Includes: Toilet Cleaner, Tap Cleaner & Handwash. A complete bathroom refresh in one box.',
      featured: false,
    },
    {
      handle: 'complete-home-bundle',
      title: 'Complete home bundle',
      products: [KITCHEN, FLOOR, HANDWASH],
      item_captions: ['Cuts grease instantly', 'Kills 99.9% germs', 'Gentle hydration for hands'],
      price: 799,
      compare_at_price: 1495,
      savings_label: 'Biggest saving',
      flag: 'Best value',
      description:
        'Includes: Kitchen Cleaner, Floor Cleaner & Handwash. Our biggest saving box, covering every room.',
      featured: true,
    },
    {
      handle: 'hard-water-solution-kit',
      title: 'Hard water solution kit',
      products: [TAP, TOILET],
      item_captions: ['Melts hard water stains', 'Fights limescale in the bowl'],
      price: 349,
      compare_at_price: 598,
      savings_label: 'You save 249',
      flag: '',
      description: 'Includes: Tap Cleaner & Toilet Cleaner. A quick, focused fix for hard water stains across the home.',
      featured: false,
    },
    {
      handle: 'shine-and-polish-kit',
      title: 'Shine and polish kit',
      products: [BRASS, FLOOR],
      item_captions: ['Brings back the shine', 'Kills 99.9% germs'],
      price: 349,
      compare_at_price: 598,
      savings_label: 'You save 249',
      flag: '',
      description: 'Includes: Copper, Bronze & Brass Cleaner and Floor Cleaner. For the surfaces guests actually notice.',
      featured: false,
    },
  ].map((c) => ({
    type: 'combo',
    handle: c.handle,
    fields: [
      { key: 'title', value: c.title },
      { key: 'products', value: list(c.products) },
      { key: 'item_captions', value: list(c.item_captions) },
      { key: 'price', value: money(c.price) },
      { key: 'compare_at_price', value: money(c.compare_at_price) },
      { key: 'savings_label', value: c.savings_label },
      { key: 'flag', value: c.flag },
      { key: 'description', value: c.description },
      { key: 'featured', value: String(c.featured) },
    ],
  })),

  ...[
    {
      handle: 'tier-starter',
      tag: 'Starter',
      product_count: 2,
      price: 349,
      compare_at_price: 598,
      features: ['Pick any two products', 'Free shipping across India'],
      sample_products: [TAP, KITCHEN],
      featured: false,
      cta_label: 'Build this box',
    },
    {
      handle: 'tier-most-popular',
      tag: 'Most popular',
      product_count: 3,
      price: 499,
      compare_at_price: 897,
      features: ['Pick any three products', 'Covers kitchen and laundry', 'Free shipping across India'],
      sample_products: [KITCHEN, TAP, DEGREASER],
      featured: true,
      cta_label: 'Build this box',
    },
    {
      handle: 'tier-whole-home',
      tag: 'Whole home',
      product_count: 5,
      price: 799,
      compare_at_price: 1495,
      features: ['Pick any five products', 'Every room in one order', 'Free shipping across India'],
      sample_products: [KITCHEN, TAP, FLOOR, TOILET, MACHINE],
      featured: false,
      cta_label: 'Build this box',
    },
  ].map((t) => ({
    type: 'bundle_tier',
    handle: t.handle,
    fields: [
      { key: 'tag', value: t.tag },
      { key: 'product_count', value: String(t.product_count) },
      { key: 'price', value: money(t.price) },
      { key: 'compare_at_price', value: money(t.compare_at_price) },
      { key: 'features', value: list(t.features) },
      { key: 'sample_products', value: list(t.sample_products) },
      { key: 'featured', value: String(t.featured) },
      { key: 'cta_label', value: t.cta_label },
    ],
  })),

  ...[
    {
      handle: 'review-anita',
      stars: 5,
      headline: 'Works like a charm',
      body: 'Finally an eco option that cleans as well as the chemical detergent I used for years, and it smells better.',
      author_name: 'Anita',
      product_label: 'Laundry detergent',
    },
    {
      handle: 'review-priya',
      stars: 5,
      headline: 'Best dishwash ever',
      body: 'Our old dishwash left my help with dry, cracked skin. That stopped completely after we switched.',
      author_name: 'Priya',
      product_label: 'Dishwash gel',
    },
    {
      handle: 'review-sunita',
      stars: 5,
      headline: 'Great product, great packaging',
      body: 'Very soft on hands with a lovely fragrance, and it feels good to be using far less plastic.',
      author_name: 'Sunita',
      product_label: 'Liquid handwash',
    },
    {
      handle: 'review-rohit',
      stars: 5,
      headline: 'Dog friendly',
      body: "We switched because chemical floor cleaners were setting off my dog's allergies. No reactions since.",
      author_name: 'Rohit S.',
      product_label: 'Floor cleaner',
    },
    {
      handle: 'review-verified-buyer',
      stars: 5,
      headline: 'Sparkling taps again',
      body: 'Hard water had ruined our bathroom fittings. Two sprays and the scale wipes straight off, no scrubbing.',
      author_name: 'Verified buyer',
      product_label: 'Tap cleaner',
    },
  ].map((r) => ({
    type: 'review',
    handle: r.handle,
    fields: [
      { key: 'stars', value: String(r.stars) },
      { key: 'headline', value: r.headline },
      { key: 'body', value: r.body },
      { key: 'author_name', value: r.author_name },
      { key: 'product_label', value: r.product_label },
    ],
  })),
];

const BY_HANDLE = `query ($handle: MetaobjectHandleInput!) {
  metaobjectByHandle(handle: $handle) { id }
}`;

const CREATE = `mutation ($metaobject: MetaobjectCreateInput!) {
  metaobjectCreate(metaobject: $metaobject) {
    metaobject { id type handle }
    userErrors { field message code }
  }
}`;

const UPDATE = `mutation ($id: ID!, $metaobject: MetaobjectUpdateInput!) {
  metaobjectUpdate(id: $id, metaobject: $metaobject) {
    metaobject { id type handle }
    userErrors { field message code }
  }
}`;

const created = {};

for (const entry of ENTRIES) {
  // Drop empty optional fields rather than writing empty strings into them.
  const fields = entry.fields.filter((f) => f.value !== '' && f.value != null);
  const capabilities = PUBLISHABLE[entry.type] ? { publishable: { status: 'ACTIVE' } } : undefined;

  const existing = await gql(BY_HANDLE, { handle: { type: entry.type, handle: entry.handle } });
  let result;
  if (existing.metaobjectByHandle) {
    result = await gql(UPDATE, {
      id: existing.metaobjectByHandle.id,
      metaobject: { fields, ...(capabilities ? { capabilities } : {}) },
    });
    result = result.metaobjectUpdate;
  } else {
    result = await gql(CREATE, {
      metaobject: { type: entry.type, handle: entry.handle, fields, ...(capabilities ? { capabilities } : {}) },
    });
    result = result.metaobjectCreate;
  }

  if (result.userErrors.length) {
    console.error(`  ✗ ${entry.type}/${entry.handle}`);
    console.error(JSON.stringify(result.userErrors, null, 2));
    process.exitCode = 1;
    continue;
  }
  const id = result.metaobject.id;
  (created[entry.type] ||= []).push({ handle: entry.handle, id });
  console.log(`  ✓ ${entry.type}/${entry.handle} → ${id}`);
}

const outPath = path.join(__dirname, 'seeded-metaobject-ids.json');
writeFileSync(outPath, JSON.stringify(created, null, 2) + '\n');
console.log(`\nCurrency used for money fields: ${CURRENCY}`);
console.log(`Wrote ${path.relative(path.join(__dirname, '..'), outPath)} — used to wire block references into templates/index.json.`);
