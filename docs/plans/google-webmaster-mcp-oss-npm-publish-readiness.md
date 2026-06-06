# Google Webmaster MCP OSS + npm Publish Readiness Plan

Date: 2026-06-06
Agent: Codex
Status: Draft execution plan

Related artifacts:
- Spec: `docs/specs/google-webmaster-mcp-oss-npm-publish-readiness.md`
- Playground: `docs/playgrounds/specs/google-webmaster-mcp-oss-npm-publish.html`
- Audits: `docs/code-reviews/codex-google-webmaster-mcp-oss-audit-2026-06-06.md` and `docs/code-reviews/claude-google-webmaster-mcp-oss-audit-verification-2026-06-06.md`

## Goal

Get `google-webmaster-mcp` green for:

- Public GitHub open-source release
- Global npm package publication as `google-webmaster-mcp`
- Agnostic use by any authorized Google account, without Ehukai Media website dependencies
- Continued safe dogfood use by `ehukaimedia_website`

## Operating Rules

- Treat the committed tree as the truth. Uncommitted improvements do not count until committed.
- Do not make GitHub public until credential rotation, history purge, and secret scanning are complete.
- Do not run `npm publish` until `npm pack` and tarball global-install smoke tests pass from a clean tagged commit.
- Preserve stable public binaries until `ehukaimedia_website` operator workflows are migrated.
- Keep specs in `docs/specs/`, plans in `docs/plans/`, playgrounds in `docs/playgrounds/`, and audits in `docs/code-reviews/`.

## Phase 0: Release Coordination

Outcome: one known release branch, one known credential owner, and a clear rewrite window.

Tasks:

- Confirm the intended release branch after the audit PR lands.
- Confirm whether PR #1 remains the audit-only PR or becomes the release-readiness PR.
- Confirm npm publisher account, package ownership, and 2FA mode.
- Confirm license choice and copyright holder.
- Freeze unrelated worktree changes or split them into intentional commits.

Verification:

```sh
git status --short --branch
gh repo view ehukaimedia/google-webmaster-mcp --json visibility,defaultBranchRef,url
npm whoami
npm view google-webmaster-mcp version --json
```

Exit criteria:

- The repo is still private.
- The package name is still unclaimed or the owner is confirmed.
- The team knows when history will be rewritten.

## Phase 1: Credential Incident Response

Outcome: no live or historical credential exposure remains publishable.

Tasks:

- Revoke or rotate both historical Google OAuth client secrets identified in the independent audit.
- Revoke or rotate any local refresh token exposed during audit or automation runs.
- Remove tracked credential files from the index.
- Run a full-history secret scan before rewriting history.
- Rewrite history once to purge all `client_secret_*.json` files.
- Force-push sanitized branches.
- Add CI secret scanning and local documentation for credential handling.

Verification:

```sh
git rev-list --all | xargs git grep -I -l "client_secret"
git ls-files | rg "client_secret|token\\.json|\\.env$"
npm pack --dry-run
```

Exit criteria:

- Secret scans are green on the working tree, committed tree, and history.
- GitHub no longer has the secret files on default or release branches.
- No npm tarball output lists credential artifacts.

## Phase 2: Publish Surface and Package Contract

Outcome: the npm package contains only supported public artifacts and all global commands work.

Tasks:

- Commit a `files` allowlist.
- Include `dist/` and only supported public CLI scripts or helpers.
- Exclude `scripts/setup_webmaster_fixed.js`, `scripts/cleanup_gtm.js`, and other undocumented internal scripts from the tarball.
- Add a package-surface guard that fails when secrets, internal scripts, missing `dist/`, or broken `bin` targets are detected.
- Add `prepack` or `prepublishOnly` behavior that builds and validates before publish.
- Add tarball install smoke tests to CI.

Verification:

```sh
npm run build
npm pack --dry-run
npm pack --json
```

Tarball smoke:

```sh
tmpdir="$(mktemp -d)"
pkg="$(npm pack --silent)"
npm install -g "$PWD/$pkg" --prefix "$tmpdir"
"$tmpdir/bin/google-webmaster-mcp" --help
"$tmpdir/bin/google-webmaster-mcp-auth" --help
"$tmpdir/bin/seo-audit" --help
rm -rf "$tmpdir" "$pkg"
```

Exit criteria:

- Every `bin` target resolves.
- The tarball includes `dist/`.
- The tarball excludes secrets, `.env`, token files, tests, and internal destructive scripts.

## Phase 3: Dependency and Security Hardening

Outcome: runtime-sensitive code paths are safe for unattended and global use.

Tasks:

- Pin `axios` to `1.16.1` or another quarantine-compliant patched release.
- Commit `package-lock.json`.
- Harden `src/auth/auth.ts` with `0o700` config directory, `0o600` token writes, chmod-on-save, and profile-name validation.
- Harden `scripts/audit-cli.mjs` with timeout, content-type allowlist, content-length/body-size caps, and negative tests.
- Add tests for unsafe profile names, token permissions, request timeout, oversized body, and unsupported content type.
- Ensure destructive GTM workflows are dry-run-first or explicitly confirmed.

Verification:

```sh
npm ci
npm run build
npm test
npm run audit:deps
```

Exit criteria:

- Dependency audit exits 0.
- Security tests pass.
- No public CLI can hang indefinitely on a slow SEO audit target.
- Token storage is private by default.

## Phase 4: Agnostic Public UX and Docs

Outcome: a cold-clone user can understand, install, configure, and run the package without Ehukai-specific context.

