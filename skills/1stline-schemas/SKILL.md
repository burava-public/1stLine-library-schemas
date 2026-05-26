---
name: 1stline-schemas
description: Create or modify 1stLine library schemas for alert payloads. Use when working under the public library schema repo, adding producer/receiver schemas, deriving fields from trusted alert payload examples, writing extraction patterns, validating schemas with test-patterns, or proving real 1stLine alert ingestion and parsed fields.
---

# 1stLine Library Schemas

Use this skill to create, update, and validate schemas in this public library schema repository for 1stLine alert ingestion.

## Core Rule

Never accept pattern-only validation as complete. A schema is done only when it is verified against:

1. Local or manual representative payloads.
2. Trusted-source payloads from official docs, upstream tests, or source repositories.
3. The deployed `/schemas/test-patterns` endpoint when live validation is requested.
4. Real alert ingestion through `/api/proxy/...`, followed by querying persisted alert instances and confirming `parsed_fields` when the task requires ingestion proof.

## MCP Preflight (Mandatory)

Before using this skill for live validation, schema registration, deployed schema updates, or real ingestion checks, verify that a 1stLine MCP server is available and exposes the tools needed for the work. Do this before writing or modifying schemas if the task expects live 1stLine proof.

Required checks:

1. Confirm a 1stLine MCP server is connected, normally named something like `firstline` or exposed to the agent as `mcp__firstline_*`.
2. Confirm `X-Org-Context` is configured for that MCP server. MCP tools must not ask for `org_uid`; the MCP server forwards `X-Org-Context` as `org_uid` to downstream 1stLine APIs.
3. List available MCP tools and confirm the needed tools are present for the requested workflow:
   - Pattern validation: `test_alert_schema_patterns`
   - Library discovery: `list_global_library_schemas`, `list_org_library_schemas`
   - Existing schema inspection: `list_alert_schemas`, `get_alert_schema`
   - Schema creation flow when needed: `create_schema_creation_token`, `create_alert_schema_from_payload`
   - Existing schema update or delete when needed: `update_alert_schema`, `delete_alert_schema`
   - Real ingestion proof: `list_alert_instances`, `get_alert_instance`
4. Make a small harmless read call, such as `list_alert_schemas` with a low limit, to prove the token and `X-Org-Context` are accepted.
5. If a required tool is missing or the read call fails with `X-Org-Context header is required for this MCP tool`, stop and help the human fix MCP configuration before continuing with live validation claims.

Recommended Codex MCP configuration:

```toml
[mcp_servers.firstline]
enabled = true
url = "https://1stline.burava.com/api/mcp"
bearer_token_env_var = "MCP_FIRSTLINE_TOKEN"
http_headers = { "X-Org-Context" = "test-org" }
```

Use `http_headers`, not `headers`. For environment-backed org context:

```toml
[mcp_servers.firstline]
enabled = true
url = "https://1stline.burava.com/api/mcp"
bearer_token_env_var = "MCP_FIRSTLINE_TOKEN"
env_http_headers = { "X-Org-Context" = "MCP_FIRSTLINE_ORG_CONTEXT" }
```

After config changes, ask the human to restart or reload the agent runtime and verify:

```bash
codex mcp get firstline
```

It should show `http_headers` or `env_http_headers` for `X-Org-Context`. Do not ask the human to paste bearer tokens or schema tokens into chat. If a token value must be handled by the agent, keep it in environment variables and redact it from reports.

## Compatibility Gate (Blocker)

Before implementing a producer -> receiver schema pair, verify transport and payload compatibility:

1. Can the producer natively emit a payload format the receiver accepts?
2. If not, does 1stLine already support the required payload transformation path for this pair?
3. Can system-event payloads such as acknowledge, resolve, and incident lifecycle events also be emitted in a receiver-valid format?

If any answer is "no", stop and report the pair as not currently implementable without new transformation support.

Example blocker: AWS SNS does not natively send receiver-valid Slack or Discord webhook payloads.

## Acceptance Criteria (Mandatory)

A schema can be accepted only when all criteria pass:

