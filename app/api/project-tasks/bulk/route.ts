import { NextResponse } from "next/server";
import { revalidateProjectViews } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/server";
import { CATEGORIES, PRIORITIES, STATUSES, type TaskCategory, type TaskPriority, type TaskStatus } from "@/lib/types";

type BulkBody = {
  action?: unknown;
  assigneeId?: unknown;
  category?: unknown;
  clearDueDate?: unknown;
  dueDate?: unknown;
  ids?: unknown;
  priority?: unknown;
  projectId?: unknown;
  status?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as BulkBody | null;
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const action = body?.action === "delete" ? "delete" : "update";
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is string => typeof id === "string" && isUuid(id)).slice(0, 300) : [];

  if (!projectId || ids.length === 0) {
    return NextResponse.json({ ok: false, message: "対象の小タスクを選んでください。" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase設定を確認してください。" }, { status: 500 });
  }

  if (action === "delete") {
    const { error } = await supabase
      .from("operation_tasks")
      .delete()
      .in("id", ids)
      .eq("project_id", projectId)
      .not("parent_task_id", "is", null);

    if (error) {
      console.error("Failed to bulk delete project tasks:", error.message);
      return NextResponse.json({ ok: false, message: "削除に失敗しました。" }, { status: 500 });
    }

    revalidateProjectViews(projectId);
    return NextResponse.json({ ok: true, message: `選択した小タスク${ids.length}件を削除しました。` });
  }

  const category = readUnion(body?.category, CATEGORIES);
  const status = readUnion(body?.status, STATUSES);
  const priority = readUnion(body?.priority, PRIORITIES);
  const assigneeId = readAssigneeId(body?.assigneeId);
  const dueDate = typeof body?.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) ? body.dueDate : null;
  const clearDueDate = body?.clearDueDate === true;
  const updatePayload: {
    assignee_id?: string | null;
    category?: TaskCategory;
    due_date?: string | null;
    owner?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
  } = {};

  if (category) updatePayload.category = category;
  if (status) updatePayload.status = status;
  if (priority) updatePayload.priority = priority;
  if (assigneeId !== undefined) {
    updatePayload.assignee_id = assigneeId;
    updatePayload.owner = (await getAssigneeName(assigneeId)) ?? "未割当";
  }
  if (clearDueDate) {
    updatePayload.due_date = null;
  } else if (dueDate) {
    updatePayload.due_date = dueDate;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ ok: false, message: "一括更新する項目を選んでください。" }, { status: 400 });
  }

  const { error } = await supabase
    .from("operation_tasks")
    .update(updatePayload)
    .in("id", ids)
    .eq("project_id", projectId)
    .not("parent_task_id", "is", null);

  if (error) {
    console.error("Failed to bulk update project tasks:", error.message);
    return NextResponse.json({ ok: false, message: "更新に失敗しました。" }, { status: 500 });
  }

  revalidateProjectViews(projectId);
  return NextResponse.json({ ok: true, message: `選択した小タスク${ids.length}件を更新しました。` });
}

function readUnion<T extends readonly string[]>(value: unknown, options: T): T[number] | null {
  return typeof value === "string" && options.includes(value) ? value : null;
}

function readAssigneeId(value: unknown) {
  if (value === "__none__") {
    return null;
  }

  return typeof value === "string" && isUuid(value) ? value : undefined;
}

async function getAssigneeName(assigneeId: string | null) {
  if (!assigneeId) {
    return null;
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from("employees").select("name").eq("id", assigneeId).single();

  if (error) {
    console.error("Failed to fetch assignee:", error.message);
    return null;
  }

  return data.name;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
