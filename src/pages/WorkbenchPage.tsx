import { ChatPanel } from '../components/ChatPanel';
import { addDays, courseOnDate, humanDay, nextTask, STATUS_LABEL, todayISO } from '../lib/dates';
import { useWorkspace } from '../store';

export function WorkbenchPage() {
  const { state, save, notify, sendChat, sending } = useWorkspace();
  if (!state) return null;
  const today = todayISO();
  const classes = state.courses.filter((course) => courseOnDate(course, today));
  const focus = nextTask(state.tasks);
  const rest = state.tasks.filter((task) => task.status !== 'done' && task.id !== focus?.id);
  const courseTask = classes
    .map((course) => state.tasks.find((task) => task.sourceType === 'course' && task.sourceId === course.id && task.status !== 'done'))
    .find(Boolean);

  const advance = async (status: 'doing' | 'done') => {
    if (!focus) return;
    try {
      await save('tasks', { status }, focus.id);
      notify(status === 'done' ? '已记为完成' : '已记为进行中');
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '状态没有改成');
    }
  };

  return (
    <div className="workbench">
      <div className="work-main">
        {focus ? (
          <header className="focus">
            <p>未完成的记录里，日期最近的是这一件。</p>
            <h1>{focus.title}</h1>
            <p className="focus-meta">
              <span>{STATUS_LABEL[focus.status]}</span>
              {focus.dueAt ? <strong>{humanDay(focus.dueAt)}前</strong> : <span>没有截止日期</span>}
              {focus.dueAt && focus.dueAt < today ? <span>已过计划日期</span> : null}
            </p>
            {focus.evidence && <blockquote>依据：{focus.evidence}</blockquote>}
            <div className="row-actions">
              {focus.status !== 'doing' && (
                <button type="button" className="btn secondary" onClick={() => advance('doing')}>
                  标为进行中
                </button>
              )}
              <button type="button" className="btn" onClick={() => advance('done')}>
                标为已完成
              </button>
              <button
                type="button"
                className="btn secondary"
                disabled={sending === 'workbench'}
                onClick={() => {
                const evidence = (focus.evidence || focus.description || '任务本身').replace(/。+$/, '');
                return sendChat(
                  'workbench',
                  `围绕「${focus.title}」安排今天可以完成的步骤。原始依据是：${evidence}。没有写进记录的实验结论不要编造。`,
                  true
                );
              }}
              >
                让助手拆步骤
              </button>
            </div>
          </header>
        ) : (
          <header className="focus">
            <h1>未完成的任务已经清空</h1>
            <p>可以去组会里生成下次汇报提纲，或给科研项目写下一步。</p>
          </header>
        )}
        <ChatPanel scope="workbench" variant="main" />
      </div>
      <aside className="work-rail" aria-label="今天的安排">
        <section>
          <h2>今天的课</h2>
          {classes.length === 0 && <p className="quiet">今天没有排课。</p>}
          {classes.map((course) => (
            <article key={course.id} className="slip course-card">
              <h3>{course.title}</h3>
              <p>
                {course.start}–{course.end}
                {course.location ? ` · ${course.location}` : ''}
              </p>
              <p className="quiet">{course.teacher || '教师待补充'}</p>
              {courseTask && courseTask.sourceId === course.id && (
                <p>
                  还没交：{courseTask.title}
                  {courseTask.dueAt ? `，${humanDay(courseTask.dueAt)}前` : ''}
                </p>
              )}
            </article>
          ))}
        </section>
        <section>
          <h2>这七天</h2>
          {Array.from({ length: 8 }, (_, offset) => addDays(today, offset)).map((iso) => {
            const dayClasses = state.courses.filter((course) => courseOnDate(course, iso));
            const due = state.tasks.filter((task) => task.status !== 'done' && task.dueAt === iso);
            if (!dayClasses.length && !due.length) return null;
            return (
              <p key={iso}>
                <strong>{humanDay(iso)}</strong>
                {dayClasses.length ? ` ${dayClasses.map((course) => course.title).join('、')}` : ''}
                {due.length ? ` · ${due.map((task) => task.title).join('、')}` : ''}
              </p>
            );
          })}
        </section>
        <section>
          <h2>接着要做</h2>
          {rest.length === 0 && <p className="quiet">没有别的未完成任务。</p>}
          <ul className="queue">
            {rest.slice(0, 5).map((task) => (
              <li key={task.id}>
                <strong>{task.title}</strong>
                <span>
                  {STATUS_LABEL[task.status]}
                  {task.dueAt ? ` · ${humanDay(task.dueAt)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>本周想推进的</h2>
          <p>{state.profile.weeklyGoal || '还没在档案里写本周目标。'}</p>
          <p className="quiet">{state.projects[0]?.title ? `当前课题：${state.projects[0].title}` : '还没有科研项目。'}</p>
        </section>
      </aside>
    </div>
  );
}
