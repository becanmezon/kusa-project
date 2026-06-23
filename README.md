# 🌱 草プロジェクト 水やり管理アプリ

バイト仲間で野菜を育てる「草プロジェクト」のための水やり管理Webアプリ。
誰がいつ水やりしたか、今日・明日の担当は誰かをスマホから確認できます。

## 機能

- **水やり記録**: 今日の対応状況をワンタップで記録・取り消し
- **担当自動表示**: シフト表から今日・明日の担当者を自動判定
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

## 環境変数の説明

| 変数名 | 説明 | 例 |
|--------|------|----|
| `VITE_SUPABASE_URL` | SupabaseプロジェクトのURL | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabaseのanon publicキー | `eyJ...` または `sb_publishable_...` |
| `VITE_ADMIN_PASSWORD` | 管理者画面の合言葉 | `midori2024` など |

> ⚠️ `.env` はGitにコミットしないでください（`.gitignore` で除外済み）

---

## デプロイ手順（Vercel）

1. GitHubにリポジトリを作成してプッシュ
2. [vercel.com](https://vercel.com) → 「New Project」→ GitHubリポジトリを選択
3. **「Environment Variables」に以下を追加：**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_PASSWORD`
4. 「Deploy」をクリック → 数分でURLが発行される

以降はGitHubにプッシュするたびに自動デプロイされます。

---

## 画面構成

| URL | 画面 | 説明 |
|-----|------|------|
| `/` | メンバー画面 | 水やり記録・写真・履歴 |
| `/admin` | 管理者画面 | シフト登録・編集（合言葉必要） |

## 技術スタック

- **フロントエンド**: React 19 + Vite + TypeScript
- **スタイリング**: Tailwind CSS v4
- **バックエンド/DB**: Supabase（PostgreSQL + Storage + Realtime）
- **認証**: なし（URLを知っている人全員がメンバー画面を使える）
- **管理者認証**: 環境変数の合言葉による簡易ログイン
- **PWA**: vite-plugin-pwa（Workbox）
- **デプロイ**: Vercel