1. The payload schema matches the most complex payload the producer can generate and that payload is valid.
2. 1stLine parses all critical fields for that producer:
   `labels/tags`, `priority`, `message`, `summary`, `description`, `title`, plus producer-specific metadata.
3. The receiver actually returns success (`200` or equivalent ok response) for:
   - producer-origin payload flow, and
   - payloads modified by 1stLine for system events.

## Source Quality

Prefer sources in this order:

1. `official`: vendor or project docs or API references.
2. `upstream-test`: tests from the producer or receiver project.
3. `repo-fixture`: public fixture files from a maintained integration project.
4. `adapter-derived`: normalizer or adapter code, useful for hints but not truth.
5. `template-derived`: variable catalogs or templates, useful for custom webhook systems.
6. `needs-capture`: integration exists but emitted payloads need request-bin or live capture.

Read `./alert-payload-sources.md` when choosing sources. If it is missing or stale, research current primary sources before writing patterns.

Trusted examples to prefer:

- Grafana: `grafana/alerting` receiver tests and notifier code, plus Grafana contact-point docs.
- Alertmanager: `prometheus/alertmanager/notify` tests and webhook or template docs.
- Zabbix: release-pinned `templates/media/*` YAML or scripts plus receiver docs.
- Azure Monitor: common alert schema and payload samples.
- AWS CloudWatch, SNS, or EventBridge: official alarm or event schemas plus SNS transport envelope.
- GCP Cloud Monitoring: notification schema plus Pub/Sub wrapper.
- Pingdom: official webhook examples.
- Dynatrace: webhook notification docs, problem notification settings schema, Problems API v2.
- Receiver contracts: Slack, Discord, Teams or Adaptive Cards, Telegram Bot API, Mattermost, Rocket.Chat, PagerDuty Events API, Opsgenie Alert API, ServiceNow, Jira, Zendesk, GitHub Issues, Google Chat, Matrix, Webex, Linear.

For template-driven producers such as Datadog, New Relic, Checkly, Honeycomb, Site24x7, Logz.io, Mezmo, OpenSearch, Kibana, and Sematext, store both the variable catalog assumptions and rendered practical fixtures. Do not pretend there is one fixed native schema unless the vendor publishes one.

## File Layout

Mirror the existing package layout:

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

Use the closest existing schema package as the template.

## Schema Content

Never try to guess schema structure. Rely on the official API definition using this command:

```bash
curl https://1stline.burava.com/api/api-docs/openapi | jq '.components.schemas.LibrarySchema'
```

Avoid fetching the whole OpenAPI spec, it will overload context.

Keep paths aligned with the actual wire payload. Do not copy Slack paths into Discord, Teams, or other receivers. For example, Grafana Discord uses `content` and `embeds[0]`, not Slack `attachments[0]`.

## Transformation Guidance (Mandatory)

Use transformations to make receiver-ready payloads, then validate output end-to-end before rollout.

1. Update flow with MCP or public API tools:
   - Use `get_alert_schema` to inspect current `transformation_template`, mappings, and related patterns when you are editing an already-registered schema.
   - Apply changes with `update_alert_schema` when the task includes updating a deployed schema.
   - If a transformation test tool is available, run it after every significant change.
2. Testing flow:
   - Validate extraction first with `test_alert_schema_patterns` or `/schemas/test-patterns` using realistic payloads.
   - Then test transformation output and verify the final receiver payload shape, not only extracted fields.
   - Treat transformation as complete only when rendered content, links, and receiver-specific structures match receiver expectations.
3. Receiver-shape guidance:
   - Preserve the receiver's native object model. Do not force one receiver's conventions onto another.
   - Keep actions, links, summaries, colors, and lifecycle cues in fields that the receiver actually supports.
   - Avoid unsupported button, action, or rich-content structures for the target receiver.
   - When a receiver requires a fallback or plain-text equivalent, make sure the final payload provides it. Slack is the most common case: Slack mappings that emit or rewrite a Slack message must ensure a valid fallback, usually through `fallback_title`, `attachments[0].fallback`, or an explicit lifecycle override.
