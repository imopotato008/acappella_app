# アカペラバンド運営Webアプリ
## 詳細設計書：データベース & 集計・投票ロジック

**バージョン：2.0（仕様確定版）**

---

## 1. データベース設計 (ER・テーブル定義)

### 1.1 テーブル定義

#### ① `users`（メンバー）
個人情報を排除し、プライバシー保護と最小限の認証・表示項目に厳選。
| カラム名 | 型 | NULL | 初期値 | 説明 |
|---|---|---|---|---|
| id | VARCHAR(50) | NO | | メンバー固有ID (PK, 半角英数, ログイン用) |
| password | VARCHAR(255) | NO | | ログインパスワード |
| nickname | VARCHAR(100) | NO | | あだ名・バンド内表示名 |
| bio | TEXT | YES | | 自己紹介・ひとこと |
| is_admin | BOOLEAN | NO | FALSE | 管理者権限（アカウント作成権限） |

#### ② `locations`（練習場所マスタ）
| カラム名 | 型 | NULL | 初期値 | 説明 |
|---|---|---|---|---|
| id | UUID / String | NO | | 練習場所ID (PK) |
| name | VARCHAR(150) | NO | | 施設名・スタジオ名 |
| address | VARCHAR(255) | YES | | 住所・最寄駅 |
| memo | TEXT | YES | | 設備、音出しルール等のメモ |
| map_url | TEXT | YES | | Google Mapの共有URL |
| created_by | VARCHAR(50) | YES | | 登録者 (users.id, FK) |
| created_at | TIMESTAMPTZ | NO | now() | 登録日時 |

#### ③ `events`（日程調整イベント）
| カラム名 | 型 | NULL | 初期値 | 説明 |
|---|---|---|---|---|
| id | UUID / String | NO | | イベントID (PK) |
| title | VARCHAR(200) | NO | | イベント名 |
| description | TEXT | YES | | 備考・説明 |
| organizer_id | VARCHAR(50) | NO | | 幹事 (users.id, FK) |
| date_type | VARCHAR(20) | NO | | 'candidate' (候補日指定) / 'range' (期間指定) |
| start_date | DATE | YES | | 期間指定時の開始日 |
| end_date | DATE | YES | | 期間指定時の終了日 |
| duration_minutes | INTEGER | NO | 120 | 練習時間（30分刻み） |
| deadline | TIMESTAMPTZ | NO | | 回答締め切り日時 |
| voting_deadline | TIMESTAMPTZ | YES | | 最終投票の締め切り日時 |
| status | VARCHAR(30) | NO | 'open' | 'open'(回答中), 'aggregated'(集計済), 'voting'(投票中), 'confirmed'(確定), 'completed'(練習終了), 'cancelled'(中止) |
| confirmed_candidate_id | UUID / String | YES | | 確定した候補ID (final_vote_candidates.id) |
| created_at | TIMESTAMPTZ | NO | now() | 作成日時 |

#### ④ `event_candidate_dates`（候補日一覧）
| カラム名 | 型 | NULL | 初期値 | 説明 |
|---|---|---|---|---|
| id | UUID / String | NO | | 候補日ID (PK) |
| event_id | UUID / String | NO | | イベントID (events.id, FK) |
| candidate_date | DATE | NO | | 候補日 ("YYYY-MM-DD") |

#### ⑤ `event_responses`（メンバー回答ヘッダー）
| カラム名 | 型 | NULL | 初期値 | 説明 |
|---|---|---|---|---|
| id | UUID / String | NO | | 回答ID (PK) |
| event_id | UUID / String | NO | | イベントID (events.id, FK) |
| user_id | VARCHAR(50) | NO | | 回答者 (users.id, FK) |
| can_attend | BOOLEAN | NO | | 参加可能 (TRUE) / 参加不可 (FALSE) |
| memo | TEXT | YES | | コメント・連絡事項 |
| updated_at | TIMESTAMPTZ | NO | now() | 更新日時 |

#### ⑥ `response_time_slots`（参加可能時間帯）
※ `can_attend = TRUE` の場合のみ登録。30分単位。
| カラム名 | 型 | NULL | 初期値 | 説明 |
|---|---|---|---|---|
| id | UUID / String | NO | | 時間帯ID (PK) |
| response_id | UUID / String | NO | | 回答ID (event_responses.id, FK) |
| slot_date | DATE | NO | | 日付 |
| start_time | TIME | NO | | 開始時刻 (例: 13:00) |
| end_time | TIME | NO | | 終了時刻 (例: 17:30) |

#### ⑦ `response_slot_locations`（時間帯ごとの利用可能場所）
| カラム名 | 型 | NULL | 初期値 | 説明 |
|---|---|---|---|---|
| id | UUID / String | NO | | スロット場所ID (PK) |
| slot_id | UUID / String | NO | | 時間帯ID (response_time_slots.id, FK) |
| location_id | UUID / String | NO | | 練習場所ID (locations.id, FK) |
| *(備考)* | | | | 場所希望順位（priority_rank）は廃止し、利用可能な場所をフラットに複数選択可能 |

