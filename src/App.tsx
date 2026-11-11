import { MemoryDrawer } from './components/MemoryDrawer';
import { ProfileDialog } from './components/Dialogs';
import { Shell } from './components/Shell';
import { CareerPage } from './pages/CareerPage';
import { CoursesPage } from './pages/CoursesPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { ResearchPage } from './pages/ResearchPage';
import { TasksPage } from './pages/TasksPage';
import { WorkbenchPage } from './pages/WorkbenchPage';
import { useWorkspace, WorkspaceProvider } from './store';

function Frame() {
  const { page, loading, error, refresh, toast } = useWorkspace();
  if (loading) return <p className="boot">正在打开工作台…</p>;
  if (error) {
    return (
      <div className="boot">
        <p>{error}</p>
        <button type="button" className="btn" onClick={() => refresh().catch(() => undefined)}>
          重试
        </button>
      </div>
    );
  }
  return (
    <>
      <Shell>
        <div key={page} className="page-enter">
        {page === 'workbench' && <WorkbenchPage />}
        {page === 'courses' && <CoursesPage />}
        {page === 'meetings' && <MeetingsPage />}
        {page === 'research' && <ResearchPage />}
        {page === 'career' && <CareerPage />}
        {page === 'tasks' && <TasksPage />}
        </div>
      </Shell>
      <MemoryDrawer />
      <ProfileDialog />
      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </>
  );
}

export function App() {
  return (
    <WorkspaceProvider>
      <Frame />
    </WorkspaceProvider>
  );
}
