import test from 'node:test';
import assert from 'node:assert/strict';
import { liveSkipReason, loadSchemaPackage, testPatternsLive } from '../../../../../test-helpers/live-client.js';
import { assertNoIncidentFields, assertOnlySupportedRootKeys, cloneJson } from '../../../../../test-helpers/schema-assertions.js';

const pkg = await loadSchemaPackage(import.meta.url, {
  schema: 'zabbix-slack-default.json',
});
const trustedProblem = await loadSchemaPackage(import.meta.url, {
  schema: 'zabbix-slack-default.json',
  fixture: 'fixtures/trusted-sources/zabbix-release-7.4/trigger-problem-alarm-mode.json',
});
const trustedResolve = await loadSchemaPackage(import.meta.url, {
  schema: 'zabbix-slack-default.json',
  fixture: 'fixtures/trusted-sources/zabbix-release-7.4/trigger-resolve-alarm-mode-update.json',
});
const schemaContent = pkg.schema;

await test('keeps incident variables inside lifecycle mappings only', () => {
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

  assertNoIncidentFields(schemaContent);
  assert.strictEqual(schemaContent.proxy_recurrent_alerts, false);
  assert.deepStrictEqual(schemaContent.fingerprint_fields, ['channel', 'event_id', 'title', 'status']);
  assert.strictEqual(schemaContent.ack_mapping.title, 'title');
  assert.strictEqual(schemaContent.ack_mapping.ack_link, 'attachments[0].title_link');
  assert.strictEqual(schemaContent.ack_mapping.unack_link, 'source');
  assert.strictEqual(schemaContent.ack_mapping.fallback_title, 'attachments[0].fallback');
  assert.strictEqual(schemaContent.resolution_mapping.status, 'status');
  assert.strictEqual(schemaContent.resolution_mapping.resolve_link, 'labels.__alert_resolve_link__');
  assert.strictEqual(schemaContent.resolution_mapping.fallback_title, 'attachments[0].fallback');
});

await test('parses the full sample payload through the live API', { skip: liveSkipReason() }, async () => {
  const result = await testPatternsLive({ schema: schemaContent, payload: schemaContent.sample });
  const extracted = result.data.finalExtractedData;

  assert.equal(result.success, true);
  assert.strictEqual(extracted.title, 'Problem: CPU utilization too high on checkout-api');
  assert.strictEqual(extracted.status.toLowerCase(), 'problem');
  assert.strictEqual(extracted.summary, 'CPU utilization too high on checkout-api');
  assert.strictEqual(extracted.priority, 'High');
  assert.strictEqual(extracted.value, 'avg cpu=93.2%');
  assert.strictEqual(extracted.event_id, '13579');
  assert.strictEqual(extracted.source, 'https://zabbix.example.com/tr_events.php?triggerid=24680&eventid=13579');
  assert.ok(extracted.message.includes('Problem started at'));
  assert.ok(extracted.description.includes('Host: checkout-api-01'));
  assert.strictEqual(extracted.labels.Host, 'checkout-api-01');
  assert.strictEqual(extracted.labels.Severity, 'High');
});

await test('parses trusted problem and resolved fixtures through the live API', { skip: liveSkipReason() }, async () => {
  let result = await testPatternsLive({ schema: schemaContent, payload: trustedProblem.fixture });
  let extracted = result.data.finalExtractedData;
  assert.strictEqual(extracted.status, 'Problem');
  assert.strictEqual(extracted.priority, 'High');
  assert.strictEqual(extracted.labels['Problem name'], 'CPU utilization too high on checkout-api');

  result = await testPatternsLive({ schema: schemaContent, payload: trustedResolve.fixture });
  extracted = result.data.finalExtractedData;
  assert.strictEqual(extracted.status, 'Resolved');
  assert.strictEqual(extracted.value, undefined);
  assert.strictEqual(extracted.event_id, '13579');

  result = await testPatternsLive({
    schema: { patterns: schemaContent.resolution_patterns },
    payload: trustedResolve.fixture,
  });
  assert.strictEqual(result.data.finalExtractedData.status, 'Resolved');
});

await test('preserves labels with spaces and URL values through the live API', { skip: liveSkipReason() }, async () => {
  const payload = cloneJson(schemaContent.sample);
  payload.attachments[0].text = 'Problem started at 10:00:00 on 2026-05-14\nProblem name: Disk pressure\nHost: db-01\nSeverity: Disaster\nOperational data: disk=98%\nRunbook URL: https://runbooks.example.com/db/disk\nOriginal problem ID: 24680';

  const result = await testPatternsLive({ schema: schemaContent, payload });
  const extracted = result.data.finalExtractedData;

  assert.strictEqual(extracted.labels['Runbook URL'], 'https://runbooks.example.com/db/disk');
  assert.strictEqual(extracted.labels.Host, 'db-01');
  assert.strictEqual(extracted.priority, 'Disaster');
});
