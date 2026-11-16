export function cleanCareerKeywords(value) {
  return String(value || '')
    .replace(/[^\u4e00-\u9fa5A-Za-z0-9+#.\s、]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DEGREES = ['博士', '硕士', '本科'];

export function filtersFromProfile(profile = {}) {
  const city = String(profile.locations || '').split(/[、,，\s]/).map((item) => item.trim()).filter(Boolean)[0] || '';
  const degree = DEGREES.find((item) => String(profile.degree || '').includes(item)) || '';
  const skills = String(profile.skills || '')
    .split(/[、,，/]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 3)
    .join('、');
  return {
    city: cleanCareerKeywords(city).slice(0, 20),
    major: cleanCareerKeywords(profile.major).slice(0, 40),
    direction: cleanCareerKeywords(profile.direction).slice(0, 40),
    degree,
    skills: cleanCareerKeywords(skills).slice(0, 40)
  };
}

export function normalizeFilters(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const degree = DEGREES.includes(raw.degree) ? raw.degree : '';
  return {
    city: cleanCareerKeywords(raw.city).slice(0, 20),
    major: cleanCareerKeywords(raw.major).slice(0, 40),
    direction: cleanCareerKeywords(raw.direction).slice(0, 40),
    degree,
    skills: cleanCareerKeywords(raw.skills).slice(0, 40)
  };
}

export function applyFilters(profile = {}, filters) {
  if (!filters) return profile;
  const degree = filters.degree === '博士' ? '博士研究生' : filters.degree === '硕士' ? '硕士研究生' : filters.degree === '本科' ? '本科' : '';
  return {
    ...profile,
    locations: filters.city,
    major: filters.major,
    direction: filters.direction,
    degree,
    skills: filters.skills
  };
}

export function filterLabel(profile = {}) {
  return [profile.locations, profile.major, profile.direction, profile.skills].map((item) => cleanCareerKeywords(item)).filter(Boolean).join(' ') || '计算机';
}

export function keywordTokens(query) {
  const short = ['计算机', '软件', '人工智能', '算法', '数据', '信息', '通信', '电子', '金融', '会计'];
  const parts = cleanCareerKeywords(query).split(/[\s、]+/).filter((item) => item.length >= 2);
  const extra = short.filter((word) => parts.some((part) => part.includes(word)) && !parts.includes(word));
  return [...parts, ...extra];
}
