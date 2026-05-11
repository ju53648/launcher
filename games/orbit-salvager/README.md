# Orbit Salvager

Eigenstaendiger neuer 3D-Arcade-Prototyp im Lumorix-Workspace. Dieses Projekt ist
bewusst von `echo-protocol` und `lumorix-dropdash` getrennt.

## Aktueller Kern

- Drei-Spur-Salvage-Run in 3D mit Three.js
- Sammelbare Signal-Kerne fuer Score und Pulse-Aufladung
- Hindernisse, die mit einem Signal-Pulse kurzzeitig neutralisiert werden koennen
- Zwei Hindernistypen: stationaere Minen und Sweepers mit seitlicher Drift
- Rotierende Sektoren mit Missionszielen und Belohnungen
- Sektor-Belohnungen als echte Run-Modifikatoren: Magnet, Schildreserve und Overdrive
- Combo-System fuer riskantere, belohnende Runs
- Ein eigener Boss-Sektor mit `Rift Leviathan`, Telegraph-Lanes und Pulse-Hit-Fenstern
- Ein zweiter Spezialsektor mit `Signal Eclipse`, Blackout-Wellen und sicheren Spurfenstern
- Persistentes Hangar-Deck mit Salvage-Credits, freischaltbaren Rigs und verschiedenen Run-Charakteren
- Mid-Run-Drafts mit echten Build-Entscheidungen zwischen Sektoren
- Seltene und legendaere Overclocks samt Reroll-Tokens fuer echte High-Roll-Runs
- Prozeduraler Audio-Director und cineastische Sektor-Stinger ohne externe Audio-Assets
- Sichtbare Platzhalterflaechen fuer spaetere Videos, FX oder echte 3D-Modelle

## Priorisierte Naechste Ideen

- Richtige GLB-Schiffsmodelle und eine cineastische Boss-Inszenierung auf die bestehenden Platzhalter legen
- Noch mehr Event-Sektoren mit unterschiedlichen Eskalationsmustern rund um Eclipse und Leviathan
- Mehr Draft-Archetypen, seltene Run-Upgrades und Synergien ueber die erste Overclock-Palette hinaus
- Noch staerkere finale Audio-/FX-Layer mit echten Assets ueber den prozeduralen Director hinaus
- Weitere Meta-Progression ueber die neuen Hangar-Loadouts hinaus

## Lokal testen

```bash
npm install
npm run build
```
