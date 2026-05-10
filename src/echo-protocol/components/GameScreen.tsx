import { useEffect, useMemo } from "react";

import {
  ECHO_COMBOS,
  ECHO_MODE_CONFIG,
  formatEchoClock,
  getEchoChoiceTimeCost,
  getNextRank,
  getRank
} from "../data/meta";
import { SCENES, TOTAL_ENDING_COUNT, TOTAL_SCENE_COUNT, getSceneById } from "../data/scenes";
import type {
  ChoiceRequirement,
  EchoGameState,
  EchoStatKey,
  SceneChoice,
  SceneEffect
} from "../types/game";
import { ChoiceButton } from "./ChoiceButton";
import { GlitchText } from "./GlitchText";

interface PresentedChoice {
  choice: SceneChoice;
  timeCost: number;
  lockedReason: string | null;
  available: boolean;
  badges: string[];
  pathTag: string;
  crossCheckLabel: string;
  crossCheckDetail: string;
  crossCheckTone: "stable" | "warning" | "critical";
  summary: string;
  vector: string;
  tone: "stable" | "tense" | "danger";
  recommendation: string | null;
  score: number;
}

export function GameScreen({
  state,
  onPick,
  warningPulse,
  transitioning,
  onBackToMenu,
  onExit
}: {
  state: EchoGameState;
  onPick: (choice: SceneChoice) => void;
  warningPulse: string | null;
  transitioning: boolean;
  onBackToMenu: () => void;
  onExit?: () => void;
}) {
  const scene = useMemo(() => getSceneById(state.currentSceneId), [state.currentSceneId]);
  const warning = warningPulse ?? scene.warning?.(state) ?? null;
  const visitedScenes = useMemo(
    () => Object.keys(state.sceneVisits).filter((sceneId) => state.sceneVisits[sceneId] > 0),
    [state.sceneVisits]
  );
  const progressPercent = Math.round((visitedScenes.length / TOTAL_SCENE_COUNT) * 100);
  const evidenceCount = state.caseLog.length;
  const shiftPercent = Math.round((state.realityShiftLevel / 7) * 100);
  const discoveredEndings = useMemo(
    () => SCENES.filter((entry) => entry.isEnding && visitedScenes.includes(entry.id)).length,
    [visitedScenes]
  );
  const rank = useMemo(() => getRank(state.score), [state.score]);
  const nextRank = useMemo(() => getNextRank(state.score), [state.score]);
  const latestMessage = state.messages[0] ?? null;
  const breadcrumb = useMemo(() => {
    const sceneIds = [
      ...state.decisions.slice(-4).map((decision) => decision.split(":")[0]),
      state.currentSceneId
    ];
    return sceneIds.map((sceneId) => getSceneById(sceneId).title);
  }, [state.currentSceneId, state.decisions]);
  const presentedChoices = useMemo(
    () => buildPresentedChoices(scene.choices, state),
    [scene.choices, state]
  );
  const recommendedChoice = useMemo(
    () =>
      [...presentedChoices]
        .filter((entry) => entry.available)
        .sort((left, right) => right.score - left.score)[0] ?? null,
    [presentedChoices]
  );
  const presentedChoicesWithRecommendation = useMemo(
    () =>
      presentedChoices.map((entry) => ({
        ...entry,
        recommendation: recommendedChoice?.choice.id === entry.choice.id ? entry.recommendation : null
      })),
    [presentedChoices, recommendedChoice]
  );
  const sceneSignal = scene.isEnding
    ? "Endzustand fixiert"
    : state.realityShiftLevel >= 5
      ? "Signal offen"
      : state.realityShiftLevel >= 3
        ? "Muster kippt"
        : "Spur lesbar";
  const pressureTone = getPressureTone(state);
  const nextOpportunity = useMemo(() => getNextOpportunity(state), [state]);
  const endingDebrief = scene.isEnding ? buildEndingDebrief(state) : null;
  const sceneCapture = useMemo(() => buildSceneCapture(scene.id, state), [scene.id, state]);
  const evidenceConfidence = useMemo(() => buildEvidenceConfidence(state), [state]);
  const caseAudit = useMemo(() => buildCaseAudit(state), [state]);
  const workingTheory = useMemo(() => buildWorkingTheory(state), [state]);
  const runPosture = useMemo(() => buildRunPosture(state), [state]);
  const activeCrossCheck = useMemo(() => buildActiveCrossCheck(state), [state]);
  const decisionForecast = useMemo(
    () => (recommendedChoice ? buildDecisionForecast(recommendedChoice.choice, state) : null),
    [recommendedChoice, state]
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (transitioning) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (event.shiftKey && onExit) {
          onExit();
          return;
        }
        onBackToMenu();
        return;
      }

      if (event.key === "Enter") {
        const choiceToTake = recommendedChoice ?? presentedChoicesWithRecommendation.find((choice) => choice.available);
        if (choiceToTake) {
          event.preventDefault();
          onPick(choiceToTake.choice);
        }
        return;
      }

      const index = Number.parseInt(event.key, 10) - 1;
      if (Number.isNaN(index)) {
        return;
      }

      const presentedChoice = presentedChoicesWithRecommendation[index];
      if (!presentedChoice || !presentedChoice.available) {
        return;
      }

      event.preventDefault();
      onPick(presentedChoice.choice);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBackToMenu, onExit, onPick, presentedChoicesWithRecommendation, recommendedChoice, transitioning]);

  return (
    <section
      className={`echo-game-screen echo-theme--${scene.visualTheme} ${
        transitioning ? "is-transitioning" : ""
      } ${state.realityShiftLevel >= 4 ? "is-distorted" : ""}`}
    >
      <div className="echo-game-screen__veil" />
      {warning ? <div className="echo-warning">{warning}</div> : null}

      <div className="echo-status-bar">
        <StatusChip label="Mode" value={ECHO_MODE_CONFIG[state.mode].label} />
        <StatusChip
          label="Zeit"
          value={`${formatEchoClock(state.timeRemaining)} / ${formatEchoClock(state.maxTime)}`}
        />
        <StatusChip label="Rang" value={rank.title} hint={rank.summary} />
        <StatusChip
          label="Score"
          value={String(state.score)}
          hint={nextRank ? `Naechster Rang bei ${nextRank.minScore}` : "Maximalrang erreicht"}
        />
        <StatusChip label="Combos" value={`${state.unlockedCombos.length} / ${ECHO_COMBOS.length}`} />
        <StatusChip label="Enden" value={`${discoveredEndings}/${TOTAL_ENDING_COUNT}`} />
      </div>

      <header className="echo-scene-head">
        <div className="echo-scene-head__eyebrow">
          <span>{scene.location}</span>
          <span>Run {state.runCount}</span>
          <span>{progressPercent}% Falltiefe</span>
        </div>
        <h2>
          <GlitchText text={scene.title} intensity={Math.min(3, Math.max(1, state.realityShiftLevel - 1))} />
        </h2>
        <p className="echo-scene-head__objective">{scene.objective}</p>
        <p className="echo-scene-head__ambience">{scene.ambience}</p>
        <div className="echo-scene-head__meters">
          <div className="echo-shift-meter" aria-label="Reality Shift">
            <div className="echo-shift-meter__label">
              <span>Reality Shift</span>
              <strong>{state.realityShiftLevel}/7</strong>
            </div>
            <div className="echo-shift-meter__track">
              <div className="echo-shift-meter__fill" style={{ width: `${shiftPercent}%` }} />
            </div>
          </div>
          <div className={`echo-scene-signal ${scene.isEnding ? "echo-scene-signal--ending" : ""}`}>
            <span>Signalspur</span>
            <strong>{sceneSignal}</strong>
          </div>
        </div>
      </header>

      <div className="echo-scene-layout">
        <article className="echo-scene-body">
          <p>{scene.text(state)}</p>
          {scene.npcLine ? <blockquote>{scene.npcLine(state)}</blockquote> : null}
          {latestMessage ? (
            <div className={`echo-inline-message echo-inline-message--${latestMessage.type}`}>
              <small>Letzte Nachricht / {latestMessage.from}</small>
              <p>{latestMessage.text}</p>
            </div>
          ) : null}
        </article>

        <aside className="echo-scene-sidecar">
          <section className="echo-side-panel">
            <h3>Case status</h3>
            <StatBar label="Stress" value={state.stress} max={7} />
            <StatBar label="Trust" value={state.trust + 3} max={6} display={`${state.trust}/3`} />
            <StatBar label="Insight" value={state.insight} max={10} />
            <StatBar label="Access" value={state.access} max={10} />
            <StatBar label="Integrity" value={state.integrity} max={10} />
          </section>

          <section className={`echo-side-panel echo-side-panel--pressure echo-side-panel--${pressureTone}`}>
            <h3>Pressure</h3>
            <p>{describePressure(state)}</p>
            <small>{nextOpportunity.title}</small>
            <strong>{nextOpportunity.body}</strong>
          </section>

          <section className="echo-side-panel echo-side-panel--capture">
            <h3>Scene capture</h3>
            <p>{sceneCapture.summary}</p>
            <div className="echo-side-facts">
              <div>
                <small>Quelle</small>
                <strong>{sceneCapture.source}</strong>
              </div>
              <div>
                <small>Optik</small>
                <strong>{sceneCapture.lens}</strong>
              </div>
              <div>
                <small>Artefakt</small>
                <strong>{sceneCapture.artifact}</strong>
              </div>
            </div>
            <small>{sceneCapture.audio}</small>
          </section>

          <section className={`echo-side-panel echo-side-panel--evidence echo-side-panel--${evidenceConfidence.tone}`}>
            <h3>Evidence confidence</h3>
            <p>{evidenceConfidence.summary}</p>
            <small>{evidenceConfidence.label}</small>
            <strong>{evidenceConfidence.score}% lesbar</strong>
          </section>

          <section className={`echo-side-panel echo-side-panel--audit echo-side-panel--${caseAudit.tone}`}>
            <h3>Case audit</h3>
            <p>{caseAudit.title}</p>
            <small>{caseAudit.summary}</small>
            <strong>
              {caseAudit.anchorLabel} / Kontamination {caseAudit.contamination}
            </strong>
          </section>

          <section className="echo-side-panel echo-side-panel--theory">
            <h3>Working theory</h3>
            <p>{workingTheory.title}</p>
            <small>{workingTheory.lead}</small>
            <strong>{workingTheory.contradictions} Widersprueche offen</strong>
          </section>

          <section className={`echo-side-panel echo-side-panel--posture echo-side-panel--${runPosture.tone}`}>
            <h3>Run posture</h3>
            <p>{runPosture.title}</p>
            <small>{runPosture.summary}</small>
            <strong>{runPosture.axis}</strong>
          </section>

          <section className={`echo-side-panel echo-side-panel--cross echo-side-panel--${activeCrossCheck.tone}`}>
            <h3>Cross-check</h3>
            <p>{activeCrossCheck.title}</p>
            <small>{activeCrossCheck.detail}</small>
            <strong>{activeCrossCheck.resolve}</strong>
          </section>

          {state.lastActionReport ? (
            <section className="echo-side-panel echo-side-panel--report">
              <h3>Shift note</h3>
              <p>{state.lastActionReport.choiceLabel}</p>
              <small>
                {state.lastActionReport.sceneTitle} {"->"} {state.lastActionReport.nextSceneTitle} / -
                {state.lastActionReport.timeCost} min
              </small>
              <strong>{state.lastActionReport.summary}</strong>
              <small>{state.lastActionReport.evidenceNote}</small>
            </section>
          ) : null}

          {decisionForecast ? (
            <section className={`echo-side-panel echo-side-panel--forecast echo-side-panel--${decisionForecast.tone}`}>
              <h3>Decision forecast</h3>
              <span className={`echo-inline-tag echo-inline-tag--${decisionForecast.tone}`}>
                {decisionForecast.crossCheckLabel}
              </span>
              <p>{decisionForecast.headline}</p>
              <small>{decisionForecast.theoryEffect}</small>
              <strong>{decisionForecast.evidenceEffect}</strong>
              <small>{decisionForecast.crossCheckEffect}</small>
            </section>
          ) : null}

          {recommendedChoice ? (
            <section className="echo-side-panel echo-side-panel--assist">
              <h3>Operator assist</h3>
              <p>{recommendedChoice.choice.label}</p>
              <small>{recommendedChoice.recommendation}</small>
              <strong>{recommendedChoice.vector}</strong>
              <small>{recommendedChoice.crossCheckLabel}</small>
            </section>
          ) : null}

          <section className="echo-side-panel">
            <h3>Trail</h3>
            <div className="echo-trail">
              {breadcrumb.map((label, index) => (
                <span className={index === breadcrumb.length - 1 ? "is-active" : ""} key={`${label}-${index}`}>
                  {label}
                </span>
              ))}
            </div>
            <div className="echo-side-facts">
              <div>
                <small>Hinweise</small>
                <strong>{evidenceCount}</strong>
              </div>
              <div>
                <small>Szenen</small>
                <strong>{visitedScenes.length}/{TOTAL_SCENE_COUNT}</strong>
              </div>
              <div>
                <small>Entscheidungen</small>
                <strong>{state.decisions.length}</strong>
              </div>
            </div>
          </section>

          {endingDebrief ? (
            <section className="echo-side-panel echo-side-panel--debrief">
              <h3>Run debrief</h3>
              <p>{endingDebrief.verdict}</p>
              <div className="echo-side-facts">
                <div>
                  <small>Restzeit</small>
                  <strong>{formatEchoClock(state.timeRemaining)}</strong>
                </div>
                <div>
                  <small>Combos</small>
                  <strong>{state.unlockedCombos.length}</strong>
                </div>
                <div>
                  <small>Badges</small>
                  <strong>{state.unlockedAchievements.length}</strong>
                </div>
              </div>
              <small>{endingDebrief.nudge}</small>
            </section>
          ) : null}
        </aside>
      </div>

      <footer className="echo-choice-grid">
        {presentedChoicesWithRecommendation.map(
          (
            {
              choice,
              badges,
              available,
              lockedReason,
              recommendation,
              summary,
              timeCost,
              tone,
              vector,
              pathTag,
              crossCheckLabel,
              crossCheckTone
            },
            index
          ) => (
            <ChoiceButton
              badges={badges}
              choice={choice}
              crossCheckLabel={crossCheckLabel}
              crossCheckTone={crossCheckTone}
              disabled={transitioning || !available}
              index={index}
              key={choice.id}
              lockedReason={lockedReason}
              onPick={onPick}
              recommendation={recommendation}
              summary={summary}
              timeCost={timeCost}
              tone={tone}
              vector={vector}
              pathTag={pathTag}
            />
          )
        )}
      </footer>

      <div className="echo-toolbar">
        <small>
          Tasten 1-9 waehlen Optionen, <kbd>Enter</kbd> nimmt die empfohlene offene Wahl,
          <kbd>Esc</kbd> oeffnet den Startscreen,
          {onExit ? " Shift+Esc kehrt zum Launcher zurueck." : " halte die Spur zusammen."}
        </small>
        <div className="echo-toolbar__actions">
          <button className="echo-button" onClick={onBackToMenu} type="button">
            Zurueck zum Startscreen
          </button>
          {onExit ? (
            <button className="echo-button" onClick={onExit} type="button">
              Zum Launcher
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function buildPresentedChoices(choices: SceneChoice[], state: EchoGameState): PresentedChoice[] {
  return choices.map((choice) => {
    const lockedReason = getLockedReason(choice.requirements, state);
    const timeCost = getEchoChoiceTimeCost(state.mode, choice.timeCost);
    const summary = describeChoice(choice);
    const crossCheckImpact = buildChoiceCrossCheckImpact(choice, state);
    const score = scoreChoice(choice, state, timeCost, crossCheckImpact.scoreDelta);
    return {
      choice,
      timeCost,
      lockedReason,
      available: !lockedReason,
      badges: buildChoiceBadges(choice, timeCost),
      pathTag: buildChoicePathTag(choice),
      crossCheckLabel: crossCheckImpact.label,
      crossCheckDetail: crossCheckImpact.detail,
      crossCheckTone: crossCheckImpact.tone,
      summary,
      vector: buildChoiceVector(choice, state, timeCost),
      tone: getChoiceTone(choice),
      recommendation: buildRecommendation(choice, state, timeCost),
      score
    };
  });
}

function getLockedReason(requirements: ChoiceRequirement[] | undefined, state: EchoGameState) {
  if (!requirements?.length) {
    return null;
  }

  const unmet = requirements.filter((requirement) => !isRequirementMet(requirement, state));
  if (!unmet.length) {
    return null;
  }

  return `Gesperrt: ${unmet.map((requirement) => requirement.label).join(" / ")}`;
}

function isRequirementMet(requirement: ChoiceRequirement, state: EchoGameState) {
  if (requirement.type === "combo") {
    return state.unlockedCombos.includes(requirement.comboId);
  }

  if (requirement.type === "flag") {
    return Boolean(state.flags[requirement.flag]) === requirement.value;
  }

  const value =
    requirement.stat === "realityShiftLevel" ? state.realityShiftLevel : state[requirement.stat];
  if (typeof requirement.min === "number" && value < requirement.min) {
    return false;
  }
  if (typeof requirement.max === "number" && value > requirement.max) {
    return false;
  }
  return true;
}

function buildChoiceBadges(choice: SceneChoice, timeCost: number) {
  const badges: string[] = [`-${timeCost} min`];
  const shiftAmount = sumEffects(choice.effects, "shift");
  const stressAmount = sumStat(choice.effects, "stress");
  const insightAmount = sumStat(choice.effects, "insight");
  const accessAmount = sumStat(choice.effects, "access");
  const integrityAmount = sumStat(choice.effects, "integrity");
  const trustAmount = sumStat(choice.effects, "trust");
  const hasClue = choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "clue");
  const hasDiary = choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "diary");
  const hasPhoto = choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "photo");

  if (shiftAmount) badges.push(`${shiftAmount > 0 ? "+" : ""}${shiftAmount} Shift`);
  if (stressAmount) badges.push(`${stressAmount > 0 ? "+" : ""}${stressAmount} Stress`);
  if (trustAmount) badges.push(`${trustAmount > 0 ? "+" : ""}${trustAmount} Trust`);
  if (insightAmount) badges.push(`${insightAmount > 0 ? "+" : ""}${insightAmount} Insight`);
  if (accessAmount) badges.push(`${accessAmount > 0 ? "+" : ""}${accessAmount} Access`);
  if (integrityAmount) badges.push(`${integrityAmount > 0 ? "+" : ""}${integrityAmount} Integrity`);
  if (hasClue) badges.push("neuer Hinweis");
  if (hasDiary) badges.push("Tagebuchspur");
  if (hasPhoto) badges.push("Foto");

  return badges.slice(0, 5);
}

