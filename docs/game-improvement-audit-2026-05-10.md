# Game Improvement Audit

Date: 2026-05-10

Scope:
- Review every current game in the Lumorix Launcher catalog.
- Capture three concrete improvement or expansion ideas per game.
- Separate truly playable embedded runtime work from catalog-only mock titles.

Runtime status:
- `Echo Protocol` is currently the only in-repo embedded game runtime with real gameplay/UI code.
- The other games currently exist as polished catalog entries, install/update/move targets, and visual storefront artifacts inside the launcher mock environment.
- `game-template` is a separate workspace arcade project and the closest second playable game codepath after `Echo Protocol`.

## Lumorix DropDash

1. Add a real endless-run scoring loop with visible combo escalation, so the title is more than a launcher validation shell.
2. Add obstacle archetypes with readable telegraphs and short recovery windows to improve arcade feel.
3. Add a post-run summary with best score, streaks, and restart shortcut to reduce friction between attempts.

## game-template / Pulse Runner prototype

1. Add stronger run variety through lane events, alternating shard patterns, and occasional breather beats.
2. Add lightweight audio feedback and richer run-end stats so the template feels closer to a shippable arcade slice.
3. Add mobile/touch affordances and clearer tutorial onboarding so new projects inherit better defaults from day one.

## Echo Protocol

1. Add persistent clue-board linking, so collected evidence can be arranged instead of only read in a linear case file.
2. Add audio-reactive atmosphere and scene-level transitions, so reality shifts land harder than text changes alone.
3. Add route map and ending tracker depth, so repeat runs feel like deliberate investigation rather than blind replay.

## Frostline Courier

1. Add route-risk preview layers for weather, heat drain, and cargo fragility before dispatch.
2. Add convoy crew traits or vehicle loadout modifiers to deepen run-to-run decision making.
3. Add failure aftermath scenes or salvage decisions to make bad deliveries narratively meaningful instead of purely punitive.

## Glass Garden

1. Add a richer planting-feedback loop with growth chains, mutation triggers, and ecosystem tensions.
2. Add a stronger builder readout for light spread, soil chemistry, and adjacency bonuses.
3. Add seasonal or timed sanctuary events so long-form planning has more payoff than passive decoration.

## Graveyard Shift

1. Add ritual-preparation phases before encounters to build dread through anticipation instead of only reactive survival.
2. Add clearer audio/visual threat tells during low-light movement so fear does not become unreadability.
3. Add multi-night progression with persistent cemetery changes to strengthen long-session tension.

## Neon Circuit

1. Add stronger route-language for lane swaps, hazards, and score lines at peak speed.
2. Add burst-state feedback, near-miss bonuses, and cleaner hit-stop to improve shooter feel.
3. Add boss intro/outro presentation with short decision beats so transitions feel authored, not abrupt.

## Pocket Heist

1. Add restart-fast stealth loops with instant re-entry and clearer suspicion-state feedback.
2. Add systemic tool interactions like noise makers, temporary disguises, or improvised exits.
3. Add post-heist grading that rewards style, cleanliness, and adaptive recovery rather than success alone.

## Tempo Trashfire

1. Add more legible beat windows and instrument-layer feedback during high-chaos repair sections.
2. Add crowd-mood swings and venue-state changes that visibly respond to performance collapse or recovery.
3. Add short between-song choice beats to give runs personality and pacing relief between rhythm spikes.

## Velvet Rook

1. Add a proper suspicion map across characters so social-duel consequences stay readable over time.
2. Add clue-link presentation with stronger contradiction surfacing and inference milestones.
3. Add city-hub transitions, ambient conversation fragments, and chapter-end recaps to reinforce elegant mystery tone.

## Word Reactor

1. Add clearer heat-risk signaling and comeback tools when chain pressure gets too high.
2. Add rarer modifier words or reactor states that create real tactical pivots mid-run.
3. Add stronger end-of-round score breakdowns and mastery goals to support replayability beyond raw points.
