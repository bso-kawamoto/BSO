import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getEmployees } from "@/lib/tasks";
import type { Employee } from "@/lib/types";

export const AUTH_ACCESS_COOKIE = "bso_access_token";
export const AUTH_REFRESH_COOKIE = "bso_refresh_token";

export type CurrentViewer =
  | {
      kind: "boss";
      value: "boss";
      name: string;
      employee: null;
      isAdmin: true;
      email: string;
      userId: string;
    }
  | {
      kind: "employee";
      value: string;
      name: string;
      employee: Employee;
      isAdmin: boolean;
      email: string;
      userId: string;
    };

export async function getCurrentViewer(employees?: Employee[]): Promise<CurrentViewer | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  const supabase = createClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user?.email) {
    return null;
  }

  const email = data.user.email.toLowerCase();

  if (isConfiguredAdminEmail(email)) {
    return {
      kind: "boss",
      value: "boss",
      name: "社長",
      employee: null,
      isAdmin: true,
      email,
      userId: data.user.id
    };
  }

  const employeeList = employees ?? (await getEmployees());
  const employee = employeeList.find((item) => item.auth_user_id === data.user.id || item.email?.toLowerCase() === email);

  if (!employee) {
    return null;
  }

  return {
    kind: "employee",
    value: employee.id,
    name: employee.name,
    employee,
    isAdmin: employee.is_admin || isKawamoto(employee.name),
    email,
    userId: data.user.id
  };
}

export function isKawamoto(name: string) {
  return name === "河本" || name === "豐ｳ譛ｬ";
}

function isConfiguredAdminEmail(email: string) {
  return getAdminEmails().includes(email.toLowerCase());
}

function getAdminEmails() {
  return (process.env.APP_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