function buildRecommendation(choice: SceneChoice, state: EchoGameState, timeCost: number) {
  if (state.timeRemaining <= 60 && timeCost <= 12) {
    return "Schnelle Linie bei knapper Restzeit.";
  }
  if (state.stress >= 5 && sumStat(choice.effects, "stress") <= 0 && sumEffects(choice.effects, "shift") <= 0) {
    return "Stabilisiert Elias, bevor der Druck kippt.";
  }
  if (state.integrity <= 4 && sumStat(choice.effects, "integrity") > 0) {
    return "Stuetzt die eigene Koharenz.";
  }
  if (state.access < 3 && sumStat(choice.effects, "access") > 0) {
    return "Hilft beim Oeffnen spaeterer Systempfade.";
  }
  if (state.insight < 4 && sumStat(choice.effects, "insight") > 0) {
    return "Bringt Muster schneller an die Oberflaeche.";
  }
  if (choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "clue")) {
    return "Sichert neue Substanz fuer Combos und Endspiel.";
  }
  if (timeCost <= 11) {
    return "Effiziente Route ohne grossen Zeitverlust.";
  }
  return "Solide Linie fuer den aktuellen Build.";
}

function scoreChoice(choice: SceneChoice, state: EchoGameState, timeCost: number, crossCheckScoreDelta = 0) {
  let score = 10;
  score += sumStat(choice.effects, "insight") * 4;
  score += sumStat(choice.effects, "access") * 4;
  score += sumStat(choice.effects, "integrity") * 3;
  score += sumStat(choice.effects, "trust") * 2;
  score -= Math.max(0, sumStat(choice.effects, "stress")) * (state.stress >= 4 ? 5 : 2);
  score -= Math.max(0, sumEffects(choice.effects, "shift")) * (state.realityShiftLevel >= 4 ? 4 : 2);
  score -= Math.max(0, timeCost - 12);

  if (state.timeRemaining <= 60) {
    score += Math.max(0, 16 - timeCost) * 2;
  }
  if (state.stress >= 5 && sumStat(choice.effects, "stress") <= 0) {
    score += 10;
  }
  if (state.integrity <= 4 && sumStat(choice.effects, "integrity") > 0) {
    score += 9;
  }
  if (choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "clue")) {
    score += 5;
  }
  score += crossCheckScoreDelta;

  return score;
}

