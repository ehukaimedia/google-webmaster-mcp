# Google Webmaster MCP OSS Audit

Date: 2026-06-06  
Reviewer: Codex  
Skills used: `ehukai-oss-standard`, `code-reviewer`, `google-webmaster-mcp`, `removing-regression-context`  
Scope: repository-level OSS readiness, code/security risks, dependency hygiene, CI, docs, packaging, and stale/regression context.

## Intent

This audit is the release-readiness map for getting `google-webmaster-mcp` green for open source publication and npm publishing. The goal is not merely to list defects; it is to define the blockers, verification gates, and cleanup sequence required before the repo can be trusted by a cold-clone reviewer, a public GitHub audience, and npm consumers.

Green means:
- No tracked secrets or unresolved credential history.
- `npm ci`, build, tests, dependency audit, package dry run, and publish-surface review pass with evidence.
- The npm package contains only supported runtime, CLI, docs, and examples.
- Public repo-health files are complete and accurate.
- README, examples, workflow docs, and architecture playgrounds describe the current supported path without stale operational advice.
- Known dogfood consumers, especially `ehukaimedia_website`, are migrated to stable public CLI commands instead of sibling-repo internals.
- Release notes/changelog and version metadata are ready for a SemVer npm publish.

## Verdict

Not ready for public release or merge under the Ehukai OSS Standard.

The core TypeScript build and unit tests are in decent shape, but the repo currently has release-blocking security and hygiene issues: a tracked Google OAuth client secret, a failing high-severity dependency audit, incomplete public repo-health files, and shipped internal scripts with hardcoded project identifiers.

## Critical Findings

### 1. Tracked Google OAuth client secret in the repository

Confidence: 100

Evidence:
- `git ls-files` includes a root `client_secret_*.json` file.
- Secret scan over tracked files found a `client_secret` JSON field in that file at line 1.
- `.gitignore:10` now ignores `client_secret*.json`, but this does not untrack or purge the committed file.

Why this matters:
This violates the Ehukai OSS Standard's "No secrets in the repo or its git history" gate. Because it is already tracked, future clones and package consumers can inherit a credential artifact even though the ignore rule looks correct.

Fix:
Revoke/rotate the Google OAuth client secret in Google Cloud, remove the tracked file with `git rm --cached`, purge it from git history if this repo was ever pushed/shared, add automated secret scanning to CI, and keep only a redacted `.env.example` or setup instructions.

### 2. Dependency audit fails on high-severity axios advisories

Confidence: 100

Evidence:
- `package.json:30-31` defines `audit:deps` and includes it in `check`.
- `package.json:46` pins `axios` to `1.15.2`.
- `npm run check` built successfully and passed all 53 tests, then failed at `npm audit --audit-level=high` with high-severity axios advisories.

Why this matters:
CI runs the same audit at `.github/workflows/ci.yml:21-24`, so current CI should be red. Also, `src/gsc/client.ts:385` uses axios for sitemap fetching, a public URL-handling path.

Fix:
Do not release until the advisory is resolved. `npm audit` reports `axios@1.17.0` as the available fix, but npm metadata shows `axios@1.17.0` was released on 2026-06-03, which is not past the 7-day quarantine as of 2026-06-06. Either wait until the quarantine window passes, or document and approve a security exception before upgrading.

## Important Findings

### 3. Auth refresh tokens are written without explicit private permissions

Confidence: 90

Evidence:
- `src/auth/auth.ts:9-11` creates `~/.config/google-webmaster-mcp` without an explicit `0700` mode.
- `src/auth/auth.ts:65-68` writes OAuth tokens with `fs.writeFileSync(...)` and no `mode`, so permissions depend on the user's umask.

Why this matters:
The token file can contain refresh tokens for GTM, GSC, and GA4 scopes. On a permissive machine, default write permissions can make those credentials readable by other local users or processes.

Fix:
Create the config directory with `mode: 0o700`, write tokens with `mode: 0o600`, chmod existing token files on save, and sanitize `--profile` / `GOOGLE_TOKEN_PROFILE` to a conservative filename pattern.

### 4. SEO audit CLI fetches arbitrary pages without timeout or response-size limits

Confidence: 90

Evidence:
- `scripts/audit-cli.mjs:47-52` calls `fetch(targetUrl.toString())` with no abort timeout.
- `scripts/audit-cli.mjs:61-62` reads the full response body with `response.text()` before parsing.
- The README advertises the tool as working on "any URL" at `README.md:153-156`.

Why this matters:
An unattended agent or CI job can hang indefinitely or consume excessive memory on slow/large responses. This is especially noticeable because the sitemap path already has safer guardrails in `src/gsc/client.ts:334-348`.

