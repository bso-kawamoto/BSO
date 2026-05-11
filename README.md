# BSO Operation

BSO Operation は、社内の案件、タスク、担当者、予定を一画面で把握するための業務管理MVPです。イベントが複数並行して進む前提で、案件の中に中タスク・小タスクを持たせ、期日と担当者を追えるようにしています。

## 目的

- 案件ごとの進捗、期限、担当者を整理する
- 中タスク・小タスクで作業を細かく管理する
- 社員別、今日やること、カレンダーで確認できる入口を用意する
- Supabase と Vercel 前提でシンプルに運用できる初期状態を作る

## 使用技術

- Next.js App Router
- React
- TypeScript
- Supabase
- Vercel
- npm

## ディレクトリ構成

```text
.
├─ app/
│  ├─ actions.ts
│  ├─ admin/page.tsx
│  ├─ calendar/page.tsx
│  ├─ employees/page.tsx
│  ├─ projects/[id]/page.tsx
│  ├─ today/page.tsx
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ lib/
│  ├─ sample-data.ts
│  ├─ tasks.ts
│  ├─ types.ts
│  └─ supabase/
│     ├─ server.ts
│     └─ types.ts
├─ supabase/migrations/
├─ .env.example
├─ AGENTS.md
├─ STAFF_MANUAL.md
├─ README.md
└─ package.json
```

## セットアップ手順

```bash
npm install
cp .env.example .env.local
```

## Supabase設定手順

1. Supabaseで新規プロジェクトを作成します。
2. `supabase/migrations/` 配下のSQLを番号順に Supabase SQL Editor で実行します。
3. Project Settings > API から URL と Anon Key を取得します。
4. Service Role Key を取得し、サーバー側のServer Actionsだけで使います。

## 環境変数設定

`.env.local` に以下を設定します。

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ADMIN_EMAILS=
TEAMS_WEBHOOK_URL=
AUTH_INITIAL_PASSWORD=
CRON_SECRET=
```

## 開発起動方法

```bash
npm run dev
```

## ビルド方法

```bash
npm run build
```

## デプロイ方法

Vercelにリポジトリを接続し、環境変数をProject Settingsに登録してデプロイします。本番Supabaseにも同じマイグレーションを適用してから公開してください。

## DBスキーマ概要

- `projects`: 案件。案件名、期日、アーカイブ状態を管理します。
- `operation_tasks`: タスク。案件ID、親タスクID、階層、担当者、ステータス、カテゴリ、優先度、期日を管理します。
- `operation_tasks.memo`: タスクごとの進捗メモ。確認中の相手、次にやること、直近の状況を残します。
- タスクカテゴリは `営業`、`運用`、`請求`、`サポート`、`管理`、`物販` です。物販カテゴリは物販チーム内で共有表示されます。
- カテゴリを追加した場合は、Supabaseの `operation_tasks_category_check` 制約もマイグレーションで更新します。
- `employees`: 社員マスター。担当者選択に使います。
- 社員表示順は固定順です。ログイン中の社員がいる場合は本人を先頭にし、それ以外は河本、高橋、大鋸、松本、安藤、草間、上野、平賀、宮田、天木、花里、大橋の順で表示します。
- `calendar_events`: カレンダー予定。複数日、終日、時間、場所、関連案件、担当者を管理します。

## 主な画面

- `/`: ボード、全スタッフ向けクイック登録、月移動できる全員共有カレンダー、案件一覧
- `/projects/[id]`: 案件詳細、案件名・期日編集、アーカイブ、タスク・予定の追加/編集/削除
- `/projects/[id]`: タスクごとの進捗メモも編集できます。
- `/today`: 今日の予定、期限切れ、今日期限、3日以内のタスク
- `/employees`: 社員別の未完了タスク、期限切れ、近日期限、予定
- `/admin`: 社長・河本向けの管理画面
- `/calendar`: 月移動できる全画面カレンダー。予定は全員共有で、予定名から詳細へ移動できます。
- `/calendar/[id]`: 予定詳細、内容変更、削除

## スタッフ向けマニュアル

スタッフに共有する操作手順は `STAFF_MANUAL.md` にまとめています。

## ログイン

正式運用では Supabase Auth のメールアドレス＋パスワードでログインします。社員は `employees.email` または `employees.auth_user_id` でAuthユーザーと紐づけます。

1. Supabase Authentication > Users で社員のAuthユーザーを作成します。
2. `employees.email` にAuthユーザーと同じメールアドレスを設定します。
3. 必要に応じて `employees.auth_user_id` にAuthユーザーIDを設定します。
4. 河本は `employees.is_admin = true` にします。
5. 社長など社員マスター外の管理者メールは `APP_ADMIN_EMAILS` にカンマ区切りで設定します。

社長と河本は全員分と管理画面を確認でき、その他の社員は本人分だけを表示します。

社員ユーザーを一括作成する場合は、`.env.local` に `AUTH_INITIAL_PASSWORD` を設定してから以下を実行します。

```bash
node scripts/create-auth-users.mjs
```

## Teams通知予定

期限アラートは `TEAMS_WEBHOOK_URL` を使って送信します。対象は期限切れ、今日期限、3日以内の未完了タスクです。

- 管理画面の「Teamsに期限アラート送信」から手動送信できます。
- 自動送信用APIは `/api/teams/due-alerts` です。
- `vercel.json` で毎朝9:45（日本時間）に自動送信します。
- `CRON_SECRET` を設定した場合は、`Authorization: Bearer <CRON_SECRET>` が必要です。
- 担当者付きのタスクが追加された場合もTeamsへ通知します。

## 今後の拡張予定

- Teamsへの期限アラート通知
- 社長・河本だけが管理画面を開ける権限制御
- 通知、期限アラート
- CSV出力、レポート
- 操作ログ
- 案件テンプレート

## 追加運用メモ

- 完了になったタスクは通常の案件内リストから分離し、案件ごとの「完了済みタスク」にまとまります。
- タスク名入力欄では、過去に登録したタスク名を候補として呼び出せます。同じ作業を再登録する場合は候補から選択してください。
- タスクには「依頼者」を設定できます。誰から振られたタスクかを、ボード、案件詳細、管理画面で確認できます。
- 既存タスクは「内容を修正」から後から案件を選び直せます。案件なしで登録したタスクも、あとから案件に紐づけできます。
- カレンダーはURLに月指定がない場合、実際の当月を先頭に表示します。
- `operation_tasks.requested_by_id` と `operation_tasks.requested_by_name` を使うため、`supabase/migrations/013_add_task_requester.sql` をSupabase SQL Editorで適用してください。
