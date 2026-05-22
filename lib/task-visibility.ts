import type { CurrentViewer } from "@/lib/auth";
import type { Employee, OperationTask, TaskCategory } from "@/lib/types";

const CATEGORY_TEAM_NAMES = {
  大会: ["高橋", "大鋸", "松本", "安藤", "平賀", "天木", "大橋"],
  物販: ["高橋", "安藤", "草間", "宮田", "上野"],
  チーム: ["大鋸", "高橋", "安藤"]
} as const;

const PART_TIME_NAMES = ["安藤", "宮田", "草間", "上野", "天木", "大橋", "花里"];
const PART_TIME_LEADER_NAMES = ["安藤"];

export function filterTasksForViewer(tasks: OperationTask[], viewer: CurrentViewer, employees: Employee[] = []) {
  if (viewer.isAdmin) {
    return tasks;
  }

  return tasks.filter((task) => canViewerSeeTask(task, viewer, employees));
}

export function filterEmployeesForViewer(employees: Employee[], viewer: CurrentViewer) {
  if (viewer.isAdmin) {
    return employees;
  }

  if (isPartTimeLeader(viewer.name)) {
    return employees.filter((employee) => employee.id === viewer.employee?.id || isPartTimeMember(employee.name));
  }

  return viewer.employee ? [viewer.employee] : [];
}

function canViewerSeeTask(task: OperationTask, viewer: CurrentViewer, employees: Employee[]) {
  if (!task.parent_task_id) {
    return true;
  }

  if (task.assignee_id === viewer.employee?.id) {
    return true;
  }

  if (canViewerSeeCategory(task.category, viewer.name)) {
    return true;
  }

  if (isPartTimeLeader(viewer.name)) {
    const assignee = employees.find((employee) => employee.id === task.assignee_id);
    return Boolean(assignee && isPartTimeMember(assignee.name));
  }

  return false;
}

function canViewerSeeCategory(category: TaskCategory, viewerName: string) {
  const teams = CATEGORY_TEAM_NAMES as Partial<Record<TaskCategory, readonly string[]>>;
  return Boolean(teams[category]?.includes(viewerName));
}

function isPartTimeLeader(name: string) {
  return PART_TIME_LEADER_NAMES.includes(name);
}

function isPartTimeMember(name: string) {
  return PART_TIME_NAMES.includes(name);
}
