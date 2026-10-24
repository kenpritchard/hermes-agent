# Desktop integration with Nous main — 2026-10-24

Branch: `desktop/integration-nous-main-20261024`.
Upstream baseline: `4dcef215cfe4` (Nous main fetched October 24).
Fallback: `desktop/recovery-profile-routing-v0.22.2` remains unchanged at `9c6b233620`.

## What this carries

- Startup-profile reconciliation against the selected remote gateway's roster.
- Cached and uncached remote-roster guards for background sidebar, messaging, and cron reads.
- Upstream's `restore` option for All profiles persistence, replacing our duplicate `fromBoot` option.
- Recovery branch's pinned-draft preservation in both normal and already-live restoration paths.

This is a current-main integration, not a v0.22.2-compatible recovery build. Upstream has migrated Desktop local execution to the canonical gateway. Match the local Windows runtime to this checkout; remote compatibility still needs a real smoke test against the updated container. The running container was not modified by this integration.

## Windows checkout

Fully quit Desktop, including the tray instance. In PowerShell at `C:\AI\projects\hermes-agent-fork`, inspect `git status --short --branch` first. Stop if tracked local changes need preserving; do not reset or clean.

```powershell
git fetch origin
git switch --track origin/desktop/integration-nous-main-20261024
npm ci
```

Follow this checkout's current `CONTRIBUTING.md` / package-management development setup for Python dependencies; do not assume the older recovery branch's `uv sync` procedure is still current. Launch Desktop from this checkout with source rebuild enabled. On subsequent updates, switch to the existing local integration branch and use `git pull --ff-only`.

## Verification and remaining acceptance

Linux verification: startup-profile and sidebar regressions, broader renderer store tests, full Desktop typecheck, Desktop source build, changed-file ESLint/Prettier, and code-health ratchet against Nous main. Dependencies installed from the exact lockfile with npm lifecycle scripts disabled; no packaged Windows installer or native Windows smoke test was run.

Windows acceptance remains: first message on container/Marina; All profiles survives restart; no Windows-only-profile startup banner on the container; local → remote → local switching; pinned new-chat route remains intact. Use the acceptance checklist in `windows-profile-recovery.md`, but not its historical branch/runtime setup instructions. Do not delete Desktop state or profiles to make tests pass.

PR #130949 remains separate and unchanged: https://github.com/NousResearch/hermes-agent/pull/130949
