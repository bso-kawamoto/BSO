import Link from "next/link";
import { notFound } from "next/navigation";
import {
  archiveProject,
  createProjectCalendarEvent,
  createProjectTask,
  deleteProjectCalendarEvent,
  deleteProjectTask,
  restoreProject,
  updateProjectCalendarEvent,
  updateProjectDetails,
  updateProjectTask
} from "@/app/actions";
import { getCurrentViewer } from "@/lib/auth";
import { sortEmployeesForDisplay } from "@/lib/employee-order";
import { getCalendarEvents, getEmployees, getProjects, getTasks } from "@/lib/tasks";
import { CATEGORIES, PRIORITIES, STATUSES, TASK_LEVELS, type CalendarEvent, type Employee, type OperationTask } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ created?: string; deleted?: string; project?: string; schedule?: string; updated?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [projects, tasks, calendarEvents, employees] = await Promise.all([getProjects(true), getTasks(), getCalendarEvents(), getEmployees()]);
  const viewer = await getCurrentViewer(employees);
  const employeeOptions = sortEmployeesForDisplay(employees, viewer?.employee?.id);
  const project = projects.find((item) => item.id === id);

  if (!project) {
    notFound();
  }

  const projectTasks = tasks.filter((task) => task.project_id === project.id);
  const projectEvents = calendarEvents.filter((event) => event.project_id === project.id);
  const completedTasks = projectTasks.filter((task) => task.status === "完了");
  const overdueTasks = projectTasks.filter((task) => getDueState(task.due_date) === "overdue");
  const soonTasks = projectTasks.filter((task) => {
    const state = getDueState(task.due_date);
    return state === "soon3" || state === "soon7";
  });
  const progress = projectTasks.length === 0 ? 0 : Math.round((completedTasks.length / projectTasks.length) * 100);
  const middleTasks = projectTasks.filter((task) => task.task_level === "中タスク" || !task.parent_task_id);
  const childTasks = projectTasks.filter((task) => task.task_level === "小タスク" && task.parent_task_id);
  const notice = getNotice(query?.created, query?.schedule, query?.updated, query?.deleted, query?.project);

  return (
    <main className="page">
      <div className="shell projectDetailShell">
        <header className="topbar">
          <div className="brand" aria-label="BSO Operation">
            <div className="brandMark">BSO</div>
            <span>案件詳細</span>
          </div>
          <nav className="nav" aria-label="Project navigation">
            <Link className="navItem" href="/">
              ボード
            </Link>
            <Link className="navItem" href="/admin">
              管理
            </Link>
          </nav>
        </header>

        <section className="detailHero">
          <div>
            <h1>{project.name}</h1>
            <p>{project.due_date ? `案件期日 ${project.due_date}` : "案件期日 未設定"}</p>
          </div>
          <div className="progressPanel">
            <div className="progressNumber">{progress}%</div>
            <div className="progressTrack" aria-label={`進捗 ${progress}%`}>
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        </section>

        <section className="summaryGrid detailSummary" aria-label="Project summary">
          <Summary label="全タスク" value={projectTasks.length} />
          <Summary label="完了" value={completedTasks.length} />
          <Summary label="期限切れ" value={overdueTasks.length} />
          <Summary label="7日以内" value={soonTasks.length} />
        </section>

        <section className="detailLayout">
          <div className="detailMain">
            {notice ? <p className={`notice ${notice.kind}`}>{notice.message}</p> : null}
            <section className="panel projectSettingsPanel">
              <div className="sectionHeader compactHeader">
                <div>
                  <h2>案件情報</h2>
                  <p className="mutedText">
                    案件名と案件期日を後から調整できます。完了済みや一時停止の案件はアーカイブして通常ボードから外します。
                  </p>
                </div>
                {project.is_archived ? <span className="statusPill">アーカイブ済み</span> : null}
              </div>
              <form action={updateProjectDetails} className="detailEditForm projectEditForm">
                <input type="hidden" name="project_id" value={project.id} />
                <div className="field">
                  <label htmlFor="project-name-edit">案件名</label>
                  <input id="project-name-edit" name="project_name" defaultValue={project.name} maxLength={120} required />
                </div>
                <div className="field">
                  <label htmlFor="project-due-edit">案件期日</label>
                  <input id="project-due-edit" name="project_due_date" type="date" defaultValue={project.due_date ?? ""} />
                </div>
                <button className="button" type="submit">
                  案件を保存
                </button>
              </form>
              {project.is_archived ? (
                <form action={restoreProject} className="deleteForm">
                  <input type="hidden" name="project_id" value={project.id} />
                  <button className="secondaryButton" type="submit">
                    アーカイブを解除
                  </button>
                </form>
              ) : (
                <form action={archiveProject} className="deleteForm">
                  <input type="hidden" name="project_id" value={project.id} />
                  <button className="dangerButton" type="submit">
                    案件をアーカイブ
                  </button>
                </form>
              )}
            </section>
            <section className="detailCreateGrid">
              <div className="panel">
                <h2>タスク追加</h2>
                <form action={createProjectTask} className="quickForm">
                  <input type="hidden" name="project_id" value={project.id} />
                  <div className="field">
                    <label htmlFor="detail-task-title">タスク名</label>
                    <input id="detail-task-title" name="title" maxLength={120} placeholder="例: 協賛リスト作成" required />
                  </div>
                  <div className="formGridTwo">
                    <div className="field">
                      <label htmlFor="detail-task-level">階層</label>
                      <select id="detail-task-level" name="task_level" defaultValue="中タスク">
                        {TASK_LEVELS.map((level) => (
                          <option key={level}>{level}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="detail-parent-task">親タスク</label>
                      <select id="detail-parent-task" name="parent_task_id" defaultValue="">
                        <option value="">中タスクとして登録</option>
                        {middleTasks.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="formGridTwo">
                    <div className="field">
                      <label htmlFor="detail-category">カテゴリ</label>
                      <select id="detail-category" name="category" defaultValue={CATEGORIES[0]}>
                        {CATEGORIES.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="detail-status">ステータス</label>
                      <select id="detail-status" name="status" defaultValue={STATUSES[0]}>
                        {STATUSES.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="formGridTwo">
                    <div className="field">
                      <label htmlFor="detail-owner">担当者</label>
                      <EmployeeSelect employees={employeeOptions} id="detail-owner" name="assignee_id" />
                    </div>
                    <div className="field">
                      <label htmlFor="detail-due">期日</label>
                      <input id="detail-due" name="due_date" type="date" />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="detail-task-memo">進捗メモ</label>
                    <textarea id="detail-task-memo" name="memo" rows={3} maxLength={1000} placeholder="例: 誰に確認中か、次にやること" />
                  </div>
                  <button className="button" type="submit">
                    この案件にタスク追加
                  </button>
                </form>
              </div>
              <div className="panel">
                <h2>予定追加</h2>
                <form action={createProjectCalendarEvent} className="quickForm">
                  <input type="hidden" name="calendar_project_id" value={project.id} />
                  <div className="field">
                    <label htmlFor="detail-calendar-title">予定名</label>
                    <input id="detail-calendar-title" name="calendar_title" maxLength={120} placeholder="例: 球場下見" required />
                  </div>
                  <div className="formGridTwo">
                    <div className="field">
                      <label htmlFor="detail-event-date">開始日</label>
                      <input id="detail-event-date" name="event_date" type="date" required />
                    </div>
                    <div className="field">
                      <label htmlFor="detail-end-date">終了日</label>
                      <input id="detail-end-date" name="end_date" type="date" required />
                    </div>
                  </div>
                  <label className="checkField" htmlFor="detail-all-day">
                    <input id="detail-all-day" name="is_all_day" type="checkbox" />
                    <span>終日</span>
                  </label>
                  <div className="formGridTwo">
                    <div className="field">
                      <label htmlFor="detail-start-time">開始</label>
                      <input id="detail-start-time" name="start_time" type="time" />
                    </div>
                    <div className="field">
                      <label htmlFor="detail-end-time">終了</label>
                      <input id="detail-end-time" name="end_time" type="time" />
                    </div>
                  </div>
                  <div className="formGridTwo">
                    <div className="field">
                      <label htmlFor="detail-calendar-owner">担当者</label>
                      <EmployeeSelect employees={employeeOptions} id="detail-calendar-owner" name="calendar_assignee_id" />
                    </div>
                    <div className="field">
                      <label htmlFor="detail-location">場所</label>
                      <input id="detail-location" name="location" maxLength={120} placeholder="例: 事務所" />
                    </div>
                  </div>
                  <button className="secondaryButton" type="submit">
                    この案件に予定追加
                  </button>
                </form>
              </div>
            </section>
            <div className="sectionHeader">
              <div>
                <h2>タスク階層</h2>
                <p className="mutedText">中タスクと小タスクを、この案件だけに絞って確認します。</p>
              </div>
            </div>
            <div className="detailTaskList">
              {middleTasks.length === 0 ? (
                <div className="empty">この案件の中タスクはまだありません</div>
              ) : (
                middleTasks.map((task) => {
                  const children = childTasks.filter((child) => child.parent_task_id === task.id);

                  return (
                    <div className="detailTaskGroup" key={task.id}>
                      <DetailTaskCard
                        employees={employeeOptions}
                        parentCandidates={middleTasks.filter((candidate) => candidate.id !== task.id)}
                        projectId={project.id}
                        task={task}
                      />
                      {children.length > 0 ? (
                        <div className="childTasks">
                          {children.map((child) => (
                            <DetailTaskCard
                              employees={employeeOptions}
                              key={child.id}
                              parentCandidates={middleTasks.filter((candidate) => candidate.id !== child.id)}
                              projectId={project.id}
                              task={child}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <aside className="detailSide">
            <section className="panel">
              <h2>予定</h2>
              <div className="upcomingList">
                {projectEvents.length === 0 ? (
                  <div className="empty">関連予定なし</div>
                ) : (
                  projectEvents.map((event) => <EventItem employees={employeeOptions} event={event} key={event.id} projectId={project.id} />)
                )}
              </div>
            </section>
            <section className="panel">
              <h2>期日警告</h2>
              <div className="upcomingList">
                {[...overdueTasks, ...soonTasks].length === 0 ? (
                  <div className="empty">警告対象なし</div>
                ) : (
                  [...overdueTasks, ...soonTasks].map((task) => <DueWarning task={task} key={task.id} />)
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function EmployeeSelect({
  employees,
  id,
  name
}: {
  employees: Employee[];
  id: string;
  name: string;
}) {
  return (
    <select id={id} name={name} defaultValue="">
      <option value="">未割当</option>
      {employees.map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.name}
        </option>
      ))}
    </select>
  );
}

function getNotice(created?: string, schedule?: string, updated?: string, deleted?: string, project?: string) {
  if (project === "updated") {
    return { kind: "noticeSuccess", message: "案件情報を更新しました。" };
  }

  if (project === "restored") {
    return { kind: "noticeSuccess", message: "案件のアーカイブを解除しました。" };
  }

  if (created === "success") {
    return { kind: "noticeSuccess", message: "この案件にタスクを追加しました。" };
  }

  if (schedule === "success") {
    return { kind: "noticeSuccess", message: "この案件に予定を追加しました。" };
  }

  if (schedule === "updated") {
    return { kind: "noticeSuccess", message: "予定を更新しました。" };
  }

  if (schedule === "deleted") {
    return { kind: "noticeSuccess", message: "予定を削除しました。" };
  }

  if (updated === "success") {
    return { kind: "noticeSuccess", message: "タスクを更新しました。" };
  }

  if (deleted === "success") {
    return { kind: "noticeSuccess", message: "タスクを削除しました。" };
  }

  if (created === "missing-env" || schedule === "missing-env" || updated === "missing-env" || deleted === "missing-env" || project === "missing-env") {
    return { kind: "noticeError", message: "Supabaseの環境変数を確認してください。" };
  }

  if (created === "invalid" || schedule === "invalid" || updated === "invalid" || deleted === "invalid" || project === "invalid") {
    return { kind: "noticeError", message: "入力内容を確認してください。" };
  }

  if (created === "error" || schedule === "error" || updated === "error" || deleted === "error" || project === "error") {
    return { kind: "noticeError", message: "処理に失敗しました。Supabase設定を確認してください。" };
  }

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

function DetailTaskCard({
  employees,
  parentCandidates,
  projectId,
  task
}: {
  employees: Employee[];
  parentCandidates: OperationTask[];
  projectId: string;
  task: OperationTask;
}) {
  const state = getDueState(task.due_date);

  return (
    <article className={`task detailTask ${state ? `due-${state}` : ""}`}>
      <form action={updateProjectTask} className="detailEditForm">
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="id" value={task.id} />
        <div className="field wideField">
          <label htmlFor={`task-title-${task.id}`}>タスク名</label>
          <input id={`task-title-${task.id}`} name="title" defaultValue={task.title} maxLength={120} required />
        </div>
        <div className="field">
          <label htmlFor={`task-level-${task.id}`}>階層</label>
          <select id={`task-level-${task.id}`} name="task_level" defaultValue={task.task_level}>
            {TASK_LEVELS.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`task-parent-${task.id}`}>親</label>
          <select id={`task-parent-${task.id}`} name="parent_task_id" defaultValue={task.parent_task_id ?? ""}>
            <option value="">なし</option>
            {parentCandidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`task-owner-${task.id}`}>担当</label>
          <select id={`task-owner-${task.id}`} name="assignee_id" defaultValue={task.assignee_id ?? ""}>
            <option value="">未割当</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`task-category-${task.id}`}>カテゴリ</label>
          <select id={`task-category-${task.id}`} name="category" defaultValue={task.category}>
            {CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`task-status-${task.id}`}>状態</label>
          <select id={`task-status-${task.id}`} name="status" defaultValue={task.status}>
            {STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`task-priority-${task.id}`}>優先度</label>
          <select id={`task-priority-${task.id}`} name="priority" defaultValue={task.priority}>
            {PRIORITIES.map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`task-due-${task.id}`}>期日</label>
          <input id={`task-due-${task.id}`} name="due_date" type="date" defaultValue={task.due_date ?? ""} />
        </div>
        <div className="field memoField">
          <label htmlFor={`task-memo-${task.id}`}>進捗メモ</label>
          <textarea id={`task-memo-${task.id}`} name="memo" defaultValue={task.memo ?? ""} rows={2} maxLength={1000} />
        </div>
        <button className="smallButton" type="submit">
          保存
        </button>
      </form>
      <div className="taskMeta">
        {task.due_date ? <span>{getDueLabel(task.due_date, state)}</span> : <span>期限 未設定</span>}
      </div>
      {task.memo ? <p className="taskMemo">{task.memo}</p> : null}
      <form action={deleteProjectTask} className="deleteForm">
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="id" value={task.id} />
        <button className="dangerButton" type="submit">
          削除
        </button>
      </form>
    </article>
  );
}

function EventItem({ employees, event, projectId }: { employees: Employee[]; event: CalendarEvent; projectId: string }) {
  const endDate = event.end_date && event.end_date !== event.event_date ? `〜${event.end_date}` : "";
  const time = event.is_all_day ? "終日" : [event.start_time?.slice(0, 5), event.end_time?.slice(0, 5)].filter(Boolean).join("〜");

  return (
    <article className="eventEditItem">
      <form action={updateProjectCalendarEvent} className="quickForm">
        <input type="hidden" name="calendar_project_id" value={projectId} />
        <input type="hidden" name="id" value={event.id} />
        <div className="field">
          <label htmlFor={`event-title-${event.id}`}>予定名</label>
          <input id={`event-title-${event.id}`} name="calendar_title" defaultValue={event.title} maxLength={120} required />
        </div>
        <div className="formGridTwo">
          <div className="field">
            <label htmlFor={`event-date-${event.id}`}>開始日</label>
            <input id={`event-date-${event.id}`} name="event_date" type="date" defaultValue={event.event_date} required />
          </div>
          <div className="field">
            <label htmlFor={`event-end-${event.id}`}>終了日</label>
            <input id={`event-end-${event.id}`} name="end_date" type="date" defaultValue={event.end_date ?? event.event_date} required />
          </div>
        </div>
        <label className="checkField" htmlFor={`event-all-day-${event.id}`}>
          <input defaultChecked={event.is_all_day} id={`event-all-day-${event.id}`} name="is_all_day" type="checkbox" />
          <span>終日</span>
        </label>
        <div className="formGridTwo">
          <div className="field">
            <label htmlFor={`event-start-${event.id}`}>開始</label>
            <input id={`event-start-${event.id}`} name="start_time" type="time" defaultValue={event.start_time?.slice(0, 5) ?? ""} />
          </div>
          <div className="field">
            <label htmlFor={`event-end-time-${event.id}`}>終了</label>
            <input id={`event-end-time-${event.id}`} name="end_time" type="time" defaultValue={event.end_time?.slice(0, 5) ?? ""} />
          </div>
        </div>
        <div className="field">
          <label htmlFor={`event-owner-${event.id}`}>担当</label>
          <select id={`event-owner-${event.id}`} name="calendar_assignee_id" defaultValue={event.assignee_id ?? ""}>
            <option value="">未割当</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`event-location-${event.id}`}>場所</label>
          <input id={`event-location-${event.id}`} name="location" defaultValue={event.location ?? ""} maxLength={120} />
        </div>
        <button className="smallButton" type="submit">
          予定保存
        </button>
      </form>
      <div className="taskMeta">
        <span>{time || "予定"}</span>
        <span>
          {event.event_date}
          {endDate}
        </span>
      </div>
      <form action={deleteProjectCalendarEvent} className="deleteForm">
        <input type="hidden" name="calendar_project_id" value={projectId} />
        <input type="hidden" name="id" value={event.id} />
        <button className="dangerButton" type="submit">
          予定削除
        </button>
      </form>
    </article>
  );
}

function DueWarning({ task }: { task: OperationTask }) {
  const state = getDueState(task.due_date);

  return (
    <article className={`warningItem ${state ? `due-${state}` : ""}`}>
      <strong>{task.title}</strong>
      <span>{task.due_date ? getDueLabel(task.due_date, state) : "期限 未設定"}</span>
    </article>
  );
}

function getDueState(dueDate: string | null) {
  if (!dueDate) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dueDate}T00:00:00`);
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return "overdue";
  }

  if (diffDays <= 3) {
    return "soon3";
  }

  if (diffDays <= 7) {
    return "soon7";
  }

  return null;
}

function getDueLabel(dueDate: string, state: ReturnType<typeof getDueState>) {
  if (state === "overdue") {
    return `期限切れ ${dueDate}`;
  }

  if (state === "soon3") {
    return `3日以内 ${dueDate}`;
  }

  if (state === "soon7") {
    return `7日以内 ${dueDate}`;
  }

  return `期限 ${dueDate}`;
}
