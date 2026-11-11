const WEEKDAYS = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function shanghaiISO(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function addIso(iso, amount) {
  const date = new Date(`${iso}T12:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function weekdayOf(iso) {
  const day = new Date(`${iso}T12:00:00+08:00`).getUTCDay();
  return day === 0 ? 7 : day;
}

function courseOn(course, iso) {
  if (course.weekday !== weekdayOf(iso)) return false;
  if (course.exdates?.includes(iso)) return false;
  if (course.startDate && iso < course.startDate) return false;
  if (course.endDate && iso > course.endDate) return false;
  return true;
}

function dayName(offset) {
  return ['今天', '明天', '后天'][offset] || WEEKDAYS[weekdayOf(addIso(shanghaiISO(), offset))];
}

export function asksAgenda(message) {
  return /日程|这周|这七天|一周|课表|有什么课|有哪些课|哪天有课|还有什么|还有哪些|什么任务|哪些任务|怎么排/.test(String(message || ''));
}

export function workbenchIntent(message) {
  const text = String(message || '');
  if (/实习|校招|秋招|春招|国企|央企|选调|岗位|招聘|直聘|找工作/.test(text)) {
    const track = /国企|央企|选调/.test(text) ? 'state' : /校招|秋招|春招/.test(text) ? 'public' : 'intern';
    return { kind: 'jobs', track };
  }
  if (/文献|论文|arxiv/i.test(text)) return { kind: 'literature' };
  if (/周报/.test(text)) return { kind: 'meeting', meetingKind: 'weekly' };
  if (/汇报/.test(text)) return { kind: 'meeting', meetingKind: 'report' };
  if (/组会/.test(text)) return { kind: 'meeting', meetingKind: 'todos' };
  if (/老师|成绩|考勤|考核|平时分|期末/.test(text)) return { kind: 'course' };
  if (asksAgenda(text)) return { kind: 'agenda' };
  return null;
}

function dayLabel(offset, iso) {
  const name = dayName(offset);
  if (offset <= 2) return name;
  const [, month, day] = iso.split('-');
  return `${name} ${Number(month)}月${Number(day)}日`;
}

export function weekBoard(courses, tasks) {
  const rows = [];
  for (let offset = 0; offset < 8; offset += 1) {
    const iso = addIso(shanghaiISO(), offset);
    const items = [];
    for (const course of courses.filter((course) => courseOn(course, iso))) {
      const span = [course.start, course.end].filter(Boolean).join('–');
      items.push({ kind: '课', title: course.title, meta: [span, course.location, course.teacher].filter(Boolean).join(' · ') });
    }
    for (const task of tasks.filter((task) => task.status !== 'done' && task.dueAt === iso)) {
      items.push({ kind: '任务', title: task.title, meta: '' });
    }
    if (items.length) rows.push({ day: dayLabel(offset, iso), items });
  }
  return rows;
}

export function weekAgenda(courses, tasks) {
  const today = shanghaiISO();
  const lines = [];
  for (let offset = 0; offset < 8; offset += 1) {
    const iso = addIso(today, offset);
    const classes = courses.filter((course) => courseOn(course, iso));
    const due = tasks.filter((task) => task.status !== 'done' && task.dueAt === iso);
    if (!classes.length && !due.length) continue;
    const bits = [];
    if (classes.length) bits.push(`有课：${classes.map((course) => `${course.title} ${course.start || ''}`).join('、')}`);
    if (due.length) bits.push(`要做：${due.map((task) => task.title).join('、')}`);
    lines.push(`${dayName(offset)} ${bits.join('；')}`);
  }
  return lines.join('\n') || '今天起一周内没有排课，也没有到期的事。';
}

function matchTask(tasks, hint) {
  const text = String(hint || '').replace(/\s/g, '');
  if (text.length < 2) return null;
  return tasks.find((task) => {
    const title = String(task.title || '').replace(/\s/g, '');
    return title && (title.includes(text) || text.includes(title) || title.slice(0, 6) === text.slice(0, 6) && text.length >= 4);
  }) || null;
}

function allowedDates() {
  const today = shanghaiISO();
  return new Set(Array.from({ length: 8 }, (_, offset) => addIso(today, offset)));
}

export function normalizeActions(raw, tasks) {
  const allowed = allowedDates();
  const today = shanghaiISO();
  const list = Array.isArray(raw?.actions) ? raw.actions : [];
  const actions = [];
  for (const item of list) {
    if (!item || !['add', 'move', 'done'].includes(item.op)) continue;
    const rawDue = item.due || item.dueAt || '';
    const dueAt = allowed.has(rawDue) ? rawDue : today;
    if (item.op === 'add') {
      const title = String(item.title || '').trim().slice(0, 80);
      if (title.length < 2) continue;
      actions.push({ op: 'add', title, dueAt, label: `加上「${title}」` });
      continue;
    }
    const task = matchTask(tasks, item.match || item.title || '');
    if (!task) continue;
    if (item.op === 'done') {
      if (task.status === 'done') continue;
      actions.push({ op: 'done', taskId: task.id, title: task.title, label: `把「${task.title}」标成做完` });
    } else {
      actions.push({ op: 'move', taskId: task.id, title: task.title, dueAt, label: `把「${task.title}」改期` });
    }
  }
  return actions.slice(0, 3);
}

export function localPlan(message, tasks) {
  const today = shanghaiISO();
  const due = /后天/.test(message) ? addIso(today, 2) : /明天/.test(message) ? addIso(today, 1) : /今天/.test(message) ? today : '';
  const hit = tasks.find((task) => message.includes(task.title));
  if (/做完|完成了|标成完成|标为完成/.test(message) && hit) return normalizeActions({ actions: [{ op: 'done', match: hit.title }] }, tasks);
  if (/改到|放到|挪到|延期/.test(message) && hit && due) return normalizeActions({ actions: [{ op: 'move', match: hit.title, due }] }, tasks);
  return [];
}
