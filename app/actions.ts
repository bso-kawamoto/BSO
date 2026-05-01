"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  CATEGORIES,
  MANAGERS,
  PRIORITIES,
  STATUSES,
  TASK_LEVELS,
  type Manager,
  type TaskCategory,
  type TaskLevel,
  type TaskPriority,
  type TaskStatus
} from "@/lib/types";

export async function login(formData: FormData) {
  const email = readEmail(formData, "email");
  const password = readText(formData, "password");
  const nextPath = readSafeRedirect(formData);

  if (!email || !password) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(nextPath)}`);
  }

  const supabase = createClient();

  if (!supabase) {
    redirect(`/login?error=missing-env&next=${encodeURIComponent(nextPath)}`);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.session) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(nextPath)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_ACCESS_COOKIE, data.session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: data.session.expires_in
  });
  cookieStore.set(AUTH_REFRESH_COOKIE, data.session.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  redirect(nextPath as Parameters<typeof redirect>[0]);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_ACCESS_COOKIE);
  cookieStore.delete(AUTH_REFRESH_COOKIE);
  redirect("/login");
}

export async function createProject(formData: FormData) {
  const name = readText(formData, "name");
  const dueDate = readOptionalDate(formData);

  if (!name) {
    redirect("/?project=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect("/?project=missing-env");
  }

  const { error } = await supabase.from("projects").insert({
    name,
    description: null,
    due_date: dueDate
  });

  if (error) {
    console.error("Failed to create project:", error.message);
    redirect("/?project=error");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/?project=success");
}

export async function updateProjectDetails(formData: FormData) {
  const id = readNullableUuid(formData, "project_id");
  const name = readText(formData, "project_name");
  const dueDate = readDate(formData, "project_due_date", false);

  if (!id || !name) {
    redirect(id ? `/projects/${id}?project=invalid` : "/?project=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/projects/${id}?project=missing-env`);
  }

  const { error } = await supabase
    .from("projects")
    .update({
      name,
      due_date: dueDate
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update project:", error.message);
    redirect(`/projects/${id}?project=error`);
  }

  revalidateProjectViews(id);
  redirect(`/projects/${id}?project=updated`);
}

