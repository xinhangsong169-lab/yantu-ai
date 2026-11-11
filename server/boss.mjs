const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

function unescapeHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanUrl(url) {
  const value = unescapeHtml(url).split(/[<\s]/)[0];
  if (!value.startsWith('https://www.zhipin.com/')) return '';
  if (value.includes('...') || value.includes('bosszhipin.com')) return '';
  return value.replace(/\/$/, '');
}

function cleanTitle(title) {
  return unescapeHtml(title)
    .replace(/^「+|」+$/g, '')
    .replace(/」?\s*-?\s*BOSS直聘.*$/i, '')
    .replace(/招聘信息$/, '')
    .replace(/招聘工资.*/, '')
    .replace(/职责_/, ' · ')
    .replace(/是什么职位_.*/, '')
    .replace(/有前途吗_.*/, '')
    .replace(/20\d\d年.*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function snippetOf(block) {
  const text = unescapeHtml(block);
  const cut = text.split(/推荐您搜索|WorkBuddy|用户协议/)[0];
  return cut.replace(/^>\s*/, '').slice(0, 420);
}

function companyOf(title, snippet) {
  const fromTitle = title.match(/[·_]\s*([\u4e00-\u9fa5A-Za-z0-9]{2,18})/);
  if (fromTitle && !/招聘|实习生|算法|岗位|多模态|大模型|BOSS|直聘/.test(fromTitle[1])) return fromTitle[1].replace(/20\d\d.*/, '');
  const named = snippet.match(/([\u4e00-\u9fa5A-Za-z]{2,16})\s+(?:基金|互联网|人工智能|医疗|计算机|游戏|电商)/);
  if (!named || /BOSS|直聘/.test(named[1])) return '';
  return named[1];
}

export function parseBossResults(html) {
  const jobs = [];
  const seen = new Set();
  for (const block of String(html || '').split('vrwrap').slice(1)) {
    const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    if (!titleMatch) continue;
    const title = cleanTitle(titleMatch[1]);
    if (!title || /找到约|条结果/.test(title)) continue;
    const urls = [...block.matchAll(/https:\/\/www\.zhipin\.com\/[^"'<\s]+/g)].map((item) => cleanUrl(item[0])).filter(Boolean);
    const url = urls.find((item) => item.includes('/job_detail/')) || urls.find((item) => item.includes('/zhaopin/')) || urls[0];
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const snippet = snippetOf(block);
    const boilerplate = /为您提供20\d\d年/.test(snippet) && !/元\/天|元\/月|岗位职责|任职要求/.test(snippet);
    if (!/实习|校招|算法|工程师|研发|开发|研究员|视觉|多模态|NLP|机器学习/.test(title)) continue;
    if (boilerplate && !/元\/天|岗位职责|任职要求/.test(snippet)) continue;
    jobs.push({
      title: title.slice(0, 72),
      company: companyOf(title, snippet),
      url,
      snippet,
      salary: (snippet.match(/\d+\s*-\s*\d+\s*元\/天|\d+\s*-\s*\d+\s*K(?:·\d+薪)?/) || [''])[0].replace(/\s+/g, ''),
      degree: ((title.match(/博士|硕士|本科/) || snippet.match(/博士|硕士|本科/) || [''])[0]),
      location: (snippet.match(/上海|杭州|北京|深圳|广州|南京|成都|武汉|西安|苏州/) || [''])[0],
      kind: url.includes('/job_detail/') && !boilerplate ? 'job' : 'list',
      boilerplate
    });
  }
  const specific = jobs.filter((job) => !job.boilerplate);
  const lists = jobs.filter((job) => job.boilerplate);
  return [...specific, ...lists].slice(0, 12);
}

export function buildJobQuery(profile = {}, track = 'intern') {
  const city = String(profile.locations || '上海').split(/[、,，\s]/).map((item) => item.trim()).filter(Boolean)[0] || '上海';
  const major = /计算机|软件|人工智能/.test(profile.major || '') ? '计算机' : (profile.major || '计算机');
  const direction = profile.direction || '';
  const focus = /多模态|检索|RAG|视觉/.test(direction) ? '多模态 算法' : '算法';
  const kind = track === 'state' ? '国企 校招' : track === 'public' ? '校招 应届' : '实习';
  return `${city} ${major} ${focus} ${kind} 硕士 BOSS直聘`;
}

export function rankJobs(jobs, profile = {}) {
  const skills = String(profile.skills || '').split(/[、,，/\s]/).map((item) => item.trim()).filter((item) => item.length >= 2);
  const cities = String(profile.locations || '').split(/[、,，]/).map((item) => item.trim()).filter(Boolean);
  const direction = profile.direction || '';
  const tokens = ['多模态', '检索', 'RAG', '算法', '视觉', 'Agent', 'NLP'].filter((token) => direction.toUpperCase().includes(token.toUpperCase()) || token === '算法');
  return jobs.map((job) => {
    const hay = `${job.title} ${job.snippet}`;
    const reasons = [];
    const gaps = [];
    let score = job.kind === 'job' ? 1 : 0;
    if (/计算机|软件|人工智能/.test(profile.major || '') && /计算机|算法|人工智能|机器学习|多模态|视觉|NLP/i.test(hay)) {
      score += 3;
      reasons.push(`专业是${profile.major || '计算机'}，岗位在这个方向上`);
    }
    if (/硕士/.test(profile.degree || '') && job.degree === '硕士') {
      score += 2;
      reasons.push('岗位写了硕士');
    }
    if (job.degree === '本科') gaps.push('这条摘录里的学历是本科');
    for (const skill of skills) {
      if (hay.toLowerCase().includes(skill.toLowerCase())) {
        score += 2;
        reasons.push(`写到你已有的 ${skill}`);
      }
    }
    for (const token of tokens) {
      if (hay.toUpperCase().includes(token.toUpperCase())) {
        score += 2;
        reasons.push(`和研究方向里的${token}一致`);
      }
    }
    if (cities.some((city) => hay.includes(city) || job.location && cities.includes(job.location))) {
      score += 2;
      reasons.push(`地点在${cities.find((city) => hay.includes(city)) || job.location}`);
    } else if (cities.length && job.location) {
      gaps.push(`岗位地点是${job.location}，不在你填的${cities.join('、')}`);
    }
    if (/部署|工程化/.test(hay) && !/部署/.test(profile.skills || '')) gaps.push('岗位提到部署或工程化，档案技能里还没有');
    return { ...job, score, reasons: [...new Set(reasons)].slice(0, 4), gaps: [...new Set(gaps)].slice(0, 2) };
  }).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'zh'));
}

const cache = new Map();

async function fetchSogou(query) {
  const url = `https://www.sogou.com/web?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9', Accept: 'text/html' },
    signal: AbortSignal.timeout(12000),
    redirect: 'follow'
  });
  if (!response.ok) throw new Error('岗位检索没有完成');
  const html = await response.text();
  if (html.includes('/captcha/') || html.length < 3000) throw new Error('检索刚被拦住了，请过一两分钟再试');
  return html;
}

export async function searchBossJobs(profile, track = 'intern') {
  const query = buildJobQuery(profile, track);
  const cached = cache.get(query);
  if (cached && Date.now() - cached.at < 15 * 60 * 1000) return cached.result;
  let html = '';
  try {
    html = await fetchSogou(query);
  } catch (error) {
    if (cached) return cached.result;
    throw error;
  }
  let jobs = rankJobs(parseBossResults(html).filter((job) => !job.boilerplate), profile);
  if (jobs.length < 3) {
    const broader = `${query.split(' ').slice(0, 2).join(' ')} 算法 ${track === 'intern' ? '实习' : '校招'} 硕士 BOSS直聘`;
    try {
      const more = rankJobs(parseBossResults(await fetchSogou(broader)).filter((job) => !job.boilerplate), profile);
      const seen = new Set(jobs.map((job) => job.url));
      jobs = [...jobs, ...more.filter((job) => !seen.has(job.url))];
    } catch {
      /* 第二次检索失败时保留第一次的结果 */
    }
  }
  const result = { query, source: 'BOSS直聘公开检索', jobs: jobs.slice(0, 8) };
  if (result.jobs.length) cache.set(query, { at: Date.now(), result });
  return result;
}
