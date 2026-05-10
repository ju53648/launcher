import type { EchoGameState } from "../types/game";

export type EchoCutsceneFrame = "cctv" | "dossier" | "transcript" | "polaroid" | "dispatch";

export interface EchoCutsceneSlide {
  assetId: string;
  overline: string;
  title: string;
  body: string;
  frame: EchoCutsceneFrame;
  placeholderLabel: string;
  neededAsset: string;
  direction?: string;
  scriptLine?: string;
  sourceTag?: string;
  timecode?: string;
  audioCue?: string;
}

export interface EchoCutscene {
  id: string;
  sceneId: string;
  unlocksWhen?: (state: EchoGameState) => boolean;
  slides: EchoCutsceneSlide[];
}

export const ECHO_CUTSCENES: EchoCutscene[] = [
  {
    id: "case-spiral-intro",
    sceneId: "office-night",
    slides: [
      {
        assetId: "northwing-cctv",
        overline: "Case Spiral / evidence ingest",
        title: "Nordfluegel, 02:13",
        body: "Noch bevor Elias die Akte beruehrt, hat der Raum bereits entschieden, dass diese Nacht anders katalogisiert wird als die anderen.",
        frame: "cctv",
        placeholderLabel: "CCTV still placeholder",
        neededAsset: "Ueberwachungsfoto eines leeren Polizeiflurs mit Regenlicht, 16:9, leicht unscharf.",
        direction: "Kamerabild soll nach echter Gebaeudeueberwachung aussehen, nicht nach Cinematic Key Art.",
        scriptLine: "02:13. Nordfluegel. Noch ist niemand zu sehen, aber der Fall ist schon im Raum.",
        sourceTag: "CAM 04 / NORTH WING",
        timecode: "02:13:08",
        audioCue: "Klimaanlage, Regen an Bleiglas, entferntes Neonbrummen"
      },
      {
        assetId: "desk-dossier-scan",
        overline: "Recovered desk note",
        title: "Mira war zuletzt nicht nur ein Fall",
        body: "Die ersten Spuren sollen sich wie echte Fundstuecke anfuehlen: Notizzettel, Aktenkanten, Polaroids, Transkripte. Genau dafuer ist dieses Interlude-System gedacht.",
        frame: "dossier",
        placeholderLabel: "Dossier scan placeholder",
        neededAsset: "Akte/Schreibtsich-Scan mit Markierungen, Tesafilm, Kaffeering und Ermittler-Notizen.",
        direction: "Das Material darf benutzt, schief und angefasst wirken. Lieber echt als sauber.",
        scriptLine: "Mira Hartmann. 11 Tage vermisst. Letzter gesicherter Kontakt: du.",
        sourceTag: "DESK SCAN / CASE SPIRAL",
        timecode: "02:14:21",
        audioCue: "Papierfalten, Lampensummen, ein einzelnes Tropfen vom Fensterrahmen"
      }
    ]
  },
  {
    id: "signal-trace-interlude",
    sceneId: "signal-trace",
    slides: [
      {
        assetId: "signal-trace-transcript",
        overline: "Intercept / stairwell feed",
        title: "Die Stimme laeuft nicht nach draussen",
        body: "Wenn das Spiel realistischer wirken soll, brauchen Schluesselmomente eine Form, die wie abgefilmte Beweise und nicht wie Menuetext wirkt.",
        frame: "transcript",
        placeholderLabel: "Audio transcript placeholder",
        neededAsset: "Abgetipptes Funk-/Band-Transcript oder Voiceover-Text fuer Elias / Mira / Dispatch.",
        direction: "Rauschen, Fehler, Luecken und Amtsdeutsch helfen mehr als perfekte Lesbarkeit.",
        scriptLine: "Dispatch: Keine Leitung ist fuer diesen Apparat registriert. Wenn das Ding klingelt, ruft niemand Offizielles an.",
        sourceTag: "STAIRWELL INTERCEPT / CH B",
        timecode: "03:02:44",
        audioCue: "Bandrauschen, Schaltknacken, Stimme knapp vor dem Abbruch"
      },
      {
        assetId: "relay-ghost-route",
        overline: "Relay ghost route",
        title: "Das Gebaeude antwortet intern",
        body: "Hier koennte spaeter ein echtes Kabelschacht-Foto, ein leicht animiertes Standbild oder ein kurzer Glitch-Clip liegen.",
        frame: "dispatch",
        placeholderLabel: "Signal map placeholder",
        neededAsset: "Technik-Visual: Kabelschacht, Relaispanel oder abstrakte Signalkarte in duesterem Look.",
        direction: "Mehr Infrastruktur-Horror als Sci-Fi. Dunkle Schacht- oder Rack-Energie.",
        scriptLine: "Die Antwort kommt nicht aus der Stadt. Sie kommt aus dem Gebaeude selbst.",
        sourceTag: "RELAY MAINTENANCE / INTERNAL",
        timecode: "03:05:10",
        audioCue: "Nasses Kabelbrummen, fernes Klappern, falsch getaktetes Relais"
      }
    ]
  },
  {
    id: "red-room-reveal",
    sceneId: "red-room",
    slides: [
      {
        assetId: "mira-red-room-still",
        overline: "Red room / recovered visual",
        title: "Mira tritt aus der Akte in den Raum",
        body: "Ab hier lohnt sich ein echtes Character-Still oder eine inszenierte Halbfigur, damit die Konfrontation wie ein verbotener Fund und nicht wie ein Dialogfenster wirkt.",
        frame: "polaroid",
        placeholderLabel: "Character still placeholder",
        neededAsset: "Stilisierte Aufnahme von Mira im roten Notlicht, halb dokumentarisch, halb verfremdet.",
        direction: "Nicht glamourous. Eher gefundenes Material, das eigentlich nie haette auftauchen duerfen.",
        scriptLine: "Du suchst mich nicht nur, Elias. Du schreibst mich.",
        sourceTag: "RECOVERED STILL / RED ROOM",
        timecode: "03:41:02",
        audioCue: "Notstromsirren, Atem nah am Mikro, Raumhall"
      }
    ]
  },
  {
    id: "architect-echo",
    sceneId: "ending-architect",
    slides: [
      {
        assetId: "nullarchive-root-channel",
        overline: "Nullarchiv / root channel",
        title: "Der Autor war schon hier",
        body: "Dieses Ende gewinnt stark durch eine Fake-Systemoberflaeche oder ein Root-Channel-Visual mit Elias als Akteur innerhalb des Protokolls.",
        frame: "dispatch",
        placeholderLabel: "Root channel placeholder",
        neededAsset: "Faux-terminal oder UI-Screenshot im Stil eines internen Archivs mit rotem Warnakzent.",
        direction: "Soll wie ein interner Leak aussehen: glaubwuerdige Systemreste, keine futuristische Hochglanzoberflaeche.",
        scriptLine: "Das System fuehrt Elias Voss nicht nur als Ermittler. Irgendwo steht Autor.",
        sourceTag: "ROOT CHANNEL / NULLARCHIVE",
        timecode: "04:28:55",
        audioCue: "Serverraumluft, leise Plattenzugriffe, Alarmschwelle unterdrueckt"
      }
    ]
  },
  {
    id: "redemption-exit",
    sceneId: "ending-redemption",
    slides: [
      {
        assetId: "exit-corridor-dawn",
        overline: "Exit corridor / dawn",
        title: "Ein Durchlauf hat einen Ausgang gesehen",
        body: "Ein echter Abschluss-Moment mit Flur, Morgenlicht und zwei Figuren wuerde dieses Ende massiv aufwerten und es filmischer machen.",
        frame: "cctv",
        placeholderLabel: "Exit shot placeholder",
        neededAsset: "Gang/Notausgang-Foto oder Cinematic-Still mit blauem Morgenlicht und zwei Silhouetten.",
        direction: "Still, leise, nicht heroisch. Ein Ende, das sich verdient anfuehlt.",
        scriptLine: "Zum ersten Mal sieht der Gang nicht wie eine Schleife aus.",
        sourceTag: "EXIT CAM / DAWN BLEED",
        timecode: "05:56:13",
        audioCue: "Morgenluft, entfernte Stadt, Schuhe auf Linoleum"
      }
    ]
  }
];

export function getCutsceneById(cutsceneId: string) {
  return ECHO_CUTSCENES.find((cutscene) => cutscene.id === cutsceneId) ?? null;
}

export function getCutsceneForScene(sceneId: string, state: EchoGameState) {
  return (
    ECHO_CUTSCENES.find(
      (cutscene) =>
        cutscene.sceneId === sceneId &&
        !state.seenCutscenes.includes(cutscene.id) &&
        (!cutscene.unlocksWhen || cutscene.unlocksWhen(state))
    ) ?? null
  );
}
