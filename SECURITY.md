# Security

## Repository Model

This repository is public and accepts schema contributions through pull requests.

The trust boundary is:

- public contributors may propose schema changes
- GitHub Actions secrets must not be exposed to untrusted pull request code
- production 1stLine synchronization remains separate from this repository

## Manual Live Tests

This repository uses a manual GitHub Actions workflow for live schema validation:

- workflow: `Manual Live Schema Tests`
- trigger: `workflow_dispatch`
- environment: `public-schema-live-tests`

Required environment secrets:

- `FIRSTLINE_TOKEN`
- `FIRSTLINE_ORG_UID`

Fixed workflow environment:

- `FIRSTLINE_BASE_URL=https://1stline.burava.com/api/schemas`

Recommended token scope:

- use a dedicated reader token for a dedicated empty or low-risk org used only for schema validation

## Branch Protection

The default branch should be protected with a GitHub ruleset that requires:

- pull requests before merge
- one approval
- code owner review
- latest-push approval
- resolved review threads
- signed commits
- linear history
- no force pushes
- no branch deletion
- successful `validate-structure`
- successful `live-tests`

The repository contains a ready-to-apply ruleset payload:

- `.github/rulesets/main.json`

## Workflow Security

Recommended GitHub Actions settings:

- default `GITHUB_TOKEN` permissions set to read-only
- allow only GitHub-authored or explicitly approved actions
- protect the `public-schema-live-tests` environment with maintainer approval if desired
- do not use `pull_request_target` to run untrusted pull request code with secrets

## Vulnerability Reporting

If you discover a vulnerability in this repository or in the associated validation flow, report it privately to the maintainer instead of opening a public issue.
