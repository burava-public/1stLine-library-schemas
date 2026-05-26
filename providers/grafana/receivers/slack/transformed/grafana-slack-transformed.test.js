import test from 'node:test';
import assert from 'node:assert/strict';
import { liveSkipReason, loadSchemaPackage, testPatternsLive, testTransformationLive } from '../../../../../test-helpers/live-client.js';

test('extracts fields through the live API', { skip: liveSkipReason() }, async () => {
  const pkg = await loadSchemaPackage(import.meta.url, {
    schema: "grafana-slack-transformed.json",
  });

  const result = await testPatternsLive({
    schema: pkg.schema,
    payload: pkg.fixture
  });

  assert.equal(result.success, true);
  assert.equal(typeof result.data.finalExtractedData, 'object');
});

test('renders transformed payload through the live API', { skip: liveSkipReason() }, async () => {
  const pkg = await loadSchemaPackage(import.meta.url, {
    schema: "grafana-slack-transformed.json",
  });

  const result = await testTransformationLive({
    schema: pkg.schema,
    payload: pkg.fixture
  });

  assert.equal(result.success, true);
  assert.equal(typeof result.data.finalPayload, 'object');
});
