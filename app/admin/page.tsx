import Link from "next/link";
import { redirect } from "next/navigation";
import { createRegularTask, deleteRegularTask, deleteTask, logout, sendTeamsDueAlert, updateTaskManagement } from "@/app/actions";
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
  searchParams?: Promise<{ count?: string; deleted?: string; regular?: string; teams?: string; updated?: string }>;
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
  const notice = getAdminNotice(params?.updated, params?.deleted, params?.teams, params?.count, params?.regular);
  const employeeOptions = sortEmployeesForDisplay(employees, viewer.employee?.id);

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
              <p className="mutedText">社長と河本だけが開ける管理画面です。担当者、状態、カテゴリ、優先度、期限をまとめて更新できます。</p>
            </div>
            <form action={sendTeamsDueAlert}>
              <button className="secondaryButton" type="submit">
                Teamsに期限アラート送信
              </button>
            </form>
          </div>
          {notice ? <p className={`notice ${notice.kind}`}>{notice.message}</p> : null}
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
          <div className="adminList">
            {tasks.map((task) => (
              <AdminTaskRow
                employees={employeeOptions}
                key={task.id}
                manager={manager}
                projects={projects}
                task={task}
                tasks={tasks}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
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
  manager,
  employees,
  projects,
  task,
  tasks
}: {
  manager: Manager;
  employees: Employee[];
  projects: Project[];
  task: OperationTask;
  tasks: OperationTask[];
}) {
  const parentCandidates = tasks.filter((candidate) => candidate.id !== task.id && candidate.task_level === TASK_LEVELS[0]);

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

function getAdminNotice(updated?: string, deleted?: string, teams?: string, count?: string, regular?: string) {
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
