import { useEffect, useState } from 'react';
import { ChatPanel } from '../components/ChatPanel';
import { Field } from '../components/Dialogs';
import * as api from '../api';
import type { MeetingBrief } from '../api';
import { DayChoices } from '../components/DayChoices';
import { Waiting } from '../components/Waiting';
import { humanDay, STATUS_LABEL, todayISO } from '../lib/dates';
import { useWorkspace } from '../store';
import type { MeetingDraft } from '../types';

export function MeetingsPage() {
  const { state, notify, refresh, pinned, openRecord } = useWorkspace();
  const [selected, setSelected] = useState('');
  const [title, setTitle] = useState('本周组会');
  const [date, setDate] = useState(todayISO());
  const [projectId, setProjectId] = useState('');
  const [record, setRecord] = useState('');
  const [draft, setDraft] = useState<MeetingDraft | null>(null);
  const [keptRequirements, setKeptRequirements] = useState<string[]>([]);
  const [keptTasks, setKeptTasks] = useState<string[]>([]);
  const [report, setReport] = useState<MeetingBrief | null>(null);
  const [busy, setBusy] = useState(false);
  if (!state) return null;
  const meetings = [...state.meetings].sort((a, b) => (a.date < b.date ? 1 : -1));
  const current = meetings.find((meeting) => meeting.id === selected) || (!draft ? meetings[0] : undefined);
  const tasks = current ? state.tasks.filter((task) => task.sourceType === 'meeting' && task.sourceId === current.id) : [];
  useEffect(() => {
    if (pinned?.page === 'meetings' && pinned.id) {
      setDraft(null);
      setReport(null);
      setSelected(pinned.id);
    }
  }, [pinned]);

  const analyze = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setReport(null);
    try {
      const result = await api.analyzeMeeting({ title, date, record, projectId });
      setDraft(result.draft);
      setKeptRequirements(result.draft.requirements.map((item) => item.id || item.evidence));
      setKeptTasks(result.draft.suggestions.map((item) => item.id));
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '这次组会没有整理出来');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!draft) return;
    const requirements = draft.requirements.filter((item) => keptRequirements.includes(item.id || item.evidence));
    const suggestions = draft.suggestions.filter((item) => keptTasks.includes(item.id));
    if (!requirements.length && !suggestions.length) {
      notify('至少保留一条要求或一个任务');
      return;
    }
    setBusy(true);
    try {
      const result = await api.confirmMeeting({ ...draft, requirements, suggestions });
      setDraft(null);
      setRecord('');
      setTitle('本周组会');
      setSelected(result.meeting.id);
      await refresh();
      notify('已写入组会、任务和记忆。科研与就业窗口可以读到这些要求。');
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '没有写入，草稿还在');
    } finally {
      setBusy(false);
    }
  };

  const loadReport = async (id: string) => {
    setBusy(true);
    try {
      setReport(await api.meetingReport(id));
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '汇报提纲没有生成');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sheet meetings">
      <div className="sheet-main meeting-layout">
        <header className="page-head">
          <div>
            <h1>组会</h1>
            <p>先分开导师原话、可执行任务和还不确定的问题。你确认之后才写入任务和记忆。</p>
          </div>
        </header>
        <div className="master">
          <div className="list">
            {meetings.map((meeting) => (
              <button
                key={meeting.id}
                type="button"
                className={current?.id === meeting.id && !draft ? 'list-btn active' : 'list-btn'}
                onClick={() => {
                  setDraft(null);
                  setReport(null);
                  setSelected(meeting.id);
                }}
              >
                <strong>{meeting.title}</strong>
                <span>{humanDay(meeting.date)}</span>
              </button>
            ))}
            {meetings.length === 0 && <p className="quiet">还没有确认过的组会。</p>}
          </div>
          <div className="record">
            {busy && <Waiting text="正在根据组会记录生成…" />}
            {draft ? (
              <div className="stack">
                <p className="quiet">{draft.mode === 'cloud' ? '云端模型整理，引用必须能在原文找到。' : '本地规则整理，只保留原文里能对上的句子。'}</p>
                <h2>导师明确说出的</h2>
                {draft.requirements.length === 0 && <p>没有可靠抽出明确要求。可以改原文后再整理，或手动添加任务。</p>}
                {draft.requirements.map((item) => {
                  const id = item.id || item.evidence;
                  return (
                    <label key={id} className="choice quote-choice">
                      <input
                        type="checkbox"
                        checked={keptRequirements.includes(id)}
                        onChange={() =>
                          setKeptRequirements((currentIds) =>
                            currentIds.includes(id) ? currentIds.filter((value) => value !== id) : [...currentIds, id]
                          )
                        }
                      />
                      <span>
                        <strong>{item.text}</strong>
                        <em>原文：{item.evidence}</em>
                      </span>
                    </label>
                  );
                })}
                <h2>建议拆成的任务</h2>
                <p className="quiet">这些是执行建议，不是导师的原话。取消勾选就不会写入。</p>
                {draft.suggestions.map((item) => (
                  <label key={item.id} className="choice suggest-choice">
                    <input
                      type="checkbox"
                      checked={keptTasks.includes(item.id)}
                      onChange={() =>
                        setKeptTasks((currentIds) =>
                          currentIds.includes(item.id) ? currentIds.filter((value) => value !== item.id) : [...currentIds, item.id]
                        )
                      }
                    />
                    <span>
                      <strong>{item.title}</strong>
                      <em>{item.description}</em>
                      <em>依据：{item.evidence}</em>
                    </span>
                  </label>
                ))}
                <h2>还要你补充</h2>
                <ul className="plain pending-questions">
                  {draft.questions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
                <div className="row-actions">
                  <button type="button" className="btn" onClick={() => void confirm()} disabled={busy}>
                    {busy ? '正在写入' : '确认并写入任务'}
                  </button>
                  <button type="button" className="btn secondary" onClick={() => setDraft(null)}>
                    返回修改原文
                  </button>
                </div>
              </div>
            ) : (
              <div className="stack">
                {current && (
                  <article className="stack">
                    <h2>{current.title}</h2>
                    <p className="quiet">{humanDay(current.date)}</p>
                    <h3>决议</h3>
                    <p>{current.summary || '这次还没有写下决议。'}</p>
                    {current.projectId && (
                      <button type="button" className="text-btn" onClick={() => openRecord('research', current.projectId || '')}>
                        在课题里看
                      </button>
                    )}
                    <h3>待办</h3>
                    {tasks.length === 0 && <p className="quiet">确认之后，任务会出现在这张表里。</p>}
                    {tasks.length > 0 && (
                      <div className="minutes-wrap">
                        <table className="minutes">
                          <thead>
                            <tr>
                              <th>事项</th>
                              <th>导师原话</th>
                              <th>截止</th>
                              <th>进度</th>
                              <th>交差</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tasks.map((task) => (
                              <tr key={task.id}>
                                <td>{task.title}</td>
                                <td>{task.evidence || '—'}</td>
                                <td>{task.dueAt ? humanDay(task.dueAt) : '—'}</td>
                                <td>{STATUS_LABEL[task.status]}</td>
                                <td>{task.description || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <h3>未决</h3>
                    {(current.questions || []).length === 0 && <p className="quiet">没有留下还要确认的问题。</p>}
                    <ul className="plain pending-questions">
                      {(current.questions || []).map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                    <details>
                      <summary>原始记录</summary>
                      <p className="prose">{current.record}</p>
                    </details>
                    <button type="button" className="btn secondary" onClick={() => void loadReport(current.id)} disabled={busy}>
                      生成下次汇报提纲
                    </button>
                    {report && <Report brief={report} />}
                  </article>
                )}
                <form className="stack composer-card" onSubmit={analyze}>
                  <h2>记录一次新的组会</h2>
                  <Field label="主题">
                    <input value={title} onChange={(event) => setTitle(event.target.value)} required />
                  </Field>
                  <DayChoices label="哪一天的组会" value={date} onChange={setDate} />
                  <Field label="关联课题">
                    <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                      <option value="">不关联</option>
                      {state.projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="会议记录">
                    <textarea value={record} onChange={(event) => setRecord(event.target.value)} required />
                  </Field>
                  <button className="btn" type="submit" disabled={busy}>
                    {busy ? '正在整理' : '整理要求'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
      <ChatPanel scope="meetings" />
    </div>
  );
}

function Report({ brief }: { brief: MeetingBrief }) {
  return (
    <div className="report stack">
      <h3>下次汇报</h3>
      {brief.decision && <p>{brief.decision}</p>}
      <div className="minutes-wrap">
        <table className="minutes">
          <thead>
            <tr>
              <th>事项</th>
              <th>进度</th>
              <th>截止</th>
              <th>原话</th>
              <th>交差</th>
            </tr>
          </thead>
          <tbody>
            {brief.rows.map((row) => (
              <tr key={row.title}>
                <td>{row.title}</td>
                <td>{STATUS_LABEL[row.status as 'todo' | 'doing' | 'done'] || row.status}</td>
                <td>{row.dueAt ? humanDay(row.dueAt) : '—'}</td>
                <td>{row.evidence || '—'}</td>
                <td>{row.deliverable || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {brief.open.length > 0 && <p>还要问：{brief.open.join('；')}</p>}
      <p className="quiet">{brief.note}</p>
    </div>
  );
}
