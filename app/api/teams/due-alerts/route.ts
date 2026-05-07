import { NextResponse } from "next/server";
import { sendTeamsDueAlerts } from "@/lib/teams-notifier";
import { getProjects, getTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
    }
  }

  const [tasks, projects] = await Promise.all([getTasks(), getProjects(true)]);
  const result = await sendTeamsDueAlerts(tasks, projects);

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
