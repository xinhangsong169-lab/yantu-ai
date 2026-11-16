const WEEKDAYS = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function shanghaiParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  }).formatToParts(new Date());
  const pick = (type) => parts.find((part) => part.type === type)?.value || '';
  const iso = `${pick('year')}-${pick('month')}-${pick('day')}`;
  const weekdayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { iso, weekday: weekdayMap[pick('weekday')] || 1 };
}

function formatDay(iso) {
  if (!iso) return '';
  const [, month, day] = iso.split('-');
  return `${Number(month)}月${Number(day)}日`;
}

function statusLabel(status) {
  return { todo: '待开始', doing: '进行中', done: '已完成' }[status] || status;
}

function courseMatches(course, keyword) {
  if (!keyword) return true;
  const hay = [course.title, course.teacher, course.location, course.grading, course.attendance, course.weeks].filter(Boolean).join(' ');
  if (hay.includes(keyword)) return true;
  if (course.teacher && keyword.includes(course.teacher)) return true;
  if (course.title && keyword.includes(course.title)) return true;
  const stop = new Set(['平时', '成绩', '多少', '考核', '老师', '课程', '什么', '怎么', '哪里', '哪个']);
  return keyword.split(/[^\u4e00-\u9fa5A-Za-z0-9]+/).filter((token) => token.length >= 2 && !stop.has(token)).some((token) => hay.includes(token));
}

export function lookupCourses(courses, tasks, query = '') {
  const keyword = String(query || '').trim();
  const { weekday } = shanghaiParts();
  const named = courses.find((course) => course.teacher && keyword.includes(course.teacher));
  const matched = courses
    .filter((course) => courseMatches(course, keyword))
    .sort((a, b) => Number(a.weekday !== weekday) - Number(b.weekday !== weekday) || a.weekday - b.weekday);
  const items = matched.map((course) => {
    const related = tasks.filter((task) => task.sourceType === 'course' && task.sourceId === course.id);
    const open = related.filter((task) => task.status !== 'done');
    return {
      title: course.title,
      meta: [course.teacher, `${WEEKDAYS[course.weekday] || ''} ${course.start || ''}–${course.end || ''}`, course.location].filter(Boolean).join(' · '),
      note: [
        course.attendance ? `考勤：${course.attendance}` : '',
        course.grading ? `成绩：${course.grading}` : '',
        open.length ? `未完成：${open.map((task) => `${task.title}${task.dueAt ? `（${formatDay(task.dueAt)}）` : ''}`).join('、')}` : '',
        course.source ? `来源：${course.source}` : ''
      ].filter(Boolean).join('\n')
    };
  });
  return {
    title: named ? `${named.teacher}的课` : keyword ? '查到的课程' : '课程和老师档案',
    text: items.length
      ? (/成绩|考核/.test(keyword)
        ? items.map((item) => `${item.title}：${(item.note.match(/成绩：[^\n]+/) || [''])[0] || '成绩还没写入档案'}`).join('\n')
        : '下面只来自你保存的课程、老师和作业，没有补写档案里没有的要求。')
      : '课程档案里没有对上的老师、课程或考核。可以换一个名字，或先把这门课记下来。',
    items
  };
}

export function writeMeeting(meetings, tasks, profile, kind) {
  const meetingTasks = tasks.filter((task) => task.sourceType === 'meeting');
  const open = meetingTasks.filter((task) => task.status !== 'done');
  const done = meetingTasks.filter((task) => task.status === 'done');
  const latest = [...meetings].filter((meeting) => meeting.confirmed).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const line = (task) => `- ${task.title}（${statusLabel(task.status)}${task.dueAt ? `，${formatDay(task.dueAt)}` : ''}）${task.evidence ? `\n  依据：${task.evidence}` : ''}`;
  if (kind === 'todos') {
    return {
      title: '组会待办',
      text: open.length ? '这些任务来自已确认的组会，完成状态以你的勾选为准。' : '组会任务都勾完了。可以去写汇报稿。',
      items: open.map((task) => ({ title: task.title, meta: `${statusLabel(task.status)}${task.dueAt ? ` · ${formatDay(task.dueAt)}` : ''}`, note: task.evidence || '' }))
    };
  }
  if (kind === 'weekly') {
    return {
      title: '本周周报',
      text: [
        `本周目标：${profile.weeklyGoal || '还没在档案里写本周目标。'}`,
        latest ? `最近一次组会：${formatDay(latest.date)} ${latest.title}` : '还没有已确认的组会。',
        '',
        '本周完成',
        done.map(line).join('\n') || '- 还没有勾成完成的组会任务。',
        '',
        '还没做完',
        open.map(line).join('\n') || '- 没有未完成的组会任务。',
        '',
        '下周先做',
        open[0] ? `- ${open[0].title}${open[0].evidence ? `。依据仍是：${open[0].evidence}` : ''}` : '- 先从下一次组会记录里提取任务。'
      ].join('\n')
    };
  }
  return {
    title: '组会汇报稿',
    text: [
      latest ? `上次组会：${formatDay(latest.date)} ${latest.title}` : '还没有已确认的组会，下面只根据任务来写。',
      latest?.summary ? `上次结论：${latest.summary}` : '',
      '',
      '一、已经完成',
      done.map(line).join('\n') || '- 这次还没有可汇报的完成项。',
      '',
      '二、正在做',
      meetingTasks.filter((task) => task.status === 'doing').map(line).join('\n') || '- 没有标成进行中的任务。',
      '',
      '三、还没做，以及原因',
      meetingTasks.filter((task) => task.status === 'todo').map(line).join('\n') || '- 没有待开始的组会任务。',
      '',
      '四、请导师看的材料',
      '- 已完成事项的原始记录和结果',
      '- 没做完的具体卡点',
      latest?.requirements?.length ? `- 对照上次要求：${latest.requirements.map((item) => item.text).join('；')}` : '- 上次要求还没整理进组会记录。',
      '',
      '稿子里的完成情况来自任务状态，不是新的实验结果。'
    ].filter((line) => line !== undefined).join('\n')
  };
}

