export const STATUSES = ["未着手", "進行中", "確認待ち", "完了"] as const;
export const CATEGORIES = ["営業", "運用", "請求", "サポート", "管理"] as const;
export const PRIORITIES = ["低", "中", "高"] as const;
export const MANAGERS = ["社長", "河本"] as const;
export const TASK_LEVELS = ["中タスク", "小タスク"] as const;
export const EMPLOYEE_NAMES = ["河本", "高橋", "大鋸", "松本", "安藤", "平賀", "天木", "草間", "上野", "大橋", "花里"] as const;

export type TaskStatus = (typeof STATUSES)[number];
export type TaskCategory = (typeof CATEGORIES)[number];
export type TaskPriority = (typeof PRIORITIES)[number];
export type Manager = (typeof MANAGERS)[number];
export type TaskLevel = (typeof TASK_LEVELS)[number];

export type Employee = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  auth_user_id: string | null;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  due_date: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type CalendarEvent = {
  id: string;
  project_id: string | null;
  assignee_id: string | null;
  title: string;
  event_date: string;
  end_date: string | null;
  is_all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  memo: string | null;
  owner: string;
  created_at: string;
  updated_at: string;
};

export type OperationTask = {
  id: string;
  project_id: string | null;
  parent_task_id: string | null;
  assignee_id: string | null;
  task_level: TaskLevel;
  title: string;
  description: string | null;
  memo: string | null;
  status: TaskStatus;
  category: TaskCategory;
  priority: TaskPriority;
  owner: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};
