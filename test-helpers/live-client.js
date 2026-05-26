import assert from 'node:assert/strict';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_ENV_VARS = ['FIRSTLINE_BASE_URL', 'FIRSTLINE_TOKEN', 'FIRSTLINE_ORG_UID'];
const repoEnvPath = path.resolve(process.cwd(), '.env');

loadDotEnv(repoEnvPath);

function loadDotEnv(envPath) {
  if (!fsSync.existsSync(envPath)) {
    return;
  }

  const content = fsSync.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const normalizedLine = line.startsWith('export ') ? line.slice(7).trim() : line;
    const separatorIndex = normalizedLine.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = normalizedLine.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith('\'') && value.endsWith('\''))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

export function missingLiveEnvVars() {
  return REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
}

export function liveSkipReason() {
  const missing = missingLiveEnvVars();
  return missing.length === 0
    ? undefined
    : `Set ${missing.join(', ')} to run live schema validation tests.`;
}

async function readJson(jsonPath) {
  return JSON.parse(await fs.readFile(jsonPath, 'utf8'));
}

export async function loadSchemaPackage(importMetaUrl, options = {}) {
  const packageDir = path.dirname(fileURLToPath(importMetaUrl));
  const schemaPath = path.join(packageDir, options.schema ?? `${path.basename(packageDir)}.json`);
  const fixturePath = options.fixture ? path.join(packageDir, options.fixture) : null;
  const metaPath = path.join(packageDir, 'schema.meta.json');

  const schema = await readJson(schemaPath);
  const meta = await readJson(metaPath);
  const fixture = fixturePath ? await readJson(fixturePath) : structuredClone(schema.sample);

  return {
    packageDir,
    schemaPath,
    meta,
    schema,
    fixture
  };
}

async function postJson(endpointPath, body) {
  const baseUrl = process.env.FIRSTLINE_BASE_URL;
  const token = process.env.FIRSTLINE_TOKEN;
  const orgUid = process.env.FIRSTLINE_ORG_UID;
  assert(baseUrl, 'FIRSTLINE_BASE_URL is required');
  assert(token, 'FIRSTLINE_TOKEN is required');
  assert(orgUid, 'FIRSTLINE_ORG_UID is required');

  const url = new URL(endpointPath, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  url.searchParams.set('org_uid', orgUid);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok || !json?.success) {
    throw new Error(`Live validation failed for ${url.pathname}: ${response.status} ${text}`);
  }

  return json;
}

export async function testPatternsLive({ schema, payload }) {
  return postJson('test-patterns', {
    patterns: schema.patterns ?? [],
    testPayload: payload
  });
}

export async function testTransformationLive({ schema, payload }) {
  return postJson('test-transformation-template', {
    transformation_template: schema.transformation_template,
    patterns: schema.patterns ?? [],
    testPayload: payload,
    ack_mapping: schema.ack_mapping ?? null,
    resolution_mapping: schema.resolution_mapping ?? null
  });
}
