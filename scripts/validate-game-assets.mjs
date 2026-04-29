import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const IMAGE_FIELDS = ["coverImage", "bannerImage", "iconImage"];

function parseArguments(argv) {
  const args = { manifests: [] };
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--manifest") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --manifest");
      }
      args.manifests.push(value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function collectDefaultManifestPaths() {
  return [
    path.join(repoRoot, "distribution", "manifests", "games"),
    path.join(repoRoot, "src-tauri", "manifests")
  ]
    .flatMap((directoryPath) => {
      if (!fs.existsSync(directoryPath)) {
        return [];
      }

      return fs
        .readdirSync(directoryPath)
        .filter((fileName) => fileName.toLowerCase().endsWith(".json"))
        .map((fileName) => path.join(directoryPath, fileName));
    })
    .sort((left, right) => left.localeCompare(right));
}

function validateSvg(pathToFile) {
  const raw = fs.readFileSync(pathToFile, "utf8");
  const compact = raw.toLowerCase();
  if (!compact.includes("<svg") || !compact.includes("</svg>")) {
    return "SVG markup appears incomplete";
  }
  return null;
}

function validateImageReference(manifestPath, manifest, fieldName) {
  const errors = [];
  const value = manifest[fieldName];
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${fieldName} must be a non-empty string`);
    return errors;
  }

  if (value.startsWith("data:image/")) {
    return errors;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("asset:")) {
    return errors;
  }

  if (!value.startsWith("/")) {
    errors.push(`${fieldName} must start with '/' or use an absolute URL/data URI`);
    return errors;
  }

  const publicAssetPath = path.join(repoRoot, "public", value.slice(1));
  if (!fs.existsSync(publicAssetPath)) {
    errors.push(`${fieldName} points to missing file in public/: ${value}`);
    return errors;
  }

  if (publicAssetPath.toLowerCase().endsWith(".svg")) {
    const svgError = validateSvg(publicAssetPath);
    if (svgError) {
      errors.push(`${fieldName} invalid SVG (${value}): ${svgError}`);
    }
  }

  const distAssetPath = path.join(repoRoot, "dist", value.slice(1));
  if (fs.existsSync(path.join(repoRoot, "dist")) && !fs.existsSync(distAssetPath)) {
    errors.push(
      `${fieldName} exists in public but is missing in dist build output: ${value}`
    );
  }

  return errors;
}

function validateManifest(manifestPath) {
  const errors = [];

  let manifest;
  try {
    const raw = fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, "");
    manifest = JSON.parse(raw);
  } catch (error) {
    return [`Could not read JSON: ${error.message}`];
  }

  for (const fieldName of IMAGE_FIELDS) {
    errors.push(...validateImageReference(manifestPath, manifest, fieldName));
  }

  return errors;
}

function toWorkspaceRelative(absolutePath) {
  return path.relative(repoRoot, absolutePath).replaceAll("\\", "/");
}

function main() {
  const args = parseArguments(process.argv);
  const manifestPaths =
    args.manifests.length > 0
      ? args.manifests.map((manifestPath) => path.resolve(repoRoot, manifestPath))
      : collectDefaultManifestPaths();

  if (manifestPaths.length === 0) {
    console.log("No manifest files found for image validation.");
    return;
  }

  let failureCount = 0;

  for (const manifestPath of manifestPaths) {
    if (!fs.existsSync(manifestPath)) {
      console.error(`✗ ${toWorkspaceRelative(manifestPath)}: file not found`);
      failureCount += 1;
      continue;
    }

    const errors = validateManifest(manifestPath);
    if (errors.length === 0) {
      console.log(`✓ ${toWorkspaceRelative(manifestPath)}`);
      continue;
    }

    failureCount += errors.length;
    console.error(`✗ ${toWorkspaceRelative(manifestPath)}`);
    for (const message of errors) {
      console.error(`  - ${message}`);
    }
  }

  if (failureCount > 0) {
    process.exitCode = 1;
    console.error(`Game image validation failed with ${failureCount} issue(s).`);
    return;
  }

  console.log(`Game image validation passed for ${manifestPaths.length} manifest(s).`);
}

main();