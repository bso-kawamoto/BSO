import type { TaskCategory, TaskLevel, TaskPriority, TaskStatus } from "@/lib/types";

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          due_date: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          due_date?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          due_date?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      employees: {
        Row: {
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
        Insert: {
          id?: string;
          name: string;
          role?: string;
          email?: string | null;
          auth_user_id?: string | null;
          is_admin?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: string;
          email?: string | null;
          auth_user_id?: string | null;
          is_admin?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      operation_tasks: {
        Row: {
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
        Insert: {
          id?: string;
          project_id?: string | null;
          parent_task_id?: string | null;
          assignee_id?: string | null;
          task_level?: TaskLevel;
          title: string;
          description?: string | null;
          memo?: string | null;
          status?: TaskStatus;
          category: TaskCategory;
          priority?: TaskPriority;
          owner?: string;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          parent_task_id?: string | null;
          assignee_id?: string | null;
          task_level?: TaskLevel;
          title?: string;
          description?: string | null;
          memo?: string | null;
          status?: TaskStatus;
          category?: TaskCategory;
          priority?: TaskPriority;
          owner?: string;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      calendar_events: {
        Row: {
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
        Insert: {
          id?: string;
          project_id?: string | null;
          assignee_id?: string | null;
          title: string;
          event_date: string;
          end_date?: string | null;
          is_all_day?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          memo?: string | null;
          owner?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          assignee_id?: string | null;
          title?: string;
          event_date?: string;
          end_date?: string | null;
          is_all_day?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          memo?: string | null;
          owner?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
