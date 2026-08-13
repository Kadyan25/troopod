#!/usr/bin/env node
/**
 * One-shot provisioner for the metafield/metaobject definitions this theme
 * depends on (see shopify-data-model.json). Run once per store, before
 * populating combo/bundle_tier/review content or the product rating/badge
 * metafields in the admin.
 *
 * Why this exists: metaobject/metafield definitions have no representation
 * in theme code — they only exist as store config, normally created by
 * clicking through Settings > Custom data one field at a time. This script
 * makes that step scriptable and repeatable instead, which matters if this
 * build gets repeated across client stores.
 *
 * Usage:
 *   1. Create a private/custom app in the dev store's admin
 *      (Settings > Apps > Develop apps) with these Admin API scopes:
 *      write_products, read_products, write_metaobjects, read_metaobjects,
 *      write_metaobject_definitions, read_metaobject_definitions.
 *   2. Copy .env.example to .env, fill in the store domain and the app's
 *      Admin API access token. Never commit .env (it's gitignored).
 *   3. node scripts/provision-shopify-data.mjs --dry-run   (review first)
 *      node scripts/provision-shopify-data.mjs             (apply)
 *
 * Zero dependencies — Node 18+'s built-in fetch is enough for this.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_VERSION = '2025-07';
const DRY_RUN = process.argv.includes('--dry-run');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
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
  console.error('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN.');
  console.error('Copy .env.example to .env and fill both in, then re-run.');
  process.exit(1);
}

const ENDPOINT = `https://${STORE}/admin/api/${API_VERSION}/graphql.json`;

async function gql(query, variables) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

const METAFIELD_DEFINITION_CREATE = `
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition { id name namespace key }
      userErrors { field message code }
    }
  }
`;

const METAOBJECT_DEFINITION_CREATE = `
  mutation CreateMetaobjectDefinition($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition { id type name }
      userErrors { field message code }
    }
  }
`;

function alreadyExists(userErrors) {
  return userErrors.some((e) => e.code === 'TAKEN' || /already exists/i.test(e.message));
}

async function provisionProductMetafields(defs) {
  for (const def of defs) {
    const input = {
      name: def.name,
      namespace: def.namespace,
      key: def.key,
      description: def.description,
      type: def.type,
      ownerType: 'PRODUCT',
    };
    console.log(`\nmetafield  custom.${def.key} (${def.type})`);
    if (DRY_RUN) {
      console.log('  [dry-run] would create:', JSON.stringify(input));
      continue;
    }
    const data = await gql(METAFIELD_DEFINITION_CREATE, { definition: input });
    const { createdDefinition, userErrors } = data.metafieldDefinitionCreate;
    if (createdDefinition) {
      console.log('  created:', createdDefinition.id);
    } else if (alreadyExists(userErrors)) {
      console.log('  already exists, skipping');
    } else {
      console.log('  FAILED:', userErrors);
    }
  }
}

async function provisionMetaobjects(defs) {
  for (const def of defs) {
    const input = {
      type: def.type,
      name: def.name,
      fieldDefinitions: def.fieldDefinitions.map((f) => ({
        key: f.key,
        name: f.name,
        type: f.type,
        required: !!f.required,
        description: f.description,
        validations: f.validations || [],
      })),
    };
    console.log(`\nmetaobject ${def.type} (${def.fieldDefinitions.length} fields)`);
    if (DRY_RUN) {
      console.log('  [dry-run] would create:', JSON.stringify(input, null, 2));
      continue;
    }
    const data = await gql(METAOBJECT_DEFINITION_CREATE, { definition: input });
    const { metaobjectDefinition, userErrors } = data.metaobjectDefinitionCreate;
    if (metaobjectDefinition) {
      console.log('  created:', metaobjectDefinition.id);
    } else if (alreadyExists(userErrors)) {
      console.log('  already exists, skipping');
    } else {
      console.log('  FAILED:', userErrors);
    }
  }
}

async function main() {
  const manifestPath = path.join(__dirname, 'shopify-data-model.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  console.log(`Provisioning against ${STORE} (API ${API_VERSION})${DRY_RUN ? ' — DRY RUN' : ''}`);

  await provisionProductMetafields(manifest.product_metafields);
  await provisionMetaobjects(manifest.metaobjects);

  console.log('\nDone. Next: add combo / bundle_tier / review entries in Content > Metaobjects, and set the three custom.* fields on each product.');
}

main().catch((err) => {
  console.error('\nProvisioning failed:', err.message);
  process.exit(1);
});
