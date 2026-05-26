"use client";

import { useState } from "react";

export function ProjectRegularTaskCheck({
  checked,
  checkedById,
  regularTaskId,
  weekStartDate
}: {
  checked: boolean;
  checkedById: string | null;
  regularTaskId: string;
  weekStartDate: string;
}) {
  const [isChecked, setIsChecked] = useState(checked);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function toggleChecked() {
    const nextChecked = !isChecked;
    setIsPending(true);
    setMessage(null);

    const response = await fetch("/api/project-regular-tasks/check", {
      body: JSON.stringify({
        checked: nextChecked,
        checkedById,
        regularTaskId,
        weekStartDate
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    setIsPending(false);

    if (!response.ok) {
      setMessage(result?.message ?? "更新に失敗しました。");
      return;
    }

    setIsChecked(nextChecked);
    setMessage(nextChecked ? "今週分を完了にしました。" : "今週分を未完了に戻しました。");
  }

  return (
    <div className="projectRegularCheck">
      <button className={isChecked ? "smallButton projectRegularDoneButton" : "secondaryButton"} disabled={isPending} onClick={toggleChecked} type="button">
        {isPending ? "更新中" : isChecked ? "今週完了" : "今週未完了"}
      </button>
      {message ? <span>{message}</span> : null}
    </div>
  );
}
