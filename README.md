# 🌱 草プロジェクト 水やり管理アプリ

バイト仲間で野菜を育てる「草プロジェクト」のための水やり管理Webアプリ。
誰がいつ水やりしたか、今日・明日の担当は誰かをスマホから確認できます。

## 機能

- **水やり記録**: 今日の対応状況をワンタップで記録・取り消し
- **担当自動表示**: シフト表から今日・明日の担当者を自動判定
- **朝・夜の2枠制**: 2026-10-17 以降は朝・夜の両方を表示・記録・通知（[担当枠のルール](#担当枠のルール朝夜)参照）
- **リマインド通知**: 17時に当日の夜担当へ、21時に翌日の担当へプッシュ通知（Vercel Cron）
- **成長ギャラリー**: 野菜の写真をアップ（画像は自動圧縮）
- **水やり履歴**: 直近2週間の済/未を一覧表示
- **Realtime同期**: 誰かが記録すると全員の画面に自動反映
- **PWA対応**: スマホのホーム画面に追加してアプリのように使える
- **管理者画面** (`/admin`): シフト表の登録・編集（合言葉で保護）

---

## セットアップ手順

### 1. 必要なもの

- Node.js 18以上（確認: `node --version`）
- Supabaseのアカウントとプロジェクト（無料プランでOK）
- Vercelのアカウント（デプロイ用、無料プランでOK）

### 2. リポジトリをクローン

```bash
git clone <リポジトリURL>
cd 草プロジェクトアプリ
npm install
```

### 3. 環境変数の設定

`.env.example` をコピーして `.env` を作成：

```bash
cp .env.example .env
```

`.env` を開いて以下を設定：

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...（anon publicキー）
VITE_ADMIN_PASSWORD=（管理者の合言葉）
```

**Supabaseの値の確認場所:**
1. [supabase.com/dashboard](https://supabase.com/dashboard) → プロジェクト選択
2. Settings（左下歯車）→ API
3. 「Project URL」と「anon public」をコピー

### 4. Supabaseのテーブル構成

以下のテーブルが必要です（RLS有効・anonキーで読み書き可）：

```sql
-- 水やり記録
create table waterings (
  id uuid default gen_random_uuid() primary key,
  date date unique not null,
  by_name text not null,
  note text,
  created_at timestamptz default now()
);

-- シフト表
create table shifts (
  id uuid default gen_random_uuid() primary key,
  date date unique not null,
  names text[] not null,
  created_at timestamptz default now()
);

-- 野菜写真
create table vegetables (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  by_name text not null,
  note text,
  image_path text not null,
  day date not null,
  created_at timestamptz default now()
);
```

Storageバケット `veg-photos`（public）も必要です。

### 5. Realtime の有効化

Supabase管理画面 → Database → Replication → supabase_realtime に
`waterings` と `vegetables` テーブルを追加してください。

### 6. ローカル起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

---

## 担当枠のルール（朝／夜）

「その日が朝だけなのか、朝＋夜の2枠なのか」の判定は
**`src/lib/wateringRule.ts` の1か所だけ**にまとめてあります。

| 期間 | 担当枠 |
|------|--------|
| 〜2026-06-30 | 朝のみ |
| 2026-07-01 〜 2026-09-30 | 朝・夜（当時の夏ルール） |
| 2026-10-01 〜 2026-10-16 | 朝のみ |
| **2026-10-17 以降** | **朝・夜（期限なし）** |

この判定を使っている箇所:

- 今日の水やり画面（朝・夜2枠の表示と記録）／明日の担当表示 … `src/components/TodayWatering.tsx`
- 履歴タブ（未来の担当予定・過去の実績の朝夜表示） … `src/components/WateringHistory.tsx`
- 展示モード `/display` の朝夜切り替え … `src/pages/DisplayPage.tsx`
- リマインド通知（17時の夜担当／前日21時） … `server/reminder.ts`

**ルールを変えたいとき**は `src/lib/wateringRule.ts` の `DUAL_SLOT_START_DATE`（適用開始日）
だけを書き換えれば、上記すべてに反映されます。過去の実績表示も日付ごとに判定されるため、
切り替え前の日は当時のルールのまま表示されます。

### 日付を指定して確認する

URLに `?testdate=YYYY-MM-DD` を付けると、その日を「今日」として表示を確認できます。

```
/?testdate=2026-10-17           # 今日の画面: 朝・夜の2枠が出る
/?testdate=2026-10-16           # 今日は朝のみ・明日の担当は朝夜どちらも出る
/?tab=history&testdate=2026-10-17
/display?testdate=2026-10-17    # 展示モード（日付のみ上書き・時刻は実時計）
```

> ⚠️ `?testdate=` を付けたまま「水やりした」を押すと、その日付の記録としてDBに保存されます。
> 表示の確認だけしたいときは記録ボタンを押さないでください。

リマインド通知は送信せずに送信内容だけ確認できます（`dry=1`）。

```
/api/reminder/evening?dry=1&testdate=2026-10-17    # その日の夜担当あてに何が送られるか
/api/reminder/tomorrow?dry=1&testdate=2026-10-16   # 翌日(10/17)の担当あてに何が送られるか
```

---

## リマインド通知（Vercel Cron）

| 配信時刻 (JST) | エンドポイント | 内容 |
|----------------|----------------|------|
| 毎日 17:00 | `/api/reminder/evening` | その日の**夜担当**へリマインド（朝のみの日・すでに記録済みの日は送らない） |
| 毎日 21:00 | `/api/reminder/tomorrow` | **翌日の担当**へリマインド（翌日が2枠制なら夜担当も対象。朝夜兼任の人には1通にまとめて送信） |

スケジュールは `vercel.json` の `crons` で定義しています（VercelのCronはUTC基準なので
`0 8 * * *` = 17:00 JST、`0 12 * * *` = 21:00 JST）。

通知先は `push_subscriptions` テーブル（`user_name` / `endpoint` / `subscription`）から
担当者の名前で引きます。購読が無効（410/404）になった端末は自動削除されます。

> 📱 通知を受け取るには各メンバーが通知をオンにして購読を登録する必要があります。
> 購読UI（`src/components/NotificationToggle.tsx`）は現在どの画面にも配置されていないため、
> 使うときはメンバー画面に戻してください。

---

## 環境変数の説明

| 変数名 | 説明 | 例 |
|--------|------|----|
| `VITE_SUPABASE_URL` | SupabaseプロジェクトのURL | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabaseのanon publicキー | `eyJ...` または `sb_publishable_...` |
| `VITE_ADMIN_PASSWORD` | 管理者画面の合言葉 | `midori2024` など |
| `VITE_VAPID_PUBLIC_KEY` | Webプッシュの公開鍵 | `BInc...` |
| `VAPID_PRIVATE_KEY` | Webプッシュの秘密鍵（サーバーのみ） | `k3Jd...` |
| `VAPID_SUBJECT` | VAPIDの連絡先 | `mailto:you@example.com` |
| `CRON_SECRET` | リマインドAPIの保護（任意）。設定するとVercel Cron以外から送信できなくなる | 任意の長い文字列 |

> ⚠️ `.env` はGitにコミットしないでください（`.gitignore` で除外済み）

---

## デプロイ手順（Vercel）

1. GitHubにリポジトリを作成してプッシュ
2. [vercel.com](https://vercel.com) → 「New Project」→ GitHubリポジトリを選択
3. **「Environment Variables」に以下を追加：**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_PASSWORD`
   - `VITE_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`（リマインド通知を使う場合）
   - `CRON_SECRET`（任意・リマインドAPIを外部から叩かれないようにする）
4. 「Deploy」をクリック → 数分でURLが発行される

以降はGitHubにプッシュするたびに自動デプロイされます。
リマインド通知のスケジュール（`vercel.json` の `crons`）はデプロイ時に自動登録され、
Vercelの Project → Settings → Cron Jobs で実行状況を確認できます。

---

## 画面構成

| URL | 画面 | 説明 |
|-----|------|------|
| `/` | メンバー画面 | 水やり記録・写真・履歴 |
| `/admin` | 管理者画面 | シフト登録・編集（合言葉必要） |
| `/display` | 展示ディスプレイ画面 | 別館常設iPhone用。水やり状態を全画面表示・記録（30秒ごとに自動更新） |

どの画面も `?testdate=YYYY-MM-DD` で日付を上書きして確認できます。

## 技術スタック

- **フロントエンド**: React 19 + Vite + TypeScript
- **スタイリング**: Tailwind CSS v4
- **バックエンド/DB**: Supabase（PostgreSQL + Storage + Realtime）
- **認証**: なし（URLを知っている人全員がメンバー画面を使える）
- **管理者認証**: 環境変数の合言葉による簡易ログイン
- **PWA**: vite-plugin-pwa（Workbox）
- **デプロイ**: Vercel
