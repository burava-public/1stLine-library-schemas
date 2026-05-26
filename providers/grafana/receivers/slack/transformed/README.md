# Grafana Slack Transformed library schema

## Description
Alert schema for Grafana default notification template with Slack receiver, dynamic label, annotation, and priority extraction.

This transformed variant renders Grafana payloads into the 1stLine Slack message shape, including inline UNACK/RESOLVE markers, ACK mapping, resolution mapping, and incident lifecycle metadata overrides.

## Public Metadata
- UID: `grafana-slack-transformed`
- Producer: `grafana`
- Receiver: `slack`
- Variant: `transformed`
- Visibility: `public`

## Validation
Run structural checks from the repo root:

```bash
pnpm validate:structure
```

Run live extraction or transformation tests from the repo root:

```bash
pnpm test
```

Live tests require `FIRSTLINE_BASE_URL`, `FIRSTLINE_TOKEN`, and `FIRSTLINE_ORG_UID`.
