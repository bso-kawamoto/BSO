import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions";
import { getCurrentViewer } from "@/lib/auth";
import { SIX_TOURNAMENT_DEADLINES, type SixTournamentDeadline } from "@/lib/six-tournament-deadlines";
import { getEmployees } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function SixTournamentDeadlinesPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; tournament?: string }>;
}) {
  const params = await searchParams;
  const employees = await getEmployees();
  const viewer = await getCurrentViewer(employees);

  if (!viewer) {
    redirect("/login?next=/six-tournament-deadlines");
  }

  const tournaments = [...new Set(SIX_TOURNAMENT_DEADLINES.map((item) => item.tournament))].sort((a, b) => a.localeCompare(b, "ja"));
  const query = params?.q?.trim() ?? "";
  const tournament = params?.tournament?.trim() ?? "";
  const filteredItems = filterDeadlineItems(SIX_TOURNAMENT_DEADLINES, query, tournament);
  const upcomingEntry = filteredItems.filter((item) => isUpcoming(item.entryDeadline)).length;
  const upcomingDraw = filteredItems.filter((item) => isUpcoming(item.drawDate)).length;

  return (
    <main className="page">
      <div className="shell deadlineShell">
        <header className="topbar">
          <div className="brand" aria-label="BSO Operation">
            <div className="brandMark">BSO</div>
            <span>6大会期日</span>
          </div>
          <nav className="nav" aria-label="Six tournament deadline navigation">
            <Link className="navItem" href="/">
              ボード
            </Link>
            <Link className="navItem" href="/today">
              今日
            </Link>
            <Link className="navItem" href="/employees">
              社員別
            </Link>
            <span className="navItem navItemActive">{viewer.name}</span>
            <form action={logout}>
              <button className="navButton" type="submit">
                ログアウト
              </button>
            </form>
          </nav>
        </header>

        <section className="detailHero deadlineHero">
          <div>
            <h1>6大会期日</h1>
            <p>各大会の申込締切日と抽選日を一覧で確認できます。担当者名は表示していません。</p>
          </div>
          <div className="summaryGrid deadlineSummaryGrid" aria-label="Deadline summary">
            <Summary label="表示件数" value={filteredItems.length} />
            <Summary label="大会数" value={tournaments.length} />
            <Summary label="今後の締切" value={upcomingEntry} />
            <Summary label="今後の抽選" value={upcomingDraw} />
          </div>
        </section>

        <section className="panel deadlineFilterPanel">
          <form className="deadlineFilterForm">
            <div className="field">
              <label htmlFor="deadline-q">検索</label>
              <input id="deadline-q" name="q" defaultValue={query} placeholder="大会名・地区・都道府県" />
            </div>
            <div className="field">
              <label htmlFor="deadline-tournament">大会</label>
              <select id="deadline-tournament" name="tournament" defaultValue={tournament}>
                <option value="">すべて</option>
                {tournaments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <button className="button" type="submit">
              絞り込み
            </button>
            <Link className="secondaryButton deadlineResetLink" href="/six-tournament-deadlines">
              リセット
            </Link>
          </form>
        </section>

        <section className="panel deadlineTablePanel">
          <div className="deadlineTableWrap">
            <table className="deadlineTable">
              <thead>
                <tr>
                  <th>大会名</th>
                  <th>地区</th>
                  <th>都道府県</th>
                  <th>申込締切日</th>
                  <th>抽選日</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr key={`${item.tournament}-${item.area}-${item.prefecture}-${index}`}>
                    <td>{item.tournament}</td>
                    <td>{item.area}</td>
                    <td>{item.prefecture}</td>
                    <td>
                      <DeadlineDate date={item.entryDeadline} />
                    </td>
                    <td>
                      <DeadlineDate date={item.drawDate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredItems.length === 0 ? <div className="empty">該当する期日はありません</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary">
      <div className="summaryLabel">{label}</div>
      <div className="summaryValue">{value}</div>
    </div>
  );
}

function DeadlineDate({ date }: { date: string | null }) {
  if (!date) {
    return <span className="deadlineDate mutedDeadlineDate">未設定</span>;
  }

  return <span className={`deadlineDate ${isUpcoming(date) ? "upcomingDeadlineDate" : "pastDeadlineDate"}`}>{date}</span>;
}

function filterDeadlineItems(items: SixTournamentDeadline[], query: string, tournament: string) {
  const normalizedQuery = query.toLowerCase();
  return items.filter((item) => {
    if (tournament && item.tournament !== tournament) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [item.tournament, item.area, item.prefecture].some((value) => value.toLowerCase().includes(normalizedQuery));
  });
}

function isUpcoming(date: string | null) {
  if (!date) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${date}T00:00:00`).getTime() >= today.getTime();
}
