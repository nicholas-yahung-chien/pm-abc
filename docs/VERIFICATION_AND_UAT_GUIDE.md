# Verification and UAT Guide

Use this guide after every development task to keep delivery quality consistent.

## 1) Developer Verification (must pass before handoff)

Run locally:

```bash
cd web
npm install
npm run lint
npm run build
```

Confirm local smoke test:

```bash
npm run dev
```

Check:

1. Home page loads without runtime error.
2. Main navigation routes open successfully:
   - `/`
   - `/classes`
   - `/groups`
   - `/people`
   - `/roles`
   - `/directory`
3. Key write actions (if changed in this task) can save and reload data.

## 2) CI/CD Verification (must pass on GitHub)

Check workflow runs:

1. `CI` workflow is green.
2. `Deploy Vercel` workflow is green.
3. `Deploy Supabase Migrations` is green when migration files were changed.

`Deploy Vercel` includes a deployment health check. It must confirm homepage HTTP status `200`.

## 3) UAT Checklist (for feature acceptance)

For each task, record and verify:

1. Scope of the feature/change.
2. Expected behavior.
3. Actual behavior in Preview URL.
4. Actual behavior in Production URL (for merged features).
5. Error handling behavior (validation, empty states, and API failure paths).
6. Data persistence and reload consistency.

## 4) UAT Record Template

Copy this block to the PR description or release note:

```md
## UAT Record

- Feature:
- Environment: Preview / Production
- Test Date:
- Tester:

### Test Cases
1. [ ] Case 1:
2. [ ] Case 2:
3. [ ] Case 3:

### Results
- Expected:
- Actual:
- Pass/Fail:

### Notes
- Risk:
- Follow-up:
```

## 5) 追蹤矩陣驗收（本次）

1. 教練登入後進入 `/groups/{groupId}`：
   - 應可看到「追蹤矩陣」表格，欄位為「編號 / 里程碑 / 待辦事項 / 每位學員」。
2. 教練新增追蹤大項、小項、項目：
   - 大項與小項不應再出現「順序值」輸入欄位。
   - 追蹤項目不應再出現「負責學員」欄位。
3. 教練在大項管理、小項管理區點擊「上」「下」：
   - 順序應立即變更，重新整理後保持一致。
4. 學員登入進入同一小組：
   - 只能勾選自己欄位的完成格；其他學員欄位不可操作。
5. 學員勾選/取消後重新整理：
   - 狀態應正確保留，整體完成率與大項百分比應同步更新。
6. 教練視角檢查：
   - 應能看到所有學員欄位的完成狀態與百分比匯總。
