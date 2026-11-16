import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeMeeting } from './tools.mjs';
import { runsThisWeek, experimentRun } from './research-week.mjs';

const skill = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'skills/meeting-writer/SKILL.md'), 'utf8');
const KINDS = { todos: '待办', report: '汇报稿', weekly: '周报' };

function todayLine() {
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());
}

function packet(meetings, tasks, profile, experiments) {
  const confirmed = meetings.filter((meeting) => meeting.confirmed);
  return {
    today: todayLine(),
    profile: {
      name: profile.name || '',
      major: profile.major || '',
      direction: profile.direction || '',
      weeklyGoal: profile.weeklyGoal || ''
    },
    meetings: confirmed.slice(0, 4).map((meeting) => ({
      date: meeting.date,
      title: meeting.title,
      summary: meeting.summary || '',
      record: meeting.record || '',
      requirements: meeting.requirements || [],
      questions: meeting.questions || []
    })),
    tasks: tasks.filter((task) => task.sourceType === 'meeting').map((task) => ({
      title: task.title,
      status: task.status === 'done' ? '已完成' : task.status === 'doing' ? '正在做' : '还没开始',
      dueAt: task.dueAt || '',
      evidence: task.evidence || '',
      description: task.description || ''
    })),
    experiments: (runsThisWeek(experiments).length ? runsThisWeek(experiments) : experiments.slice(0, 4).map(experimentRun)).map((item) => ({
      date: item.date || '',
      change: item.change || item.setup || item.title || '',
      control: item.control || '',
      metric: item.metric || '',
      delta: item.delta || '',
      flat: item.flat || '',
      next: item.next || item.conclusion || ''
    }))
  };
}

function present(kind, generated) {
  const items = (Array.isArray(generated.items) ? generated.items : []).slice(0, 8).map((item) => ({
    title: String(item?.title || '').trim().slice(0, 80),
    meta: String(item?.meta || '').trim().slice(0, 80),
    note: String(item?.note || '').trim().slice(0, 240)
  })).filter((item) => item.title);
  const text = String(generated.text || '').trim();
  if (!text) return null;
  return { title: String(generated.title || KINDS[kind] || '组会材料').slice(0, 40), text: text.slice(0, 4000), items };
}

function finishedTodos(tasks) {
  const meetingTasks = tasks.filter((task) => task.sourceType === 'meeting');
  const open = meetingTasks.filter((task) => task.status !== 'done');
  if (open.length) return null;
  return {
    title: '组会待办',
    text: '已确认的组会任务都已勾成完成。勾选只表示这件事标过完成，不是新的实验结果。',
    items: meetingTasks.slice(0, 8).map((task) => ({
      title: task.title,
      meta: `已完成${task.dueAt ? ` · ${task.dueAt}` : ''}`,
      note: task.evidence || ''
    }))
  };
}

export async function composeMeeting(env, cloud, meetings, tasks, profile, experiments, kind) {
  const local = attachWeekRuns(writeMeeting(meetings, tasks, profile, kind), experiments, kind);
  if (kind === 'todos') {
    const settled = finishedTodos(tasks);
    if (settled) return settled;
  }
  if (!env.DASHSCOPE_API_KEY) return local;
  const limits = experiments.map((item) => item.flat).filter(Boolean);
  try {
    const generated = await cloud(env, [
      { role: 'system', content: `${skill}\n\n今天是${todayLine()}。这次要写的是 ${KINDS[kind]}。${limits.length ? `必须保留这些原话，不能改成相反的结论：${limits.join('；')}` : ''}` },
      { role: 'user', content: JSON.stringify({ kind, material: packet(meetings, tasks, profile, experiments) }) }
    ], true);
    const written = present(kind, generated);
    const blocked = experiments.some((item) => /还没有跑对照|没有真实实验指标/.test(`${item.flat || ''}${item.result || ''}`));
    if (written && blocked && /完成执行|已跑完|跑完|初稿|可复现|正面与负面|全部运行/.test(written.text)) return local;
    return attachWeekRuns(written, experiments, kind) || local;
  } catch {
    return local;
  }
}

function attachWeekRuns(result, experiments, kind) {
  if (!result || (kind !== 'report' && kind !== 'weekly')) return result;
  const runs = runsThisWeek(experiments);
  const note = runs.length ? '本周实验表照搬科研记录，没有填写的指标保持空白。' : '本周科研记录里还没有实验。';
  const text = result.text.includes(note) ? result.text : `${result.text}\n\n${note}`;
  return { ...result, text, runs };
}
