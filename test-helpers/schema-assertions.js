import assert from 'node:assert/strict';

export function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function fieldMap(schema) {
  return new Map(schema.fields.map((field) => [field.name, field]));
}

export function assertHasFields(fieldsByName, names) {
  for (const name of names) {
    assert.ok(fieldsByName.has(name), `${name} field is missing`);
  }
}

export function assertLacksFields(fieldsByName, names) {
  for (const name of names) {
    assert.ok(!fieldsByName.has(name), `${name} field should not be present`);
  }
}

export function assertOnlySupportedRootKeys(schema, supportedRootKeys) {
  assert.deepStrictEqual(
    Object.keys(schema).filter((rootKey) => !supportedRootKeys.has(rootKey)),
    []
  );
}

export function assertNoIncidentFields(schema) {
  const fieldNames = schema.fields.map((field) => field.name);
  assert.ok(!fieldNames.some((fieldName) => fieldName.startsWith('incident.')));
}