function literatureQuery(profile, query) {
  const typed = String(query || '').trim();
  if (typed) return typed;
  const direction = profile.direction || '';
  const english = [
    [/多模态/, 'multimodal'],
    [/检索|RAG/i, 'retrieval'],
    [/RAG/i, 'generation'],
    [/视觉/, 'vision'],
    [/语言/, 'language'],
    [/Agent/i, 'agent']
  ].filter(([pattern]) => pattern.test(direction)).map(([, word]) => word);
  return [...new Set(english)].slice(0, 3).join(' ') || direction || profile.major || 'machine learning';
}

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function findLiterature(profile, query) {
  const search = literatureQuery(profile, query);
  const terms = search.split(/\s+/).filter((term) => term.length > 1).slice(0, 3);
  const clause = terms.map((term) => `all:${term}`).join(' AND ') || `all:${search}`;
  const url = new URL('https://export.arxiv.org/api/query');
  url.searchParams.set('search_query', clause);
  url.searchParams.set('start', '0');
  url.searchParams.set('max_results', '5');
  let xml = '';
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'yantu-ai/0.1' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`文献检索没有完成（HTTP ${response.status}）`);
    xml = await response.text();
  } catch {
    throw new Error('文献库暂时无法连接，请稍后重试');
  }
  const items = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => {
    const block = match[1];
    const title = decodeXml(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '');
    const authors = [...block.matchAll(/<name>([\s\S]*?)<\/name>/g)].slice(0, 3).map((item) => decodeXml(item[1])).join(', ');
    const year = (block.match(/<published>(\d{4})/) || [])[1] || '';
    const href = decodeXml(block.match(/<id>([\s\S]*?)<\/id>/)?.[1] || '');
    const note = decodeXml(block.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || '').slice(0, 280);
    return { title, meta: [authors, year].filter(Boolean).join(' · '), href, note };
  }).filter((item) => item.title && !item.title.startsWith('arXiv Query'));
  return {
    title: `和「${profile.direction || search}」相关的文献`,
    text: items.length ? `检索词是「${search}」。下面是 arXiv 返回的论文，不是模型写出来的题名。` : `用「${search}」没有检索到论文。可以换成更具体的英文关键词。`,
    items
  };
}

export function briefCareer(profile, jobs, projects) {
  const notices = jobs.some((job) => job.kind === 'notice');
  const listed = jobs.filter((job) => job.kind !== 'search');
  const entry = jobs.find((job) => job.kind === 'search');
  if (!listed.length) {
    return {
      title: notices ? '官网通知还没取到' : '这次没有打开到岗位页',
      text: entry?.snippet || (notices ? '国企和央企只看官网通知，这里不会改用招聘平台的岗位。' : '先在左边按筛选查看。这里只梳理已经打开到的岗位，不会另编一份。'),
      items: entry ? [{ title: entry.title, href: entry.url, note: '检索入口，不是一条岗位' }] : []
    };
  }
  jobs = listed;
  const ranked = [...jobs].sort((a, b) => (b.score || 0) - (a.score || 0));
  const first = ranked.filter((job) => (job.score || 0) >= 8);
  const later = ranked.filter((job) => (job.score || 0) < 8);
  const items = [
    ...first.map((job) => ({ title: `先看：${job.title}`, meta: [job.company, job.location, job.degree, job.salary].filter(Boolean).join(' · '), href: job.url, note: [...(job.reasons || []), ...(job.gaps || []).map((gap) => `准备：${gap}`)].join('；') })),
    ...later.map((job) => ({ title: `后看：${job.title}`, meta: [job.company, job.location, job.degree].filter(Boolean).join(' · '), href: job.url, note: (job.gaps || []).join('；') }))
  ];
  return {
    title: '这批岗位怎么看',
    text: [
      `专业 ${profile.major || '未填'}，方向 ${profile.direction || '未填'}，城市 ${profile.locations || '未填'}。`,
      notices ? '下面是官网招聘通知，不是招聘平台上的岗位。' : '下面只保留打开到的岗位页，或收录标题里的职位和公司。薪资只在岗位页读到时才填。',
      first.length ? `先看 ${first.length} 个和专业、学历或方向对得上的。` : '还没有一份同时对上专业和学历。',
      projects[0] ? `面试时可以讲的课题：${projects[0].title}。` : ''
    ].filter(Boolean).join('\n'),
    items
  };
}
