import test from 'node:test';
import assert from 'node:assert/strict';
import { liveSkipReason, loadSchemaPackage, testPatternsLive, testTransformationLive } from '../../../../../test-helpers/live-client.js';

test('extracts fields through the live API', { skip: liveSkipReason() }, async () => {
  const pkg = await loadSchemaPackage(import.meta.url, {
    schema: "zabbix-discord-default.json",
  fixture: "fixtures/trusted-sources/zabbix-release-7.4/trigger-problem.json",
  });

  const result = await testPatternsLive({
    schema: pkg.schema,
    payload: pkg.fixture
  });

  assert.equal(result.success, true);
  assert.equal(typeof result.data.finalExtractedData, 'object');
  assert.deepEqual(pkg.fixture && typeof pkg.fixture, 'object');
});