import type { SixTournamentDeadline } from "@/lib/six-tournament-deadlines";
import type { SixTournamentDeadlineOverride } from "@/lib/types";

export const TOURNAMENT_OPTIONS = ["桑田杯", "ドリーム", "甲子園", "PJ47", "ZETT", "GS"] as const;

export type NormalizedTournamentName = (typeof TOURNAMENT_OPTIONS)[number];

export type SixTournamentDeadlineView = SixTournamentDeadline & {
  displayTournament: string;
  entryDeadline: string | null;
  drawDate: string | null;
  isThisWeekEntryDeadline: boolean;
  isOverridden: boolean;
};

export function buildSixTournamentDeadlineViews(items: SixTournamentDeadline[], overrides: SixTournamentDeadlineOverride[], { includeExpired }: { includeExpired: boolean }) {
  const overrideByKey = new Map(overrides.map((override) => [getDeadlineKey(override.tournament, override.area, override.prefecture), override]));
  const today = getTokyoTodayDate();
  const { weekEnd, weekStart } = getTokyoWeekRange(today);

  return items
    .map((item) => {
      const displayTournament = normalizeTournamentName(item.tournament);
      const override = overrideByKey.get(getDeadlineKey(displayTournament, item.area, item.prefecture));
      const entryDeadline = override ? override.entry_deadline : item.entryDeadline;
      const drawDate = override ? override.draw_date : item.drawDate;

      return {
        ...item,
        displayTournament,
        drawDate,
        entryDeadline,
        isOverridden: Boolean(override),
        isThisWeekEntryDeadline: Boolean(entryDeadline && entryDeadline >= weekStart && entryDeadline <= weekEnd)
      };
    })
    .filter((item) => includeExpired || Boolean(item.entryDeadline && item.entryDeadline >= today))
    .sort((a, b) => {
      const aDate = a.entryDeadline ?? "9999-99-99";
      const bDate = b.entryDeadline ?? "9999-99-99";
      return aDate.localeCompare(bDate) || a.displayTournament.localeCompare(b.displayTournament, "ja") || a.area.localeCompare(b.area, "ja") || a.prefecture.localeCompare(b.prefecture, "ja");
    });
}

export function getDeadlineKey(tournament: string, area: string, prefecture: string) {
  return `${normalizeTournamentName(tournament)}__${area}__${prefecture}`;
}

export function normalizeTournamentName(name: string) {
  if (name.includes("桑田")) return "桑田杯";
  if (name.includes("ドリーム")) return "ドリーム";
  if (name.includes("甲子園")) return "甲子園";
  if (name.includes("PJ")) return "PJ47";
  if (name.includes("ZETT")) return "ZETT";
  if (name.includes("GS")) return "GS";
  return name;
}

export function getTournamentToneClass(name: string) {
  if (name === "桑田杯") return "tournamentKuwata";
  if (name === "ドリーム") return "tournamentDream";
  if (name === "甲子園") return "tournamentKoshien";
  if (name === "PJ47") return "tournamentPj47";
  if (name === "ZETT") return "tournamentZett";
  if (name === "GS") return "tournamentGs";
  return "tournamentDefault";
}

export function getTokyoTodayDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Tokyo",
    year: "numeric"
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function getTokyoWeekRange(today: string) {
  const date = new Date(`${today}T00:00:00Z`);
  const dayOfWeek = date.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(date);
  start.setUTCDate(date.getUTCDate() + diffToMonday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return {
    weekEnd: end.toISOString().slice(0, 10),
    weekStart: start.toISOString().slice(0, 10)
  };
}
