# PMP 共好看板網站化 TODO（Vercel + Supabase）

更新日期：2026-03-06
來源檔案：`共好看板.xlsx`

## 0) 實作前已確認資訊

- GitHub Repository：`https://github.com/nicholas-yahung-chien/pm-abc`
- Vercel：local 環境已完成登入（後續可直接用 CLI/API 建立並綁定專案）。
- Supabase Access Token：已提供（`sbp_...f8e9`），將只用於本機環境變數與 GitHub/Vercel secrets，不寫入版本庫。
- 開發原則：所有敏感資訊（Supabase token、Vercel token、SMTP/Zoom secrets）一律走 secrets manager，不出現在程式碼與文件明文。

## 1) 報表內容分析摘要

### 1.1 工作表與用途（依現有報表）
- `通訊錄`：學員/教練聯絡資訊（姓名、LINE、稱呼、電話、Email、自介）。
- `R&R`：小組角色與職責（小組長、副組長、資訊長、值日生、教練等）。
- `小組團隊章程`：隊名、隊呼、目標、價值、成員名單、溝通規則、決策方式、會議指引。
- `讀書會`：每週讀書會日期時間、場地、值日生、當週完成事項、回家功課、里程碑。
- `導讀分配`：每週課程章節導讀者分派（含講師、主題、章節、頁碼）。
- `追蹤表`：核心進度追蹤表（多層級項目 + 每位學員狀態 + 整體彙整）。

### 1.2 觀察到的實際資料規模（本檔）
- 通訊錄有效人員：11 筆（含教練 1）。
- R&R 角色列：7 列。
- 讀書會週次：12 場（相見歡 + 第1~11周）。
- 導讀分配列：44 列（含總複習多章節彙整列）。
- 追蹤項目：71 列（Row 5~75）。

### 1.3 追蹤表的關鍵規則（網站必須保留）
- 階層結構：`大項 > 小項 > 細項`（例：`0.2.4`）。
- 每個追蹤項目會對每位學員記錄一個「值」，且值型別不只布林：
  - `bool`（完成/未完成）
  - `number`（測驗分數）
  - `date`（實際上場考試日期）
  - `enum`（例如 `實體/線上/未決定`、考上狀態代碼）
- 專案完成度計算：
  - 既有公式邏輯為「非空、非 `FALSE`、非 `未決定`、非 `尚未考上` 視為完成」。
- 追蹤項目可附外部連結（報表中有大量 hyperlink）。
- 顏色語意：
  - 橘色底：例題/隨堂考
  - 黃色底：重要考核點

### 1.4 從報表推導出的實務流程
- 一個班別有多個小組；每組有教練與學員。
- 讀書會與導讀分配是每週學習節奏核心，會直接影響追蹤項目。
- 教練需根據「預定時間前未完成」進行提醒（需自動化通知）。
- 小組內需要公告/群發、投票決策、線上會議（Zoom）支援。

## 2) 功能模組規劃（對應需求 1~14）

### 2.1 組織與主資料
- 班別建立與管理。
- 小組建立與管理（隸屬班別）。
- 教練資料建立與管理。
- 學員資料建立與管理。
- 角色定義、角色分派、職責說明管理。

### 2.2 團隊共識與學習運營
- 小組團隊章程編輯（可區塊化：目標、價值、協定、會議原則）。
- 每週上課與讀書會建立管理（日期、地點、線上/實體、值日生）。
- 導讀章節與負責人分配（可跨多章節、可批次分派）。

### 2.3 追蹤管理（核心）
- 追蹤項目 CRUD：大項/小項/細項、排序、複製、刪除、移動。
- 項目內容支援：文字、分數、日期、單選狀態、外部連結、附件。
- 每位學員的進度值填寫與檢視。
- 完成率、里程碑、警示與報表彙整。

### 2.4 通知與協作
- 自動提醒：依追蹤項目到期、上課日、讀書會日寄送通知。
- Zoom 自動建會：當讀書會設定為 `線上/ZOOM` 時自動建會並發送連結。
- 群發信：教練/組員可對組內成員發信。
- 投票：可發起議題投票（時段、決策事項）。

## 3) 技術規劃（Vercel + Supabase）

