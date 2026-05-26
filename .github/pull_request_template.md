## Description:

### Schema packages:
**New**:
- 

**Updated**:
- 

**Removed**:
- 

### Fixtures and docs:
**New**:
- 

**Updated**:
- 

**Removed**:
- 

### Validation and contract changes:
- 

## Scope:

- Provider:
- Receiver:
- Template:
- Package path:

## Source provenance:

- Official docs:
- Upstream repository or tests:
- Public fixtures or examples:
- Notes on sanitization:

## Checklist:
- [ ] `schema.meta.json` is present and `uid` stayed stable
- [ ] schema JSON matches the package path and intended provider -> receiver contract
- [ ] `default_forward_to` is `null`
- [ ] package README was added or updated
- [ ] trusted fixtures were added or updated
- [ ] package unit tests were added or updated
- [ ] local schema contract assertions were added or updated
- [ ] live behavior assertions were added or updated
- [ ] no unsupported root keys were introduced
- [ ] no accidental `incident.*` fields were added to the schema field list
- [ ] no secrets, tokens, internal headers, or localhost-only data were added
- [ ] `pnpm validate:structure` passed
- [ ] `pnpm test` passed
- [ ] live validation was run against a 1stLine org you control
- [ ] transformation was validated when the schema uses a transformation template
- [ ] real ingestion was validated when needed for this change
- [ ] maintainer must run `Manual Live Schema Tests` before merge

### Required test coverage:
- [ ] local schema contract checks for supported root keys, required fields, and forbidden fields
- [ ] manual complex sample extraction
- [ ] trusted-source fixture extraction
- [ ] missing optional fields
- [ ] labels with URLs, emails, hyphenated keys, spaces, or non-ASCII text when relevant
- [ ] multi-line descriptions or summaries when relevant
- [ ] grouped firing or resolved payloads when relevant
- [ ] resolution detection when relevant
- [ ] lifecycle mapping shape
- [ ] fallback ordering and precedence behavior when the schema depends on fallback extraction
- [ ] exact extracted-field assertions for the important fields the schema is supposed to parse
- [ ] transformed payload assertions when the schema uses a transformation template

### Validation notes:

**Local output**:

```text

```

**Live validation notes**:

```text

```

**Workflow dispatch details**:

- Ref tested:
- Optional package_dir:
- Workflow URL:

### Rules:
<details>
 <summary>Expand</summary>

- Please mention exactly what changed in schema logic, fixtures, and validation coverage.
- Keep the contribution customer-facing and public-safe.
- If behavior changed intentionally, mention the exact extracted or transformed fields that changed.
- Review is recommended.
- During review remember to be friendly :)
</details>
