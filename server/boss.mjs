import { applyFilters, cleanCareerKeywords } from '../src/lib/career-keywords.mjs';

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

function discoverJobUrls(html) {
  const text = String(html || '').replace(/&amp;/g, '&');
  const ids = [...text.matchAll(/job_detail(?:%2F|\/)([A-Za-z0-9_]+)\.html/gi)].map((item) => item[1]);
  return [...new Set(ids)].slice(0, 6).map((id) => `https://www.zhipin.com/job_detail/${id}.html`);
}

function indexedFromTitle(title, url) {
  const cleaned = textOf(title).replace(/^「+|」+$/g, '');
  const matched = cleaned.match(/^(.+?)_([^_]{2,24}?)招聘/);
  if (!matched) return null;
  const jobTitle = matched[1].replace(/^「|」$/g, '').trim();
  const company = matched[2].replace(/BOSS直聘.*/, '').trim();
  if (jobTitle.length < 2 || company.length < 2) return null;
  if (/找到约|条结果|请稍候/.test(jobTitle)) return null;
  return {
    title: jobTitle.slice(0, 80),
    company: company.slice(0, 40),
    url,
    snippet: '',
    salary: '',
    degree: '',
    location: '',
    kind: 'job',
    fromDetail: false,
    indexed: true,
    endAt: ''
  };
}

function indexedJobs(html) {
  const text = String(html || '').replace(/&amp;/g, '&');
  const jobs = [];
  const seen = new Set();
  for (const block of text.split(/<h[23][^>]*>/i).slice(1)) {
    const id = block.match(/job_detail(?:%2F|\/)([A-Za-z0-9_]+)\.html/i);
    if (!id || seen.has(id[1])) continue;
    const plain = textOf(block.slice(0, 500));
    const job = indexedFromTitle(plain, `https://www.zhipin.com/job_detail/${id[1]}.html`);
    if (!job) continue;
    seen.add(id[1]);
    jobs.push(job);
  }
  return jobs;
}

function textOf(value) {
  return unescapeHtml(String(value || '')).replace(/\s+/g, ' ').trim();
}

function salaryOf(salary) {
  if (!salary) return '';
  if (typeof salary === 'string') return textOf(salary).slice(0, 24);
  const value = salary.value || salary;
  const min = value.minValue ?? value.min;
  const max = value.maxValue ?? value.max;
  const unit = textOf(value.unitText || salary.unitText || '');
  if (min && max) return `${min}-${max}${unit}`.slice(0, 24);
  return textOf(min || max || '').slice(0, 24);
}

function locationOf(location) {
  const place = Array.isArray(location) ? location[0] : location;
  const address = place?.address || place;
  return textOf(address?.addressLocality || address?.name || place?.name || '').slice(0, 20);
}

function readJobPosting(html, url) {
  const blocks = [...String(html || '').matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    let data;
    try { data = JSON.parse(block[1].trim()); } catch { continue; }
    const nodes = Array.isArray(data) ? data : [data];
    const job = nodes.find((node) => node && (node['@type'] === 'JobPosting' || (Array.isArray(node['@type']) && node['@type'].includes('JobPosting'))));
    if (!job) continue;
    const title = textOf(job.title).slice(0, 80);
    const company = textOf(typeof job.hiringOrganization === 'string' ? job.hiringOrganization : job.hiringOrganization?.name).slice(0, 40);
    if (title.length < 2) continue;
    const description = textOf(job.description).slice(0, 180);
    const through = textOf(job.validThrough).slice(0, 10);
    return {
      title,
      company,
      url,
      snippet: description,
      salary: salaryOf(job.baseSalary),
      degree: (description.match(/博士|硕士|本科/) || [''])[0],
      location: locationOf(job.jobLocation),
      kind: 'job',
      fromDetail: true,
      endAt: /^\d{4}-\d{2}-\d{2}$/.test(through) ? through : ''
    };
  }
  return null;
}

