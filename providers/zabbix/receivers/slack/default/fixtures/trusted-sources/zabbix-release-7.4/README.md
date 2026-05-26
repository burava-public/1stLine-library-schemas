# Trusted fixtures: Zabbix release/7.4

Source provenance:

- Upstream Zabbix media template repository:
  `https://git.zabbix.com/scm/zbx/zabbix.git`
- Release branch: `release/7.4`
- Commit: `5af81f70702961ec5dc2edce4b4a4494a9f4d7ba`
- Files:
  - `templates/media/slack/media_slack.yaml`
  - `templates/media/slack/README.md`

Fixture notes:

- `trigger-problem-alarm-mode.json` is reconstructed from the exact `this.data`
  request body built by the upstream script for trigger problem events.
- `trigger-resolve-alarm-mode-update.json` is reconstructed from the same script
  for resolve/update flow where `ts` is included for `chat.update`.
