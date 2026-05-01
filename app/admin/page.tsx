import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteTask, logout, updateTaskManagement } from "@/app/actions";
import { getCurrentViewer } from "@/lib/auth";
import { sortEmployeesForDisplay } from "@/lib/employee-order";
import { getEmployees, getProjects, getTasks } from "@/lib/tasks";
import {
  CATEGORIES,
  MANAGERS,
  PRIORITIES,
  STATUSES,
  TASK_LEVELS,
  type Employee,
  type Manager,
  type OperationTask,
  type Project
} from "@/lib/types";

export default async function AdminPage({
  searchParams
}: {
  searchParams?: Promise<{ updated?: string; deleted?: string }>;
}) {
  const params = await searchParams;
  const tasks = await getTasks();
  const projects = await getProjects(true);
  const employees = await getEmployees();
  const viewer = await getCurrentViewer(employees);

  if (!viewer) {
    redirect("/login?next=/admin");
  }

  if (!viewer.isAdmin) {
    redirect("/employees");
  }

  const manager = viewer.kind === "boss" ? MANAGERS[0] : MANAGERS[1];
  const notice = getAdminNotice(params?.updated, params?.deleted);
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
          </div>
          {notice ? <p className={`notice ${notice.kind}`}>{notice.message}</p> : null}
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
        <button className="smallButton" type="submit">
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

function getAdminNotice(updated?: string, deleted?: string) {
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
