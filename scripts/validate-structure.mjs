import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const bannedContentPatterns = [
  { pattern: /localhost(?::\d+)?/i, reason: 'localhost reference' },
  { pattern: /127\.0\.0\.1/, reason: 'loopback host reference' },
  { pattern: /X-Internal-Token/, reason: 'internal token reference' },
  { pattern: /@[A-Za-z0-9.-]+\.(com|io|dev|org)\b/i, reason: 'real email address' }
];

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

async function walk(currentDir, visitor) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) await walk(fullPath, visitor);
    else await visitor(fullPath);
  }
}

const schemaDirs = [];
await walk(repoRoot, async (filePath) => {
  if (path.basename(filePath) === 'schema.meta.json') {
    schemaDirs.push(path.dirname(filePath));
  }
});

const seenUids = new Map();
for (const schemaDir of schemaDirs.sort()) {
  const metaPath = path.join(schemaDir, 'schema.meta.json');
  const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
  const requiredMetaKeys = ['uid', 'name', 'description', 'tags', 'producer', 'receiver', 'variant', 'visibility'];
  for (const key of requiredMetaKeys) {
    if (!(key in meta)) fail(`${path.relative(repoRoot, metaPath)} is missing ${key}`);
  }
  if (!Array.isArray(meta.tags)) fail(`${path.relative(repoRoot, metaPath)} tags must be an array`);
  if (meta.visibility !== 'public') fail(`${path.relative(repoRoot, metaPath)} visibility must be public`);
  if (seenUids.has(meta.uid)) fail(`Duplicate schema uid ${meta.uid} in ${path.relative(repoRoot, schemaDir)} and ${seenUids.get(meta.uid)}`);
  seenUids.set(meta.uid, path.relative(repoRoot, schemaDir));

  const schemaPath = path.join(schemaDir, `${meta.producer}-${meta.receiver}-${meta.variant}.json`);
  const readmePath = path.join(schemaDir, 'README.md');
  const packageYamlPath = path.join(schemaDir, 'package.yaml');
  const testPath = path.join(schemaDir, `${meta.producer}-${meta.receiver}-${meta.variant}.test.js`);

  for (const requiredPath of [schemaPath, readmePath, packageYamlPath, testPath]) {
    try {
      await fs.access(requiredPath);
    } catch {
      fail(`Missing required file ${path.relative(repoRoot, requiredPath)}`);
    }
  }

  const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
  if (!Array.isArray(schema.fields)) fail(`${path.relative(repoRoot, schemaPath)} fields must be an array`);
  if (schema.default_forward_to !== undefined && schema.default_forward_to !== null) {
    fail(`${path.relative(repoRoot, schemaPath)} must not set default_forward_to`);
  }

  await walk(schemaDir, async (filePath) => {
    const text = await fs.readFile(filePath, 'utf8');
    for (const banned of bannedContentPatterns) {
      if (banned.pattern.test(text)) {
        fail(`${path.relative(repoRoot, filePath)} contains banned ${banned.reason}`);
      }
    }
    if (filePath.endsWith('.json')) {
      JSON.parse(text);
    }
  });
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`Validated ${schemaDirs.length} schema packages.`);
