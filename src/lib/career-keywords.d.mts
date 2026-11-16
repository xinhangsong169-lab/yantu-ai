export function cleanCareerKeywords(value: unknown): string;
export function filtersFromProfile(profile?: {
  locations?: string;
  major?: string;
  direction?: string;
  degree?: string;
  skills?: string;
}): { city: string; major: string; direction: string; degree: string; skills: string };
export function normalizeFilters(raw: unknown): {
  city: string;
  major: string;
  direction: string;
  degree: string;
  skills: string;
} | null;
export function applyFilters<T>(profile: T, filters: {
  city: string;
  major: string;
  direction: string;
  degree: string;
  skills: string;
} | null): T;
export function filterLabel(profile?: {
  locations?: string;
  major?: string;
  direction?: string;
  skills?: string;
}): string;
export function keywordTokens(query: string): string[];
