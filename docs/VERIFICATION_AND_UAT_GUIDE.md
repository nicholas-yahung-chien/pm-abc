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
