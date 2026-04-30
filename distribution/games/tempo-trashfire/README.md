# Tempo Trashfire

This game now follows the modular Lumorix packaging style:
- runtime/: playable runtime assets and legacy launch script
- src/: script entrypoint and reusable modules
- scripts/: operator tooling (run + validation)
- release/: packaged artifacts

Primary runtime entry remains:
- runtime/Launch-TempoTrashfire.ps1

Recommended dev entry:
- scripts/start-game.ps1
