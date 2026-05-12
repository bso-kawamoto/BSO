"use client";

import { useMemo, useState } from "react";
import { createTask } from "@/app/actions";
import { CATEGORIES, MIDDLE_TASK_TEMPLATES, STATUSES, TASK_LEVELS, type Employee, type OperationTask, type Project } from "@/lib/types";

export function QuickTaskForm({
  defaultEmployeeId,
  defaultProjectId,
  employees,
  middleTasks,
  projects,
  taskTemplateTitles
}: {
  defaultEmployeeId: string;
  defaultProjectId: string;
  employees: Employee[];
  middleTasks: OperationTask[];
  projects: Project[];
  taskTemplateTitles: string[];
}) {
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [parentTaskId, setParentTaskId] = useState("");
  const parentTasks = useMemo(() => middleTasks.filter((task) => task.project_id === projectId), [middleTasks, projectId]);

  return (
    <form action={createTask} className="quickForm">
      <div className="field">
        <label htmlFor="title">タスク名</label>
        <input id="title" name="title" list="task-template-options" maxLength={120} placeholder="例: 協賛リスト作成" required />
        <datalist id="task-template-options">
          {MIDDLE_TASK_TEMPLATES.map((title) => (
            <option key={title} value={title} />
          ))}
          {taskTemplateTitles.map((title) => (
            <option key={title} value={title} />
          ))}
        </datalist>
      </div>
      <div className="field">
        <label htmlFor="project">案件</label>
        <select
          id="project"
          name="project_id"
          value={projectId}
          onChange={(event) => {
            setProjectId(event.target.value);
            setParentTaskId("");
          }}
        >
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
        <select id="parent-task" name="parent_task_id" value={parentTaskId} onChange={(event) => setParentTaskId(event.target.value)}>
          <option value="">{projectId ? "中タスクとして登録" : "案件を選ぶと表示"}</option>
          {parentTasks.map((task) => (
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
        <EmployeeSelect id="owner" employees={employees} name="assignee_id" defaultValue={defaultEmployeeId} />
      </div>
      <div className="field">
        <label htmlFor="requester">依頼者</label>
        <EmployeeSelect id="requester" employees={employees} includePresident name="requested_by_id" defaultValue={defaultEmployeeId} />
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
  );
}

function EmployeeSelect({
  defaultValue = "",
  employees,
  id,
  includePresident = false,
  name
}: {
  defaultValue?: string;
  employees: Employee[];
  id: string;
  includePresident?: boolean;
  name: string;
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue}>
      <option value="">未割当</option>
      {includePresident ? <option value="__president__">社長</option> : null}
      {employees.map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.name}
        </option>
      ))}
    </select>
  );
}
