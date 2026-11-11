export type PageId = 'workbench' | 'courses' | 'meetings' | 'research' | 'career' | 'tasks';

export type Profile = {
  id: string;
  name?: string;
  school?: string;
  degree?: string;
  major?: string;
  year?: string;
  graduation?: string;
  direction?: string;
  skills?: string;
  careerGoal?: string;
  locations?: string;
  weeklyGoal?: string;
};

export type Course = {
  id: string;
  title: string;
  teacher?: string;
  location?: string;
  weekday: number;
  start: string;
  end: string;
  weeks?: string;
  attendance?: string;
  grading?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  recurrence?: string;
  exdates?: string[];
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  sourceType?: string;
  sourceId?: string;
  projectId?: string;
  dueAt?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'doing' | 'done';
  evidence?: string;
};

export type Requirement = { id?: string; text: string; evidence: string };

export type Meeting = {
  id: string;
  title: string;
  date: string;
  projectId?: string;
  record: string;
  summary?: string;
  requirements?: Requirement[];
  questions?: string[];
  confirmed?: boolean;
};

export type Suggestion = {
  id: string;
  title: string;
  description: string;
  evidence: string;
  dueAt: string;
  priority?: Task['priority'];
};

export type MeetingDraft = {
  id: string;
  title: string;
  date: string;
  projectId?: string;
  record: string;
  summary: string;
  requirements: Requirement[];
  suggestions: Suggestion[];
  questions: string[];
  mode: 'local' | 'cloud';
};

export type Project = {
  id: string;
  title: string;
  description?: string;
  goal?: string;
  stage?: string;
  status?: string;
  tags?: string[];
  nextStep?: string;
  question?: string;
  baseline?: string;
  metric?: string;
  stageQuestion?: string;
};

export type Paper = {
  id: string;
  title: string;
  authors?: string;
  year?: string;
  url?: string;
  projectId?: string;
  note?: string;
  status?: string;
  answers?: string;
  method?: string;
  gap?: string;
  sourceName?: string;
};

export type Experiment = {
  id: string;
  title: string;
  projectId?: string;
  setup?: string;
  result?: string;
  conclusion?: string;
  date?: string;
  change?: string;
  control?: string;
  metric?: string;
  delta?: string;
  flat?: string;
  next?: string;
  evidence?: string;
  meetingId?: string;
};

export type Opportunity = {
  id: string;
  title: string;
  company?: string;
  type?: 'intern' | 'public' | 'state';
  location?: string;
  url?: string;
  deadline?: string;
  status?: 'saved' | 'applied' | 'interview' | 'offer' | 'closed';
  requirements?: string;
  note?: string;
  verified?: boolean;
};

export type MemoryFact = {
  id: string;
  key: string;
  value: string;
  domain: string;
  sourceType?: string;
  sourceId?: string;
  sourceLabel?: string;
  confirmed?: boolean;
  active?: boolean;
};

export type ContextItem = {
  id: string;
  title: string;
  source: string;
  domain: string;
  excerpt?: string;
};

export type AppState = {
  profile: Profile;
  courses: Course[];
  meetings: Meeting[];
  projects: Project[];
  tasks: Task[];
  papers: Paper[];
  experiments: Experiment[];
  opportunities: Opportunity[];
  memories: MemoryFact[];
  demo: boolean;
  ai: { configured: boolean; model: string };
};

export type AgendaItem = { kind: '课' | '任务'; title: string; meta?: string };
export type AgendaDay = { day: string; items: AgendaItem[] };

export type ToolCard = {
  title: string;
  text: string;
  items?: { title: string; meta?: string; note?: string; href?: string }[];
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  context?: ContextItem[];
  pending?: boolean;
  mode?: string;
  schedule?: AgendaDay[];
  tool?: ToolCard;
  phase?: 'profile' | 'model' | 'writing' | 'done';
  sawMemory?: boolean;
  sawMaterials?: boolean;
};
