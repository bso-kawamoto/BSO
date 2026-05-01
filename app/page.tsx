import Link from "next/link";
import { redirect } from "next/navigation";
import { createCalendarEvent, createProject, createTask, logout, updateTaskStatus } from "@/app/actions";
import { getCurrentViewer, type CurrentViewer } from "@/lib/auth";
import { sortEmployeesForDisplay } from "@/lib/employee-order";
import { getCalendarEvents, getEmployees, getProjects, getTasks } from "@/lib/tasks";
import {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  TASK_LEVELS,
  type CalendarEvent,
  type Employee,
  type OperationTask,
  type Project
} from "@/lib/types";

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<{ created?: string; month?: string; sort?: string; updated?: string; project?: string; schedule?: string }>;
}) {
  const params = await searchParams;
  const [calendarEvents, employees, projects, tasks] = await Promise.all([getCalendarEvents(), getEmployees(), getProjects(), getTasks()]);
  const viewer = await getCurrentViewer(employees);

  if (!viewer) {
    redirect("/login?next=/");
  }

  const visibleTasks = filterTasksForViewer(tasks, viewer);
  const visibleCalendarEvents = filterEventsForViewer(calendarEvents, viewer);
  const visibleProjects = filterProjectsForViewer(projects, visibleTasks, visibleCalendarEvents, viewer);
  const middleTasks = visibleTasks.filter((task) => task.task_level === TASK_LEVELS[0]);
  const openTasks = visibleTasks.filter((task) => task.status !== STATUSES[3]);
  const highPriority = visibleTasks.filter((task) => task.priority === PRIORITIES[2]);
  const dueSoon = visibleTasks.filter((task) => task.due_date).slice(0, 4);
  const notice = getNotice(params?.created, params?.updated, params?.project, params?.schedule);
  const sortedProjects = sortProjects(visibleProjects, visibleTasks, params?.sort);
  const employeeOptions = sortEmployeesForDisplay(employees, viewer.employee?.id);

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand" aria-label="BSO Operation">
            <div className="brandMark">BSO</div>
            <span>BSO Operation</span>
          </div>
          <nav className="nav" aria-label="Primary">
            <span className="navItem navItemActive">ボード</span>
            <a className="navItem" href="#projects">
              案件
            </a>
            <Link className="navItem" href="/today">
              今日
            </Link>
            <Link className="navItem" href="/employees">
              社員別
            </Link>
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

        <section className="hero">
          <div className="heroMain">
            <h1>{viewer.isAdmin ? "全体の案件とタスクを確認" : "自分の担当タスクを確認"}</h1>
            <p>
              {viewer.isAdmin
                ? "社長・河本は全員分の案件、タスク、予定を確認できます。"
                : "ログイン中の社員に割り当てられたタスクと予定だけを表示しています。"}
            </p>
            <div className="summaryGrid" aria-label="Task summary">
              <Summary label="案件数" value={visibleProjects.length} />
              <Summary label="未完了" value={openTasks.length} />
              <Summary label="高優先度" value={highPriority.length} />
              <Summary label="期限あり" value={dueSoon.length} />
            </div>
          </div>

          <aside className="panel quickPanel" aria-label="Quick create task and project">
            <h2>クイック登録</h2>
            {notice ? <p className={`notice ${notice.kind}`}>{notice.message}</p> : null}
            {viewer.isAdmin ? (
              <form action={createProject} className="quickForm projectQuickForm">
                <div className="field">
                  <label htmlFor="project-name">案件名</label>
                  <input id="project-name" name="name" maxLength={120} placeholder="例: お伊勢さん杯" required />
                </div>
                <div className="field">
                  <label htmlFor="project-due">案件期日</label>
                  <input id="project-due" name="due_date" type="date" />
                </div>
                <button className="secondaryButton" type="submit">
                  案件を追加
                </button>
              </form>
            ) : null}

            <form action={createCalendarEvent} className="quickForm projectQuickForm">
              <div className="field">
                <label htmlFor="calendar-title">予定名</label>
                <input id="calendar-title" name="calendar_title" maxLength={120} placeholder="例: 打ち合わせ" required />
              </div>
              <div className="formGridTwo">
                <div className="field">
                  <label htmlFor="event-date">開始日</label>
                  <input id="event-date" name="event_date" type="date" required />
                </div>
                <div className="field">
                  <label htmlFor="end-date">終了日</label>
                  <input id="end-date" name="end_date" type="date" required />
                </div>
              </div>
              <label className="checkField" htmlFor="is-all-day">
                <input id="is-all-day" name="is_all_day" type="checkbox" />
                <span>終日</span>
              </label>
              <div className="formGridTwo">
                <div className="field">
                  <label htmlFor="start-time">開始</label>
                  <input id="start-time" name="start_time" type="time" />
                </div>
                <div className="field">
                  <label htmlFor="end-time">終了</label>
                  <input id="end-time" name="end_time" type="time" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="calendar-project">関連案件</label>
                <select id="calendar-project" name="calendar_project_id" defaultValue="">
                  <option value="">なし</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="calendar-owner">担当者</label>
                <EmployeeSelect id="calendar-owner" employees={employeeOptions} name="calendar_assignee_id" defaultValue={viewer.employee?.id ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="location">場所</label>
                <input id="location" name="location" maxLength={120} placeholder="例: 事務所" />
              </div>
              <button className="secondaryButton" type="submit">
                予定を追加
              </button>
            </form>

            <form action={createTask} className="quickForm">
              <div className="field">
                <label htmlFor="title">タスク名</label>
                <input id="title" name="title" maxLength={120} placeholder="例: 協賛リスト作成" required />
              </div>
              <div className="field">
                <label htmlFor="project">案件</label>
                <select id="project" name="project_id" defaultValue={visibleProjects[0]?.id ?? projects[0]?.id ?? ""}>
                  <option value="">案件なし</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="task-level">階層</label>
                <select id="task-level" name="task_level" defaultValue={TASK_LEVELS[0]}>
                  {TASK_LEVELS.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="parent-task">親タスク</label>
                <select id="parent-task" name="parent_task_id" defaultValue="">
                  <option value="">中タスクとして登録</option>
                  {middleTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="category">カテゴリ</label>
                <select id="category" name="category" defaultValue={CATEGORIES[0]}>
                  {CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="status">ステータス</label>
                <select id="status" name="status" defaultValue={STATUSES[0]}>
                  {STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="owner">担当者</label>
                <EmployeeSelect id="owner" employees={employeeOptions} name="assignee_id" defaultValue={viewer.employee?.id ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="due-date">期日</label>
                <input id="due-date" name="due_date" type="date" />
              </div>
              <div className="field">
                <label htmlFor="task-memo">進捗メモ</label>
                <textarea id="task-memo" name="memo" rows={3} maxLength={1000} placeholder="例: 先方へ確認中。次は見積を送る。" />
              </div>
              <button className="button" type="submit">
                タスクを追加
              </button>
            </form>
          </aside>
        </section>

        <section className="section" aria-label="Due date calendar">
          <div className="sectionHeader">
            <div>
              <h2>カレンダー</h2>
              <p className="mutedText">予定名を表示し、案件・タスクの期日は件数で表示します。</p>
            </div>
          </div>
          <BoardCalendar calendarEvents={visibleCalendarEvents} month={params?.month} projects={visibleProjects} tasks={visibleTasks} />
        </section>

        <section className="section" id="projects" aria-label="Project task hierarchy">
          <div className="sectionHeader">
            <div>
              <h2>案件別タスク</h2>
              <p className="mutedText">期日、未完了数、進捗遅れで並び替えできます。</p>
            </div>
            <div className="sortLinks">
              <Link className={params?.sort ? "sortLink" : "sortLink sortLinkActive"} href="/">
                標準
              </Link>
              <Link className={params?.sort === "due" ? "sortLink sortLinkActive" : "sortLink"} href="/?sort=due">
                期日順
              </Link>
              <Link className={params?.sort === "open" ? "sortLink sortLinkActive" : "sortLink"} href="/?sort=open">
                未完了順
              </Link>
              <Link className={params?.sort === "slow" ? "sortLink sortLinkActive" : "sortLink"} href="/?sort=slow">
                遅れ順
              </Link>
            </div>
          </div>
          <div className="projectBoard">
            {sortedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} tasks={visibleTasks.filter((task) => task.project_id === project.id)} />
            ))}
            {visibleTasks.some((task) => !task.project_id) ? <ProjectCard project={null} tasks={visibleTasks.filter((task) => !task.project_id)} /> : null}
            {visibleProjects.length === 0 && visibleTasks.length === 0 ? <div className="empty">表示できる案件・タスクがありません</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function filterTasksForViewer(tasks: OperationTask[], viewer: CurrentViewer) {
  if (viewer.isAdmin) {
    return tasks;
  }

  return tasks.filter((task) => task.assignee_id === viewer.employee?.id);
}

function filterEventsForViewer(events: CalendarEvent[], viewer: CurrentViewer) {
  if (viewer.isAdmin) {
    return events;
  }

  return events.filter((event) => event.assignee_id === viewer.employee?.id);
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

function sortProjects(projects: Project[], tasks: OperationTask[], sort?: string) {
  const decorated = projects.map((project, index) => {
    const projectTasks = tasks.filter((task) => task.project_id === project.id);
    const openCount = projectTasks.filter((task) => task.status !== STATUSES[3]).length;
    const doneCount = projectTasks.length - openCount;
    const progress = projectTasks.length === 0 ? 0 : doneCount / projectTasks.length;

    return { index, openCount, progress, project };
  });

  if (sort === "due") {
    return decorated
      .toSorted((a, b) => (a.project.due_date ?? "9999-12-31").localeCompare(b.project.due_date ?? "9999-12-31"))
      .map((item) => item.project);
  }

  if (sort === "open") {
    return decorated.toSorted((a, b) => b.openCount - a.openCount).map((item) => item.project);
  }

  if (sort === "slow") {
    return decorated.toSorted((a, b) => a.progress - b.progress).map((item) => item.project);
  }

  return decorated.toSorted((a, b) => a.index - b.index).map((item) => item.project);
}

type BoardCalendarEvent = {
  date: string;
  kind: "project" | "task";
};

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

function BoardCalendar({
  calendarEvents,
  month,
  projects,
  tasks
}: {
  calendarEvents: CalendarEvent[];
  month?: string;
  projects: Project[];
  tasks: OperationTask[];
}) {
  const deadlineEvents = [
    ...projects.filter((project) => project.due_date).map((project) => ({ date: project.due_date as string, kind: "project" as const })),
    ...tasks.filter((task) => task.due_date).map((task) => ({ date: task.due_date as string, kind: "task" as const }))
  ];
  const scheduleInstances = expandCalendarEvents(calendarEvents);
  const baseDate = getCalendarBaseDate(month, [
    ...deadlineEvents,
    ...scheduleInstances.map((event) => ({ date: event.date, kind: "task" as const }))
  ]);
  const days = buildMonthDays(baseDate);
  const prevMonth = formatMonthKey(new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1));
  const nextMonth = formatMonthKey(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1));
  const thisMonth = formatMonthKey(new Date());
  const monthLabel = `${baseDate.getFullYear()}年 ${baseDate.getMonth() + 1}月`;

  return (
    <div className="boardCalendar">
      <div className="boardCalendarHeader">
        <div>
          <h3>{monthLabel}</h3>
          <div className="calendarNavLinks">
            <Link className="sortLink" href={`/?month=${prevMonth}`}>前月</Link>
            <Link className="sortLink" href={`/?month=${thisMonth}`}>今月</Link>
            <Link className="sortLink" href={`/?month=${nextMonth}`}>翌月</Link>
            <Link className="sortLink" href={`/calendar?month=${formatMonthKey(baseDate)}`}>全画面</Link>
          </div>
        </div>
        <div className="calendarLegend" aria-label="Calendar legend">
          <span>
            <i className="legendDot projectDot" /> 案件期日
          </span>
          <span>
            <i className="legendDot taskDot" /> タスク期日
          </span>
          <span>
            <i className="legendDot scheduleDot" /> 予定
          </span>
        </div>
      </div>
      <div className="calendarGrid weekdayGrid">
        {weekdays.map((weekday) => (
          <div className="weekday" key={weekday}>
            {weekday}
          </div>
        ))}
      </div>
      <div className="calendarGrid">
        {days.map((day) => {
          const dayDeadlines = deadlineEvents.filter((event) => event.date === day.dateKey);
          const daySchedules = scheduleInstances.filter((event) => event.date === day.dateKey);
          const projectCount = dayDeadlines.filter((event) => event.kind === "project").length;
          const taskCount = dayDeadlines.filter((event) => event.kind === "task").length;
          const totalDeadlines = projectCount + taskCount;

          return (
            <div className={`calendarDay boardCalendarDay ${day.isCurrentMonth ? "" : "calendarDayMuted"}`} key={day.dateKey}>
              <div className="dayNumber">{day.dayNumber}</div>
              {daySchedules.length > 0 ? (
                <div className="scheduleStack">
                  {daySchedules.slice(0, 3).map((event) => (
                    <Link className="scheduleChip" href={`/calendar/${event.id}`} key={`${event.id}-${event.date}`}>
                      <span>{event.is_all_day ? "終日" : event.start_time ? event.start_time.slice(0, 5) : "予定"}</span>
                      <strong>{event.title}</strong>
                    </Link>
                  ))}
                  {daySchedules.length > 3 ? <div className="moreEvents">予定 +{daySchedules.length - 3}</div> : null}
                </div>
              ) : null}
              {totalDeadlines > 0 ? (
                <div className="densityStack" aria-label={`${day.dateKey} 期日 ${totalDeadlines}件`}>
                  <span className="densityTotal">{totalDeadlines}</span>
                  <div className="densityDots">
                    {projectCount > 0 ? <span className="densityDot projectDot">{projectCount}</span> : null}
                    {taskCount > 0 ? <span className="densityDot taskDot">{taskCount}</span> : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function expandCalendarEvents(calendarEvents: CalendarEvent[]) {
  return calendarEvents.flatMap((event) => {
    const start = parseDateKey(event.event_date);
    const end = parseDateKey(event.end_date ?? event.event_date);
    const dates: Array<CalendarEvent & { date: string }> = [];

    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      dates.push({ ...event, date: formatDateKey(cursor) });
    }

    return dates;
  });
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function getCalendarBaseDate(month: string | undefined, events: BoardCalendarEvent[]) {
  const selectedMonth = parseMonthKey(month);
  if (selectedMonth) {
    return selectedMonth;
  }

  const firstEvent = events.toSorted((a, b) => a.date.localeCompare(b.date))[0];
  const now = new Date();
  const source = firstEvent?.date ? new Date(`${firstEvent.date}T00:00:00`) : now;
  return new Date(source.getFullYear(), source.getMonth(), 1);
}

function parseMonthKey(month?: string) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
    return null;
  }

  return new Date(year, monthNumber - 1, 1);
}

function formatMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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

function EmployeeSelect({
  employees,
  id,
  name,
  defaultValue = ""
}: {
  employees: Employee[];
  id: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue}>
      <option value="">未割当</option>
      {employees.map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.name}
        </option>
      ))}
    </select>
  );
}

function getNotice(created?: string, updated?: string, project?: string, schedule?: string) {
  if (schedule === "success") return { kind: "noticeSuccess", message: "予定を登録しました。" };
  if (schedule === "missing-env") return { kind: "noticeError", message: "Supabaseの環境変数を確認してください。" };
  if (schedule === "invalid") return { kind: "noticeError", message: "予定名と予定日を確認してください。" };
  if (schedule === "error") return { kind: "noticeError", message: "予定登録に失敗しました。Supabase設定を確認してください。" };
  if (project === "success") return { kind: "noticeSuccess", message: "案件を登録しました。" };
  if (project === "archived") return { kind: "noticeSuccess", message: "案件をアーカイブしました。通常ボードからは非表示になります。" };
  if (project === "missing-env") return { kind: "noticeError", message: "Supabaseの環境変数を確認してください。" };
  if (project === "invalid") return { kind: "noticeError", message: "案件名を確認してください。" };
  if (project === "error") return { kind: "noticeError", message: "案件登録に失敗しました。Supabase設定を確認してください。" };
  if (created === "success") return { kind: "noticeSuccess", message: "タスクを登録しました。" };
  if (created === "missing-env") return { kind: "noticeError", message: "Supabaseの環境変数を確認してください。" };
  if (created === "invalid") return { kind: "noticeError", message: "タスク名、カテゴリ、ステータスを確認してください。" };
  if (created === "error") return { kind: "noticeError", message: "登録に失敗しました。Supabase設定を確認してください。" };
  if (updated === "success") return { kind: "noticeSuccess", message: "ステータスを更新しました。" };
  if (updated === "missing-env") return { kind: "noticeError", message: "Supabaseの環境変数を確認してください。" };
  if (updated === "invalid") return { kind: "noticeError", message: "更新内容を確認してください。" };
  if (updated === "error") return { kind: "noticeError", message: "更新に失敗しました。Supabase設定を確認してください。" };
  return null;
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary">
      <div className="summaryLabel">{label}</div>
      <div className="summaryValue">{value}</div>
    </div>
  );
}

function TaskCard({ task }: { task: OperationTask }) {
  const priorityClass = task.priority === PRIORITIES[2] ? "priorityHigh" : task.priority === PRIORITIES[1] ? "priorityMedium" : "priorityLow";

  return (
    <article className="task">
      <div className="taskTitle">
        <span className="levelMark">{task.task_level}</span>
        {task.title}
      </div>
      <div className="taskMeta">
        <span className="tag">{task.category}</span>
        <span className={`tag ${priorityClass}`}>優先度 {task.priority}</span>
        <span>{task.owner}</span>
        {task.due_date ? <span>期限 {task.due_date}</span> : null}
      </div>
      {task.memo ? <p className="taskMemo">{task.memo}</p> : null}
      <form action={updateTaskStatus} className="inlineForm">
        <input type="hidden" name="id" value={task.id} />
        <select aria-label={`${task.title}のステータス`} name="status" defaultValue={task.status}>
          {STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <button className="smallButton" type="submit">
          更新
        </button>
      </form>
    </article>
  );
}

function ProjectCard({ project, tasks }: { project: Project | null; tasks: OperationTask[] }) {
  const middleTasks = tasks.filter((task) => task.task_level === TASK_LEVELS[0] || !task.parent_task_id);
  const childTasks = tasks.filter((task) => task.task_level === TASK_LEVELS[1] && task.parent_task_id);
  const completeCount = tasks.filter((task) => task.status === STATUSES[3]).length;

  return (
    <section className="projectCard">
      <header className="projectHeader">
        <div>
          <h3>{project?.name ?? "案件なし"}</h3>
          <p>{project?.due_date ? `案件期日 ${project.due_date}` : "案件期日 未設定"}</p>
        </div>
        <div className="projectHeaderActions">
          <span className="count">
            {completeCount}/{tasks.length}
          </span>
          {project ? (
            <Link className="detailLink" href={`/projects/${project.id}`}>
              詳細
            </Link>
          ) : null}
        </div>
      </header>
      <div className="projectTaskList">
        {middleTasks.length === 0 ? (
          <div className="empty">中タスクなし</div>
        ) : (
          middleTasks.map((task) => {
            const children = childTasks.filter((child) => child.parent_task_id === task.id);

            return (
              <div className="taskGroup" key={task.id}>
                <TaskCard task={task} />
                <div className="childTasks">
                  {children.map((child) => (
                    <TaskCard key={child.id} task={child} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
