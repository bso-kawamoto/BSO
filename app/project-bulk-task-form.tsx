"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CATEGORIES, PRIORITIES, STATUSES, type Employee } from "@/lib/types";

export function ProjectBulkTaskForm({
  disabled,
  employees,
  formId,
  projectId
}: {
  disabled: boolean;
  employees: Employee[];
  formId: string;
  projectId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ kind: "error" | "success"; message: string } | null>(null);

  async function submit(action: "delete" | "update") {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const formData = new FormData(form);
    const ids = formData.getAll("task_ids").filter((value): value is string => typeof value === "string");

    if (ids.length === 0) {
      setToast({ kind: "error", message: "対象の小タスクを選んでください。" });
      return;
    }

    const response = await fetch("/api/project-tasks/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        assigneeId: formData.get("bulk_assignee_id"),
        category: formData.get("bulk_category"),
        clearDueDate: formData.get("bulk_clear_due_date") === "on",
        dueDate: formData.get("bulk_due_date"),
        ids,
        priority: formData.get("bulk_priority"),
        projectId,
        status: formData.get("bulk_status")
      })
    });
    const result = (await response.json().catch(() => null)) as { message?: string; ok?: boolean } | null;

    setToast({ kind: response.ok ? "success" : "error", message: result?.message ?? (response.ok ? "更新しました。" : "処理に失敗しました。") });

    if (response.ok) {
      startTransition(() => router.refresh());
    }
  }

  return (
    <>
      <form className="projectBulkTaskForm" id={formId}>
        <div className="field">
          <label htmlFor="project-bulk-status">ステータス</label>
          <select id="project-bulk-status" name="bulk_status" defaultValue="">
            <option value="">変更しない</option>
            {STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="project-bulk-assignee">担当者</label>
          <select id="project-bulk-assignee" name="bulk_assignee_id" defaultValue="">
            <option value="">変更しない</option>
            <option value="__none__">未割当にする</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="project-bulk-category">カテゴリ</label>
          <select id="project-bulk-category" name="bulk_category" defaultValue="">
            <option value="">変更しない</option>
            {CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="project-bulk-priority">優先度</label>
          <select id="project-bulk-priority" name="bulk_priority" defaultValue="">
            <option value="">変更しない</option>
            {PRIORITIES.map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="project-bulk-due">期日</label>
          <input id="project-bulk-due" name="bulk_due_date" type="date" />
        </div>
        <label className="checkField bulkCheckField" htmlFor="project-bulk-clear-due">
          <input id="project-bulk-clear-due" name="bulk_clear_due_date" type="checkbox" />
          <span>期日を空にする</span>
        </label>
        <div className="projectBulkActions">
          <button className="button" disabled={disabled || isPending} onClick={() => submit("update")} type="button">
            {isPending ? "処理中" : "選択した小タスクを更新"}
          </button>
          <button className="dangerButton" disabled={disabled || isPending} onClick={() => submit("delete")} type="button">
            選択した小タスクを削除
          </button>
        </div>
      </form>
      {toast ? (
        <div className={`toastNotice ${toast.kind === "success" ? "toastSuccess" : "toastError"}`} role="status">
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
