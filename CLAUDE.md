# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the `web/` directory:

```bash
npm run dev          # Start development server (Next.js)
npm run build        # Production build (also validates the app)
npm run lint         # Run ESLint
npm run check:encoding  # Validate UTF-8 encoding safety for Traditional Chinese text
```

**Before finishing any UI text change**, run both `check:encoding` and `build` in `web/`.

## Architecture

**Stack:** Next.js 16 (App Router, TypeScript), Supabase (PostgreSQL + Auth), Tailwind CSS 4, TanStack React Table.

**Three user roles:** `admin` | `coach` | `member` — each has a separate login portal (`/login/admin`, `/login/coach`, `/login/member`) and different navigation.

### Key directories in `web/src/`

- `app/` — Next.js App Router pages. Most CRUD happens via server actions in `app/actions.ts`, `app/auth-actions.ts`, and `app/group-study-actions.ts`.
- `components/` — Reusable components. Management panels handle complex multi-form UIs; data tables use TanStack React Table; auto-submit forms (`auto-submit-*.tsx`) save inline without a button.
- `lib/repository.ts` — **All database operations live here.** Single source of truth for data access via the Supabase admin client.
- `lib/types.ts` — All domain types (database row shapes).
- `lib/auth/` — Cookie-based session management (HMAC-SHA256 signed, 12-hour TTL). Session format: `base64url(json).base64url(hmac_sha256(json))`.

### Data model hierarchy

```
Classes → Groups → Members (via Memberships)
Classes → Courses → Chapters → Topics → Items (color-coded hierarchy)
Groups  → Study Sessions (duty members + reading assignments)
Groups  → Tracking Matrix (Sections → Subsections → Items → Responses)
Groups  → Roles & Responsibilities (definitions + person assignments)
```

### Patterns to follow

**Server Actions + URL feedback:** Forms submit to server actions in `app/actions.ts`. Results are communicated back via URL query params (`?status=success/error&message=...`) and displayed by `StatusBanner`. No client-side state management for form results.

**Form progress indicator:** `FormSubmitProgressIndicator` detects in-flight form submissions via a `data-submit-pending` attribute on `<form>` elements — the app shell wraps this globally.

**Repository pattern:** Add new database operations to `lib/repository.ts`, not inline in components or actions.

**Modal forms:** Use `FormModalTrigger` for create/edit dialogs that submit server actions.

## Encoding Safety (Mandatory)

This app uses Traditional Chinese (zh-Hant) throughout the UI. Always read/write files as UTF-8. If mojibake appears in Chinese text, fix the source string — not CSS workarounds. See `docs/ENCODING_GUARDRAILS.md` for the full playbook.

## Verification After Changes

See `docs/VERIFICATION_AND_UAT_GUIDE.md` for standard UAT steps.
