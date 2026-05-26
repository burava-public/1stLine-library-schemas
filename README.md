# 1stLine Library Schemas

Public schema repository for **1stLine by Burava**.

1stLine is a Transparent alert and incident management proxy platform. It is designed to sit between your alert producer and destination, routing alerts as-is or with the modifications you choose, registering and parsing them, then processing escalation based on parsed data.

This repository is the public authoring surface for reusable **library alert schemas**.

## Official Links
- Home: https://burava.com/1stline
- App: https://1stline.burava.com
- Documentation: https://docs.burava.com/1stline
- Library schema docs: https://docs.burava.com/1stline/alert-schemas#library-schemas
- OpenAPI: https://1stline.burava.com/api/api-docs/scalar

## Purpose

Use this repository to:

- contribute new alert schemas for supported provider -> receiver pairs
- improve parsing, transformation, and lifecycle mapping for existing schemas
- add trusted-source fixtures and package documentation
- validate schemas against the public 1stLine API or MCP surface

This repository does not contain the private 1stLine extraction runtime.

## AI-First Workflow

This repository is optimized for AI-assisted authoring.

Start with the included skill:

- [skills/1stline-schemas/SKILL.md](skills/1stline-schemas/SKILL.md)

Use it when:

- researching payload sources
- planning a new schema package
- writing extraction patterns
- designing transformation templates
- validating deployed behavior with MCP or public API
- preparing a contribution report

Strong recommendation:

1. Read the skill first.
2. Prepare trusted-source examples before editing schema logic.
3. Use MCP or public API validation early, not only at the end.
4. Keep the final package customer-facing and public-safe.

## Preparation

Before contributing a schema, prepare the following:

1. A clear provider -> receiver -> template target.
2. Trusted payload examples from official docs, upstream tests, or public fixtures.
3. A 1stLine org you control for live validation.
4. A public API token or MCP access with the required permissions.
5. A stable package UID in `schema.meta.json`.

Recommended live-validation environment:

```bash
export FIRSTLINE_BASE_URL="https://1stline.burava.com/api/schemas"
export FIRSTLINE_TOKEN="..."
export FIRSTLINE_ORG_UID="your-org-uid"
```

or add them to the `.env` file.

## MCP

Example configuration for 1stLine MCP with Codex:

```toml
[mcp_servers.firstline]
enabled = true
url = "https://1stline.burava.com/api/mcp"
bearer_token_env_var = "MCP_FIRSTLINE_TOKEN"
http_headers = { "X-Org-Context" = "test-org" }
```

Then in `~/.codex/.env` add your 1stLine API token:

```
MCP_FIRSTLINE_TOKEN=your_token_here
```

Use your org slug or org uid as the `X-Org-Context` header value. This is required for authentication.

## Repository Layout

```text
providers/<provider>/receivers/<receiver>/<template-name>/
  schema.meta.json
  <provider>-<receiver>-<template-name>.json
  <provider>-<receiver>-<template-name>.test.js
  README.md
  package.yaml
  fixtures/
    trusted-sources/<source-name>/
      README.md
      *.json
```

Repository-level assets:

- [alert-payload-sources.md](alert-payload-sources.md): source inventory for payload research
- [skills/1stline-schemas/SKILL.md](skills/1stline-schemas/SKILL.md): AI-oriented authoring workflow
- [scripts/validate-structure.mjs](scripts/validate-structure.mjs): structural validator
- [test-helpers/live-client.js](test-helpers/live-client.js): shared live validation client

## Public Safety Rules

All public packages must remain safe to publish.

Required rules:

- no secrets, tokens, passwords, or private credentials
- no localhost-only or loopback sample hosts
- no internal service headers or private operational instructions
- `default_forward_to` must remain `null`
- `schema.meta.json` must preserve stable package identity, especially `uid`

## Scripts

### Root `package.yaml`

- `pnpm validate:structure`
  Checks repository structure, package manifests, required files, JSON validity, UID uniqueness, and banned public-content patterns.
- `pnpm test`
  Runs all package unit tests under `providers/**`. In this repository, unit tests are public-facing live-validation tests.
- `pnpm test:live`
  Alias for `pnpm test`. Kept for clarity when contributors explicitly want to run live validation.

### Package `package.yaml`

Every schema package includes its own `package.yaml`.

- `pnpm --dir providers/<provider>/receivers/<receiver>/<template-name> test`
  Runs that package's unit tests only.

## Required Unit Tests

Every schema package must include unit tests.

In this repository, “unit tests” means package-local validation tests that exercise the schema package contract and its public validation flow. They are required for every contribution.

Minimum required coverage:

- manual complex sample extraction
- trusted-source fixture extraction
- missing optional fields
- labels with URLs, emails, hyphenated keys, spaces, and non-ASCII text when relevant
- multi-line descriptions or summaries
- grouped firing or resolved payloads
- resolution detection
- lifecycle mapping shape
- no unsupported root keys or accidental `incident.*` fields in the schema field list

The authoritative contribution expectations live in the skill.

## How To Contribute

1. Pick the target package path under `providers/`.
2. Read the closest existing package and the skill.
3. Gather official and trusted-source payload examples.
4. Create or update:
   - `schema.meta.json`
   - schema JSON
   - package README
   - trusted fixtures
   - package unit tests
5. Run structural validation.
6. Run package unit tests.
7. Run live validation against your own 1stLine org.
8. Open a PR with source provenance, validation evidence, and caveats.

For detailed contribution rules, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Live Validation

This repository validates behavior through public 1stLine surfaces.

Primary validation endpoints:

- `POST /api/schemas/test-patterns`
- `POST /api/schemas/test-transformation-template`
- `POST /api/proxy/{schemaToken}` for real ingestion when needed
- MCP tools exposed from `https://1stline.burava.com/api/mcp`

Typical permission model:

- `reader`: enough for test endpoints and read-only inspection
- `editor`: required for creating or updating schemas in your own org

Use a 1stLine org you control. Contributors are expected to test against their own `org_uid` when they need deployed proof.

## Contribution Standard

A professional contribution includes:

- clear provider/receiver/template scope
- trusted provenance for fixtures
- package-local README updates
- complete unit test coverage
- successful structural validation
- successful live validation or a precise note explaining what remains unverified
- explicit caveats where the provider or receiver contract is inherently limited

## License

This repository is licensed under the Apache License 2.0. See [LICENSE](LICENSE).
