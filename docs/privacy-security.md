# Privacy and Security Notes

Lumorix Launcher is designed as a local-first desktop product.

## What Is Not Included

- No login system.
- No user account.
- No telemetry.
- No analytics package.
- No crash upload service.
- No background cloud sync.

## Network Boundaries

Network access should only happen for:

- Explicit launcher update checks.
- Explicit or configured game manifest checks.
- Game package downloads.

Each of these concerns is separated in Rust modules so future networking code remains reviewable.

## Filesystem Boundaries

The Rust core validates library paths, writes marker files, blocks unsafe manifest paths and prevents uninstall from deleting paths outside the owning library. Zip extraction uses safe enclosed paths and SHA-256 verification for remote archives.
