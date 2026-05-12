"use client";

import { useState } from "react";
import { updateProjectTaskOrder } from "@/app/actions";

type SortableTask = {
  id: string;
  title: string;
};

export function TaskOrderEditor({ projectId, tasks }: { projectId: string; tasks: SortableTask[] }) {
  const [items, setItems] = useState(tasks);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function moveTask(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      return;
    }

    setItems((current) => {
      const fromIndex = current.findIndex((item) => item.id === draggingId);
      const toIndex = current.findIndex((item) => item.id === targetId);

      if (fromIndex < 0 || toIndex < 0) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  return (
    <details className="panel taskOrderPanel">
      <summary>中タスクの並び替え</summary>
      <form action={updateProjectTaskOrder} className="taskOrderForm">
        <input type="hidden" name="project_id" value={projectId} />
        <div className="taskOrderList">
          {items.map((task, index) => (
            <div
              className={`taskOrderItem ${draggingId === task.id ? "taskOrderItemDragging" : ""}`}
              draggable
              key={task.id}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => {
                event.preventDefault();
                moveTask(task.id);
              }}
              onDragStart={() => setDraggingId(task.id)}
            >
              <span className="dragHandle" aria-hidden="true">
                ::
              </span>
              <span className="taskOrderNumber">{index + 1}</span>
              <strong>{task.title}</strong>
              <input type="hidden" name="task_ids" value={task.id} />
            </div>
          ))}
        </div>
        <button className="button" type="submit" disabled={items.length === 0}>
          並び順を保存
        </button>
      </form>
    </details>
  );
}
