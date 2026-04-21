import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import de from "./locales/de.json";
import en from "./locales/en.json";
import pl from "./locales/pl.json";

const BASE_LOCALES = ["en", "de", "pl"] as const;
export const SUPPORTED_LOCALES = [...BASE_LOCALES, "shakespeare"] as const;
export const LOCALE_STORAGE_KEY = "lumorix.locale.preference";

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
type CanonicalLocale = (typeof BASE_LOCALES)[number];
export type TranslationParams = Record<string, string | number | null | undefined>;
type TranslationLeaf = string | PluralTranslation;
type TranslationTree = {
  [key: string]: TranslationLeaf | TranslationTree;
};
type PluralTranslation = Partial<Record<Intl.LDMLPluralRule, string>> & {
  other: string;
};

const dictionaries: Record<CanonicalLocale, TranslationTree> = {
  en: en as TranslationTree,
  de: de as TranslationTree,
  pl: pl as TranslationTree
};

const pluralKeys = new Set(["zero", "one", "two", "few", "many", "other"]);
const shakespearePhraseMappings: Array<[string, string]> = [
  ["Add to Library", "Addeth to Library"],
  ["No items found", "No items wert found"],
  ["No items available right now", "No wares be available right now"],
  ["Update available", "Update awaiteth"],
  ["Check for updates", "Seek for updates"],
  ["Check updates", "Seek updates"],
  ["Check launcher", "Seek launcher tidings"],
  ["Install update", "Install update forthwith"],
  ["Open Shop", "Open Shoppe"],
  ["View Downloads", "View Downloads ledger"],
  ["View Library", "View Library ledger"],
  ["No active downloads", "No active downloads at present"],
  ["No update available", "No update awaiteth"],
  ["Search", "Seek"],
  ["Install", "Installeth"],
  ["Update", "Updateth"],
  ["Play", "Playeth"],
  ["Launch", "Playeth"],
  ["Shop", "Shoppe"],
  ["Downloads", "Downloades"],
  ["Settings", "Settings of Court"],
  ["Remove", "Banish"],
  ["Library", "Library of Tomes"]
];

const shakespeareWordMappings: Array<[RegExp, string]> = [
  [/\byour\b/gi, "thy"],
  [/\byou\b/gi, "thou"],
  [/\bare\b/gi, "art"],
  [/\bdo not\b/gi, "dost not"],
  [/\bdoes not\b/gi, "doth not"],
  [/\bplease\b/gi, "prithee"],
  [/\bhello\b/gi, "well met"],
  [/\bhere\b/gi, "hither"]
];

interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, params?: TranslationParams) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(
    () => loadStoredLocale() ?? detectPreferredLocale()
  );

  const setLocale = useCallback((nextLocale: SupportedLocale) => {
    setLocaleState(coerceLocale(nextLocale));
  }, []);

  useEffect(() => {
    document.documentElement.lang = toCanonicalLocale(locale);
  }, [locale]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Ignore storage failures and keep locale in-memory.
    }
  }, [locale]);

  const t = useCallback(
    (key: string, params?: TranslationParams) => translate(locale, key, params),
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t
    }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}

export function detectPreferredLocale(languages = navigator.languages): SupportedLocale {
  for (const language of languages) {
    const normalized = language.toLowerCase();
    if (normalized.startsWith("de")) return "de";
    if (normalized.startsWith("pl")) return "pl";
  }
  return "en";
}

export function coerceLocale(locale: string | null | undefined): SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale) ? (locale as SupportedLocale) : "en";
}

export function toCanonicalLocale(locale: SupportedLocale): CanonicalLocale {
  return locale === "shakespeare" ? "en" : locale;
}

export function translate(
  locale: SupportedLocale,
  key: string,
  params?: TranslationParams
): string {
  if (locale === "shakespeare") {
    const englishValue = getValue(dictionaries.en, key);

    // Temporary safe mode: only transform plain string leaves.
    if (typeof englishValue === "string") {
      return toShakespeare(interpolate("en", englishValue, params));
    }

    if (isPluralTranslation(englishValue)) {
      const count = Number(params?.count ?? 0);
      const category = new Intl.PluralRules("en").select(count);
      const template = englishValue[category] ?? englishValue.other;
      return interpolate("en", template, params);
    }

    const fallback = resolveMessage(dictionaries.en, "en", key, params);
    if (fallback) return fallback;
    return humanizeMissingKey(key);
  }

  const canonicalLocale = toCanonicalLocale(locale);
  const localized = resolveMessage(dictionaries[canonicalLocale], canonicalLocale, key, params);
  if (localized) return localized;

  const fallback = resolveMessage(dictionaries.en, "en", key, params);
  if (fallback) return fallback;

  return humanizeMissingKey(key);
}

function resolveMessage(
  dictionary: TranslationTree,
  locale: SupportedLocale,
  key: string,
  params?: TranslationParams
): string | null {
  const value = getValue(dictionary, key);

  if (typeof value === "string") {
    return interpolate(locale, value, params);
  }

  if (isPluralTranslation(value)) {
    const count = Number(params?.count ?? 0);
    const category = new Intl.PluralRules(locale).select(count);
    const template = value[category] ?? value.other;
    return interpolate(locale, template, params);
  }

  return null;
}

function getValue(dictionary: TranslationTree, key: string): TranslationLeaf | TranslationTree | undefined {
  return key.split(".").reduce<TranslationLeaf | TranslationTree | undefined>((current, part) => {
    if (!current || typeof current === "string" || isPluralTranslation(current)) {
      return undefined;
    }
    return current[part];
  }, dictionary);
}

function interpolate(
  locale: SupportedLocale,
  template: string,
  params?: TranslationParams
): string {
  if (!params) return template;

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = params[key];
    if (value === null || value === undefined) return "";
    if (typeof value === "number") {
      return new Intl.NumberFormat(locale).format(value);
    }
    return String(value);
  });
}

function isPluralTranslation(value: unknown): value is PluralTranslation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const entries = Object.entries(value);
  return entries.length > 0 && entries.every(([key, entryValue]) => pluralKeys.has(key) && typeof entryValue === "string");
}

function humanizeMissingKey(key: string) {
  const fallback = key.split(".").pop() ?? key;
  return fallback
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/^\w/, (character) => character.toUpperCase());
}

function loadStoredLocale(): SupportedLocale | null {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored ? coerceLocale(stored) : null;
  } catch {
    return null;
  }
}

function toShakespeare(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  let transformed = input;

  for (const [source, replacement] of shakespearePhraseMappings) {
    transformed = replaceWithCase(transformed, new RegExp(escapeRegExp(source), "gi"), replacement);
  }

  for (const [pattern, replacement] of shakespeareWordMappings) {
    transformed = replaceWithCase(transformed, pattern, replacement);
  }

  return transformed;
}

function replaceWithCase(input: string, pattern: RegExp, replacement: string): string {
  return input.replace(pattern, (match) => matchCase(match, replacement));
}

function matchCase(source: string, replacement: string): string {
  if (source.toUpperCase() === source) {
    return replacement.toUpperCase();
  }

  if (/^[A-Z]/.test(source)) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }

  return replacement;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
