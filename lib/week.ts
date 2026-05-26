export function getTokyoWeekStartDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Tokyo",
    year: "numeric"
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const tokyoDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = tokyoDate.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  tokyoDate.setUTCDate(tokyoDate.getUTCDate() + diffToMonday);

  return tokyoDate.toISOString().slice(0, 10);
}