function buildChoiceVector(choice: SceneChoice, state: EchoGameState, timeCost: number) {
  const clueGain = choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "clue");
  const diaryGain = choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "diary");
  const photoGain = choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "photo");
  const accessGain = sumStat(choice.effects, "access");
  const insightGain = sumStat(choice.effects, "insight");
  const integrityGain = sumStat(choice.effects, "integrity");
  const trustGain = sumStat(choice.effects, "trust");
  const stressGain = sumStat(choice.effects, "stress");
  const shiftGain = sumEffects(choice.effects, "shift");

  if (clueGain && (insightGain > 0 || accessGain > 0)) {
    return "Haertet die Akte mit neuer Substanz und oeffnet spaetere Beweispfade.";
  }
  if (diaryGain && shiftGain > 0) {
    return "Zieht den Fall tiefer in subjektive Erinnerung und verformt die Lesart.";
  }
  if (photoGain && timeCost <= 12) {
    return "Sichert anschauliches Material, ohne die Schicht zu stark zu verbrennen.";
  }
  if (integrityGain > 0 && stressGain <= 0) {
    return "Stabilisiert Elias und schuetzt die Beweislesbarkeit fuer spaetere Knoten.";
  }
  if (trustGain > 0 && !state.flags.acceptedMira) {
    return "Verschiebt den Fall in Richtung menschlicher Bindung statt kalter Archivlogik.";
  }
  if (shiftGain >= 2 || stressGain >= 2) {
    return "Beschleunigt Erkenntnis, aber auf Kosten von Kontrolle und Widerspruchsdichte.";
  }
  if (accessGain > 0) {
    return "Drueckt die Akte in technische Tiefe und bringt gesperrte Systempfade naeher.";
  }
  if (insightGain > 0) {
    return "Macht Muster lesbarer, ohne schon voll auf die Eskalation zu setzen.";
  }
  if (timeCost <= 11) {
    return "Haelt den Fall beweglich und spart Luft fuer spaetere Schluesselknoten.";
  }
  return "Verschiebt den Fall kontrolliert, aber ohne klare neue Beweisqualitaet.";
}

