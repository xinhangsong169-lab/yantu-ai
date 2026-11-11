import { useMemo, useState } from 'react';
import { ChatPanel } from '../components/ChatPanel';
import { Dialog, Field } from '../components/Dialogs';
import * as api from '../api';
import { formatDay, humanDay, minutes, todayISO, weekdayName, weekdayOf } from '../lib/dates';
import { useWorkspace } from '../store';
import type { Course } from '../types';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const EMPTY = { title: '', teacher: '', location: '', weekday: 1, start: '14:00', end: '15:40', weeks: '1-16', attendance: '', grading: '' };

export function CoursesPage() {
  const { state, save, remove, notify } = useWorkspace();
  const [selected, setSelected] = useState<string>('');
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [preview, setPreview] = useState<Course[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const courses = state?.courses || [];
  const today = weekdayOf(todayISO());
  const current = courses.find((course) => course.id === selected) || courses[0];

  const related = useMemo(
    () => (state?.tasks || []).filter((task) => current && task.sourceType === 'course' && task.sourceId === current.id),
    [state?.tasks, current]
  );

  if (!state) return null;

  const openNew = () => {
    setEditingId(null);
    setDraft(EMPTY);
    setFormOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditingId(course.id);
    setDraft({
      title: course.title,
      teacher: course.teacher || '',
      location: course.location || '',
      weekday: course.weekday,
      start: course.start,
      end: course.end,
      weeks: course.weeks || '',
      attendance: course.attendance || '',
      grading: course.grading || ''
    });
    setFormOpen(true);
  };

  const submitCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await save(
        'courses',
        { ...draft, weekday: Number(draft.weekday), source: editingId ? current?.source || '手动修改' : '手动添加' },
        editingId || undefined
      );
      setFormOpen(false);
      notify(editingId ? '课程已更新' : '课程已添加');
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '课程没有保存');
    } finally {
      setBusy(false);
    }
  };

  const readFile = async (file: File) => {
    setBusy(true);
    setWarnings([]);
    try {
      if (file.type.startsWith('image/')) {
        const image = await shrinkImage(file);
        const result = await api.parseTimetableImage(image, file.name);
        setPreview(result.courses);
        setWarnings(result.warnings || []);
      } else {
        const text = await file.text();
        setImportText(text);
        const result = await api.parseTimetable(text, file.name);
        setPreview(result.courses);
        setWarnings(result.warnings || []);
      }
    } catch (reason) {
      setPreview([]);
      notify(reason instanceof Error ? reason.message : '这份课表没有识别出来');
    } finally {
      setBusy(false);
    }
  };

  const parseText = async () => {
    setBusy(true);
    try {
      const result = await api.parseTimetable(importText, '粘贴的课表');
      setPreview(result.courses);
      setWarnings(result.warnings || []);
    } catch (reason) {
      setPreview([]);
      notify(reason instanceof Error ? reason.message : '课表没有识别出来');
    } finally {
      setBusy(false);
    }
  };

  const commitImport = async () => {
    setBusy(true);
    try {
      for (const course of preview) {
        const duplicate = courses.some(
          (item) => item.title === course.title && item.weekday === course.weekday && item.start === course.start
        );
        if (duplicate) continue;
        const { id, ...body } = course;
        void id;
        await save('courses', body);
      }
      setImportOpen(false);
      setPreview([]);
      notify('已写入课表。请再核对教师、周次和考核。');
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '导入中断了');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sheet courses">
      <div className="sheet-main">
        <header className="page-head">
          <div>
            <h1>课程</h1>
            <p>周课表、教师要求和考核比例放在一起。考核内容以你确认过的记录为准。</p>
          </div>
          <div className="row-actions">
            <button type="button" className="btn secondary" onClick={() => setImportOpen(true)}>
              导入课表
            </button>
            <button type="button" className="btn" onClick={openNew}>
              添加课程
            </button>
          </div>
        </header>
        {courses.length === 0 ? (
          <div className="empty">
            <h2>还没有课程</h2>
            <p>可以手动添加，或导入 ICS、CSV。图片课表需要已配置的视觉模型，识别结果要你确认后才会写入。</p>
          </div>
        ) : (
          <>
            <div className="week-scroll">
              <div className="week">
                <div />
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <div key={day} className={day === today ? 'day-label today' : 'day-label'}>
                    {weekdayName(day)}
                  </div>
                ))}
                <div className="hour-col">
                  {HOURS.map((hour) => (
                    <div key={hour}>{String(hour).padStart(2, '0')}:00</div>
                  ))}
                </div>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <div key={day} className={day === today ? 'day-col today' : 'day-col'}>
                    {courses
                      .filter((course) => course.weekday === day)
                      .map((course) => {
                        const top = ((minutes(course.start) - 8 * 60) / 60) * 52;
                        const height = Math.max(42, ((minutes(course.end) - minutes(course.start)) / 60) * 52 - 4);
                        return (
                          <button
                            key={course.id}
                            type="button"
                            className={current?.id === course.id ? 'course-block selected' : 'course-block'}
                            style={{ top, height }}
                            onClick={() => setSelected(course.id)}
                          >
                            <strong>{course.title}</strong>
                            <span>
                              {course.start} {course.location}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
            {current && (
              <article className="detail">
                <header className="page-head">
                  <div>
                    <h2>{current.title}</h2>
                    <p>
                      {weekdayName(current.weekday)} {current.start}–{current.end}
                      {current.location ? ` · ${current.location}` : ''}
                      {current.teacher ? ` · ${current.teacher}` : ''}
                    </p>
                  </div>
                  <div className="row-actions">
                    <button type="button" className="btn secondary" onClick={() => openEdit(current)}>
                      修改
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={async () => {
                        if (!window.confirm('删除这门课？相关任务会留下，但不再关联到它。')) return;
                        await remove('courses', current.id);
                        notify('课程已删除');
                      }}
                    >
                      删除
                    </button>
                  </div>
                </header>
                <dl className="facts">
                  <div>
                    <dt>周次</dt>
                    <dd>{current.weeks || '待补充'}</dd>
                  </div>
                  <div>
                    <dt>考勤</dt>
                    <dd>{current.attendance || '待补充'}</dd>
                  </div>
                  <div>
                    <dt>成绩构成</dt>
                    <dd>{current.grading || '待补充'}</dd>
                  </div>
                  <div>
                    <dt>信息来源</dt>
                    <dd>{current.source || '未记录'}</dd>
                  </div>
                </dl>
                {current.exdates && current.exdates.length > 0 && (
                  <p className="quiet">停课日期：{current.exdates.map((day) => formatDay(day)).join('、')}</p>
                )}
                <h3>这门课的任务</h3>
                {related.length === 0 && <p className="quiet">还没有作业或考试任务。</p>}
                <ul className="plain">
                  {related.map((task) => (
                    <li key={task.id}>
                      {task.title}
                      {task.dueAt ? ` · ${humanDay(task.dueAt)}` : ''}
                    </li>
                  ))}
                </ul>
              </article>
            )}
          </>
        )}
      </div>
      <ChatPanel scope="courses" />
      <Dialog open={formOpen} title={editingId ? '修改课程' : '添加课程'} onClose={() => setFormOpen(false)}>
        <form className="stack" onSubmit={submitCourse}>
          <Field label="课程名称">
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
          </Field>
          <div className="split">
            <Field label="教师">
              <input value={draft.teacher} onChange={(event) => setDraft({ ...draft, teacher: event.target.value })} />
            </Field>
            <Field label="教室">
              <input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} />
            </Field>
          </div>
          <div className="split">
            <Field label="星期">
              <select value={draft.weekday} onChange={(event) => setDraft({ ...draft, weekday: Number(event.target.value) })}>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <option key={day} value={day}>
                    {weekdayName(day)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="开始">
              <input type="time" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} required />
            </Field>
            <Field label="结束">
              <input type="time" value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} required />
            </Field>
          </div>
          <Field label="周次">
            <input value={draft.weeks} onChange={(event) => setDraft({ ...draft, weeks: event.target.value })} />
          </Field>
          <Field label="考勤">
            <input value={draft.attendance} onChange={(event) => setDraft({ ...draft, attendance: event.target.value })} placeholder="只填写你确认过的要求" />
          </Field>
          <Field label="成绩构成">
            <input value={draft.grading} onChange={(event) => setDraft({ ...draft, grading: event.target.value })} placeholder="例如平时 30% · 期末 70%" />
          </Field>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? '正在保存' : '保存课程'}
          </button>
        </form>
      </Dialog>
      <Dialog open={importOpen} title="导入课表" onClose={() => setImportOpen(false)} wide>
        <p className="quiet">支持 ICS 和带表头的 CSV。图片只有在配置了视觉模型时才会识别，而且必须你确认后才写入。</p>
        <div className="row-actions">
          <label className="btn secondary file-btn">
            选择文件
            <input
              type="file"
              accept=".ics,.csv,.txt,text/calendar,text/csv,image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readFile(file);
              }}
            />
          </label>
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              const sample = '课程名称,星期,开始时间,结束时间,教室,教师,周次,考勤,成绩构成\n示例课程,三,14:00,15:40,教学楼 A301,张老师,1-16,需要考勤,平时 30% · 期末 70%';
              const blob = new Blob([sample], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = '课表模板.csv';
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            下载 CSV 模板
          </button>
        </div>
        <Field label="或粘贴 ICS / CSV">
          <textarea value={importText} onChange={(event) => setImportText(event.target.value)} />
        </Field>
        <button type="button" className="btn secondary" onClick={() => void parseText()} disabled={busy || !importText.trim()}>
          识别文本
        </button>
        {warnings.length > 0 && (
          <ul className="plain warn-list">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
        {preview.length > 0 && (
          <>
            <h3>确认识别结果</h3>
            <ul className="plain">
              {preview.map((course) => (
                <li key={`${course.title}-${course.weekday}-${course.start}`}>
                  {course.title} · {weekdayName(course.weekday)} {course.start}–{course.end} · {course.location || '地点待补充'}
                </li>
              ))}
            </ul>
            <button type="button" className="btn" onClick={() => void commitImport()} disabled={busy}>
              {busy ? '正在写入' : '确认写入课表'}
            </button>
          </>
        )}
      </Dialog>
    </div>
  );
}

async function shrinkImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法读取这张图片');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.72);
}
