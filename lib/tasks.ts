import { createClient } from "@/lib/supabase/server";
import { compareEmployeesByCompanyOrder } from "@/lib/employee-order";
import { sampleCalendarEvents, sampleEmployees, sampleProjects, sampleTasks } from "@/lib/sample-data";
import type { CalendarEvent, Employee, OperationTask, Project } from "@/lib/types";

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const supabase = createClient();

  if (!supabase) {
    return sampleCalendarEvents;
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .select("id,project_id,assignee_id,title,event_date,end_date,is_all_day,start_time,end_time,location,memo,owner,created_at,updated_at")
    .order("event_date", { ascending: true });

  if (error) {
    console.error("Failed to fetch calendar events:", error.message);
    return sampleCalendarEvents;
  }

  return data ?? [];
}

export async function getEmployees(): Promise<Employee[]> {
  const supabase = createClient();

  if (!supabase) {
    return [...sampleEmployees].sort(compareEmployeesByCompanyOrder);
  }

  const { data, error } = await supabase
    .from("employees")
    .select("id,name,role,email,auth_user_id,is_admin,is_active,created_at,updated_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch employees:", error.message);
    const { data: legacyData, error: legacyError } = await supabase
      .from("employees")
      .select("id,name,role,is_active,created_at,updated_at")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (legacyError) {
      console.error("Failed to fetch legacy employees:", legacyError.message);
      return [...sampleEmployees].sort(compareEmployeesByCompanyOrder);
    }

    return (legacyData ?? []).map((employee) => ({
      ...employee,
      email: null,
      auth_user_id: null,
      is_admin: employee.name === "河本" || employee.name === "豐ｳ譛ｬ"
    })).sort(compareEmployeesByCompanyOrder);
  }

  return (data ?? []).sort(compareEmployeesByCompanyOrder);
}

export async function getProjects(includeArchived = false): Promise<Project[]> {
  const supabase = createClient();

  if (!supabase) {
    return includeArchived ? sampleProjects : sampleProjects.filter((project) => !project.is_archived);
  }

  let query = supabase
    .from("projects")
    .select("id,name,description,due_date,is_archived,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (!includeArchived) {
    query = query.eq("is_archived", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch projects:", error.message);
    const { data: legacyData, error: legacyError } = await supabase
      .from("projects")
      .select("id,name,description,due_date,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (legacyError) {
      console.error("Failed to fetch legacy projects:", legacyError.message);
      return includeArchived ? sampleProjects : sampleProjects.filter((project) => !project.is_archived);
    }

    return (legacyData ?? []).map((project) => ({
      ...project,
      is_archived: false
    }));
  }

  return data ?? [];
}

export async function getTasks(): Promise<OperationTask[]> {
  const supabase = createClient();

  if (!supabase) {
    return sampleTasks;
  }

  const { data, error } = await supabase
    .from("operation_tasks")
    .select(
      "id,project_id,parent_task_id,assignee_id,task_level,title,description,memo,status,category,priority,owner,due_date,created_at,updated_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch operation tasks:", error.message);
    const { data: legacyData, error: legacyError } = await supabase
      .from("operation_tasks")
      .select("id,project_id,parent_task_id,assignee_id,task_level,title,description,status,category,priority,owner,due_date,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (legacyError) {
      console.error("Failed to fetch legacy operation tasks:", legacyError.message);
      return sampleTasks;
    }

    return (legacyData ?? []).map((task) => ({
      ...task,
      memo: null
    }));
  }

  return data ?? [];
}
