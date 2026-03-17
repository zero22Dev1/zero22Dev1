
# MySQL ツール 仕様まとめ

## 📁 フォルダ構成

```
mysql_tools/
├── import/
│   ├── mysql_import.bat      ← ランチャー（ダブルクリックで起動）
│   ├── mysql_import.dat      ← 処理本体
│   ├── eula_import.txt       ← 本番同意ファイル（削除されても自動再生成）
│   └── logs/
│       └── import_20260317_123456.log  ← 実行ごとに自動生成
└── export/
    ├── mysql_export_truncate.bat  ← ランチャー（ダブルクリックで起動）
    ├── mysql_export_truncate.dat  ← 処理本体
    ├── eula_export.txt            ← 本番同意ファイル（削除されても自動再生成）
    ├── tables.txt                 ← トランケート対象テーブルリスト
    └── logs/
        └── export_truncate_20260317_123456.log  ← 実行ごとに自動生成
```

### 起動方法

各フォルダの `.bat` ファイルをダブルクリックすると `.dat` の処理本体が呼び出されます。

```bat
@echo off
cmd /c "%~dp0mysql_import.dat"
```

`%~dp0` を使うことでどのフォルダに置いても `.dat` を正しく参照できます。

---

# 1. インポートツール（mysql_import）

## 実行フロー

```
起動
 ↓
【起動時処理】eula_import.txt を読み込み → 即 false にリセット
 ↓
① パラメータ入力（会話形式・必須チェックあり）
 ↓
② 入力内容の確認表示

 ↓
④ MySQL接続確認
 ↓
⑤ 本番チェック（localhost以外 = 本番）
 ↓
⑥ INSERT INTO 存在チェック
 ↓
⑦ インポート実行確認
 ↓
⑧ MySQLインポート実行
 ↓
⑨ 完了 or エラー
```

## 各ステップの詳細

### 【起動時処理】eula の読み込み & リセット

- バッチ起動直後に `eula_import.txt` の値を変数に読み込む
- 即座に `false` にリセット（どのタイミングで終了しても必ず false に戻る）
- 以降の同意チェックは変数で判定

### ① パラメータ入力

| 項目 | チェック内容 |
|------|------------|
| DBホスト名 | 空欄なら再入力 |
| DBポート | 空欄チェック + 数字以外はエラー |
| DBユーザー名 | 空欄なら再入力 |
| DB名 | 空欄なら再入力 |
| DBパスワード | 空欄なら再入力 |
| SQLファイルパス | 空欄チェック + ファイルの存在チェック |

### ③ 実行モード選択

```
[2] NORMAL   : 通常インポート
```

### ④ MySQL接続確認

- 接続先・ユーザー・DB名を表示してから疎通チェック
- 失敗 → MySQLのエラーメッセージ + ヒントを表示 + pause → 終了

### ⑤ 本番チェック（localhost以外 = 本番）

| 状態 | 動作 |
|------|------|
| localhost | スキップ |
| eula_import.txt なし | 自動再生成 + pause → 終了 |
| eula=false | `[ERROR]` + pause → 終了 |
| eula=true | 同意確認OK → 最終警告確認へ |

```
本番環境で実行しますか？ (EXECUTE/NO):
```

### ⑥ INSERT INTO 存在チェック

- SQLファイルに `INSERT INTO` が1件もない場合は `[ERROR]` + pause → 終了

### ⑦ インポート実行確認

```
インポートを実行しますか？ (EXECUTE/NO):
```

### ⑧ MySQLインポート実行

- SQLファイルの `INSERT INTO` からテーブル名を自動抽出
- テーブルごとに `[INSERT] テーブル名 start / end` を表示
- mysql の実行は1回のみ

### ⑨ 完了 or エラー

| 結果 | 表示 |
|------|------|
| 成功 | `[INFO] インポートが完了しました！` + pause |
| 失敗 | `[ERROR] インポートに失敗しました。` + pause |

##  本番実行時の手順（インポート）

1. `eula_import.txt` を開いて利用規約を読む
2. `eula=false` → `eula=true` に変更して保存
3. バッチを起動 → 起動直後に自動で `false` にリセット
4. 最終警告確認で `EXECUTE` を入力（大文字のみ）
5. インポート実行確認で `EXECUTE` を入力（大文字のみ）

> 本番環境では `EXECUTE` を **2回** 入力する必要があります。

---

# 2. エクスポート & トランケートツール（mysql_export_truncate）

## 実行フロー

```
起動
 ↓
【起動時処理】eula_export.txt を読み込み → 即 false にリセット
 ↓
① パラメータ入力（会話形式・必須チェックあり）
 ↓
② tables.txt からテーブルリスト読み込み
 ↓
③ 入力内容の確認表示

 ↓
⑤ MySQL接続確認
 ↓
⑥ 本番チェック（localhost以外 = 本番）
 ↓
⑦ テーブル存在チェック
 ↓
⑧ エクスポート実行確認
 ↓
⑨ エクスポート実行（mysqldump）
 ↓
⑩ トランケート実行確認
 ↓
⑪ トランケート実行（TRUNCATE TABLE）
 ↓
⑫ 完了
```

## 📋 各ステップの詳細

### 【起動時処理】eula の読み込み & リセット

- バッチ起動直後に `eula_export.txt` の値を変数に読み込む
- 即座に `false` にリセット（どのタイミングで終了しても必ず false に戻る）
- 以降の同意チェックは変数で判定

