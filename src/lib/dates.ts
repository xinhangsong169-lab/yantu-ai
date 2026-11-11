import type { Course, Task } from '../types';

const WEEKDAYS = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function toISO(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayISO() {
  return toISO(new Date());
}

export function weekdayOf(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function weekdayName(day: number) {
  return WEEKDAYS[day] || '';
}

export function formatDay(iso?: string) {
  if (!iso) return '未设日期';
  const [, month, day] = iso.split('-');
  return `${Number(month)}月${Number(day)}日`;
}

export function formatLong(iso: string) {
  return `${iso.slice(0, 4)}年${formatDay(iso)} ${weekdayName(weekdayOf(iso))}`;
}

export function daysFromToday(iso: string) {
  const today = new Date(`${todayISO()}T12:00:00`);
  const target = new Date(`${iso}T12:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function humanDay(iso?: string) {
  if (!iso) return '未设日期';
  const delta = daysFromToday(iso);
  if (delta === 0) return '今天';
  if (delta === 1) return '明天';
  if (delta === 2) return '后天';
  if (delta === -1) return '昨天';
  if (delta === -2) return '前天';
  if (delta > 2 && delta <= 7) return `${weekdayName(weekdayOf(iso))} ${formatDay(iso)}`;
  return formatDay(iso);
}

export function addDays(iso: string, amount: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return toISO(date);
}

export function startOfWeek(iso: string) {
  return addDays(iso, 1 - weekdayOf(iso));
}

export function courseOnDate(course: Course, iso: string) {
  if (course.weekday !== weekdayOf(iso)) return false;
  if (course.exdates?.includes(iso)) return false;
  if (course.startDate && iso < course.startDate) return false;
  if (course.endDate && iso > course.endDate) return false;
  if (course.weeks === '单次课程' && course.startDate && iso !== course.startDate) return false;
  return true;
}

export function minutes(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function nextTask(tasks: Task[]) {
  const rank = { high: 0, medium: 1, low: 2 };
  return tasks
    .filter((task) => task.status !== 'done')
    .slice()
    .sort((a, b) => {
      const left = a.dueAt || '9999-99-99';
      const right = b.dueAt || '9999-99-99';
      if (left !== right) return left < right ? -1 : 1;
      return rank[a.priority] - rank[b.priority];
    })[0];
}

export function taskLane(task: Task) {
  if (task.sourceType === 'course') return 'course';
  if (task.sourceType === 'meeting') return 'meeting';
  if (task.sourceType === 'career') return 'career';
  if (task.projectId) return 'research';
  return 'manual';
}

export const LANE_LABEL: Record<string, string> = {
  course: '课程',
  meeting: '组会',
  research: '科研',
  career: '就业',
  manual: '自己添加'
};

export const STATUS_LABEL: Record<Task['status'], string> = {
  todo: '待开始',
  doing: '进行中',
  done: '已完成'
};

export const PRIORITY_LABEL: Record<Task['priority'], string> = {
  high: '高',
  medium: '中',
  low: '低'
};
