# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

営業日報システムの設計ドキュメント置き場。現時点ではコードは存在せず、要件定義・設計成果物のみ。

## ドキュメント構成

| ファイル | 内容 |
|--------|------|
| `画面定義書.md` | 全10画面のレイアウト・入力項目・画面遷移・権限制御 |
| `API仕様書.md` | REST API の全エンドポイント定義（リクエスト・レスポンス・エラー） |
| `テスト仕様書.md` | APIテスト・画面テスト・結合テストのケース一覧 |

## システムの主要設計方針

### ロール
- `sales`（営業）と `manager`（上長）の2種類のみ
- 認証は JWT Bearer Token

### 権限の境界
- 日報の作成・編集・削除は営業本人かつ**当日のみ**
- コメント投稿は上長のみ
- 顧客マスタ・営業マスタの編集は上長のみ
- 営業は自分の日報しか閲覧できない（上長は全員分）

### データ構造の要点
- 日報（`daily_reports`）は1ユーザー1日1件制約
- 訪問記録（`visit_records`）は1日報に複数行、顧客マスタへの外部キーを持つ
- コメント（`comments`）は日報に対してフラットに紐づく（スレッド構造なし）

### API設計の規約
- ベースURL: `/v1`
- 成功レスポンスは `{ "data": ... }`、エラーは `{ "error": { "code", "message", "details" } }`
- 削除時に参照整合性違反がある場合は `409 CONFLICT` を返す

## 画面設計
@画面定義書.md

## API仕様書
@API仕様書.md

## テスト仕様書
@テスト仕様書.md

## ER図
@要件定義書.md

# 使用技術
**言語：** TypeScript
**フレームワーク** Next.js(App Router)
**UIコンポーネント** shadcn/ui + Tailwind CSS
**APIスキーマ定義** OpenAPI(Zodによる検証)
**DBスキーマ定義** Prisma.js
**テスト** Vitest
**デプロイ** Google Cloud Run