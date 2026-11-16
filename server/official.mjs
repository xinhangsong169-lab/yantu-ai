import { applyFilters, filterLabel, keywordTokens } from '../src/lib/career-keywords.mjs';

const SOURCE = 'https://www.ncss.cn/ncss/zt/gqzp2026.shtml';
const BLOCKED = /(zhipin|zhaopin\.com|51job|liepin|lagou|bosszhipin|kanzhun|veryeast|jobui|yingjiesheng|shixiseng)/i;
const cache = new Map();

function unescapeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

function isoOf(value) {
  const match = String(value || '').match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!match) return '';
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function parseList(html) {
  const start = String(html || '').indexOf('[{"xh"');
  const end = start >= 0 ? html.indexOf('}]', start) : -1;
  if (start < 0 || end < 0) return [];
  try {
    return JSON.parse(html.slice(start, end + 2));
  } catch {
    return [];
  }
}

async function loadNotices() {
  const cached = cache.get('official-list');
  if (cached && Date.now() - cached.at < 6 * 60 * 60 * 1000) return cached.items;
  const response = await fetch(SOURCE, {
    headers: { 'User-Agent': 'yantu-ai/0.1', 'Accept-Language': 'zh-CN,zh;q=0.9' },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('官网通知没有取到');
  const html = await response.text();
  const today = todayISO();
  const notices = parseList(html)
    .map((item) => ({
      title: unescapeHtml(item.title).slice(0, 80),
      company: unescapeHtml(item.company).slice(0, 40),
      url: unescapeHtml(item.link),
      snippet: [item.zphDate, item.yjtggws ? `预计岗位 ${item.yjtggws}` : ''].filter(Boolean).join(' · '),
      salary: '',
      degree: '',
      location: '',
      kind: 'notice',
      endAt: isoOf(item.endDate)
    }))
    .filter((item) => item.title && item.url.startsWith('http') && !BLOCKED.test(item.url))
    .filter((item) => !item.endAt || item.endAt >= today);
  if (notices.length) cache.set('official-list', { at: Date.now(), items: notices });
  return notices;
}

export async function searchOfficialNotices(profile = {}, filters = null) {
  const view = applyFilters(profile, filters);
  const query = filterLabel(view);
  const tokens = keywordTokens(query);
  const notices = (await loadNotices())
    .map((item) => {
      const reasons = ['国家大学生就业服务平台公布的国企招聘通知'];
      let score = 1;
      if (/mp\.weixin\.qq\.com/.test(item.url)) score -= 3;
      for (const token of tokens) {
        if (`${item.title}${item.company}`.includes(token)) {
          score += 3;
          reasons.push(`通知里写到${token}`);
        }
      }
      return { ...item, score, reasons: [...new Set(reasons)].slice(0, 3), gaps: [] };
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'zh'))
    .slice(0, 8);
  const matched = notices.some((item) => item.score > 1);
  return {
    query,
    source: '国家大学生就业服务平台',
    jobs: notices,
    notice: matched ? '' : '这些官网通知里没有直接写到当前筛选，下面仍是还在有效期内的招聘通知。'
  };
}
