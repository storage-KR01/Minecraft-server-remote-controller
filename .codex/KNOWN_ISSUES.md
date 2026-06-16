# Known Issues

- No runnable implementation existed at bootstrap.
- Host systemd access from containers requires careful production design and may need a constrained helper service.
- `ripgrep` is not installed on this machine; fallback file search uses `find`.
- Discovery currently returns an empty list until systemd inspection is implemented.
- npm audit reports dependency advisories: backend has 47 advisories, frontend has 2 moderate advisories. These need review before production release.
- Docker stack uses a local ignored `.env` generated from `.env.example`; secrets are placeholders and must be changed before real deployment.
- CSRF protection and auth rate limiting are not implemented yet.
- Auth has no automated tests yet.
