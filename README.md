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
- `employees`: 社員マスター。担当者選択に使います。
- `calendar_events`: カレンダー予定。複数日、終日、時間、場所、関連案件、担当者を管理します。

## 主な画面

- `/`: ボード、クイック登録、月移動できるカレンダー、案件一覧
- `/projects/[id]`: 案件詳細、案件名・期日編集、アーカイブ、タスク・予定の追加/編集/削除
- `/projects/[id]`: タスクごとの進捗メモも編集できます。
- `/today`: 今日の予定、期限切れ、今日期限、3日以内のタスク
- `/employees`: 社員別の未完了タスク、期限切れ、近日期限、予定
- `/admin`: 社長・河本向けの管理画面
- `/calendar`: 月移動できる全画面カレンダー。予定名から詳細へ移動できます。
- `/calendar/[id]`: 予定詳細、内容変更、削除

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

期限アラートは次の拡張で `TEAMS_WEBHOOK_URL` を使って送信する想定です。対象は期限切れ、今日期限、3日以内のタスクです。

## 今後の拡張予定

- Teamsへの期限アラート通知
- 社長・河本だけが管理画面を開ける権限制御
- 通知、期限アラート
- CSV出力、レポート
- 操作ログ
- 案件テンプレート
