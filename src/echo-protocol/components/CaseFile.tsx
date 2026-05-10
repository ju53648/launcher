import { useDeferredValue, useEffect, useMemo, useState } from "react";

import {
  ECHO_MODE_CONFIG,
  formatEchoClock,
  getAchievementById,
  getComboById,
  getNextRank,
  getRank
} from "../data/meta";
import { getCutsceneById } from "../data/cutscenes";
import { getSceneById } from "../data/scenes";
import type { CaseEntry, EchoGameState } from "../types/game";

type CaseTab =
  | "all"
  | "audit"
  | "reel"
  | "shift"
  | "leads"
  | "cross"
  | "theory"
  | "threads"
  | "map"
  | "feed"
  | "combos"
  | "achievements"
  | "clue"
  | "diary"
  | "photo";

function mutateDiary(entry: CaseEntry, state: EchoGameState): string {
  if (entry.type !== "diary") return entry.text;
  if (state.realityShiftLevel < 3) return entry.text;
  return entry.text
    .replace("Ich", "Ich (oder etwas in mir)")
    .replace("Mira", "Mira / Subjekt M")
    .replace("war", "war vielleicht");
}

function byType(entries: CaseEntry[], type: CaseEntry["type"]): CaseEntry[] {
  return entries.filter((entry) => entry.type === type).slice(-8).reverse();
}

function getEvidenceProfile(
  state: EchoGameState,
  kind: "clue" | "diary" | "photo" | "media" | "message"
) {
  let score = 62;
  score += state.insight * 3;
  score += state.access;
  score += kind === "clue" ? 8 : 0;
  score += kind === "photo" ? 4 : 0;
  score -= kind === "diary" ? state.realityShiftLevel * 4 : 0;
  score -= kind === "message" ? Math.max(0, state.realityShiftLevel - 2) * 3 : 0;
  score -= kind === "media" ? Math.max(0, state.realityShiftLevel - 3) * 2 : 0;
  score -= Math.max(0, state.stress - 3) * 4;
  score -= Math.max(0, 5 - state.integrity) * 5;

  const clamped = Math.max(18, Math.min(96, score));
  if (clamped >= 78) {
    return { label: "Hohe Verlaesslichkeit", tone: "solid" as const, score: clamped };
  }
  if (clamped >= 56) {
    return { label: "Brauchbar, aber fragil", tone: "fragile" as const, score: clamped };
  }
  return { label: "Kontaminiert / subjektiv", tone: "contaminated" as const, score: clamped };
}

function buildWorkingTheory(state: EchoGameState) {
  const contradictions: string[] = [];

  if (state.flags.trustedJonas && state.flags.sawBadgeMismatch) {
    contradictions.push("Jonas wird vertraut, obwohl seine Badge-Spur gegen ihn spricht.");
  }
  if (state.flags.acceptedMira && state.integrity <= 4) {
    contradictions.push("Miras Naehe hilft emotional, macht den Fall aber subjektiver.");
  }
  if (state.flags.architectSignal && state.flags.promisedRescue) {
    contradictions.push("Elias will retten, koennte aber selbst Teil des Mechanismus sein.");
  }
  if (state.realityShiftLevel >= 4 && state.insight <= 3) {
    contradictions.push("Die Muster kippen schneller, als Elias sie belastbar lesen kann.");
  }

  let title = "Mira ist verschwunden, aber das Gebaeude verschweigt den Grund.";
  let summary =
    "Der Fall wirkt noch wie eine klassische Vermisstensache mit interner Vertuschung und vereinzelten Signalfehlern.";

  if (state.flags.openedNullArchive) {
    title = "Mira ist Teil einer tieferen Serienakte innerhalb des Nullarchivs.";
    summary =
      "Das Verschwinden ist nicht isoliert. Die geloeschte Archivschicht deutet auf wiederholte Echo-Faelle und ein aktives internes System.";
  }

  if (state.flags.architectSignal) {
    title = "Der Fall untersucht nicht nur Mira, sondern auch Elias als moeglichen Autor der Schleife.";
    summary =
      "Die Akte liest Elias inzwischen mit. Jede neue Spur prueft nicht nur das Verbrechen, sondern auch den Ermittler als Quelle.";
  }

  if (state.flags.promisedRescue && !state.flags.architectSignal) {
    title = "Mira lebt als erreichbare Person im Fall und nicht nur als Datensatz.";
    summary =
      "Die Rettungslinie macht aus der Akte wieder einen menschlichen Einsatz. Genau dadurch steigen aber emotionale Verzerrungen.";
  }

  let lead = "Mehr harte Hinweise sichern, bevor weitere innere oder systemische Signale den Fall ueberlagern.";
  if (!state.flags.openedNullArchive && state.access >= 3 && state.insight >= 3) {
    lead = "Nullarchiv ansteuern. Die Voraussetzungen fuer eine tiefere Archivspur sind jetzt stark genug.";
  } else if (!state.flags.usedRelay && state.timeRemaining > 90) {
    lead = "Tower-/Relay-Linie pruefen, um den Fall vom reinen Spiegel zum aktiven Sender zu machen.";
  } else if (!state.flags.acceptedMira && state.trust >= 1) {
    lead = "Mira-Kontakt staerken. Ein menschlicher Kanal kann spaetere Entscheidungen sauberer verankern.";
  } else if (state.integrity <= 4) {
    lead = "Integritaet stabilisieren, sonst werden selbst gute Spuren nur noch subjektiv lesbar.";
  }

  return {
    title,
    summary,
    lead,
    contradictions
  };
}