Fix:
Add an `AbortController` timeout, cap accepted content length, stream or reject oversized bodies, restrict accepted content types, and add negative tests for timeout and oversized response behavior.

### 5. Public OSS health files and package metadata are incomplete

Confidence: 100

Evidence:
- Root repo has no `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, or `CODE_OF_CONDUCT.md`.
- `.github/` contains CI only; no issue or PR templates were found.
- `package.json:39-42` has empty `keywords`, `author`, and `description`, and declares `ISC` while no root license file exists.
- `README.md:25-28` still uses `git clone <repository-url>`.

Why this matters:
This fails the Ehukai OSS Standard repo-health gate. A skeptical cold clone cannot verify licensing, vulnerability reporting, contribution flow, changelog history, or discoverability.

Fix:
Add the standard repo-health files, use a real OSI license file with the intended holder/year, add issue/PR templates, fill package metadata, and replace placeholders with real clone/setup instructions.

### 6. Package ships internal/project-specific scripts with hardcoded IDs

Confidence: 95

Evidence:
- `package.json:5-10` publishes the entire `scripts` directory.
- `npm pack --dry-run` includes `scripts/setup_webmaster_fixed.js`, `scripts/cleanup_gtm.js`, and other maintenance scripts.
- `scripts/setup_webmaster_fixed.js:11-14` hardcodes GTM account/container/measurement IDs.
- `scripts/cleanup_gtm.js:6-10` deletes hardcoded legacy tag names and `scripts/cleanup_gtm.js:47-55` creates and publishes a version after deletion.

Why this matters:
This is regression context and packaging drift. The package surface includes local maintenance scripts that are not documented as public CLI contracts, can mutate real GTM state, and encode one discovered container/measurement setup.

Fix:
Move internal scripts outside the published `files` set, or whitelist only supported CLI entrypoints. Remove hardcoded IDs, require explicit dry-run/confirmation for destructive operations, and document any intentionally supported maintenance command.

### 7. Active docs disagree with current operational safety rules

Confidence: 85

Evidence:
- `GWMPC_Workflow.md:54-61` tells users to run setup, validate, then publish, but does not warn about GTM API rate limits.
- The local `google-webmaster-mcp` operating skill requires at least 3 minutes between GTM commands and warns that audit/validate/setup in quick succession can exhaust GTM quota.
- `README.md:48-50` says to copy `.env.example` and add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, but `.env.example:1-10` does not include those keys.
- `GWMPC_Workflow.md:64` jumps from Phase 3 to Phase 5, which is a small but visible sign of stale workflow editing.

Why this matters:
Docs that teach unsafe sequencing or incomplete setup create real operational failures for agents. This is exactly the regression-context failure mode: a future agent will trust active docs and hit quota/config issues.

Fix:
Update README, `.env.example`, and workflow docs from the current source of truth. Add the GTM rate-limit sequence, clarify global auth config versus per-project context env, and fix stale phase numbering.

## Downstream Compatibility: `ehukaimedia_website`

Compatibility verdict: making `google-webmaster-mcp` agnostic should not break live `ehukaimedia_website` application services, but it can break local operator workflows unless the website repo is migrated off sibling-repo internals first.

Evidence:
- `ehukaimedia_website` does not import `google-webmaster-mcp` at application runtime.
- The website embeds GTM directly in `app/root.tsx:71` and loads GTM from that local constant.
- The website SEO audit tool uses its own implementation in `app/utils/audit-checks.ts:21`; it does not shell out to the MCP package.
- The chat lead flow pushes `generate_lead` to `window.dataLayer` in `app/components/chat-widget.tsx:271`.
- The contact page pushes `contact_submit` and `booking_intent` in `app/routes/contact-us.tsx:502` and `app/routes/contact-us.tsx:717`.
- The only direct executable coupling found in the website package is `package.json:22`: `gtm:setup` runs `node ../Google-Webmaster-MCP/scripts/setup_ga4_tags.js`.
- The website-local skill at `skills/google-webmaster-mcp/SKILL.md:83-85` also points at `setup_kpi_tags.js` by absolute path.
- The global skill at `/Users/ehukaimedia/.codex/skills/google-webmaster-mcp/SKILL.md` is mostly agnostic already: it expects a project-local `.env`, stable `google-webmaster-*` binaries, and standard `GTM_ID`, `GSC_SITE`, `GA4_PROPERTY_ID`, and `GA4_MID` variables.

Safe agnostic changes:
- Remove `scripts/setup_webmaster_fixed.js` and `scripts/cleanup_gtm.js` from the public npm package. No website call sites reference them.
- Remove Ehukai branding from generic CLI text and user agents, provided the command names and JSON output shape remain stable.
- Keep `generate_lead` as a generic baseline conversion event, because the website and skill guidance still rely on that event contract.

Migration required before deleting or moving scripts:
- Change `ehukaimedia_website` `npm run gtm:setup` to use `google-webmaster-setup-ga4` instead of `../Google-Webmaster-MCP/scripts/setup_ga4_tags.js`.
- Update the website-local `skills/google-webmaster-mcp/SKILL.md` to use stable public commands or a website-owned private helper for KPI presets.
- Move Ehukai-specific GTM presets such as `/contact-us`, `Intent - Request AI Audit`, `ai_audit`, and location/map KPI tags out of the generic MCP package and into website-owned docs/config.

Compatibility rule for implementation PRs:
Preserve the stable public binaries (`google-webmaster-audit`, `google-webmaster-submit-sitemap`, `google-webmaster-gtm-validate`, `google-webmaster-setup-ga4`, `google-webmaster-gtm-publish`, `seo-audit`) until `ehukaimedia_website` has been migrated and verified. If a command must be renamed or removed, land the website migration first.

## Positive Signals

- `npm test` passed 53/53 tests after a clean TypeScript build.
- Tests cover meaningful GTM drift cases, workspace validation, duplicate handling, sitemap SSRF/private-address blocking, and tool-registry schema validation.
- CI has least-privilege `contents: read` permissions and runs `npm ci`, build, tests, and dependency audit.
- `npm pack --dry-run` completed and showed the core `dist` and CLI files are present.
- `docs/playgrounds/codebase_playground.html` exists, satisfying the repo's local architecture-playground convention at a basic level.
- `ehukaimedia_website` uses this project as an operational/dogfood tool, not as a runtime service dependency.

## Verification Evidence

Commands run:
- `git status --short --branch`
- `rg --files`
- `rg -n "TODO|FIXME|XXX|HACK|DEPRECATED|LEGACY|temporary|for now|will remove|remove after|type: ignore|noqa|skip\\(|describe\\.skip|it\\.skip|test\\.skip|partly out of date|old version|legacy version" -g '!node_modules/**' -g '!dist/**' -g '!build/**' .`
- `find . -maxdepth 3 ...` for health files and `.github`
- `npm run check`
- `npm pack --dry-run`
- `npm ls --depth=0`
- `npm view <package>@<version> time --json` for dependency age checks
- `git ls-files -z | xargs -0 rg -n <secret-patterns>`
- Searched `ehukaimedia_website` for `Google-Webmaster-MCP`, `google-webmaster-*`, `setup_ga4_tags`, `setup_kpi_tags`, `cleanup_gtm`, `GTM_ID`, `GSC_SITE`, `GA4_PROPERTY_ID`, `GA4_MID`, `dataLayer`, and `generate_lead`.
- Read `/Users/ehukaimedia/.codex/skills/google-webmaster-mcp/SKILL.md` to compare the global operating skill against the proposed agnostic package surface.
- Reviewed Claude's independent verification audit commit `5b334fe`, which adds `docs/code-reviews/claude-google-webmaster-mcp-oss-audit-verification-2026-06-06.md`.

Results:
- Build: passed during `npm test` pretest.
- Tests: passed, 53 tests, 0 failures.
- Dependency audit: failed, 1 high-severity axios dependency finding group.
- Package dry run: passed, 34 files included.
- Secret scan: failed due tracked Google OAuth client secret file.
- Worktree: dirty before audit; existing modifications were left intact.

## Recommended Fix Order

1. Revoke/rotate the tracked OAuth client secret, remove it from the repo and history, and add secret scanning.
2. Resolve the axios high-severity audit failure with an approved quarantine-aware dependency update.
3. Lock down token-file permissions and profile-name handling.
4. Add fetch timeout/body-size guardrails to `seo-audit`.
5. Shrink the published package surface to supported CLI/MCP artifacts only.
6. Migrate `ehukaimedia_website` operator scripts/skills from sibling-repo internals to stable public binaries.
7. Add missing OSS health files and real package metadata.
8. Refresh README, `.env.example`, and workflow docs so active docs match current safe operations.

## PR Intent

Open this audit as the first PR in the release-readiness sequence. The PR should be treated as a gating review artifact for the follow-up implementation work that gets the repo green for open source and npm publish. It should not claim the repo is ready yet; it should establish the evidence-backed checklist the implementation PRs must close.
