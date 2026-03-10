# Local Instance Restart Runbook

This runbook covers the restart-only path for Claricont's local Paperclip instance when the code on disk is already correct and the service only needs to reload it.

Use this instead of a full deploy when:

- the source fix is already present under `/home/paperclip/paperclip`
- the instance only needs a controlled `paperclip` service restart
- you want a repeatable operator path that does not depend on ad-hoc shell history

## Current Deployment Facts

As verified on 2026-03-10:

- systemd unit: `/etc/systemd/system/paperclip.service`
- service name: `paperclip`
- service user/group: `paperclip:paperclip`
- working directory: `/home/paperclip/paperclip`
- startup command: `/usr/bin/pnpm paperclipai run --repair`
- config file: `/home/paperclip/.paperclip/instances/default/config.json`
- env file: `/home/paperclip/.paperclip/instances/default/.env`
- file log: `/home/paperclip/.paperclip/instances/default/logs/server.log`
- healthcheck: `http://127.0.0.1:3100/api/health`

Live process evidence on 2026-03-10 showed localhost:3100 served by the long-lived `paperclip.service` process tree started on 2026-03-09 00:28:47 MSK, which is why restart is required for source changes to take effect.

## Who Can Execute The Restart Today

Today, 2026-03-10, the practical restart operator is a human with shell access to the host as `paperclip` (or equivalent sudo-capable operator).

Evidence:

- `paperclip.service` runs as user `paperclip`
- `sudo -n -l` for `paperclip` shows passwordless permission for `/bin/systemctl * paperclip`

What remains human-only even with this runbook:

- deciding whether the current live runs are safe to interrupt
- choosing the restart window
- reviewing the board/API state before pushing the button

## Preflight

Do not restart blindly. Check all of these first.

### 1. Confirm the service is currently healthy

```sh
curl -fsS http://127.0.0.1:3100/api/health
systemctl show paperclip -p ActiveState -p ActiveEnterTimestamp -p ExecMainPID
```

Expected:

- health returns `{"status":"ok", ...}`
- `ActiveState=active`

### 2. Check for live runs that would be interrupted

Preferred API check:

```sh
curl -fsS \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/live-runs"
```

Board alternative:

- open the company dashboard and org view
- confirm there is no critical agent run you are unwilling to interrupt

Safe rule:

- proceed only when `live-runs` is empty, or when every live run is explicitly judged safe to interrupt

On 2026-03-10 this matters because active goal work exists, even when the restart blocker itself is operational rather than code-level.

### 3. Confirm this is a restart-only situation

Use the restart path only when the source tree already contains the intended fix.
If the server still needs new code pulled or built, use [deploy-runbook.md](./deploy-runbook.md) instead.

## Restart Command

From a shell on the host as the `paperclip` user:

```sh
cd /home/paperclip/paperclip
./scripts/restart-local-instance.sh
```

That wrapper performs:

1. config discovery from the live instance config file
2. optional live-run preflight when API env is present
3. `sudo -n /bin/systemctl restart paperclip`
4. healthcheck wait loop
5. post-restart status output

Direct fallback command if the wrapper is unavailable:

```sh
sudo -n /bin/systemctl restart paperclip
```

## Post-Restart Checks

Run these immediately after restart:

```sh
curl -fsS http://127.0.0.1:3100/api/health
systemctl show paperclip -p ActiveState -p ActiveEnterTimestamp -p ExecMainPID
ps -fp "$(systemctl show paperclip -p ExecMainPID --value)"
```

Expected:

- health returns `status: ok`
- `ActiveEnterTimestamp` is newer than the preflight value
- `ExecMainPID` changed from the old service process
- the new main process again launches `pnpm paperclipai run --repair`

If the restart was meant to unblock runtime-isolation verification, the final check is not the health endpoint. The final check is fresh heartbeat evidence that the restarted server now exports the corrected env/workspace contract.

For the current blocker, capture fresh runs for:

- Chief of Staff
- Operations Director
- Agent Reliability Engineer

And verify:

- `AGENT_HOME` is non-empty
- `PAPERCLIP_WORKSPACE_SOURCE=agent_home`
- process cwd matches the resolved per-agent workspace

## Failure Path

If the restart does not come back healthy within about 30 seconds:

```sh
systemctl status paperclip
tail -n 200 /home/paperclip/.paperclip/instances/default/logs/server.log
```

If the service is unhealthy because the source tree is out of sync, switch to the full deploy path in [deploy-runbook.md](./deploy-runbook.md).
