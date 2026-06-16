# Systemd Discovery

Discovery should use structured `systemctl` output where available:

- `systemctl list-units --type=service --all --no-legend --plain`
- `systemctl show <unit> --property=FragmentPath,DropInPaths,WorkingDirectory,ExecStart,Description,LoadState,ActiveState,SubState`

Candidate units are validated by `WorkingDirectory` plus `server.properties`, not by service name.

Allowed operations:
- `daemon-reload`
- `start`
- `stop`
- `restart`
- `status`
- `journalctl`

Never execute arbitrary commands from the UI.

