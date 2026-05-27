import test from 'node:test';
import assert from 'node:assert/strict';
import { liveSkipReason, loadSchemaPackage, testPatternsLive } from '../../../../../test-helpers/live-client.js';
import { assertNoIncidentFields, assertOnlySupportedRootKeys, cloneJson } from '../../../../../test-helpers/schema-assertions.js';

const pkg = await loadSchemaPackage(import.meta.url, {
  schema: 'grafana-discord-default.json',
});
const trustedFiringDefault = await loadSchemaPackage(import.meta.url, {
  schema: 'grafana-discord-default.json',
  fixture: 'fixtures/trusted-sources/grafana-alerting/firing-default.json',
});
const trustedGrouped = await loadSchemaPackage(import.meta.url, {
  schema: 'grafana-discord-default.json',
  fixture: 'fixtures/trusted-sources/grafana-alerting/firing-and-resolved-with-image.json',
});
const schemaContent = pkg.schema;

await test('keeps only supported root keys and incident variables inside lifecycle mappings', () => {
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
  assert.deepStrictEqual(schemaContent.fingerprint_fields, ['labels']);
  assert.strictEqual(schemaContent.resolution_proxy_config, '1stLine');
  assert.strictEqual(schemaContent.ack_mapping.title, 'title');
  assert.strictEqual(schemaContent.ack_mapping.ack_link, 'embeds[0].url');
  assert.strictEqual(schemaContent.ack_mapping.unack_link, 'labels.__alert_unack_link__');
  assert.strictEqual(schemaContent.ack_mapping.description, 'content');
  assert.strictEqual(schemaContent.resolution_mapping.title, 'title');
  assert.strictEqual(schemaContent.resolution_mapping.resolve_link, 'labels.__alert_resolve_link__');
  assert.strictEqual(schemaContent.resolution_mapping.description, 'content');
  assert.strictEqual(schemaContent.resolution_mapping.overrides['embeds[0].color'], '3581519');

  const lifecycle = schemaContent.incident_lifecycle_mapping;
  for (const trigger of ['created', 'resolved', 'closed', 'reopened', 'priority_changed']) {
    assert.ok(lifecycle[trigger], `${trigger} mapping is missing`);
    assert.strictEqual(lifecycle[trigger].title, 'embeds[0].title');
    assert.strictEqual(lifecycle[trigger].incident_link, 'embeds[0].url');
  }
  assert.strictEqual(lifecycle.created.overrides.priority, '${priority}');
  assert.strictEqual(lifecycle.created.overrides.incident_labels_json, '${labels}');
  assert.strictEqual(lifecycle.reopened.overrides.priority, '${priority}');
  assert.strictEqual(lifecycle.reopened.overrides.incident_labels_json, '${labels}');
  assert.strictEqual(lifecycle.created.overrides['labels.created_by_email'], '${incident.created_by_email}');
  assert.ok(lifecycle.resolved.overrides.content.includes('${incident.event.actor_name}'));
  assert.ok(lifecycle.resolved.overrides.content.includes('${incident.metrics.mttr_seconds}'));
  assert.strictEqual(lifecycle.closed.overrides['embeds[0].color'], '8421504');
});

await test('parses the full sanitized sample payload through the live API', { skip: liveSkipReason() }, async () => {
  const result = await testPatternsLive({ schema: schemaContent, payload: schemaContent.sample });
  const extracted = result.data.finalExtractedData;

  assert.equal(result.success, true);
  assert.strictEqual(extracted.value, 'A=1, C=1, prometheus_ready=1, some_hardcoded_query=0.99789656');
  assert.strictEqual(extracted.priority, 'P1');
  assert.ok(extracted.description.includes('This is a multi-line description'));
  assert.ok(extracted.summary.includes('Multiline complex summmary'));
  assert.strictEqual(extracted.status, 'FIRING');
  assert.strictEqual(extracted.source, 'https://grafana.example.test/alerting/grafana/ff8agsdpqd3b4d/view?orgId=1');
  assert.strictEqual(
    extracted.silence,
    'https://grafana.example.test/alerting/silence/new?alertmanager=grafana&matcher=__alert_rule_uid__%3Dff8agsdpqd3b4d&matcher=Maintainer%3Dalerts%40example.test&matcher=foo%3Dbar&matcher=instance%3Dprometheus.example.test&matcher=job%3Dprometheus&matcher=priority%3DP1&matcher=test-complex-link%3Dhttps%3A%2F%2Fdocs.example.test%2Frunbooks%2Fcomplex-alert&orgId=1'
  );
  assert.strictEqual(extracted.dashboard, undefined);
  assert.strictEqual(extracted.panel, undefined);
  assert.strictEqual(
    extracted.title,
    '[FIRING:1] Complex alert Test folder (alerts@example.test bar prometheus.example.test prometheus P1 https://docs.example.test/runbooks/complex-alert)'
  );
  assert.strictEqual(extracted.labels.alertname, 'Complex alert');
  assert.strictEqual(extracted.labels.job, 'prometheus');
});

