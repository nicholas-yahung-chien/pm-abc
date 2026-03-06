# PM-ABC Web Platform

Website rewrite of the PMP coaching workbook, built with `Next.js` + `Supabase`, deployed via GitHub-based CI/CD.

## Repository Structure

- `web/`: Next.js application (App Router, TypeScript, Tailwind).
- `.github/workflows/`: CI/CD workflows.
- `supabase/migrations/`: Database migration files (versioned).
- `TODO_WEBSITE_PLAN.md`: Product analysis and development TODO plan.

## Local Development

```bash
cd web
npm install
npm run dev
```

## CI/CD Workflows

- `CI` (`.github/workflows/ci.yml`)
  - Runs on PR and push to `main`.
  - Executes install, lint, and build in `web/`.

- `Deploy Vercel` (`.github/workflows/deploy-vercel.yml`)
  - PR: preview deploy (when `VERCEL_TOKEN` is set).
  - `main`: production deploy (when `VERCEL_TOKEN` is set).
  - If token is missing, workflow posts a skip note job.

- `Deploy Supabase Migrations` (`.github/workflows/deploy-supabase.yml`)
  - Runs on push to `main` when migration files change.
  - Requires Supabase secrets; otherwise posts skip note job.

## Required GitHub Secrets

### Vercel

- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VERCEL_TOKEN`

### Supabase

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

## Current Setup Status

- Configured automatically:
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`
  - `SUPABASE_ACCESS_TOKEN`
- Still required before full production auto-deploy:
  - `VERCEL_TOKEN` (for GitHub Actions -> Vercel CLI deploy)
  - `SUPABASE_PROJECT_REF`
  - `SUPABASE_DB_PASSWORD`

## Security Notes

- Do not commit `.env*` files or tokens.
- Keep all credentials in GitHub Secrets / platform environment variables.
- Rotate credentials if any accidental leakage is detected.