### 3.1 建議技術組成
- 前端/後端：Next.js（部署 Vercel）。
- DB/Auth/Storage：Supabase（Postgres + Auth + Storage + RLS）。
- 排程與自動化：Supabase Edge Functions + Scheduler（或 Vercel Cron）。
- 郵件：Resend 或 SendGrid。
- Zoom：Zoom OAuth Server-to-Server / OAuth App。

### 3.2 權限模型（最小可用）
- `platform_admin`：平台維運。
- `coach`：管理其班別/小組資料、追蹤、通知、投票。
- `member`：更新自身進度、查看小組資訊、參與投票、群發（可控權限）。

### 3.3 資料表草案（首版）
- `classes`, `groups`, `profiles`, `group_memberships`
- `role_definitions`, `role_assignments`
- `team_charters`, `team_charter_sections`
- `sessions`（上課/讀書會）
- `reading_assignments`
- `tracking_items`（樹狀結構：parent_id + sort_order）
- `tracking_item_links`, `tracking_item_attachments`
- `tracking_member_values`（儲存 bool/number/date/text/enum）
- `notifications`, `email_logs`
- `zoom_meetings`
- `polls`, `poll_options`, `poll_votes`

### 3.4 GitHub 管理與 CI/CD 佈署策略
- 程式碼與文件統一使用 GitHub Repository 管理（main + feature branch + Pull Request）。
- 分支保護：`main` 強制 PR、至少 1 位 reviewer、CI 全綠才可 merge。
- GitHub Actions 作為 CI 中樞：
  - PR 階段：lint、type-check、unit test、build、(可選) e2e smoke。
  - merge 到 `main`：自動觸發部署流程。
- Vercel 佈署策略：
  - PR 自動建立 Preview Deployment（供教練/PM 驗收）。
  - `main` 自動部署到 Production。
- Supabase 佈署策略：
  - DB schema 以 migration 檔案版本化（`supabase/migrations`）。
  - CI 驗證 migration 可執行；CD 於 merge 後自動套用到目標環境。
  - 嚴禁手動改正式資料庫結構（避免 drift）。
- Secrets 管理：
  - 以 GitHub Environments 管理 `dev/stage/prod` secrets。
  - Vercel / Supabase API token 僅放在 GitHub Secrets 與平台環境變數。
- 回滾策略：
  - 前端以 Vercel previous deployment 快速回退。
  - 資料庫以 migration down plan 或修補 migration 回復。

## 4) 開發 TODO 清單（可直接執行）

## Phase 0: 專案啟動與規格確認
- [ ] 建立 PRD v1（明確定義 MVP 範圍與非 MVP 功能）。
- [ ] 釐清追蹤項目「到期日」來源規則（手動、週次映射、偏移天數）。
- [ ] 定義完成率計算規則（是否完全沿用 Excel 邏輯）。
- [ ] 盤點並確認欄位字典（班別/小組/人員/角色/章程/追蹤）。
- [ ] 制定資料匯入策略（Excel -> DB）。
- [x] 建立 GitHub Repo 與權限模型（Owner/Maintainer/Developer）。
- [ ] 建立 Git Flow 規範（branch naming、commit convention、PR template、code owners）。
- [ ] 設定分支保護規則（PR 必要、CI 必要、review 必要）。
- [ ] 建立多環境策略（`dev`/`staging`/`prod` 對應 Vercel + Supabase）。
- [x] 將現有工作目錄初始化並連接到指定 GitHub repo。
- [x] 建立 `.gitignore` 與 secrets policy（禁止 `.env*`、token 檔進版控）。

## Phase 1: 基礎架構與帳號權限
- [x] 初始化 Next.js 專案（App Router, TypeScript, i18n/zh-TW）。
- [ ] 建立 Supabase 專案與環境變數管理（dev/stage/prod）。
- [ ] 完成 Auth（Email magic link 或密碼登入）。
- [ ] 完成 RLS 策略（班別/小組級別隔離）。
- [ ] 建立共用 UI Layout（桌機/平板/手機 RWD）。
- [x] 建立 GitHub Actions CI（lint / type-check / test / build）。
- [ ] 串接 Vercel GitHub Integration（PR Preview + main Production）。
- [x] 建立 Supabase migration 流程（CLI、migration 產生、CI 驗證、CD 套用）。
- [x] 設定 GitHub Environments + Secrets（Vercel、Supabase、Mail、Zoom）。
- [x] 建立部署守門條件（未通過 CI 禁止部署）。
- [x] 根據專案性質自動建立並命名 Vercel 專案（由 repo 綁定，啟用 Preview/Production）。
- [x] 將 Supabase Access Token 設為 GitHub Actions 與本機 CLI 所需 secret（不入庫）。

