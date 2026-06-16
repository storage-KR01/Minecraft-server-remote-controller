# Git Backup Design

The disconnect workflow runs against the discovered server working directory.

Steps:
1. Stop the systemd service.
2. Confirm inactive state.
3. Run `git rev-parse --show-toplevel`.
4. Run `git add .` at repository root.
5. Run `git status --porcelain`.
6. If changes exist, commit with `DD-MM-YYYY HH:mm`.
7. Detect current branch with `git branch --show-current`.
8. Detect upstream or remote dynamically.
9. Push to detected branch and remote.
10. Audit all steps and return result.

No branch or remote is hardcoded.

