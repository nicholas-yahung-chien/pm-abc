# Repository Guardrails

## Encoding Safety (Mandatory)
1. Always read and write project files as UTF-8.
2. Prefer `apply_patch` for text edits; avoid shell pipelines that may re-encode Traditional Chinese text.
3. Before finishing any UI text change, run:
   - `npm run check:encoding` (in `web/`)
   - `npm run build` (in `web/`)
4. If mojibake appears, fix source strings first (not CSS/workaround), then re-run checks.
5. Follow the detailed playbook in `docs/ENCODING_GUARDRAILS.md`.
