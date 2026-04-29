function isAbsoluteHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function withCacheKey(url: string, cacheKey?: string | null) {
  if (!cacheKey) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}lv=${encodeURIComponent(cacheKey)}`;
}

export function resolveCatalogImageSrc(image: string | null | undefined, cacheKey?: string | null) {
  if (!image) {
    return "";
  }

  const normalized = image.trim();
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("data:") || normalized.startsWith("asset:")) {
    return normalized;
  }

  if (isAbsoluteHttpUrl(normalized)) {
    return withCacheKey(normalized, cacheKey);
  }

  const root = typeof window !== "undefined" ? window.location.origin : "";
  const pathWithLeadingSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return withCacheKey(`${root}${pathWithLeadingSlash}`, cacheKey);
}