function buildLeadBoard(state: EchoGameState) {
  const leads = [
    {
      id: "nullarchive",
      title: "Nullarchiv aufbrechen",
      status: state.flags.openedNullArchive ? "Abgeschlossen" : state.access >= 3 && state.insight >= 3 ? "Prioritaet hoch" : "Noch vorbereiten",
      detail: state.flags.openedNullArchive
        ? "Die geloeschte Serienebene wurde bereits geoeffnet und hat den Fall vertieft."
        : state.access >= 3 && state.insight >= 3
          ? "Zugang und Musterlese reichen jetzt, um die tiefere Archivspur glaubwuerdig zu verfolgen."
          : "Es fehlen noch Zugriff oder belastbare Muster, bevor das Archiv mehr als nur Geruecht bleibt.",
      tone: state.flags.openedNullArchive ? "cold" : state.access >= 3 && state.insight >= 3 ? "hot" : "warm",
      priority: state.flags.openedNullArchive ? 1 : state.access >= 3 && state.insight >= 3 ? 5 : 3
    },
    {
      id: "mira",
      title: "Mira als reale Kontaktlinie pruefen",
      status: state.flags.acceptedMira ? "Kontakt offen" : state.trust >= 1 ? "Ansatz vorhanden" : "Noch fern",
      detail: state.flags.promisedRescue
        ? "Die Rettungslinie steht. Jetzt muss geklaert werden, ob Bindung die Wahrheit staerkt oder verformt."
        : state.flags.acceptedMira
          ? "Mira ist nicht mehr nur Datensatz. Jede weitere Entscheidung macht sie glaubwuerdiger oder gefaehrlicher."
          : "Ohne eine menschliche Lesart bleibt der Fall leichter kontrollierbar, aber auch kaelter und enger.",
      tone: state.flags.promisedRescue ? "hot" : state.flags.acceptedMira || state.trust >= 1 ? "warm" : "cold",
      priority: state.flags.promisedRescue ? 4 : state.trust >= 1 ? 3 : 2
    },
    {
      id: "relay",
      title: "Relay Tower als aktive Spur",
      status: state.flags.usedRelay ? "Beruehrt" : state.timeRemaining > 90 ? "Fenster offen" : "Zeitkritisch",
      detail: state.flags.usedRelay
        ? "Der Tower reagiert bereits. Weitere Tower-Wege werden persoenlicher und instabiler."
        : state.timeRemaining > 90
          ? "Noch ist genug Schicht uebrig, um aus Beobachtung wieder Handlung zu machen."
          : "Wenn du den Tower noch willst, muss der Umweg jetzt bewusst sein.",
      tone: state.flags.usedRelay ? "warm" : state.timeRemaining > 90 ? "hot" : "warning",
      priority: state.flags.usedRelay ? 3 : state.timeRemaining > 90 ? 4 : 2
    },
    {
      id: "integrity",
      title: "Elias stabil halten",
      status: state.integrity <= 4 ? "Akut" : state.stress >= 5 ? "Unter Druck" : "Kontrolliert",
      detail: state.integrity <= 4
        ? "Selbst gute Spuren drohen subjektiv zu kippen, wenn Elias weiter an Koharenz verliert."
        : state.stress >= 5
          ? "Noch traegt die Akte, aber der naechste harte Treffer wird Lesbarkeit kosten."
          : "Die aktuelle Falllesart ist brauchbar genug, um riskantere Spuren voruebergehend zu tragen.",
      tone: state.integrity <= 4 ? "hot" : state.stress >= 5 ? "warm" : "cold",
      priority: state.integrity <= 4 ? 5 : state.stress >= 5 ? 4 : 1
    }
  ];

  return leads.sort((left, right) => right.priority - left.priority).slice(0, 4);
}

