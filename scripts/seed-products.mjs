#!/usr/bin/env node
/**
 * Seeds 8 Purelane-fitting products via the Admin API, matching the
 * prototype's own product line (purelane-homepage.html's "full range" strip
 * and shop cards). Includes the 3 required edge cases: one sold out, one
 * with a deliberately long title (all start with no image, satisfying that
 * case too, real photography being a client asset nobody fabricates).
 *
 * Also sets the 3 custom.* metafields (rating, review_count, badge) this
 * theme's card snippet reads, so the shop grid renders fully once run.
 *
 * Usage: node scripts/seed-products.mjs   (needs .env, see .env.example)
 */

import { readFileSync, existsSync } from 'node:fs';
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

const PRODUCTS = [
  { title: 'Tap Cleaner & Limescale Remover', badge: 'Best seller', rating: 4.8, reviews: 237 },
  { title: 'Foaming Kitchen Cleaner', badge: 'Best seller', rating: 4.8, reviews: 254 },
  { title: 'Copper, Bronze & Brass Cleaner', badge: 'Top rated', rating: 4.8, reviews: 231 },
  {
    title: 'Washing Machine Cleaner & Descaler',
    badge: 'New',
    rating: 4.8,
    reviews: 183,
    soldOut: true,
  },
  { title: 'Non-Toxic Toilet Cleaner', badge: 'Best seller', rating: 4.8, reviews: 198 },
  { title: 'Natural Herbal Floor Cleaner', badge: 'Top rated', rating: 4.8, reviews: 176 },
  {
    title: 'Concentrated Multi-Surface Plant-Based Kitchen Degreaser & Foaming Cleaner Spray, Made For Tough Grease And Everyday Stains',
    badge: '',
    rating: 4.7,
    reviews: 42,
  },
  { title: 'Gentle Hydrating Liquid Handwash', badge: 'Best seller', rating: 4.8, reviews: 212 },
];

async function getLocationId() {
  const data = await gql(`{ locations(first: 1) { edges { node { id } } } }`);
  return data.locations.edges[0].node.id;
}

async function createProduct(p, locationId) {
  const input = {
    title: p.title,
    descriptionHtml: `<p>${p.title}, plant-based and non-toxic. Free shipping across India.</p>`,
    status: 'ACTIVE',
    productOptions: [{ name: 'Title', values: [{ name: 'Default Title' }] }],
    variants: [
      {
        price: '200.00',
        compareAtPrice: '299.00',
        inventoryPolicy: p.soldOut ? 'DENY' : 'CONTINUE',
        optionValues: [{ optionName: 'Title', name: 'Default Title' }],
        inventoryItem: { tracked: true },
      },
    ],
  };
  const setData = await gql(
    `mutation($input: ProductSetInput!) {
      productSet(input: $input, synchronous: true) {
        product { id title variants(first: 1) { edges { node { id inventoryItem { id } } } } }
        userErrors { field message }
      }
    }`,
    { input }
  );
  const { product, userErrors } = setData.productSet;
  if (userErrors.length) throw new Error(JSON.stringify(userErrors));
  const inventoryItemId = product.variants.edges[0].node.inventoryItem.id;

  await gql(
    `mutation($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) { userErrors { field message } }
    }`,
    {
      input: {
        name: 'available',
        reason: 'correction',
        quantities: [{ inventoryItemId, locationId, quantity: p.soldOut ? 0 : 50 }],
      },
    }
  );

  const metafields = [
    { ownerId: product.id, namespace: 'custom', key: 'rating', type: 'number_decimal', value: String(p.rating) },
    { ownerId: product.id, namespace: 'custom', key: 'review_count', type: 'number_integer', value: String(p.reviews) },
  ];
  if (p.badge) {
    metafields.push({ ownerId: product.id, namespace: 'custom', key: 'badge', type: 'single_line_text_field', value: p.badge });
  }
  await gql(
    `mutation($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) { userErrors { field message } }
    }`,
    { metafields }
  );

  return product;
}

async function main() {
  console.log(`Seeding products on ${STORE}...`);
  const locationId = await getLocationId();
  for (const p of PRODUCTS) {
    process.stdout.write(`  ${p.title.slice(0, 60)}... `);
    try {
      const product = await createProduct(p, locationId);
      console.log('OK', product.id);
    } catch (err) {
      console.log('FAILED');
      console.error('   ', err.message);
    }
  }
  console.log('\nDone. All 8 have no image (real photography is a client asset) — one of them satisfies the "no image" case by definition. One sold out (Washing Machine Cleaner), one has a deliberately long title (the kitchen degreaser).');
}

main().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
