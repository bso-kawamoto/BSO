import Link from "next/link";
import { redirect } from "next/navigation";
import {
  bulkUpdateTaskManagement,
  createRegularTask,
  deleteRegularTask,
  deleteTask,
  logout,
  sendTeamsDueAlert,
  toggleProjectArchiveManagement,
  updateProjectManagement,
  updateTaskManagement
} from "@/app/actions";
import { getCurrentViewer } from "@/lib/auth";
import { sortEmployeesForDisplay } from "@/lib/employee-order";
import { getEmployees, getProjects, getRegularTasks, getTasks } from "@/lib/tasks";
import {
  CATEGORIES,
  MANAGERS,
  PRIORITIES,
  STATUSES,
  TASK_LEVELS,
  type Employee,
  type Manager,
  type OperationTask,
  type Project,
  type RegularTask
} from "@/lib/types";

export default async function AdminPage({
  searchParams
}: {
  searchParams?: Promise<{
    assignee?: string;
    bulk?: string;
    count?: string;
    deleted?: string;
    project?: string;
    projectUpdate?: string;
    q?: string;
    regular?: string;
    status?: string;
    teams?: string;
    updated?: string;
  }>;
}) {
  const params = await searchParams;
  const [tasks, projects, employees, regularTasks] = await Promise.all([getTasks(), getProjects(true), getEmployees(), getRegularTasks()]);
  const viewer = await getCurrentViewer(employees);

  if (!viewer) {
    redirect("/login?next=/admin");
  }

  if (!viewer.isAdmin) {
    redirect("/employees");
  }

  const manager = viewer.kind === "boss" ? MANAGERS[0] : MANAGERS[1];
  const notice = getAdminNotice(params?.updated, params?.deleted, params?.teams, params?.count, params?.regular, params?.projectUpdate, params?.bulk);
  const employeeOptions = sortEmployeesForDisplay(employees, viewer.employee?.id);
  const filteredTasks = filterAdminTasks(tasks, params);
  const visibleTasks = filteredTasks.slice(0, 40);
  const allMiddleTasks = tasks.filter((task) => task.task_level === TASK_LEVELS[0]);

  return (
    <main className="page">
      <div className="shell adminShell">
        <header className="topbar">
          <div className="brand" aria-label="BSO Operation">
            <div className="brandMark">BSO</div>
            <span>管理画面</span>
          </div>
          <nav className="nav" aria-label="Admin navigation">
            <Link className="navItem" href="/">
              ボード
            </Link>
            <span className="navItem navItemActive">{viewer.name}</span>
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
              <h1 className="adminTitle">タスク管理</h1>
              <p className="mutedText">表示件数を絞って軽くしています。検索や絞り込みで必要なタスクだけ編集してください。</p>
            </div>
            <form action={sendTeamsDueAlert}>
              <button className="secondaryButton" type="submit">
                Teamsに期限アラート送信
              </button>
            </form>
          </div>
          {notice ? <p className={`notice ${notice.kind}`}>{notice.message}</p> : null}
          <details className="panel projectManagementPanel">
            <summary>案件管理</summary>
            <div className="projectManagementList">
              {projects.map((project) => (
                <ProjectManagementRow key={project.id} project={project} />
              ))}
            </div>
          </details>
          <form className="adminFilterForm">
            <div className="field">
              <label htmlFor="admin-q">検索</label>
              <input id="admin-q" name="q" defaultValue={params?.q ?? ""} placeholder="タスク名・メモ" />
            </div>
            <div className="field">
              <label htmlFor="admin-project">案件</label>
              <select id="admin-project" name="project" defaultValue={params?.project ?? ""}>
                <option value="">すべて</option>
                <option value="none">案件なし</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="admin-assignee">担当者</label>
              <select id="admin-assignee" name="assignee" defaultValue={params?.assignee ?? ""}>
                <option value="">すべて</option>
                <option value="none">未割当</option>
                {employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="admin-status">状態</label>
              <select id="admin-status" name="status" defaultValue={params?.status ?? "open"}>
                <option value="open">未完了</option>
                <option value="">すべて</option>
                {STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
            <button className="button" type="submit">
              絞り込み
            </button>
            <Link className="secondaryButton adminResetLink" href="/admin">
              解除
            </Link>
          </form>
          <section className="panel regularTaskPanel">
            <h2>レギュラー業務</h2>
            <form action={createRegularTask} className="regularTaskForm">
              <div className="field">
                <label htmlFor="regular-assignee">担当者</label>
                <select id="regular-assignee" name="assignee_id" required>
                  <option value="">選択してください</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="regular-title">業務名</label>
                <input id="regular-title" name="title" maxLength={120} placeholder="例: 問い合わせ確認" required />
              </div>
              <div className="field regularMemoField">
                <label htmlFor="regular-memo">メモ</label>
                <input id="regular-memo" name="memo" maxLength={1000} placeholder="例: 朝一で未返信を確認" />
              </div>
              <button className="button" type="submit">
                追加
              </button>
            </form>
            <div className="regularTaskList">
              {regularTasks.map((task) => (
                <RegularTaskRow employees={employees} key={task.id} task={task} />
              ))}
              {regularTasks.length === 0 ? <div className="empty">登録済みのレギュラー業務はありません</div> : null}
            </div>
          </section>
          <section className="panel bulkTaskPanel">
            <h2>表示中タスクをまとめて変更</h2>
            <p className="mutedText">下に表示されている最大40件だけが対象です。空欄の項目は変更しません。</p>
            <form action={bulkUpdateTaskManagement} className="bulkTaskForm">
              {visibleTasks.map((task) => (
                <input key={task.id} type="hidden" name="task_ids" value={task.id} />
              ))}
              <div className="field">
                <label htmlFor="bulk-project">案件</label>
                <select id="bulk-project" name="bulk_project_id" defaultValue="">
                  <option value="">変更しない</option>
                  <option value="__none__">案件なしにする</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="bulk-assignee">担当者</label>
                <select id="bulk-assignee" name="bulk_assignee_id" defaultValue="">
                  <option value="">変更しない</option>
                  <option value="__none__">未割当にする</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="bulk-category">カテゴリ</label>
                <select id="bulk-category" name="bulk_category" defaultValue="">
                  <option value="">変更しない</option>
                  {CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="bulk-status">状態</label>
                <select id="bulk-status" name="bulk_status" defaultValue="">
                  <option value="">変更しない</option>
                  {STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="bulk-priority">優先度</label>
                <select id="bulk-priority" name="bulk_priority" defaultValue="">
                  <option value="">変更しない</option>
                  {PRIORITIES.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="bulk-due">期日</label>
                <input id="bulk-due" name="bulk_due_date" type="date" />
              </div>
              <label className="checkField bulkCheckField" htmlFor="bulk-clear-due">
                <input id="bulk-clear-due" name="bulk_clear_due_date" type="checkbox" />
                <span>期日を空にする</span>
              </label>
              <button className="button" type="submit" disabled={visibleTasks.length === 0}>
                表示中{visibleTasks.length}件をまとめて更新
              </button>
            </form>
          </section>
          <div className="adminList">
            <p className="mutedText">表示 {visibleTasks.length}件 / 該当 {filteredTasks.length}件 / 全体 {tasks.length}件</p>
            {visibleTasks.map((task) => (
              <AdminTaskRow
                allMiddleTasks={allMiddleTasks}
                employees={employeeOptions}
                key={task.id}
                manager={manager}
                projects={projects}
                task={task}
              />
            ))}
            {filteredTasks.length > visibleTasks.length ? <div className="empty">該当件数が多いため先頭40件だけ表示しています。検索条件を追加してください。</div> : null}
            {filteredTasks.length === 0 ? <div className="empty">該当するタスクはありません</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function ProjectManagementRow({ project }: { project: Project }) {
  return (
    <article className="projectManagementRow">
      <form action={updateProjectManagement} className="projectManagementForm">
        <input type="hidden" name="project_id" value={project.id} />
        <div className="field">
          <label htmlFor={`project-name-${project.id}`}>案件名</label>
          <input id={`project-name-${project.id}`} name="project_name" defaultValue={project.name} maxLength={120} required />
        </div>
        <div className="field">
          <label htmlFor={`project-due-${project.id}`}>期日</label>
          <input id={`project-due-${project.id}`} name="project_due_date" type="date" defaultValue={project.due_date ?? ""} />
        </div>
        <button className="smallButton" type="submit">
          保存
        </button>
      </form>
      <div className="projectManagementActions">
        <Link className="detailLink" href={`/projects/${project.id}`}>
          詳細
        </Link>
        <form action={toggleProjectArchiveManagement}>
          <input type="hidden" name="project_id" value={project.id} />
          <input type="hidden" name="archive" value={project.is_archived ? "false" : "true"} />
          <button className={project.is_archived ? "secondaryButton" : "dangerButton"} type="submit">
            {project.is_archived ? "戻す" : "アーカイブ"}
          </button>
        </form>
      </div>
    </article>
  );
}

function RegularTaskRow({ employees, task }: { employees: Employee[]; task: RegularTask }) {
  const assignee = employees.find((employee) => employee.id === task.assignee_id);

  return (
    <article className="regularTaskRow">
      <div>
        <strong>{task.title}</strong>
        <span>{assignee?.name ?? "担当者不明"}</span>
        {task.memo ? <p>{task.memo}</p> : null}
      </div>
      <form action={deleteRegularTask}>
        <input type="hidden" name="id" value={task.id} />
        <button className="dangerButton" type="submit">
          削除
        </button>
      </form>
    </article>
  );
}

function AdminTaskRow({
  allMiddleTasks,
  manager,
  employees,
  projects,
  task
}: {
  allMiddleTasks: OperationTask[];
  manager: Manager;
  employees: Employee[];
  projects: Project[];
  task: OperationTask;
}) {
  const parentCandidates = allMiddleTasks.filter(
    (candidate) => candidate.id !== task.id && (candidate.project_id === task.project_id || (!candidate.project_id && !task.project_id))
  );

  return (
    <article className="adminRow">
      <form action={updateTaskManagement} className="adminForm">
        <input type="hidden" name="manager" value={manager} />
        <input type="hidden" name="id" value={task.id} />
        <div className="field wideField">
          <label htmlFor={`title-${task.id}`}>タスク名</label>
          <input id={`title-${task.id}`} name="title" defaultValue={task.title} maxLength={120} required />
        </div>
        <div className="field">
          <label htmlFor={`project-${task.id}`}>案件</label>
          <select id={`project-${task.id}`} name="project_id" defaultValue={task.project_id ?? ""}>
            <option value="">案件なし</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`level-${task.id}`}>階層</label>
          <select id={`level-${task.id}`} name="task_level" defaultValue={task.task_level}>
            {TASK_LEVELS.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`parent-${task.id}`}>親タスク</label>
          <select id={`parent-${task.id}`} name="parent_task_id" defaultValue={task.parent_task_id ?? ""}>
            <option value="">なし</option>
            {parentCandidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`owner-${task.id}`}>担当者</label>
          <select id={`owner-${task.id}`} name="assignee_id" defaultValue={task.assignee_id ?? ""}>
            <option value="">未割当</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`category-${task.id}`}>カテゴリ</label>
          <select id={`category-${task.id}`} name="category" defaultValue={task.category}>
            {CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`requester-${task.id}`}>依頼者</label>
          <select id={`requester-${task.id}`} name="requested_by_id" defaultValue={getRequesterDefaultValue(task)}>
            <option value="">未設定</option>
            <option value="__president__">社長</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`status-${task.id}`}>ステータス</label>
          <select id={`status-${task.id}`} name="status" defaultValue={task.status}>
            {STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`priority-${task.id}`}>優先度</label>
          <select id={`priority-${task.id}`} name="priority" defaultValue={task.priority}>
            {PRIORITIES.map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`due-${task.id}`}>期限</label>
          <input id={`due-${task.id}`} name="due_date" type="date" defaultValue={task.due_date ?? ""} />
        </div>
        <div className="field memoField">
          <label htmlFor={`memo-${task.id}`}>進捗メモ</label>
          <textarea id={`memo-${task.id}`} name="memo" defaultValue={task.memo ?? ""} rows={2} maxLength={1000} />
        </div>
        <button className="smallButton adminSaveButton" type="submit">
          保存
        </button>
      </form>
      <form action={deleteTask} className="deleteForm">
        <input type="hidden" name="manager" value={manager} />
        <input type="hidden" name="id" value={task.id} />
        <button className="dangerButton" type="submit">
          削除
        </button>
      </form>
    </article>
  );
}

function getRequesterDefaultValue(task: OperationTask) {
  return task.requested_by_id ?? (task.requested_by_name === "社長" ? "__president__" : "");
}

function filterAdminTasks(
  tasks: OperationTask[],
  params?: { assignee?: string; project?: string; q?: string; status?: string }
) {
  const query = params?.q?.trim().toLowerCase();
  const status = params?.status ?? "open";

  return tasks.filter((task) => {
    if (query) {
      const haystack = [task.title, task.memo, task.owner, task.requested_by_name, task.category].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (params?.project === "none" && task.project_id) return false;
    if (params?.project && params.project !== "none" && task.project_id !== params.project) return false;

    if (params?.assignee === "none" && task.assignee_id) return false;
    if (params?.assignee && params.assignee !== "none" && task.assignee_id !== params.assignee) return false;

    if (status === "open" && task.status === "完了") return false;
    if (status && status !== "open" && task.status !== status) return false;

    return true;
  });
}

function getAdminNotice(updated?: string, deleted?: string, teams?: string, count?: string, regular?: string, projectUpdate?: string, bulk?: string) {
  if (bulk === "success") {
    return { kind: "noticeSuccess", message: `表示中タスクをまとめて更新しました。対象 ${count ?? "0"} 件。` };
  }

  if (bulk === "empty") {
    return { kind: "noticeError", message: "まとめて変更する項目を選んでください。" };
  }

  if (bulk === "invalid" || bulk === "missing-env" || bulk === "error") {
    return { kind: "noticeError", message: "まとめて更新に失敗しました。条件とSupabase設定を確認してください。" };
  }

  if (projectUpdate === "success") {
    return { kind: "noticeSuccess", message: "案件を更新しました。" };
  }

  if (projectUpdate === "archived") {
    return { kind: "noticeSuccess", message: "案件をアーカイブしました。" };
  }

  if (projectUpdate === "restored") {
    return { kind: "noticeSuccess", message: "案件のアーカイブを解除しました。" };
  }

  if (projectUpdate === "invalid" || projectUpdate === "missing-env" || projectUpdate === "error") {
    return { kind: "noticeError", message: "案件の更新に失敗しました。入力内容とSupabase設定を確認してください。" };
  }

  if (regular === "success") {
    return { kind: "noticeSuccess", message: "レギュラー業務を追加しました。" };
  }

  if (regular === "deleted") {
    return { kind: "noticeSuccess", message: "レギュラー業務を削除しました。" };
  }

  if (regular === "invalid") {
    return { kind: "noticeError", message: "レギュラー業務の担当者と業務名を確認してください。" };
  }

  if (regular === "missing-env" || regular === "error") {
    return { kind: "noticeError", message: "レギュラー業務の保存に失敗しました。Supabase設定を確認してください。" };
  }

  if (teams === "sent") {
    return { kind: "noticeSuccess", message: `Teamsへ期限アラートを送信しました。対象 ${count ?? "0"} 件。` };
  }

  if (teams === "no-targets") {
    return { kind: "noticeSuccess", message: "Teams通知対象の期限タスクはありません。" };
  }

  if (teams === "missing-webhook") {
    return { kind: "noticeError", message: "TEAMS_WEBHOOK_URL が未設定です。Vercelの環境変数を確認してください。" };
  }

  if (teams === "send-failed") {
    return { kind: "noticeError", message: "Teams通知の送信に失敗しました。Webhook URLを確認してください。" };
  }

  if (updated === "success") {
    return { kind: "noticeSuccess", message: "タスクを更新しました。" };
  }

  if (deleted === "success") {
    return { kind: "noticeSuccess", message: "タスクを削除しました。" };
  }

  if (updated === "invalid" || deleted === "invalid") {
    return { kind: "noticeError", message: "入力内容を確認してください。" };
  }

  if (updated === "missing-env" || deleted === "missing-env") {
    return { kind: "noticeError", message: "Supabaseの環境変数を確認してください。" };
  }

  if (updated === "error" || deleted === "error") {
    return { kind: "noticeError", message: "処理に失敗しました。Supabase設定を確認してください。" };
  }

  return null;
}