function buildCrossChecks(state: EchoGameState) {
  const checks = [
    {
      id: "jonas-badge",
      open: state.flags.trustedJonas && state.flags.sawBadgeMismatch,
      title: "Jonas vertraut / Badge widerspricht",
      detail: "Die persoenliche Linie und die formale Spur zeigen in unterschiedliche Richtungen.",
      resolve: "Mehr harte Forensik oder Archivzugriff sammeln, bevor Jonas endgueltig als Schutz oder Risiko gelesen wird.",
      tone: "warning"
    },
    {
      id: "mira-integrity",
      open: state.flags.acceptedMira && state.integrity <= 4,
      title: "Mira naeher / Elias poroes",
      detail: "Der Kontakt wirkt menschlich echt, aber genau dadurch verliert die Akte Distanz.",
      resolve: "Koharenz stabilisieren oder eine zweite externe Spur sichern, damit Mira nicht nur ueber Naehe gelesen wird.",
      tone: "hot"
    },
    {
      id: "architect-rescue",
      open: state.flags.architectSignal && state.flags.promisedRescue,
      title: "Rettungslinie / Autorspur",
      detail: "Elias will retten, obwohl der Fall ihn zugleich als moeglichen Mitverursacher fuehrt.",
      resolve: "Archiv- und Tower-Linien gegeneinander halten, bis Handlung und Schuld nicht mehr dieselbe Hypothese sind.",
      tone: "hot"
    },
    {
      id: "shift-insight",
      open: state.realityShiftLevel >= 4 && state.insight <= 3,
      title: "Shift hoch / Insight zu flach",
      detail: "Die Muster eskalieren schneller, als Elias sie sauber in belastbare Form bringen kann.",
      resolve: "Eine ruhigere Muster- oder Zugriffslinie suchen, bevor weiterer Druck nur noch Kontamination erzeugt.",
      tone: "warning"
    }
  ];

  const openChecks = checks.filter((check) => check.open);
  if (openChecks.length) {
    return openChecks;
  }

  return [
    {
      id: "no-active-contradiction",
      open: false,
      title: "Aktuell keine harte Kreuzpruefung offen",
      detail: "Das Fallbild ist gerade ungewoehnlich sauber fuer diese Schicht.",
      resolve: "Nutze die Stabilitaet, um Nullarchiv, Tower oder eine menschliche Kontaktlinie gezielt zu vertiefen.",
      tone: "cold"
    }
  ];
}

function buildCaseAudit(state: EchoGameState) {
  const clueCount = state.caseLog.filter((entry) => entry.type === "clue").length;
  const photoCount = state.caseLog.filter((entry) => entry.type === "photo").length;
  const diaryCount = state.caseLog.filter((entry) => entry.type === "diary").length;
  const messageWitnessCount = state.messages.filter(
    (message) => message.type === "mira" || message.type === "jonas"
  ).length;
  const mediaCount = state.seenCutscenes.length;

  const external = clueCount * 2 + photoCount + Math.max(0, state.access - 1);
  const witness = Math.max(0, state.trust) * 2 + messageWitnessCount + (state.flags.acceptedMira ? 2 : 0);
  const system = state.access + state.insight + mediaCount + (state.flags.openedNullArchive ? 3 : 0) + (state.flags.usedRelay ? 2 : 0);
  const contamination =
    diaryCount * 2 + state.realityShiftLevel + Math.max(0, state.stress - 2) + Math.max(0, 5 - state.integrity);

  const evidenceWeight = external + system;
  let title = "Die Akte steht noch auf belastbaren Ankern.";
  let summary =
    "Externe Spur und Systemrecord tragen den Fall aktuell staerker als subjektive Ueberformung oder reine Bindung.";
  let recommendation = "Jetzt lohnt sich eine harte Archiv-, Tower- oder Forensiklinie besonders.";

  if (contamination >= evidenceWeight) {
    title = "Die Falllesart kippt in Innenraum und Kontamination.";
    summary =
      "Erinnerung, Shift und Druck schreiben gerade fast genauso stark mit wie externe Beweise oder Systemmaterial.";
    recommendation = "Integritaet oder harte externe Spur nachziehen, bevor die Theorie sich selbst bestaetigt.";
  } else if (witness > external && state.flags.acceptedMira) {
    title = "Die Akte lebt stark ueber Kontakt und menschliche Naehe.";
    summary =
      "Beziehung und Stimme tragen den Fall spuerbar mit. Das kann retten, braucht aber saubere Gegenspuren.";
    recommendation = "Eine zweite externe oder technische Linie sichern, damit Bindung nicht allein zur Wahrheit wird.";
  } else if (system >= external + 3) {
    title = "Der Fall wird vor allem ueber Infrastruktur und Protokolle lesbar.";
    summary =
      "Archiv, Zugriff und Relay dominieren die aktuelle Auswertung. Das macht die Akte stark, aber auch kaelter.";
    recommendation = "Menschliche Kontaktspur oder Fotomaterial nachlegen, damit das System nicht die ganze Lesart bestimmt.";
  }

  const lanes = [
    {
      id: "external",
      title: "Externe Spur",
      status: external >= 8 ? "Belastbar" : external >= 4 ? "Im Aufbau" : "Noch duenn",
      detail:
        external >= 8
          ? "Hinweise, Fotos und Zugriff ergeben bereits eine nachvollziehbare Aussenkante des Falls."
          : external >= 4
            ? "Es gibt Material, aber noch nicht genug, um jede weichere Lesart sauber zu kontern."
            : "Bisher traegt der Fall nur wenig harte Aussenbeweise.",
      tone: external >= 8 ? "cold" : external >= 4 ? "warm" : "warning"
    },
    {
      id: "witness",
      title: "Kontaktlinie",
      status: witness >= 7 ? "Dominant" : witness >= 4 ? "Greifbar" : "Schwach",
      detail:
        witness >= 7
          ? "Mira, Jonas und persoenliche Bindung strukturieren die Akte inzwischen sichtbar mit."
          : witness >= 4
            ? "Die menschliche Lesart ist da, aber noch nicht stark genug, um allein zu tragen."
            : "Der Run bleibt eher kalt und sachlich als beziehungsgetrieben.",
      tone: witness >= 7 ? "hot" : witness >= 4 ? "warm" : "cold"
    },
    {
      id: "system",
      title: "Systemrecord",
      status: system >= 10 ? "Tief geankert" : system >= 6 ? "Brauchbar" : "Flach",
      detail:
        system >= 10
          ? "Archiv, Zugriff, Relay und gesicherte Medien geben dem Fall eine starke technische Rueckwand."
          : system >= 6
            ? "Systemmaterial hilft bereits, aber die grosse Infrastruktur-Lesart ist noch nicht voll geoeffnet."
            : "Noch fehlt genug Protokolltiefe, um den Fall ueber Infrastruktur sicher zu lesen.",
      tone: system >= 10 ? "cold" : system >= 6 ? "warm" : "warning"
    },
    {
      id: "contamination",
      title: "Innere Kontamination",
      status: contamination >= 12 ? "Akut" : contamination >= 7 ? "Messbar" : "Niedrig",
      detail:
        contamination >= 12
          ? "Shift, Stress und innere Spur schreiben sehr aktiv an der Akte mit."
          : contamination >= 7
            ? "Subjektive Verzerrung ist vorhanden und sollte bei neuen Theorien mitgedacht werden."
            : "Die Innenlage stoert den Fall noch nicht dominant.",
      tone: contamination >= 12 ? "hot" : contamination >= 7 ? "warm" : "cold"
    }
  ];

  return {
    title,
    summary,
    recommendation,
    evidenceWeight,
    contamination,
    lanes
  };
}

