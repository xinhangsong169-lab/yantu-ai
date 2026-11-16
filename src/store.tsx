import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import * as api from './api';
import type { AppState, ChatMessage, ContextItem, PageId } from './types';

type Composer = { scope: string; text: string; nonce: number };

type WorkspaceValue = {
  page: PageId;
  setPage: (page: PageId) => void;
  state: AppState | null;
  loading: boolean;
  error: string;
  toast: string;
  refresh: () => Promise<void>;
  save: (collection: string, body: Record<string, unknown>, id?: string) => Promise<void>;
  remove: (collection: string, id: string) => Promise<void>;
  reset: (mode: 'demo' | 'empty') => Promise<void>;
  notify: (message: string) => void;
  memoryOpen: boolean;
  setMemoryOpen: (open: boolean) => void;
  profileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
  threads: Record<string, ChatMessage[]>;
  sending: string | null;
  sendChat: (scope: string, message: string, contextEnabled: boolean, cite?: ChatMessage['cite']) => Promise<void>;
  retrievals: Record<string, ContextItem[]>;
  composer: Composer | null;
  ask: (scope: PageId, text: string) => void;
  pinned: { page: PageId; id: string; focus?: string } | null;
  openRecord: (page: PageId, id: string, focus?: string) => void;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageId>('workbench');
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({});
  const [retrievals, setRetrievals] = useState<Record<string, ContextItem[]>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [composer, setComposer] = useState<Composer | null>(null);
  const [pinned, setPinned] = useState<{ page: PageId; id: string; focus?: string } | null>(null);
  const conversationIds = useRef<Record<string, string>>({});

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3600);
  };

  const refresh = async () => {
    const next = await api.getState();
    setState(next);
    setError('');
  };

  useEffect(() => {
    refresh()
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '工作台没有打开'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (collection: string, body: Record<string, unknown>, id?: string) => {
    if (id) await api.patchRecord(collection, id, body);
    else await api.createRecord(collection, body);
    await refresh();
  };

  const remove = async (collection: string, id: string) => {
    await api.deleteRecord(collection, id);
    await refresh();
  };

  const reset = async (mode: 'demo' | 'empty') => {
    const next = await api.resetWorkspace(mode);
    setState(next);
    setThreads({});
    setRetrievals({});
    conversationIds.current = {};
    notify(mode === 'demo' ? '已恢复演示档案' : '已清空为空白档案');
  };

  const sendChat = async (scope: string, message: string, contextEnabled: boolean, cite?: ChatMessage['cite']) => {
    const text = message.trim();
    if ((!text && !cite) || sending) return;
    const shown = cite ? '这段能支持什么？' : text;
    const payload = cite
      ? `只根据下面这段原文回答它能支持什么、不能支持什么。原文没有写到的不要补。\n文献：${cite.title}\n原文：「${cite.quote}」`
      : text;
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    setSending(scope);
    setThreads((current) => ({
      ...current,
      [scope]: [
        ...(current[scope] || []),
        { id: userId, role: 'user', content: shown, cite },
        { id: assistantId, role: 'assistant', content: '', pending: true, phase: 'profile', cite }
      ]
    }));
    try {
      const result = await api.streamChat(
        {
          scope,
          message: payload,
          conversationId: conversationIds.current[scope],
          contextEnabled
        },
        {
          onContext: (items) => {
            setRetrievals((current) => ({ ...current, [scope]: items }));
            setThreads((current) => ({
              ...current,
              [scope]: (current[scope] || []).map((item) =>
                item.id === assistantId
                  ? { ...item, context: items, sawMemory: true, phase: item.phase === 'writing' ? 'writing' : 'model' }
                  : item
              )
            }));
          },
          onSchedule: (rows) => {
            setThreads((current) => ({
              ...current,
              [scope]: (current[scope] || []).map((item) =>
                item.id === assistantId
                  ? { ...item, schedule: rows, sawMaterials: true, phase: item.phase === 'writing' ? 'writing' : 'model' }
                  : item
              )
            }));
          },
          onTool: (tool) => {
            setThreads((current) => ({
              ...current,
              [scope]: (current[scope] || []).map((item) =>
                item.id === assistantId
                  ? { ...item, tool, sawMaterials: true, phase: item.phase === 'writing' ? 'writing' : 'model' }
                  : item
              )
            }));
          },
          onDelta: (delta) => {
            setThreads((current) => ({
              ...current,
              [scope]: (current[scope] || []).map((item) =>
                item.id === assistantId ? { ...item, phase: 'writing', content: item.content + delta } : item
              )
            }));
          }
        }
      );
      conversationIds.current[scope] = result.conversationId;
      setThreads((current) => ({
        ...current,
        [scope]: (current[scope] || []).map((item) =>
          item.id === assistantId ? { ...item, pending: false, phase: 'done', mode: result.mode } : item
        )
      }));
    } catch (reason) {
      const messageText = reason instanceof Error ? reason.message : '助手没有完成回答';
      setThreads((current) => ({
        ...current,
        [scope]: (current[scope] || []).map((item) =>
          item.id === assistantId ? { ...item, pending: false, phase: 'done', content: item.content || messageText } : item
        )
      }));
      notify(messageText);
    } finally {
      setSending(null);
    }
  };

  const ask = (scope: PageId, text: string) => {
    setPage(scope);
    setComposer({ scope, text, nonce: Date.now() });
  };

  const openRecord = (next: PageId, id: string, focus?: string) => {
    setPinned({ page: next, id, focus });
    setPage(next);
  };

  const value: WorkspaceValue = {
    page,
    setPage,
    state,
    loading,
    error,
    toast,
    refresh,
    save,
    remove,
    reset,
    notify,
    memoryOpen,
    setMemoryOpen,
    profileOpen,
    setProfileOpen,
    threads,
    sending,
    sendChat,
    retrievals,
    composer,
    ask,
    pinned,
    openRecord
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('工作台尚未就绪');
  return value;
}
