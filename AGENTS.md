# Repository guidance

## Branch workflow

- Use `ramp/source` for active development work.
- Open pull requests from `ramp/source` into `source`.
- Treat `source` as the stable application source branch.
- Never merge application source into `main`; GitHub Actions owns `main` and
  keeps it as the static GitHub Pages deploy branch.
- A push to `source` triggers `.github/workflows/deploy.yml`, which builds the
  application and synchronizes `dist/` to `main`.

## Validation

- Use Node.js 22 and install dependencies with `npm ci`.
- Run `npm run typecheck` for TypeScript validation.
- Run `npm run build` before considering a change ready to merge.
- Do not commit `dist/` from a source branch.

## Change safety

- Preserve `CNAME`, `.nojekyll`, and `.github` on the deploy branch.
- Keep user data and saved-form behavior backward compatible unless a task
  explicitly requires a migration.
