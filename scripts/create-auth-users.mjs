import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const password = process.env.AUTH_INITIAL_PASSWORD || "bsobb2011";
const adminEmail = "info@bsobb.net";
const envPath = resolve(process.cwd(), ".env.local");

loadEnv(envPath);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const users = [
  { name: "社長", email: adminEmail, admin: true, aliases: [] },
  { name: "河本", email: "kawamoto@bsobb.net", admin: true, aliases: ["河本", "豐ｳ譛ｬ"] },
  { name: "高橋", email: "k.takahashi@bsobb.net", admin: false, aliases: ["高橋", "鬮俶ｩ・"] },
  { name: "大鋸", email: "ooga@bsobb.net", admin: false, aliases: ["大鋸", "螟ｧ驪ｸ"] },
  { name: "松本", email: "matsumoto@bsobb.net", admin: false, aliases: ["松本", "譚ｾ譛ｬ"] },
  { name: "安藤", email: "ando@bsobb.net", admin: false, aliases: ["安藤", "螳芽陸"] },
  { name: "平賀", email: "hiraga@bsobb.net", admin: false, aliases: ["平賀", "蟷ｳ雉"] },
  { name: "宮田", email: "miyata@bsobb.net", admin: false, aliases: ["宮田"] },
  { name: "天木", email: "amaki@bsobb.net", admin: false, aliases: ["天木", "螟ｩ譛ｨ"] },
  { name: "草間", email: "kusama@bsobb.net", admin: false, aliases: ["草間", "闕蛾俣"] },
  { name: "上野", email: "ueno@bsobb.net", admin: false, aliases: ["上野", "荳企㍽"] },
  { name: "大橋", email: "ohashi@bsobb.net", admin: false, aliases: ["大橋", "螟ｧ讖・"] },
  { name: "花里", email: "hanazato@bsobb.net", admin: false, aliases: ["花里", "闃ｱ驥・"] }
];

const employees = await fetchEmployees();
const results = [];

for (const item of users) {
  const authUser = await ensureAuthUser(item);
  const employee = findEmployee(employees, item.aliases);

  if (employee) {
    await updateEmployee(employee.id, item, authUser.id);
  }

  results.push({
    name: item.name,
    email: item.email,
    authUserId: authUser.id,
    employeeLinked: Boolean(employee),
    admin: item.admin
  });
}

ensureAdminEmail(envPath, adminEmail);

console.table(results);
console.log("Auth users are ready. Initial password:", password);

function loadEnv(path) {
  const body = readFileSync(path, "utf8");

  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    process.env[key.trim()] ??= rawValue.trim().replace(/^["']|["']$/g, "");
  }
}

async function ensureAuthUser(item) {
  const existing = await findAuthUserByEmail(item.email);

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { name: item.name, is_admin: item.admin }
    });

    if (error) {
      throw new Error(`Failed to update auth user ${item.email}: ${error.message}`);
    }

    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: item.email,
    password,
    email_confirm: true,
    user_metadata: { name: item.name, is_admin: item.admin }
  });

  if (error || !data.user) {
    throw new Error(`Failed to create auth user ${item.email}: ${error?.message ?? "unknown error"}`);
  }

  return data.user;
}

async function findAuthUserByEmail(email) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) return null;
    page += 1;
  }
}

async function fetchEmployees() {
  const { data, error } = await supabase.from("employees").select("id,name");

  if (error) {
    throw new Error(`Failed to fetch employees. Run supabase/migrations/010_add_employee_auth_fields.sql first if needed. ${error.message}`);
  }

  return data ?? [];
}

function findEmployee(employeeList, aliases) {
  return employeeList.find((employee) => aliases.includes(employee.name));
}

async function updateEmployee(id, item, authUserId) {
  const { error } = await supabase
    .from("employees")
    .update({
      email: item.email,
      auth_user_id: authUserId,
      is_admin: item.admin
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update employee ${item.name}. Run supabase/migrations/010_add_employee_auth_fields.sql first. ${error.message}`);
  }
}

function ensureAdminEmail(path, email) {
  const body = readFileSync(path, "utf8");
  const lines = body.split(/\r?\n/);
  const existingIndex = lines.findIndex((line) => line.startsWith("APP_ADMIN_EMAILS="));

  if (existingIndex === -1) {
    writeFileSync(path, `${body.trimEnd()}\nAPP_ADMIN_EMAILS=${email}\n`, "utf8");
    return;
  }

  const current = lines[existingIndex].replace("APP_ADMIN_EMAILS=", "");
  const emails = current
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!emails.map((value) => value.toLowerCase()).includes(email.toLowerCase())) {
    emails.push(email);
    lines[existingIndex] = `APP_ADMIN_EMAILS=${emails.join(",")}`;
    writeFileSync(path, lines.join("\n"), "utf8");
  }
}
