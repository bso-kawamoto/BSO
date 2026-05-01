import Link from "next/link";
import type { ReactNode } from "react";
import { getCalendarEvents, getProjects, getTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [events, projects, tasks] = await Promise.all([getCalendarEvents(), getProjects(true), getTasks()]);
  const todayKey = formatDateKey(new Date());
  const todayEvents = events.filter((event) => isDateWithin(todayKey, event.event_date, event.end_date ?? event.event_date));
  const overdueTasks = tasks.filter((task) => task.status !== "完了" && getDiffDays(task.due_date) < 0);
  const todayTasks = tasks.filter((task) => task.status !== "完了" && getDiffDays(task.due_date) === 0);
  const soonTasks = tasks.filter((task) => {
    const diff = getDiffDays(task.due_date);
    return task.status !== "完了" && diff > 0 && diff <= 3;
  });
  const projectById = new Map(projects.map((project) => [project.id, project.name]));

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand" aria-label="BSO Operation">
            <div className="brandMark">BSO</div>
            <span>今日やること</span>
          </div>
          <nav className="nav" aria-label="Today navigation">
            <Link className="navItem" href="/">
              ボード
            </Link>
            <Link className="navItem" href="/employees">
              社員別
            </Link>
          </nav>
        </header>

        <section className="detailHero">
          <div>
            <h1>{todayKey}</h1>
            <p>今日の予定、期限切れ、3日以内のタスクをまとめて確認します。</p>
          </div>
        </section>

        <section className="todayGrid">
          <TodayColumn title="今日の予定">
            {todayEvents.map((event) => (
              <article className="upcomingItem" key={event.id}>
                <div>
                  <span className="levelMark">{event.is_all_day ? "終日" : event.start_time?.slice(0, 5) ?? "予定"}</span>
                  <h3>{event.title}</h3>
                  <p>{projectById.get(event.project_id ?? "") ?? event.location ?? event.owner}</p>
                </div>
              </article>
            ))}
            {todayEvents.length === 0 ? <div className="empty">今日の予定なし</div> : null}
          </TodayColumn>

          <TodayColumn title="期限切れ">
            {overdueTasks.map((task) => <TaskRow key={task.id} projectName={projectById.get(task.project_id ?? "")} task={task} />)}
            {overdueTasks.length === 0 ? <div className="empty">期限切れなし</div> : null}
          </TodayColumn>

          <TodayColumn title="今日が期日">
            {todayTasks.map((task) => <TaskRow key={task.id} projectName={projectById.get(task.project_id ?? "")} task={task} />)}
            {todayTasks.length === 0 ? <div className="empty">今日期日のタスクなし</div> : null}
          </TodayColumn>

          <TodayColumn title="3日以内">
            {soonTasks.map((task) => <TaskRow key={task.id} projectName={projectById.get(task.project_id ?? "")} task={task} />)}
            {soonTasks.length === 0 ? <div className="empty">近日期限なし</div> : null}
          </TodayColumn>
        </section>
      </div>
    </main>
  );
}

function TodayColumn({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="upcomingList">{children}</div>
    </section>
  );
}

function TaskRow({
  projectName,
  task
}: {
  projectName?: string;
  task: { due_date: string | null; owner: string; project_id: string | null; title: string };
}) {
  return (
    <article className="warningItem">
      <strong>{task.title}</strong>
      <span>
        {projectName ?? "案件なし"} / {task.owner} / {task.due_date ?? "期限なし"}
      </span>
    </article>
  );
}

function getDiffDays(dueDate: string | null) {
  if (!dueDate) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dueDate}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function isDateWithin(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
