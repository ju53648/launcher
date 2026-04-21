import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseInfoPath = path.join(rootDir, "release-info.json");
const packageJsonPath = path.join(rootDir, "package.json");
const packageLockPath = path.join(rootDir, "package-lock.json");
const cargoTomlPath = path.join(rootDir, "src-tauri", "Cargo.toml");
const tauriConfigPath = path.join(rootDir, "src-tauri", "tauri.conf.json");
const latestJsonPath = path.join(rootDir, "distribution", "latest.json");

const PLACEHOLDER_UPDATER_URL = "__GENERATED_IN_CI__";
const PLACEHOLDER_SIGNATURE = "__GENERATED_IN_CI__";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeReleaseInfo(value) {
  if (!value || typeof value !== "object") {
    throw new Error("release-info.json must contain a JSON object.");
  }

  const version = typeof value.version === "string" ? value.version.trim() : "";
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const date = typeof value.date === "string" ? value.date.trim() : "";
  const notes = Array.isArray(value.notes)
    ? value.notes
        .map((note) => (typeof note === "string" ? note.trim() : ""))
        .filter(Boolean)
    : [];

  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error('release-info.json version must use plain semver like "0.3.1".');
  }
  if (!title) {
    throw new Error("release-info.json title must be a non-empty string.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('release-info.json date must use "YYYY-MM-DD".');
  }
  if (notes.length === 0) {
    throw new Error("release-info.json notes must contain at least one release note.");
  }

  return { version, title, date, notes };
}

function buildPubDate(date) {
  return `${date}T00:00:00Z`;
}

function buildNotesBody(releaseInfo) {
  return [releaseInfo.title, "", ...releaseInfo.notes.map((note) => `- ${note}`)].join("\n");
}

function updateCargoVersion(filePath, version) {
  const raw = fs.readFileSync(filePath, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  let inPackageSection = false;
  let replaced = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^\[package\]\s*$/.test(line)) {
      inPackageSection = true;
      continue;
    }

    if (inPackageSection && /^\[.+\]\s*$/.test(line)) {
      break;
    }

    if (inPackageSection && /^version\s*=\s*".*"\s*$/.test(line)) {
      lines[index] = `version = "${version}"`;
      replaced = true;
      break;
    }
  }

  if (!replaced) {
    throw new Error("Could not find the [package] version entry in src-tauri/Cargo.toml.");
  }

  fs.writeFileSync(filePath, lines.join(eol));
}

const releaseInfo = normalizeReleaseInfo(readJson(releaseInfoPath));

const packageJson = readJson(packageJsonPath);
packageJson.version = releaseInfo.version;
writeJson(packageJsonPath, packageJson);

const packageLock = readJson(packageLockPath);
packageLock.version = releaseInfo.version;
if (packageLock.packages?.[""]) {
  packageLock.packages[""].version = releaseInfo.version;
}
writeJson(packageLockPath, packageLock);

updateCargoVersion(cargoTomlPath, releaseInfo.version);

const tauriConfig = readJson(tauriConfigPath);
tauriConfig.version = releaseInfo.version;
writeJson(tauriConfigPath, tauriConfig);

writeJson(latestJsonPath, {
  version: releaseInfo.version,
  title: releaseInfo.title,
  notes: buildNotesBody(releaseInfo),
  notesList: releaseInfo.notes,
  pub_date: buildPubDate(releaseInfo.date),
  platforms: {
    "windows-x86_64": {
      url: PLACEHOLDER_UPDATER_URL,
      signature: PLACEHOLDER_SIGNATURE
    }
  }
});

console.log(
  `[release-sync] Synced ${releaseInfo.version} from ${path.relative(rootDir, releaseInfoPath)}`
);
