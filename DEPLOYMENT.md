# Deployment Notes

This project has two GitHub repositories with different purposes.

## Source Code Repository

- Remote: `git@github.com:nhannht251094/ToolCheat.git`
- Source branch: `ramp/source`
- Purpose: stores the React/Vite source code.
- Do not use this repository as the live static deploy target.

Every deploy must also commit the complete source state and push it to
`origin/ramp/source`. Keep using this stable branch across versions; record the
deployed version in the commit message instead of creating a versioned branch.

## Git Identity

Use this local repository identity before committing or deploying:

```bash
git config user.name "nhannht251094"
git config user.email "trungnhan.it757@gmail.com"
```

Current intended identity:

- `user.name`: `nhannht251094`
- `user.email`: `trungnhan.it757@gmail.com`

## Live Deploy Repository

- Remote: `git@github.com:nhannht251094/tool_cheat.git`
- Branch: `main`
- Purpose: stores the built static site output from `dist/`.
- Custom domain: `www.rampnhan.online`
- Keep these files in the deploy repo:
  - `CNAME`
  - `.nojekyll`

## Deploy Steps

1. Increment the Tool Cheat patch version. This is required for every deploy so the version badge can confirm whether the live website is current:

   ```bash
   npm run version:patch
   ```

   This updates both `package.json` and `package-lock.json`. The visible badge is shown beside `Internal Tools` as `vX.Y.Z`.

2. Build the source project:

   ```bash
   npm run build
   ```

3. Update the deploy repository (`git@github.com:nhannht251094/tool_cheat.git`) with the contents of `dist/`.

4. Preserve `CNAME` and `.nojekyll` in the deploy repository.

5. Commit and push the deploy repository to `main`.

6. Commit the complete source state with the deployed version and push it to
   `origin/ramp/source` in the source repository.

Do not push the source branch directly to `tool_cheat.git`; it has a separate static-site history.
