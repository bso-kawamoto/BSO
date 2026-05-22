export const STATUSES = ["未着手", "進行中", "確認待ち", "完了"] as const;
export const CATEGORIES = ["大会", "ALLJAPAN", "スクール", "物販", "チーム", "イベント", "広報", "システム", "管理部"] as const;
export const PRIORITIES = ["低", "中", "高"] as const;
export const MANAGERS = ["社長", "河本"] as const;
export const TASK_LEVELS = ["中タスク", "小タスク"] as const;
export const MIDDLE_TASK_TEMPLATES = ["企画", "広報", "顧客対応", "運営", "管理", "製作", "調整", "システム", "当日対応", "振り返り"] as const;
export const MIDDLE_TASK_CATEGORY_MAP = {
  企画: "イベント",
  広報: "広報",
  顧客対応: "チーム",
  運営: "大会",
  管理: "管理部",
  製作: "広報",
  調整: "イベント",
  システム: "システム",
  当日対応: "大会",
  振り返り: "管理部"
} as const satisfies Record<(typeof MIDDLE_TASK_TEMPLATES)[number], TaskCategory>;
export const EMPLOYEE_NAMES = ["河本", "高橋", "大鋸", "松本", "安藤", "草間", "上野", "平賀", "宮田", "天木", "花里", "大橋"] as const;

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
  category: TaskCategory;
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

export type RegularTask = {
  id: string;
  assignee_id: string;
  title: string;
  memo: string | null;
  is_active: boolean;
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
  requested_by_id: string | null;
  requested_by_name: string | null;
  due_date: string | null;
  sort_order?: number | null;
  created_at: string;
  updated_at: string;
};
