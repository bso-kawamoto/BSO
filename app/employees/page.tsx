import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions";
import { getCurrentViewer } from "@/lib/auth";
import { compareEmployeesByCompanyOrder } from "@/lib/employee-order";
import { getCalendarEvents, getEmployees, getTasks } from "@/lib/tasks";
import { STATUSES, type CalendarEvent, type Employee, type OperationTask } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams
}: {
  searchParams?: Promise<{ sort?: string }>;
}) {
  const params = await searchParams;
  const [employees, tasks, events] = await Promise.all([getEmployees(), getTasks(), getCalendarEvents()]);
  const viewer = await getCurrentViewer(employees);

  if (!viewer) {
    redirect("/login?next=/employees");
  }

  const cards = buildEmployeeCards(viewer.isAdmin ? employees : viewer.employee ? [viewer.employee] : [], tasks, events);
  const currentSort = params?.sort ?? "name";
  const sortedCards = sortEmployeeCards(cards, currentSort, viewer.employee?.id);

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand" aria-label="BSO Operation">
            <div className="brandMark">BSO</div>
            <span>社員別ビュー</span>
          </div>
          <nav className="nav" aria-label="Employee navigation">
            <Link className="navItem" href="/">
              ボード
            </Link>
            <Link className="navItem" href="/today">
              今日
            </Link>
            <form action={logout}>
              <button className="navButton" type="submit">
                ログアウト
              </button>
            </form>
          </nav>
        </header>

        <section className="section">
          <div className="sectionHeader">
            <div>
              <h1 className="adminTitle">担当状況</h1>
              <p className="mutedText">
                {viewer.isAdmin
                  ? `${viewer.name}としてログイン中です。全員分を確認できます。`
                  : `${viewer.name}としてログイン中です。本人が持っているタスクと予定だけを表示します。`}
              </p>
            </div>
          </div>

          <div className="employeeToolbar">
            <div className="sortLinks" aria-label="Employee sort">
              <SortLink active={currentSort === "name"} href="/employees?sort=name" label="名前順" />
              <SortLink active={currentSort === "open"} href="/employees?sort=open" label="未完了順" />
              <SortLink active={currentSort === "overdue"} href="/employees?sort=overdue" label="期限切れ順" />
              <SortLink active={currentSort === "soon"} href="/employees?sort=soon" label="近日期限順" />
              <SortLink active={currentSort === "events"} href="/employees?sort=events" label="予定順" />
            </div>
          </div>

          {!viewer.isAdmin ? <p className="notice noticeSuccess">本人分だけを表示しています。</p> : null}

          <div className="employeeGrid">
            {sortedCards.map(({ employee, openTasks, overdue, soon, upcomingEvents }) => (
              <article className="employeeCard" key={employee.id}>
                <header>
                  <h2>{employee.name}</h2>
                  <span>{employee.role}</span>
                </header>
                <div className="employeeStats">
                  <Summary label="未完了" value={openTasks.length} />
                  <Summary label="期限切れ" value={overdue.length} />
                  <Summary label="近日期限" value={soon.length} />
                </div>
                <div className="miniList">
                  {openTasks.slice(0, 4).map((task) => (
                    <div className="miniRow" key={task.id}>
                      <strong>{task.title}</strong>
                      <span>{task.due_date ?? "期限なし"}</span>
                    </div>
                  ))}
                  {openTasks.length === 0 ? <div className="empty">担当タスクなし</div> : null}
                </div>
                <div className="miniList">
                  {upcomingEvents.map((event) => (
                    <div className="miniRow" key={event.id}>
                      <strong>{event.title}</strong>
                      <span>{event.event_date}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {sortedCards.length === 0 ? <div className="empty">表示できる担当者がいません</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary compactSummary">
      <div className="summaryLabel">{label}</div>
      <div className="summaryValue">{value}</div>
    </div>
  );
}

function SortLink({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <a className={`sortLink ${active ? "sortLinkActive" : ""}`} href={href}>
      {label}
    </a>
  );
}

function buildEmployeeCards(employees: Employee[], tasks: OperationTask[], events: CalendarEvent[]) {
  return employees.map((employee) => {
    const employeeTasks = tasks.filter((task) => task.assignee_id === employee.id);
    const openTasks = employeeTasks.filter((task) => task.status !== STATUSES[3]);
    const overdue = openTasks.filter((task) => getDueBucket(task.due_date) === "overdue");
    const soon = openTasks.filter((task) => {
      const bucket = getDueBucket(task.due_date);
      return bucket === "today" || bucket === "soon";
    });
    const upcomingEvents = events
      .filter((event) => event.assignee_id === employee.id)
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .slice(0, 3);

    return {
      employee,
      openTasks: openTasks.sort(sortTasksByDueDate),
      overdue,
      soon,
      upcomingEvents
    };
  });
}

function sortEmployeeCards(cards: ReturnType<typeof buildEmployeeCards>, sort = "name", currentEmployeeId?: string | null) {
  return [...cards].sort((a, b) => {
    if (currentEmployeeId) {
      if (a.employee.id === currentEmployeeId) return -1;
      if (b.employee.id === currentEmployeeId) return 1;
    }

    if (sort === "open") {
      return b.openTasks.length - a.openTasks.length || compareEmployeesByCompanyOrder(a.employee, b.employee);
    }

    if (sort === "overdue") {
      return b.overdue.length - a.overdue.length || compareEmployeesByCompanyOrder(a.employee, b.employee);
    }

    if (sort === "soon") {
      return b.soon.length - a.soon.length || compareEmployeesByCompanyOrder(a.employee, b.employee);
    }

    if (sort === "events") {
      return b.upcomingEvents.length - a.upcomingEvents.length || compareEmployeesByCompanyOrder(a.employee, b.employee);
    }

    return compareEmployeesByCompanyOrder(a.employee, b.employee);
  });
}

function sortTasksByDueDate(a: OperationTask, b: OperationTask) {
  if (!a.due_date && !b.due_date) return a.created_at.localeCompare(b.created_at);
  if (!a.due_date) return 1;
  if (!b.due_date) return -1;
  return a.due_date.localeCompare(b.due_date);
}

function getDueBucket(dueDate: string | null) {
  if (!dueDate) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dueDate}T00:00:00`);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000);

  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 3) return "soon";
  return null;
}
