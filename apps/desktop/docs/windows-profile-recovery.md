# Windows Desktop recovery: v0.22.2 profile routing

Recovery baseline: official v0.22.2, `d923a5eb487a17c0a68801bba9ef0f56c81040a8`.
Fork branch: `desktop/recovery-profile-routing-v0.22.2`.

## Why this branch

The running container reports v0.22.2 / upstream d923a5eb. Match that release rather than latest main to avoid introducing another client/server contract mismatch. Fork main is separately synchronized with Nous main; it is not the recovery target.

The release includes registry-primary startup and newer pinned-draft ownership fixes, but does not validate a globally remembered Windows-only profile against a remote primary's roster. Main has the same relevant startup routing code. It also lacks our uncached-roster safeguards for background sidebar reads.

This branch carries the existing fixes from `d348a080db`, `1c5bf5d180`, `1582bdd595`, and `cebf10d264`:

- Reconcile a stale global startup profile against the selected remote roster. Preserve explicit defaults, valid same-named remote profiles, and newer user choices.
- Preserve All profiles browse mode during silent startup restoration.
- Suppress foreign-profile session, messaging, and cron background reads, including before the remote roster has loaded. Connection-pin and single-flight roster lookups.
- Preserve upstream's newer `rehomeNewChatDraft` semantics when resolving the All profiles patch conflict; update old test mocks for the newer draft-intent exports.

Only Desktop renderer code and tests change; the running container and Python RPC contracts are untouched. The old diagnostic branches remain available. Old error-logging instrumentation was not carried into this recovery branch.

## Windows PowerShell

Fully quit Desktop, including its tray instance. In PowerShell:

```powershell
Set-Location C:\AI\projects\hermes-agent-fork
git status --short --branch
```

If tracked files have local edits, stop and preserve/review them before switching; do not reset or clean. Untracked screenshots can remain unless Git reports a collision.

```powershell
git fetch origin
git switch --track origin/desktop/recovery-profile-routing-v0.22.2
npm ci
uv sync
uv run --no-sync hermes --version
uv run --no-sync hermes desktop --source --force-build --hermes-root "$PWD"
```

The switch command is for the first checkout of this new branch. On later updates, use `git switch desktop/recovery-profile-routing-v0.22.2` and `git pull --ff-only` instead.

Run dependency installation from the repository root, not apps/desktop. `uv run --no-sync` uses this checkout's environment rather than an unrelated `hermes` on PATH. Version output must name `C:\AI\projects\hermes-agent-fork` as its install directory; the custom commit will differ from the release because it contains Desktop-only fixes.

## Runtime acceptance (Windows still required)

1. Choose Marina on the container gateway, not This device. Send a short message. No `cwd_explicit` / extra-field contract error should appear.
2. Select All profiles, fully quit, and relaunch with the same command. Confirm browse mode survives.
3. Confirm no `office-evals-windows does not exist on this backend` startup banner or spurious provider setup appears on the container connection. Windows-local profiles must remain usable on This device.
4. Open a new container/Marina chat; then switch to a Windows-local profile and back. Check session ownership and first-send behavior.
5. If desired, right-click Marina on the container gateway's profile rail and Set as default, then restart again to test the explicit connection/profile startup pair.

Do not clear Desktop state or delete profiles to make the test pass. Capture desktop.log if routing still fails. A Linux build and unit tests do not establish that the Windows saved-state reproduction is fixed.
