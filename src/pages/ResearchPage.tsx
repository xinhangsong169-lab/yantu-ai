import { useEffect, useState } from 'react';
import { ChatPanel } from '../components/ChatPanel';
import { Waiting } from '../components/Waiting';
import * as api from '../api';
import { Dialog, Field } from '../components/Dialogs';
import { DayChoices } from '../components/DayChoices';
import { humanDay, inCurrentWeek, STATUS_LABEL, todayISO } from '../lib/dates';
import { useWorkspace } from '../store';
import type { Experiment, Meeting, Project } from '../types';

export function ResearchPage() {
  const { state, save, remove, refresh, notify, sendChat, sending, pinned, openRecord } = useWorkspace();
  const [projectId, setProjectId] = useState('');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectDraft, setProjectDraft] = useState({ title: '', description: '', goal: '', baseline: '', metric: '', stage: '文献调研', nextStep: '', tags: '' });
  const [experimentOpen, setExperimentOpen] = useState(false);
  const [experiment, setExperiment] = useState({ title: '', date: todayISO(), change: '', control: '', metric: '', delta: '', flat: '', next: '', evidence: '' });
  const [busy, setBusy] = useState(false);
  const [material, setMaterial] = useState('');
  const [fileName, setFileName] = useState('');
  const [pdf, setPdf] = useState('');
  const [importing, setImporting] = useState(false);
  const [picked, setPicked] = useState<{ paperId: string; quote: string } | null>(null);
  const [threadOpen, setThreadOpen] = useState(false);
  const [threadDraft, setThreadDraft] = useState('');
  if (!state) return null;
  const current = state.projects.find((item) => item.id === projectId) || state.projects[0];
  const papers = state.papers.filter((item) => !current || item.projectId === current.id || !item.projectId);
  const experiments = state.experiments.filter((item) => !current || item.projectId === current.id);
  const tasks = state.tasks.filter((item) => current && item.projectId === current.id);
  const weekRuns = experiments.filter((item) => inCurrentWeek(item.date));
  useEffect(() => {
    if (pinned?.page === 'research' && pinned.id) setProjectId(pinned.id);
  }, [pinned]);
  useEffect(() => {
    if (pinned?.page !== 'research' || !pinned.focus) return;
    document.getElementById(`run-${pinned.focus}`)?.scrollIntoView({ block: 'center' })
      || document.getElementById(`paper-${pinned.focus}`)?.scrollIntoView({ block: 'center' });
  }, [pinned, projectId]);

  const createProject = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await save('projects', {
        ...projectDraft,
        question: projectDraft.description,
        stageQuestion: projectDraft.goal,
        status: 'active',
        tags: projectDraft.tags.split(/[、,，]/).map((item) => item.trim()).filter(Boolean)
      });
      setProjectOpen(false);
      notify('课题已建立');
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '课题没有保存');
    } finally {
      setBusy(false);
    }
  };

  const readMaterial = async (file?: File) => {
    if (!file) return;
    if (file.size > 8_000_000) {
      notify('文件请小于 8MB');
      return;
    }
    setFileName(file.name);
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
      setPdf(btoa(binary));
      setMaterial('');
      return;
    }
    setPdf('');
    setMaterial(await file.text());
  };

  const importMaterial = async () => {
    setImporting(true);
    try {
      await api.importPaper({ filename: fileName, text: material, pdf, projectId: current?.id || '' });
      setMaterial('');
      setPdf('');
      setFileName('');
      await refresh();
      notify('文献已收入，总结只来自这份原文');
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '文献没有收入');
    } finally {
      setImporting(false);
    }
  };

  const saveExperiment = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await save('experiments', { ...experiment, title: experiment.title || experiment.change, projectId: current?.id || '' });
      setExperimentOpen(false);
      notify('实验记录已保存');
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '实验记录没有保存');
    } finally {
      setBusy(false);
    }
  };

  const saveThread = async () => {
    if (!current || !threadDraft.trim()) return;
    setBusy(true);
    try {
      await save('memories', {
        key: `${current.title}的课题脉络`,
        value: threadDraft.trim(),
        domain: 'research',
        sourceType: 'project',
        sourceId: current.id,
        sourceLabel: '课题脉络 · 你确认后保存',
        confirmed: true,
        active: true
      });
      setThreadOpen(false);
      notify('课题脉络已写入记忆，之后提问会读到它');
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '课题脉络没有保存');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`sheet research compact-sheet${assistantOpen ? '' : ' assistant-closed'}`}>
      <div className="sheet-main">
        <header className="page-head">
          <div>
            <h1>科研</h1>
            <p>实验记录是这页的正文。文献按你上传的原文总结，不联网补写。</p>
          </div>
          <div className="row-actions"><button type="button" className="btn secondary" aria-expanded={assistantOpen} aria-controls="research-assistant" onClick={() => setAssistantOpen(!assistantOpen)}>{assistantOpen ? '收起助手' : '打开助手'}</button><button type="button" className="btn" onClick={() => setProjectOpen(true)}>新课题</button></div>
        </header>
        {state.projects.length === 0 ? (
          <div className="empty">
            <h2>还没有课题</h2>
            <p>先写下题目和这一阶段要得到的结果，再把论文和实验挂上去。</p>
          </div>
        ) : (
          <>
          <div className="master">
            <label className="record-switcher"><span>当前课题</span><select value={current?.id || ''} onChange={(event) => setProjectId(event.target.value)}>{state.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
            {current && (
              <article className="record research-body">
                <div className="research-top">
                  <div>
                    <h2>{current.title}</h2>
                    <p className="quiet">{current.stage || '阶段未写'}</p>
                    <p>{current.description}</p>
                  </div>
                </div>
                <div className="row-actions">
                  <button type="button" className="btn" onClick={() => setExperimentOpen(true)}>
                    记一次实验
                  </button>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      if (!current) return;
                      setThreadDraft(threadText(current, weekRuns, state.meetings));
                      setThreadOpen(true);
                    }}
                  >
                    整理课题脉络
                  </button>
                  <button
                    type="button"
                    className="text-btn"
                    disabled={sending === 'research'}
                    onClick={() => {
                      setAssistantOpen(true);
                      return sendChat(
                        'research',
                        `根据课题「${current.title}」、未完成任务和已确认的组会要求，安排接下来七天。每条都要对应现有记录。没有记录的部分直接说缺什么，不要编造实验结果或论文。`,
                        true
                      );
                    }}
                  >
                    按当前进度排七天
                  </button>
                </div>
                <dl className="facts research-facts">
                  <div>
                    <dt>指标</dt>
                    <dd>{current.metric || '未填'}</dd>
                  </div>
                  <div>
                    <dt>对照基线</dt>
                    <dd>{current.baseline || '未填'}</dd>
                  </div>
                  <div className="fact-wide">
                    <dt>研究问题</dt>
                    <dd>{current.question || current.description || '未填'}</dd>
                  </div>
                  <div className="fact-wide">
                    <dt>这一阶段要回答</dt>
                    <dd>{current.stageQuestion || current.goal || '未填'}</dd>
                  </div>
                </dl>
                <section className="research-section">
                  <div className="section-bar">
                    <h3>本周结果</h3>
                    <span className="quiet">本周一到今天 · 组会汇报引用同一行</span>
                  </div>
                  {weekRuns.length === 0 && <p className="quiet">本周还没有实验记录。</p>}
                  {weekRuns.length > 0 && <ExperimentList rows={weekRuns} openRecord={openRecord} focused={pinned?.focus} />}
                </section>
                <details key={current.id} className="research-fold">
                  <summary>全部实验 · {experiments.length}</summary>
                  {experiments.length === 0 && <p className="quiet">还没有实验记录。没有数字的地方会写未填。</p>}
                  {experiments.length > 0 && <ExperimentList rows={experiments} openRecord={openRecord} focused={pinned?.focus} markWeek />}
                </details>
                <section>
                  <h3>课题任务</h3>
                  {tasks.length === 0 && <p className="quiet">组会确认后的任务会出现在这里。</p>}
                  <ul className="plain research-tasks">
                    {tasks.map((task) => (
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
                  <h3>文献</h3>
                  <form
                    className="research-upload"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void importMaterial();
                    }}
                  >
                    <label className="file-btn btn secondary">
                      选择文件
                      <input
                        type="file"
                        accept=".pdf,.txt,.md,application/pdf,text/plain"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          void readMaterial(file);
                          event.target.value = '';
                        }}
                      />
                    </label>
                    <input value={material} placeholder="或贴一段资料" onChange={(event) => { setPdf(''); setMaterial(event.target.value); }} />
                    <button className="btn" type="submit" disabled={importing || (!pdf && material.trim().length < 40)}>
                      {importing ? '正在总结' : '收入'}
                    </button>
                  </form>
                  {fileName && <p className="quiet">已选择 {fileName}</p>}
                  {importing && <Waiting text="正在阅读原文并写总结…" />}
                    {papers.length === 0 && <p className="quiet">还没有收入这个课题的文献。</p>}
                    {papers.map((item) => (
                      <article
                        key={item.id}
                        id={`paper-${item.id}`}
                        className={`slip paper-card${pinned?.focus === item.id ? ' is-focus' : ''}`}
                        onMouseUp={() => {
                          const selection = window.getSelection();
                          const quote = selection?.toString().replace(/\s+/g, ' ').trim() || '';
                          const node = selection?.anchorNode;
                          const root = document.getElementById(`paper-${item.id}`);
                          if (quote.length < 8 || !node || !root?.contains(node)) return;
                          setPicked({ paperId: item.id, quote: quote.slice(0, 500) });
                        }}
                      >
                        <h4>{item.title}</h4>
                        <p className="quiet">
                          {[item.authors, item.year].filter(Boolean).join(' · ')}
                          {item.url && (
                            <>
                              {' · '}
                              <a href={item.url} target="_blank" rel="noreferrer">
                                原文
                              </a>
                            </>
                          )}
                        </p>
                        {item.sourceName && <p className="quiet">来自 {item.sourceName}</p>}
                        <div className="paper-bits">
                          <div>
                            <strong>笔记</strong>
                            <p>{item.answers || '还没有总结'}</p>
                          </div>
                          <div>
                            <strong>可引用的观点</strong>
                            <p>{item.method || '原文没有单独写出做法'}</p>
                          </div>
                          <div>
                            <strong>还缺的证据</strong>
                            <p>{item.gap || '原文没有指出缺口'}</p>
                          </div>
                        </div>
                        {item.note && <p className="quiet">摘录：{item.note}</p>}
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn secondary"
                            disabled={sending === 'research' || picked?.paperId !== item.id}
                            onClick={() => {
                              if (!picked || picked.paperId !== item.id || !current) return;
                              setAssistantOpen(true);
                              void sendChat('research', '', true, {
                                paperId: item.id,
                                projectId: current.id,
                                title: item.title,
                                quote: picked.quote
                              });
                            }}
                          >
                            问这段能支持什么
                          </button>
                          <button type="button" className="text-btn danger" onClick={() => remove('papers', item.id).then(() => notify('文献已删除'))}>
                            删除
                          </button>
                        </div>
                      </article>
                    ))}
                  </section>
              </article>
            )}
          </div>
          </>
        )}
      </div>
      <div id="research-assistant" className="assistant-panel" hidden={!assistantOpen}><ChatPanel scope="research" /></div>
      <Dialog open={projectOpen} title="新课题" onClose={() => setProjectOpen(false)}>
        <form className="stack" onSubmit={createProject}>
          <Field label="题目">
            <input value={projectDraft.title} onChange={(event) => setProjectDraft({ ...projectDraft, title: event.target.value })} required />
          </Field>
          <Field label="研究问题">
            <textarea value={projectDraft.description} onChange={(event) => setProjectDraft({ ...projectDraft, description: event.target.value })} />
          </Field>
          <Field label="这一阶段要回答的问题">
            <input value={projectDraft.goal} onChange={(event) => setProjectDraft({ ...projectDraft, goal: event.target.value })} />
          </Field>
          <Field label="对照基线">
            <input value={projectDraft.baseline} onChange={(event) => setProjectDraft({ ...projectDraft, baseline: event.target.value })} />
          </Field>
          <Field label="指标">
            <input value={projectDraft.metric} onChange={(event) => setProjectDraft({ ...projectDraft, metric: event.target.value })} placeholder="没有就留空" />
          </Field>
          <Field label="阶段">
            <input value={projectDraft.stage} onChange={(event) => setProjectDraft({ ...projectDraft, stage: event.target.value })} />
          </Field>
          <Field label="下一步">
            <input value={projectDraft.nextStep} onChange={(event) => setProjectDraft({ ...projectDraft, nextStep: event.target.value })} />
          </Field>
          <Field label="标签">
            <input value={projectDraft.tags} onChange={(event) => setProjectDraft({ ...projectDraft, tags: event.target.value })} placeholder="用顿号分开" />
          </Field>
          <button className="btn" disabled={busy} type="submit">
            建立课题
          </button>
        </form>
      </Dialog>
      <Dialog open={experimentOpen} title="实验记录" onClose={() => setExperimentOpen(false)}>
        <form className="stack" onSubmit={saveExperiment}>
          <Field label="这次改了什么">
            <input value={experiment.change} onChange={(event) => setExperiment({ ...experiment, change: event.target.value })} required />
          </Field>
          <DayChoices label="哪一天做的" value={experiment.date} onChange={(date) => setExperiment({ ...experiment, date })} />
          <Field label="对照">
            <input value={experiment.control} onChange={(event) => setExperiment({ ...experiment, control: event.target.value })} />
          </Field>
          <Field label="指标">
            <input value={experiment.metric} onChange={(event) => setExperiment({ ...experiment, metric: event.target.value })} placeholder="没有就留空" />
          </Field>
          <Field label="相对基线">
            <input value={experiment.delta} onChange={(event) => setExperiment({ ...experiment, delta: event.target.value })} placeholder="没有数字就留空" />
          </Field>
          <Field label="没提升的设置">
            <input value={experiment.flat} onChange={(event) => setExperiment({ ...experiment, flat: event.target.value })} />
          </Field>
          <Field label="下一步">
            <input value={experiment.next} onChange={(event) => setExperiment({ ...experiment, next: event.target.value })} />
          </Field>
          <button className="btn" disabled={busy} type="submit">
            保存实验
          </button>
        </form>
      </Dialog>
      <Dialog open={threadOpen} title="课题脉络" onClose={() => setThreadOpen(false)} wide>
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            void saveThread();
          }}
        >
          <p className="quiet">只拼了课题事实、本周实验和已确认的组会原话。空着的指标保持空白。改完再保存，才会进入记忆。</p>
          <textarea value={threadDraft} onChange={(event) => setThreadDraft(event.target.value)} rows={14} />
          <button className="btn" type="submit" disabled={busy || !threadDraft.trim()}>
            确认并写入记忆
          </button>
        </form>
      </Dialog>
    </div>
  );
}

