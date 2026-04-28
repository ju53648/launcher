import type { EchoGameState, EchoScene, SceneChoice } from "../types/game";

function shifted(state: EchoGameState, normal: string, altered: string, threshold = 2): string {
  return state.realityShiftLevel >= threshold ? altered : normal;
}

function withBaseEntries(choices: SceneChoice[]): SceneChoice[] {
  return choices.map((choice) => ({
    ...choice,
    effects: [...choice.effects]
  }));
}

export const INITIAL_SCENE_ID = "office-night";

export const SCENES: EchoScene[] = [
  {
    id: "office-night",
    title: "Polizeibuero bei Nacht",
    location: "Mordkommission / 02:13 Uhr",
    text: (state) =>
      shifted(
        state,
        "Regen trommelt gegen die Scheiben. Vor dir liegt Miras Vermisstenakte.",
        "Regen trommelt gegen die Scheiben. Die Akte liegt wieder vor dir, obwohl du sie vor Stunden weggeschlossen hast."
      ),
    warning: (state) => (state.realityShiftLevel > 1 ? "ERINNERE DICH" : null),
    defaultCaseEntries: [{ type: "clue", text: "Mira Hartmann seit 11 Tagen vermisst." }],
    choices: withBaseEntries([
      {
        id: "open-file",
        label: "Miras Akte oeffnen",
        nextSceneId: "mira-file",
        effects: [
          { type: "setFlag", flag: "openedFile", value: true },
          { type: "addLog", entryType: "diary", text: "Ich habe die Akte geoeffnet. Mein Puls war zu hoch." },
          { type: "shift", amount: 1 }
        ]
      },
      {
        id: "wait-for-call",
        label: "Warten und den Anrufjournal pruefen",
        nextSceneId: "unknown-call",
        effects: [
          { type: "setFlag", flag: "openedFile", value: false },
          { type: "addLog", entryType: "clue", text: "Drei verpasste Anrufe ohne Nummer." }
        ]
      }
    ])
  },
  {
    id: "mira-file",
    title: "Miras Akte",
    location: "Archivzimmer",
    text: (state) =>
      shifted(
        state,
        "Die Akte ist duenn. Zu duenn fuer ein echtes Verschwinden.",
        "Die Akte ist voller Notizen in deiner Handschrift. Du erinnerst dich nicht daran, sie geschrieben zu haben.",
        1
      ),
    npcLine: (state) =>
      shifted(
        state,
        "Kollege Jonas: 'Nimm dir Zeit. Wir druecken nichts durch.'",
        "Kollege Jonas: 'Du hast damals dieselben Saetze gesagt, Elias.'",
        2
      ),
    defaultCaseEntries: [{ type: "photo", text: "Passfoto von Mira. Kratzer quer ueber dem Gesicht." }],
    choices: withBaseEntries([
      {
        id: "inspect-photo",
        label: "Das Foto genauer untersuchen",
        nextSceneId: "photo-discovery",
        effects: [
          { type: "addLog", entryType: "photo", text: "Auf dem Foto steht hinter Mira eine verschwommene Silhouette." },
          { type: "shift", amount: 1 }
        ]
      },
      {
        id: "burn-copy",
        label: "Eine Kopie der Akte vernichten",
        nextSceneId: "unknown-call",
        effects: [
          { type: "setFlag", flag: "burnedFile", value: true },
          { type: "addLog", entryType: "diary", text: "Ich habe Seiten verbrannt. Warum fuehlt es sich vertraut an?" },
          { type: "shift", amount: 2 }
        ]
      }
    ])
  },
  {
    id: "photo-discovery",
    title: "Fotoanalyse",
    location: "Dunkelkammer",
    text: (state) =>
      shifted(
        state,
        "Mit jeder Vergroesserung wird klar: Im Hintergrund stehst du.",
        "Mit jeder Vergroesserung wird klar: Du umarmst Mira im Hintergrund und laechelst.",
        2
      ),
    defaultCaseEntries: [{ type: "clue", text: "Foto zeigt Elias Voss im Hintergrund hinter Mira." }],
    choices: withBaseEntries([
      {
        id: "accept-memory",
        label: "Erinnerungsfetzen zulassen",
        nextSceneId: "interrogate-jonas",
        effects: [
          { type: "setFlag", flag: "followedMemory", value: true },
          { type: "addLog", entryType: "diary", text: "Ich hoere Miras Stimme in meinem Kopf." },
          { type: "shift", amount: 1 }
        ]
      },
      {
        id: "deny-memory",
        label: "Foto als Faelschung einstufen",
        nextSceneId: "unknown-call",
        effects: [
          { type: "setFlag", flag: "followedMemory", value: false },
          { type: "addLog", entryType: "clue", text: "Moegliche Manipulation der Bilddaten." }
        ]
      }
    ])
  },
  {
    id: "unknown-call",
    title: "Unbekannter Anruf",
    location: "Flur der Dienststelle",
    text: (state) =>
      shifted(
        state,
        "Das Telefon klingelt. Keine Nummer, nur statisches Rauschen.",
        "Das Telefon klingelt mit deiner eigenen Stimme am anderen Ende: 'Leg nicht auf. Du hast Mira schon einmal verloren.'",
        2
      ),
    warning: (state) => (state.realityShiftLevel >= 3 ? "DU WARST SCHON HIER" : null),
    choices: withBaseEntries([
      {
        id: "pick-up",
        label: "Abheben und zuhoeren",
        nextSceneId: "interrogate-jonas",
        effects: [
          { type: "setFlag", flag: "ignoredCall", value: false },
          { type: "addLog", entryType: "clue", text: "Anrufer kennt den Tatort, bevor ich ihn erwaehne." },
          { type: "shift", amount: 1 }
        ]
      },
      {
        id: "ignore-call",
        label: "Nicht rangehen",
        nextSceneId: "interrogate-jonas",
        effects: [
          { type: "setFlag", flag: "ignoredCall", value: true },
          { type: "addLog", entryType: "diary", text: "Ich habe den Anruf ignoriert. Das Klingeln hat nicht aufgehoert." },
          { type: "shift", amount: 1 }
        ]
      }
    ])
  },
  {
    id: "interrogate-jonas",
    title: "Verhoer: Jonas",
    location: "Raum 4 / Spiegelglas",
    text: (state) =>
      shifted(
        state,
        "Jonas behauptet, Mira sei nur eine Zeugin gewesen.",
        "Jonas behauptet, Mira sei deine Partnerin gewesen. Er zeigt dir ein Einsatzprotokoll mit deiner Unterschrift.",
        2
      ),
    npcLine: (state) =>
      state.flags.trustedJonas
        ? "Jonas: 'Ich habe dir damals versprochen, dich zu schuetzen.'"
        : "Jonas: 'Du glaubst mir nicht. Genau wie beim ersten Mal.'",
    choices: withBaseEntries([
      {
        id: "trust-jonas",
        label: "Jonas glauben",
        nextSceneId: "shifting-diary",
        effects: [
          { type: "setFlag", flag: "trustedJonas", value: true },
          { type: "addLog", entryType: "clue", text: "Jonas kennt Details, die nicht in der Akte stehen." },
          { type: "shift", amount: 1 }
        ]
      },
      {
        id: "threaten-jonas",
        label: "Jonas unter Druck setzen",
        nextSceneId: "shifting-diary",
        effects: [
          { type: "setFlag", flag: "trustedJonas", value: false },
          { type: "addLog", entryType: "diary", text: "Jonas ist nervoes. Oder ich sehe nur, was ich sehen will." },
          { type: "shift", amount: 2 }
        ]
      }
    ])
  },
  {
    id: "shifting-diary",
    title: "Tagebuchseite",
    location: "Asservatenraum",
    text: (state) =>
      shifted(
        state,
        "Miras Tagebuch beschreibt eine fremde Person namens 'E.V.'.",
        "Miras Tagebuch beschreibt euch beide. Die Tinte ist frisch, obwohl die Seite alt ist.",
        2
      ),
    defaultCaseEntries: [{ type: "diary", text: "'Wenn Elias sich erinnert, beginnt alles von vorn.'" }],
    choices: withBaseEntries([
      {
        id: "take-page",
        label: "Seite sichern",
        nextSceneId: "crime-scene-return",
        effects: [
          { type: "addLog", entryType: "clue", text: "Tagebuchseite verweist auf den alten Tatort im Hafen." },
          { type: "shift", amount: 1 }
        ]
      },
      {
        id: "leave-page",
        label: "Seite zuruecklassen",
        nextSceneId: "crime-scene-return",
        effects: [
          { type: "addLog", entryType: "diary", text: "Die Seite lag ploetzlich wieder im Buch, obwohl ich sie in der Hand hatte." },
          { type: "shift", amount: 2 }
        ]
      }
    ])
  },
  {
    id: "crime-scene-return",
    title: "Rueckkehr zum Tatort",
    location: "Hafenlager 17",
    text: (state) =>
      shifted(
        state,
        "Das Lager ist leer. Nur Kreidemarkierungen auf dem Boden.",
        "Das Lager ist nicht leer. Jemand hat deinen Namen hundertmal an die Wand geschrieben.",
        3
      ),
    warning: (state) => (state.realityShiftLevel >= 4 ? "NICHT DEIN ERSTER DURCHLAUF" : null),
    defaultCaseEntries: [{ type: "photo", text: "Polaroid vom Tatort: Im Spiegel steht 'Elias war hier'." }],
    choices: withBaseEntries([
      {
        id: "follow-whispers",
        label: "Den Stimmen ins Untergeschoss folgen",
        nextSceneId: "mira-twist",
        effects: [
          { type: "setFlag", flag: "followedMemory", value: true },
          { type: "shift", amount: 1 }
        ]
      },
      {
        id: "secure-perimeter",
        label: "Verstaerkung anfordern und warten",
        nextSceneId: "mira-twist",
        effects: [
          { type: "setFlag", flag: "followedMemory", value: false },
          { type: "addLog", entryType: "clue", text: "Funkgeraet antwortet mit meiner eigenen Kennung." },
          { type: "shift", amount: 1 }
        ]
      }
    ])
  },
  {
    id: "mira-twist",
    title: "Echo im Keller",
    location: "Untergeschoss / Blindkammer",
    text: (state) => {
      if (state.flags.followedMemory && state.realityShiftLevel >= 4) {
        return "Mira steht vor dir. 'Du suchst mich nicht, Elias. Du wiederholst mich.'";
      }
      if (state.flags.ignoredCall) {
        return "Ein Lautsprecher springt an. Miras Stimme: 'Wenn du wieder schweigst, verschwinde ich wieder.'";
      }
      return "Mira erscheint im roten Notlicht. 'Du hast mich doch selbst aus den Akten geloescht.'";
    },
    npcLine: (state) =>
      state.flags.trustedJonas
        ? "Jonas (ueber Funk): 'Frag sie nach dem ersten Protokoll.'"
        : "Jonas (ueber Funk): 'Geh da raus, das ist nicht real.'",
    warning: (state) => (state.realityShiftLevel >= 5 ? "ERINNERE DICH" : null),
    choices: withBaseEntries([
      {
        id: "accept-mira",
        label: "Mira glauben",
        nextSceneId: "ending-truth",
        effects: [
          { type: "setFlag", flag: "acceptedMira", value: true },
          { type: "addLog", entryType: "diary", text: "Mira nennt mich beim vollen Namen, als waere ich ihr Partner gewesen." }
        ]
      },
      {
        id: "reject-mira",
        label: "Mira als Halluzination abtun",
        nextSceneId: "ending-erasure",
        effects: [
          { type: "setFlag", flag: "acceptedMira", value: false },
          { type: "shift", amount: 1 }
        ]
      },
      {
        id: "break-loop",
        label: "Das Protokoll zerreissen",
        nextSceneId: "ending-loop",
        effects: [{ type: "shift", amount: 2 }]
      }
    ])
  },
  {
    id: "ending-truth",
    title: "Ende: Das Originalprotokoll",
    location: "Archiv ohne Ausgang",
    isEnding: true,
    text: (state) =>
      state.flags.acceptedMira
        ? "Mira ueberreicht dir ein Bandgeraet. Darauf bist du: 'Fall Elias Voss. Subjekt vergisst nach jedem Durchlauf.'"
        : "Die Aufnahme bleibt stumm, aber dein Name steht auf jedem Etikett.",
    choices: withBaseEntries([
      {
        id: "restart-truth",
        label: "Neuen Durchlauf starten",
        nextSceneId: "office-night",
        effects: [{ type: "shift", amount: 1 }]
      },
      {
        id: "hold-fragment",
        label: "Mit Erinnerungsfragment weiterspielen",
        nextSceneId: "office-night",
        effects: [{ type: "setFlag", flag: "followedMemory", value: true }]
      }
    ])
  },
  {
    id: "ending-erasure",
    title: "Ende: Selbstloeschung",
    location: "Leerer Verhoerraum",
    isEnding: true,
    text: (state) =>
      shifted(
        state,
        "Du gehst rueckwaerts aus dem Raum. Am Morgen existiert Mira in keiner Datei mehr.",
        "Du gehst rueckwaerts aus dem Raum. Am Morgen existierst du in keiner Datei mehr.",
        4
      ),
    choices: withBaseEntries([
      {
        id: "restart-erasure",
        label: "Die Akte trotzdem wieder oeffnen",
        nextSceneId: "office-night",
        effects: [{ type: "setFlag", flag: "openedFile", value: true }]
      },
      {
        id: "restart-empty",
        label: "Ohne Erinnerung starten",
        nextSceneId: "office-night",
        effects: [{ type: "shift", amount: -2 }]
      }
    ])
  },
  {
    id: "ending-loop",
    title: "Ende: Echo-Schleife",
    location: "Polizeibuero / 02:13 Uhr",
    isEnding: true,
    text: () =>
      "Du zerreisst das Protokoll. Das Licht flackert. Regen trommelt gegen die Scheiben. Vor dir liegt Miras Vermisstenakte.",
    warning: () => "DU BIST WIEDER AM ANFANG",
    choices: withBaseEntries([
      {
        id: "restart-loop",
        label: "Noch einmal beginnen",
        nextSceneId: "office-night",
        effects: [{ type: "shift", amount: 1 }]
      },
      {
        id: "restart-hard",
        label: "Schleife ignorieren",
        nextSceneId: "office-night",
        effects: [{ type: "setFlag", flag: "ignoredCall", value: true }]
      }
    ])
  }
];

export function getSceneById(sceneId: string): EchoScene {
  const scene = SCENES.find((entry) => entry.id === sceneId);
  if (!scene) {
    return SCENES[0];
  }
  return scene;
}
