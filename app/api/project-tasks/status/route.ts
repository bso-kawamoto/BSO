import { NextResponse } from "next/server";
import { revalidateProjectViews } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/server";
import { STATUSES, type TaskStatus } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { id?: unknown; projectId?: unknown; status?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const status = typeof body?.status === "string" && STATUSES.includes(body.status as TaskStatus) ? (body.status as TaskStatus) : null;

  if (!id || !projectId || !status) {
    return NextResponse.json({ ok: false, message: "入力内容を確認してください。" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase設定を確認してください。" }, { status: 500 });
  }

  const { error } = await supabase.from("operation_tasks").update({ status }).eq("id", id).eq("project_id", projectId);

  if (error) {
    console.error("Failed to update project task status:", error.message);
    return NextResponse.json({ ok: false, message: "更新に失敗しました。" }, { status: 500 });
  }

  revalidateProjectViews(projectId);
  return NextResponse.json({ ok: true, message: "ステータスを更新しました。" });
}
