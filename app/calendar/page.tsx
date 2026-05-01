import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions";
import { getCurrentViewer, type CurrentViewer } from "@/lib/auth";
import { getCalendarEvents, getEmployees, getProjects, getTasks } from "@/lib/tasks";
import { STATUSES, type CalendarEvent, type OperationTask, type Project } from "@/lib/types";

export const dynamic = "force-dynamic";

type CalendarItem = {
  id: string;
  date: string;
  title: string;
  kind: "schedule" | "project" | "task";
  href?: string;
  meta: string;
};

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

export default async function CalendarPage({
  searchParams
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const [calendarEvents, employees, projects, tasks] = await Promise.all([getCalendarEvents(), getEmployees(), getProjects(true), getTasks()]);
  const viewer = await getCurrentViewer(employees);

  if (!viewer) {
    redirect("/login?next=/calendar");
  }

  const visibleTasks = viewer.isAdmin ? tasks : tasks.filter((task) => task.assignee_id === viewer.employee?.id);
  const visibleCalendarEvents = viewer.isAdmin ? calendarEvents : calendarEvents.filter((event) => event.assignee_id === viewer.employee?.id);
  const visibleProjects = filterProjectsForViewer(projects, visibleTasks, visibleCalendarEvents, viewer);
  const items = buildCalendarItems(visibleProjects, visibleTasks, visibleCalendarEvents);
  const baseDate = getBaseDate(params?.month, items);
  const days = buildMonthDays(baseDate);
  const monthLabel = `${baseDate.getFullYear()}年 ${baseDate.getMonth() + 1}月`;
  const prevMonth = formatMonthKey(new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1));
  const nextMonth = formatMonthKey(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1));
  const thisMonth = formatMonthKey(new Date());
  const upcomingItems = items.filter((item) => item.date).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12);

  return (
    <main className="page">
      <div className="shell calendarShell">
        <header className="topbar">
          <div className="brand" aria-label="BSO Operation">
            <div className="brandMark">BSO</div>
            <span>カレンダー</span>
          </div>
          <nav className="nav" aria-label="Calendar navigation">
            <Link className="navItem" href={`/?month=${formatMonthKey(baseDate)}`}>
              ボード
            </Link>
            <span className="navItem navItemActive">カレンダー</span>
            {viewer.isAdmin ? (
              <Link className="navItem" href="/admin">
                管理
              </Link>
            ) : null}
            <span className="navItem navItemActive">{viewer.name}</span>
            <form action={logout}>
              <button className="navButton" type="submit">
                ログアウト
              </button>
            </form>
          </nav>
        </header>

        <section className="calendarHero">
          <div>
            <h1>{monthLabel}</h1>
            <p>予定、案件期日、タスク期日を月ごとに確認できます。予定名を押すと詳細、編集、削除ができます。</p>
            <div className="calendarNavLinks">
              <Link className="sortLink" href={`/calendar?month=${prevMonth}`}>
                前月
              </Link>
              <Link className="sortLink" href={`/calendar?month=${thisMonth}`}>
                今月
              </Link>
              <Link className="sortLink" href={`/calendar?month=${nextMonth}`}>
                翌月
              </Link>
            </div>
          </div>
          <div className="calendarStats">
            <Summary label="予定" value={visibleCalendarEvents.length} />
            <Summary label="案件期日" value={visibleProjects.filter((project) => project.due_date).length} />
            <Summary label="タスク期日" value={visibleTasks.filter((task) => task.due_date && task.status !== STATUSES[3]).length} />
          </div>
        </section>

        <section className="calendarLayout">
          <div className="calendarPanel">
            <div className="calendarGrid weekdayGrid">
              {weekdays.map((weekday) => (
                <div className="weekday" key={weekday}>
                  {weekday}
                </div>
              ))}
            </div>
            <div className="calendarGrid">
              {days.map((day) => {
                const dayItems = items.filter((item) => item.date === day.dateKey);

                return (
                  <div className={`calendarDay ${day.isCurrentMonth ? "" : "calendarDayMuted"}`} key={day.dateKey}>
                    <div className="dayNumber">{day.dayNumber}</div>
                    <div className="dayEvents">
                      {dayItems.slice(0, 5).map((item) =>
                        item.href ? (
                          <Link className={`calendarEvent ${item.kind}Event`} href={item.href as `/calendar/${string}` | `/projects/${string}`} key={item.id}>
                            <span>{getKindLabel(item.kind)}</span>
                            <strong>{item.title}</strong>
                          </Link>
                        ) : (
                          <div className={`calendarEvent ${item.kind}Event`} key={item.id}>
                            <span>{getKindLabel(item.kind)}</span>
                            <strong>{item.title}</strong>
                          </div>
                        )
                      )}
                      {dayItems.length > 5 ? <div className="moreEvents">+{dayItems.length - 5}</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="panel upcomingPanel">
            <h2>直近の予定・期日</h2>
            <div className="upcomingList">
              {upcomingItems.length === 0 ? (
                <div className="empty">予定や期日がありません</div>
              ) : (
                upcomingItems.map((item) => (
                  <article className="upcomingItem" key={item.id}>
                    <div>
                      <span className="levelMark">{getKindLabel(item.kind)}</span>
                      <h3>{item.href ? <Link href={item.href as `/calendar/${string}` | `/projects/${string}`}>{item.title}</Link> : item.title}</h3>
                      <p>{item.meta}</p>
                    </div>
                    <time>{item.date}</time>
                  </article>
                ))
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary">
      <div className="summaryLabel">{label}</div>
      <div className="summaryValue">{value}</div>
    </div>
  );
}

function filterProjectsForViewer(projects: Project[], tasks: OperationTask[], events: CalendarEvent[], viewer: CurrentViewer) {
  if (viewer.isAdmin) {
    return projects;
  }

  const projectIds = new Set<string>();
  tasks.forEach((task) => {
    if (task.project_id) projectIds.add(task.project_id);
  });
  events.forEach((event) => {
    if (event.project_id) projectIds.add(event.project_id);
  });

  return projects.filter((project) => projectIds.has(project.id));
}

function buildCalendarItems(projects: Project[], tasks: OperationTask[], events: CalendarEvent[]): CalendarItem[] {
  const projectItems = projects
    .filter((project) => project.due_date)
    .map((project) => ({
      id: `project-${project.id}`,
      date: project.due_date as string,
      title: project.name,
      kind: "project" as const,
      href: `/projects/${project.id}`,
      meta: "案件期日"
    }));

  const projectNameById = new Map(projects.map((project) => [project.id, project.name]));
  const taskItems = tasks
    .filter((task) => task.due_date)
    .map((task) => ({
      id: `task-${task.id}`,
      date: task.due_date as string,
      title: task.title,
      kind: "task" as const,
      meta: `${projectNameById.get(task.project_id ?? "") ?? "案件なし"} / ${task.owner}`
    }));

  const scheduleItems = expandCalendarEvents(events).map((event) => ({
    id: `schedule-${event.id}-${event.date}`,
    date: event.date,
    title: event.title,
    kind: "schedule" as const,
    href: `/calendar/${event.id}`,
    meta: event.is_all_day ? "終日" : [event.start_time?.slice(0, 5), event.end_time?.slice(0, 5)].filter(Boolean).join(" - ") || "予定"
  }));

  return [...scheduleItems, ...projectItems, ...taskItems];
}

function expandCalendarEvents(events: CalendarEvent[]) {
  return events.flatMap((event) => {
    const start = parseDateKey(event.event_date);
    const end = parseDateKey(event.end_date ?? event.event_date);
    const dates: Array<CalendarEvent & { date: string }> = [];

    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      dates.push({ ...event, date: formatDateKey(cursor) });
    }

    return dates;
  });
}

function getBaseDate(month: string | undefined, items: CalendarItem[]) {
  const selectedMonth = parseMonthKey(month);
  if (selectedMonth) return selectedMonth;
  const firstItem = items.toSorted((a, b) => a.date.localeCompare(b.date))[0];
  const now = new Date();
  const source = firstItem?.date ? new Date(`${firstItem.date}T00:00:00`) : now;
  return new Date(source.getFullYear(), source.getMonth(), 1);
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function parseMonthKey(month?: string) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) return null;
  return new Date(year, monthNumber - 1, 1);
}

function buildMonthDays(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(year, month, 1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      dateKey: formatDateKey(date),
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month
    };
  });
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getKindLabel(kind: CalendarItem["kind"]) {
  if (kind === "schedule") return "予定";
  if (kind === "project") return "案件";
  return "タスク";
}