Tasks:

- Add root `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, and `AGENTS.md`.
- Add issue and PR templates under `.github/`.
- Fill `package.json` metadata: description, author, keywords, repository, bugs, homepage, engines, package manager, license.
- Update README with global install, `npx`, MCP client config, auth setup, env vars, and cold-clone commands.
- Update `.env.example` to match actual required env vars.
- Update `GWMPC_Workflow.md` with GTM rate-limit guidance and current phase numbering.
- Remove or clearly quarantine stale GMB references, placeholder clone URLs, machine-specific paths, and Ehukai-only defaults from public docs.

Verification:

```sh
rg -n "<repository-url>|/Volumes/Extreme SSD|BUSINESS_ACCOUNT_ID|BUSINESS_LOCATION_ID|setup_webmaster_fixed|cleanup_gtm" README.md GWMPC_Workflow.md .env.example package.json mcp-config.json docs
npm pack --dry-run
```

Exit criteria:

- Public docs describe current behavior.
- Repo-health files exist and match package metadata.
- No active public doc teaches stale or private setup paths.

## Phase 5: Downstream Website Compatibility

Outcome: making `google-webmaster-mcp` agnostic does not break `ehukaimedia_website` operator workflows.

Tasks:

- Update `ehukaimedia_website` `gtm:setup` script to use stable public CLI commands or website-owned scripts.
- Update the website-local `skills/google-webmaster-mcp/SKILL.md` to stop pointing at package internals such as `setup_kpi_tags.js`.
- Move Ehukai-specific KPI presets into website-owned docs/config if they are still needed.
- Verify website runtime still pushes `generate_lead`, `contact_submit`, and `booking_intent` independently.
- Keep `generate_lead` documented as a generic baseline conversion event in the MCP package.

Verification:

```sh
rg -n "Google-Webmaster-MCP|setup_ga4_tags|setup_kpi_tags|google-webmaster-|generate_lead|contact_submit|booking_intent" /Volumes/Extreme\\ SSD/AI-Applications/ehukaimedia_website
```

Exit criteria:

- Website runtime is unaffected.
- Website operator tooling no longer depends on sibling-repo internals.
- Stable public binaries remain compatible.

## Phase 6: CI and Release Gates

Outcome: release readiness is enforced by automation.

Tasks:

- Extend CI with secret scan, pack-surface check, tarball smoke test, and docs/link checks where practical.
- Add release checklist to `CHANGELOG.md` or release docs.
- Require all checks on pull requests.
- Record verification command output in the release PR.

Verification:

```sh
npm ci
npm run build
npm test
npm run audit:deps
npm pack --dry-run
```

Exit criteria:

- CI is green on the release branch.
- A clean clone can run the verification commands.
- The release PR includes evidence for each gate.

## Phase 7: Public GitHub Release

Outcome: the repository is safely public.

Tasks:

- Merge the release-readiness PR after CI passes.
- Tag the sanitized commit.
- Change repository visibility from private to public.
- Confirm public README, license, security policy, and templates render correctly.
- Create a GitHub release with changelog notes and install instructions.

Verification:

```sh
gh repo view ehukaimedia/google-webmaster-mcp --json visibility,url,defaultBranchRef
git tag --points-at HEAD
```

Exit criteria:

- GitHub visibility is public.
- No public view exposes secrets or private paths.
- Release notes point to npm install instructions but do not claim npm publish until it is complete.

## Phase 8: npm Publish

Outcome: `google-webmaster-mcp` is installable globally from npm.

Tasks:

- Publish from the clean tagged commit.
- Use `npm publish` only after dry-run and tarball smoke tests pass.
- Verify npm metadata, package files, and global install.
- Update GitHub release notes with npm version and install command.

Verification:

```sh
npm publish --dry-run
npm publish
npm view google-webmaster-mcp version --json
npm install -g google-webmaster-mcp
google-webmaster-mcp --help
seo-audit --help
```

Exit criteria:

- `npm view google-webmaster-mcp version --json` returns the published version.
- `npm install -g google-webmaster-mcp` works on a clean machine or temp prefix.
- Published package metadata links back to the public GitHub repo.

## Phase 9: Post-Release Monitoring

Outcome: the public release stays healthy after the first publish.

Tasks:

- Watch GitHub issues and npm download/install reports for setup failures.
- Verify MCP client config examples with `npx -y google-webmaster-mcp`.
- Confirm no private Ehukai-specific support burden leaks into public docs.
- Open follow-up issues for non-blocking enhancements discovered during release.

Exit criteria:

- No emergency credential, packaging, or install regressions are reported after release.
- Follow-up work is tracked as issues, not hidden in stale docs.

## PR Topology

Recommended sequence:

1. Audit/spec/plan/playground PR: documents the target contract and gates.
2. Credential cleanup PR or coordinated history rewrite branch: removes tracked secrets and adds scanning.
3. Package/security PR: package surface, axios, auth permissions, SEO fetch guardrails, tests.
4. OSS docs PR: repo-health files, README, env docs, workflow docs, templates.
5. Downstream compatibility PR in `ehukaimedia_website`: migrate local operator scripts and skill references.
6. Release PR: final version, changelog, CI evidence, tag, GitHub public switch, npm publish.

## Definition of Done

The repo is done when:

- GitHub is public and clean.
- npm package is published and globally installable.
- CI enforces release-critical gates.
- No known secret, package-surface, dependency, or docs blocker remains.
- `ehukaimedia_website` keeps working without relying on generic package internals.
