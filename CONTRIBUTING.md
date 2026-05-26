# Contributing

## Scope

This repository accepts contributions for public 1stLine library alert schemas.

Good contributions include:

- new provider -> receiver -> template packages
- fixes to extraction logic
- fixes to transformation templates
- trusted-source fixtures
- package documentation improvements
- unit test improvements

## Before You Start

1. Read [README.md](README.md).
2. Read [skills/1stline-schemas/SKILL.md](skills/1stline-schemas/SKILL.md).
3. Prepare trusted payload sources.
4. Prepare access to a 1stLine org you control for live validation.

## Package Rules

Every schema package must contain:

```text
providers/<provider>/receivers/<receiver>/<template-name>/
  schema.meta.json
  <provider>-<receiver>-<template-name>.json
  <provider>-<receiver>-<template-name>.test.js
  README.md
  package.yaml
```

Required rules:

- keep the package public-safe
- keep `uid` stable in `schema.meta.json`
- keep `default_forward_to` null
- keep provider and receiver payload paths accurate
- do not copy one receiver's payload model into another receiver

## Unit Tests

All schema contributions must include unit tests.

Required coverage:

- manual complex sample extraction
- trusted-source fixture extraction
- missing optional fields
- labels with URLs, emails, hyphenated keys, spaces, and non-ASCII text when relevant
- multi-line descriptions or summaries
- grouped firing or resolved payloads
- resolution detection
- lifecycle mapping shape
- no unsupported root keys or accidental `incident.*` fields in the schema field list

Run all tests:

```bash
pnpm validate:structure
pnpm test
```

Run one package only:

```bash
pnpm --dir providers/<provider>/receivers/<receiver>/<template-name> test
```

## Live Validation

Contributors should validate against public 1stLine surfaces when the change affects behavior.

Recommended environment:

```bash
export FIRSTLINE_BASE_URL="https://1stline.burava.com/api/schemas"
export FIRSTLINE_TOKEN="..."
export FIRSTLINE_ORG_UID="your-org-uid"
```

GitHub live validation in this repository is maintainer-dispatched through the `Manual Live Schema Tests` workflow. It is not an automatic pull-request workflow.

Typical validation flow:

1. Validate extraction with `/test-patterns`.
2. Validate transformation with `/test-transformation-template` when transformations are involved.
3. Register the schema in your own org if needed.
4. Perform real ingestion if the change requires full proof.

## Pull Requests

A pull request should include:

- what provider, receiver, and template were changed
- source provenance used
- files changed
- unit test results
- live validation results
- known caveats or unresolved gaps

## Safety

Do not submit:

- secrets or tokens
- internal-only URLs or headers
- localhost-only sample payloads
- private operational instructions

## License

By contributing, you agree that your contribution will be licensed under the repository license.