function buildChoicePathTag(choice: SceneChoice) {
  const hasClue = choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "clue");
  const hasDiary = choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "diary");
  const hasPhoto = choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "photo");
  const accessGain = sumStat(choice.effects, "access");
  const insightGain = sumStat(choice.effects, "insight");
  const trustGain = sumStat(choice.effects, "trust");
  const integrityGain = sumStat(choice.effects, "integrity");
  const shiftGain = sumEffects(choice.effects, "shift");

  if (accessGain > 0) return "Archiv / Zugriff";
  if (trustGain > 0) return "Kontakt / Beziehung";
  if (integrityGain > 0 && shiftGain <= 0) return "Selbstschutz / Koharenz";
  if (hasClue || hasPhoto) return "Forensik / Spur";
  if (hasDiary || insightGain > 0) return "Muster / Innenraum";
  if (shiftGain > 0) return "Risiko / Eskalation";
  return "Routine / Abgleich";
}

function describeChoice(choice: SceneChoice) {
  if (choice.preview) {
    return choice.preview;
  }

  const shiftAmount = sumEffects(choice.effects, "shift");
  const stressAmount = sumStat(choice.effects, "stress");
  if (shiftAmount >= 2 || stressAmount >= 2) return "reisst die Stabilitaet stark auf";
  if (choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "clue")) {
    return "sichert neue Spuren fuer die Fallakte";
  }
  if (choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "diary")) {
    return "veraendert Erinnerung und innere Lesbarkeit";
  }
  if (shiftAmount === 1 || stressAmount === 1) {
    return "oeffnet eine riskantere Linie";
  }
  return "haelt den Fall vorerst kontrollierbar";
}

