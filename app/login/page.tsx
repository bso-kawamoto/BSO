import Link from "next/link";
import { login } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params?.next);

  return (
    <main className="page loginPage">
      <div className="shell narrowShell">
        <header className="topbar">
          <div className="brand" aria-label="BSO Operation">
            <div className="brandMark">BSO</div>
            <span>BSO Operation</span>
          </div>
          <Link className="navItem" href="/">
            ボード
          </Link>
        </header>

        <section className="panel loginPanel">
          <h1 className="adminTitle">ログイン</h1>
          <p className="mutedText">Supabase Authに登録したメールアドレスとパスワードでログインしてください。</p>
          {params?.error === "invalid" ? <p className="notice noticeError">メールアドレスまたはパスワードを確認してください。</p> : null}
          {params?.error === "missing-env" ? <p className="notice noticeError">Supabaseの環境変数を確認してください。</p> : null}
          <form action={login} className="quickForm">
            <input type="hidden" name="next" value={nextPath} />
            <div className="field">
              <label htmlFor="email">メールアドレス</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">パスワード</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <button className="button" type="submit">
              ログイン
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function sanitizeNextPath(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}
