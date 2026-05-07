import type { OperationTask, Project } from "@/lib/types";

type DueAlertTask = OperationTask & {
  dueGroup: "overdue" | "today" | "soon";
  projectName: string;
};

export async function sendTeamsDueAlerts(tasks: OperationTask[], projects: Project[]) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;

  if (!webhookUrl) {
    return { ok: false as const, reason: "missing-webhook" as const, count: 0 };
  }

  const alertTasks = buildDueAlertTasks(tasks, projects);

  if (alertTasks.length === 0) {
    return { ok: true as const, reason: "no-targets" as const, count: 0 };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildMessageCard(alertTasks))
  });

  if (!response.ok) {
    console.error("Failed to send Teams alert:", response.status, await response.text().catch(() => ""));
    return { ok: false as const, reason: "send-failed" as const, count: alertTasks.length };
  }

  return { ok: true as const, reason: "sent" as const, count: alertTasks.length };
}

function buildDueAlertTasks(tasks: OperationTask[], projects: Project[]): DueAlertTask[] {
  const projectById = new Map(projects.map((project) => [project.id, project.name]));

  return tasks
    .filter((task) => task.status !== "完了")
    .map((task) => {
      const dueGroup = getDueGroup(task.due_date);
      if (!dueGroup) return null;

      return {
        ...task,
        dueGroup,
        projectName: projectById.get(task.project_id ?? "") ?? "案件なし"
      };
    })
    .filter((task): task is DueAlertTask => Boolean(task))
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
}

function buildMessageCard(tasks: DueAlertTask[]) {
  const overdue = tasks.filter((task) => task.dueGroup === "overdue");
  const today = tasks.filter((task) => task.dueGroup === "today");
  const soon = tasks.filter((task) => task.dueGroup === "soon");

  return {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    summary: "BSO Operation 期限アラート",
    themeColor: "0B2D5C",
    title: "BSO Operation 期限アラート",
    text: `対象タスク: ${tasks.length}件`,
    sections: [
      buildSection("期限切れ", overdue),
      buildSection("今日期限", today),
      buildSection("3日以内", soon)
    ].filter(Boolean)
  };
}

function buildSection(title: string, tasks: DueAlertTask[]) {
  if (tasks.length === 0) {
    return null;
  }

  return {
    activityTitle: `${title}: ${tasks.length}件`,
    facts: tasks.slice(0, 12).map((task) => ({
      name: task.due_date ?? "期限なし",
      value: `${task.title} / ${task.projectName} / ${task.owner}`
    }))
  };
}

function getDueGroup(dueDate: string | null) {
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dueDate}T00:00:00`);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000);

  if (diff < 0) return "overdue" as const;
  if (diff === 0) return "today" as const;
  if (diff <= 3) return "soon" as const;
  return null;
}