function getChoiceTone(choice: SceneChoice): "stable" | "tense" | "danger" {
  const shiftAmount = sumEffects(choice.effects, "shift");
  const stressAmount = sumStat(choice.effects, "stress");

  if (shiftAmount >= 2 || stressAmount >= 2) return "danger";
  if (shiftAmount === 1 || stressAmount === 1) return "tense";
  return "stable";
}

function sumEffects(effects: SceneEffect[], type: "shift") {
  return effects
    .filter((effect): effect is Extract<SceneEffect, { type: "shift" }> => effect.type === type)
    .reduce((total, effect) => total + effect.amount, 0);
}

function sumStat(effects: SceneEffect[], stat: EchoStatKey) {
  return effects
    .filter(
      (effect): effect is Extract<SceneEffect, { type: "stat" }> =>
        effect.type === "stat" && effect.stat === stat
    )
    .reduce((total, effect) => total + effect.amount, 0);
}

function getPressureTone(state: EchoGameState) {
  if (state.timeRemaining <= 45 || state.stress >= 6 || state.integrity <= 3) {
    return "critical";
  }
  if (state.timeRemaining <= 120 || state.stress >= 4 || state.realityShiftLevel >= 4) {
    return "warning";
  }
  return "stable";
}

function describePressure(state: EchoGameState) {
  if (state.timeRemaining <= 45) {
    return "Die Nacht klappt zu. Jeder weitere Umweg fuehlt sich jetzt wie Sabotage an.";
  }
  if (state.stress >= 6) {
    return "Elias driftet. Noch ein harter Treffer und klare Entscheidungen werden selten.";
  }
  if (state.integrity <= 3) {
    return "Das Selbstbild ist poroes. Die Schleife beginnt, Identitaet gegen Spuren auszutauschen.";
  }
  if (state.realityShiftLevel >= 4) {
    return "Die Muster liegen offen. Das hilft, aber es laesst sich nicht mehr sauber ignorieren.";
  }
  return "Die Lage ist angespannt, aber kontrollierbar. Noch traegt dich der Fall, statt dich zu verschlucken.";
}

function getNextOpportunity(state: EchoGameState) {
  const nextCombo = ECHO_COMBOS.find((combo) => !state.unlockedCombos.includes(combo.id));
  if (nextCombo) {
    return {
      title: "Naechste grosse Chance",
      body: `Arbeite auf ${nextCombo.title} hin. ${nextCombo.description}`
    };
  }

  const nextRank = getNextRank(state.score);
  if (nextRank) {
    return {
      title: "Rank push",
      body: `${nextRank.minScore - state.score} Score bis ${nextRank.title}.`
    };
  }

  return {
    title: "Case spiral",
    body: "Du hast die grossen Systemziele erreicht. Jetzt geht es um sauberere und schnellere Runs."
  };
}

function buildEndingDebrief(state: EchoGameState) {
  if (state.currentSceneId === "ending-redemption") {
    return {
      verdict: "Ein menschlicher Run. Du hast Beziehung ueber Kontrolle gestellt und die Schleife weich gebrochen.",
      nudge: "Fuer den naechsten Durchlauf lohnt sich jetzt ein tiefer Architektenpfad oder ein harter Speedrun."
    };
  }
  if (state.currentSceneId === "ending-architect") {
    return {
      verdict: "Meta-Sieg mit Preis. Du hast das System gelesen, aber nicht neutralisiert.",
      nudge: "Probier danach einen Run mit hoeherer Integrity, um Wissen mit weniger Selbstverlust zu tragen."
    };
  }
  if (state.currentSceneId === "ending-truth") {
    return {
      verdict: "Du hast die Wahrheit freigelegt, auch wenn sie mehr ueber Elias als ueber Mira verriet.",
      nudge: "Mit mehr Trust oder Harbor-Link landet derselbe Kern in deutlich anderen Konsequenzen."
    };
  }
  if (state.currentSceneId === "ending-erasure") {
    return {
      verdict: "Effektiv, aber brutal. Du hast die Akte geschlossen, indem du Identitaet und Erinnerung opferst.",
      nudge: "Ein stabilerer Run mit weniger Stress und mehr Insight oeffnet weichere Enden."
    };
  }
  return {
    verdict: "Die Schleife hat gewonnen, aber nicht alles behalten. Auch verlorene Runs tragen Muster weiter.",
    nudge: "Achte im naechsten Durchlauf frueher auf Kombos und spare Zeit fuer Tower oder rote Kammer."
  };
}

function buildSceneCapture(sceneId: string, state: EchoGameState) {
  const captureBySceneId: Record<
    string,
    {
      source: string;
      lens: string;
      artifact: string;
      audio: string;
      summary: string;
    }
  > = {
    "office-night": {
      source: "Desk cam + CCTV ingest",
      lens: "35mm desk overhead",
      artifact: "Fensterregen, Papierabrieb",
      audio: "Neonbrummen, leiser Regen, Heizungsmetall",
      summary: "Die Szene sollte wie eine echte Nachtschichtdokumentation wirken, nicht wie ein Tutorialraum."
    },
    "signal-trace": {
      source: "Stairwell intercept",
      lens: "Monochromer Servicefeed",
      artifact: "Bandrauschen, Dropouts",
      audio: "Kabelsirren, Funkknacken, Stimme knapp vor dem Abriss",
      summary: "Hier verkauft sich die Welt ueber ein glaubwuerdiges Abhoer-Gefuehl und technische Schwere."
    },
    "red-room": {
      source: "Recovered still / restricted",
      lens: "Zu nah, leicht verzogen",
      artifact: "Rotes Notlicht, Hall, Korn",
      audio: "Notstrom, Atem, weit entfernter Alarm",
      summary: "Die rote Kammer muss wie verbotener Beweis wirken, nicht wie Character-Selection-Art."
    },
    "relay-tower": {
      source: "Maintenance reel",
      lens: "Security wide + rack insert",
      artifact: "Feuchtigkeit, Streifen, magnetischer Drift",
      audio: "Relaisklicks, Serverluft, tiefer Stromton",
      summary: "Der Tower lebt ueber Infrastruktur und Restgeraeusche, nicht ueber Sci-Fi-Glaette."
    }
  };

  const fallback = {
    source: state.realityShiftLevel >= 4 ? "Unstable internal record" : "Case reconstruction",
    lens: state.realityShiftLevel >= 4 ? "Fehlkalibrierter Witness Feed" : "Dossier retelling",
    artifact: state.stress >= 5 ? "Mikrozittern, Fokus driftet" : "Aktenstaub, kaltes Fluoreszenzlicht",
    audio:
      state.integrity <= 4
        ? "Stimme und Raum greifen ineinander"
        : "Raumton bleibt kontrolliert, aber nicht sauber",
    summary:
      "Jede Szene braucht eine glaubwuerdige Herkunft als Fundstueck, damit der Fall realer als ein Menue wirkt."
  };

  return captureBySceneId[sceneId] ?? fallback;
}

