# 1stLine Incident Slack library schema

## Description
Library schema for incidents created inside 1stLine and rendered as a Slack incoming webhook attachment message. The visible Slack payload is a top-level `username` plus a single `attachments[0]` object with `title`, `title_link`, `text`, `fallback`, `footer`, `color`, and `ts`.

## Public Metadata
- UID: `1stline-incident-slack`
- Producer: `1stline`
- Receiver: `incident`
- Variant: `slack`
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
