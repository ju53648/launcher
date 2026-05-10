import type { EchoGameState, EchoScene, SceneChoice } from "../types/game";

function shifted(state: EchoGameState, normal: string, altered: string, threshold = 2): string {
  return state.realityShiftLevel >= threshold ? altered : normal;
}

function withChoices(choices: SceneChoice[]): SceneChoice[] {
  return choices.map((choice) => ({
    ...choice,
    effects: [...choice.effects],
    requirements: choice.requirements ? [...choice.requirements] : undefined
  }));
}

export const INITIAL_SCENE_ID = "office-night";

export const SCENES: EchoScene[] = [
  {
    id: "office-night",
    title: "Office Window, 02:13",
    location: "Ermittlungszelle / Nordfluegel",
    objective: "Finde die erste Spur, die mehr weiss als die offizielle Akte.",
    ambience: "Regenlinien ueber Glas, Neon am Flackern, Miras Name auf zu vielen Haftnotizen.",
    visualTheme: "office",
    text: (state) =>
      shifted(
        state,
        "Der Regen kratzt nicht an der Scheibe. Er tastet. Miras Akte liegt offen unter der Schreibtischlampe, als haette jemand beschlossen, dass du heute Nacht nicht mehr ausweichst.",
        "Der Regen tippt in einem Muster gegen die Scheibe. Drei kurz, zwei lang. Genau das Muster, das auf Miras letzter Voicemail im Hintergrund lag."
      ),
    warning: (state) => (state.realityShiftLevel >= 2 ? "SIGNALSPUR UNRUHIG" : null),
    defaultCaseEntries: [{ type: "clue", text: "Mira Hartmann seit 11 Tagen vermisst." }],
    choices: withChoices([
      {
        id: "open-file",
        label: "Akte oeffnen und Miras letzte Notiz lesen",
        nextSceneId: "mira-file",
        timeCost: 18,
        preview: "Direkter Zugriff auf Fakten, aber die Schleife reagiert sofort.",
        effects: [
          { type: "setFlag", flag: "openedFile", value: true },
          { type: "addLog", entryType: "diary", text: "Ich oeffnete die Akte und fuehlte mich schon beim Papier beobachtet." },
          { type: "stat", stat: "insight", amount: 1 },
          { type: "stat", stat: "stress", amount: 1 },
          { type: "shift", amount: 1 },
          { type: "score", amount: 12 }
        ]
      },
      {
        id: "check-call-journal",
        label: "Anrufliste pruefen",
        nextSceneId: "unknown-call",
        timeCost: 12,
        preview: "Sauberer Einstieg ueber Technik und Routen.",
        effects: [
          { type: "addLog", entryType: "clue", text: "Drei verpasste Anrufe ohne Nummer." },
          { type: "stat", stat: "access", amount: 1 },
          { type: "score", amount: 10 },
          {
            type: "addMessage",
            messageType: "dispatch",
            from: "Dispatch",
            text: "Nordfluegel bleibt offiziell still. Wenn da was klingelt, steht es nicht im System."
          }
        ]
      },
      {
        id: "inspect-desk",
        label: "Schreibtischritual rekonstruieren",
        nextSceneId: "desk-ritual",
        timeCost: 10,
        preview: "Weniger laut, mehr Atmosphaere und innere Stabilisierung.",
        effects: [
          { type: "addLog", entryType: "diary", text: "Der Kaffeering links vom Block gehoert mir. Der zweite nicht." },
          { type: "stat", stat: "integrity", amount: 1 },
          { type: "stat", stat: "stress", amount: -1 },
          { type: "score", amount: 8 }
        ]
      }
    ])
  },
  {
    id: "desk-ritual",
    title: "Die zweite Tasse",
    location: "Bueroreihe / Lampenkegel",
    objective: "Beweise dir, dass heute Nacht nicht nur aus Akten besteht.",
    ambience: "Kaltes Licht auf Tassenringen, abgerissene Tesastreifen, Luft wie vor einem Gestandnis.",
    visualTheme: "office",
    text: (state) =>
      shifted(
        state,
        "Unter der Lampe liegen zwei Kaffeerander. Einer frisch. Einer alt. Der alte sitzt auf Papier, das du heute erst ausgelegt haben willst.",
        "Im alten Tassenring steht mit Bleistift: 'Wenn du zuerst die Stimme hoerst, luegt Jonas spaeter sanfter.'"
      ),
    entryMessage: () => ({
      type: "system",
      from: "CASE SPIRAL",
      text: "Umgebung reagiert auf Beobachtung. Kleine Abweichungen koennen spaetere Linien freischalten."
    }),
    choices: withChoices([
      {
        id: "lift-lamp",
        label: "Lampe anheben und die Notiz darunter sichern",
        nextSceneId: "mira-file",
        timeCost: 11,
        preview: "Fuehrt zur Akte, aber mit mehr Kontext und besserer Lesbarkeit.",
        effects: [
          { type: "addLog", entryType: "photo", text: "Unter der Lampe klebte ein rundes Bandgeraet-Etikett: 08 / MIRROR." },
          { type: "stat", stat: "insight", amount: 1 },
          { type: "score", amount: 11 }
        ]
      },
      {
        id: "boot-terminal",
        label: "Dienstterminal kalt starten",
        nextSceneId: "archive-terminal",
        timeCost: 15,
        preview: "Frueher Zugang zu geloeschten Sitzungen und Tech-Spuren.",
        effects: [
          { type: "addLog", entryType: "clue", text: "Der Dienstrechner listet eine geloeschte Sitzung um 01:28." },
          { type: "stat", stat: "access", amount: 1 },
          { type: "shift", amount: 1 },
          { type: "score", amount: 12 }
        ]
      },
      {
        id: "listen-rain",
        label: "Das Trommeln der Scheibe mitzuehlen",
        nextSceneId: "unknown-call",
        timeCost: 9,
        preview: "Beruhigt kurz, oeffnet aber eine subtilere Spur.",
        effects: [
          { type: "addLog", entryType: "diary", text: "Im Regen steckt ein Takt. Er passt zu keinem Funkkanal, aber zu meinem Puls." },
          { type: "stat", stat: "stress", amount: -1 },
          { type: "shift", amount: 1 },
          { type: "score", amount: 8 }
        ]
      }
    ])
  },
  {
    id: "mira-file",
    title: "Miras Akte",
    location: "Archivschacht / Fach 14-B",
    objective: "Finde in den Papieren die erste echte Luecke.",
    ambience: "Staub zwischen Registerkarten, Fettflecken auf Kopien, eine Ecke riecht nach verbranntem Kunststoff.",
    visualTheme: "archive",
    text: (state) =>
      shifted(
        state,
        "Die Akte ist zu duenn fuer elf Tage Verschwinden. Zwei Seiten wurden ersetzt, aber nur eine davon sauber.",
        "Die Akte ist voller Randnotizen in deiner Handschrift. Nicht die, die du heute benutzt."
      ),
    npcLine: (state) =>
      shifted(
        state,
        "Jonas aus dem Tuerrahmen: 'Wenn du was findest, ruf mich vor dem Funk.'",
        "Jonas aus dem Tuerrahmen: 'Du hast das damals auch gesagt, Elias. Vor dem ersten Bruch.'",
        2
      ),
    defaultCaseEntries: [{ type: "photo", text: "Passfoto von Mira. Kratzer quer ueber dem Gesicht." }],
    choices: withChoices([
      {
        id: "inspect-photo",
        label: "Foto vergroessern",
        nextSceneId: "photo-discovery",
        timeCost: 16,
        preview: "Starker Story-Push und fruehe Erinnerungssplitter.",
        effects: [
          { type: "addLog", entryType: "photo", text: "Auf dem Foto steht hinter Mira eine verschwommene Silhouette." },
          { type: "stat", stat: "insight", amount: 1 },
          { type: "shift", amount: 1 },
          { type: "score", amount: 14 }
        ]
      },
      {
        id: "compare-stamps",
        label: "Eingangsstempel und Badge-Log abgleichen",
        nextSceneId: "archive-terminal",
        timeCost: 14,
        preview: "Legt den Grundstein fuer die Jonas-Konfrontation.",
        effects: [
          { type: "setFlag", flag: "sawBadgeMismatch", value: true },
          { type: "addLog", entryType: "clue", text: "Jonas' Badge taucht 47 Minuten vor der offiziellen Freigabe im Log auf." },
          { type: "stat", stat: "access", amount: 1 },
          { type: "stat", stat: "insight", amount: 1 },
          { type: "score", amount: 14 }
        ]
      },
      {
        id: "burn-copy",
        label: "Kopie der Akte vernichten",
        nextSceneId: "unknown-call",
        timeCost: 13,
        preview: "Riskanter Shift-Boost, oeffnet spaetere Spiegelpfade.",
        effects: [
          { type: "setFlag", flag: "burnedFile", value: true },
          { type: "addLog", entryType: "diary", text: "Ich verbrannte die Kopie. Der Geruch war nicht neu." },
          { type: "stat", stat: "stress", amount: 1 },
          { type: "shift", amount: 2 },
          { type: "score", amount: 16 }
        ]
      }
    ])
  },
  {
    id: "unknown-call",
    title: "Unbekannter Anruf",
    location: "Flur / stillgelegter Interkom",
    objective: "Finde heraus, ob der Anruf Fuehrung oder Falle ist.",
    ambience: "Klingeln ohne Display, rotes Licht in der Leiste, auf dem Boden Wasser von draussen.",
    visualTheme: "signal",
    text: (state) =>
      shifted(
        state,
        "Das Telefon klingelt ohne Nummer. Das Rauschen klingt, als wuerde jemand durch nassen Stoff sprechen.",
        "Am anderen Ende hebt niemand ab. Stattdessen spricht deine eigene Stimme zuerst: 'Wenn du wieder zu spaet bist, loescht du sie wieder.'",
        2
      ),
    warning: (state) => (state.realityShiftLevel >= 3 ? "EIGENE STIMME DETEKTIERT" : null),
    entryMessage: () => ({
      type: "dispatch",
      from: "Dispatch",
      text: "Keine Leitung ist fuer diesen Apparat registriert. Wenn das Ding klingelt, ruft niemand Offizielles an."
    }),
    choices: withChoices([
      {
        id: "pick-up",
        label: "Abheben und zuhoeren",
        nextSceneId: "signal-trace",
        timeCost: 14,
        preview: "Offnet eine aktive Signalroute und mehr Hinweise auf den Tower.",
        effects: [
          { type: "addLog", entryType: "clue", text: "Anrufer kennt den Tatort, bevor ich ihn erwaehne." },
          { type: "stat", stat: "insight", amount: 1 },
          { type: "shift", amount: 1 },
          { type: "score", amount: 14 }
        ]
      },
      {
        id: "trace-number",
        label: "Leitung rueckverfolgen",
        nextSceneId: "archive-terminal",
        timeCost: 16,
        preview: "Tech-lastige Route mit viel Access, aber mehr Druck.",
        effects: [
          { type: "addLog", entryType: "clue", text: "Das Routing springt ueber den stillgelegten Relay-Tower." },
          { type: "stat", stat: "access", amount: 2 },
          { type: "stat", stat: "stress", amount: 1 },
          { type: "score", amount: 16 }
        ]
      },
      {
        id: "ignore-call",
        label: "Nicht rangehen",
        nextSceneId: "interrogate-jonas",
        timeCost: 10,
        preview: "Schneller zu Jonas, aber innerlich teurer.",
        effects: [
          { type: "setFlag", flag: "ignoredCall", value: true },
          { type: "addLog", entryType: "diary", text: "Ich liess es klingeln. Das Aufhoeren war schlimmer als das Klingeln." },
          { type: "stat", stat: "stress", amount: 1 },
          { type: "stat", stat: "integrity", amount: -1 },
          { type: "score", amount: 10 }
        ]
      }
    ])
  },
  {
    id: "photo-discovery",
    title: "Fotoanalyse",
    location: "Dunkelkammer / Kaltlicht",
    objective: "Entscheide, ob du dem Bild glaubst oder ihm widerstehst.",
    ambience: "Rotes Laborlicht, Entwicklerbecken, nasser Karton, dein Spiegelbild zu spaet im Glas.",
    visualTheme: "archive",
    text: (state) =>
      shifted(
        state,
        "Mit jeder Vergroesserung wird klarer: Im Hintergrund stehst du. Nicht nur irgendein Mann mit Mantelkragen. Du.",
        "Mit jeder Vergroesserung wird klarer: Du umarmst Mira im Hintergrund und laechelst, als wuesstest du schon, dass das Foto spaeter Beweis wird.",
        2
      ),
    defaultCaseEntries: [{ type: "clue", text: "Foto zeigt Elias Voss im Hintergrund hinter Mira." }],
    choices: withChoices([
      {
        id: "accept-memory",
        label: "Erinnerung zulassen",
        nextSceneId: "interrogate-jonas",
        timeCost: 15,
        preview: "Mehr Shift, aber wichtige Mira-Linien werden klarer.",
        effects: [
          { type: "setFlag", flag: "followedMemory", value: true },
          { type: "addLog", entryType: "diary", text: "Miras Stimme kam nicht aus dem Bild. Sie kam aus etwas, das ich schon kannte." },
          { type: "stat", stat: "insight", amount: 1 },
          { type: "stat", stat: "stress", amount: 1 },
          { type: "shift", amount: 1 },
          { type: "score", amount: 14 }
        ]
      },
      {
        id: "search-reflection",
        label: "Fensterspiegel im Hintergrund lesen",
        nextSceneId: "archive-terminal",
        timeCost: 17,
        preview: "Spaeterer Harbor-Combo-Trigger mit viel Kontext.",
        effects: [
          { type: "addLog", entryType: "clue", text: "Im Fensterspiegel liegt hinter Mira ein Hafenkran." },
          { type: "stat", stat: "insight", amount: 2 },
          { type: "score", amount: 15 }
        ]
      },
      {
        id: "deny-memory",
        label: "Foto als Manipulation einstufen",
        nextSceneId: "archive-terminal",
        timeCost: 12,
        preview: "Haelt den Kopf kuehler, schwaecht aber die eigene Linie.",
        effects: [
          { type: "addLog", entryType: "clue", text: "Moegliche Manipulation der Bilddaten." },
          { type: "stat", stat: "integrity", amount: -1 },
          { type: "score", amount: 10 }
        ]
      }
    ])
  },
  {
    id: "signal-trace",
    title: "Signal Trace",
    location: "Treppenhaus / Kabelschacht",
    objective: "Lerne, ob die Stimme aus dem Gebaeude kommt oder aus dir.",
    ambience: "Offener Kabelkanal, kalte Luft aus dem Schacht, irgendwo ein Relaisklicken ohne Takt.",
    visualTheme: "signal",
    text: (state) =>
      shifted(
        state,
        "Die Leitung springt nicht nach draussen. Sie laeuft in die Wand, durch das Treppenhaus und wieder ins Haus hinein.",
        "Zwischen den Stufen hoerst du dieselbe Stimme noch einmal, eine halbe Sekunde versetzt. Nicht Echo. Vorlauf.",
        3
      ),
    entryMessage: () => ({
      type: "mira",
      from: "Mira?",
      text: "Wenn die Leitung nach innen fuehrt, sucht dich nicht der Fall. Dann suchst du dich selbst."
    }),
    choices: withChoices([
      {
        id: "follow-route",
        label: "Route bis zum Verhoertrakt verfolgen",
        nextSceneId: "interrogate-jonas",
        timeCost: 13,
        preview: "Fuehrt sauber zu Jonas mit extra Kontext.",
        effects: [
          { type: "addLog", entryType: "clue", text: "Das Signal bog vor dem Verhoerraum nach innen." },
          { type: "stat", stat: "access", amount: 1 },
          { type: "score", amount: 12 }
        ]
      },
      {
        id: "spoof-route",
        label: "Signal ueber den Dienstserver spiegeln",
        nextSceneId: "archive-terminal",
        timeCost: 15,
        preview: "Mehr Zugriff, mehr Verzerrung.",
        effects: [
          { type: "setFlag", flag: "usedRelay", value: true },
          { type: "stat", stat: "access", amount: 1 },
          { type: "shift", amount: 1 },
          { type: "score", amount: 15 },
          {
            type: "addMessage",
            messageType: "system",
            from: "Relay",
            text: "Spiegelroute akzeptiert. Eine zweite Sitzung antwortet mit dem Namen VOSS-E1."
          }
        ]
      },
      {
        id: "cut-line",
        label: "Leitung kappen und Jonas direkt stellen",
        nextSceneId: "shifting-diary",
        timeCost: 11,
        preview: "Schneller, weniger Access, aber etwas mehr Selbstkontrolle.",
        effects: [
          { type: "stat", stat: "integrity", amount: 1 },
          { type: "stat", stat: "stress", amount: 1 },
          { type: "score", amount: 9 }
        ]
      }
    ])
  },
  {
    id: "interrogate-jonas",
    title: "Verhoer: Jonas",
    location: "Raum 4 / Spiegelglas",
    objective: "Brich Jonas oder baue auf ihm auf. Beides kostet.",
    ambience: "Flackernde Leuchtstoffroehre, Wasserflecken im Spiegel, Jonas atmet zu langsam.",
    visualTheme: "office",
    text: (state) =>
      shifted(
        state,
        "Jonas behauptet, Mira sei zuerst nur Zeugin gewesen. Seine Augen weichen dir aus, aber sein Bericht nicht.",
        "Jonas behauptet, Mira sei deine Partnerin gewesen und du haettest den Bericht ueber ihren Verlust selbst unterschrieben.",
        2
      ),
    npcLine: (state) =>
      state.trust >= 1
        ? "Jonas: 'Ich decke dich noch immer, Elias. Aber ich weiss nicht, wovor genau.'"
        : "Jonas: 'Du willst eine klare Luege. Leider habe ich nur die kaputte Wahrheit.'",
    entryMessage: (state) =>
      state.flags.ignoredCall
        ? {
            type: "jonas",
            from: "Jonas",
            text: "Du bist bleich. Sag nicht, dass der Interkom schon wieder angerufen hat."
          }
        : null,
    choices: withChoices([
      {
        id: "trust-jonas",
        label: "Jonas glauben",
        nextSceneId: "shifting-diary",
        timeCost: 14,
        preview: "Mehr Trust und spaeter weichere Endspieloptionen.",
        effects: [
          { type: "setFlag", flag: "trustedJonas", value: true },
          { type: "stat", stat: "trust", amount: 2 },
          { type: "stat", stat: "integrity", amount: 1 },
          { type: "score", amount: 14 }
        ]
      },
      {
        id: "pressure-jonas",
        label: "Jonas unter Druck setzen",
        nextSceneId: "shifting-diary",
        timeCost: 12,
        preview: "Gefaehrlicher, aber aufschlussreich und schneller.",
        effects: [
          { type: "setFlag", flag: "trustedJonas", value: false },
          { type: "stat", stat: "trust", amount: -2 },
          { type: "stat", stat: "stress", amount: 1 },
          { type: "shift", amount: 1 },
          { type: "score", amount: 16 }
        ]
      },
      {
        id: "badge-protocol",
        label: "Badge-Abweichung konfrontieren",
        nextSceneId: "jonas-contradiction",
        timeCost: 12,
        preview: "Spezialroute ueber echte Widerspruchsarbeit.",
        requirements: [{ type: "combo", comboId: "jonas-dossier", label: "Kombi 'Jonas Dossier' freischalten" }],
        effects: [{ type: "score", amount: 18 }]
      }
    ])
  },
  {
    id: "jonas-contradiction",
    title: "Jonas bricht zuerst",
    location: "Verhoerraum / Licht aus",
    objective: "Entscheide, ob Jonas Werkzeug, Zeuge oder Komplize ist.",
    ambience: "Die Lampe klickt aus, nur die Aufnahme-LED bleibt. Jonas spricht schneller, als er denkt.",
    visualTheme: "office",
    text: (state) =>
      state.trust >= 0
        ? "Jonas legt seine Marke auf den Tisch. 'Ich war vor dir im Archiv, weil ich wusste, dass du dich wieder selbst finden wirst.'"
        : "Jonas legt die Marke hin wie eine Waffe. 'Ja, ich war zuerst da. Weil du in jedem Durchlauf dieselben Fehler machst.'",
    entryMessage: () => ({
      type: "jonas",
      from: "Jonas",
      text: "Wenn du die Abweichung ansprichst, spiele ich nicht mehr sauber. Dann hoerst du auch den Teil, der dir nicht gefaellt."
    }),
    choices: withChoices([
      {
        id: "let-confess",
        label: "Jonas ausreden lassen",
        nextSceneId: "archive-terminal",
        timeCost: 14,
        preview: "Balanciert Trust, Insight und Access zugleich.",
        effects: [
          { type: "addLog", entryType: "clue", text: "Jonas bestaetigt eine verdeckte Nullarchiv-Sperre." },
          { type: "stat", stat: "trust", amount: 1 },
          { type: "stat", stat: "access", amount: 1 },
          { type: "stat", stat: "insight", amount: 1 },
          { type: "score", amount: 20 }
        ]
      },
      {
        id: "record-blackmail",
        label: "Gestandnis aufnehmen und gegen ihn halten",
        nextSceneId: "crime-scene-return",
        timeCost: 13,
        preview: "Roher Vorteil, aber emotional teuer.",
        effects: [
          { type: "addLog", entryType: "diary", text: "Ich hielt Jonas' Gestandnis fest wie eine Waffe." },
          { type: "stat", stat: "stress", amount: 2 },
          { type: "stat", stat: "access", amount: 2 },
          { type: "stat", stat: "trust", amount: -1 },
          { type: "score", amount: 18 }
        ]
      },
      {
        id: "protect-jonas",
        label: "Jonas trotz allem decken",
        nextSceneId: "shifting-diary",
        timeCost: 10,
        preview: "Langsamer Fortschritt, aber staerkeres Endspiel-Gewicht.",
        effects: [
          { type: "stat", stat: "trust", amount: 1 },
          { type: "stat", stat: "integrity", amount: 1 },
          { type: "score", amount: 10 }
        ]
      }
    ])
  },
  {
    id: "shifting-diary",
    title: "Tagebuchseite",
    location: "Asservatenraum / Regal C",
    objective: "Lies Miras Handschrift, bevor sie sich neu schreibt.",
    ambience: "Papiergeruch, kalte Metallregale, die Tinte scheint noch feucht zu sein.",
    visualTheme: "archive",
    text: (state) =>
      shifted(
        state,
        "Miras Tagebuch beschreibt eine fremde Person namens 'E.V.'. Sie fuerchtet, dass er Berichte umschreibt.",
        "Miras Tagebuch beschreibt euch beide. Mehrfach. Und jedes Mal endet der Eintrag zwei Zeilen vor dem Wort 'Turm'.",
        2
      ),
    defaultCaseEntries: [{ type: "diary", text: "'Wenn Elias sich erinnert, beginnt alles von vorn.'" }],
    choices: withChoices([
      {
        id: "take-page",
        label: "Hafenseite sichern",
        nextSceneId: "crime-scene-return",
        timeCost: 13,
        preview: "Wichtiger Trigger fuer Harbor Link.",
        effects: [
          { type: "addLog", entryType: "clue", text: "Tagebuchseite verweist auf den alten Tatort im Hafen." },
          { type: "stat", stat: "insight", amount: 1 },
          { type: "score", amount: 14 }
        ]
      },
      {
        id: "leave-page",
        label: "Seite zuruecklassen und das Buch beobachten",
        nextSceneId: "archive-terminal",
        timeCost: 11,
        preview: "Laesst den Fall kippen, erhoeht aber das Gefuehl fuer die Schleife.",
        effects: [
          { type: "addLog", entryType: "diary", text: "Die Seite lag wieder im Buch, als haette ich sie nie beruehrt." },
          { type: "stat", stat: "integrity", amount: -1 },
          { type: "shift", amount: 1 },
          { type: "score", amount: 10 }
        ]
      },
      {
        id: "read-margins",
        label: "Randnotizen als Frequenz lesen",
        nextSceneId: "relay-tower",
        timeCost: 17,
        preview: "Abkuerzung zum Tower fuer aufmerksame Runs.",
        requirements: [{ type: "stat", stat: "insight", min: 4, label: "Mindestens 4 Insight" }],
        effects: [
          { type: "addLog", entryType: "clue", text: "Zwischen den Zeilen steckt eine Funkfrequenz: 88.13." },
          { type: "stat", stat: "access", amount: 1 },
          { type: "score", amount: 18 }
        ]
      }
    ])
  },
  {
    id: "archive-terminal",
    title: "Nullarchiv-Terminal",
    location: "Serviceraum / geloeschter Zugang",
    objective: "Finde die 45 fehlenden Minuten und was darin mit dir geschah.",
    ambience: "Gruener Roehrenmonitor, Summen unter dem Boden, Passwoerter als rote Schatten im Glas.",
    visualTheme: "signal",
    text: (state) =>
      shifted(
        state,
        "Der Dienstserver fuehrt Miras Fall doppelt. Einmal offiziell. Einmal ohne Freigabestufe.",
        "Der Dienstserver fuehrt deinen Namen in der internen Versionshistorie. Nicht als Ermittler. Als Autor."
      ),
    entryMessage: () => ({
      type: "system",
      from: "NULLARCHIV",
      text: "Abweichende Datenspur erkannt. 45 Minuten wurden nicht geloescht, sondern umadressiert."
    }),
    choices: withChoices([
      {
        id: "reconstruct-gap",
        label: "Die 45 fehlenden Minuten rekonstruieren",
        nextSceneId: "crime-scene-return",
        timeCost: 16,
        preview: "Beste Route fuer Story-Klarheit ohne Endspiel zu ueberspringen.",
        effects: [
          { type: "addLog", entryType: "clue", text: "Im System fehlen 45 Minuten zwischen 01:28 und 02:13." },
          { type: "stat", stat: "access", amount: 1 },
          { type: "stat", stat: "insight", amount: 1 },
          { type: "score", amount: 16 }
        ]
      },
      {
        id: "open-null-archive",
        label: "Nullarchiv oeffnen",
        nextSceneId: "relay-tower",
        timeCost: 18,
        preview: "Tiefe Lore, hohes Risiko, starker Architekt-Push.",
        requirements: [
          { type: "stat", stat: "access", min: 3, label: "Mindestens 3 Access" },
          { type: "stat", stat: "insight", min: 3, label: "Mindestens 3 Insight" }
        ],
        effects: [
          { type: "setFlag", flag: "openedNullArchive", value: true },
          { type: "addLog", entryType: "clue", text: "Nullarchiv enthaelt Echo-Faelle vor Mira. Sie ist nicht Opfer eins." },
          { type: "stat", stat: "insight", amount: 1 },
          { type: "shift", amount: 1 },
          { type: "score", amount: 20 }
        ]
      },
      {
        id: "purge-profile",
        label: "Eigenes Profil aus dem Server tilgen",
        nextSceneId: "red-room",
        timeCost: 15,
        preview: "Radikaler Cut in Richtung Selbstloeschung.",
        requirements: [{ type: "stat", stat: "realityShiftLevel", min: 4, label: "Reality Shift mindestens 4" }],
        effects: [
          { type: "addLog", entryType: "diary", text: "Ich loeschte mein Profil. Die Akte loeschte mich nicht mit." },
          { type: "stat", stat: "integrity", amount: -1 },
          { type: "shift", amount: 1 },
          { type: "score", amount: 18 }
        ]
      }
    ])
  },
  {
    id: "crime-scene-return",
    title: "Rueckkehr zum Tatort",
    location: "Hafenlager 17",
    objective: "Entscheide, ob der Ort Falle, Erinnerung oder Bauplan ist.",
    ambience: "Salz in der Luft, Kreidemarkierungen, rostige Tueren und dein Name im Kondenswasser.",
    visualTheme: "harbor",
    text: (state) =>
      shifted(
        state,
        "Das Lager ist leer, aber vorbereitet. Kabel liegen wie fuer eine Vorfuehrung, nicht fuer Spurensicherung.",
        "Das Lager ist nicht leer. Jemand hat deinen Namen hundertmal an die Wand geschrieben, immer mit leicht anderer Handschrift.",
        3
      ),
    warning: (state) => (state.realityShiftLevel >= 4 ? "MEHRERE DURCHLAEUFE UEBERLAPPEN" : null),
    defaultCaseEntries: [{ type: "photo", text: "Polaroid vom Tatort: Im Spiegel steht 'Elias war hier'." }],
    choices: withChoices([
      {
        id: "follow-whispers",
        label: "Den Stimmen ins Untergeschoss folgen",
        nextSceneId: "red-room",
        timeCost: 14,
        preview: "Direkter Sprung in die Konfrontation mit hohem Druck.",
        effects: [
          { type: "setFlag", flag: "followedMemory", value: true },
          { type: "stat", stat: "stress", amount: 1 },
          { type: "shift", amount: 1 },
          { type: "score", amount: 14 }
        ]
      },
      {
        id: "reconstruct-mirror",
        label: "Spiegelspur rekonstruieren",
        nextSceneId: "harbor-reconstruction",
        timeCost: 16,
        preview: "Combo-basierte Premiumroute mit viel Klarheit.",
        requirements: [{ type: "combo", comboId: "harbor-link", label: "Kombi 'Harbor Link' freischalten" }],
        effects: [
          { type: "stat", stat: "access", amount: 1 },
          { type: "stat", stat: "insight", amount: 1 },
          { type: "score", amount: 22 }
        ]
      },
      {
        id: "secure-perimeter",
        label: "Funkkreis sichern und den Tower lesen",
        nextSceneId: "relay-tower",
        timeCost: 12,
        preview: "Kontrollierter Umweg fuer starke Tech-Builds.",
        requirements: [{ type: "stat", stat: "access", min: 3, label: "Mindestens 3 Access" }],
        effects: [
          { type: "addLog", entryType: "clue", text: "Dein Funk antwortet mit einer zweiten, juengeren Kennung." },
          { type: "stat", stat: "stress", amount: 1 },
          { type: "score", amount: 13 }
        ]
      }
    ])
  },
  {
    id: "harbor-reconstruction",
    title: "Harbor Reconstruction",
    location: "Spiegelkammer unter Lager 17",
    objective: "Verbinde die echten Spuren zu einer Route, die vor dir schon einmal lief.",
    ambience: "Projektorlicht auf Wasserlachen, zerschnittene Fotos, ein rotes Drahtnetz ueber dem Boden.",
    visualTheme: "harbor",
    text: () =>
      "Foto, Tagebuch und Tideplan rasten ineinander. Mira wurde nicht zum Lager gebracht. Das Lager war nur der Spiegel. Die eigentliche Route fuehrte immer zum Towerkern.",
    entryMessage: () => ({
      type: "system",
      from: "CASE SPIRAL",
      text: "Harbor Link bestaetigt. Die Hafenlinie ist Kulisse, nicht Ursprung."
    }),
    choices: withChoices([
      {
        id: "stitch-route",
        label: "Die Route in den Tower weiterschreiben",
        nextSceneId: "relay-tower",
        timeCost: 13,
        preview: "Sauberster Uebergang in das eigentliche Endspiel.",
        effects: [
          { type: "setFlag", flag: "usedRelay", value: true },
          { type: "addLog", entryType: "clue", text: "Die Spiegelroute endet nicht im Keller, sondern im Towerkern." },
          { type: "stat", stat: "insight", amount: 2 },
          { type: "stat", stat: "access", amount: 1 },
          { type: "score", amount: 24 }
        ]
      },
      {
        id: "tell-jonas",
        label: "Jonas die Wahrheit schicken",
        nextSceneId: "red-room",
        timeCost: 12,
        preview: "Verstaerkt die Rettungslinie, falls du ihm genug Raum gabst.",
        requirements: [{ type: "stat", stat: "trust", min: 1, label: "Mindestens 1 Trust" }],
        effects: [
          { type: "stat", stat: "trust", amount: 1 },
          { type: "stat", stat: "integrity", amount: 1 },
          { type: "score", amount: 18 },
          {
            type: "addMessage",
            messageType: "jonas",
            from: "Jonas",
            text: "Wenn das stimmt, gehe ich diesmal nicht weg. Ich halte dir die Rueckseite offen."
          }
        ]
      },
      {
        id: "go-alone",
        label: "Allein in die rote Kammer gehen",
        nextSceneId: "red-room",
        timeCost: 10,
        preview: "Schneller und haerter, aber ohne Rueckhalt.",
        effects: [
          { type: "stat", stat: "stress", amount: 2 },
          { type: "shift", amount: 1 },
          { type: "score", amount: 16 }
        ]
      }
    ])
  },
  {
    id: "relay-tower",
    title: "Relay Tower",
    location: "Dachkern / stillgelegte Sendeanlage",
    objective: "Entscheide, ob du Signal, Schleife oder Autor angreifst.",
    ambience: "Wind im Stahlgeruest, rote Wartungslichter, tiefer Summton durch die Rippen.",
    visualTheme: "signal",
    text: (state) =>
      shifted(
        state,
        "Der Tower ist noch am Netz. Nicht mit der Stadt. Mit etwas, das auf Wiederholung optimiert wurde.",
        "Der Tower traegt in der Wartungssoftware deinen Kurznamen. VOSS-E1. Du warst hier, bevor du dich erinnern konntest.",
        3
      ),
    entryMessage: (state) =>
      state.flags.openedNullArchive
        ? {
            type: "mira",
            from: "Mira",
            text: "Wenn du das Nullarchiv wirklich offen hattest, weisst du schon, dass der Tower nicht gebaut wurde, um mich festzuhalten."
          }
        : {
            type: "mira",
            from: "Mira",
            text: "Du bist nah genug. Bitte entscheide diesmal nicht nur fuer dein Protokoll."
          },
    choices: withChoices([
      {
        id: "sync-frequency",
        label: "Mit Miras Frequenz synchronisieren",
        nextSceneId: "red-room",
        timeCost: 14,
        preview: "Staerkt Insight und fuehrt in die offenere Konfrontation.",
        effects: [
          { type: "setFlag", flag: "usedRelay", value: true },
          { type: "setFlag", flag: "followedMemory", value: true },
          { type: "stat", stat: "insight", amount: 1 },
          { type: "shift", amount: 1 },
          { type: "score", amount: 18 }
        ]
      },
      {
        id: "cut-power",
        label: "Tower stromlos machen",
        nextSceneId: "ending-erasure",
        timeCost: 11,
        preview: "Brutale Loesung. Schnell, effektiv, nicht sauber.",
        effects: [
          { type: "stat", stat: "integrity", amount: 1 },
          { type: "stat", stat: "stress", amount: 2 },
          { type: "score", amount: 20 }
        ]
      },
      {
        id: "accept-architect",
        label: "Architekten-Signal annehmen",
        nextSceneId: "ending-architect",
        timeCost: 12,
        preview: "Nur fuer tiefe Runs mit echter Musterarbeit.",
        requirements: [
          { type: "combo", comboId: "architect-trace", label: "Kombi 'Architect Trace' freischalten" },
          { type: "stat", stat: "insight", min: 6, label: "Mindestens 6 Insight" }
        ],
        effects: [
          { type: "setFlag", flag: "architectSignal", value: true },
          { type: "shift", amount: 1 },
          { type: "score", amount: 30 }
        ]
      }
    ])
  },
  {
    id: "red-room",
    title: "Die rote Kammer",
    location: "Blindraum unter dem Tower",
    objective: "Sprich mit Mira, bevor das Protokoll fuer euch beide entscheidet.",
    ambience: "Rotes Notlicht, Isolationsschaum, die Luft zu still fuer einen echten Raum.",
    visualTheme: "red",
    text: (state) => {
      if (state.flags.followedMemory && state.trust >= 1) {
        return "Mira steht vor dir, muede, aber wach. 'Endlich kommst du nicht nur bewaffnet. Das ist neu.'";
      }
      if (state.flags.ignoredCall) {
        return "Mira steht im roten Licht und hebt den Kopf nur halb. 'Wieder fast nicht rangegangen. Wieder fast zu spaet.'";
      }
      return "Mira steht vor dir, als waere sie schon den ganzen Abend hier gewesen. 'Du suchst mich nicht nur, Elias. Du schreibst mich.'";
    },
    npcLine: (state) =>
      state.flags.trustedJonas
        ? "Jonas ueber Funk: 'Ich halte den Ausgang offen. Sprich die Wahrheit aus, auch wenn sie dir nicht gefaellt.'"
        : "Jonas ueber Funk: 'Wenn du da drin bleibst, entscheidet diesmal der Raum fuer dich.'",
    warning: (state) => (state.realityShiftLevel >= 5 ? "PROTOKOLLKERN FREIGELEGT" : null),
    entryMessage: () => ({
      type: "mira",
      from: "Mira",
      text: "Du kannst mich loeschen, retten, verleugnen oder ersetzen. Nur ignorieren kannst du mich nicht mehr."
    }),
    choices: withChoices([
      {
        id: "ask-truth",
        label: "Fragen, was wirklich passiert ist",
        nextSceneId: "ending-truth",
        timeCost: 15,
        preview: "Offene Konfrontation mit maximaler Wahrheit.",
        effects: [
          { type: "setFlag", flag: "acceptedMira", value: true },
          { type: "stat", stat: "trust", amount: 1 },
          { type: "score", amount: 22 }
        ]
      },
      {
        id: "promise-rescue",
        label: "Versprechen, Mira hier herauszufuehren",
        nextSceneId: "ending-redemption",
        timeCost: 16,
        preview: "Schwer freizuschalten, aber die menschlichste Linie.",
        requirements: [
          { type: "stat", stat: "integrity", min: 6, label: "Mindestens 6 Integrity" },
          { type: "stat", stat: "trust", min: 1, label: "Mindestens 1 Trust" }
        ],
        effects: [
          { type: "setFlag", flag: "promisedRescue", value: true },
          { type: "setFlag", flag: "acceptedMira", value: true },
          { type: "stat", stat: "integrity", amount: 1 },
          { type: "score", amount: 26 }
        ]
      },
      {
        id: "deny-all",
        label: "Alles als Halluzination abtun",
        nextSceneId: "ending-erasure",
        timeCost: 10,
        preview: "Kontrolle durch Verdrangung. Hart und kalt.",
        effects: [
          { type: "setFlag", flag: "acceptedMira", value: false },
          { type: "stat", stat: "stress", amount: 1 },
          { type: "score", amount: 18 }
        ]
      },
      {
        id: "tear-protocol",
        label: "Das Protokoll zerreissen",
        nextSceneId: "ending-loop",
        timeCost: 9,
        preview: "Gewaltsamer Neustart in die Schleife.",
        effects: [
          { type: "shift", amount: 2 },
          { type: "score", amount: 20 }
        ]
      },
      {
        id: "accept-authorship",
        label: "Eigenen Anteil als Autor anerkennen",
        nextSceneId: "ending-architect",
        timeCost: 12,
        preview: "Meta-Ende fuer volle Mustererkenntnis.",
        requirements: [
          { type: "combo", comboId: "architect-trace", label: "Kombi 'Architect Trace' freischalten" },
          { type: "stat", stat: "insight", min: 6, label: "Mindestens 6 Insight" }
        ],
        effects: [
          { type: "setFlag", flag: "architectSignal", value: true },
          { type: "score", amount: 28 }
        ]
      }
    ])
  },
  {
    id: "ending-truth",
    title: "Ende: Das Originalprotokoll",
    location: "Archiv ohne Ausgang",
    objective: "Die Wahrheit gehoert dir jetzt. Was tust du mit ihr?",
    ambience: "Bandmaschinen, Kartons ohne Staub, jeder Ordner kennt deinen Namen.",
    visualTheme: "archive",
    isEnding: true,
    text: (state) =>
      state.flags.acceptedMira
        ? "Mira ueberreicht dir ein Bandgeraet. Darauf bist du selbst zu hoeren: 'Fall Elias Voss. Subjekt vergisst nach jedem Durchlauf, damit das Protokoll ueberlebt.'"
        : "Die Baender laufen stumm, aber alle Etiketten tragen deinen Namen und Miras Handschrift.",
    choices: withChoices([
      {
        id: "restart-truth",
        label: "Mit Wahrheit neu starten",
        nextSceneId: "office-night",
        timeCost: 0,
        preview: "Nimmt ein Fragment mit in den naechsten Loop.",
        effects: [
          { type: "shift", amount: 1 },
          { type: "stat", stat: "insight", amount: 1 }
        ]
      },
      {
        id: "restart-calm",
        label: "Bewusst ruhiger neu beginnen",
        nextSceneId: "office-night",
        timeCost: 0,
        preview: "Setzt auf Composure statt auf Eskalation.",
        effects: [
          { type: "stat", stat: "stress", amount: -1 },
          { type: "stat", stat: "integrity", amount: 1 }
        ]
      }
    ])
  },
  {
    id: "ending-redemption",
    title: "Ende: Red Line",
    location: "Treppenhaus nach draussen",
    objective: "Halte das Versprechen auch im Morgenlicht.",
    ambience: "Erstes Blau vor Sonnenaufgang, Schritte hinter euch, Funkrauschen wird endlich leiser.",
    visualTheme: "red",
    isEnding: true,
    text: () =>
      "Du fuehrst Mira aus der roten Kammer, nicht als Beweis, sondern als Person. Hinter euch knackt der Tower einmal, als waere ein alter Befehl widerrufen worden.",
    choices: withChoices([
      {
        id: "restart-redemption",
        label: "Mit Miras Vertrauen neu starten",
        nextSceneId: "office-night",
        timeCost: 0,
        preview: "Stark fuer weichere, stabilere Folgedurchlaeufe.",
        effects: [
          { type: "stat", stat: "trust", amount: 1 },
          { type: "stat", stat: "integrity", amount: 1 }
        ]
      },
      {
        id: "restart-signal",
        label: "Nur die Frequenz behalten",
        nextSceneId: "office-night",
        timeCost: 0,
        preview: "Mehr Shift, mehr Mira-Praesenz im naechsten Run.",
        effects: [
          { type: "shift", amount: 1 },
          { type: "setFlag", flag: "usedRelay", value: true }
        ]
      }
    ])
  },
  {
    id: "ending-erasure",
    title: "Ende: Selbstloeschung",
    location: "Leerer Verhoerraum",
    objective: "Du hast etwas beendet. Fraglich nur wen.",
    ambience: "Schwarze Monitore, kalter Rauchgeruch, ein Stuhl weniger als vorher.",
    visualTheme: "office",
    isEnding: true,
    text: (state) =>
      shifted(
        state,
        "Am Morgen existiert Mira in keiner Datei mehr. Nur dein Notizblock erinnert sich an eine Luecke, die zu gross fuer Zufall ist.",
        "Am Morgen existierst du in keiner Datei mehr. Jonas steht vor einem leeren Schreibtisch und kennt deinen Namen trotzdem.",
        4
      ),
    choices: withChoices([
      {
        id: "restart-erasure",
        label: "Aus der Luecke neu starten",
        nextSceneId: "office-night",
        timeCost: 0,
        preview: "Reset mit weniger Ruhe, aber mehr Zwang.",
        effects: [
          { type: "shift", amount: 1 },
          { type: "stat", stat: "stress", amount: 1 }
        ]
      },
      {
        id: "restart-empty",
        label: "Fast ohne Erinnerung beginnen",
        nextSceneId: "office-night",
        timeCost: 0,
        preview: "Schraubt Shift zurueck und gibt dir nochmal Luft.",
        effects: [
          { type: "shift", amount: -2 },
          { type: "stat", stat: "integrity", amount: 1 }
        ]
      }
    ])
  },
  {
    id: "ending-loop",
    title: "Ende: Echo-Schleife",
    location: "Polizeibuero / 02:13 Uhr",
    objective: "Der Anfang ist wieder da. Du diesmal auch?",
    ambience: "Dasselbe Zimmer, derselbe Regen, ein neuer Riss im Glas ueber dem Fenstergriff.",
    visualTheme: "office",
    isEnding: true,
    text: () =>
      "Du zerreisst das Protokoll. Das Licht flackert. Der Regen trommelt wieder gegen die Scheiben. Vor dir liegt Miras Vermisstenakte, geordnet, sauber und einen Hauch zu bereit.",
    warning: () => "DU BIST WIEDER AM ANFANG",
    choices: withChoices([
      {
        id: "restart-loop",
        label: "Noch einmal beginnen",
        nextSceneId: "office-night",
        timeCost: 0,
        preview: "Pure Wiederholung mit wachsendem Shift.",
        effects: [{ type: "shift", amount: 1 }]
      },
      {
        id: "restart-hard",
        label: "Die Schleife diesmal provozieren",
        nextSceneId: "office-night",
        timeCost: 0,
        preview: "Loest frueher mehr Druck aus, aber auch mehr Optionen.",
        effects: [
          { type: "stat", stat: "insight", amount: 1 },
          { type: "stat", stat: "stress", amount: 1 }
        ]
      }
    ])
  },
  {
    id: "ending-architect",
    title: "Ende: Architect Signal",
    location: "Nullarchiv / root channel",
    objective: "Du kennst den Namen des Autors. Nur die Richtung fehlt noch.",
    ambience: "Weisses Rauschen, schwarze Benutzeroberflaeche, dein Cursor blinkt als waere er schon angemeldet.",
    visualTheme: "signal",
    isEnding: true,
    text: () =>
      "Im Root-Channel liegt das erste Echo-Protokoll. Autor: Elias Voss. Letzte Notiz: 'Wenn Mira ueberlebt, muss ich mich spaeter selbst jagen.' Du kannst abbrechen. Oder beginnen.",
    choices: withChoices([
      {
        id: "restart-architect",
        label: "Als jaegender Elias neu starten",
        nextSceneId: "office-night",
        timeCost: 0,
        preview: "Meta-Reset mit starkem Insight-Vorteil.",
        effects: [
          { type: "stat", stat: "insight", amount: 2 },
          { type: "shift", amount: 1 }
        ]
      },
      {
        id: "restart-human",
        label: "Mensch vor Autor bleiben",
        nextSceneId: "office-night",
        timeCost: 0,
        preview: "Haelt dich stabiler, nimmt aber die Last mit.",
        effects: [
          { type: "stat", stat: "integrity", amount: 1 },
          { type: "stat", stat: "stress", amount: -1 }
        ]
      }
    ])
  }
];

export const TOTAL_SCENE_COUNT = SCENES.length;
export const TOTAL_ENDING_COUNT = SCENES.filter((scene) => scene.isEnding).length;

export function getSceneById(sceneId: string): EchoScene {
  return SCENES.find((entry) => entry.id === sceneId) ?? SCENES[0];
}
