# 営業日報システム API仕様書

## 改訂履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| 1.0 | 2026-05-23 | 初版作成 |

---

## 基本仕様

| 項目 | 内容 |
|------|------|
| ベースURL | `https://api.example.com/v1` |
| プロトコル | HTTPS |
| データ形式 | JSON (`Content-Type: application/json`) |
| 文字コード | UTF-8 |
| 認証方式 | JWT Bearer Token |

---

## 認証

ログイン以外の全エンドポイントはリクエストヘッダーに JWT トークンが必要です。

```
Authorization: Bearer <token>
```

---

## 共通レスポンス形式

### 成功時

```json
{
  "data": { ... }
}
```

### エラー時

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "details": [
      { "field": "email", "message": "メール形式で入力してください" }
    ]
  }
}
```

---

## 共通エラーコード

| HTTPステータス | コード | 説明 |
|--------------|--------|------|
| 400 | `VALIDATION_ERROR` | バリデーションエラー |
| 401 | `UNAUTHORIZED` | 未認証（トークンなし・期限切れ） |
| 403 | `FORBIDDEN` | 権限なし |
| 404 | `NOT_FOUND` | リソースが存在しない |
| 409 | `CONFLICT` | 重複エラー（例：同日に日報が既に存在） |
| 500 | `INTERNAL_SERVER_ERROR` | サーバーエラー |

---

## エンドポイント一覧

| メソッド | パス | 概要 | 権限 |
|---------|------|------|------|
| POST | /auth/login | ログイン | 全員 |
| POST | /auth/logout | ログアウト | 全員 |
| GET | /reports | 日報一覧取得 | 全員 |
| POST | /reports | 日報作成 | 営業 |
| GET | /reports/:id | 日報詳細取得 | 全員 |
| PUT | /reports/:id | 日報更新 | 営業（本人・当日） |
| DELETE | /reports/:id | 日報削除 | 営業（本人・当日） |
| POST | /reports/:id/comments | コメント投稿 | 上長 |
| DELETE | /comments/:id | コメント削除 | 上長（本人） |
| GET | /customers | 顧客一覧取得 | 全員 |
| POST | /customers | 顧客登録 | 上長 |
| GET | /customers/:id | 顧客詳細取得 | 全員 |
| PUT | /customers/:id | 顧客更新 | 上長 |
| DELETE | /customers/:id | 顧客削除 | 上長 |
| GET | /users | 営業一覧取得 | 上長 |
| POST | /users | 営業登録 | 上長 |
| GET | /users/:id | 営業詳細取得 | 上長 |
| PUT | /users/:id | 営業更新 | 上長 |
| DELETE | /users/:id | 営業削除 | 上長 |

---

## 認証 API

### POST /auth/login

ログインしてJWTトークンを取得します。

**リクエスト**

```json
{
  "email": "yamada@company.com",
  "password": "password123"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| email | string | ○ | メールアドレス |
| password | string | ○ | パスワード |

**レスポンス `200 OK`**

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2026-05-24T09:00:00Z",
    "user": {
      "user_id": 1,
      "name": "山田 太郎",
      "email": "yamada@company.com",
      "role": "sales",
      "department": "東日本営業部"
    }
  }
}
```

**エラー**

| ステータス | コード | 条件 |
|-----------|--------|------|
| 400 | `VALIDATION_ERROR` | 未入力項目あり |
| 401 | `UNAUTHORIZED` | メールアドレスまたはパスワードが不一致 |

---

### POST /auth/logout

ログアウトしてトークンを無効化します。

**リクエスト**

リクエストボディなし。`Authorization` ヘッダーのトークンを無効化します。

**レスポンス `204 No Content`**

---

## 日報 API

### GET /reports

日報一覧を取得します。営業は自分の日報のみ取得できます。上長は全員分取得できます。

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 | 例 |
|-----------|-----|------|------|-----|
| from | string (date) | × | 期間開始日 | `2026-05-01` |
| to | string (date) | × | 期間終了日 | `2026-05-31` |
| user_id | integer | × | 担当者ID（上長のみ指定可） | `1` |
| page | integer | × | ページ番号（デフォルト: 1） | `1` |
| per_page | integer | × | 1ページの件数（デフォルト: 20、最大: 100） | `20` |

**レスポンス `200 OK`**

```json
{
  "data": {
    "reports": [
      {
        "report_id": 10,
        "report_date": "2026-05-23",
        "user": {
          "user_id": 1,
          "name": "山田 太郎"
        },
        "visit_count": 3,
        "comment_count": 2,
        "unread_comment_count": 1,
        "created_at": "2026-05-23T18:00:00Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "per_page": 20,
      "total_pages": 3
    }
  }
}
```

---

### POST /reports

日報を新規作成します。

**リクエスト**

```json
{
  "report_date": "2026-05-23",
  "visit_records": [
    {
      "customer_id": 5,
      "content": "提案書を提出し、担当者からおおむね好感触を得た。",
      "visit_order": 1
    },
    {
      "customer_id": 8,
      "content": "ヒアリングを実施。課題は予算感のすり合わせ。",
      "visit_order": 2
    }
  ],
  "problem": "〇〇社の意思決定者にアプローチできていない。どのように接触すべきか相談したい。",
  "plan": "・△△商事にフォローアップの電話\n・提案書の修正"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| report_date | string (date) | ○ | 日報の対象日 |
| visit_records | array | ○ | 訪問記録（1件以上） |
| visit_records[].customer_id | integer | ○ | 顧客ID |
| visit_records[].content | string | ○ | 訪問内容（1000文字以内） |
| visit_records[].visit_order | integer | ○ | 訪問順序 |
| problem | string | × | 課題・相談（2000文字以内） |
| plan | string | × | 明日やること（2000文字以内） |

**レスポンス `201 Created`**

```json
{
  "data": {
    "report_id": 10,
    "report_date": "2026-05-23",
    "user": {
      "user_id": 1,
      "name": "山田 太郎"
    },
    "visit_records": [
      {
        "visit_id": 20,
        "customer": {
          "customer_id": 5,
          "name": "鈴木 様",
          "company_name": "株式会社〇〇"
        },
        "content": "提案書を提出し、担当者からおおむね好感触を得た。",
        "visit_order": 1
      },
      {
        "visit_id": 21,
        "customer": {
          "customer_id": 8,
          "name": "田中 様",
          "company_name": "△△商事"
        },
        "content": "ヒアリングを実施。課題は予算感のすり合わせ。",
        "visit_order": 2
      }
    ],
    "problem": "〇〇社の意思決定者にアプローチできていない。どのように接触すべきか相談したい。",
    "plan": "・△△商事にフォローアップの電話\n・提案書の修正",
    "comments": [],
    "created_at": "2026-05-23T18:00:00Z",
    "updated_at": "2026-05-23T18:00:00Z"
  }
}
```

**エラー**

| ステータス | コード | 条件 |
|-----------|--------|------|
| 400 | `VALIDATION_ERROR` | 訪問記録が0件、必須項目未入力など |
| 403 | `FORBIDDEN` | 営業以外が実行 |
| 409 | `CONFLICT` | 同日の日報が既に存在する |

---

### GET /reports/:id

日報の詳細を取得します。

**パスパラメータ**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| id | integer | 日報ID |

**レスポンス `200 OK`**

```json
{
  "data": {
    "report_id": 10,
    "report_date": "2026-05-23",
    "user": {
      "user_id": 1,
      "name": "山田 太郎",
      "department": "東日本営業部"
    },
    "visit_records": [
      {
        "visit_id": 20,
        "customer": {
          "customer_id": 5,
          "name": "鈴木 様",
          "company_name": "株式会社〇〇"
        },
        "content": "提案書を提出し、担当者からおおむね好感触を得た。",
        "visit_order": 1
      }
    ],
    "problem": "〇〇社の意思決定者にアプローチできていない。",
    "plan": "・△△商事にフォローアップの電話",
    "comments": [
      {
        "comment_id": 3,
        "user": {
          "user_id": 2,
          "name": "佐藤 部長"
        },
        "content": "〇〇社の件は、まず担当窓口に連絡してみましょう。",
        "created_at": "2026-05-23T19:30:00Z"
      }
    ],
    "created_at": "2026-05-23T18:00:00Z",
    "updated_at": "2026-05-23T18:00:00Z"
  }
}
```

**エラー**

| ステータス | コード | 条件 |
|-----------|--------|------|
| 403 | `FORBIDDEN` | 営業が他者の日報を取得しようとした |
| 404 | `NOT_FOUND` | 日報が存在しない |

---

### PUT /reports/:id

日報を更新します。当日の日報のみ更新できます。

**パスパラメータ**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| id | integer | 日報ID |

**リクエスト**

POST /reports と同じ形式。`report_date` は変更不可のため不要。

```json
{
  "visit_records": [
    {
      "customer_id": 5,
      "content": "提案書を提出し、追加資料の依頼をもらった。",
      "visit_order": 1
    }
  ],
  "problem": "更新後の課題テキスト",
  "plan": "更新後のプランテキスト"
}
```

**レスポンス `200 OK`**

GET /reports/:id と同じ形式。

**エラー**

| ステータス | コード | 条件 |
|-----------|--------|------|
| 403 | `FORBIDDEN` | 本人以外、または上長が実行 |
| 403 | `FORBIDDEN` | 当日以外の日報を更新しようとした |
| 404 | `NOT_FOUND` | 日報が存在しない |

---

### DELETE /reports/:id

日報を削除します。当日の日報のみ削除できます。

**パスパラメータ**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| id | integer | 日報ID |

**レスポンス `204 No Content`**

**エラー**

| ステータス | コード | 条件 |
|-----------|--------|------|
| 403 | `FORBIDDEN` | 本人以外、または上長が実行 |
| 403 | `FORBIDDEN` | 当日以外の日報を削除しようとした |
| 404 | `NOT_FOUND` | 日報が存在しない |

---

## コメント API

### POST /reports/:id/comments

日報にコメントを投稿します。

**パスパラメータ**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| id | integer | 日報ID |

**リクエスト**

```json
{
  "content": "〇〇社の件は、まず担当窓口に連絡してみましょう。"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| content | string | ○ | コメント本文（2000文字以内） |

**レスポンス `201 Created`**

```json
{
  "data": {
    "comment_id": 3,
    "report_id": 10,
    "user": {
      "user_id": 2,
      "name": "佐藤 部長"
    },
    "content": "〇〇社の件は、まず担当窓口に連絡してみましょう。",
    "created_at": "2026-05-23T19:30:00Z"
  }
}
```

**エラー**

| ステータス | コード | 条件 |
|-----------|--------|------|
| 400 | `VALIDATION_ERROR` | 内容が空または2000文字超 |
| 403 | `FORBIDDEN` | 上長以外が実行 |
| 404 | `NOT_FOUND` | 日報が存在しない |

---

### DELETE /comments/:id

コメントを削除します。自分が投稿したコメントのみ削除できます。

**パスパラメータ**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| id | integer | コメントID |

**レスポンス `204 No Content`**

**エラー**

| ステータス | コード | 条件 |
|-----------|--------|------|
| 403 | `FORBIDDEN` | 他者のコメントを削除しようとした |
| 404 | `NOT_FOUND` | コメントが存在しない |

---

## 顧客マスタ API

### GET /customers

顧客一覧を取得します。

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| q | string | × | 顧客名 / 会社名の部分一致検索 |
| page | integer | × | ページ番号（デフォルト: 1） |
| per_page | integer | × | 1ページの件数（デフォルト: 20、最大: 100） |

**レスポンス `200 OK`**

```json
{
  "data": {
    "customers": [
      {
        "customer_id": 5,
        "name": "鈴木 様",
        "company_name": "株式会社〇〇",
        "phone": "03-0000-0001",
        "address": "東京都〇〇区..."
      }
    ],
    "pagination": {
      "total": 30,
      "page": 1,
      "per_page": 20,
      "total_pages": 2
    }
  }
}
```

---

### POST /customers

顧客を新規登録します。

**リクエスト**

```json
{
  "name": "鈴木 様",
  "company_name": "株式会社〇〇",
  "phone": "03-0000-0001",
  "address": "東京都〇〇区..."
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| name | string | ○ | 顧客名（255文字以内） |
| company_name | string | ○ | 会社名（255文字以内） |
| phone | string | × | 電話番号（20文字以内） |
| address | string | × | 住所（500文字以内） |

**レスポンス `201 Created`**

```json
{
  "data": {
    "customer_id": 5,
    "name": "鈴木 様",
    "company_name": "株式会社〇〇",
    "phone": "03-0000-0001",
    "address": "東京都〇〇区...",
    "created_at": "2026-05-23T10:00:00Z",
    "updated_at": "2026-05-23T10:00:00Z"
  }
}
```

**エラー**

| ステータス | コード | 条件 |
|-----------|--------|------|
| 400 | `VALIDATION_ERROR` | 必須項目未入力、文字数超過 |
| 403 | `FORBIDDEN` | 上長以外が実行 |

---

### GET /customers/:id

顧客の詳細を取得します。

**レスポンス `200 OK`**

POST /customers のレスポンスと同じ形式。

---

### PUT /customers/:id

顧客情報を更新します。

**リクエスト**

POST /customers と同じ形式。

**レスポンス `200 OK`**

POST /customers のレスポンスと同じ形式。

**エラー**

| ステータス | コード | 条件 |
|-----------|--------|------|
| 403 | `FORBIDDEN` | 上長以外が実行 |
| 404 | `NOT_FOUND` | 顧客が存在しない |

---

### DELETE /customers/:id

顧客を削除します。

**レスポンス `204 No Content`**

**エラー**

| ステータス | コード | 条件 |
|-----------|--------|------|
| 403 | `FORBIDDEN` | 上長以外が実行 |
| 404 | `NOT_FOUND` | 顧客が存在しない |
| 409 | `CONFLICT` | 訪問記録に紐づいているため削除不可 |

---

## 営業マスタ API

### GET /users

ユーザー一覧を取得します。

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| role | string | × | `sales` または `manager` で絞り込み |
| page | integer | × | ページ番号（デフォルト: 1） |
| per_page | integer | × | 1ページの件数（デフォルト: 20、最大: 100） |

**レスポンス `200 OK`**

```json
{
  "data": {
    "users": [
      {
        "user_id": 1,
        "name": "山田 太郎",
        "email": "yamada@company.com",
        "role": "sales",
        "department": "東日本営業部",
        "created_at": "2026-04-01T09:00:00Z"
      }
    ],
    "pagination": {
      "total": 10,
      "page": 1,
      "per_page": 20,
      "total_pages": 1
    }
  }
}
```

---

### POST /users

ユーザーを新規登録します。

**リクエスト**

```json
{
  "name": "山田 太郎",
  "email": "yamada@company.com",
  "role": "sales",
  "department": "東日本営業部",
  "password": "initialPass123"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| name | string | ○ | 氏名（100文字以内） |
| email | string | ○ | メールアドレス（255文字以内、重複不可） |
| role | string | ○ | `sales` または `manager` |
| department | string | × | 部署名（100文字以内） |
| password | string | ○ | 初期パスワード（8文字以上） |

**レスポンス `201 Created`**

```json
{
  "data": {
    "user_id": 1,
    "name": "山田 太郎",
    "email": "yamada@company.com",
    "role": "sales",
    "department": "東日本営業部",
    "created_at": "2026-05-23T10:00:00Z",
    "updated_at": "2026-05-23T10:00:00Z"
  }
}
```

**エラー**

| ステータス | コード | 条件 |
|-----------|--------|------|
| 400 | `VALIDATION_ERROR` | 必須項目未入力、パスワード8文字未満など |
| 403 | `FORBIDDEN` | 上長以外が実行 |
| 409 | `CONFLICT` | メールアドレスが既に登録済み |

---

### GET /users/:id

ユーザーの詳細を取得します。

**レスポンス `200 OK`**

POST /users のレスポンスと同じ形式。

---

### PUT /users/:id

ユーザー情報を更新します。パスワードは指定した場合のみ変更されます。

**リクエスト**

```json
{
  "name": "山田 太郎",
  "email": "yamada@company.com",
  "role": "sales",
  "department": "西日本営業部",
  "password": "newPass456"
}
```

`password` は省略可。省略した場合は変更されません。

**レスポンス `200 OK`**

POST /users のレスポンスと同じ形式。

**エラー**

| ステータス | コード | 条件 |
|-----------|--------|------|
| 403 | `FORBIDDEN` | 上長以外が実行 |
| 404 | `NOT_FOUND` | ユーザーが存在しない |
| 409 | `CONFLICT` | メールアドレスが既に他ユーザーで使用済み |

---

### DELETE /users/:id

ユーザーを削除します。

**レスポンス `204 No Content`**

**エラー**

| ステータス | コード | 条件 |
|-----------|--------|------|
| 403 | `FORBIDDEN` | 上長以外が実行 |
| 404 | `NOT_FOUND` | ユーザーが存在しない |
| 409 | `CONFLICT` | 日報が紐づいているため削除不可 |

---

## roleフィールドの値

| 値 | 意味 |
|----|------|
| `sales` | 営業担当者 |
| `manager` | 上長 |