export async function archiveProject(formData: FormData) {
  const id = readNullableUuid(formData, "project_id");

  if (!id) {
    redirect("/?project=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/projects/${id}?project=missing-env`);
  }

  const { error } = await supabase.from("projects").update({ is_archived: true }).eq("id", id);

  if (error) {
    console.error("Failed to archive project:", error.message);
    redirect(`/projects/${id}?project=error`);
  }

  revalidateProjectViews(id);
  redirect("/?project=archived");
}

export async function restoreProject(formData: FormData) {
  const id = readNullableUuid(formData, "project_id");

  if (!id) {
    redirect("/?project=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/projects/${id}?project=missing-env`);
  }

  const { error } = await supabase.from("projects").update({ is_archived: false }).eq("id", id);

  if (error) {
    console.error("Failed to restore project:", error.message);
    redirect(`/projects/${id}?project=error`);
  }

  revalidateProjectViews(id);
  redirect(`/projects/${id}?project=restored`);
}

export async function createTask(formData: FormData) {
  const title = readText(formData, "title");
  const category = readCategory(formData);
  const status = readStatus(formData);
  const projectId = readNullableUuid(formData, "project_id");
  const parentTaskId = readNullableUuid(formData, "parent_task_id");
  const assigneeId = readNullableUuid(formData, "assignee_id");
  const taskLevel = readTaskLevel(formData) ?? "中タスク";
  const memo = readLongText(formData, "memo");
  const dueDate = readOptionalDate(formData);

  if (!title || !category || !status) {
    redirect("/?created=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect("/?created=missing-env");
  }

  const assigneeName = await getAssigneeName(assigneeId);

  const { error } = await supabase.from("operation_tasks").insert({
    project_id: projectId,
    parent_task_id: taskLevel === "小タスク" ? parentTaskId : null,
    assignee_id: assigneeId,
    task_level: taskLevel,
    title,
    category,
    status,
    priority: "中",
    owner: assigneeName ?? "未割当",
    description: null,
    memo,
    due_date: dueDate
  });

  if (error) {
    console.error("Failed to create operation task:", error.message);
    redirect("/?created=error");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/?created=success");
}

export async function createProjectTask(formData: FormData) {
  const projectId = readNullableUuid(formData, "project_id");
  const title = readText(formData, "title");
  const category = readCategory(formData);
  const status = readStatus(formData);
  const parentTaskId = readNullableUuid(formData, "parent_task_id");
  const assigneeId = readNullableUuid(formData, "assignee_id");
  const taskLevel = readTaskLevel(formData) ?? "中タスク";
  const dueDate = readOptionalDate(formData);
  const memo = readLongText(formData, "memo");

  if (!projectId || !title || !category || !status) {
    redirect(projectId ? `/projects/${projectId}?created=invalid` : "/?created=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectId}?created=missing-env`);
  }

  const assigneeName = await getAssigneeName(assigneeId);

  const { error } = await supabase.from("operation_tasks").insert({
    project_id: projectId,
    parent_task_id: taskLevel === "小タスク" ? parentTaskId : null,
    assignee_id: assigneeId,
    task_level: taskLevel,
    title,
    category,
    status,
    priority: "中",
    owner: assigneeName ?? "未割当",
    description: null,
    memo,
    due_date: dueDate
  });

  if (error) {
    console.error("Failed to create project task:", error.message);
    redirect(`/projects/${projectId}?created=error`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?created=success`);
}

export async function createCalendarEvent(formData: FormData) {
  const title = readText(formData, "calendar_title");
  const eventDate = readRequiredDate(formData, "event_date");
  const endDate = readRequiredDate(formData, "end_date");
  const isAllDay = readBoolean(formData, "is_all_day");
  const startTime = readOptionalTime(formData, "start_time");
  const endTime = readOptionalTime(formData, "end_time");
  const location = readText(formData, "location");
  const projectId = readNullableUuid(formData, "calendar_project_id");
  const assigneeId = readNullableUuid(formData, "calendar_assignee_id");

  if (!title || !eventDate || !endDate || endDate < eventDate) {
    redirect("/?schedule=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect("/?schedule=missing-env");
  }

  const assigneeName = await getAssigneeName(assigneeId);

  const { error } = await supabase.from("calendar_events").insert({
    title,
    event_date: eventDate,
    end_date: endDate === eventDate ? null : endDate,
    is_all_day: isAllDay,
    start_time: isAllDay ? null : startTime,
    end_time: isAllDay ? null : endTime,
    location,
    project_id: projectId,
    assignee_id: assigneeId,
    memo: null,
    owner: assigneeName ?? "未割当"
  });

  if (error) {
    console.error("Failed to create calendar event:", error.message);
    redirect("/?schedule=error");
  }

  revalidatePath("/");
  revalidatePath("/calendar");
  redirect("/?schedule=success");
}

export async function createProjectCalendarEvent(formData: FormData) {
  const projectId = readNullableUuid(formData, "calendar_project_id");
  const title = readText(formData, "calendar_title");
  const eventDate = readRequiredDate(formData, "event_date");
  const endDate = readRequiredDate(formData, "end_date");
  const isAllDay = readBoolean(formData, "is_all_day");
  const startTime = readOptionalTime(formData, "start_time");
  const endTime = readOptionalTime(formData, "end_time");
  const location = readText(formData, "location");
  const assigneeId = readNullableUuid(formData, "calendar_assignee_id");

  if (!projectId || !title || !eventDate || !endDate || endDate < eventDate) {
    redirect(projectId ? `/projects/${projectId}?schedule=invalid` : "/?schedule=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectId}?schedule=missing-env`);
  }

  const assigneeName = await getAssigneeName(assigneeId);

  const { error } = await supabase.from("calendar_events").insert({
    title,
    event_date: eventDate,
    end_date: endDate === eventDate ? null : endDate,
    is_all_day: isAllDay,
    start_time: isAllDay ? null : startTime,
    end_time: isAllDay ? null : endTime,
    location,
    project_id: projectId,
    assignee_id: assigneeId,
    memo: null,
    owner: assigneeName ?? "未割当"
  });

  if (error) {
    console.error("Failed to create project calendar event:", error.message);
    redirect(`/projects/${projectId}?schedule=error`);
  }

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?schedule=success`);
}

export async function updateCalendarEvent(formData: FormData) {
  const id = readText(formData, "id");
  const title = readText(formData, "calendar_title");
  const eventDate = readRequiredDate(formData, "event_date");
  const endDate = readRequiredDate(formData, "end_date");
  const isAllDay = readBoolean(formData, "is_all_day");
  const startTime = readOptionalTime(formData, "start_time");
  const endTime = readOptionalTime(formData, "end_time");
  const location = readText(formData, "location");
  const memo = readLongText(formData, "memo");
  const projectId = readNullableUuid(formData, "calendar_project_id");
  const assigneeId = readNullableUuid(formData, "calendar_assignee_id");

  if (!id || !title || !eventDate || !endDate || endDate < eventDate) {
    redirect(id ? `/calendar/${id}?schedule=invalid` : "/calendar?schedule=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/calendar/${id}?schedule=missing-env`);
  }

  const assigneeName = await getAssigneeName(assigneeId);

  const { error } = await supabase
    .from("calendar_events")
    .update({
      title,
      event_date: eventDate,
      end_date: endDate === eventDate ? null : endDate,
      is_all_day: isAllDay,
      start_time: isAllDay ? null : startTime,
      end_time: isAllDay ? null : endTime,
      location,
      memo,
      project_id: projectId,
      assignee_id: assigneeId,
      owner: assigneeName ?? "未割当"
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update calendar event:", error.message);
    redirect(`/calendar/${id}?schedule=error`);
  }

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath(`/calendar/${id}`);
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }
  redirect(`/calendar/${id}?schedule=updated`);
}

export async function deleteCalendarEvent(formData: FormData) {
  const id = readText(formData, "id");

  if (!id) {
    redirect("/calendar?schedule=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/calendar/${id}?schedule=missing-env`);
  }

  const { error } = await supabase.from("calendar_events").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete calendar event:", error.message);
    redirect(`/calendar/${id}?schedule=error`);
  }

  revalidatePath("/");
  revalidatePath("/calendar");
  redirect("/?schedule=deleted");
}

export async function updateTaskStatus(formData: FormData) {
  const id = readText(formData, "id");
  const status = readStatus(formData);

  if (!id || !status) {
    redirect("/?updated=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect("/?updated=missing-env");
  }

  const { error } = await supabase.from("operation_tasks").update({ status }).eq("id", id);

  if (error) {
    console.error("Failed to update task status:", error.message);
    redirect("/?updated=error");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/?updated=success");
}

export async function updateTaskManagement(formData: FormData) {
  const manager = readManager(formData);
  const id = readText(formData, "id");
  const title = readText(formData, "title");
  const category = readCategory(formData);
  const status = readStatus(formData);
  const priority = readPriority(formData);
  const dueDate = readOptionalDate(formData);
  const projectId = readNullableUuid(formData, "project_id");
  const parentTaskId = readNullableUuid(formData, "parent_task_id");
  const assigneeId = readNullableUuid(formData, "assignee_id");
  const taskLevel = readTaskLevel(formData) ?? "中タスク";

  const memo = readLongText(formData, "memo");

  if (!manager || !id || !title || !category || !status || !priority) {
    redirect("/admin?updated=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/admin?manager=${encodeURIComponent(manager)}&updated=missing-env`);
  }

  const assigneeName = await getAssigneeName(assigneeId);

  const { error } = await supabase
    .from("operation_tasks")
    .update({
      title,
      owner: assigneeName ?? "未割当",
      assignee_id: assigneeId,
      category,
      status,
      priority,
      memo,
      due_date: dueDate,
      project_id: projectId,
      parent_task_id: taskLevel === "小タスク" ? parentTaskId : null,
      task_level: taskLevel
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update task management:", error.message);
    redirect(`/admin?manager=${encodeURIComponent(manager)}&updated=error`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin?manager=${encodeURIComponent(manager)}&updated=success`);
}

export async function updateProjectTask(formData: FormData) {
  const projectId = readNullableUuid(formData, "project_id");
  const id = readText(formData, "id");
  const title = readText(formData, "title");
  const category = readCategory(formData);
  const status = readStatus(formData);
  const priority = readPriority(formData);
  const dueDate = readOptionalDate(formData);
  const parentTaskId = readNullableUuid(formData, "parent_task_id");
  const assigneeId = readNullableUuid(formData, "assignee_id");
  const taskLevel = readTaskLevel(formData) ?? "中タスク";
  const memo = readLongText(formData, "memo");

  if (!projectId || !id || !title || !category || !status || !priority) {
    redirect(projectId ? `/projects/${projectId}?updated=invalid` : "/?updated=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectId}?updated=missing-env`);
  }

  const assigneeName = await getAssigneeName(assigneeId);

  const { error } = await supabase
    .from("operation_tasks")
    .update({
      title,
      owner: assigneeName ?? "未割当",
      assignee_id: assigneeId,
      category,
      status,
      priority,
      memo,
      due_date: dueDate,
      project_id: projectId,
      parent_task_id: taskLevel === "小タスク" ? parentTaskId : null,
      task_level: taskLevel
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update project task:", error.message);
    redirect(`/projects/${projectId}?updated=error`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?updated=success`);
}

export async function deleteProjectTask(formData: FormData) {
  const projectId = readNullableUuid(formData, "project_id");
  const id = readText(formData, "id");

  if (!projectId || !id) {
    redirect(projectId ? `/projects/${projectId}?deleted=invalid` : "/?deleted=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectId}?deleted=missing-env`);
  }

  const { error } = await supabase.from("operation_tasks").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete project task:", error.message);
    redirect(`/projects/${projectId}?deleted=error`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?deleted=success`);
}

export async function updateProjectCalendarEvent(formData: FormData) {
  const projectId = readNullableUuid(formData, "calendar_project_id");
  const id = readText(formData, "id");
  const title = readText(formData, "calendar_title");
  const eventDate = readRequiredDate(formData, "event_date");
  const endDate = readRequiredDate(formData, "end_date");
  const isAllDay = readBoolean(formData, "is_all_day");
  const startTime = readOptionalTime(formData, "start_time");
  const endTime = readOptionalTime(formData, "end_time");
  const location = readText(formData, "location");
  const assigneeId = readNullableUuid(formData, "calendar_assignee_id");

  if (!projectId || !id || !title || !eventDate || !endDate || endDate < eventDate) {
    redirect(projectId ? `/projects/${projectId}?schedule=invalid` : "/?schedule=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectId}?schedule=missing-env`);
  }

  const assigneeName = await getAssigneeName(assigneeId);

  const { error } = await supabase
    .from("calendar_events")
    .update({
      title,
      event_date: eventDate,
      end_date: endDate === eventDate ? null : endDate,
      is_all_day: isAllDay,
      start_time: isAllDay ? null : startTime,
      end_time: isAllDay ? null : endTime,
      location,
      assignee_id: assigneeId,
      owner: assigneeName ?? "未割当"
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update project calendar event:", error.message);
    redirect(`/projects/${projectId}?schedule=error`);
  }

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?schedule=updated`);
}

export async function deleteProjectCalendarEvent(formData: FormData) {
  const projectId = readNullableUuid(formData, "calendar_project_id");
  const id = readText(formData, "id");

  if (!projectId || !id) {
    redirect(projectId ? `/projects/${projectId}?schedule=invalid` : "/?schedule=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectId}?schedule=missing-env`);
  }

  const { error } = await supabase.from("calendar_events").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete project calendar event:", error.message);
    redirect(`/projects/${projectId}?schedule=error`);
  }

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?schedule=deleted`);
}

export async function deleteTask(formData: FormData) {
  const manager = readManager(formData);
  const id = readText(formData, "id");

  if (!manager || !id) {
    redirect("/admin?deleted=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/admin?manager=${encodeURIComponent(manager)}&deleted=missing-env`);
  }

  const { error } = await supabase.from("operation_tasks").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete task:", error.message);
    redirect(`/admin?manager=${encodeURIComponent(manager)}&deleted=error`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin?manager=${encodeURIComponent(manager)}&deleted=success`);
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : null;
}

function readEmail(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed.slice(0, 254) : null;
}

function readLongText(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1000) : null;
}

function readCategory(formData: FormData): TaskCategory | null {
  const value = formData.get("category");
  return typeof value === "string" && CATEGORIES.includes(value as TaskCategory)
    ? (value as TaskCategory)
    : null;
}

function readStatus(formData: FormData): TaskStatus | null {
  const value = formData.get("status");
  return typeof value === "string" && STATUSES.includes(value as TaskStatus) ? (value as TaskStatus) : null;
}

function readPriority(formData: FormData): TaskPriority | null {
  const value = formData.get("priority");
  return typeof value === "string" && PRIORITIES.includes(value as TaskPriority)
    ? (value as TaskPriority)
    : null;
}

function readTaskLevel(formData: FormData): TaskLevel | null {
  const value = formData.get("task_level");
  return typeof value === "string" && TASK_LEVELS.includes(value as TaskLevel) ? (value as TaskLevel) : null;
}

function readManager(formData: FormData): Manager | null {
  const value = formData.get("manager");
  return typeof value === "string" && MANAGERS.includes(value as Manager) ? (value as Manager) : null;
}

function readOptionalDate(formData: FormData) {
  return readDate(formData, "due_date", false);
}

function readRequiredDate(formData: FormData, key: string) {
  return readDate(formData, key, true);
}

function readDate(formData: FormData, key: string, required: boolean) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    return required ? null : null;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function readOptionalTime(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return /^\d{2}:\d{2}$/.test(value) ? value : null;
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function readSafeRedirect(formData: FormData) {
  const value = formData.get("next");

  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function revalidateProjectViews(projectId: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/calendar");
  revalidatePath("/employees");
  revalidatePath("/today");
  revalidatePath(`/projects/${projectId}`);
}

function readNullableUuid(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

async function getAssigneeName(assigneeId: string | null) {
  if (!assigneeId) {
    return null;
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from("employees").select("name").eq("id", assigneeId).single();

  if (error) {
    console.error("Failed to fetch assignee:", error.message);
    return null;
  }

  return data.name;
}
