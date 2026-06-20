# Deployment Notes

This project uses one GitHub repository for source and deployment:

- Remote: `git@github.com:nhannht251094/tool_cheat.git`
- Personal development branch: `ramp/source`
- Stable source branch: `source`
- Static deploy branch: `main`
- Custom domain: `www.rampnhan.online`

`main` already serves GitHub Pages and contains built static files plus the
`.github/workflows/deploy.yml` automation metadata. Do not merge application
source code into `main`.

## Development Flow

1. Commit and push work to `ramp/source`.
2. Merge `ramp/source` into `source` when the changes are ready to deploy.
3. A GitHub Actions workflow builds `source` and commits `dist/` to `main`.
4. GitHub Pages continues serving the existing `main` branch.

## Git Identity

Use this local repository identity before committing or deploying:

```bash
git config user.name "nhannht251094"
git config user.email "trungnhan.it757@gmail.com"
```

Current intended identity:

- `user.name`: `nhannht251094`
- `user.email`: `trungnhan.it757@gmail.com`

## Deploy Steps

1. Increment the Tool Cheat patch version. This is required for every deploy so the version badge can confirm whether the live website is current:

   ```bash
   npm run version:patch
   ```

   This updates both `package.json` and `package-lock.json`. The visible badge is shown beside `Internal Tools` as `vX.Y.Z`.

2. Run the local checks before publishing:

   ```bash
    npm run build
   ```

3. Commit and push the complete source state to `ramp/source`.
4. Merge `ramp/source` into `source` and push `source`.
5. Verify the `Deploy website` GitHub Actions workflow succeeds.

The workflow preserves `.github`, `CNAME`, and `.nojekyll` while synchronizing
`dist/` to `main`. Do not manually commit application source files to `main`.
