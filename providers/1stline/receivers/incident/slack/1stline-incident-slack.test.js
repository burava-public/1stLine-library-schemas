import test from 'node:test';
import assert from 'node:assert/strict';
import { liveSkipReason, loadSchemaPackage, testPatternsLive } from '../../../../../test-helpers/live-client.js';
import {
  assertHasFields,
  assertLacksFields,
  assertOnlySupportedRootKeys,
  cloneJson,
  fieldMap,
} from '../../../../../test-helpers/schema-assertions.js';

const pkg = await loadSchemaPackage(import.meta.url, {
  schema: '1stline-incident-slack.json',
});
const schemaContent = pkg.schema;

await test('defines Slack fields plus internal incident metadata', () => {
  const fieldsByName = fieldMap(schemaContent);

  assertHasFields(fieldsByName, [
    'username',
    'attachments',
    'attachments[0].title',
    'attachments[0].title_link',
    'attachments[0].text',
    'attachments[0].fallback',
    'attachments[0].footer',
    'attachments[0].color',
    'attachments[0].ts',
    'incident_uid',
    'title',
    'priority',
    'description',
    'labels',
    'labels.*',
    'incident_link',
    'source_alert_instance_uid',
  ]);

  assertLacksFields(fieldsByName, ['attachments[0].footer_icon', 'incident.event.type', 'status']);

  assert.strictEqual(fieldsByName.get('incident_uid').defaultValue, 'incident-9f1b9a2e-3d42-4c1e-8e15-4d4f5f45a111');
  assert.strictEqual(fieldsByName.get('title').defaultValue, 'Incident: New database write failure');
  assert.strictEqual(fieldsByName.get('priority').defaultValue, 'P3');
  assert.strictEqual(fieldsByName.get('description').defaultValue, '');
  assert.deepStrictEqual(fieldsByName.get('labels').defaultValue, {});
  assert.strictEqual(fieldsByName.get('incident_link').defaultValue, '');
  assert.strictEqual(fieldsByName.get('source_alert_instance_uid').defaultValue, '');
});

await test('uses a readable Slack attachment payload without top-level internal fields', () => {
  const { sample } = schemaContent;

  assert.strictEqual(sample.username, '1stLine by example');
  assert.ok(!Object.prototype.hasOwnProperty.call(sample, 'incident_uid'));
  assert.ok(!Object.prototype.hasOwnProperty.call(sample, 'source_alert_instance_uid'));
  assert.ok(!Object.prototype.hasOwnProperty.call(sample, 'blocks'));
  assert.ok(Array.isArray(sample.attachments));
  assert.strictEqual(sample.attachments.length, 1);
  assert.ok(!Object.prototype.hasOwnProperty.call(sample, 'text'));

  const attachment = sample.attachments[0];
  assert.deepStrictEqual(Object.keys(attachment).sort(), [
    'color',
    'fallback',
    'footer',
    'text',
    'title',
    'title_link',
    'ts',
  ].sort());
  assert.strictEqual(attachment.title, 'Incident: Database write failures');
  assert.strictEqual(attachment.title_link, 'https://1stline.example.test/incidents/incident-9f1b9a2e-3d42-4c1e-8e15-4d4f5f45a111');
  assert.strictEqual(attachment.fallback, 'Incident: Database write failures');
  assert.strictEqual(attachment.footer, '1stLine incident');
  assert.strictEqual(attachment.color, '#D63232');
  assert.strictEqual(attachment.ts, 1766778140);
  assert.strictEqual(
    attachment.text,
    '*Event:* created\n*Priority:* P1\n*Description:* Database writes are timing out on the primary cluster.\n*Labels:* infra=example, env=prod'
  );
  assert.ok(!attachment.text.includes('*Source alert:*'));
});