await test('parses the trusted upstream default firing payload without Source line through the live API', { skip: liveSkipReason() }, async () => {
  const result = await testPatternsLive({ schema: schemaContent, payload: trustedFiringDefault.fixture });
  const extracted = result.data.finalExtractedData;

  assert.equal(result.success, true);
  assert.strictEqual(extracted.value, '[no value]');
  assert.strictEqual(extracted.title, '[FIRING:1]  (val1)');
  assert.strictEqual(extracted.source, undefined);
  assert.strictEqual(extracted.status, 'FIRING');
  assert.ok(extracted.description.includes('Value: [no value]'));
  assert.ok(extracted.description.includes('Labels:'));
  assert.strictEqual(extracted.summary, 'annv1');
  assert.strictEqual(
    extracted.silence,
    'https://grafana.example.test/alerting/silence/new?alertmanager=grafana&matcher=alertname%3Dalert1&matcher=lbl1%3Dval1'
  );
  assert.strictEqual(extracted.dashboard, 'https://grafana.example.test/d/abcd');
  assert.strictEqual(extracted.panel, 'https://grafana.example.test/d/abcd?viewPanel=efgh');
  assert.strictEqual(extracted.labels.alertname, 'alert1');
  assert.strictEqual(extracted.labels.lbl1, 'val1');
});

await test('parses grouped firing and resolved payloads with images through the live API', { skip: liveSkipReason() }, async () => {
  const result = await testPatternsLive({ schema: schemaContent, payload: trustedGrouped.fixture });
  const extracted = result.data.finalExtractedData;

  assert.equal(result.success, true);
  assert.strictEqual(extracted.value, '[no value]');
  assert.strictEqual(extracted.title, '[FIRING:1]  ');
  assert.strictEqual(extracted.source, undefined);
  assert.strictEqual(extracted.status, 'FIRING');
  assert.ok(extracted.description.includes('Value: [no value]'));
  assert.ok(extracted.description.includes('lbl1 = val2'));
  assert.strictEqual(extracted.summary, undefined);
  assert.strictEqual(
    extracted.silence,
    'https://grafana.example.test/alerting/silence/new?alertmanager=grafana&matcher=alertname%3Dalert1&matcher=lbl1%3Dval2'
  );
  assert.strictEqual(extracted.labels.alertname, 'alert1');
  assert.strictEqual(extracted.labels.lbl1, 'val2');
  assert.strictEqual(trustedGrouped.fixture.embeds[1].image.url, 'attachment://test-image-2.jpg');
});

await test('handles summary and description fallbacks and priority precedence through the live API', { skip: liveSkipReason() }, async () => {
  const summaryOnly = cloneJson(schemaContent.sample);
  summaryOnly.content = 'Annotations:\n - summary = Only summary here\nSource: https://grafana.example.test/source';
  let result = await testPatternsLive({ schema: schemaContent, payload: summaryOnly });
  assert.strictEqual(result.data.finalExtractedData.summary, 'Only summary here');
  assert.strictEqual(result.data.finalExtractedData.description, undefined);

  const descriptionOnly = cloneJson(schemaContent.sample);
  descriptionOnly.content = 'Annotations:\n - description = Only description here\nSource: https://grafana.example.test/source';
  result = await testPatternsLive({ schema: schemaContent, payload: descriptionOnly });
  assert.strictEqual(result.data.finalExtractedData.description, 'Only description here');
  assert.strictEqual(result.data.finalExtractedData.summary, 'Only description here');

  const labelPriority = cloneJson(schemaContent.sample);
  labelPriority.content = 'Annotations:\n - priority = P3\nLabels:\n - priority = P1\nSource: https://grafana.example.test/source';
  result = await testPatternsLive({ schema: schemaContent, payload: labelPriority });
  assert.strictEqual(result.data.finalExtractedData.priority, 'P1');

  const annotationPriority = cloneJson(schemaContent.sample);
  annotationPriority.content = '**Firing**\n\nValue: [no value]\nLabels:\n - alertname = alert-with-annotation-priority\n - e2e_run = unit\nAnnotations:\n - priority = P3\nSilence: https://grafana.example.test/silence';
  result = await testPatternsLive({ schema: schemaContent, payload: annotationPriority });
  assert.strictEqual(result.data.finalExtractedData.priority, 'P3');
  assert.strictEqual(result.data.finalExtractedData.labels.priority, undefined);

  const noPriority = cloneJson(schemaContent.sample);
  noPriority.content = '**Firing**\n\nValue: [no value]\nLabels:\n - alertname = no-priority\nAnnotations:\nSilence: https://grafana.example.test/silence';
  result = await testPatternsLive({ schema: schemaContent, payload: noPriority });
  assert.strictEqual(result.data.finalExtractedData.priority, undefined);
});

