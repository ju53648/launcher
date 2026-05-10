export type EchoCutsceneAssetMedia = "image" | "video";

export interface EchoCutsceneAssetSlot {
  id: string;
  label: string;
  preferredMedia: EchoCutsceneAssetMedia;
  dropFolder: string;
  acceptedFiles: string[];
  placeholderFile: string;
  note: string;
}

const DROP_FOLDER = "/assets/echo-protocol/cutscenes/slots";
const PLACEHOLDER_FOLDER = "/assets/echo-protocol/cutscenes/placeholders";

function buildAcceptedFiles(baseName: string) {
  return [`${baseName}.mp4`, `${baseName}.webm`, `${baseName}.png`, `${baseName}.jpg`, `${baseName}.jpeg`];
}

export const ECHO_CUTSCENE_ASSET_SLOTS: EchoCutsceneAssetSlot[] = [
  {
    id: "northwing-cctv",
    label: "Nordfluegel CCTV",
    preferredMedia: "image",
    dropFolder: DROP_FOLDER,
    acceptedFiles: buildAcceptedFiles("northwing-cctv"),
    placeholderFile: `${PLACEHOLDER_FOLDER}/northwing-cctv.svg`,
    note: "Leerer Flur, Regenlicht, Ueberwachungslook."
  },
  {
    id: "desk-dossier-scan",
    label: "Desk Dossier Scan",
    preferredMedia: "image",
    dropFolder: DROP_FOLDER,
    acceptedFiles: buildAcceptedFiles("desk-dossier-scan"),
    placeholderFile: `${PLACEHOLDER_FOLDER}/desk-dossier-scan.svg`,
    note: "Akte, Schreibtisch, Kaffeering, Marker, benutztes Material."
  },
  {
    id: "signal-trace-transcript",
    label: "Signal Transcript",
    preferredMedia: "image",
    dropFolder: DROP_FOLDER,
    acceptedFiles: buildAcceptedFiles("signal-trace-transcript"),
    placeholderFile: `${PLACEHOLDER_FOLDER}/signal-trace-transcript.svg`,
    note: "Abhoer-/Transcript-Look oder grafische Funkspur."
  },
  {
    id: "relay-ghost-route",
    label: "Relay Ghost Route",
    preferredMedia: "video",
    dropFolder: DROP_FOLDER,
    acceptedFiles: buildAcceptedFiles("relay-ghost-route"),
    placeholderFile: `${PLACEHOLDER_FOLDER}/relay-ghost-route.svg`,
    note: "Technikraum, Kabelschacht oder leicht animierter Glitch-Loop."
  },
  {
    id: "mira-red-room-still",
    label: "Mira Red Room",
    preferredMedia: "image",
    dropFolder: DROP_FOLDER,
    acceptedFiles: buildAcceptedFiles("mira-red-room-still"),
    placeholderFile: `${PLACEHOLDER_FOLDER}/mira-red-room-still.svg`,
    note: "Mira im roten Notlicht, dokumentarisch und leicht falsch."
  },
  {
    id: "nullarchive-root-channel",
    label: "Nullarchive Root Channel",
    preferredMedia: "image",
    dropFolder: DROP_FOLDER,
    acceptedFiles: buildAcceptedFiles("nullarchive-root-channel"),
    placeholderFile: `${PLACEHOLDER_FOLDER}/nullarchive-root-channel.svg`,
    note: "Faux-Root-UI oder interner Leak-Screen."
  },
  {
    id: "exit-corridor-dawn",
    label: "Exit Corridor Dawn",
    preferredMedia: "image",
    dropFolder: DROP_FOLDER,
    acceptedFiles: buildAcceptedFiles("exit-corridor-dawn"),
    placeholderFile: `${PLACEHOLDER_FOLDER}/exit-corridor-dawn.svg`,
    note: "Notausgang/Gang, Morgenblau, stiller Abschluss."
  }
];

export function getCutsceneAssetSlot(assetId: string) {
  return ECHO_CUTSCENE_ASSET_SLOTS.find((slot) => slot.id === assetId) ?? null;
}

