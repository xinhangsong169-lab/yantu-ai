import { useEffect, useState } from 'react';
import { ChatPanel } from '../components/ChatPanel';
import { Waiting } from '../components/Waiting';
import * as api from '../api';
import { Dialog, Field } from '../components/Dialogs';
import { RunChart } from '../components/RunChart';
import { DayChoices } from '../components/DayChoices';
import { humanDay, STATUS_LABEL, todayISO } from '../lib/dates';
import { useWorkspace } from '../store';

export function ResearchPage() {
  const { state, save, remove, refresh, notify, sendChat, sending, pinned, openRecord } = useWorkspace();
  const [projectId, setProjectId] = useState('');
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectDraft, setProjectDraft] = useState({ title: '', description: '', goal: '', baseline: '', metric: '', stage: '文献调研', nextStep: '', tags: '' });
  const [experimentOpen, setExperimentOpen] = useState(false);
  const [experiment, setExperiment] = useState({ title: '', date: todayISO(), change: '', control: '', metric: '', delta: '', flat: '', next: '', evidence: '' });
  const [busy, setBusy] = useState(false);
  const [material, setMaterial] = useState('');
  const [fileName, setFileName] = useState('');
  const [pdf, setPdf] = useState('');
  const [importing, setImporting] = useState(false);
  if (!state) return null;
  const current = state.projects.find((item) => item.id === projectId) || state.projects[0];
  const papers = state.papers.filter((item) => !current || item.projectId === current.id || !item.projectId);
  const experiments = state.experiments.filter((item) => !current || item.projectId === current.id);
  const tasks = state.tasks.filter((item) => current && item.projectId === current.id);
  useEffect(() => {
    if (pinned?.page === 'research' && pinned.id) setProjectId(pinned.id);
  }, [pinned]);

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

  return (
    <div className="sheet research">
      <div className="sheet-main">
        <header className="page-head">
          <div>
            <h1>科研</h1>
            <p>文献由你上传。PDF 或贴上的资料会按原文总结，不联网检索，也不补写原文里没有的内容。</p>
          </div>
          <button type="button" className="btn" onClick={() => setProjectOpen(true)}>
            新课题
          </button>
        </header>
        {state.projects.length === 0 ? (
          <div className="empty">
            <h2>还没有课题</h2>
            <p>先写下题目和这一阶段要得到的结果，再把论文和实验挂上去。</p>
          </div>
        ) : (
          <>
          {current?.id === 'demo-project' && <RunChart />}
          <div className="master">
            <div className="list">
              {state.projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={current?.id === project.id ? 'list-btn active' : 'list-btn'}
                  onClick={() => setProjectId(project.id)}
                >
                  <strong>{project.title}</strong>
                  <span>{project.stage || '阶段未写'}</span>
                </button>
              ))}
            </div>
            {current && (
              <article className="record stack">
                <h2>{current.title}</h2>
                <p>{current.description}</p>
                <dl className="facts">
                  <div>
                    <dt>研究问题</dt>
                    <dd>{current.question || current.description || '—'}</dd>
                  </div>
                  <div>
                    <dt>对照基线</dt>
                    <dd>{current.baseline || '—'}</dd>
                  </div>
                  <div>
                    <dt>指标</dt>
                    <dd>{current.metric || '—'}</dd>
                  </div>
                  <div>
                    <dt>这一阶段要回答</dt>
                    <dd>{current.stageQuestion || current.goal || '—'}</dd>
                  </div>
                </dl>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn"
                    disabled={sending === 'research'}
                    onClick={() =>
                      sendChat(
                        'research',
                        `根据课题「${current.title}」、未完成任务和已确认的组会要求，安排接下来七天。每条都要对应现有记录。没有记录的部分直接说缺什么，不要编造实验结果或论文。`,
                        true
                      )
                    }
                  >
                    按当前进度排七天
                  </button>
                  <button type="button" className="btn secondary" onClick={() => setExperimentOpen(true)}>
                    记一次实验
                  </button>
                </div>
                <h3>课题任务</h3>
                {tasks.length === 0 && <p className="quiet">组会确认后的任务会出现在这里。</p>}
                <ul className="plain">
                  {tasks.map((task) => (
                    <li key={task.id}>
                      {task.title} · {STATUS_LABEL[task.status]}
                      {task.dueAt ? ` · ${humanDay(task.dueAt)}` : ''}
                    </li>
                  ))}
                </ul>
                <h3>文献</h3>
                <form
                  className="stack composer-card"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void importMaterial();
                  }}
                >
                  <Field label="上传 PDF 或文本">
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,application/pdf,text/plain"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        void readMaterial(file);
                        event.target.value = '';
                      }}
                    />
                  </Field>
                  <Field label="或者直接贴资料">
                    <textarea value={material} placeholder="摘要、笔记或论文片段" onChange={(event) => { setPdf(''); setMaterial(event.target.value); }} />
                  </Field>
                  {fileName && <p className="quiet">已选择 {fileName}</p>}
                  {importing && <Waiting text="正在阅读原文并写总结…" />}
                  <button className="btn" type="submit" disabled={importing || (!pdf && material.trim().length < 40)}>
                    {importing ? '正在总结' : '总结并收入课题'}
                  </button>
                </form>
                {papers.length === 0 && <p className="quiet">还没有收入这个课题的文献。</p>}
                {papers.map((item) => (
                  <article key={item.id} className="slip">
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
                    <p>{item.answers || '还没有总结'}</p>
                    {item.method && <p>做法：{item.method}</p>}
                    {item.gap && <p className="quiet">原文没写清：{item.gap}</p>}
                    {item.note && <p className="quiet">摘录：{item.note}</p>}
                    <button type="button" className="text-btn danger" onClick={() => remove('papers', item.id).then(() => notify('文献已删除'))}>
                      删除
                    </button>
                  </article>
                ))}
                <h3>实验</h3>
                {experiments.length === 0 && <p className="quiet">同一指标下的对照才放进表里。没有数字的格子留空。</p>}
                {experiments.length > 0 && (
                  <div className="minutes-wrap">
                    <table className="minutes">
                      <thead>
                        <tr>
                          <th>日期</th>
                          <th>改了什么</th>
                          <th>对照</th>
                          <th>指标</th>
                          <th>相对基线</th>
                          <th>没提升的设置</th>
                          <th>下一步</th>
                        </tr>
                      </thead>
                      <tbody>
                        {experiments.map((item) => (
                          <tr key={item.id}>
                            <td>{item.date ? humanDay(item.date) : '—'}</td>
                            <td>
                              {item.change || item.setup || item.title || '—'}
                              {item.evidence && item.meetingId && (
                                <button type="button" className="text-btn" onClick={() => openRecord('meetings', item.meetingId || '')}>
                                  原话：{item.evidence}
                                </button>
                              )}
                              {item.evidence && !item.meetingId && <span className="quiet">原话：{item.evidence}</span>}
                            </td>
                            <td>{item.control || '—'}</td>
                            <td>{item.metric || '—'}</td>
                            <td>{item.delta || '—'}</td>
                            <td>{item.flat || '—'}</td>
                            <td>{item.next || item.conclusion || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            )}
          </div>
          </>
        )}
      </div>
      <ChatPanel scope="research" />
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
    </div>
  );
}
