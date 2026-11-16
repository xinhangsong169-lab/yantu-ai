function shanghaiISO(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function addDays(iso, amount) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function weekdayMon1(iso) {
  const day = new Date(`${iso}T12:00:00+08:00`).getDay();
  return day === 0 ? 7 : day;
}

export function weekWindow(today = shanghaiISO()) {
  return { start: addDays(today, 1 - weekdayMon1(today)), end: today };
}

export function inWeek(date, window = weekWindow()) {
  return Boolean(date) && date >= window.start && date <= window.end;
}

export function experimentRun(item) {
  return {
    id: item.id,
    projectId: item.projectId || '',
    meetingId: item.meetingId || '',
    date: item.date || '',
    change: item.change || item.setup || item.title || '',
    control: item.control || '',
    metric: item.metric || '',
    delta: item.delta || '',
    flat: item.flat || '',
    next: item.next || item.conclusion || ''
  };
}

export function runsForMeeting(meeting, experiments, today = shanghaiISO()) {
  const window = weekWindow(today);
  const week = experiments.filter((item) => inWeek(item.date, window));
  if (meeting?.projectId) return week.filter((item) => item.projectId === meeting.projectId).map(experimentRun);
  return week.filter((item) => item.meetingId && item.meetingId === meeting?.id).map(experimentRun);
}

export function runsThisWeek(experiments, today = shanghaiISO()) {
  const window = weekWindow(today);
  return experiments.filter((item) => inWeek(item.date, window)).map(experimentRun);
}
