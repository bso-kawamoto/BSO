import type { CalendarEvent, Employee, OperationTask } from "@/lib/types";

export const sampleEmployees: Employee[] = [
  "河本",
  "高橋",
  "大鋸",
  "松本",
  "安藤",
  "平賀",
  "天木",
  "草間",
  "上野",
  "大橋",
  "花里"
].map((name) => ({
  id: `sample-employee-${name}`,
  name,
  role: name === "河本" ? "管理者" : "社員",
  email: null,
  auth_user_id: null,
  is_admin: name === "豐ｳ譛ｬ",
  is_active: true,
  created_at: "2026-04-29T00:00:00.000Z",
  updated_at: "2026-04-29T00:00:00.000Z"
}));

export const sampleProjects = [
  {
    id: "sample-project-1",
    name: "お伊勢さん杯",
    description: "大会運営の準備案件",
    due_date: "2026-06-30",
    is_archived: false,
    created_at: "2026-04-29T00:00:00.000Z",
    updated_at: "2026-04-29T00:00:00.000Z"
  }
];

export const sampleTasks: OperationTask[] = [
  {
    id: "sample-1",
    project_id: "sample-project-1",
    parent_task_id: null,
    assignee_id: null,
    task_level: "中タスク",
    title: "球場手配",
    description: "大会日程に合う球場を押さえる。",
    memo: "候補球場へ空き状況を確認中。",
    status: "未着手",
    category: "運用",
    priority: "高",
    owner: "Ops",
    due_date: "2026-05-20",
    created_at: "2026-04-29T00:00:00.000Z",
    updated_at: "2026-04-29T00:00:00.000Z"
  },
  {
    id: "sample-2",
    project_id: "sample-project-1",
    parent_task_id: null,
    assignee_id: "sample-employee-河本",
    task_level: "中タスク",
    title: "審判手配",
    description: "必要人数と依頼先を確定する。",
    memo: null,
    status: "進行中",
    category: "運用",
    priority: "中",
    owner: "河本",
    due_date: "2026-05-25",
    created_at: "2026-04-28T00:00:00.000Z",
    updated_at: "2026-04-29T00:00:00.000Z"
  },
  {
    id: "sample-3",
    project_id: "sample-project-1",
    parent_task_id: null,
    assignee_id: null,
    task_level: "中タスク",
    title: "協賛関係",
    description: "協賛先の洗い出しから営業まで進める。",
    memo: "営業メールの文面確認待ち。",
    status: "確認待ち",
    category: "営業",
    priority: "低",
    owner: "社長",
    due_date: "2026-06-10",
    created_at: "2026-04-27T00:00:00.000Z",
    updated_at: "2026-04-28T00:00:00.000Z"
  },
  {
    id: "sample-4",
    project_id: "sample-project-1",
    parent_task_id: "sample-3",
    assignee_id: "sample-employee-河本",
    task_level: "小タスク",
    title: "協賛リスト作成",
    description: "候補企業と担当者を一覧化する。",
    memo: null,
    status: "未着手",
    category: "営業",
    priority: "中",
    owner: "河本",
    due_date: "2026-05-15",
    created_at: "2026-04-26T00:00:00.000Z",
    updated_at: "2026-04-29T00:00:00.000Z"
  }
];

export const sampleCalendarEvents: CalendarEvent[] = [
  {
    id: "sample-calendar-1",
    project_id: "sample-project-1",
    assignee_id: "sample-employee-河本",
    title: "審判打ち合わせ",
    event_date: "2026-05-10",
    end_date: null,
    is_all_day: false,
    start_time: "10:00",
    end_time: "11:00",
    location: "事務所",
    memo: null,
    owner: "河本",
    created_at: "2026-04-29T00:00:00.000Z",
    updated_at: "2026-04-29T00:00:00.000Z"
  },
  {
    id: "sample-calendar-2",
    project_id: "sample-project-1",
    assignee_id: null,
    title: "球場下見",
    event_date: "2026-05-18",
    end_date: null,
    is_all_day: false,
    start_time: "14:00",
    end_time: null,
    location: "球場",
    memo: null,
    owner: "未割当",
    created_at: "2026-04-29T00:00:00.000Z",
    updated_at: "2026-04-29T00:00:00.000Z"
  }
];