function buildEvidenceConfidence(state: EchoGameState) {
  let score = 66 + state.insight * 3 + state.access;
  score -= Math.max(0, state.stress - 3) * 6;
  score -= Math.max(0, state.realityShiftLevel - 2) * 5;
  score -= Math.max(0, 5 - state.integrity) * 7;
  const clamped = Math.max(12, Math.min(98, score));

  if (clamped >= 76) {
    return {
      label: "Aktenlage belastbar",
      tone: "stable" as const,
      score: clamped,
      summary: "Die meisten Spuren lassen sich noch als externe Beweise lesen und sauber gegeneinander halten."
    };
  }
  if (clamped >= 52) {
    return {
      label: "Grenzwertige Lesbarkeit",
      tone: "warning" as const,
      score: clamped,
      summary: "Der Fall bleibt brauchbar, aber Erinnerung, Projektion und Beweis beginnen bereits zu verrutschen."
    };
  }
  return {
    label: "Kontaminierte Fallwahrnehmung",
    tone: "critical" as const,
    score: clamped,
    summary: "Elias liest nicht mehr nur Material. Er liest sich selbst in die Akte hinein."
  };
}

function buildCaseAudit(state: EchoGameState) {
  const clueCount = state.caseLog.filter((entry) => entry.type === "clue").length;
  const photoCount = state.caseLog.filter((entry) => entry.type === "photo").length;
  const diaryCount = state.caseLog.filter((entry) => entry.type === "diary").length;
  const witnessMessages = state.messages.filter(
    (message) => message.type === "mira" || message.type === "jonas"
  ).length;
  const mediaCount = state.seenCutscenes.length;

  const external = clueCount * 2 + photoCount + Math.max(0, state.access - 1);
  const witness = Math.max(0, state.trust) * 2 + witnessMessages + (state.flags.acceptedMira ? 2 : 0);
  const system = state.access + state.insight + mediaCount + (state.flags.openedNullArchive ? 3 : 0) + (state.flags.usedRelay ? 2 : 0);
  const contamination =
    diaryCount * 2 + state.realityShiftLevel + Math.max(0, state.stress - 2) + Math.max(0, 5 - state.integrity);

  const anchorStrength = external + system;
  if (contamination >= anchorStrength) {
    return {
      tone: "critical" as const,
      title: "Innenraum schreibt fast genauso stark mit wie der Fall selbst.",
      summary: "Gerade dominieren Shift, Stress und subjektive Muster die Auswertung spuerbar mit.",
      anchorLabel: `${anchorStrength} Ankerpunkte`,
      contamination
    };
  }

  if (witness > external && state.flags.acceptedMira) {
    return {
      tone: "warning" as const,
      title: "Die Akte haengt sichtbar an Kontakt und menschlicher Naehe.",
      summary: "Beziehung traegt den Run, braucht jetzt aber eine saubere Gegenspur als Gegenhalt.",
      anchorLabel: `${anchorStrength} Ankerpunkte`,
      contamination
    };
  }

  return {
    tone: "stable" as const,
    title: "Der Fall bleibt ueber Material und Infrastruktur lesbar.",
    summary: "Externe Spur, Zugriff und Systemrecord halten die aktuelle Theorie noch vergleichsweise sauber zusammen.",
    anchorLabel: `${anchorStrength} Ankerpunkte`,
    contamination
  };
}

function buildWorkingTheory(state: EchoGameState) {
  let title = "Der Fall ist noch als Vermisstensache lesbar.";
  let lead = "Mehr harte Hinweise sichern, bevor die Schleife Deutung ueber Material stellt.";
  let contradictions = 0;

  if (state.flags.trustedJonas && state.flags.sawBadgeMismatch) contradictions += 1;
  if (state.flags.acceptedMira && state.integrity <= 4) contradictions += 1;
  if (state.flags.architectSignal && state.flags.promisedRescue) contradictions += 1;
  if (state.realityShiftLevel >= 4 && state.insight <= 3) contradictions += 1;

  if (state.flags.openedNullArchive) {
    title = "Das Nullarchiv verschiebt den Fall von Vermisstenakte zu Serienmuster.";
    lead = "Archivpfade und ihre Wiederholungen gegeneinander halten, bevor das System Elias vereinnahmt.";
  }

  if (state.flags.architectSignal) {
    title = "Elias untersucht nicht nur Mira, sondern seine eigene Handschrift im Protokoll.";
    lead = "Mit hoher Integritaet weitergehen, sonst kippt die Erkenntnis in Selbstbestaetigung.";
  } else if (state.flags.promisedRescue) {
    title = "Mira ist wieder als Person im Raum, aber genau das verformt jede Spur.";
    lead = "Rettungslinie halten, ohne Beweis und Bindung komplett ineinander fallen zu lassen.";
  } else if (!state.flags.usedRelay && state.timeRemaining > 90) {
    lead = "Relay-Tower pruefen. Dort liegt die beste Chance, aus Beobachtung wieder Handlung zu machen.";
  }

  return { title, lead, contradictions };
}

