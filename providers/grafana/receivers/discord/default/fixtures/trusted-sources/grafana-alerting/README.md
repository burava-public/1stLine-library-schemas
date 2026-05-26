# Grafana Alerting Trusted Fixtures

These fixtures reconstruct Discord receiver payloads from upstream Grafana Alerting Go test assertions. They are not copied from fixture JSON.

Source repository: `grafana/alerting`
Commit/content context: `5095d423178f82ca3f8c85489049695356bb0e10`

Primary upstream files:
- `receivers/discord/v1/discord_test.go`
- `receivers/discord/v1/discord.go`
- `templates/default_template.go`
- `receivers/util.go`

Notes:
- `discord_test.go` builds expected payloads as Go maps, then compares them with `require.JSONEq`.
- `appVersion` is randomized in the upstream tests, so fixture footer text is normalized to `Grafana v0.0.0`.
- `firing-default.json` is reconstructed from the upstream test case named `Default config with one alert`.
- `firing-and-resolved-with-image.json` is reconstructed from the upstream image test case named `Default config with two alerts with same name, and image without URL`.
