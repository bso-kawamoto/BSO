import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions";
import { getCurrentViewer } from "@/lib/auth";
import { compareEmployeesByCompanyOrder } from "@/lib/employee-order";
import { filterEmployeesForViewer } from "@/lib/task-visibility";
import { getCalendarEvents, getEmployees, getProjects, getRegularTasks, getTasks } from "@/lib/tasks";
import { STATUSES, type CalendarEvent, type Employee, type OperationTask, type Project, type RegularTask } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams
}: {
  searchParams?: Promise<{ sort?: string }>;
}) {
  const params = await searchParams;
  const [employees, tasks, events, projects, regularTasks] = await Promise.all([getEmployees(), getTasks(), getCalendarEvents(), getProjects(true), getRegularTasks()]);
  const viewer = await getCurrentViewer(employees);

  if (!viewer) {
    redirect("/login?next=/employees");
  }

  const projectNames = buildProjectNameMap(projects);
  const cards = buildEmployeeCards(filterEmployeesForViewer(employees, viewer), tasks, events, regularTasks);
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
            <Link className="navItem" href="/six-tournament-deadlines">
              6大会期日
            </Link>
            <Link className="navItem" href="/admin/deadlines">
              期日管理
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
            {sortedCards.map(({ completedTasks, employee, openTasks, overdue, regularTasks: employeeRegularTasks, soon, upcomingEvents }) => (
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
                  {employeeRegularTasks.length > 0 ? (
                    <div className="regularTaskBlock">
                      <h3>レギュラー業務</h3>
                      {employeeRegularTasks.map((task) => (
                        <div className="regularTaskMini" key={task.id}>
                          <strong>{task.title}</strong>
                          {task.memo ? <p>{task.memo}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {openTasks.slice(0, 5).map((task) => (
                    <EmployeeTaskRow key={task.id} projectName={getProjectName(projectNames, task.project_id)} task={task} />
                  ))}
                  {openTasks.length > 5 ? (
                    <details className="moreTaskBox">
                      <summary>残り {openTasks.length - 5}件を表示</summary>
                      <div className="completedTaskList">
                        {openTasks.slice(5).map((task) => (
                          <EmployeeTaskRow key={task.id} projectName={getProjectName(projectNames, task.project_id)} task={task} />
                        ))}
                      </div>
                    </details>
                  ) : null}
                  {openTasks.length === 0 ? <div className="empty">担当タスクなし</div> : null}
                </div>
                {completedTasks.length > 0 ? (
                  <details className="completedTaskBox employeeCompletedBox">
                    <summary>完了済みタスク</summary>
                    <div className="completedTaskList">
                      {completedTasks.map((task) => (
                        <EmployeeTaskRow key={task.id} projectName={getProjectName(projectNames, task.project_id)} task={task} />
                      ))}
                    </div>
                  </details>
                ) : null}
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

function EmployeeTaskRow({ projectName, task }: { projectName: string; task: OperationTask }) {
  return (
    <div className="miniRow employeeTaskRow">
      <div className="employeeTaskMain">
        {task.project_id ? (
          <Link href={`/projects/${task.project_id}#task-${task.id}`}>
            <strong>{task.title}</strong>
          </Link>
        ) : (
          <strong>{task.title}</strong>
        )}
        <div className="employeeTaskMeta">
          <span>{projectName}</span>
          <span>{task.status}</span>
          <span>{task.category}</span>
          <span>{task.due_date ?? "期限なし"}</span>
        </div>
        {task.memo ? <p>{task.memo}</p> : null}
      </div>
    </div>
  );
}

function buildProjectNameMap(projects: Project[]) {
  return new Map(projects.map((project) => [project.id, project.name]));
}

function getProjectName(projectNames: Map<string, string>, projectId: string | null) {
  if (!projectId) {
    return "案件なし";
  }

  return projectNames.get(projectId) ?? "案件不明";
}

function buildEmployeeCards(employees: Employee[], tasks: OperationTask[], events: CalendarEvent[], regularTasks: RegularTask[]) {
  return employees.map((employee) => {
    const employeeTasks = tasks.filter((task) => task.assignee_id === employee.id);
    const openTasks = employeeTasks.filter((task) => task.status !== STATUSES[3]);
    const completedTasks = employeeTasks.filter((task) => task.status === STATUSES[3]);
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
      completedTasks: completedTasks.sort(sortTasksByDueDate),
      openTasks: openTasks.sort(sortTasksByDueDate),
      overdue,
      regularTasks: regularTasks.filter((task) => task.assignee_id === employee.id),
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
