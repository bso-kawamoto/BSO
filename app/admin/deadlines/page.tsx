import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteSixTournamentDeadlineOverride, logout, updateSixTournamentDeadlineOverride } from "@/app/actions";
import { getCurrentViewer } from "@/lib/auth";
import { SIX_TOURNAMENT_DEADLINES } from "@/lib/six-tournament-deadlines";
import { buildSixTournamentDeadlineViews, getTournamentToneClass, TOURNAMENT_OPTIONS, type SixTournamentDeadlineView } from "@/lib/six-tournament-deadline-utils";
import { getEmployees, getSixTournamentDeadlineOverrides } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function AdminDeadlinesPage({
  searchParams
}: {
  searchParams?: Promise<{ deadline?: string; q?: string; tournament?: string }>;
}) {
  const params = await searchParams;
  const [employees, overrides] = await Promise.all([getEmployees(), getSixTournamentDeadlineOverrides()]);
  const viewer = await getCurrentViewer(employees);

  if (!viewer) {
    redirect("/login?next=/admin/deadlines");
  }

  if (!viewer.isAdmin) {
    redirect("/employees");
  }

  const query = params?.q?.trim() ?? "";
  const tournament = params?.tournament?.trim() ?? "";
  const items = buildSixTournamentDeadlineViews(SIX_TOURNAMENT_DEADLINES, overrides, { includeExpired: true });
  const filteredItems = filterDeadlineItems(items, query, tournament);
  const notice = getNotice(params?.deadline);

  return (
    <main className="page">
      <div className="shell deadlineShell">
        <header className="topbar">
          <div className="brand" aria-label="BSO Operation">
            <div className="brandMark">BSO</div>
            <span>6大会期日管理</span>
          </div>
          <nav className="nav" aria-label="Deadline admin navigation">
            <Link className="navItem" href="/admin">
              管理
            </Link>
            <Link className="navItem" href="/six-tournament-deadlines">
              6大会期日
            </Link>
            <span className="navItem navItemActive">{viewer.name}</span>
            <form action={logout}>
              <button className="navButton" type="submit">
                ログアウト
              </button>
            </form>
          </nav>
        </header>

        <section className="section">
          <div className="sectionHeader">
            <div>
              <h1 className="adminTitle">6大会期日管理</h1>
              <p className="mutedText">締切延長などがあった場合に、申込締切日と抽選日を上書きできます。公開一覧では締切済みの行は非表示になります。</p>
            </div>
          </div>
          {notice ? <p className={`notice ${notice.kind}`}>{notice.message}</p> : null}

          <section className="panel deadlineFilterPanel">
            <form className="deadlineFilterForm">
              <div className="field">
                <label htmlFor="deadline-admin-q">検索</label>
                <input id="deadline-admin-q" name="q" defaultValue={query} placeholder="大会名・地区・都道府県" />
              </div>
              <div className="field">
                <label htmlFor="deadline-admin-tournament">大会</label>
                <select id="deadline-admin-tournament" name="tournament" defaultValue={tournament}>
                  <option value="">すべて</option>
                  {TOURNAMENT_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <button className="button" type="submit">
                絞り込み
              </button>
              <Link className="secondaryButton deadlineResetLink" href="/admin/deadlines">
                リセット
              </Link>
            </form>
          </section>

          <section className="panel deadlineTablePanel">
            <div className="deadlineTableWrap">
              <table className="deadlineTable deadlineAdminTable">
                <thead>
                  <tr>
                    <th>大会名</th>
                    <th>地区</th>
                    <th>都道府県</th>
                    <th>申込締切日</th>
                    <th>抽選日</th>
                    <th>保存</th>
                    <th>解除</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => (
                    <DeadlineAdminRow item={item} key={`${item.displayTournament}-${item.area}-${item.prefecture}-${index}`} />
                  ))}
                </tbody>
              </table>
              {filteredItems.length === 0 ? <div className="empty">該当する期日はありません</div> : null}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function DeadlineAdminRow({ item }: { item: SixTournamentDeadlineView }) {
  const formId = `deadline-form-${item.displayTournament}-${item.area}-${item.prefecture}`.replaceAll(/\s+/g, "-");

  return (
    <tr className={item.isOverridden ? "deadlineOverrideRow" : undefined}>
      <td>
        <span className={`tournamentBadge ${getTournamentToneClass(item.displayTournament)}`}>{item.displayTournament}</span>
        <input form={formId} name="tournament" type="hidden" value={item.displayTournament} />
      </td>
      <td>
        {item.area}
        <input form={formId} name="area" type="hidden" value={item.area} />
      </td>
      <td>
        {item.prefecture}
        <input form={formId} name="prefecture" type="hidden" value={item.prefecture} />
      </td>
      <td>
        <input className="deadlineDateInput" form={formId} name="entry_deadline" type="date" defaultValue={item.entryDeadline ?? ""} />
      </td>
      <td>
        <input className="deadlineDateInput" form={formId} name="draw_date" type="date" defaultValue={item.drawDate ?? ""} />
      </td>
      <td>
        <form action={updateSixTournamentDeadlineOverride} id={formId}>
          <button className="smallButton" type="submit">
            保存
          </button>
        </form>
      </td>
      <td>
        {item.isOverridden ? (
          <form action={deleteSixTournamentDeadlineOverride}>
            <input name="tournament" type="hidden" value={item.displayTournament} />
            <input name="area" type="hidden" value={item.area} />
            <input name="prefecture" type="hidden" value={item.prefecture} />
            <button className="dangerButton" type="submit">
              解除
            </button>
          </form>
        ) : (
          <span className="mutedText">標準</span>
        )}
      </td>
    </tr>
  );
}

function filterDeadlineItems(items: SixTournamentDeadlineView[], query: string, tournament: string) {
  const normalizedQuery = query.toLowerCase();
  return items.filter((item) => {
    if (tournament && item.displayTournament !== tournament) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [item.displayTournament, item.tournament, item.area, item.prefecture].some((value) => value.toLowerCase().includes(normalizedQuery));
  });
}

function getNotice(deadline?: string) {
  if (deadline === "success") return { kind: "noticeSuccess", message: "6大会期日を更新しました。" };
  if (deadline === "deleted") return { kind: "noticeSuccess", message: "上書きを解除しました。" };
  if (deadline === "invalid") return { kind: "noticeError", message: "入力内容を確認してください。" };
  if (deadline === "missing-env" || deadline === "error") return { kind: "noticeError", message: "更新に失敗しました。Supabase設定を確認してください。" };
  return null;
}
