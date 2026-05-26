import { NextResponse } from "next/server";
import { revalidateProjectViews } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/server";

type RequestBody = {
  checked?: unknown;
  checkedById?: unknown;
  regularTaskId?: unknown;
  weekStartDate?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const regularTaskId = typeof body?.regularTaskId === "string" && isUuid(body.regularTaskId) ? body.regularTaskId : null;
  const checkedById = typeof body?.checkedById === "string" && isUuid(body.checkedById) ? body.checkedById : null;
  const weekStartDate = typeof body?.weekStartDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.weekStartDate) ? body.weekStartDate : null;
  const checked = body?.checked === true;

  if (!regularTaskId || !weekStartDate) {
    return NextResponse.json({ ok: false, message: "入力内容を確認してください。" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase設定を確認してください。" }, { status: 500 });
  }

  const { data: regularTask, error: taskError } = await supabase
    .from("project_regular_tasks")
    .select("project_id")
    .eq("id", regularTaskId)
    .eq("is_active", true)
    .maybeSingle();

  if (taskError || !regularTask) {
    console.error("Failed to fetch project regular task:", taskError?.message ?? "Not found");
    return NextResponse.json({ ok: false, message: "定例業務が見つかりません。" }, { status: 404 });
  }

  if (checked) {
    const { error } = await supabase.from("project_regular_task_checks").upsert(
      {
        checked_at: new Date().toISOString(),
        checked_by_id: checkedById,
        regular_task_id: regularTaskId,
        week_start_date: weekStartDate
      },
      { onConflict: "regular_task_id,week_start_date" }
    );

    if (error) {
      console.error("Failed to check project regular task:", error.message);
      return NextResponse.json({ ok: false, message: "チェック更新に失敗しました。" }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("project_regular_task_checks")
      .delete()
      .eq("regular_task_id", regularTaskId)
      .eq("week_start_date", weekStartDate);

    if (error) {
      console.error("Failed to uncheck project regular task:", error.message);
      return NextResponse.json({ ok: false, message: "チェック解除に失敗しました。" }, { status: 500 });
    }
  }

  revalidateProjectViews(regularTask.project_id);
  return NextResponse.json({ ok: true, checked });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
