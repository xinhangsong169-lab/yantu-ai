import { useEffect, useRef, useState } from 'react';
import { ChatPanel } from '../components/ChatPanel';
import { Field } from '../components/Dialogs';
import * as api from '../api';
import type { CareerJob, CareerAnalysis, CareerFilters } from '../api';
import { fitAnnouncement, type FitRow } from '../lib/match';
import { filtersFromProfile } from '../lib/career-keywords.mjs';
import { humanDay, todayISO } from '../lib/dates';
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
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [notice, setNotice] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState<CareerAnalysis | null>(null);
  const [rows, setRows] = useState<FitRow[]>([]);
  const [busy, setBusy] = useState(false);
  const profileKey = [state?.profile.major, state?.profile.direction, state?.profile.locations, state?.profile.skills, state?.profile.degree].join('|');
  const suggested = filtersFromProfile(state?.profile || {});
  const [filters, setFilters] = useState<CareerFilters>(suggested);
  const filtersRef = useRef(filters);
  const seenProfile = useRef(profileKey);
  filtersRef.current = filters;
  const requestId = useRef(0);

  const search = async (nextTrack = track, nextFilters = filtersRef.current) => {
    const id = ++requestId.current;
    setSearching(true);
    setSearchError('');
    setJobs([]);
    try {
      const result = await api.searchJobs(nextTrack, nextFilters);
      if (id !== requestId.current) return;
      setJobs(result.jobs);
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
    const profileChanged = seenProfile.current !== profileKey;
    seenProfile.current = profileKey;
    const next = profileChanged ? filtersFromProfile(state.profile) : filtersRef.current;
    if (profileChanged) setFilters(next);
    void search(track, next);
    // 档案变化时回到档案里的筛选；切换实习、校招、国企时沿用当前筛选。
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

  const saveJob = async (job: CareerJob) => {
    try {
      await save('opportunities', {
        title: job.title,
        company: job.company,
        type: track === 'state' ? 'state' : track === 'public' ? 'public' : 'intern',
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

  const today = todayISO();
  const saved = state.opportunities.filter((item) => {
    if (item.status === 'closed' || (item.deadline && item.deadline < today)) return false;
    if (track === 'state') return item.type === 'state';
    if (track === 'public') return item.type === 'public';
    return item.type !== 'state' && item.type !== 'public';
  });

  return (
    <div className="sheet career">
      <div className="sheet-main">
        <header className="page-head">
          <div>
            <h1>就业</h1>
            <p>{track === 'state' ? '只看还在有效期内的官网通知。' : '探索来自 Offer岛的实习与校招岗位。'}</p>
          </div>
          <button type="submit" form="career-filters" className="btn" disabled={searching}>
            {searching ? '正在筛选' : '按筛选查看'}
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
        <form
          id="career-filters"
          className="filter-bar"
          onSubmit={(event) => {
            event.preventDefault();
            void search(track, filters);
          }}
        >
          <div className="filter-grid">
            <Field label="城市">
              <input value={filters.city} onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))} placeholder="不限城市" />
            </Field>
            <Field label="专业">
              <input value={filters.major} onChange={(event) => setFilters((current) => ({ ...current, major: event.target.value }))} placeholder="不限专业" />
            </Field>
            <Field label="研究方向">
              <input value={filters.direction} onChange={(event) => setFilters((current) => ({ ...current, direction: event.target.value }))} placeholder="不限方向" />
            </Field>
            <Field label="学历">
              <select value={filters.degree} onChange={(event) => setFilters((current) => ({ ...current, degree: event.target.value }))}>
                <option value="">不限</option>
                <option value="本科">本科</option>
                <option value="硕士">硕士</option>
                <option value="博士">博士</option>
              </select>
            </Field>
            <Field label="技能">
              <input value={filters.skills} onChange={(event) => setFilters((current) => ({ ...current, skills: event.target.value }))} placeholder="不限技能" />
            </Field>
          </div>
          <p className="quiet">
            {track === 'state' ? '只检索官网通知。' : '城市和研究方向关键词用于检索；技能用于匹配提示，专业和学历暂不参与筛选。'}
          </p>
          <div className="row-actions">
            <button
              type="button"
              className="btn secondary"
              disabled={searching || JSON.stringify(filters) === JSON.stringify(suggested)}
              onClick={() => {
                setFilters(suggested);
                void search(track, suggested);
              }}
            >
              用档案里的筛选
            </button>
          </div>
        </form>
        {notice && <p className="quiet">{notice}</p>}
        {searching && <p className="quiet">{track === 'state' ? '正在读取官网通知。' : '正在查询 Offer岛。'}</p>}
        {searchError && (
          <div className="empty">
            <h2>{track === 'state' ? '这次没有取出官网通知' : '这次没有取出岗位'}</h2>
            <p>{searchError}</p>
            <button type="button" className="btn" onClick={() => void search()}>
              再检索一次
            </button>
          </div>
        )}
        {!searching && !searchError && jobs.length === 0 && <p className="quiet">没有可展示的结果。请调整筛选或稍后再试。</p>}
        {!searching && jobs.length > 0 && (
          <section className="stack">
            {jobs.map((job) => (
              <article key={job.url} className="slip job-card">
                <h3>{job.title}</h3>
                <p className="quiet">
                  {job.kind === 'search'
                    ? job.snippet
                    : [job.company, job.location, job.degree, job.salary, job.kind === 'notice' ? job.snippet : ''].filter(Boolean).join(' · ')
                      || (job.linked ? '具体岗位链接，页面没打开，职位和公司空着' : job.indexed ? '收录标题，薪资没有从岗位页读到' : job.kind === 'notice' ? '官网通知' : 'Offer岛岗位')}
                </p>
                {job.source && <p className="quiet">来源：{job.source}{job.publishedAt ? ` · 发布于 ${job.publishedAt}` : ''}</p>}
                {job.kind !== 'search' && job.reasons.length > 0 && <p className="quiet">{job.reasons[0]}</p>}
                <div className="row-actions">
                  <a href={job.url} target="_blank" rel="noreferrer">
                    {job.kind === 'search' ? '打开检索' : job.kind === 'notice' ? '打开官网通知' : '打开岗位'}
                  </a>
                  {job.kind === 'search' || job.linked ? null : (
                    <button type="button" className="btn secondary" onClick={() => void saveJob(job)}>
                      收进进度
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
        <section>
          <h2>已收藏</h2>
          {saved.length === 0 && <p className="quiet">还没有收藏。</p>}
          {saved.map((item) => (
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
                      <span>{row.status === 'recorded' ? '档案里有' : row.status === 'missing' ? '档案里没有' : '待补充'}</span>
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
