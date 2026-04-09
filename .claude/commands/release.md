Create a new GitHub release for Distill.

## Steps

1. Run `git log --oneline` from the last tag to HEAD to see what changed:
   ```
   git tag -l 'v*' --sort=-version:refname | head -1
   ```
   Then `git log <last-tag>..HEAD --oneline` to get the commit list.

2. Determine the next version number using semver based on the changes:
   - **Patch** (x.x.+1): bug fixes only
   - **Minor** (x.+1.0): new features, non-breaking changes
   - **Major** (+1.0.0): breaking changes

   If the user passed an argument (e.g., `/release v1.1.0`), use that version instead: $ARGUMENTS

3. Group commits into categories based on their conventional commit prefix:
   - **Features** (feat)
   - **Fixes** (fix)
   - **Improvements** (refactor, perf, style)
   - **Other** (docs, chore, test)

   Write a concise, human-readable summary for each category. Skip empty categories.

4. Draft the release notes and show them to the user for approval before publishing.

5. Once approved, create the release:
   ```
   gh release create <version> -t "<version> — <short title>" -n "<notes>"
   ```

6. Confirm the release URL to the user.