function buildDecisionForecast(choice: SceneChoice, state: EchoGameState) {
  const crossCheckImpact = buildChoiceCrossCheckImpact(choice, state);
  const stressGain = sumStat(choice.effects, "stress");
  const shiftGain = sumEffects(choice.effects, "shift");
  const integrityGain = sumStat(choice.effects, "integrity");
  const accessGain = sumStat(choice.effects, "access");
  const insightGain = sumStat(choice.effects, "insight");
  const clueGain = choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "clue");
  const diaryGain = choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "diary");

  let tone: "stable" | "warning" | "critical" = "stable";
  let headline = "Die empfohlene Wahl bleibt innerhalb einer kontrollierbaren Ermittlungslogik.";
  let theoryEffect = "Sie stuetzt die aktuelle Arbeitshypothese, statt sie grundlos aufzureissen.";
  let evidenceEffect = "Die Beweislage bleibt brauchbar und oeffnet eher als dass sie kontaminiert.";
  let crossCheckEffect = crossCheckImpact.detail;

  if (clueGain || accessGain > 0 || insightGain > 0) {
    headline = "Diese Wahl verdichtet den Fall und bringt belastbarere Struktur in die Akte.";
    theoryEffect = "Sie gibt der aktuellen Theorie mehr Rueckhalt durch sichtbare Spuren oder Systemtiefe.";
  }

  if (diaryGain || shiftGain > 0) {
    tone = "warning";
    headline = "Diese Wahl bringt Erkenntnis, aber sie kippt die Lesart naeher an Erinnerung und Projektion.";
    theoryEffect = "Die Theorie wird persoenlicher und schaerfer, aber auch schwerer neutral zu pruefen.";
    evidenceEffect = "Die Spuren bleiben nuetzlich, nur nicht mehr voll von Elias' Innenraum zu trennen.";
  }

  if (stressGain >= 2 || shiftGain >= 2 || (state.integrity <= 4 && integrityGain <= 0)) {
    tone = "critical";
    headline = "Diese Wahl kann den Fall stark voranreissen, aber sie steigert die Kontaminationsgefahr deutlich.";
    theoryEffect = "Widersprueche werden sichtbarer, weil Elias und Akte sich gegenseitig staerker schreiben.";
    evidenceEffect = "Nutzen bleibt moeglich, doch die Verlaesslichkeit sinkt schneller als bei ruhigen Routen.";
  }

  if (integrityGain > 0 && stressGain <= 0) {
    tone = "stable";
    headline = "Diese Wahl ist ein sauberer Korrekturschritt fuer Koharenz und Lesbarkeit.";
    theoryEffect = "Sie hilft, die aktuelle Theorie tragfaehig zu halten, ohne sie zu mystifizieren.";
    evidenceEffect = "Das Material bleibt besser pruefbar und spaetere harte Knoten werden sicherer.";
  }

  if (crossCheckImpact.tone === "critical") {
    tone = "critical";
  } else if (crossCheckImpact.tone === "warning" && tone === "stable") {
    tone = "warning";
  }

  return {
    tone,
    headline,
    theoryEffect,
    evidenceEffect,
    crossCheckLabel: crossCheckImpact.label,
    crossCheckEffect
  };
}

function buildRunPosture(state: EchoGameState) {
  const clueCount = state.caseLog.filter((entry) => entry.type === "clue").length;
  const diaryCount = state.caseLog.filter((entry) => entry.type === "diary").length;
  const photoCount = state.caseLog.filter((entry) => entry.type === "photo").length;
  const forensicWeight = clueCount * 2 + photoCount + state.access;
  const empathicWeight = Math.max(0, state.trust) * 2 + (state.flags.acceptedMira ? 3 : 0);
  const unstableWeight = diaryCount * 2 + state.realityShiftLevel + Math.max(0, state.stress - 2);

  if (unstableWeight >= forensicWeight && unstableWeight >= empathicWeight) {
    return {
      tone: "critical" as const,
      title: "Grenzgaenger zwischen Beweis und Erinnerung",
      summary: "Dieser Run lebt stark von inneren Mustern, riskanten Verschiebungen und subjektiver Naehe zum Fall.",
      axis: "Achse: Muster > Distanz"
    };
  }

  if (empathicWeight >= forensicWeight) {
    return {
      tone: "warning" as const,
      title: "Bindungsorientierter Ermittler",
      summary: "Elias arbeitet ueber Vertrauen und Beziehung. Das oeffnet menschliche Wege, macht die Akte aber weicher.",
      axis: "Achse: Kontakt > Kontrolle"
    };
  }

  return {
    tone: "stable" as const,
    title: "Forensischer Nachtschichtmodus",
    summary: "Der Run stuetzt sich vor allem auf belastbare Spuren, Zugriff und strukturierte Aktenarbeit.",
    axis: "Achse: Beweis > Projektion"
  };
}

function buildActiveCrossCheck(state: EchoGameState) {
  if (state.flags.architectSignal && state.flags.promisedRescue) {
    return {
      tone: "critical" as const,
      title: "Rettungslinie gegen Autorspur",
      detail: "Der Fall will Mira retten, waehrend das Protokoll Elias als moeglichen Mitautor markiert.",
      resolve: "Archiv- und Tower-Lesart gegeneinander pruefen, bis Hilfe und Verursachung nicht dieselbe Spur bleiben."
    };
  }

  if (state.flags.acceptedMira && state.integrity <= 4) {
    return {
      tone: "warning" as const,
      title: "Mira wird greifbarer, Elias instabiler",
      detail: "Die menschliche Linie oeffnet den Fall, aber sie verwischt auch seine Distanz.",
      resolve: "Eine externe Spur oder einen Integritaetszug nachziehen, bevor Naehe die ganze Akte dominiert."
    };
  }

  if (state.flags.trustedJonas && state.flags.sawBadgeMismatch) {
    return {
      tone: "warning" as const,
      title: "Jonas-Vertrauen kollidiert mit Badge-Spur",
      detail: "Die Beziehungslinie und die formale Evidenz liefern noch kein gemeinsames Bild.",
      resolve: "Mehr harte Hinweise sammeln, bevor Jonas endgueltig als Schutz oder Risiko gelesen wird."
    };
  }

  if (state.realityShiftLevel >= 4 && state.insight <= 3) {
    return {
      tone: "warning" as const,
      title: "Shift staerker als Insight",
      detail: "Die Eskalation laeuft Elias' Auswertung davon.",
      resolve: "Muster ruhiger lesen oder Zugriff erhoehen, bevor weiterer Druck nur noch Kontamination produziert."
    };
  }

  return {
    tone: "stable" as const,
    title: "Aktuell keine harte Kreuzpruefung offen",
    detail: "Die momentane Falllesart ist fuer diese Schicht vergleichsweise sauber.",
    resolve: "Nutze das Fenster fuer Nullarchiv, Tower oder eine stabile menschliche Kontaktlinie."
  };
}

