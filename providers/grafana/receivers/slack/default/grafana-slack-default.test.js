import test from 'node:test';
import assert from 'node:assert/strict';
import { liveSkipReason, loadSchemaPackage, testPatternsLive } from '../../../../../test-helpers/live-client.js';
import { assertNoIncidentFields, assertOnlySupportedRootKeys, cloneJson } from '../../../../../test-helpers/schema-assertions.js';

const pkg = await loadSchemaPackage(import.meta.url, {
  schema: 'grafana-slack-default.json',
});
const schemaContent = pkg.schema;

await test('stays pass-through oriented without a transformation template', () => {
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
  assert.strictEqual(schemaContent.transformation_template, undefined);
  assert.ok(schemaContent.ack_mapping);
  assert.ok(schemaContent.resolution_mapping);
  assert.ok(schemaContent.incident_lifecycle_mapping);
  assert.strictEqual(schemaContent.incident_lifecycle_mapping.created.overrides.priority, '${priority}');
  assert.strictEqual(schemaContent.incident_lifecycle_mapping.created.overrides.incident_labels_json, '${labels}');
  assert.strictEqual(schemaContent.incident_lifecycle_mapping.reopened.overrides.priority, '${priority}');
  assert.strictEqual(schemaContent.incident_lifecycle_mapping.reopened.overrides.incident_labels_json, '${labels}');
  assert.strictEqual(schemaContent.resolution_proxy_config, 'initial');
  assert.strictEqual(schemaContent.proxy_recurrent_alerts, false);
  assert.deepStrictEqual(schemaContent.fingerprint_fields, ['labels']);
});

await test('parses the full sanitized sample payload through the live API', { skip: liveSkipReason() }, async () => {
  const result = await testPatternsLive({ schema: schemaContent, payload: schemaContent.sample });
  const extracted = result.data.finalExtractedData;

  assert.equal(result.success, true);
  assert.strictEqual(extracted.value, 'A=1, C=1, prometheus_ready=1, some_hardcoded_query=0.99789656');
  assert.strictEqual(extracted.priority, 'P1');
  assert.ok(extracted.description.includes('This is a multi-line description'));
  assert.ok(extracted.summary.includes('Multiline complex summmary'));
  assert.strictEqual(extracted.source, 'https://grafana.example.test/alerting/grafana/ff8agsdpqd3b4d/view?orgId=1');
  assert.strictEqual(extracted.labels.alertname, 'Complex alert');
  assert.strictEqual(extracted.labels.job, 'prometheus');
});

await test('handles summary and description fallbacks through the live API', { skip: liveSkipReason() }, async () => {
  const summaryOnly = cloneJson(schemaContent.sample);
  summaryOnly.attachments[0].text = 'Annotations:\n - summary = Only summary here\nSource: https://grafana.example.test/source';
  let result = await testPatternsLive({ schema: schemaContent, payload: summaryOnly });
  assert.strictEqual(result.data.finalExtractedData.summary, 'Only summary here');
  assert.strictEqual(result.data.finalExtractedData.description, undefined);

  const descriptionOnly = cloneJson(schemaContent.sample);
  descriptionOnly.attachments[0].text = 'Annotations:\n - description = Only description here\nSource: https://grafana.example.test/source';
  result = await testPatternsLive({ schema: schemaContent, payload: descriptionOnly });
  assert.strictEqual(result.data.finalExtractedData.description, 'Only description here');
  assert.strictEqual(result.data.finalExtractedData.summary, undefined);
});

await test('prefers label priority over annotation priority through the live API', { skip: liveSkipReason() }, async () => {
  const payload = cloneJson(schemaContent.sample);
  payload.attachments[0].text = 'Labels:\n - priority = P1\nAnnotations:\n - priority = P3\nSource: https://grafana.example.test/source';
  const result = await testPatternsLive({ schema: schemaContent, payload });
  assert.strictEqual(result.data.finalExtractedData.priority, 'P1');
});

await test('extracts resolved status with resolution patterns through the live API', { skip: liveSkipReason() }, async () => {
  const payload = cloneJson(schemaContent.sample);
  payload.attachments[0].title = '[RESOLVED:1] Complex alert Test folder (alerts@example.test bar prometheus.example.test prometheus P1)';

  const result = await testPatternsLive({
    schema: { patterns: schemaContent.resolution_patterns },
    payload,
  });

  assert.strictEqual(result.data.finalExtractedData.status.toUpperCase(), 'RESOLVED');
});
