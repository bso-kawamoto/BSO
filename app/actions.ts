"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from "@/lib/auth";
import { revalidateProjectViews } from "@/lib/revalidate";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { sendTeamsDueAlerts, sendTeamsTaskAssignedAlert } from "@/lib/teams-notifier";
import { getProjects, getTasks } from "@/lib/tasks";
import {
  CATEGORIES,
  MIDDLE_TASK_CATEGORY_MAP,
  MANAGERS,
  MIDDLE_TASK_TEMPLATES,
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

export async function sendTeamsDueAlert() {
  const [tasks, projects] = await Promise.all([getTasks(), getProjects(true)]);
  const result = await sendTeamsDueAlerts(tasks, projects);

  if (!result.ok) {
    redirect(`/admin?teams=${result.reason}`);
  }

  redirect(`/admin?teams=${result.reason}&count=${result.count}`);
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

  const { data, error } = await supabase
    .from("projects")
    .insert({
    name,
    description: null,
    due_date: dueDate
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create project:", error?.message ?? "No project returned");
    redirect("/?project=error");
  }

  const { error: taskError } = await supabase.from("operation_tasks").insert(
    MIDDLE_TASK_TEMPLATES.map((title) => ({
      project_id: data.id,
      parent_task_id: null,
      assignee_id: null,
      task_level: "中タスク" as const,
      title,
      category: MIDDLE_TASK_CATEGORY_MAP[title],
      status: "未着手" as const,
      priority: "中" as const,
      owner: "未割当",
      requested_by_id: null,
      requested_by_name: null,
      description: null,
      memo: null,
      due_date: null
    }))
  );

  if (taskError) {
    console.error("Failed to create default middle tasks:", taskError.message);
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

export async function updateProjectManagement(formData: FormData) {
  const id = readNullableUuid(formData, "project_id");
  const name = readText(formData, "project_name");
  const dueDate = readDate(formData, "project_due_date", false);

  if (!id || !name) {
    redirect("/admin?projectUpdate=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect("/admin?projectUpdate=missing-env");
  }

  const { error } = await supabase
    .from("projects")
    .update({
      name,
      due_date: dueDate
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update project management:", error.message);
    redirect("/admin?projectUpdate=error");
  }

  revalidateProjectViews(id);
  redirect("/admin?projectUpdate=success");
}

export async function toggleProjectArchiveManagement(formData: FormData) {
  const id = readNullableUuid(formData, "project_id");
  const shouldArchive = formData.get("archive") === "true";

  if (!id) {
    redirect("/admin?projectUpdate=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect("/admin?projectUpdate=missing-env");
  }

  const { error } = await supabase.from("projects").update({ is_archived: shouldArchive }).eq("id", id);

  if (error) {
    console.error("Failed to toggle project archive:", error.message);
    redirect("/admin?projectUpdate=error");
  }

  revalidateProjectViews(id);
  redirect(shouldArchive ? "/admin?projectUpdate=archived" : "/admin?projectUpdate=restored");
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
  const requester = await readRequester(formData);
  const taskLevel = parentTaskId ? TASK_LEVELS[1] : TASK_LEVELS[0];
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
    parent_task_id: taskLevel === TASK_LEVELS[1] ? parentTaskId : null,
    assignee_id: assigneeId,
    task_level: taskLevel,
    title,
    category,
    status,
    priority: "中",
    owner: assigneeName ?? "未割当",
    requested_by_id: requester.id,
    requested_by_name: requester.name,
    description: null,
    memo,
    due_date: dueDate
  });

  if (error) {
    console.error("Failed to create operation task:", error.message);
    redirect("/?created=error");
  }

  await notifyTaskAssigned({
    assigneeName,
    category,
    dueDate,
    projectId,
    taskLevel,
    title
  });

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
  const requester = await readRequester(formData);
  const taskLevel = parentTaskId ? TASK_LEVELS[1] : TASK_LEVELS[0];
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
    parent_task_id: taskLevel === TASK_LEVELS[1] ? parentTaskId : null,
    assignee_id: assigneeId,
    task_level: taskLevel,
    title,
    category,
    status,
    priority: "中",
    owner: assigneeName ?? "未割当",
    requested_by_id: requester.id,
    requested_by_name: requester.name,
    description: null,
    memo,
    due_date: dueDate
  });

  if (error) {
    console.error("Failed to create project task:", error.message);
    redirect(`/projects/${projectId}?created=error`);
  }

  await notifyTaskAssigned({
    assigneeName,
    category,
    dueDate,
    projectId,
    taskLevel,
    title
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?created=success`);
}

export async function createProjectSubtasks(formData: FormData) {
  const projectId = readNullableUuid(formData, "project_id");
  const parentTaskId = readNullableUuid(formData, "parent_task_id");
  const titles = readTaskTitleLines(formData, "bulk_titles");
  const category = readCategory(formData);
  const status = readStatus(formData);
  const priority = readPriority(formData) ?? PRIORITIES[1];
  const assigneeId = readNullableUuid(formData, "assignee_id");
  const requester = await readRequester(formData);
  const dueDate = readOptionalDate(formData);
  const memo = readLongText(formData, "memo");

  if (!projectId || !parentTaskId || titles.length === 0 || !category || !status) {
    redirect(projectId ? `/projects/${projectId}?created=invalid` : "/?created=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectId}?created=missing-env`);
  }

  const assigneeName = await getAssigneeName(assigneeId);
  const { error } = await supabase.from("operation_tasks").insert(
    titles.map((title) => ({
      project_id: projectId,
      parent_task_id: parentTaskId,
      assignee_id: assigneeId,
      task_level: TASK_LEVELS[1],
      title,
      category,
      status,
      priority,
      owner: assigneeName ?? "未割当",
      requested_by_id: requester.id,
      requested_by_name: requester.name,
      description: null,
      memo,
      due_date: dueDate
    }))
  );

  if (error) {
    console.error("Failed to create project subtasks:", error.message);
    redirect(`/projects/${projectId}?created=error`);
  }

  await notifyTaskAssigned({
    assigneeName,
    category,
    dueDate,
    projectId,
    taskLevel: TASK_LEVELS[1],
    title: `${titles.length}件の小タスクをまとめて追加`
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/employees");
  revalidatePath("/today");
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

export async function updateTaskDetails(formData: FormData) {
  const id = readText(formData, "id");
  const title = readText(formData, "title");
  const category = readCategory(formData);
  const status = readStatus(formData);
  const priority = readPriority(formData);
  const dueDate = readOptionalDate(formData);
  const projectId = readNullableUuid(formData, "project_id");
  const assigneeId = readNullableUuid(formData, "assignee_id");
  const requester = await readRequester(formData);
  const memo = readLongText(formData, "memo");

  if (!id || !title || !category || !status || !priority) {
    redirect("/?updated=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect("/?updated=missing-env");
  }

  const assigneeName = await getAssigneeName(assigneeId);
  const { error } = await supabase
    .from("operation_tasks")
    .update({
      title,
      owner: assigneeName ?? "未割当",
      assignee_id: assigneeId,
      requested_by_id: requester.id,
      requested_by_name: requester.name,
      category,
      status,
      priority,
      memo,
      project_id: projectId,
      due_date: dueDate
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update task details:", error.message);
    redirect("/?updated=error");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/employees");
  revalidatePath("/today");
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }
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
  const requester = await readRequester(formData);
  const taskLevel = parentTaskId ? TASK_LEVELS[1] : TASK_LEVELS[0];

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
      requested_by_id: requester.id,
      requested_by_name: requester.name,
      category,
      status,
      priority,
      memo,
      due_date: dueDate,
      project_id: projectId,
      parent_task_id: taskLevel === TASK_LEVELS[1] ? parentTaskId : null,
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

export async function bulkUpdateTaskManagement(formData: FormData) {
  const ids = formData
    .getAll("task_ids")
    .filter((value): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
    .slice(0, 40);
  const category = readOptionalCategory(formData, "bulk_category");
  const status = readOptionalStatus(formData, "bulk_status");
  const priority = readOptionalPriority(formData, "bulk_priority");
  const projectId = readBulkNullableUuid(formData, "bulk_project_id");
  const assigneeId = readBulkNullableUuid(formData, "bulk_assignee_id");
  const dueDate = readDate(formData, "bulk_due_date", false);
  const clearDueDate = readBoolean(formData, "bulk_clear_due_date");

  if (ids.length === 0) {
    redirect("/admin?bulk=invalid");
  }

  const updatePayload: {
    assignee_id?: string | null;
    category?: TaskCategory;
    due_date?: string | null;
    owner?: string;
    priority?: TaskPriority;
    project_id?: string | null;
    status?: TaskStatus;
  } = {};

  if (category) updatePayload.category = category;
  if (status) updatePayload.status = status;
  if (priority) updatePayload.priority = priority;
  if (projectId !== undefined) updatePayload.project_id = projectId;
  if (assigneeId !== undefined) {
    updatePayload.assignee_id = assigneeId;
    updatePayload.owner = (await getAssigneeName(assigneeId)) ?? "未割当";
  }
  if (clearDueDate) {
    updatePayload.due_date = null;
  } else if (dueDate) {
    updatePayload.due_date = dueDate;
  }

  if (Object.keys(updatePayload).length === 0) {
    redirect("/admin?bulk=empty");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect("/admin?bulk=missing-env");
  }

  const { error } = await supabase.from("operation_tasks").update(updatePayload).in("id", ids);

  if (error) {
    console.error("Failed to bulk update tasks:", error.message);
    redirect("/admin?bulk=error");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/employees");
  revalidatePath("/today");
  redirect(`/admin?bulk=success&count=${ids.length}`);
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
  const requester = await readRequester(formData);
  const taskLevel = parentTaskId ? TASK_LEVELS[1] : TASK_LEVELS[0];
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
      requested_by_id: requester.id,
      requested_by_name: requester.name,
      category,
      status,
      priority,
      memo,
      due_date: dueDate,
      project_id: projectId,
      parent_task_id: taskLevel === TASK_LEVELS[1] ? parentTaskId : null,
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

export async function updateProjectTaskStatus(formData: FormData) {
  const projectId = readNullableUuid(formData, "project_id");
  const id = readText(formData, "id");
  const status = readStatus(formData);

  if (!projectId || !id || !status) {
    redirect(projectId ? `/projects/${projectId}?updated=invalid` : "/?updated=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectId}?updated=missing-env`);
  }

  const { error } = await supabase.from("operation_tasks").update({ status }).eq("id", id).eq("project_id", projectId);

  if (error) {
    console.error("Failed to update project task status:", error.message);
    redirect(`/projects/${projectId}?updated=error`);
  }

  revalidateProjectViews(projectId);
  redirect(`/projects/${projectId}?updated=success#task-${id}`);
}

export async function bulkUpdateProjectTasks(formData: FormData) {
  const projectId = readNullableUuid(formData, "project_id");
  const ids = readTaskIds(formData).slice(0, 300);
  const category = readOptionalCategory(formData, "bulk_category");
  const status = readOptionalStatus(formData, "bulk_status");
  const priority = readOptionalPriority(formData, "bulk_priority");
  const assigneeId = readBulkNullableUuid(formData, "bulk_assignee_id");
  const dueDate = readDate(formData, "bulk_due_date", false);
  const clearDueDate = readBoolean(formData, "bulk_clear_due_date");

  if (!projectId || ids.length === 0) {
    redirect(projectId ? `/projects/${projectId}?updated=invalid` : "/?updated=invalid");
  }

  const updatePayload: {
    assignee_id?: string | null;
    category?: TaskCategory;
    due_date?: string | null;
    owner?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
  } = {};

  if (category) updatePayload.category = category;
  if (status) updatePayload.status = status;
  if (priority) updatePayload.priority = priority;
  if (assigneeId !== undefined) {
    updatePayload.assignee_id = assigneeId;
    updatePayload.owner = (await getAssigneeName(assigneeId)) ?? "未割当";
  }
  if (clearDueDate) {
    updatePayload.due_date = null;
  } else if (dueDate) {
    updatePayload.due_date = dueDate;
  }

  if (Object.keys(updatePayload).length === 0) {
    redirect(`/projects/${projectId}?updated=empty`);
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectId}?updated=missing-env`);
  }

  const { error } = await supabase
    .from("operation_tasks")
    .update(updatePayload)
    .in("id", ids)
    .eq("project_id", projectId)
    .not("parent_task_id", "is", null);

  if (error) {
    console.error("Failed to bulk update project tasks:", error.message);
    redirect(`/projects/${projectId}?updated=error`);
  }

  revalidateProjectViews(projectId);
  redirect(`/projects/${projectId}?updated=bulk-success&count=${ids.length}`);
}

export async function bulkDeleteProjectTasks(formData: FormData) {
  const projectId = readNullableUuid(formData, "project_id");
  const ids = readTaskIds(formData).slice(0, 300);

  if (!projectId || ids.length === 0) {
    redirect(projectId ? `/projects/${projectId}?deleted=invalid` : "/?deleted=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectId}?deleted=missing-env`);
  }

  const { error } = await supabase
    .from("operation_tasks")
    .delete()
    .in("id", ids)
    .eq("project_id", projectId)
    .not("parent_task_id", "is", null);

  if (error) {
    console.error("Failed to bulk delete project tasks:", error.message);
    redirect(`/projects/${projectId}?deleted=error`);
  }

  revalidateProjectViews(projectId);
  redirect(`/projects/${projectId}?deleted=bulk-success&count=${ids.length}`);
}

export async function updateProjectTaskOrder(formData: FormData) {
  const projectId = readNullableUuid(formData, "project_id");
  const ids = formData
    .getAll("task_ids")
    .filter((value): value is string => typeof value === "string" && isUuid(value));

  if (!projectId || ids.length === 0) {
    redirect(projectId ? `/projects/${projectId}?updated=invalid` : "/?updated=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectId}?updated=missing-env`);
  }

  const results = await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("operation_tasks")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("project_id", projectId)
        .is("parent_task_id", null)
    )
  );
  const error = results.find((result) => result.error)?.error;

  if (error) {
    console.error("Failed to update project task order:", error.message);
    redirect(`/projects/${projectId}?updated=error`);
  }

  revalidateProjectViews(projectId);
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

export async function createRegularTask(formData: FormData) {
  const assigneeId = readNullableUuid(formData, "assignee_id");
  const title = readText(formData, "title");
  const memo = readLongText(formData, "memo");

  if (!assigneeId || !title) {
    redirect("/admin?regular=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect("/admin?regular=missing-env");
  }

  const { error } = await supabase.from("regular_tasks").insert({
    assignee_id: assigneeId,
    title,
    memo
  });

  if (error) {
    console.error("Failed to create regular task:", error.message);
    redirect("/admin?regular=error");
  }

  revalidatePath("/admin");
  revalidatePath("/employees");
  revalidatePath("/today");
  redirect("/admin?regular=success");
}

export async function deleteRegularTask(formData: FormData) {
  const id = readText(formData, "id");

  if (!id) {
    redirect("/admin?regular=invalid");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    redirect("/admin?regular=missing-env");
  }

  const { error } = await supabase.from("regular_tasks").update({ is_active: false }).eq("id", id);

  if (error) {
    console.error("Failed to delete regular task:", error.message);
    redirect("/admin?regular=error");
  }

  revalidatePath("/admin");
  revalidatePath("/employees");
  revalidatePath("/today");
  redirect("/admin?regular=deleted");
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

function readTaskIds(formData: FormData) {
  return formData.getAll("task_ids").filter((value): value is string => typeof value === "string" && isUuid(value));
}

function readTaskTitleLines(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return [];
  }

  return [...new Set(value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => line.slice(0, 120)))].slice(0, 30);
}

function readCategory(formData: FormData): TaskCategory | null {
  const value = formData.get("category");
  return typeof value === "string" && CATEGORIES.includes(value as TaskCategory)
    ? (value as TaskCategory)
    : null;
}

function readOptionalCategory(formData: FormData, key: string): TaskCategory | null {
  const value = formData.get(key);
  return typeof value === "string" && CATEGORIES.includes(value as TaskCategory) ? (value as TaskCategory) : null;
}

function readStatus(formData: FormData): TaskStatus | null {
  const value = formData.get("status");
  return typeof value === "string" && STATUSES.includes(value as TaskStatus) ? (value as TaskStatus) : null;
}

function readOptionalStatus(formData: FormData, key: string): TaskStatus | null {
  const value = formData.get(key);
  return typeof value === "string" && STATUSES.includes(value as TaskStatus) ? (value as TaskStatus) : null;
}

function readPriority(formData: FormData): TaskPriority | null {
  const value = formData.get("priority");
  return typeof value === "string" && PRIORITIES.includes(value as TaskPriority)
    ? (value as TaskPriority)
    : null;
}

function readOptionalPriority(formData: FormData, key: string): TaskPriority | null {
  const value = formData.get(key);
  return typeof value === "string" && PRIORITIES.includes(value as TaskPriority) ? (value as TaskPriority) : null;
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

async function notifyTaskAssigned({
  assigneeName,
  category,
  dueDate,
  projectId,
  taskLevel,
  title
}: {
  assigneeName: string | null;
  category: TaskCategory;
  dueDate: string | null;
  projectId: string | null;
  taskLevel: TaskLevel;
  title: string;
}) {
  if (!assigneeName) {
    return;
  }

  const projectName = projectId ? await getProjectName(projectId) : null;
  const result = await sendTeamsTaskAssignedAlert({
    assigneeName,
    category,
    dueDate,
    projectName,
    taskLevel,
    title
  });

  if (!result.ok && result.reason !== "missing-webhook") {
    console.error("Teams task assignment notification failed:", result.reason);
  }
}

function readNullableUuid(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return isUuid(value) ? value : null;
}

function readBulkNullableUuid(formData: FormData, key: string) {
  const value = formData.get(key);

  if (value === "__none__") {
    return null;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  return isUuid(value) ? value : undefined;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getProjectName(projectId: string) {
  const supabase = createAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from("projects").select("name").eq("id", projectId).single();

  if (error) {
    console.error("Failed to fetch project:", error.message);
    return null;
  }

  return data.name;
}

async function readRequester(formData: FormData) {
  const value = formData.get("requested_by_id");

  if (value === "__president__") {
    return { id: null, name: "社長" };
  }

  const id = readNullableUuid(formData, "requested_by_id");
  return { id, name: await getAssigneeName(id) };
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
