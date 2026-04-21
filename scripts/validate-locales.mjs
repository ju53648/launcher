import fs from "node:fs";
import path from "node:path";

const baseLocale = "en";
const locales = ["de", "pl"];
const failures = [];

validateDirectory("src/i18n/locales");
validateDirectory("src/i18n/content");

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}

console.log("Locale validation passed for en, de, and pl.");

function validateDirectory(directory) {
  const localeDir = path.resolve(directory);
  const base = JSON.parse(fs.readFileSync(path.join(localeDir, `${baseLocale}.json`), "utf8"));

  for (const locale of locales) {
    const candidate = JSON.parse(fs.readFileSync(path.join(localeDir, `${locale}.json`), "utf8"));
    compareLocale(locale, base, candidate, []);
  }
}

function compareLocale(locale, source, candidate, trail) {
  const sourceKeys = Object.keys(source);
  const candidateKeys = Object.keys(candidate);

  for (const key of sourceKeys) {
    const nextTrail = [...trail, key];
    if (!(key in candidate)) {
      failures.push(`[${locale}] Missing key: ${nextTrail.join(".")}`);
      continue;
    }

    const sourceValue = source[key];
    const candidateValue = candidate[key];

    if (Array.isArray(sourceValue)) {
      if (!Array.isArray(candidateValue)) {
        failures.push(`[${locale}] Expected array at ${nextTrail.join(".")}`);
        continue;
      }

      if (sourceValue.length !== candidateValue.length) {
        failures.push(
          `[${locale}] Array length mismatch at ${nextTrail.join(".")} (expected ${sourceValue.length}, actual ${candidateValue.length})`
        );
      }

      for (let index = 0; index < Math.min(sourceValue.length, candidateValue.length); index += 1) {
        const sourceEntry = sourceValue[index];
        const candidateEntry = candidateValue[index];
        const entryTrail = [...nextTrail, String(index)];

        if (typeof sourceEntry === "string") {
          if (typeof candidateEntry !== "string") {
            failures.push(`[${locale}] Expected string at ${entryTrail.join(".")}`);
            continue;
          }
          comparePlaceholders(locale, entryTrail, sourceEntry, candidateEntry);
          continue;
        }

        if (isObject(sourceEntry)) {
          if (!isObject(candidateEntry)) {
            failures.push(`[${locale}] Expected object at ${entryTrail.join(".")}`);
            continue;
          }
          compareLocale(locale, sourceEntry, candidateEntry, entryTrail);
        }
      }

      continue;
    }

    if (isPluralLeaf(sourceValue)) {
      if (!isPluralLeaf(candidateValue)) {
        failures.push(`[${locale}] Expected plural leaf at ${nextTrail.join(".")}`);
        continue;
      }

      comparePlaceholders(locale, nextTrail, sourceValue.other, candidateValue.other);
      continue;
    }

    if (typeof sourceValue === "string") {
      if (typeof candidateValue !== "string") {
        failures.push(`[${locale}] Expected string at ${nextTrail.join(".")}`);
        continue;
      }

      comparePlaceholders(locale, nextTrail, sourceValue, candidateValue);
      continue;
    }

    if (!isObject(candidateValue)) {
      failures.push(`[${locale}] Expected object at ${nextTrail.join(".")}`);
      continue;
    }

    compareLocale(locale, sourceValue, candidateValue, nextTrail);
  }

  for (const key of candidateKeys) {
    if (!sourceKeys.includes(key)) {
      failures.push(`[${locale}] Extra key: ${[...trail, key].join(".")}`);
    }
  }
}

function comparePlaceholders(locale, trail, sourceValue, candidateValue) {
  const sourcePlaceholders = extractPlaceholders(sourceValue);
  const candidatePlaceholders = extractPlaceholders(candidateValue);

  if (sourcePlaceholders.join(",") !== candidatePlaceholders.join(",")) {
    failures.push(
      `[${locale}] Placeholder mismatch at ${trail.join(".")} (expected: ${sourcePlaceholders.join(", ") || "none"}, actual: ${candidatePlaceholders.join(", ") || "none"})`
    );
  }
}

function extractPlaceholders(value) {
  return [...value.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)]
    .map((match) => match[1])
    .sort();
}

function isPluralLeaf(value) {
  return (
    isObject(value) &&
    Object.keys(value).length > 0 &&
    Object.keys(value).every((key) =>
      ["zero", "one", "two", "few", "many", "other"].includes(key)
    ) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