await test('keeps lifecycle-safe mappings and only supported root keys', () => {
  assertOnlySupportedRootKeys(
    schemaContent,
    new Set([
      'fields',
      'sample',
      'patterns',
      'ack_mapping',
      'allow_guest_ack',
      'resolution_patterns',
      'resolution_mapping',
      'incident_lifecycle_mapping',
      'default_forward_to',
      'resolution_proxy_config',
      'proxy_recurrent_alerts',
      'fingerprint_fields',
    ])
  );

  assert.deepStrictEqual(schemaContent.fingerprint_fields, ['incident_uid']);
  assert.strictEqual(schemaContent.proxy_recurrent_alerts, false);
  assert.strictEqual(schemaContent.resolution_proxy_config, 'none');
  assert.strictEqual(schemaContent.ack_mapping, null);
  assert.strictEqual(schemaContent.resolution_mapping, null);
  assert.deepStrictEqual(schemaContent.resolution_patterns, []);

  const patternsByName = new Map(schemaContent.patterns.map((pattern) => [pattern.name, pattern]));
  for (const patternName of [
    'incident_uid',
    'title',
    'priority',
    'description',
    'labels',
    'incident_link',
    'source_alert_instance_uid',
  ]) {
    assert.ok(patternsByName.has(patternName), `${patternName} pattern is missing`);
  }

  const lifecycle = schemaContent.incident_lifecycle_mapping;
  for (const stage of ['created', 'resolved', 'closed', 'reopened']) {
    assert.ok(lifecycle[stage], `${stage} lifecycle mapping is missing`);
    assert.strictEqual(lifecycle[stage].title, 'title');
    assert.strictEqual(lifecycle[stage].description, 'description');
    assert.strictEqual(lifecycle[stage].incident_link, 'incident_link');
    assert.strictEqual(lifecycle[stage].send_alert, true);
    assert.strictEqual(typeof lifecycle[stage].register_alert, 'boolean');
    const expectedOverrideKeys = lifecycle[stage].register_alert
      ? ['attachments[0].color', 'attachments[0].fallback', 'incident_labels_json', 'priority']
      : ['attachments[0].color', 'attachments[0].fallback'];
    assert.deepStrictEqual(Object.keys(lifecycle[stage].overrides).sort(), expectedOverrideKeys.sort());
    assert.strictEqual(lifecycle[stage].overrides['attachments[0].fallback'], '${incident.event.type}: ${incident.title}');
  }

  assert.strictEqual(lifecycle.created.register_alert, true);
  assert.strictEqual(lifecycle.resolved.register_alert, false);
  assert.strictEqual(lifecycle.closed.register_alert, false);
  assert.strictEqual(lifecycle.reopened.register_alert, false);
  assert.strictEqual(lifecycle.created.overrides['attachments[0].color'], '#D63232');
  assert.strictEqual(lifecycle.resolved.overrides['attachments[0].color'], '#33cc33');
  assert.strictEqual(lifecycle.closed.overrides['attachments[0].color'], '#808080');
  assert.strictEqual(lifecycle.reopened.overrides['attachments[0].color'], '#D63232');
});

await test('extracts internal incident IDs, attachment fields, and passthrough labels through the live API', { skip: liveSkipReason() }, async () => {
  const payload = cloneJson(schemaContent.sample);
  payload.attachments[0].text = '*Event:* created\n*Priority:* P1\n*Description:* Database writes are timing out on the primary cluster.\n*Labels:* service=database, region=us-east-1, owner=payments\n*Source alert:* alert-instance-42';

  const result = await testPatternsLive({
    schema: schemaContent,
    payload,
  });

  assert.equal(result.success, true);
  assert.deepStrictEqual(result.data.finalExtractedData, {
    incident_uid: 'incident-9f1b9a2e-3d42-4c1e-8e15-4d4f5f45a111',
    title: 'Incident: Database write failures',
    priority: 'P1',
    description: 'Database writes are timing out on the primary cluster.',
    labels: {
      service: 'database',
      region: 'us-east-1',
      owner: 'payments',
    },
    incident_link: 'https://1stline.example.test/incidents/incident-9f1b9a2e-3d42-4c1e-8e15-4d4f5f45a111',
    source_alert_instance_uid: 'alert-instance-42',
  });
});

await test('keeps empty incident descriptions empty through the live API', { skip: liveSkipReason() }, async () => {
  const payload = cloneJson(schemaContent.sample);
  payload.attachments[0].text = '*Description:*';

  const result = await testPatternsLive({
    schema: { patterns: [schemaContent.patterns.find((pattern) => pattern.name === 'description')] },
    payload,
  });

  assert.equal(result.success, true);
  assert.strictEqual(result.data.finalExtractedData.description, '');
});
