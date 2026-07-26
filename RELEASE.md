# Release Process

1. Confirm the working tree is clean and review the changes.
2. Update `package.json` version and move the relevant entries from `CHANGELOG.md` out of `Unreleased`.
3. Run `npm ci` and `npm test`.
4. Build and inspect the package with `npm pack --dry-run`.
5. Commit the release, for example: `git commit -am "Release v0.1.0"`.
6. Create an annotated tag: `git tag -a v0.1.0 -m "Release v0.1.0"`.
7. Push the commit and tag, then publish with `npm publish` when the package registry is configured.

Replace the version in every command with the version being released. Do not publish until the trusted-local security model and package contents have been reviewed.
