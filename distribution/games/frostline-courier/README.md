# Frostline Courier

This game now follows the modular Lumorix packaging style:
- runtime/: playable runtime assets, native .exe host and legacy launch script
- src/: script entrypoint and reusable modules
- scripts/: operator tooling (run + validation)
- release/: packaged artifacts

Primary runtime entry:
- runtime/FrostlineCourier.exe

Legacy bootstrap remains available:
- runtime/Launch-FrostlineCourier.ps1

Recommended dev entry:
- scripts/start-game.ps1