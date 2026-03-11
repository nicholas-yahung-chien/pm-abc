# 文字編碼防呆原則（亂碼預防）

## 問題根因（本次）
- 本次亂碼不是瀏覽器或字型問題，而是原始碼中的繁中字串已被錯誤轉碼（mojibake）。
- 追蹤矩陣頁面中，部分文字被寫成錯誤字元後提交，造成前端直接顯示破字。

## 必須遵守的原則
1. 所有程式碼與文件一律使用 UTF-8 儲存（建議無 BOM）。
2. 以指令讀檔時，必須顯式指定 UTF-8（例如 PowerShell 使用 `Get-Content -Encoding UTF8 -LiteralPath`）。
3. 以指令寫檔時，禁止使用未指定編碼的 `Set-Content` / `Out-File`。
4. 優先使用 `apply_patch` 編輯文字，避免經過終端機編碼轉換管線。
5. 任何含繁中文字串的修改，提交前必跑 `npm run check:encoding`。
6. 發現亂碼時，不可只改畫面樣式，必須先修正源文字串，再重新建置驗證。

## 本專案防護機制
- 已新增 `web/scripts/check-encoding-safety.mjs`
  - 檢查 `U+FFFD`（`�`）
  - 檢查 Private Use Area 字元（常見亂碼特徵）
  - 檢查已知亂碼片段關鍵字
- 已將檢查加入 CI（`.github/workflows/ci.yml`）
  - PR 與 `main` push 皆會執行，失敗即阻擋。

## 開發者操作清單（每次改文字都要做）
1. `npm run check:encoding`
2. `npm run build`
3. 手動檢查追蹤矩陣關鍵區塊：
   - 表頭：`編號 / 里程碑 / 待辦事項`
   - 到期日標籤：`到期日：`
   - 空狀態文案（大項、小項、項目）

## 發生亂碼時的修復流程
1. 先定位受影響檔案與字串範圍。
2. 直接修正源碼文案為正確繁中。
3. 執行 `npm run check:encoding` 與 `npm run build`。
4. 以 UAT 驗證受影響頁面流程（至少含列表、新增、編輯、空狀態）。