### ① パラメータ入力

| 項目 | チェック内容 |
|------|------------|
| DBホスト名 | 空欄なら再入力 |
| DBポート | 空欄チェック + 数字以外はエラー |
| DBユーザー名 | 空欄なら再入力 |
| DB名 | 空欄なら再入力 |
| DBパスワード | 空欄なら再入力 |
| エクスポート先フォルダ | 空欄チェック + 存在しない場合は自動作成 |

### ② tables.txt からテーブルリスト読み込み

- `export\` フォルダの `tables.txt` を自動読み込み
- `#` から始まる行はコメントとしてスキップ
- ファイルが存在しない → `[ERROR]` + pause → 終了
- テーブル名が0件 → `[ERROR]` + pause → 終了

```
# コメント行
users
orders
products
```

### ④ 実行モード選択

```
[2] NORMAL   : エクスポート後にトランケートを実行
```

### ⑤ MySQL接続確認

- 接続先・ユーザー・DB名を表示してから疎通チェック
- 失敗 → MySQLのエラーメッセージ + ヒントを表示 + pause → 終了

### ⑥ 本番チェック（localhost以外 = 本番）

| 状態 | 動作 |
|------|------|
| localhost | スキップ |
| eula_export.txt なし | 自動再生成 + pause → 終了 |
| eula=false | `[ERROR]` + pause → 終了 |
| eula=true | 同意確認OK → 最終警告確認へ |

```
本番環境で実行しますか？ (EXECUTE/NO):
```

### ⑦ テーブル存在チェック

- `INFORMATION_SCHEMA` を使って全テーブルの存在を確認
- 存在しないテーブルがあれば一覧表示 + pause → 終了

### ⑧ エクスポート実行確認

確認画面にテーブルごとの出力先パスを表示：

```
  出力先フォルダ: C:\backup\mydb_20260317123456

  [取得ファイル一覧]
   users   : C:\backup\mydb_20260317123456\export_users.sql
   orders  : C:\backup\mydb_20260317123456\export_orders.sql

エクスポートを実行しますか？ (EXECUTE/NO):
```

### ⑨ エクスポート実行

- `mysqldump` でテーブルごとに個別ファイルをエクスポート
- エクスポート先フォルダ配下に `スキーマ名_yyyymmddhhmmss` 形式のフォルダを自動作成
- 同日複数回実行しても別フォルダに保存されるため上書きされない

```
mysql_tools/export/
└── backup/
    ├── mydb_20260317123456\
    │   ├── export_users.sql
    │   └── export_orders.sql
    └── mydb_20260317134501\
        ├── export_users.sql
        └── export_orders.sql
```

### ⑩ トランケート実行確認

```
トランケートを実行しますか？ (EXECUTE/NO):
```

### ⑪ トランケート実行


- `TRUNCATE TABLE` でテーブルごとに全データ削除
- テーブルごとに `[TRUNCATE] テーブル名 start / end` と完了メッセージを表示
- 全テーブル完了


```

[TRUNCATE] users start
[TRUNCATE] users end
[INFO] users のトランケートが完了しました！

[TRUNCATE] orders start
[TRUNCATE] orders end
[INFO] orders のトランケートが完了しました！


[INFO] トランケート完了: 2026/03/17 12:35:05
```

### ⑫ 完了

```
[INFO] エクスポートが完了しました！
[INFO] トランケートが完了しました！
[INFO] すべての処理が完了しました！
```

## 本番実行時の手順（エクスポート & トランケート）

1. `eula_export.txt` を開いて利用規約を読む
2. `eula=false` → `eula=true` に変更して保存
3. バッチを起動 → 起動直後に自動で `false` にリセット
4. 最終警告確認で `EXECUTE` を入力（大文字のみ）
5. エクスポート実行確認で `EXECUTE` を入力（大文字のみ）
6. トランケート実行確認で `EXECUTE` を入力（大文字のみ）

> 本番環境では `EXECUTE` を **3回** 入力する必要があります。（最終警告 / エクスポート確認 / トランケート確認）

---

## ログ仕様（共通）

| 項目 | インポート | エクスポート & トランケート |
|------|-----------|--------------------------|
| 保存先 | `import\logs\` | `export\logs\` |
| ファイル名 | `import_YYYYMMDD_HHMMSS.log` | `export_truncate_YYYYMMDD_HHMMSS.log` |
| 記録内容 | 画面表示・MySQL実行結果・エラー詳細 | 画面表示・mysqldump結果・TRUNCATE結果・エラー詳細 |
| ログパス表示 | 終了時（成功・失敗問わず） | 終了時（成功・失敗問わず） |

---

## eula ファイルについて

```
eula=false  ← 通常時・起動直後に自動リセット
eula=true   ← 本番実行前に手動で変更
```

| ケース | 動作 |
|--------|------|
| ファイルが存在する | 起動時に値を読み込み即 false にリセット |
| ファイルが削除された | 本番チェック時に自動再生成（false の状態で生成） |
| true のまま放置 | 起動時に必ず false にリセットされるため誤実行不可 |

> `eula_import.txt` を `import\` フォルダに、`eula_export.txt` を `export\` フォルダにそのまま配置してください。
> リネーム不要です。利用規約の内容はツールごとに異なります（インポート用・エクスポート&トランケート用）。