await test('does not truncate description when annotation text contains letter z through the live API', { skip: liveSkipReason() }, async () => {
  const payload = cloneJson(schemaContent.sample);
  payload.content = '**Firing**\n\nValue: C=1, reduce=0.6999999999999995\nLabels:\n - alertname = pgEdge CPU usage limits\n - discord = true\n - grafana_folder = Burava Ecosystem\n - priority = P2\n - slack = true\nAnnotations:\n - description = Database pgEdge containers high CPU load. Use Database Observability or connect to Hetzner instances to investigate\n - summary = ```[no value]: 0.6999999999999995```\nSource: https://burava.grafana.net/alerting/grafana/ffk3168fnlekga/view?orgId=1\nSilence: https://burava.grafana.net/alerting/silence/new?alertmanager=grafana&matcher=__alert_rule_uid__%3Dffk3168fnlekga&matcher=discord%3Dtrue&matcher=priority%3DP2&matcher=slack%3Dtrue&orgId=1\nDashboard: https://burava.grafana.net/d/bup99nc?from=1779870990000&orgId=1&to=1779874625227\nPanel: https://burava.grafana.net/d/bup99nc?from=1779870990000&orgId=1&to=1779874625227&viewPanel=21\n';

  const result = await testPatternsLive({ schema: schemaContent, payload });
  assert.strictEqual(
    result.data.finalExtractedData.description,
    'Database pgEdge containers high CPU load. Use Database Observability or connect to Hetzner instances to investigate'
  );
});

await test('preserves complex label keys and resolved extraction through the live API', { skip: liveSkipReason() }, async () => {
  const complexLabels = cloneJson(schemaContent.sample);
  complexLabels.content = '**Firing**\n\nValue: B=2\nLabels:\n - alertname = complex-labels\n - e2e_run = unit-complex\n - test-complex-link = https://example.test/a=b?c=d\n - runbook-path = /srv/runbooks/db primary\nAnnotations:\n - ann1 = first annotation\nSilence: https://grafana.example.test/silence';
  let result = await testPatternsLive({ schema: schemaContent, payload: complexLabels });
  assert.strictEqual(result.data.finalExtractedData.labels['test-complex-link'], 'https://example.test/a=b?c=d');
  assert.strictEqual(result.data.finalExtractedData.labels['runbook-path'], '/srv/runbooks/db primary');

  const emptyAnnotations = cloneJson(trustedGrouped.fixture);
  emptyAnnotations.content = '**Firing**\n\nValue: [no value]\nLabels:\n - alertname = empty-annotations\nAnnotations:\nSilence: https://grafana.example.test/empty-annotations';
  result = await testPatternsLive({ schema: schemaContent, payload: emptyAnnotations });
  assert.ok(result.data.finalExtractedData.description.includes('empty-annotations'));
  assert.strictEqual(result.data.finalExtractedData.summary, undefined);
  assert.strictEqual(result.data.finalExtractedData.priority, undefined);
  assert.strictEqual(result.data.finalExtractedData.silence, 'https://grafana.example.test/empty-annotations');

  const resolvedSample = cloneJson(schemaContent.sample);
  resolvedSample.content = resolvedSample.content.replace('**Firing**', '**Resolved**');
  resolvedSample.embeds[0].title = '[RESOLVED:1] Complex alert Test folder (alerts@example.test bar prometheus.example.test prometheus P1 https://docs.example.test/runbooks/complex-alert)';
  resolvedSample.embeds[0].color = 3581519;
  result = await testPatternsLive({ schema: schemaContent, payload: resolvedSample });
  assert.strictEqual(result.data.finalExtractedData.status, 'RESOLVED');
  assert.strictEqual(result.data.finalExtractedData.priority, 'P1');

  const resolutionResult = await testPatternsLive({
    schema: { patterns: schemaContent.resolution_patterns },
    payload: resolvedSample,
  });
  assert.strictEqual(resolutionResult.data.finalExtractedData.status.toUpperCase(), 'RESOLVED');
});
