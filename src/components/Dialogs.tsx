import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';
import { useWorkspace } from '../store';
import type { Profile } from '../types';

export function Dialog({
  open,
  title,
  onClose,
  children,
  wide
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className={wide ? 'dialog wide' : 'dialog'} onClose={onClose}>
      <div className="dialog-head">
        <h2>{title}</h2>
        <button type="button" className="icon-btn" aria-label="关闭" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

const PROFILE_FIELDS: { key: keyof Profile; label: string }[] = [
  { key: 'name', label: '怎么称呼你' },
  { key: 'school', label: '学校' },
  { key: 'degree', label: '学历' },
  { key: 'major', label: '专业' },
  { key: 'year', label: '年级' },
  { key: 'graduation', label: '毕业年份' },
  { key: 'direction', label: '研究方向' },
  { key: 'skills', label: '已掌握的技能' },
  { key: 'careerGoal', label: '职业目标' },
  { key: 'locations', label: '想去的城市' },
  { key: 'weeklyGoal', label: '本周要推进的事' }
];

export function ProfileDialog() {
  const { profileOpen, setProfileOpen, state, save, notify } = useWorkspace();
  const [draft, setDraft] = useState<Profile>({ id: 'profile' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profileOpen && state) setDraft({ ...state.profile });
  }, [profileOpen, state]);

  if (!state) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const body = Object.fromEntries(PROFILE_FIELDS.map(({ key }) => [key, draft[key] || '']));
      await save('profile', body, 'profile');
      notify('档案已更新，各窗口下次对话会读到新内容');
      setProfileOpen(false);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '档案没有保存');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={profileOpen} title="个人学术档案" onClose={() => setProfileOpen(false)}>
      <p className="quiet">课程、组会、科研和就业读的是同一份档案。这里改完，下次提问就会用新内容。</p>
      <form className="stack" onSubmit={submit}>
        {PROFILE_FIELDS.map(({ key, label }) => (
          <Field key={key} label={label}>
            <input
              value={draft[key] || ''}
              onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
            />
          </Field>
        ))}
        <div className="row-actions">
          <button className="btn" type="submit" disabled={saving}>
            {saving ? '正在保存' : '保存档案'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
