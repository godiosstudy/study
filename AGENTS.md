# Repository Guidelines

## Project Structure & Module Organization
- Entry: `index.html` loads assets from `public/`.
- JS modules in `public/js/`: `system.*` for platform wrappers (Supabase env adapter, permissions, loader, translations), `main.*` for views (navigator, login/register/results/focus/etc.), `header.*` and `toolbar.js` for chrome, and footer helpers.
- Styles live in `public/css/` mirroring the JS modules; fonts/images sit in `public/fonts` and `public/img`.
- Release metadata lives in `config/version.json`; database helpers and RPC scripts are in `sql/*.sql` plus `supabase_setup_profiles.sql`.
- `.gitignore` excludes build artifacts, logs, `node_modules`, and Vercel output.

## Build, Test, and Development Commands
- `npm install` (Node >=18) to install dependencies.
- `npm run dev` to start the Vite dev server; serves `index.html` and assets.
- `npm run build` to create the production bundle in `dist/`.
- `npm run preview` to serve the built assets locally; use before shipping.

## Coding Style & Naming Conventions
- JavaScript uses plain browser scripts with `window.*` namespaces; keep two-space indentation and the existing `var` usage for consistency.
- File naming: `main.<area>.js` for views, `system.<capability>.js` for platform utilities, CSS files share the same stem as their JS counterparts.
- Keep Spanish/English text aligned with `system.languaje*.js` and translation helpers; avoid introducing globals that are not namespaced under `window`.

## Testing Guidelines
- No automated test suite exists; rely on targeted manual verification.
- For UI changes, walk through auth views (login/register/forget/account), navigator/results flows, and header/notification behaviors; watch the console for Supabase or network errors.
- Run `npm run build` to catch syntax issues before opening a PR.

## Commit & Pull Request Guidelines
- Recent history uses release-style messages (e.g., `v0.5.20`); keep that pattern for version bump commits. For feature work, prefer short imperative messages (`feat: add focus search bar`).
- PRs should include a concise change description, screenshots/GIFs for UI work, and links to related issues/tasks.
- Call out Supabase/config changes (e.g., updates to `public/js/system.env.supabase.js` or `sql/` scripts) and how to apply them.

## Security & Configuration Tips
- Do not commit secrets; `public/js/system.env.supabase.js` should carry only anon/public keys. Keep service keys in environment variables when deploying.
- If you modify database routines in `sql/`, document required migrations or RPC updates in the PR.
