# Repository Protection Setup

Repository:

- `burava-public/1stLine-library-schemas`

Maintainer:

- `@danilgotvyansky`

## Local Files

This repository includes:

- `.github/CODEOWNERS`
- `.github/workflows/manual-live-tests.yml`
- `.github/rulesets/main.json`
- `SECURITY.md`

## GitHub Environment

Create the environment used by the manual workflow:

```bash
gh api \
  -X PUT \
  repos/burava-public/1stLine-library-schemas/environments/public-schema-live-tests
```

Then add these environment secrets in GitHub:

- `FIRSTLINE_TOKEN`
- `FIRSTLINE_ORG_UID`

## Ruleset

Create the repository ruleset from the checked-in JSON:

```bash
gh api \
  -X POST \
  repos/burava-public/1stLine-library-schemas/rulesets \
  --input .github/rulesets/main.json
```

List current rulesets:

```bash
gh api repos/burava-public/1stLine-library-schemas/rulesets
```

If you need to update an existing ruleset, first get its `id`, then:

```bash
gh api \
  -X PUT \
  repos/burava-public/1stLine-library-schemas/rulesets/RULESET_ID \
  --input .github/rulesets/main.json
```

## Recommended Repository Settings

Set GitHub Actions defaults to the most restrictive practical settings:

- default workflow permissions: read repository contents
- allow only trusted actions, or at minimum GitHub-authored and explicitly allowed actions
- require approval for environment use if you want a second human gate before live tests run

## Important Limitation

This repository intentionally uses `workflow_dispatch` for live tests only.

That means:

- the workflow will not run automatically for every pull request
- the required status checks in the ruleset will be satisfied only after a maintainer dispatches the workflow against the pull request branch or commit
