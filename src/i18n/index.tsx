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

export const SUPPORTED_LOCALES = ["en", "de", "pl"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type TranslationParams = Record<string, string | number | null | undefined>;
type TranslationLeaf = string | PluralTranslation;
type TranslationTree = {
  [key: string]: TranslationLeaf | TranslationTree;
};
type PluralTranslation = Partial<Record<Intl.LDMLPluralRule, string>> & {
  other: string;
};

const dictionaries: Record<SupportedLocale, TranslationTree> = {
  en: en as TranslationTree,
  de: de as TranslationTree,
  pl: pl as TranslationTree
};

const pluralKeys = new Set(["zero", "one", "two", "few", "many", "other"]);

interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, params?: TranslationParams) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<SupportedLocale>(detectPreferredLocale());

  useEffect(() => {
    document.documentElement.lang = locale;
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
    [locale, t]
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

export function translate(
  locale: SupportedLocale,
  key: string,
  params?: TranslationParams
): string {
  const localized = resolveMessage(dictionaries[locale], locale, key, params);
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
