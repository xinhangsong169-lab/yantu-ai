import { useEffect, useRef, useState } from 'react';
import { ChatPanel } from '../components/ChatPanel';
import { Field } from '../components/Dialogs';
import * as api from '../api';
import type { BossJob, CareerAnalysis } from '../api';
import { fitAnnouncement, type FitRow } from '../lib/match';
import { humanDay } from '../lib/dates';
import { useWorkspace } from '../store';

const TRACKS = [
  { id: 'intern', label: '实习' },
  { id: 'public', label: '校招' },
  { id: 'state', label: '国企与央企' }
] as const;

const STATUS: Record<string, string> = {
  saved: '先收藏',
  applied: '已投递',
  interview: '面试中',
  offer: '已拿到',
  closed: '停止'
};

export function CareerPage() {
  const { state, save, notify } = useWorkspace();
  const [track, setTrack] = useState<(typeof TRACKS)[number]['id']>('intern');
  const [jobs, setJobs] = useState<BossJob[]>([]);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState<CareerAnalysis | null>(null);
  const [rows, setRows] = useState<FitRow[]>([]);
  const [busy, setBusy] = useState(false);
  const profileKey = [state?.profile.major, state?.profile.direction, state?.profile.locations, state?.profile.skills].join('|');
  const requestId = useRef(0);

  const search = async (nextTrack = track) => {
    const id = ++requestId.current;
    setSearching(true);
    setSearchError('');
    setJobs([]);
    try {
      const result = await api.searchJobs(nextTrack);
      if (id !== requestId.current) return;
      setJobs(result.jobs);
      setQuery(result.query);
      setNotice(result.notice || '');
    } catch (reason) {
      if (id !== requestId.current) return;
      setJobs([]);
      setSearchError(reason instanceof Error ? reason.message : '岗位检索没有完成');
    } finally {
      if (id === requestId.current) setSearching(false);
    }
  };

  useEffect(() => {
    if (!state) return;
    void search(track);
    // 档案或方向一变就重查，避免沿用上一个专业的岗位。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, profileKey]);

  if (!state) return null;

  const analyze = async () => {
    setBusy(true);
    try {
      const result = await api.analyzeCareer({ text, url, type: track === 'state' ? 'state' : 'intern' });
      setAnalysis(result);
      setRows(fitAnnouncement(text, state.profile, state.projects));
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '公告没有解析出来');
    } finally {
      setBusy(false);
    }
  };

  const saveJob = async (job: BossJob) => {
    try {
      await save('opportunities', {
        title: job.title,
        company: job.company,
        type: track === 'state' ? 'state' : 'intern',
        location: job.location,
        url: job.url,
        status: 'saved',
        requirements: [...job.reasons, ...job.gaps].join('\n'),
        note: job.snippet,
        verified: false
      });
      notify('已收进求职进度');
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '没有收藏');
    }
  };

  return (
    <div className="sheet career">
      <div className="sheet-main">
        <header className="page-head">
          <div>
            <h1>就业</h1>
            <p>
              {track === 'state'
                ? '国企与央企只列国家大学生就业服务平台公布的官网招聘通知，不使用 BOSS 直聘。'
                : `按${state.profile.major || '你的专业'}、${state.profile.direction || '研究方向'}和${state.profile.locations || '目标城市'}，直接从 BOSS 直聘找出岗位并排好序。`}
            </p>
          </div>
          <button type="button" className="btn" disabled={searching} onClick={() => void search()}>
            {searching ? '正在检索' : '重新检索'}
          </button>
        </header>
        <div className="tabs" role="tablist" aria-label="岗位类型">
          {TRACKS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={track === item.id}
              className={track === item.id ? 'tab active' : 'tab'}
              onClick={() => setTrack(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {query && <p className="quiet">检索词：{query}</p>}
        {notice && <p>{notice}</p>}
        {searching && <p>{track === 'state' ? '正在读取官网招聘通知。' : '正在读取 BOSS 直聘上和你专业相关的岗位。'}</p>}
        {searchError && (
          <div className="empty">
            <h2>{track === 'state' ? '这次没有取出官网通知' : '这次没有取出岗位'}</h2>
            <p>{searchError}</p>
            <button type="button" className="btn" onClick={() => void search()}>
              再检索一次
            </button>
          </div>
        )}
        {!searching && jobs.length > 0 && (
          <section className="stack">
            {jobs.map((job) => (
              <article key={job.url} className="slip job-card">
                <h3>{job.title}</h3>
                <p className="quiet">
                  {[job.company, job.location, job.degree, job.salary, job.snippet && job.kind === 'notice' ? job.snippet : ''].filter(Boolean).join(' · ') || (job.kind === 'notice' ? '官网通知' : 'BOSS 直聘')}
                  {job.kind === 'list' ? ' · 一组相关岗位' : ''}
                </p>
                {job.reasons.length > 0 && <p>匹配：{job.reasons.join('；')}</p>}
                {job.gaps.length > 0 && <p>要注意：{job.gaps.join('；')}</p>}
                <div className="row-actions">
                  <a href={job.url} target="_blank" rel="noreferrer">
                    {job.kind === 'notice' ? '打开官网通知' : '打开 BOSS 直聘'}
                  </a>
                  <button type="button" className="btn secondary" onClick={() => void saveJob(job)}>
                    收进进度
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
        <section>
          <h2>求职进度</h2>
          {state.opportunities.length === 0 && <p className="quiet">还没有收藏。上面的岗位可以收进来，再改投递状态。</p>}
          {state.opportunities.map((item) => (
            <article key={item.id} className="slip">
              <h3>{item.title}</h3>
              <p className="quiet">{[item.company, item.location, item.deadline && humanDay(item.deadline)].filter(Boolean).join(' · ')}</p>
              <label className="field">
                <span>进度</span>
                <select
                  value={item.status || 'saved'}
                  onChange={(event) => save('opportunities', { status: event.target.value }, item.id).then(() => notify('进度已更新'))}
                >
                  {Object.entries(STATUS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {item.url && (
                <a href={item.url} target="_blank" rel="noreferrer">
                  打开原页面
                </a>
              )}
            </article>
          ))}
        </section>
        <details className="composer-card">
          <summary>已经有一份公告，直接对照</summary>
          <div className="stack">
            <Field label="公告链接，可空">
              <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" />
            </Field>
            <Field label="公告原文">
              <textarea value={text} onChange={(event) => setText(event.target.value)} />
            </Field>
            <button type="button" className="btn" disabled={busy || text.trim().length < 12} onClick={() => void analyze()}>
              {busy ? '正在对照' : '和我的档案对照'}
            </button>
            {analysis && (
              <>
                <h3>{analysis.title || '没有抽出岗位名称'}</h3>
                <ul className="fit">
                  {rows.map((row) => (
                    <li key={row.item} className={row.status}>
                      <strong>{row.item}</strong>
                      <span>{row.status === 'recorded' ? '档案里有' : row.status === 'missing' ? '档案里没有' : '不能确认'}</span>
                      <p>{row.detail}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </details>
      </div>
      <ChatPanel scope="career" />
    </div>
  );
}