#### ⑧ `final_vote_candidates`（集計された候補枠）
| カラム名 | 型 | NULL | 初期値 | 説明 |
|---|---|---|---|---|
| id | UUID / String | NO | | 候補ID (PK) |
| event_id | UUID / String | NO | | イベントID (events.id, FK) |
| candidate_date | DATE | NO | | 開催日 |
| start_time | TIME | NO | | 開始時刻 |
| end_time | TIME | NO | | 終了時刻 |
| location_id | UUID / String | NO | | 練習場所ID (locations.id, FK) |
| attendee_count | INTEGER | NO | | 参加可能総人数 (フル参加 + 途中参加) |
| band_practice_minutes | INTEGER | NO | 0 | バンドとして練習可能な共通時間（分、参加人数は乗算しない） |
| attendee_user_ids | JSONB / Array | NO | | 参加可能メンバーIDのリスト |
| full_attendee_user_ids | JSONB / Array | NO | | フル参加可能なメンバーIDのリスト |
| partial_attendee_user_ids | JSONB / Array | NO | | 途中参加・途中退出（遅刻・早退）のメンバーIDリスト |
| attendee_details | JSONB / Object | NO | | メンバーごとの参加詳細 (`{ userId, type: "full" \| "late" \| "early" \| "partial", overlapMinutes, overlapStart, overlapEnd }`) |

#### ⑨ `final_votes`（最終投票）
| カラム名 | 型 | NULL | 初期値 | 説明 |
|---|---|---|---|---|
| id | UUID / String | NO | | 投票ID (PK) |
| event_id | UUID / String | NO | | イベントID (events.id, FK) |
| candidate_id | UUID / String | NO | | 投票先候補 (final_vote_candidates.id, FK) |
| user_id | VARCHAR(50) | NO | | 投票者 (users.id, FK) |
| created_at | TIMESTAMPTZ | NO | now() | 投票日時 |

---

## 2. 集計・確定・投票アルゴリズム仕様

### 2.1 最大練習時間候補の抽出と確定ロジック
1. **スロット分割**: 回答された時間帯を **30分刻みの区間** に分解。
2. **走査と重なり判定**: 
   - 練習時間（`durationMinutes`）分の候補枠 `[startM, endM]` を30分刻みでスライド走査。
   - 各メンバーの回答スロットについて、候補枠と共通の練習場所を選択しており、かつ **30分以上の重なり**（Overlap）があるかを判定。
   - 重なり度合いにより参加タイプを自動分類：
     - `full`: 練習枠全体に参加可能（`slotStart <= startM && slotEnd >= endM`）
     - `late`: 遅刻参加（`slotStart > startM && slotEnd >= endM`）
     - `early`: 早退（`slotStart <= startM && slotEnd < endM`）
     - `partial`: 途中参加・途中退出（`slotStart > startM && slotEnd < endM`）
3. **候補枠の多段絞り込み**:
   - **第1基準（最も多くの人が参加可能）**: 総参加人数（`attendeeCount`）が最大の候補を抽出。
   - **第2基準（最も多くの時間練習が可能）**: 第1基準を満たす候補群の中で、メンバー全員の合計参加可能時間（`totalAttendanceMinutes`）が最大の候補を抽出。
   - **第3基準（フル参加可能なメンバーが最も多い）**: 第2基準を満たす候補群の中で、フル参加人数（`fullAttendeeUserIds.length`）が最大の候補を抽出。
4. **自動確定 vs 最終投票の分岐**:
   - **候補が1件のみに絞り込まれた場合**: 最終投票を行わず、直ちに日程確定（`status = 'confirmed'`）とする。
   - **上記3基準をすべて適用しても複数候補が残った場合のみ**: 最終投票を開始（`status = 'voting'`）し、投票期限を設定。
   - **候補が0件の場合**: `status = 'aggregated'` とし再調整を促す。

### 2.2 最終投票とタイブレークルール
1. **投票資格**: 該当する候補枠の `attendee_user_ids` に含まれる（参加可能）メンバーのみ。
2. **投票と取り消し**: 候補をクリックして投票可能。既に投票済みの候補を再度クリックすると投票を取り消せる（トグル操作）。別の候補をクリックした場合は投票先を変更。
3. **投票期限内**: 日程の確定は一切行えない（幹事の手動決定も不可）。
4. **投票期限終了時**:
   - **最多得票が単独1位**: 自動的にその候補で確定。
   - **最多得票が同票の場合**: 場所希望スコアによる決定は行わず、幹事に確定権限が付与され、同票候補の中から幹事が手動選択して最終決定する。

### 2.3 練習終了の自動判定
- 確定済み（`status = 'confirmed'`）のイベントについて、確定枠の終了時刻（`candidate_date + end_time`）を経過した場合、自動的に `status = 'completed'` に更新され、過去の実施記録としてアーカイブされる。