4. Placeholder usage in author terms:
   - `${field}` inserts the extracted value for `field`.
   - `${field:-}` inserts the extracted value or an empty string when the value is missing.
   - `${field:-fallback}` inserts the extracted value or the literal fallback text when the value is missing.
   - Do not use `{field}` or `{{field}}` for replaceable variables; those forms are treated as literal text.
5. One runtime fact to remember:
   - For normal ingestion, ack or resolution link mappings are applied after base transformation, so mapped fields can override template values.

## Practical Field Design

Make schemas useful for routing and triage. Extract practical top-level fields when the payload contains enough evidence:

- `title`: stable human-readable title, usually from a title field or primary embed title.
- `status`: firing, resolved, open, closed, or equivalent state when present.
- `labels`: dynamic dictionary of producer labels or tags.
- `priority`: only from explicit producer data, never invented. Label priority may override annotation priority.
- `summary`: explicit summary, or a defensible fallback such as the first annotation key or value.
- `description`: explicit description, or a defensible fallback such as the first alert content section.
- `source`, `silence`, `dashboard`, `panel`, `runbook`, or equivalent links when present.
- `value`: metric or value string when present.

For common or default payloads, avoid schemas that only extract `labels` and `value` if more useful content is available in text, embeds, cards, or links.

## Pattern Rules

Use structured extraction when possible. When text parsing is required:

- Scope regexes tightly to sections such as `Labels:`, `Annotations:`, `Source:`, `Dashboard:`.
- Prefer fallback chains by placing broad fallback patterns before more-specific patterns with the same `name`; later successful patterns override earlier ones.
- Keep optional fields optional when trusted payloads omit them.
- Parse dynamic labels with `dictionary` and `keyPairRegex`.
- Stop multi-line captures at all known next-section delimiters.
- Test repeated or grouped alerts and ensure the chosen block is intentional, usually the first firing block.
- Preserve source-trusted behavior even when it is sparse; add practical fallback fields rather than altering trusted fixture payloads.

Example fallback pattern ordering:

1. `summary` from first annotation key or value.
2. `summary` from explicit `- summary = ...`.

Example priority ordering:

1. `priority` from annotation fallback.
2. `priority` from label `priority`, overriding annotation value.

## Incident Lifecycle Mapping

- Do not use `${incident.event.from_status}` or `${incident.event.to_status}` for `priority_changed` events. Only `${incident.priority}` and `${incident.priority_changed_at}`.
- Do not set both mappings and overrides for the same fields. For example, if you already selected which field will be used as title for a created incident, do not also set an override for title.

## Incident Alert Field Passthrough (Best Practice)

When incident lifecycle events create or register alerts, preserve critical source-alert context so routing, enrichment, and UI chips stay accurate.

Best practice:

- For every lifecycle event with `register_alert: true`, pass through key fields such as `labels/tags`, `priority`, and other routing context fields your org depends on.
- Configure passthrough in lifecycle `overrides` and mappings where appropriate, not by editing message text only.
- Keep passthrough paths explicit and stable across `created`, `reopened`, `resolved`, and `priority_changed` as needed.

Practical example:

1. In lifecycle overrides, copy source context into payload fields:
   - `incident_labels_json = ${labels}`
   - `priority = ${priority}`
2. Add a labels fallback pattern for incident alerts that rebuilds `labels` from `incident_labels_json` with no regex parsing of key-value pairs:
   - fallback `sourceField`: `incident_labels_json`
   - fallback `sourcePattern`: `split` with a delimiter that will not appear
   - fallback `dictionary.sourcePattern`: `json_extract` with `jsonPath: "$.*"` and `parseAsJson: true`

This keeps incident-generated alerts aligned with original alert context and avoids the single-big-label-string failure mode.

## Tests

Every schema package needs public-facing validation coverage for:

- Local schema contract assertions:
  - supported root keys only
  - required fields are present
  - forbidden fields stay absent
  - lifecycle, ack, resolution, and transformation sections keep the expected shape
