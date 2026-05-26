# Grafana Slack Default library schema

## Description
Alert schema for Grafana default notification template with Slack receiver and dynamic label, annotation, and priority extraction.

This default variant performs minimal transformations and forwards Grafana-origin resolved Slack payloads by using `resolution_proxy_config: "initial"`.

## Public Metadata
- UID: `grafana-slack-default`
- Producer: `grafana`
- Receiver: `slack`
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
