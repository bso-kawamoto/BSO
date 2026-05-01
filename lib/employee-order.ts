import type { Employee } from "@/lib/types";

const EMPLOYEE_ORDER_KEYS = [
  "河本",
  "kawamoto",
  "高橋",
  "takahashi",
  "大鋸",
  "ooga",
  "松本",
  "matsumoto",
  "安藤",
  "ando",
  "草間",
  "kusama",
  "上野",
  "ueno",
  "平賀",
  "hiraga",
  "宮田",
  "miyata",
  "天木",
  "amaki",
  "花里",
  "hanazato",
  "大橋",
  "ohashi"
];

export function sortEmployeesForDisplay(employees: Employee[], currentEmployeeId?: string | null) {
  return [...employees].sort((a, b) => {
    if (currentEmployeeId) {
      if (a.id === currentEmployeeId) return -1;
      if (b.id === currentEmployeeId) return 1;
    }

    const orderDiff = getEmployeeOrder(a) - getEmployeeOrder(b);
    if (orderDiff !== 0) return orderDiff;

    return a.name.localeCompare(b.name, "ja");
  });
}

export function compareEmployeesByCompanyOrder(a: Employee, b: Employee) {
  const orderDiff = getEmployeeOrder(a) - getEmployeeOrder(b);
  if (orderDiff !== 0) return orderDiff;
  return a.name.localeCompare(b.name, "ja");
}

function getEmployeeOrder(employee: Employee) {
  const searchable = `${employee.name} ${employee.email ?? ""}`.toLowerCase();
  const foundIndex = EMPLOYEE_ORDER_KEYS.findIndex((key) => searchable.includes(key.toLowerCase()));
  return foundIndex === -1 ? Number.MAX_SAFE_INTEGER : foundIndex;
}