## Phase 2: 核心主資料 CRUD
- [x] 班別管理（建立/編輯/封存）。
- [x] 小組管理（建立/編輯/教練指派）。
- [x] 教練與學員資料 CRUD。
- [x] 角色管理與分派（支援自訂角色）。
- [x] 通訊錄頁（搜尋、篩選、匯出）。

## Phase 3: 團隊章程與課程運營
- [ ] 團隊章程編輯器（區塊化欄位 + 版本記錄）。
- [ ] 上課/讀書會排程 CRUD。
- [ ] 導讀分配 CRUD（支援批次分派與輪替建議）。
- [ ] 週次看板（本週待辦、值日生、導讀者、場地）。

## Phase 4: 追蹤表引擎（核心）
- [ ] 建立追蹤項目樹狀資料結構（大項/小項/細項）。
- [ ] 支援項目操作：新增、刪除、複製、拖拉排序、跨層移動。
- [ ] 支援欄位型別：布林、分數、日期、單選、文字。
- [ ] 支援項目外部連結與附件。
- [ ] 建立每位學員進度填報 UI（表格/卡片雙視圖）。
- [ ] 建立完成率與里程碑計算服務。
- [ ] 建立學員/教練進度儀表板（逾期、未完成、即將到期）。

## Phase 5: 自動通知與整合
- [ ] 郵件模板系統（提醒、公告、會議通知、投票通知）。
- [ ] 自動提醒排程（到期前 N 天、逾期當日、逾期後追蹤）。
- [ ] 讀書會/上課事件通知（含行事曆連結）。
- [ ] Zoom API 整合（線上場次自動建會 + 同步 meeting link）。
- [ ] 群發信功能（收件對象：全組/角色/自選）。

## Phase 6: 投票與決策
- [ ] 投票建立（單選/多選、截止時間、匿名與否）。
- [ ] 投票頁與即時統計。
- [ ] 投票結果公告與通知。

## Phase 7: 視覺與品牌對齊（pm-abc.com.tw）
- [ ] 盤點並擷取授權素材（字型、圖片、icon、色彩）。
- [ ] 建立設計 token（color, type, spacing, radius, shadow）。
- [ ] 建立 UI 元件庫（表格、表單、看板、時間軸、通知中心）。
- [ ] 完成 RWD 調整（Desktop/Tablet/Mobile）。

## Phase 8: 品質、上線與維運
- [ ] 單元測試（計算邏輯、權限、提醒規則）。
- [ ] E2E 測試（教練流程、學員流程、通知流程）。
- [ ] 匯入一份真實班別資料做 UAT。
- [ ] 效能與安全檢查（RLS、API rate limit、審計日誌）。
- [ ] 部署至 Vercel + Supabase 正式環境。
- [ ] 建立 release 流程（tag、release notes、hotfix 流程）。
- [ ] 建立 rollback runbook（Vercel 回退、Supabase migration 修補）。
- [ ] 建立 CI/CD 監控與告警（GitHub Actions、Vercel、Supabase）。
- [ ] 建立部署後 smoke test（含登入、主要 CRUD、通知與排程）。

## 5) MVP 建議切分（先做能用版本）
- MVP-1：班別/小組/學員/角色 + 通訊錄。
- MVP-2：讀書會 + 導讀分配 + 團隊章程。
- MVP-3：追蹤表（含排序/複製/移動/完成率）。
- MVP-4：自動郵件提醒 + 群發信。
- MVP-5：Zoom 自動建會 + 投票。

## 6) 開發前待確認事項（建議先確認）
- [ ] 一位教練是否會同時管理多班、多組？
- [ ] 組員是否可見其他組員完整聯絡資訊（個資範圍）？
- [ ] 群發信是否允許所有組員發送，或僅限組長/教練？
- [ ] 投票是否需要匿名與防重複投票機制？
- [ ] 是否需要保留 Excel 匯出格式相容（供教練離線備份）？
- [ ] 「結業後幾天考上」的基準日期規則是否固定或可設定？
- [ ] GitHub 組織是否已有既定分支策略與 code review 規範需沿用？
- [ ] 正式環境部署是否需「手動核准」後才可由 GitHub Actions 佈署？