function buildChoiceCrossCheckImpact(choice: SceneChoice, state: EchoGameState) {
  const clueGain = choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "clue");
  const photoGain = choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "photo");
  const diaryGain = choice.effects.some((effect) => effect.type === "addLog" && effect.entryType === "diary");
  const accessGain = sumStat(choice.effects, "access");
  const insightGain = sumStat(choice.effects, "insight");
  const integrityGain = sumStat(choice.effects, "integrity");
  const trustGain = sumStat(choice.effects, "trust");
  const stressGain = sumStat(choice.effects, "stress");
  const shiftGain = sumEffects(choice.effects, "shift");
  const hardEvidence = clueGain || photoGain || accessGain > 0;
  const stabilizing = integrityGain > 0 || stressGain < 0;
  const destabilizing = diaryGain || shiftGain > 0 || stressGain > 0;

  if (state.flags.architectSignal && state.flags.promisedRescue) {
    if (hardEvidence && (accessGain > 0 || insightGain > 0)) {
      return {
        label: "Cross-check: prueft Schuld gegen Material",
        detail: "Die Wahl trennt Rettungslinie und Autorspur eher ueber Archiv- oder Systemsubstanz als ueber Gefuehl.",
        tone: "stable" as const,
        scoreDelta: 12
      };
    }
    if (destabilizing && !hardEvidence) {
      return {
        label: "Cross-check: verwischt Schuld und Rettung",
        detail: "Die Wahl laesst Handlung und Beteiligung wieder ineinanderlaufen, statt sie sauber gegeneinander zu testen.",
        tone: "critical" as const,
        scoreDelta: -12
      };
    }
    return {
      label: "Cross-check: haelt die Doppellesart offen",
      detail: "Die Wahl bewegt den Fall weiter, ohne die Frage nach Hilfe oder Mitverursachung klarer zu beantworten.",
      tone: "warning" as const,
      scoreDelta: 1
    };
  }

  if (state.flags.acceptedMira && state.integrity <= 4) {
    if (stabilizing || hardEvidence) {
      return {
        label: "Cross-check: holt Distanz zurueck",
        detail: "Die Wahl fuehrt eine externe Spur oder Koharenz nach und verhindert, dass Mira nur ueber Naehe lesbar bleibt.",
        tone: "stable" as const,
        scoreDelta: 11
      };
    }
    if (trustGain > 0 || destabilizing) {
      return {
        label: "Cross-check: verstaerkt Mira auf Kosten von Elias",
        detail: "Die Wahl vertieft die Bindung, waehrend Elias weiter an Pruefbarkeit verliert.",
        tone: "critical" as const,
        scoreDelta: -11
      };
    }
    return {
      label: "Cross-check: laesst die Naehe ungeklaert",
      detail: "Die Wahl laesst offen, ob menschliche Naehe die Rettung staerkt oder die Akte weiter subjektiviert.",
      tone: "warning" as const,
      scoreDelta: 0
    };
  }

  if (state.flags.trustedJonas && state.flags.sawBadgeMismatch) {
    if (hardEvidence || accessGain > 0 || insightGain > 0) {
      return {
        label: "Cross-check: testet Jonas gegen Spur",
        detail: "Die Wahl liefert mehr Material, um Beziehung und Badge-Abweichung endlich auf denselben Tisch zu zwingen.",
        tone: "stable" as const,
        scoreDelta: 10
      };
    }
    if (trustGain > 0 && !hardEvidence) {
      return {
        label: "Cross-check: bindet sich enger an Jonas",
        detail: "Die Wahl verschiebt Gewicht zur Beziehung, ohne den formalen Widerspruch wirklich mitzulesen.",
        tone: "warning" as const,
        scoreDelta: -6
      };
    }
    return {
      label: "Cross-check: laesst Jonas doppeldeutig",
      detail: "Die Wahl bewegt den Fall, aber der Widerspruch zwischen Kollegialitaet und Evidenz bleibt fast unveraendert.",
      tone: "warning" as const,
      scoreDelta: 0
    };
  }

  if (state.realityShiftLevel >= 4 && state.insight <= 3) {
    if (insightGain > 0 || accessGain > 0 || stabilizing) {
      return {
        label: "Cross-check: bremst den Shift auf Lesbarkeit",
        detail: "Die Wahl holt Auswertung oder Koharenz nach, damit Eskalation nicht weiter unkommentiert ueber den Fall rollt.",
        tone: "stable" as const,
        scoreDelta: 10
      };
    }
    if (destabilizing) {
      return {
        label: "Cross-check: fuettert Eskalation ohne Auswertung",
        detail: "Die Wahl beschleunigt subjektive Muster, obwohl Elias noch zu wenig Halt fuer saubere Deutung hat.",
        tone: "critical" as const,
        scoreDelta: -10
      };
    }
    return {
      label: "Cross-check: haelt den Druck in der Schwebe",
      detail: "Die Wahl verbessert die Lesbarkeit nicht spuerbar, reisst die Spur aber auch nicht sofort weiter auf.",
      tone: "warning" as const,
      scoreDelta: 0
    };
  }

  if (hardEvidence) {
    return {
      label: "Cross-check: nutzt das stabile Fenster",
      detail: "Die Wahl verwendet die ruhige Schicht fuer belastbares Material statt fuer blosse Stimmung.",
      tone: "stable" as const,
      scoreDelta: 6
    };
  }

  if (trustGain > 0 || diaryGain) {
    return {
      label: "Cross-check: oeffnet eine weichere Linie",
      detail: "Die Wahl setzt auf Beziehung oder Innenraum, waehrend die Lage noch vergleichsweise kontrollierbar bleibt.",
      tone: "warning" as const,
      scoreDelta: 1
    };
  }

  return {
    label: "Cross-check: haelt die Schicht neutral",
    detail: "Die Wahl verschiebt den Fall kontrolliert, ohne gerade eine harte Widerspruchslage anzugehen.",
    tone: "stable" as const,
    scoreDelta: 2
  };
}

function StatusChip({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="echo-status-chip">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function StatBar({
  label,
  value,
  max,
  display
}: {
  label: string;
  value: number;
  max: number;
  display?: string;
}) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="echo-stat-bar">
      <div className="echo-stat-bar__label">
        <span>{label}</span>
        <strong>{display ?? `${value}/${max}`}</strong>
      </div>
      <div className="echo-stat-bar__track">
        <div className="echo-stat-bar__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
