# Grafana-Discord Default library schema

## Description
Alert Schema for Grafana default Notification Template with Discord receiver and Dynamic Label, Annotations and Priority Extraction

## Public Metadata
- UID: `grafana-discord-default`
- Producer: `grafana`
- Receiver: `discord`
- Variant: `default`
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
