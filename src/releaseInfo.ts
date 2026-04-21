import releaseInfoJson from "../release-info.json";

export interface ReleaseInfo {
  version: string;
  title: string;
  date: string;
  notes: string[];
}

function normalizeReleaseInfo(value: ReleaseInfo): ReleaseInfo {
  const version = value.version.trim();
  const title = value.title.trim();
  const date = value.date.trim();
  const notes = value.notes.map((note) => note.trim()).filter(Boolean);

  if (!version || !title || !date || notes.length === 0) {
    throw new Error("release-info.json is missing required release metadata.");
  }

  return {
    version,
    title,
    date,
    notes
  };
}

export const releaseInfo = normalizeReleaseInfo(releaseInfoJson as ReleaseInfo);
