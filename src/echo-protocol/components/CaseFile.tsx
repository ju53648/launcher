import type { CaseEntry, EchoGameState } from "../types/game";

function mutateDiary(entry: CaseEntry, state: EchoGameState): string {
  if (entry.type !== "diary") return entry.text;
  if (state.realityShiftLevel < 3) return entry.text;
  return entry.text
    .replace("Ich", "Ich (oder jemand in mir)")
    .replace("Mira", "Mira / Subjekt M")
    .replace("war", "war vielleicht");
}

function byType(entries: CaseEntry[], type: CaseEntry["type"]): CaseEntry[] {
  return entries.filter((entry) => entry.type === type).slice(-6).reverse();
}

export function CaseFile({ state }: { state: EchoGameState }) {
  const clues = byType(state.caseLog, "clue");
  const diary = byType(state.caseLog, "diary");
  const photos = byType(state.caseLog, "photo");

  return (
    <aside className="echo-case-file">
      <header>
        <p>Fallakte</p>
        <h3>Elias Voss / Echo Protocol</h3>
        <small>Reality Shift Level: {state.realityShiftLevel}</small>
      </header>

      <section>
        <h4>Hinweise</h4>
        {clues.length === 0 ? <p className="echo-empty">Noch keine Hinweise.</p> : null}
        <div className="echo-card-stack">
          {clues.map((entry) => (
            <article className="echo-card" key={entry.id}>
              <small>{entry.sceneId}</small>
              <p>{entry.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h4>Tagebuch</h4>
        {diary.length === 0 ? <p className="echo-empty">Noch keine Eintraege.</p> : null}
        <div className="echo-card-stack">
          {diary.map((entry) => (
            <article className="echo-card echo-card--diary" key={entry.id}>
              <small>{entry.sceneId}</small>
              <p>{mutateDiary(entry, state)}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h4>Fotos</h4>
        {photos.length === 0 ? <p className="echo-empty">Noch keine Fotokarten.</p> : null}
        <div className="echo-card-stack">
          {photos.map((entry) => (
            <article className="echo-card echo-card--photo" key={entry.id}>
              <small>{entry.sceneId}</small>
              <p>{entry.text}</p>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
}
