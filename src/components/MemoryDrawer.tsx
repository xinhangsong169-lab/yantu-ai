import { useEffect, useState } from 'react';
import { Icon } from '../icons';
import { useWorkspace } from '../store';
import type { MemoryFact } from '../types';
import { Field } from './Dialogs';

const DOMAINS = [
  { id: 'global', label: '通用' },
  { id: 'courses', label: '课程' },
  { id: 'meetings', label: '组会' },
  { id: 'research', label: '科研' },
  { id: 'career', label: '就业' }
];

export function MemoryDrawer() {
  const { memoryOpen, setMemoryOpen, state, save, remove, notify, retrievals, setProfileOpen } = useWorkspace();
  const [draft, setDraft] = useState({ key: '', value: '', domain: 'research' });
  const [editing, setEditing] = useState<MemoryFact | null>(null);

  useEffect(() => {
    if (!memoryOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMemoryOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [memoryOpen, setMemoryOpen]);

  if (!memoryOpen || !state) return null;

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await save('memories', {
        key: draft.key,
        value: draft.value,
        domain: draft.domain,
        sourceType: 'manual',
        sourceLabel: '你手动添加',
        confirmed: true,
        active: true
      });
      setDraft({ key: '', value: '', domain: draft.domain });
      notify('这条记忆已确认，相关窗口可以读到');
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '记忆没有保存');
    }
  };

  const patch = async (fact: MemoryFact, body: Record<string, unknown>) => {
    try {
      await save('memories', body, fact.id);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '记忆没有更新');
    }
  };

  return (
    <div className="drawer-root">
      <button className="drawer-backdrop" aria-label="关闭记忆" onClick={() => setMemoryOpen(false)} />
      <aside className="drawer" role="dialog" aria-labelledby="memory-title">
        <div className="dialog-head">
          <h2 id="memory-title">个人记忆</h2>
          <button type="button" className="icon-btn" aria-label="关闭" onClick={() => setMemoryOpen(false)}>
            <Icon name="close" />
          </button>
        </div>
        <div className="drawer-body">
          <p className="quiet">四个助手共用这些记忆，但每个窗口只取和自己有关的部分。未确认或已停用的内容不会进入回答。</p>
          <section className="memory-block">
            <h3>实时档案</h3>
            <p>
              {state.profile.name || '同学'} · {state.profile.degree} · {state.profile.major}
            </p>
            <p>方向：{state.profile.direction || '还没写'}</p>
            <p>技能：{state.profile.skills || '还没写'}</p>
            <button type="button" className="text-btn" onClick={() => setProfileOpen(true)}>
              编辑档案
            </button>
          </section>
          <section className="memory-block">
            <h3>各窗口最近读到</h3>
            {Object.keys(retrievals).length === 0 && <p className="quiet">还没有提问。发一条消息后，这里会列出那次真正用到的记录。</p>}
            {Object.entries(retrievals).map(([scope, items]) => (
              <div key={scope}>
                <p>{scopeLabel(scope)}</p>
                <ul className="plain">
                  {items.slice(0, 4).map((item) => (
                    <li key={item.id}>
                      {item.title}
                      <span className="quiet"> · {item.source}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
          <form className="stack" onSubmit={add}>
            <h3>添加一条记忆</h3>
            <Field label="名称">
              <input value={draft.key} onChange={(event) => setDraft({ ...draft, key: event.target.value })} required />
            </Field>
            <Field label="内容">
              <textarea value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} required />
            </Field>
            <Field label="给哪个方向用">
              <select value={draft.domain} onChange={(event) => setDraft({ ...draft, domain: event.target.value })}>
                {DOMAINS.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.label}
                  </option>
                ))}
              </select>
            </Field>
            <button className="btn" type="submit">
              确认并保存
            </button>
          </form>
          {DOMAINS.map((domain) => {
            const facts = state.memories.filter((fact) => fact.domain === domain.id);
            if (!facts.length) return null;
            return (
              <section key={domain.id} className="memory-block">
                <h3>{domain.label}</h3>
                {facts.map((fact) => (
                  <article key={fact.id} className="fact">
                    {editing?.id === fact.id ? (
                      <form
                        className="stack"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          await patch(fact, { key: editing.key, value: editing.value, domain: editing.domain });
                          setEditing(null);
                          notify('记忆已修改');
                        }}
                      >
                        <input value={editing.key} onChange={(event) => setEditing({ ...editing, key: event.target.value })} />
                        <textarea value={editing.value} onChange={(event) => setEditing({ ...editing, value: event.target.value })} />
                        <div className="row-actions">
                          <button className="btn" type="submit">
                            保存修改
                          </button>
                          <button className="btn secondary" type="button" onClick={() => setEditing(null)}>
                            取消
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <h4>{fact.key}</h4>
                        <p>{fact.value}</p>
                        <p className="quiet">{fact.sourceLabel || '来源未记录'}</p>
                        <p className="quiet">{fact.confirmed ? '已确认' : '未确认，助手不会当作事实'} · {fact.active === false ? '已停用' : '使用中'}</p>
                        <div className="row-actions">
                          <button type="button" className="text-btn" onClick={() => setEditing(fact)}>
                            修改
                          </button>
                          <button type="button" className="text-btn" onClick={() => patch(fact, { confirmed: !fact.confirmed })}>
                            {fact.confirmed ? '取消确认' : '确认'}
                          </button>
                          <button type="button" className="text-btn" onClick={() => patch(fact, { active: fact.active === false })}>
                            {fact.active === false ? '重新启用' : '停用'}
                          </button>
                          <button
                            type="button"
                            className="text-btn danger"
                            onClick={async () => {
                              if (!window.confirm('删除后，之后的回答不会再使用这条记忆。')) return;
                              await remove('memories', fact.id);
                              notify('记忆已删除');
                            }}
                          >
                            删除
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function scopeLabel(scope: string) {
  return (
    {
      workbench: '工作台',
      courses: '课程',
      meetings: '组会',
      research: '科研',
      career: '就业'
    } as Record<string, string>
  )[scope] || scope;
}
