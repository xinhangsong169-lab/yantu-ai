import { useState } from 'react';
import { Dialog, Field } from '../components/Dialogs';
import { DayChoices } from '../components/DayChoices';
import { addDays, daysFromToday, formatDay, humanDay, LANE_LABEL, PRIORITY_LABEL, startOfWeek, STATUS_LABEL, taskLane, todayISO, weekdayName, weekdayOf } from '../lib/dates';
import { useWorkspace } from '../store';
import type { Task } from '../types';

const LANES = ['all', 'meeting', 'course', 'research', 'career', 'manual'] as const;

export function TasksPage() {
  const { state, save, notify } = useWorkspace();
  const [lane, setLane] = useState<(typeof LANES)[number]>('all');
  const [weekStart, setWeekStart] = useState(startOfWeek(todayISO()));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ title: '', dueAt: todayISO(), priority: 'medium', projectId: '', description: '' });
  if (!state) return null;
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const visible = state.tasks.filter((task) => lane === 'all' || taskLane(task) === lane);

  const setStatus = async (task: Task, status: Task['status']) => {
    try {
      await save('tasks', { status }, task.id);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '状态没有改成');
    }
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await save('tasks', {
        title: draft.title,
        description: draft.description,
        dueAt: draft.dueAt,
        priority: draft.priority,
        projectId: draft.projectId,
        sourceType: draft.projectId ? 'project' : 'manual',
        status: 'todo'
      });
      setOpen(false);
      setDraft({ title: '', dueAt: todayISO(), priority: 'medium', projectId: '', description: '' });
      notify('任务已添加');
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '任务没有添加');
    }
  };

  return (
    <div className="sheet single tasks">
      <div className="sheet-main">
        <header className="page-head">
          <div>
            <h1>任务</h1>
            <p>课程、组会、科研和自己添加的事在同一张表里。来源还在，完成状态不会冒充实验结论。</p>
          </div>
          <button type="button" className="btn" onClick={() => setOpen(true)}>
            添加任务
          </button>
        </header>
        <div className="week-switch">
          <button type="button" className="btn secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            上一周
          </button>
          <strong>
            {formatDay(days[0])} – {formatDay(days[6])}
          </strong>
          <button type="button" className="btn secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            下一周
          </button>
        </div>
        <div className="day-board">
          {days.map((day) => {
            const due = state.tasks.filter((task) => task.dueAt === day);
            return (
              <section key={day} className={day === todayISO() ? 'day-card today' : 'day-card'}>
                <h2>
                  {daysFromToday(day) === 0 ? '今天' : daysFromToday(day) === 1 ? '明天' : daysFromToday(day) === 2 ? '后天' : weekdayName(weekdayOf(day))}
                  <span>{formatDay(day)}</span>
                </h2>
                {due.length === 0 && <p className="quiet">没有截止在这天的任务。</p>}
                {due.map((task) => (
                  <p key={task.id}>
                    {task.title}
                    <span className="quiet"> · {STATUS_LABEL[task.status]}</span>
                  </p>
                ))}
              </section>
            );
          })}
        </div>
        <div className="tabs" role="tablist" aria-label="任务来源">
          {LANES.map((item) => (
            <button key={item} type="button" className={lane === item ? 'tab active' : 'tab'} onClick={() => setLane(item)}>
              {item === 'all' ? '全部' : LANE_LABEL[item]}
            </button>
          ))}
        </div>
        {visible.length === 0 && (
          <div className="empty">
            <h2>这里还没有任务</h2>
            <p>可以从组会确认里生成，也可以自己加一条。</p>
          </div>
        )}
        <ul className="task-list">
          {visible.map((task) => (
            <li key={task.id} className={task.status === 'done' ? 'is-done' : undefined} data-priority={task.priority}>
              <div>
                <h3>{task.title}</h3>
                <p className="quiet">
                  {LANE_LABEL[taskLane(task)]} · 优先级{PRIORITY_LABEL[task.priority]}
                  {task.dueAt ? ` · ${humanDay(task.dueAt)}` : ''}
                </p>
                {task.evidence && <p>依据：{task.evidence}</p>}
              </div>
              <div className="status-switch" role="group" aria-label={`${task.title}的状态`}>
                {(['todo', 'doing', 'done'] as const).map((status) => (
                  <button key={status} type="button" aria-pressed={task.status === status} onClick={() => setStatus(task, status)}>
                    {STATUS_LABEL[status]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <Dialog open={open} title="添加任务" onClose={() => setOpen(false)}>
        <form className="stack" onSubmit={create}>
          <Field label="要做的事">
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
          </Field>
          <Field label="说明">
            <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          </Field>
          <DayChoices label="什么时候完成" value={draft.dueAt} onChange={(dueAt) => setDraft({ ...draft, dueAt })} />
          <div className="split">
            <Field label="优先级">
              <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </Field>
          </div>
          <Field label="关联课题">
            <select value={draft.projectId} onChange={(event) => setDraft({ ...draft, projectId: event.target.value })}>
              <option value="">不关联</option>
              {state.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </Field>
          <button className="btn" type="submit">
            保存任务
          </button>
        </form>
      </Dialog>
    </div>
  );
}
