import type { AgendaDay, AppState, ContextItem, Course, MeetingDraft, Paper, ToolCard } from './types';

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError((data as { error?: string }).error || '请求没有完成');
  return data as T;
}

export function getState() {
  return request<AppState>('/api/state');
}

export function resetWorkspace(mode: 'demo' | 'empty') {
  return request<AppState>('/api/reset', { method: 'POST', body: JSON.stringify({ mode }) });
}

export function createRecord(collection: string, body: Record<string, unknown>) {
  return request<Record<string, unknown>>(`/api/records/${collection}`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function patchRecord(collection: string, id: string, body: Record<string, unknown>) {
  return request<Record<string, unknown>>(`/api/records/${collection}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}

export function deleteRecord(collection: string, id: string) {
  return request<{ deleted: boolean }>(`/api/records/${collection}/${id}`, { method: 'DELETE' });
}

export function parseTimetable(text: string, filename?: string) {
  return request<{ courses: Course[]; warnings?: string[] }>('/api/courses/parse', {
    method: 'POST',
    body: JSON.stringify({ text, filename })
  });
}

export function parseTimetableImage(image: string, filename: string) {
  return request<{ courses: Course[]; warnings?: string[]; mode: string }>('/api/courses/vision', {
    method: 'POST',
    body: JSON.stringify({ image, filename })
  });
}

export function analyzeMeeting(body: { title: string; date: string; record: string; projectId?: string }) {
  return request<{ draft: MeetingDraft }>('/api/meetings/analyze', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function confirmMeeting(draft: MeetingDraft) {
  return request<{ meeting: { id: string }; tasks: unknown[]; memories: unknown[] }>('/api/meetings/confirm', {
    method: 'POST',
    body: JSON.stringify({ draft })
  });
}

export type ExperimentRun = {
  id: string;
  projectId: string;
  meetingId: string;
  date: string;
  change: string;
  control: string;
  metric: string;
  delta: string;
  flat: string;
  next: string;
};

export type MeetingBrief = {
  title: string;
  date: string;
  decision: string;
  open: string[];
  note: string;
  rows: { title: string; status: string; dueAt: string; evidence: string; deliverable: string }[];
  runs: ExperimentRun[];
};

export function meetingReport(id: string) {
  return request<MeetingBrief>(`/api/meetings/${id}/report`);
}

export type CareerAnalysis = {
  title: string;
  company: string;
  location: string;
  deadline: string;
  requirements: string;
  url: string;
  type: string;
  evidence: { field: string; label: string; quote: string }[];
  unknowns: string[];
  note: string;
};

export type CareerJob = {
  title: string;
  company: string;
  url: string;
  snippet: string;
  salary: string;
  degree: string;
  location: string;
  kind: 'job' | 'list' | 'notice' | 'search';
  score: number;
  reasons: string[];
  gaps: string[];
  fromDetail?: boolean;
  indexed?: boolean;
  linked?: boolean;
  endAt?: string;
  publishedAt?: string;
  source?: string;
};

export type ToolItem = { title: string; meta?: string; href?: string; note?: string };
export type ToolResult = { title: string; text: string; items?: ToolItem[]; runs?: ExperimentRun[] };

export function lookupCourse(query: string) {
  return request<ToolResult>('/api/courses/lookup', { method: 'POST', body: JSON.stringify({ query }) });
}

export function writeMeeting(kind: 'todos' | 'report' | 'weekly') {
  return request<ToolResult>('/api/meetings/write', { method: 'POST', body: JSON.stringify({ kind }) });
}

export function findLiterature() {
  return request<ToolResult>('/api/research/literature', { method: 'POST', body: JSON.stringify({}) });
}

export function importPaper(body: { filename?: string; text?: string; pdf?: string; projectId?: string }) {
  return request<Paper>('/api/papers/import', { method: 'POST', body: JSON.stringify(body) });
}

export type ScheduleAction = {
  op: 'add' | 'move' | 'done';
  taskId?: string;
  title: string;
  dueAt?: string;
  label: string;
};

export function interpretSchedule(message: string) {
  return request<{ actions: ScheduleAction[] }>('/api/schedule/interpret', {
    method: 'POST',
    body: JSON.stringify({ message })
  });
}

export function applySchedule(actions: ScheduleAction[]) {
  return request<{ updated: number }>('/api/schedule/apply', {
    method: 'POST',
    body: JSON.stringify({ actions })
  });
}

export function briefJobs() {
  return request<ToolResult>('/api/career/brief', { method: 'POST', body: JSON.stringify({}) });
}

export type CareerFilters = {
  city: string;
  major: string;
  direction: string;
  degree: string;
  skills: string;
};

export function searchJobs(track: string, filters?: CareerFilters) {
  return request<{ id: string; query: string; source: string; jobs: CareerJob[]; notice?: string }>('/api/career/search', {
    method: 'POST',
    body: JSON.stringify({ track, filters })
  });
}

export function analyzeCareer(body: { text: string; url?: string; type: string }) {
  return request<CareerAnalysis & { analysis: CareerAnalysis }>('/api/career/analyze', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export type PaperNote = {
  title: string;
  excerpts: { label: string; quote: string }[];
  gaps: string[];
  caution: string;
};

export function paperNote(body: { title?: string; text: string }) {
  return request<PaperNote>('/api/papers/note', { method: 'POST', body: JSON.stringify(body) });
}

export async function streamChat(
  body: { scope: string; message: string; conversationId?: string; contextEnabled: boolean },
  handlers: {
    onContext: (items: ContextItem[]) => void;
    onDelta: (text: string) => void;
    onSchedule?: (rows: AgendaDay[]) => void;
    onTool?: (tool: ToolCard) => void;
  }
) {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body)
  });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('text/event-stream') || !response.body) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError((data as { error?: string }).error || '助手没有完成回答');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let donePayload: { conversationId: string; mode: string } | null = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';
    for (const chunk of chunks) {
      const event = chunk.match(/^event: (.+)$/m)?.[1];
      const dataLine = chunk.match(/^data: (.+)$/m)?.[1];
      if (!event || !dataLine) continue;
      const payload = JSON.parse(dataLine) as {
        error?: string;
        text?: string;
        rows?: AgendaDay[];
        title?: string;
        conversationId?: string;
        mode?: string;
      };
      if (event === 'context') handlers.onContext(payload as unknown as ContextItem[]);
      if (event === 'schedule' && payload.rows) handlers.onSchedule?.(payload.rows);
      if (event === 'tool' && payload.title) handlers.onTool?.(payload as ToolCard);
      if (event === 'delta' && payload.text) handlers.onDelta(payload.text);
      if (event === 'error') throw new ApiError(payload.error || '助手没有完成回答');
      if (event === 'done' && payload.conversationId && payload.mode) {
        donePayload = { conversationId: payload.conversationId, mode: payload.mode };
      }
    }
  }
  if (!donePayload) throw new ApiError('回答中断了，请再发一次');
  return donePayload;
}
