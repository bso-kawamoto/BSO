"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { STATUSES, type TaskStatus } from "@/lib/types";

export function ProjectTaskStatusControl({
  initialStatus,
  projectId,
  taskId
}: {
  initialStatus: TaskStatus;
  projectId: string;
  taskId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(initialStatus);
  const [toast, setToast] = useState<{ kind: "error" | "success"; message: string } | null>(null);

  async function updateStatus() {
    const response = await fetch("/api/project-tasks/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, projectId, status })
    });
    const result = (await response.json().catch(() => null)) as { message?: string; ok?: boolean } | null;

    setToast({ kind: response.ok ? "success" : "error", message: result?.message ?? (response.ok ? "更新しました。" : "更新に失敗しました。") });

    if (response.ok) {
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="projectStatusForm">
      <label htmlFor={`quick-status-${taskId}`}>ステータス</label>
      <select id={`quick-status-${taskId}`} value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
        {STATUSES.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
      <button className="secondaryButton" disabled={isPending} onClick={updateStatus} type="button">
        {isPending ? "更新中" : "変更"}
      </button>
      {toast ? (
        <div className={`toastNotice ${toast.kind === "success" ? "toastSuccess" : "toastError"}`} role="status">
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
