# Repository Guidelines

## Public Repository Notice
This is a **public repository**. Assume every committed line is publicly visible and permanent.

## Project Structure & Module Organization
This repo stores public library alert schemas for 1stLine.

- `providers/<provider>/receivers/<receiver>/<template>/`: schema packages.
- Each package must include:
  - `schema.meta.json`
  - `<provider>-<receiver>-<template>.json`
  - `<provider>-<receiver>-<template>.test.js`
  - `README.md`
  - `package.yaml`
- Trusted payloads live under `fixtures/trusted-sources/...` inside a package.
- Shared tooling:
  - `scripts/validate-structure.mjs`
  - `test-helpers/live-client.js`
  - `test-helpers/schema-assertions.js`

## Build, Test, and Development Commands
- `pnpm validate:structure`: validates package layout, required files, JSON, and safety rules.
- `pnpm test`: runs all schema tests (`node --test ./providers/**/*.test.js`).
- `pnpm test:live`: alias of `pnpm test`.
- `pnpm --dir providers/<provider>/receivers/<receiver>/<template> test`: run one package only.

Use Node `>=20` and `pnpm@10`.

## Coding Style & Naming Conventions
- Use ESM JavaScript (`type: module`).
- Keep JSON schemas deterministic and minimal; preserve existing key order/style in touched files.
- Use 2-space indentation in JS/JSON.
- Package/file names follow path-derived naming:
  - `providers/grafana/receivers/slack/default/grafana-slack-default.json`
- Keep `schema.meta.json` `uid` stable and `default_forward_to: null`.

## Testing Guidelines
- Test framework: Node built-in test runner (`node:test`, `assert/strict`).
- Update tests whenever schema extraction or mapping changes.
- Cover both:
  - local contract assertions (supported root keys, forbidden fields),
  - live extraction/transformation assertions (when enabled via env).
- Live test env vars: `FIRSTLINE_BASE_URL`, `FIRSTLINE_TOKEN`, `FIRSTLINE_ORG_UID`.

## Commit & Pull Request Guidelines
- Prefer concise, imperative commit subjects (e.g., `Fix ...`, `Update ...`); optional prefixes like `chore:` are used in history.
- Keep commits scoped to one schema concern.
- PRs should follow `.github/pull_request_template.md` and include:
  - provider/receiver/template scope,
  - changed files,
  - validation results,
  - source provenance,
  - caveats.

## NEVER (Hard Rules)
- NEVER commit or mention secrets, tokens, API keys, credentials, or internal-only headers/URLs.
- NEVER include unsanitized production payloads, user/task-specific production details, or sensitive operational context.
- NEVER include production UIDs in this public repo context, except global library schema UIDs when explicitly required.
- NEVER add localhost-only/private environment instructions as public schema behavior guidance.