export function CaseFile({ state }: { state: EchoGameState }) {
  const [activeTab, setActiveTab] = useState<CaseTab>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const clues = byType(state.caseLog, "clue");
  const diary = byType(state.caseLog, "diary");
  const photos = byType(state.caseLog, "photo");
  const combos = useMemo(
    () => state.unlockedCombos.map((comboId) => getComboById(comboId)).filter(Boolean),
    [state.unlockedCombos]
  );
  const achievements = useMemo(
    () => state.unlockedAchievements.map((achievementId) => getAchievementById(achievementId)).filter(Boolean),
    [state.unlockedAchievements]
  );
  const recoveredMedia = useMemo(() => buildRecoveredMedia(state), [state]);
  const leadBoard = useMemo(() => buildLeadBoard(state), [state]);
  const crossChecks = useMemo(() => buildCrossChecks(state), [state]);
  const caseAudit = useMemo(() => buildCaseAudit(state), [state]);
  const workingTheory = useMemo(() => buildWorkingTheory(state), [state]);
  const threads = useMemo(() => buildThreads(state), [state]);
  const sceneMap = useMemo(() => buildSceneMap(state), [state]);
  const latestEntry = state.caseLog[state.caseLog.length - 1] ?? null;
  const rank = getRank(state.score);
  const nextRank = getNextRank(state.score);
  const [highlightLatest, setHighlightLatest] = useState(false);
  const latestText = latestEntry
    ? latestEntry.type === "diary"
      ? mutateDiary(latestEntry, state)
      : latestEntry.text
    : null;
  const latestRunFocus = nextRank
    ? `${nextRank.minScore - state.score} Score bis ${nextRank.title}`
    : "Maximalrang erreicht";
  const filteredMessages = useMemo(
    () =>
      state.messages.filter((message) =>
        !deferredQuery
          ? true
          : `${message.from} ${message.text} ${message.sceneId}`.toLowerCase().includes(deferredQuery)
      ),
    [deferredQuery, state.messages]
  );
  const filteredRecoveredMedia = useMemo(
    () =>
      recoveredMedia.filter((item) =>
        !deferredQuery
          ? true
          : `${item.title} ${item.sourceTag} ${item.assetNeed} ${item.audioCue}`.toLowerCase().includes(deferredQuery)
      ),
    [deferredQuery, recoveredMedia]
  );
  const filteredLeads = useMemo(
    () =>
      leadBoard.filter((lead) =>
        !deferredQuery
          ? true
          : `${lead.title} ${lead.status} ${lead.detail}`.toLowerCase().includes(deferredQuery)
      ),
    [deferredQuery, leadBoard]
  );
  const filteredCrossChecks = useMemo(
    () =>
      crossChecks.filter((check) =>
        !deferredQuery
          ? true
          : `${check.title} ${check.detail} ${check.resolve}`.toLowerCase().includes(deferredQuery)
      ),
    [crossChecks, deferredQuery]
  );
  const filteredAuditLanes = useMemo(
    () =>
      caseAudit.lanes.filter((lane) =>
        !deferredQuery
          ? true
          : `${lane.title} ${lane.status} ${lane.detail}`.toLowerCase().includes(deferredQuery)
      ),
    [caseAudit.lanes, deferredQuery]
  );
  const filteredThreads = useMemo(
    () =>
      threads.filter((thread) =>
        !deferredQuery
          ? true
          : `${thread.title} ${thread.status} ${thread.detail}`.toLowerCase().includes(deferredQuery)
      ),
    [deferredQuery, threads]
  );
  const filteredSceneMap = useMemo(
    () =>
      sceneMap.filter((entry) =>
        !deferredQuery
          ? true
          : `${entry.title} ${entry.status} ${entry.detail}`.toLowerCase().includes(deferredQuery)
      ),
    [deferredQuery, sceneMap]
  );
  const filteredClues = useMemo(
    () =>
      clues.filter((entry) =>
        !deferredQuery ? true : `${entry.sceneId} ${entry.text}`.toLowerCase().includes(deferredQuery)
      ),
    [clues, deferredQuery]
  );
  const filteredDiary = useMemo(
    () =>
      diary.filter((entry) =>
        !deferredQuery
          ? true
          : `${entry.sceneId} ${mutateDiary(entry, state)}`.toLowerCase().includes(deferredQuery)
      ),
    [deferredQuery, diary, state]
  );
  const filteredPhotos = useMemo(
    () =>
      photos.filter((entry) =>
        !deferredQuery ? true : `${entry.sceneId} ${entry.text}`.toLowerCase().includes(deferredQuery)
      ),
    [deferredQuery, photos]
  );
  const filteredCombos = useMemo(
    () =>
      combos.filter(
        (combo) =>
          combo &&
          (!deferredQuery
            ? true
            : `${combo.title} ${combo.description} ${combo.rewardLabel}`.toLowerCase().includes(deferredQuery))
      ),
    [combos, deferredQuery]
  );
  const filteredAchievements = useMemo(
    () =>
      achievements.filter(
        (achievement) =>
          achievement &&
          (!deferredQuery
            ? true
            : `${achievement.title} ${achievement.description}`.toLowerCase().includes(deferredQuery))
      ),
    [achievements, deferredQuery]
  );

  useEffect(() => {
    if (!latestEntry) {
      return;
    }

    setHighlightLatest(true);
    const timer = window.setTimeout(() => setHighlightLatest(false), 1200);
    return () => window.clearTimeout(timer);
  }, [latestEntry?.id]);

  return (
    <aside className="echo-case-file">
      <header>
        <p>Case file</p>
        <h3>Elias Voss / Echo Protocol</h3>
        <small>
          {ECHO_MODE_CONFIG[state.mode].label} / Rang {rank.title} / Restzeit {formatEchoClock(state.timeRemaining)}
        </small>
      </header>

      <div className="echo-case-file__stats">
        <div className="echo-mini-stat">
          <span>Hinweise</span>
          <strong>{clues.length}</strong>
        </div>
        <div className="echo-mini-stat">
          <span>Combos</span>
          <strong>{combos.length}</strong>
        </div>
        <div className="echo-mini-stat">
          <span>Badges</span>
          <strong>{achievements.length}</strong>
        </div>
      </div>

      <section className="echo-progress-strip">
        <div>
          <small>Run focus</small>
          <strong>{latestRunFocus}</strong>
        </div>
        <div>
          <small>Schritte</small>
          <strong>{state.decisions.length} Entscheidungen</strong>
        </div>
      </section>

      {state.lastActionReport ? (
        <section className="echo-latest-entry">
          <small>
            Shift note / {state.lastActionReport.sceneTitle} {"->"} {state.lastActionReport.nextSceneTitle}
          </small>
          <p>
            <strong>{state.lastActionReport.choiceLabel}</strong>
            {" "}
            {state.lastActionReport.summary}
          </p>
          <p className="echo-card__subtle">{state.lastActionReport.evidenceNote}</p>
        </section>
      ) : null}

      {latestEntry && latestText ? (
        <section className={`echo-latest-entry ${highlightLatest ? "echo-latest-entry--fresh" : ""}`}>
          <small>
            Letzte Bewegung / {latestEntry.sceneId} / {getEvidenceProfile(state, latestEntry.type).label}
          </small>
          <p>{latestText}</p>
        </section>
      ) : null}

      <section className="echo-case-controls">
        <div className="echo-tab-row">
          {CASE_TABS.map((tab) => (
            <button
              className={`echo-tab ${activeTab === tab.id ? "is-active" : ""}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          className="echo-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Akte durchsuchen"
          type="search"
          value={query}
        />
      </section>

      {(activeTab === "all" || activeTab === "audit") && (
        <section>
          <h4>Evidence chain ({filteredAuditLanes.length})</h4>
          <article className="echo-card echo-card--audit-summary">
            <small>Case audit</small>
            <p>
              <strong>{caseAudit.title}</strong>
              {" "}
              {caseAudit.summary}
            </p>
            <p className="echo-card__subtle">
              <strong>Empfohlene Korrektur:</strong> {caseAudit.recommendation}
            </p>
            <p className="echo-card__subtle">
              <strong>Anker / Kontamination:</strong> {caseAudit.evidenceWeight} / {caseAudit.contamination}
            </p>
          </article>
          {filteredAuditLanes.length === 0 ? <p className="echo-empty">Keine passenden Audit-Spuren.</p> : null}
          <div className="echo-card-stack">
            {filteredAuditLanes.map((lane) => (
              <article className={`echo-card echo-card--audit echo-card--audit-${lane.tone}`} key={lane.id}>
                <small>{lane.status}</small>
                <p>
                  <strong>{lane.title}</strong>
                  {" "}
                  {lane.detail}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {(activeTab === "all" || activeTab === "reel") && (
        <section>
          <h4>Recovered media ({filteredRecoveredMedia.length})</h4>
          {filteredRecoveredMedia.length === 0 ? <p className="echo-empty">Noch keine Fragmente katalogisiert.</p> : null}
          <div className="echo-card-stack">
            {filteredRecoveredMedia.map((item) => (
              <article className="echo-card echo-card--media" key={item.id}>
                <small>
                  {item.sourceTag} / {item.timecode}
                </small>
                <p>
                  <strong>{item.title}</strong>
                  {" "}
                  {item.assetNeed}
                </p>
                <span
                  className={`echo-confidence echo-confidence--${getEvidenceProfile(state, "media").tone}`}
                >
                  {getEvidenceProfile(state, "media").label}
                </span>
                <p className="echo-card__subtle">{item.audioCue}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {(activeTab === "all" || activeTab === "shift") && (
        <section>
          <h4>Shift log ({state.shiftLog.length})</h4>
          {state.shiftLog.length === 0 ? <p className="echo-empty">Noch keine Schichtvermerke.</p> : null}
          <div className="echo-card-stack">
            {state.shiftLog.map((report, index) => (
              <article className={`echo-card ${index === 0 ? "echo-card--shift-current" : "echo-card--shift"}`} key={`${report.createdAt}-${index}`}>
                <small>
                  {report.sceneTitle} {"->"} {report.nextSceneTitle} / -{report.timeCost} min
                </small>
                <p>
                  <strong>{report.choiceLabel}</strong>
                  {" "}
                  {report.summary}
                </p>
                <p className="echo-card__subtle">{report.evidenceNote}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {(activeTab === "all" || activeTab === "leads") && (
        <section>
          <h4>Priority leads ({filteredLeads.length})</h4>
          {filteredLeads.length === 0 ? <p className="echo-empty">Keine passenden Leads.</p> : null}
          <div className="echo-card-stack">
            {filteredLeads.map((lead) => (
              <article className={`echo-card echo-card--lead echo-card--lead-${lead.tone}`} key={lead.id}>
                <small>{lead.status}</small>
                <p>
                  <strong>{lead.title}</strong>
                  {" "}
                  {lead.detail}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {(activeTab === "all" || activeTab === "cross") && (
        <section>
          <h4>Cross-checks ({filteredCrossChecks.length})</h4>
          {filteredCrossChecks.length === 0 ? <p className="echo-empty">Keine passenden Kreuzpruefungen.</p> : null}
          <div className="echo-card-stack">
            {filteredCrossChecks.map((check) => (
              <article className={`echo-card echo-card--cross echo-card--cross-${check.tone}`} key={check.id}>
                <small>{check.open ? "Offene Spannung" : "Stabiler Zustand"}</small>
                <p>
                  <strong>{check.title}</strong>
                  {" "}
                  {check.detail}
                </p>
                <p className="echo-card__subtle">
                  <strong>Naechster Test:</strong> {check.resolve}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {(activeTab === "all" || activeTab === "theory") && (
        <section>
          <h4>Working theory</h4>
          <article className="echo-card echo-card--theory">
            <small>Aktuelle Lesart</small>
            <p>
              <strong>{workingTheory.title}</strong>
              {" "}
              {workingTheory.summary}
            </p>
            <p className="echo-card__subtle">
              <strong>Prioritaets-Lead:</strong> {workingTheory.lead}
            </p>
          </article>
          <div className="echo-card-stack">
            <article className="echo-card echo-card--theory-meta">
              <small>Widersprueche</small>
              <p>
                <strong>{workingTheory.contradictions.length}</strong>
                {" "}
                offene Spannungen im aktuellen Fallbild
              </p>
            </article>
            {workingTheory.contradictions.map((entry, index) => (
              <article className="echo-card echo-card--theory-conflict" key={`${entry}-${index}`}>
                <small>Konflikt {index + 1}</small>
                <p>{entry}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {(activeTab === "all" || activeTab === "threads") && (
        <section>
          <h4>Thread board ({filteredThreads.length})</h4>
          {filteredThreads.length === 0 ? <p className="echo-empty">Keine passenden Threads.</p> : null}
          <div className="echo-card-stack">
            {filteredThreads.map((thread) => (
              <article className={`echo-card echo-card--thread echo-card--thread-${thread.tone}`} key={thread.id}>
                <small>{thread.status}</small>
                <p>
                  <strong>{thread.title}</strong>
                  {" "}
                  {thread.detail}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {(activeTab === "all" || activeTab === "map") && (
        <section>
          <h4>Scene map ({filteredSceneMap.length})</h4>
          {filteredSceneMap.length === 0 ? <p className="echo-empty">Keine passenden Hotspots.</p> : null}
          <div className="echo-card-stack">
            {filteredSceneMap.map((entry) => (
              <article className={`echo-card echo-card--map echo-card--map-${entry.tone}`} key={entry.id}>
                <small>{entry.status}</small>
                <p>
                  <strong>{entry.title}</strong>
                  {" "}
                  {entry.detail}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {(activeTab === "all" || activeTab === "feed") && (
        <section>
          <h4>Live feed ({filteredMessages.length})</h4>
          {filteredMessages.length === 0 ? <p className="echo-empty">Keine passenden Signale.</p> : null}
          <div className="echo-card-stack">
            {filteredMessages.slice(0, 6).map((message) => (
              <article className={`echo-card echo-card--message echo-card--message-${message.type}`} key={message.id}>
                <small>
                  {message.from} / {message.sceneId}
                </small>
                <p>{message.text}</p>
                <span
                  className={`echo-confidence echo-confidence--${getEvidenceProfile(state, "message").tone}`}
                >
                  {getEvidenceProfile(state, "message").label}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      {(activeTab === "all" || activeTab === "combos") && (
        <section>
          <h4>Combos ({filteredCombos.length})</h4>
          {filteredCombos.length === 0 ? <p className="echo-empty">Keine passenden Muster.</p> : null}
          <div className="echo-card-stack">
            {filteredCombos.map((combo) =>
              combo ? (
                <article className="echo-card echo-card--combo" key={combo.id}>
                  <small>{combo.rewardLabel}</small>
                  <p>
                    <strong>{combo.title}</strong>
                    {" "}
                    {combo.description}
                  </p>
                </article>
              ) : null
            )}
          </div>
        </section>
      )}

      {(activeTab === "all" || activeTab === "achievements") && (
        <section>
          <h4>Achievements ({filteredAchievements.length})</h4>
          {filteredAchievements.length === 0 ? <p className="echo-empty">Keine passenden Badges.</p> : null}
          <div className="echo-card-stack">
            {filteredAchievements.map((achievement) =>
              achievement ? (
                <article className="echo-card echo-card--achievement" key={achievement.id}>
                  <small>Badge</small>
                  <p>
                    <strong>{achievement.title}</strong>
                    {" "}
                    {achievement.description}
                  </p>
                </article>
              ) : null
            )}
          </div>
        </section>
      )}

      {(activeTab === "all" || activeTab === "clue") && (
        <section>
          <h4>Hinweise ({filteredClues.length})</h4>
          {filteredClues.length === 0 ? <p className="echo-empty">Keine passenden Hinweise.</p> : null}
          <div className="echo-card-stack">
            {filteredClues.map((entry) => (
              <article className="echo-card" key={entry.id}>
                <small>{entry.sceneId}</small>
                <p>{entry.text}</p>
                <span
                  className={`echo-confidence echo-confidence--${getEvidenceProfile(state, "clue").tone}`}
                >
                  {getEvidenceProfile(state, "clue").label}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      {(activeTab === "all" || activeTab === "diary") && (
        <section>
          <h4>Tagebuch ({filteredDiary.length})</h4>
          {filteredDiary.length === 0 ? <p className="echo-empty">Keine passenden Eintraege.</p> : null}
          <div className="echo-card-stack">
            {filteredDiary.map((entry) => (
              <article className="echo-card echo-card--diary" key={entry.id}>
                <small>{entry.sceneId}</small>
                <p>{mutateDiary(entry, state)}</p>
                <span
                  className={`echo-confidence echo-confidence--${getEvidenceProfile(state, "diary").tone}`}
                >
                  {getEvidenceProfile(state, "diary").label}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      {(activeTab === "all" || activeTab === "photo") && (
        <section>
          <h4>Fotos ({filteredPhotos.length})</h4>
          {filteredPhotos.length === 0 ? <p className="echo-empty">Keine passenden Fotokarten.</p> : null}
          <div className="echo-card-stack">
            {filteredPhotos.map((entry) => (
              <article className="echo-card echo-card--photo" key={entry.id}>
                <small>{entry.sceneId}</small>
                <p>{entry.text}</p>
                <span
                  className={`echo-confidence echo-confidence--${getEvidenceProfile(state, "photo").tone}`}
                >
                  {getEvidenceProfile(state, "photo").label}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}

function buildThreads(state: EchoGameState) {
  return [
    {
      id: "mira",
      title: "Mira Hartmann",
      status: state.flags.acceptedMira ? "Kontakt hergestellt" : "Signal fragmentiert",
      detail: state.flags.promisedRescue
        ? "Elias hat eine Rettungslinie versprochen. Die Beziehung ist nicht mehr nur Beweis, sondern Einsatz."
        : state.flags.followedMemory
          ? "Miras Stimme fuehrt den Fall sichtbar. Erinnerung und Beweis rutschen ineinander."
          : "Mira bleibt Spur und Person zugleich, aber noch ohne stabile Vertrauenslinie.",
      tone: state.flags.promisedRescue ? "warm" : state.flags.acceptedMira ? "active" : "cold"
    },
    {
      id: "jonas",
      title: "Jonas",
      status: state.flags.trustedJonas ? "Fragiler Verbund" : "Widerspruch offen",
      detail: state.flags.sawBadgeMismatch
        ? "Die Badge-Abweichung macht Jonas zu mehr als einem Kollegen: Entweder Schutzschild oder Mitarchitekt."
        : "Jonas bewegt sich am Rand des Falls. Noch ist unklar, ob er stuetzt oder umlenkt.",
      tone: state.flags.trustedJonas ? "active" : "warning"
    },
    {
      id: "nullarchive",
      title: "Nullarchiv",
      status: state.flags.openedNullArchive ? "Geoeffnet" : "Versiegelt",
      detail: state.flags.openedNullArchive
        ? "Die geloeschte Ebene bestaetigt, dass Mira nicht der erste Echo-Fall ist und Elias tiefer im System haengt."
        : state.access >= 3 && state.insight >= 3
          ? "Die Voraussetzungen stehen. Das Archiv ist nur noch eine Frage der Route."
          : "Noch fehlen technische oder mentale Hebel, um an die eigentliche Versionsgeschichte zu kommen.",
      tone: state.flags.openedNullArchive ? "active" : "cold"
    },
    {
      id: "relay",
      title: "Relay Tower",
      status: state.flags.usedRelay ? "Signal beruehrt" : "Noch nicht synchronisiert",
      detail: state.flags.usedRelay
        ? "Der Tower reagiert bereits auf Elias. Jede weitere Tower-Route wird persoenlicher und gefaehrlicher."
        : "Ohne den Tower bleibt der Fall ein Spiegel. Mit ihm wird er zum Sender.",
      tone: state.flags.usedRelay ? "warning" : "cold"
    },
    {
      id: "elias",
      title: "Elias Voss",
      status: state.flags.architectSignal ? "Autorspur sichtbar" : "Selbstbild unter Druck",
      detail: state.flags.architectSignal
        ? "Das System fuehrt Elias als moeglichen Architekten. Der Fall ist laengst auch eine Rueckverfolgung der eigenen Hand."
        : state.integrity <= 4
          ? "Die Koharenz sinkt. Elias riskiert, mehr geschrieben als erinnernd zu handeln."
          : "Noch haelt sich Elias als Ermittler zusammen, aber die Schleife arbeitet bereits gegen diese Rolle.",
      tone: state.flags.architectSignal ? "warning" : state.integrity <= 4 ? "warning" : "active"
    }
  ] as const;
}

function buildSceneMap(state: EchoGameState) {
  return Object.entries(state.sceneVisits)
    .filter(([, visits]) => visits > 0)
    .map(([sceneId, visits]) => {
      const scene = getSceneById(sceneId);
      const linkedEvidence = state.caseLog.filter((entry) => entry.sceneId === sceneId).length;
      const tone =
        linkedEvidence >= 3 ? "hot" : scene.isEnding ? "ending" : visits >= 2 ? "warm" : "cold";
      const status = scene.isEnding
        ? "Abschlussknoten"
        : visits >= 2
          ? `Mehrfach gelesen (${visits})`
          : "Einmal betreten";
      const detail = scene.isEnding
        ? "Dieser Knoten endet den aktuellen Lauf oder katalogisiert einen Abschluss."
        : `${linkedEvidence} Akteneintraege haengen aktuell an ${scene.location}.`;

      return {
        id: sceneId,
        title: scene.title,
        status,
        detail,
        tone,
        weight: visits * 3 + linkedEvidence + (scene.isEnding ? 4 : 0)
      };
    })
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 6);
}

const CASE_TABS: Array<{ id: CaseTab; label: string }> = [
  { id: "all", label: "Alles" },
  { id: "audit", label: "Audit" },
  { id: "reel", label: "Media" },
  { id: "shift", label: "Shift" },
  { id: "leads", label: "Leads" },
  { id: "cross", label: "Checks" },
  { id: "theory", label: "Theory" },
  { id: "threads", label: "Threads" },
  { id: "map", label: "Map" },
  { id: "feed", label: "Feed" },
  { id: "combos", label: "Combos" },
  { id: "achievements", label: "Badges" },
  { id: "clue", label: "Hinweise" },
  { id: "diary", label: "Tagebuch" },
  { id: "photo", label: "Fotos" }
];

function buildRecoveredMedia(state: EchoGameState) {
  return state.seenCutscenes
    .map((cutsceneId) => getCutsceneById(cutsceneId))
    .filter(Boolean)
    .flatMap((cutscene) =>
      cutscene!.slides.map((slide, index) => ({
        id: `${cutscene!.id}:${index}`,
        title: slide.title,
        sourceTag: slide.sourceTag ?? "UNLABELED SOURCE",
        timecode: slide.timecode ?? "--:--:--",
        assetNeed: slide.neededAsset,
        audioCue: slide.audioCue ?? "Kein Audio-Cue hinterlegt"
      }))
    );
}
