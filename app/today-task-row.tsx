"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { STATUSES, type OperationTask, type TaskStatus } from "@/lib/types";

export function TodayTaskRow({ projectName, task }: { projectName?: string; task: OperationTask }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isHidden, setIsHidden] = useState(false);
  const [status, setStatus] = useState(task.status);
  const [toast, setToast] = useState<{ kind: "error" | "success"; message: string } | null>(null);

  if (isHidden) {
    return null;
  }

  async function updateStatus() {
    const response = await fetch("/api/project-tasks/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, projectId: task.project_id, status })
    });
    const result = (await response.json().catch(() => null)) as { message?: string; ok?: boolean } | null;

    setToast({ kind: response.ok ? "success" : "error", message: result?.message ?? (response.ok ? "更新しました。" : "更新に失敗しました。") });

    if (response.ok) {
      if (status === STATUSES[3]) {
        setIsHidden(true);
      }
      startTransition(() => router.refresh());
    }
  }

  return (
    <article className="warningItem todayTaskRow">
      <strong>{task.title}</strong>
      <span>
        {projectName ?? "案件なし"} / {task.owner} / {task.due_date ?? "期限なし"}
      </span>
      <div className="todayTaskActions">
        {task.project_id ? (
          <Link className="detailLink" href={`/projects/${task.project_id}#task-${task.id}`}>
            案件へ
          </Link>
        ) : null}
        <div className="projectStatusForm todayStatusForm">
          <label htmlFor={`today-status-${task.id}`}>ステータス</label>
          <select id={`today-status-${task.id}`} value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
            {STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button className="secondaryButton" disabled={isPending} onClick={updateStatus} type="button">
            {isPending ? "更新中" : "変更"}
          </button>
        </div>
      </div>
      {toast ? (
        <div className={`toastNotice ${toast.kind === "success" ? "toastSuccess" : "toastError"}`} role="status">
          {toast.message}
        </div>
      ) : null}
    </article>
  );
}
