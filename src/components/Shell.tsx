import { Icon } from '../icons';
import { humanDay, todayISO, weekdayName, weekdayOf } from '../lib/dates';
import { useWorkspace } from '../store';
import type { PageId } from '../types';

const NAV: { id: PageId; label: string; icon: 'desk' | 'book' | 'meeting' | 'research' | 'career' | 'calendar' }[] = [
  { id: 'workbench', label: '工作台', icon: 'desk' },
  { id: 'courses', label: '课程', icon: 'book' },
  { id: 'meetings', label: '组会', icon: 'meeting' },
  { id: 'research', label: '科研', icon: 'research' },
  { id: 'career', label: '就业', icon: 'career' },
  { id: 'tasks', label: '任务', icon: 'calendar' }
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { page, setPage, state, setMemoryOpen, setProfileOpen, reset, notify } = useWorkspace();
  const openTasks = state?.tasks.filter((task) => task.status !== 'done') ?? [];
  const nearest = openTasks.filter((task) => task.dueAt).sort((a, b) => (a.dueAt || '').localeCompare(b.dueAt || ''))[0];

  return (
    <div className="app">
      <a className="skip" href="#main">
        跳到主要内容
      </a>
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-mark" src="/mark.png" alt="" />
          <div>
            <p className="wordmark">研途 <span className="brand-ai">AI</span></p>
            <p className="tagline">今天，先做这一件</p>
          </div>
        </div>
        <nav aria-label="主要功能">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={page === item.id ? 'nav-btn active' : 'nav-btn'}
              data-nav={item.id}
              aria-current={page === item.id ? 'page' : undefined}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-ico">
                <Icon name={item.icon} />
              </span>
              {item.label}
            </button>
          ))}
        </nav>
        {state && (
          <div className="week-glance">
            <span>未完成</span>
            <strong>{openTasks.length}</strong>
            <p>{nearest?.dueAt ? `最近 ${humanDay(nearest.dueAt)}` : '没有排期的未完成任务'}</p>
          </div>
        )}
        <div className="side-foot">
          <button type="button" className="profile-chip" onClick={() => setProfileOpen(true)}>
            <span className="avatar" aria-hidden="true">{(state?.profile.name || '同').trim().slice(0, 1)}</span>
            <span className="who">
              <strong>{state?.profile.name || '同学'}</strong>
              <span>{state?.profile.direction || '还没写研究方向'}</span>
            </span>
          </button>
          <button type="button" className="memory-btn" onClick={() => setMemoryOpen(true)}>
            <Icon name="memory" />
            个人记忆
          </button>
          <details className="side-more">
            <summary>更多</summary>
            <div className="side-actions">
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm('清空后，现在这些课程、组会和任务都会删掉。')) return;
                try {
                  await reset('empty');
                } catch (reason) {
                  notify(reason instanceof Error ? reason.message : '没有清空');
                }
              }}
            >
              清空档案
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await reset('demo');
                } catch (reason) {
                  notify(reason instanceof Error ? reason.message : '没有恢复演示');
                }
              }}
            >
              恢复演示
            </button>
            </div>
          </details>
        </div>
      </aside>
      <div className="stage">
        <div className="stage-bar">
          <span>{humanDay(todayISO())} · {weekdayName(weekdayOf(todayISO()))}</span>
          <span>{state?.ai.configured ? '已连接云端' : '未连接云端'}</span>
        </div>
        <main id="main">{children}</main>
      </div>
    </div>
  );
}
