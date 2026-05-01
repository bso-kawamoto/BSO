import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteCalendarEvent, logout, updateCalendarEvent } from "@/app/actions";
import { getCurrentViewer } from "@/lib/auth";
import { sortEmployeesForDisplay } from "@/lib/employee-order";
import { getCalendarEvents, getEmployees, getProjects } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function CalendarEventDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ schedule?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [events, employees, projects] = await Promise.all([getCalendarEvents(), getEmployees(), getProjects(true)]);
  const viewer = await getCurrentViewer(employees);

  if (!viewer) {
    redirect(`/login?next=/calendar/${id}`);
  }

  const event = events.find((item) => item.id === id);

  if (!event) {
    notFound();
  }

  const notice = getScheduleNotice(query?.schedule);
  const eventRange = event.end_date && event.end_date !== event.event_date ? `${event.event_date} - ${event.end_date}` : event.event_date;
  const timeLabel = event.is_all_day ? "終日" : [event.start_time?.slice(0, 5), event.end_time?.slice(0, 5)].filter(Boolean).join(" - ") || "時間未設定";

  const employeeOptions = sortEmployeesForDisplay(employees, viewer.employee?.id);

  return (
    <main className="page">
      <div className="shell narrowShell">
        <header className="topbar">
          <div className="brand" aria-label="BSO Operation">
            <div className="brandMark">BSO</div>
            <span>予定詳細</span>
          </div>
          <nav className="nav" aria-label="Calendar event navigation">
            <Link className="navItem" href="/">
              ボード
            </Link>
            <Link className="navItem" href="/calendar">
              カレンダー
            </Link>
            <span className="navItem navItemActive">{viewer.name}</span>
            <form action={logout}>
              <button className="navButton" type="submit">
                ログアウト
              </button>
            </form>
          </nav>
        </header>

        <section className="detailHero">
          <div>
            <h1>{event.title}</h1>
            <p>
              {eventRange} / {timeLabel}
            </p>
          </div>
        </section>

        {notice ? <p className={`notice ${notice.kind}`}>{notice.message}</p> : null}

        <section className="panel projectSettingsPanel">
          <h2>予定内容</h2>
          <form action={updateCalendarEvent} className="quickForm">
            <input type="hidden" name="id" value={event.id} />
            <div className="field">
              <label htmlFor="calendar-title">予定名</label>
              <input id="calendar-title" name="calendar_title" defaultValue={event.title} maxLength={120} required />
            </div>
            <div className="formGridTwo">
              <div className="field">
                <label htmlFor="event-date">開始日</label>
                <input id="event-date" name="event_date" type="date" defaultValue={event.event_date} required />
              </div>
              <div className="field">
                <label htmlFor="end-date">終了日</label>
                <input id="end-date" name="end_date" type="date" defaultValue={event.end_date ?? event.event_date} required />
              </div>
            </div>
            <label className="checkField" htmlFor="is-all-day">
              <input id="is-all-day" name="is_all_day" type="checkbox" defaultChecked={event.is_all_day} />
              <span>終日</span>
            </label>
            <div className="formGridTwo">
              <div className="field">
                <label htmlFor="start-time">開始</label>
                <input id="start-time" name="start_time" type="time" defaultValue={event.start_time?.slice(0, 5) ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="end-time">終了</label>
                <input id="end-time" name="end_time" type="time" defaultValue={event.end_time?.slice(0, 5) ?? ""} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="calendar-project">関連案件</label>
              <select id="calendar-project" name="calendar_project_id" defaultValue={event.project_id ?? ""}>
                <option value="">なし</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="calendar-owner">担当者</label>
              <select id="calendar-owner" name="calendar_assignee_id" defaultValue={event.assignee_id ?? ""}>
                <option value="">未割当</option>
                {employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="location">場所</label>
              <input id="location" name="location" defaultValue={event.location ?? ""} maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="memo">メモ</label>
              <textarea id="memo" name="memo" defaultValue={event.memo ?? ""} rows={4} maxLength={1000} />
            </div>
            <button className="button" type="submit">
              予定を保存
            </button>
          </form>

          <form action={deleteCalendarEvent} className="deleteForm">
            <input type="hidden" name="id" value={event.id} />
            <button className="dangerButton" type="submit">
              予定を削除
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function getScheduleNotice(schedule?: string) {
  if (schedule === "updated") {
    return { kind: "noticeSuccess", message: "予定を更新しました。" };
  }

  if (schedule === "invalid") {
    return { kind: "noticeError", message: "入力内容を確認してください。" };
  }

  if (schedule === "missing-env") {
    return { kind: "noticeError", message: "Supabaseの環境変数を確認してください。" };
  }

  if (schedule === "error") {
    return { kind: "noticeError", message: "予定の更新に失敗しました。" };
  }

  return null;
}