function threadText(project: Project, runs: Experiment[], meetings: Meeting[]) {
  const quotes = meetings
    .filter((meeting) => meeting.confirmed && meeting.projectId === project.id)
    .flatMap((meeting) => (meeting.requirements || []).map((item) => item.evidence || item.text).filter(Boolean));
  const lines = [
    `课题：${project.title}`,
    `研究问题：${project.question || project.description || '还没写'}`,
    `对照基线：${project.baseline || '还没写'}`,
    `指标：${project.metric || '还没写'}`,
    `这一阶段要回答：${project.stageQuestion || project.goal || '还没写'}`,
    '',
    '本周实验'
  ];
  if (!runs.length) lines.push('本周还没有实验记录。');
  for (const item of runs) {
    lines.push(`- ${item.date || '未标日期'} ${item.change || item.setup || item.title}`);
    lines.push(`  对照：${item.control || '空'}`);
    lines.push(`  指标：${item.metric || '空'}；相对基线：${item.delta || '空'}`);
    lines.push(`  没提升的设置：${item.flat || '空'}`);
  }
  lines.push('', '已确认的组会原话');
  if (!quotes.length) lines.push('这个课题还没有已确认的组会原话。');
  else quotes.forEach((quote) => lines.push(`- ${quote}`));
  return lines.join('\n');
}

