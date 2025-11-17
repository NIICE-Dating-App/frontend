// Utility Functions for Profile Edit Screen

/**
 * Convert string to title case
 */
export const toTitleCase = (s?: string | null): string =>
  s?.toLowerCase()
    .split(" ")
    .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ") || "";

/**
 * Convert underscored string to humanized title case
 */
export const humanize = (s?: string | null): string => 
  toTitleCase((s ?? "").replace(/_/g, " "));

/**
 * Get unique values from array
 */
export const uniq = <T,>(arr: T[] = []): T[] => 
  Array.from(new Set(arr.filter(Boolean))) as T[];

/**
 * Extract storage path from URL
 */
export const toStoragePath = (urlOrPath: string | null): string | null => {
  if (!urlOrPath) return null;
  if (!urlOrPath.startsWith("http") && !urlOrPath.startsWith("blob:")) 
    return urlOrPath.replace(/^\/+/, "");
  
  const markers = [
    "/object/sign/user_photos/",
    "/object/public/user_photos/",
    "/user_photos/",
  ];
  
  for (const m of markers) {
    const i = urlOrPath.indexOf(m);
    if (i !== -1) 
      return decodeURIComponent(urlOrPath.substring(i + m.length).split("?")[0]);
  }
  return null;
};

/**
 * Parse comma/slash/ampersand separated string or array into list
 */
export const parseList = (raw: any): string[] => {
  const list =
    Array.isArray(raw)
      ? raw.map((s) => humanize(String(s)))
      : typeof raw === "string"
      ? raw.split(/[,/&]| and /i).map((s) => humanize(s.trim()))
      : [];
  return uniq(list);
};

/**
 * Summarize list with max items shown
 */
export const summarizeList = (arr: string[], max = 2): string =>
  !arr?.length 
    ? "Add items" 
    : arr.length <= max 
    ? arr.join(" · ") 
    : `${arr.slice(0, max).join(" · ")} +${arr.length - max}`;

/**
 * Remove leading emoji/symbol from text
 */
export const textOnly = (s?: string | null): string => {
  let v = humanize(s ?? "");
  if (!v) return "";
  
  // If already starts with text/number, return as is
  if (/[A-Za-z0-9]/.test(v[0])) return v;
  
  // Drop leading grapheme (emoji/symbol)
  const c0 = v.charCodeAt(0);
  v = c0 >= 0xd800 && c0 <= 0xdbff ? v.slice(2) : v.slice(1);
  return v.trimStart();
};