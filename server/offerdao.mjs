import { cleanCareerKeywords } from '../src/lib/career-keywords.mjs';

const BASE = 'https://offerdao.ai';
let testKeyPromise;

async function sharedKey() {
  if (!testKeyPromise) {
    testKeyPromise = (async () => {
      const response = await fetch(`${BASE}/api/agent/test-key`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Offer岛测试密钥暂时不可用，请配置个人 API key 或稍后再试。');
      const data = await response.json();
      if (typeof data.key !== 'string' || !data.key) throw new Error('Offer岛测试密钥暂时不可用，请稍后再试。');
      return data.key;
    })().catch((error) => { testKeyPromise = undefined; throw error; });
  }
  return testKeyPromise;
}

function directionKeyword(value) {
  const direction = cleanCareerKeywords(value);
  const known = ['多模态', 'RAG', '视觉', '检索', '大模型', '自然语言', '算法'];
  return known.find((word) => direction.toUpperCase().includes(word.toUpperCase())) || direction.split(/[\s、]+/)[0] || '';
}

function string(value, limit = 300) {
  return typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit) : '';
}

function mapPosting(item, profile) {
  const id = string(item.posting_id, 100);
  const title = string(item.role, 120);
  if (!/^[A-Za-z0-9_-]+$/.test(id) || !title) return null;
  const company = string(item.organization, 100);
  const location = string(item.location, 100);
  const snippet = string(item.description || item.intro || item.requirements, 300);
  const evidence = `${title} ${snippet} ${string(item.requirements, 2000)}`.toLowerCase();
  const skills = String(profile.skills || '').split(/[、,，/\s]+/).filter((skill) => skill.length >= 2);
  const matches = skills.filter((skill) => evidence.includes(skill.toLowerCase())).slice(0, 3);
  return {
    title, company, location, snippet,
    url: `${BASE}/j/${encodeURIComponent(id)}`,
    salary: '', degree: '', kind: 'job', endAt: '', source: 'Offer岛',
    publishedAt: /^\d{4}-\d{2}-\d{2}$/.test(item.published_at || '') ? item.published_at : '',
    score: matches.length, reasons: matches.map((skill) => `岗位材料提到你档案中的 ${skill}`), gaps: []
  };
}

export async function searchOfferDaoJobs(profile = {}, track = 'intern', env = process.env) {
  const city = String(profile.locations || '').split(/[、,，\s]+/).filter(Boolean)[0] || '';
  const keyword = directionKeyword(profile.direction);
  const params = new URLSearchParams({ employment_type: track === 'public' ? '校招' : '实习', limit: '30' });
  if (city) params.set('location', city);
  if (keyword) params.set('q', keyword);
  const key = String(env.OFFERDAO_API_KEY || '').trim() || await sharedKey();
  let response;
  try {
    response = await fetch(`${BASE}/api/v1/postings/search?${params}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(12000)
    });
  } catch {
    throw new Error('Offer岛暂时无法连接，请稍后重试。');
  }
  if (response.status === 429) throw new Error('Offer岛查询额度或访问频率已达上限，请稍后重试或配置个人 API key。');
  if (response.status === 401 || response.status === 403) throw new Error('Offer岛 API key 无效或没有查询权限，请检查服务端配置。');
  if (!response.ok) throw new Error(`Offer岛查询暂时失败（HTTP ${response.status}），请稍后重试。`);
  const data = await response.json();
  if (!Array.isArray(data.items)) throw new Error('Offer岛返回的数据无法读取，请稍后重试。');
  const jobs = data.items.map((item) => mapPosting(item, profile)).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 6);
  return {
    query: [city, keyword, track === 'public' ? '校招' : '实习'].filter(Boolean).join(' '),
    source: 'Offer岛', jobs,
    notice: jobs.length ? '' : 'Offer岛没有找到符合当前城市、方向和岗位类型的结果。'
  };
}
