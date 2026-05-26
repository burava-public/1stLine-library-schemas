import test from 'node:test';
import assert from 'node:assert/strict';
import { liveSkipReason, loadSchemaPackage, testPatternsLive, testTransformationLive } from '../../../../../test-helpers/live-client.js';
import { assertNoIncidentFields, assertOnlySupportedRootKeys, cloneJson } from '../../../../../test-helpers/schema-assertions.js';

const pkg = await loadSchemaPackage(import.meta.url, {
  schema: 'grafana-slack-transformed.json',
});
const schemaContent = pkg.schema;

await test('matches the transformed Slack schema contract locally', () => {
  assertOnlySupportedRootKeys(
    schemaContent,
    new Set([
      'fields',
      'transformation_template',
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
  assert.deepStrictEqual(schemaContent.patterns.map((pattern) => pattern.name), [
    'labels',
    'value',
    'priority',
    'description',
    'summary',
    'source',
    'title',
    'attachments',
    'username',
    'ack_inline',
    'unack_inline',
    'resolve_inline',
  ]);
  assert.deepStrictEqual(schemaContent.transformation_template, {
    username: '${username}',
    attachments: [{
      ts: '${attachments[0].ts}',
      text: '<__UNACK_LINK__|UNACK> | <__RESOLVE_LINK__|RESOLVE>\nValue: ${value}\n${source:-}\nSummary:\n${summary}\nDescription:\n${description}\n\nLabels:\n```\n${labels}\n```',
      color: '${attachments[0].color}',
      title: '1stLine: ${priority} ${labels.alertname}',
      footer: '${attachments[0].footer}',
      fallback: '1stLine: ${priority} ${labels.alertname}',
      title_link: '',
      footer_icon: 'https://1stline.example.test/logo.svg',
    }],
  });
  assert.strictEqual(schemaContent.resolution_proxy_config, '1stLine');
  assert.strictEqual(schemaContent.proxy_recurrent_alerts, false);
  assert.deepStrictEqual(schemaContent.fingerprint_fields, ['labels']);
  assert.strictEqual(schemaContent.ack_mapping.title, 'attachments[0].title');
  assert.strictEqual(schemaContent.ack_mapping.ack_link, 'attachments[0].title_link');
  assert.strictEqual(schemaContent.ack_mapping.unack_link, 'unack_inline.token');
  assert.strictEqual(schemaContent.ack_mapping.description, 'attachments[0].text');
  assert.strictEqual(schemaContent.ack_mapping.fallback_title, 'attachments[0].fallback');
  assert.strictEqual(schemaContent.ack_mapping.overrides['attachments[0].color'], '#6495ED');
  assert.strictEqual(schemaContent.resolution_mapping.title, 'title');
  assert.strictEqual(schemaContent.resolution_mapping.resolve_link, 'resolve_inline.token');
  assert.strictEqual(schemaContent.resolution_mapping.description, 'attachments[0].text');
  assert.strictEqual(schemaContent.resolution_mapping.fallback_title, 'attachments[0].fallback');
  assert.strictEqual(schemaContent.resolution_mapping.overrides['attachments[0].color'], '#33cc33');

  const lifecycle = schemaContent.incident_lifecycle_mapping;
  for (const trigger of ['created', 'resolved', 'closed', 'reopened', 'priority_changed']) {
    assert.ok(lifecycle[trigger], `${trigger} mapping is missing`);
    assert.strictEqual(lifecycle[trigger].status, 'labels.status');
  }
  assert.strictEqual(lifecycle.created.overrides['attachments[0].title_link'], '${incident.link}');
  assert.ok(lifecycle.created.overrides['attachments[0].text'].includes('Event: ${incident.event.type}'));
  assert.ok(lifecycle.closed.overrides['attachments[0].text'].includes('Closed at: ${incident.closed_at}'));
  assert.strictEqual(lifecycle.priority_changed.overrides['attachments[0].color'], '#DAC17C');
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

await test('handles summary and description fallbacks and priority precedence through the live API', { skip: liveSkipReason() }, async () => {
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

  const labelPriority = cloneJson(schemaContent.sample);
  labelPriority.attachments[0].text = 'Labels:\n - priority = P1\nAnnotations:\n - priority = P3\nSource: https://grafana.example.test/source';
  result = await testPatternsLive({ schema: schemaContent, payload: labelPriority });
  assert.strictEqual(result.data.finalExtractedData.priority, 'P1');
});

await test('extracts resolution status and renders transformed payload through the live API', { skip: liveSkipReason() }, async () => {
  const resolved = cloneJson(schemaContent.sample);
  resolved.attachments[0].title = '[RESOLVED:1] Complex alert Test folder (alerts@example.test bar prometheus.example.test prometheus P1)';

  let result = await testPatternsLive({
    schema: { patterns: schemaContent.resolution_patterns },
    payload: resolved,
  });
  assert.strictEqual(result.data.finalExtractedData.status.toUpperCase(), 'RESOLVED');

  result = await testTransformationLive({ schema: schemaContent, payload: schemaContent.sample });
  const finalPayload = result.data.finalPayload;
  assert.equal(result.success, true);
  assert.strictEqual(finalPayload.username, 'Grafana');
  assert.strictEqual(finalPayload.attachments[0].title, '1stLine: P1 Complex alert');
  assert.strictEqual(finalPayload.attachments[0].fallback, '1stLine: P1 Complex alert');
  assert.strictEqual(finalPayload.attachments[0].footer_icon, 'https://1stline.example.test/logo.svg');
  assert.ok(finalPayload.attachments[0].text.includes('UNACK'));
  assert.ok(finalPayload.attachments[0].text.includes('RESOLVE'));
  assert.ok(finalPayload.attachments[0].text.includes('Value: A=1, C=1, prometheus_ready=1, some_hardcoded_query=0.99789656'));
  assert.ok(finalPayload.attachments[0].text.includes('Summary:'));
  assert.ok(finalPayload.attachments[0].text.includes('Description:'));
  assert.ok(finalPayload.attachments[0].text.includes('Complex alert'));
});