function filled(value?: string) {
  const text = value?.trim();
  return text || '未填';
}

function ExperimentList({
  rows,
  openRecord,
  focused,
  markWeek
}: {
  rows: Experiment[];
  openRecord: (page: 'meetings', id: string) => void;
  focused?: string;
  markWeek?: boolean;
}) {
  return (
    <ul className="run-list">
      {rows.map((item) => {
        const note = [item.flat && `没提升：${item.flat}`, (item.next || item.conclusion) && `下一步：${item.next || item.conclusion}`].filter(Boolean).join(' ');
        return (
          <li
            key={item.id}
            id={markWeek && inCurrentWeek(item.date) ? undefined : `run-${item.id}`}
            className={[markWeek && inCurrentWeek(item.date) ? 'is-week' : '', focused === item.id ? 'is-focus' : ''].filter(Boolean).join(' ') || undefined}
          >
            <time>{item.date ? humanDay(item.date) : '未标日期'}</time>
            <div>
              <strong>{item.change || item.setup || item.title || '未填写改动'}</strong>
              <p className="quiet">对照 {filled(item.control)} · 指标 {filled(item.metric)} · 相对基线 {filled(item.delta)}</p>
              {note && <p className="quiet">{note}</p>}
            </div>
            {item.evidence && item.meetingId ? (
              <button type="button" className="text-btn" title={item.evidence} onClick={() => openRecord('meetings', item.meetingId || '')}>
                原话
              </button>
            ) : (
              <span />
            )}
          </li>
        );
      })}
    </ul>
  );
}