- Manual complex sample extraction.
- Trusted-source fixture extraction.
- Missing optional fields.
- Labels with URLs, emails, hyphenated keys, spaces, and non-ASCII text when relevant.
- Multi-line descriptions or summaries.
- Grouped firing or resolved payloads.
- Resolution detection.
- Lifecycle mapping shape.
- Fallback ordering and precedence behavior when the schema depends on fallback extraction.
- Exact extracted-field assertions for the important fields the schema is expected to parse.
- Transformed payload assertions when the schema uses a transformation template.
- No unsupported root keys or accidental `incident.*` fields in the schema field list.

Run:

```bash
pnpm validate:structure
pnpm test
```

The repo-local tests should stay customer-facing:

- keep local assertions focused on the checked-in public schema package
- keep behavior assertions focused on live API or MCP validation
- do not reintroduce direct runtime imports from private code

When editing an existing package, preserve the current regression surface unless the behavior change is intentional and documented.

## Deployed Pattern Validation

When live validation is requested, call:

```http
POST https://1stline.burava.com/api/schemas/test-patterns?org_uid=<org_uid>
Authorization: Bearer <api_token>
Content-Type: application/json
```

Request body:

```json
{
  "patterns": [...],
  "testPayload": {...}
}
```

Validate both:

- `patterns` with manual and trusted-source payloads.
- `resolution_patterns` with resolved payloads.

Report `processedPatternCount`, `successfulExtractions`, and extracted field names. Lower success counts are acceptable only when missing fields are optional and absent in the payload.

## Registering A Schema

A user can create their own 1stLine organization and test on their own `org_uid`.

To register an org-scoped library schema:

```http
POST /api/schemas/library/org?org_uid=<org_uid>
Authorization: Bearer <api_token>
Content-Type: application/json
```

Wrap the local schema JSON:

```json
{
  "name": "Provider Receiver Template",
  "description": "What this schema parses",
  "tags": ["provider", "receiver", "alerting"],
  "schema": {}
}
```

Then clone or create the actual org schema:

```http
POST /api/schemas/library/{librarySchemaUid}?org_uid=<org_uid>
Authorization: Bearer <api_token>
```

If updating an existing org schema, use the deployed `PUT /api/schemas/{schemaUid}` contract. Do not leave the deployed schema stale after changing the local file.

## Real Ingestion Validation

Real ingestion is required before claiming a schema works in 1stLine.

Discover the schema token from the actual schema, but do not print it. Public ingress uses schema token selection:

```http
POST /api/proxy/{schemaToken}?org_uid=<org_uid>&forwardTo=<urlencoded receiver URL>
Content-Type: application/json
```

Body is the raw producer payload.

After sending, query persisted instances:

```http
GET /api/proxy/alert-instances?org_uid=<org_uid>&schema_uid=<schemaUid>&limit=100&order_by=newest&start_date=<iso>
GET /api/proxy/alert-instances/{alertInstanceUid}?org_uid=<org_uid>
```

Use a unique label or tag such as `e2e_run` in test payloads so instances are traceable. Confirm persisted `parsed_fields` contains the intended practical fields. Do not claim success if no alert instance was created.

## Reporting

In the final report, include:

- Source provenance used and whether fixtures are exact, reconstructed from upstream assertions, or manually constructed.
- Changed files.
- Local test results.
- Deployed `/schemas/test-patterns` results.
- Registration or update result and schema UID.
- Real ingestion endpoint used.
- Alert instance UIDs and confirmed `parsed_fields`.
- Receiver delivery status when `forwardTo` is used.
- Caveats such as async processing, orphan processing status, or suppressed resolution forwarding.

## Public Safety Rules

Before finalizing any public schema package:

1. Remove personal identifiers and localhost-only examples.
2. Keep `default_forward_to` null.
3. Do not include secrets, tokens, internal service headers, or private operational instructions.
4. Keep package metadata stable in `schema.meta.json`, especially `uid`.
5. Prefer neutral public-safe sample hosts such as `example.test` when sanitizing fixtures.