async function readDetail(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9', Accept: 'text/html' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow'
    });
    if (!response.ok) return null;
    const html = await response.text();
    if ((/captcha|security-check|verify-slider/.test(html) && !html.includes('JobPosting')) || html.length < 800) return null;
    return readJobPosting(html, url);
  } catch {
    return null;
  }
}

async function fetchBing(query) {
  const response = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(`${query} site:www.zhipin.com/job_detail`)}`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' },
    signal: AbortSignal.timeout(12000),
    redirect: 'follow'
  });
  if (!response.ok) throw new Error('岗位检索没有完成');
  return response.text();
}

export function buildJobQuery(profile = {}, track = 'intern') {
  const city = String(profile.locations || '').split(/[、,，\s]/).map((item) => item.trim()).filter(Boolean)[0] || '';
  const major = /计算机|软件|人工智能/.test(profile.major || '') ? '计算机' : cleanCareerKeywords(profile.major).slice(0, 8);
  const direction = String(profile.direction || '');
  const focus = /多模态|检索|RAG|视觉/.test(direction)
    ? '多模态 算法'
    : (cleanCareerKeywords(direction).split(/\s+/).filter(Boolean)[0] || '算法');
  const degree = /博士/.test(profile.degree || '') ? '博士' : /硕士/.test(profile.degree || '') ? '硕士' : '';
  const kind = track === 'public' ? '校招' : '实习';
  return [city, major, focus, degree, kind, 'BOSS直聘'].filter(Boolean).join(' ');
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

export function searchEntry(profile = {}, track = 'intern') {
  const query = buildJobQuery(profile, track).replace(/\s*BOSS直聘\s*$/, '');
  return {
    title: `按「${query}」去 BOSS 直聘查看`,
    company: '',
    url: `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(query)}`,
    snippet: '服务器打不开具体岗位页。这是按当前筛选生成的检索入口，没有编造岗位、公司或薪资。',
    salary: '',
    degree: '',
    location: '',
    kind: 'search',
    fromDetail: false,
    indexed: false,
    endAt: '',
    reasons: [],
    gaps: [],
    score: 0
  };
}

export async function searchBossJobs(profile, track = 'intern', filters = null) {
  const view = applyFilters(profile, filters);
  const query = buildJobQuery(view, track);
  const cached = cache.get(query);
  if (cached && Date.now() - cached.at < 15 * 60 * 1000) return cached.result;
  const settled = await Promise.allSettled([fetchSogou(query), fetchBing(query)]);
  const pages = settled.flatMap((item) => item.status === 'fulfilled' ? [item.value] : []);
  const urls = [...new Set(pages.flatMap(discoverJobUrls))];
  const indexed = new Map(pages.flatMap(indexedJobs).map((job) => [job.url, job]));
  const opened = (await Promise.all(urls.map(readDetail))).filter(Boolean);
  const openedUrls = new Set(opened.map((job) => job.url));
  const titled = [...indexed.values()].filter((job) => !openedUrls.has(job.url));
  const linked = urls.filter((url) => !openedUrls.has(url) && !indexed.has(url)).map((url) => ({
    title: '岗位页这次没打开',
    company: '',
    url,
    snippet: '链接是检索到的具体岗位页。页面被安全验证拦住，职位、公司和薪资都没有填写。',
    salary: '',
    degree: '',
    location: '',
    kind: 'job',
    fromDetail: false,
    indexed: false,
    linked: true,
    endAt: ''
  }));
  const jobs = rankJobs([...opened, ...titled, ...linked], view).slice(0, 6);
  const result = {
    query,
    source: opened.length ? 'BOSS直聘岗位页' : titled.length ? 'BOSS直聘收录标题' : 'BOSS直聘岗位链接',
    jobs,
    notice: opened.length
      ? ''
      : titled.length
        ? '岗位页被安全验证拦住了。下面只用收录页标题里的职位和公司，薪资没有填写。'
        : linked.length
          ? '检索到了具体岗位链接，但页面没打开。职位、公司和薪资都空着。'
          : ''
  };
  if (jobs.length) cache.set(query, { at: Date.now(), result });
  return result;
}
