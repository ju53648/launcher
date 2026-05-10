import { useEffect, useMemo, useState } from "react";

import { ECHO_MODE_CONFIG, formatEchoClock } from "../data/meta";
import type { EchoMode, EchoRunSummary } from "../types/game";
import { TOTAL_ENDING_COUNT, TOTAL_SCENE_COUNT, getSceneById } from "../data/scenes";
import { GlitchText } from "./GlitchText";

const MODE_ORDER: EchoMode[] = ["normal", "hard", "speedrun"];

export function StartScreen({
  hasSave,
  saveSummary,
  onExit,
  onNewGame,
  onContinue,
  onReset
}: {
  hasSave: boolean;
  saveSummary: {
    sceneTitle: string;
    updatedAt: string;
    decisions: number;
    realityShiftLevel: number;
    mode: EchoMode;
    score: number;
    timeRemaining: number;
    runCount: number;
    completedRuns: EchoRunSummary[];
  } | null;
  onExit?: () => void;
  onNewGame: (mode: EchoMode) => void;
  onContinue: () => void;
  onReset: () => void;
}) {
  const [selectedMode, setSelectedMode] = useState<EchoMode>("normal");
  const careerStats = useMemo(
    () => buildCareerStats(saveSummary?.completedRuns ?? []),
    [saveSummary?.completedRuns]
  );
  const loopMemory = useMemo(
    () => buildLoopMemoryArchive(saveSummary?.completedRuns ?? []),
    [saveSummary?.completedRuns]
  );
  const endingArchive = useMemo(
    () => buildEndingArchive(saveSummary?.completedRuns ?? []),
    [saveSummary?.completedRuns]
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter") {
        event.preventDefault();
        if (hasSave) {
          onContinue();
          return;
        }
        onNewGame(selectedMode);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasSave, onContinue, onNewGame, selectedMode]);

  return (
    <section className="echo-start-screen">
      <div className="echo-start-screen__backdrop" />
      <div className="echo-start-screen__noise" />

      <div className="echo-start-screen__panel">
        <div className="echo-start-screen__hero">
          <div>
            <p className="echo-kicker">Psychological mystery / loop thriller</p>
            <h2>
              <GlitchText text="Echo Protocol" intensity={2} />
            </h2>
            <p className="echo-start-screen__lede">
              Elias Voss jagt die verschwundene Mira Hartmann durch Akten, Funkrauschen und eine
              Nacht, die offenbar schon oefter passiert ist als sie duerfte.
            </p>
          </div>
          <div className="echo-start-screen__facts">
            <span>{TOTAL_SCENE_COUNT} Szenen</span>
            <span>{TOTAL_ENDING_COUNT} Enden</span>
            <span>Combos, Ranks, Live-Signale</span>
            <span>Lokaler Spielstand</span>
          </div>
        </div>

        <div className="echo-mode-grid">
          {MODE_ORDER.map((mode) => {
            const config = ECHO_MODE_CONFIG[mode];
            const selected = selectedMode === mode;
            return (
              <button
                className={`echo-mode-card ${selected ? "is-selected" : ""}`}
                key={mode}
                onClick={() => setSelectedMode(mode)}
                type="button"
              >
                <span>{config.label}</span>
                <strong>{config.title}</strong>
                <small>{config.description}</small>
                <em>{formatEchoClock(config.maxTime)} Gesamtzeit</em>
              </button>
            );
          })}
        </div>

        {saveSummary ? (
          <div className="echo-save-panel">
            <div className="echo-save-panel__header">
              <strong>Letzter Fallstand</strong>
              <span>{new Date(saveSummary.updatedAt).toLocaleString("de-DE")}</span>
            </div>
            <div className="echo-save-panel__grid">
              <div>
                <small>Szene</small>
                <strong>{saveSummary.sceneTitle}</strong>
              </div>
              <div>
                <small>Mode</small>
                <strong>{ECHO_MODE_CONFIG[saveSummary.mode].label}</strong>
              </div>
              <div>
                <small>Score</small>
                <strong>{saveSummary.score}</strong>
              </div>
              <div>
                <small>Restzeit</small>
                <strong>{formatEchoClock(saveSummary.timeRemaining)}</strong>
              </div>
              <div>
                <small>Shift</small>
                <strong>{saveSummary.realityShiftLevel}/7</strong>
              </div>
              <div>
                <small>Run</small>
                <strong>{saveSummary.runCount}</strong>
              </div>
            </div>
          </div>
        ) : null}

        {careerStats ? (
          <section className="echo-career-board">
            <div className="echo-career-board__header">
              <strong>Career snapshot</strong>
              <span>{careerStats.totalRuns} archivierte Durchlaeufe</span>
            </div>
            <div className="echo-career-board__grid">
              <div>
                <small>Entdeckte Enden</small>
                <strong>{careerStats.endingCount}</strong>
              </div>
              <div>
                <small>Bestscore</small>
                <strong>{careerStats.bestScore}</strong>
              </div>
              <div>
                <small>Beste Restzeit</small>
                <strong>{formatEchoClock(careerStats.bestTimeRemaining)}</strong>
              </div>
              <div>
                <small>Aktivster Mode</small>
                <strong>{careerStats.favoriteMode}</strong>
              </div>
            </div>
          </section>
        ) : null}

        {loopMemory.length ? (
          <section className="echo-loop-memory">
            <div className="echo-loop-memory__header">
              <strong>Loop memory</strong>
              <span>{loopMemory.length} Echo-Fragmente aus frueheren Enden</span>
            </div>
            <div className="echo-loop-memory__grid">
              {loopMemory.map((memory) => (
                <article className="echo-loop-memory__card" key={memory.id}>
                  <small>{memory.kicker}</small>
                  <strong>{memory.title}</strong>
                  <p>{memory.body}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {endingArchive.length ? (
          <section className="echo-ending-archive">
            <div className="echo-ending-archive__header">
              <strong>Enden-Archiv</strong>
              <span>{endingArchive.length} unterschiedliche Abschlusslinien</span>
            </div>
            <div className="echo-ending-archive__grid">
              {endingArchive.map((entry) => (
                <article className="echo-ending-chip" key={entry.endingSceneId}>
                  <small>{entry.latestMode}</small>
                  <strong>{entry.endingTitle}</strong>
                  <p>
                    Bestscore {entry.bestScore} / bestaetigt in {entry.runCount} Run{entry.runCount === 1 ? "" : "s"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {saveSummary?.completedRuns.length ? (
          <section className="echo-run-history">
            <div className="echo-run-history__header">
              <strong>Abschluss-Dossiers</strong>
              <span>{saveSummary.completedRuns.length} gespeicherte Durchlaeufe</span>
            </div>
            <div className="echo-run-history__grid">
              {saveSummary.completedRuns.slice(0, 4).map((run) => (
                <article className="echo-run-card" key={run.id}>
                  <small>
                    Run {run.runCount} / {ECHO_MODE_CONFIG[run.mode].label}
                  </small>
                  <strong>{run.endingTitle}</strong>
                  <p>
                    Score {run.score} / Restzeit {formatEchoClock(run.timeRemaining)}
                  </p>
                  <em>
                    {run.combosUnlocked} Combos / {run.achievementsUnlocked} Badges
                  </em>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className="echo-actions">
          <button className="echo-button echo-button--primary" onClick={() => onNewGame(selectedMode)} type="button">
            Neuer Durchlauf ({ECHO_MODE_CONFIG[selectedMode].label})
          </button>
          <button className="echo-button" disabled={!hasSave} onClick={onContinue} type="button">
            Fortsetzen
          </button>
          <button className="echo-button echo-button--danger" onClick={onReset} type="button">
            Reset Spielstand
          </button>
          {onExit ? (
            <button className="echo-button" onClick={onExit} type="button">
              Zum Launcher
            </button>
          ) : null}
        </div>
        <p className="echo-start-screen__hint">
          Schnellstart: <kbd>Enter</kbd> fuer Fortsetzen oder einen neuen Durchlauf im gewaehlten Modus
        </p>
      </div>
    </section>
  );
}

function buildCareerStats(runs: EchoRunSummary[]) {
  if (!runs.length) {
    return null;
  }

  const endingCount = new Set(runs.map((run) => run.endingSceneId)).size;
  const bestScore = Math.max(...runs.map((run) => run.score));
  const bestTimeRemaining = Math.max(...runs.map((run) => run.timeRemaining));
  const modeCounter = runs.reduce<Record<EchoMode, number>>(
    (accumulator, run) => {
      accumulator[run.mode] += 1;
      return accumulator;
    },
    { normal: 0, hard: 0, speedrun: 0 }
  );
  const favoriteMode =
    Object.entries(modeCounter).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "normal";

  return {
    totalRuns: runs.length,
    endingCount,
    bestScore,
    bestTimeRemaining,
    favoriteMode: ECHO_MODE_CONFIG[favoriteMode as EchoMode].label
  };
}

function buildEndingArchive(runs: EchoRunSummary[]) {
  const endingMap = new Map<
    string,
    { endingSceneId: string; endingTitle: string; bestScore: number; runCount: number; latestMode: string }
  >();

  for (const run of runs) {
    const current = endingMap.get(run.endingSceneId);
    if (!current) {
      endingMap.set(run.endingSceneId, {
        endingSceneId: run.endingSceneId,
        endingTitle: getSceneById(run.endingSceneId).title,
        bestScore: run.score,
        runCount: 1,
        latestMode: ECHO_MODE_CONFIG[run.mode].label
      });
      continue;
    }

    current.bestScore = Math.max(current.bestScore, run.score);
    current.runCount += 1;
    current.latestMode = ECHO_MODE_CONFIG[run.mode].label;
  }

  return [...endingMap.values()].sort((left, right) => right.bestScore - left.bestScore).slice(0, 4);
}

function buildLoopMemoryArchive(runs: EchoRunSummary[]) {
  const discoveredEndings = new Set(runs.map((run) => run.endingSceneId));
  const memories = [];

  if (discoveredEndings.has("ending-truth")) {
    memories.push({
      id: "truth-memory",
      kicker: "Originalprotokoll",
      title: "Die Stimme ist schon bekannt",
      body: "Ein Teil von Elias weiss bereits, dass irgendwo ein Band mit seiner eigenen Aussage existiert."
    });
  }
  if (discoveredEndings.has("ending-redemption")) {
    memories.push({
      id: "redemption-memory",
      kicker: "Red line",
      title: "Mira kennt einen Ausgang",
      body: "Mindestens ein Durchlauf hat gezeigt, dass Beziehung die Schleife weicher brechen kann als Kontrolle."
    });
  }
  if (discoveredEndings.has("ending-erasure")) {
    memories.push({
      id: "erasure-memory",
      kicker: "Selbstloeschung",
      title: "Abwesenheit hinterlaesst Ordnung",
      body: "Das Archiv hat bereits bewiesen, wie sauber es Personen aus der Wirklichkeit sortieren kann."
    });
  }
  if (discoveredEndings.has("ending-architect")) {
    memories.push({
      id: "architect-memory",
      kicker: "Architect signal",
      title: "Der Autor war schon hier",
      body: "Die Schleife traegt Elias nicht nur als Opfer oder Ermittler, sondern auch als moeglichen Konstrukteur."
    });
  }
  if (discoveredEndings.has("ending-loop")) {
    memories.push({
      id: "loop-memory",
      kicker: "Echo-Schleife",
      title: "Der Anfang erinnert sich",
      body: "Selbst gescheiterte Durchlaeufe hinterlassen ein Gefuehl von Wiedererkennen im ersten Zimmer."
    });
  }

  return memories;
}
