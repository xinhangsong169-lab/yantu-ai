import { useEffect, useRef, useState } from 'react';
import * as api from '../api';
import type { ScheduleAction, ToolResult } from '../api';
import { Icon } from '../icons';
import { Waiting } from './Waiting';
import { humanDay } from '../lib/dates';
import { useWorkspace } from '../store';
import type { ChatMessage, PageId } from '../types';

const TITLES: Record<string, string> = {
  workbench: '今天先做什么',
  courses: '查老师和课程',
  meetings: '任务、汇报和周报',
  research: '管理已收入的文献',
  career: '梳理这批岗位'
};

export function ChatPanel({ scope, variant = 'rail' }: { scope: Exclude<PageId, 'tasks'>; variant?: 'main' | 'rail' }) {
  const { threads, sendChat, sending, composer, setMemoryOpen, notify, refresh } = useWorkspace();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ToolResult | null>(null);
  const [actions, setActions] = useState<ScheduleAction[]>([]);
  const [running, setRunning] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const messages = threads[scope] || [];

  useEffect(() => {
    if (composer?.scope === scope) setInput(composer.text);
  }, [composer, scope]);

  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  const run = async (label: string, task: () => Promise<ToolResult>) => {
    setRunning(label);
    try {
      setResult(await task());
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '没有整理出来');
    } finally {
      setRunning('');
    }
  };

  const submit = async () => {
    const message = input.trim();
    if (!message) return;
    setInput('');
    setActions([]);
    if (scope === 'workbench') {
      void api.interpretSchedule(message).then((plan) => setActions(plan.actions || [])).catch(() => setActions([]));
    }
    await sendChat(scope, message, true);
  };

  return (
    <section className={variant === 'main' ? 'chat chat-main' : 'chat'} aria-label={TITLES[scope]}>
      <div className="chat-head">
        <h2>{variant === 'main' ? '今天先做什么' : TITLES[scope]}</h2>
        <button type="button" className="text-btn" onClick={() => setMemoryOpen(true)}>
          <Icon name="memory" />
          记忆
        </button>
      </div>
      <div className="tool-actions">
        {scope === 'courses' && (
          <form
            className="tool-search"
            onSubmit={(event) => {
              event.preventDefault();
              void run('查找', () => api.lookupCourse(query));
            }}
          >
            <input value={query} placeholder="老师、课程或考核方式" onChange={(event) => setQuery(event.target.value)} />
            <button className="btn" type="submit" disabled={running === '查找'}>
              {running === '查找' ? '正在查' : '查找'}
            </button>
          </form>
        )}
        {scope === 'meetings' && (
          <>
            <button type="button" className="btn secondary" disabled={!!running} onClick={() => run('待办', () => api.writeMeeting('todos'))}>
              {running === '待办' ? '正在整理' : '整理待办'}
            </button>
            <button type="button" className="btn secondary" disabled={!!running} onClick={() => run('汇报', () => api.writeMeeting('report'))}>
              {running === '汇报' ? '正在写' : '写汇报稿'}
            </button>
            <button type="button" className="btn secondary" disabled={!!running} onClick={() => run('周报', () => api.writeMeeting('weekly'))}>
              {running === '周报' ? '正在写' : '写周报'}
            </button>
          </>
        )}
        {scope === 'research' && (
          <button type="button" className="btn" disabled={!!running} onClick={() => run('文献', () => api.findLiterature())}>
            {running === '文献' ? '正在整理' : '看已收入的文献'}
          </button>
        )}
        {scope === 'career' && (
          <button type="button" className="btn" disabled={!!running} onClick={() => run('岗位', () => api.briefJobs())}>
            {running === '岗位' ? '正在梳理' : '梳理岗位'}
          </button>
        )}
        {scope === 'workbench' && (
          <button type="button" className="btn" disabled={sending === scope} onClick={() => sendChat(scope, '今天先做哪一件？', true)}>
            {sending === scope ? '正在排' : '排出今天的顺序'}
          </button>
        )}
      </div>
      {running && <Waiting text={runningText(running)} />}
      {result && (
        <div className="tool-result">
          <h3>{result.title}</h3>
          <p>{result.text}</p>
          {result.items?.map((item) => (
            <div className="item" key={`${item.title}-${item.meta || ''}`}>
              <strong>{item.href ? <a href={item.href} target="_blank" rel="noreferrer">{item.title}</a> : item.title}</strong>
              {item.meta && <p className="quiet">{item.meta}</p>}
              {item.note && <p>{item.note}</p>}
            </div>
          ))}
        </div>
      )}
      {scope === 'workbench' && (
        <>
          <div className="log" ref={logRef}>
            {messages.length === 0 && <p className="quiet">可以问实习、文献、老师的成绩，或这周的安排。</p>}
            {messages.map((message) => (
              <article key={message.id} className={`${message.role === 'user' ? 'bubble user' : 'bubble assistant'}${message.pending ? ' pending' : ''}`}>
                {message.role === 'user' ? <p>{message.content}</p> : <AssistantStream message={message} />}
              </article>
            ))}
          </div>
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <textarea
              value={input}
              rows={2}
              placeholder="问今天的安排，也可以接着往下聊"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
            <div className="composer-bar">
              <button className="btn" type="submit" disabled={sending === scope || !input.trim()}>
                <Icon name="send" />
                {sending === scope ? '正在回答' : '发送'}
              </button>
            </div>
          </form>
          {actions.length > 0 && (
            <div className="schedule-confirm">
              <p>要写入日程的话，确认这一下。</p>
              <ul>
                {actions.map((action) => (
                  <li key={`${action.op}-${action.title}`}>
                    {action.label}
                    {action.dueAt ? `，${humanDay(action.dueAt)}` : ''}
                  </li>
                ))}
              </ul>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                    try {
                      await api.applySchedule(actions);
                      setActions([]);
                      await refresh();
                      notify('日程已更新');
                    } catch (reason) {
                      notify(reason instanceof Error ? reason.message : '日程没有改成');
                    }
                  }}
                >
                  写入日程
                </button>
                <button type="button" className="btn secondary" onClick={() => setActions([])}>
                  先不改
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {scope !== 'workbench' && (
        <details className="followup">
          <summary>接着问一句</summary>
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <textarea
              value={input}
              rows={2}
              placeholder={placeholder(scope)}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
            <div className="composer-bar">
              <button className="btn" type="submit" disabled={sending === scope || !input.trim()}>
                {sending === scope ? '正在回答' : '发送'}
              </button>
            </div>
            {messages.filter((message) => message.role === 'assistant').slice(-1).map((message) => (
              <div key={message.id} className="follow-answer">
                <AssistantStream message={message} />
              </div>
            ))}
          </form>
        </details>
      )}
    </section>
  );
}

function runningText(running: string) {
  if (running === '待办') return '正在把组会任务整理成待办…';
  if (running === '汇报') return '正在写汇报稿…';
  if (running === '周报') return '正在写周报…';
  if (running === '文献') return '正在整理已收入的文献…';
  if (running === '岗位') return '正在梳理岗位…';
  return '正在查这门课…';
}

function waitCopy(message: ChatMessage) {
  const done: string[] = [];
  if (message.phase && message.phase !== 'profile') done.push('已读取个人档案');
  if (message.sawMemory) done.push('已检索共享记忆');
  if (message.sawMaterials) done.push('已检索相关资料');
  const text = message.phase === 'writing' ? '正在生成结果' : message.phase === 'model' ? '正在调用模型' : '正在读取个人档案';
  return { text, done };
}

function AssistantStream({ message }: { message: ChatMessage }) {
  const wait = waitCopy(message);
  return (
    <>
      {message.pending ? <Waiting text={wait.text} done={wait.done} /> : null}
      {message.content ? (
        <p>
          {message.content}
          {message.pending ? <span className="caret" aria-hidden="true" /> : null}
        </p>
      ) : null}
      {message.context && message.context.length > 0 ? (
        <details className="trace">
          <summary>这次读到的记录</summary>
          <ul>
            {message.context.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.source}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {message.schedule ? <ScheduleTable rows={message.schedule} /> : null}
      {message.tool ? (
        <details className="trace" open>
          <summary>检索结果</summary>
          <ToolCardView card={message.tool} />
        </details>
      ) : null}
    </>
  );
}

function ScheduleTable({ rows }: { rows: { day: string; items: { kind: string; title: string; meta?: string }[] }[] }) {
  if (!rows.length) return <p className="quiet">这七天没有排课，也没有到期的事。</p>;
  return (
    <table className="agenda-table">
      <thead>
        <tr>
          <th>哪天</th>
          <th>安排</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.day}>
            <th>{row.day}</th>
            <td>
              {row.items.map((item) => (
                <div className="agenda-line" key={`${item.kind}-${item.title}`}>
                  <span>{item.kind}</span>
                  <strong>{item.title}</strong>
                  {item.meta ? <em>{item.meta}</em> : null}
                </div>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ToolCardView({ card }: { card: { title: string; text: string; items?: { title: string; meta?: string; note?: string; href?: string }[] } }) {
  return (
    <div className="bubble-tool">
      <strong>{card.title}</strong>
      {card.text ? <p>{card.text}</p> : null}
      {card.items?.map((item) => (
        <div className="agenda-line" key={`${item.title}-${item.meta || ''}`}>
          <strong>{item.href ? <a href={item.href} target="_blank" rel="noreferrer">{item.title}</a> : item.title}</strong>
          {item.meta ? <em>{item.meta}</em> : null}
          {item.note ? <span>{item.note}</span> : null}
        </div>
      ))}
    </div>
  );
}

function placeholder(scope: string) {
  if (scope === 'courses') return '例如：陈老师平时成绩占多少';
  if (scope === 'meetings') return '例如：汇报稿里补上还没做完的原因';
  if (scope === 'research') return '例如：这几份上传的资料和课题哪里相关';
  return '例如：只保留上海、并且要求硕士的岗位';
}
