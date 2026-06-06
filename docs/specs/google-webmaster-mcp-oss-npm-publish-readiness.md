# Google Webmaster MCP OSS + npm Publish Readiness Spec

Date: 2026-06-06
Owner: Ehukai Media
Status: Draft target contract
Agent: Codex

Related artifacts:
- Playground: `docs/playgrounds/specs/google-webmaster-mcp-oss-npm-publish.html`
- Plan: `docs/plans/google-webmaster-mcp-oss-npm-publish-readiness.md`
- Primary audit: `docs/code-reviews/codex-google-webmaster-mcp-oss-audit-2026-06-06.md`
- Independent verification audit: `docs/code-reviews/claude-google-webmaster-mcp-oss-audit-verification-2026-06-06.md`
- Existing codebase flow playground: `docs/playgrounds/codebase_playground.html`

## Intent

Make `google-webmaster-mcp` safe to publish as a public GitHub open-source repository and a globally installable npm package.

The target is not an Ehukai-only SaaS. The target is an agnostic local MCP server and CLI package for Google Search Console, Google Tag Manager, GA4 setup/validation, sitemap submission, and SEO audit workflows. Ehukai Media may continue using it as a dogfood consumer, but the public package must not require Ehukai-owned websites, hardcoded GTM containers, machine-specific paths, or private operational assumptions.

The release is green only when the committed repository state, GitHub remote, npm package tarball, and documented cold-clone workflow all satisfy the gates below.

## Current Verified State

These facts were checked on 2026-06-06:

- GitHub repository: `ehukaimedia/google-webmaster-mcp`
- GitHub visibility: `PRIVATE`
- Default branch: `main`
- npm package name: `google-webmaster-mcp` is not present in the public npm registry (`npm view google-webmaster-mcp version --json` returned 404)
- Current branch: `codex/oss-npm-publish-audit`
- Current worktree has pre-existing unstaged edits to `.gitignore`, `GWMPC_Workflow.md`, `README.md`, `mcp-config.json`, `package-lock.json`, and `package.json`
- Existing PR: https://github.com/ehukaimedia/google-webmaster-mcp/pull/1

## Source Anchors

| Area | Evidence |
| --- | --- |
| Release green criteria | `docs/code-reviews/codex-google-webmaster-mcp-oss-audit-2026-06-06.md:12` |
| Website compatibility | `docs/code-reviews/codex-google-webmaster-mcp-oss-audit-2026-06-06.md:138` |
| Committed state mismatch | `docs/code-reviews/claude-google-webmaster-mcp-oss-audit-verification-2026-06-06.md:39` |
| Secret exposure | `docs/code-reviews/claude-google-webmaster-mcp-oss-audit-verification-2026-06-06.md:69` |
| Publish tarball risk | `docs/code-reviews/claude-google-webmaster-mcp-oss-audit-verification-2026-06-06.md:100` |
| Quarantine-compliant axios fix | `docs/code-reviews/claude-google-webmaster-mcp-oss-audit-verification-2026-06-06.md:127` |
| Current package bins | `package.json:12` |
| Current axios pin | `package.json:46` |
| Current CI gates | `.github/workflows/ci.yml:21` |
| Token permission risk | `src/auth/auth.ts:9` and `src/auth/auth.ts:65` |
| SEO fetch guardrail gap | `scripts/audit-cli.mjs:47` and `scripts/audit-cli.mjs:61` |
| Internal hardcoded GTM setup script | `scripts/setup_webmaster_fixed.js:11` |
| Destructive cleanup script | `scripts/cleanup_gtm.js:6` and `scripts/cleanup_gtm.js:47` |
| Agnostic MCP config direction | `mcp-config.json:4` |

## Product Contract

`google-webmaster-mcp` must publish as:

- A local MCP server executable via `google-webmaster-mcp`
- A global CLI package installable with `npm install -g google-webmaster-mcp`
- An `npx`-friendly package usable from MCP client configs with `npx -y google-webmaster-mcp`
- A Google webmaster operations toolkit that works for any authorized Google account and site/container/property combination
- A project-agnostic package configured by explicit environment variables and OAuth tokens, not repository-relative sibling paths

The public command contract is:

- `google-webmaster-mcp`
- `google-webmaster-mcp-auth`
- `google-webmaster-audit`
- `google-webmaster-submit-sitemap`
- `google-webmaster-gtm-validate`
- `google-webmaster-gtm-publish`
- `google-webmaster-setup-ga4`
- `seo-audit`
- `seo-audit-smart`

Any command removal, rename, or JSON output change requires a compatibility note and downstream migration before release.

## Non-Goals

- Do not create a hosted SaaS or hosted OAuth broker.
- Do not publish Ehukai Media website-specific GTM presets as generic package defaults.
- Do not expose local maintenance scripts that mutate GTM state unless they are deliberately supported, documented, dry-run-first public commands.
- Do not make `ehukaimedia_website` a runtime dependency.
- Do not claim the repo is public-ready while tracked or historical secrets remain unresolved.

## Required Gates

### Gate 1: Credential Hygiene

The release must contain no real credentials in the working tree, committed tree, history, GitHub remote, CI logs, examples, npm tarball, or generated docs.

Required state:

- Both historical Google OAuth client secrets are revoked or rotated before history surgery.
- Any live local refresh token identified during audit is revoked or rotated if it was exposed to agents or logs.
- `client_secret_*.json`, `.env`, token files, and other credential artifacts are removed from tracked files.
- Git history is purged once after a full secret enumeration.
- The force-pushed branch and default branch no longer contain the secret files.
- CI includes automated secret scanning.
- `.gitignore` and examples teach redacted credential handling only.

### Gate 2: npm Package Surface

The npm tarball must include only supported runtime files, public CLI entrypoints, docs, metadata, and examples.

Required state:

- `files` allowlist is committed.
- `dist/` is included and all `bin` targets resolve.
- Secrets, local config, `.env`, `token.json`, `client_secret*`, tests, internal playground drafts, and private maintenance scripts are excluded.
- `scripts/setup_webmaster_fixed.js` and `scripts/cleanup_gtm.js` are not shipped as accidental public surface.
- A CI/prepublish guard fails if dangerous files appear in `npm pack`.
- `npm pack --dry-run` and a local global install from the generated tarball pass.

### Gate 3: Security and Runtime Guardrails

The public CLI must behave safely in unattended agent, CI, and local global-install contexts.

Required state:

- OAuth config directory is created with `0o700`.
- Token files are written and chmodded with `0o600`.
- Token profile names are restricted to a conservative filename-safe pattern.
- `seo-audit` fetches use timeout, content-length/body-size caps, and content-type checks.
- Destructive GTM operations require explicit confirmation or dry-run-first workflows.
- Tests cover the new auth/profile and fetch guardrails.

### Gate 4: Dependency Hygiene

The dependency graph must pass a high-severity audit under the Ehukai OSS Standard.

Required state:

- `axios` is updated from `1.15.2` to a quarantine-compliant patched release, currently `1.16.1` per the independent audit.
- `package-lock.json` is committed with the resolved dependency graph.
- `npm run audit:deps` exits 0.
- Any new dependency is either older than the quarantine window or has a documented exception.

### Gate 5: OSS Repo Health

The public GitHub repository must be understandable and trustworthy to a cold-clone reviewer.

Required state:

- Root `LICENSE` exists and matches `package.json` license.
- `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, and `AGENTS.md` exist.
- Issue and PR templates exist under `.github/`.
- `package.json` has real description, author, keywords, repository, bugs, homepage, engines, funding if applicable, and package manager expectations.
- README quickstart works from a cold clone and from global npm install.
- `.env.example` matches actual env requirements.
- `GWMPC_Workflow.md` includes GTM rate-limit guidance and no stale phase numbering.

### Gate 6: Downstream Compatibility

Making the package agnostic must not break known Ehukai dogfood workflows.

Required state:

- `ehukaimedia_website` runtime remains unaffected because it does not import this package at runtime.
- Website-local operator script references are migrated from `../Google-Webmaster-MCP/scripts/...` to stable public commands or website-owned private helpers.
- The website-local `skills/google-webmaster-mcp/SKILL.md` no longer points at generic package internals for website-specific KPI setup.
- The global skill at `/Users/ehukaimedia/.codex/skills/google-webmaster-mcp/SKILL.md` remains aligned with stable public commands.
- The generic `generate_lead` event contract remains documented because the website and the current setup flow rely on it as a baseline conversion event.

### Gate 7: CI and Release Automation

Every release-critical check must be repeatable.

Required state:

- CI runs `npm ci`, `npm run build`, `npm test`, `npm run audit:deps`, secret scanning, package-surface checks, and tarball install smoke tests.
- Release checklist records the exact command output and commit SHA.
- npm publish is performed from a clean, tagged commit only.
- GitHub visibility is changed to public only after credential cleanup and repo-health files are complete.

## Acceptance Commands

Minimum local verification before publishing:

```sh
git status --short --branch
npm ci
npm run build
npm test
npm run audit:deps
npm pack --dry-run
npm pack --json
```

Minimum tarball smoke test:

```sh
tmpdir="$(mktemp -d)"
pkg="$(npm pack --silent)"
npm install -g "$PWD/$pkg" --prefix "$tmpdir"
"$tmpdir/bin/google-webmaster-mcp" --help
"$tmpdir/bin/google-webmaster-mcp-auth" --help
"$tmpdir/bin/seo-audit" --help
rm -rf "$tmpdir" "$pkg"
```

Minimum publication readiness checks:

```sh
gh repo view ehukaimedia/google-webmaster-mcp --json visibility,defaultBranchRef,url
npm view google-webmaster-mcp version --json
```

Expected publication readiness:

- GitHub visibility remains private until all gates pass.
- `npm view google-webmaster-mcp version --json` continues to return 404 until the first publish.
- After publish, `npm view google-webmaster-mcp version --json` returns the released version.

## Release Decision Rule

Do not make the repository public and do not run `npm publish` until:

1. Secrets are rotated/revoked and purged from history.
2. The committed tree passes all local and CI gates.
3. `npm pack` contains no secrets and includes all bin targets.
4. The package installs globally from the packed tarball.
5. OSS health files and docs are complete.
6. Website operator workflows are migrated or explicitly preserved.

## Durability Thesis

This repo is worth open-sourcing if it stays focused on a durable wedge: agent-safe local automation for Google webmaster operations that are still awkward to perform manually across GSC, GTM, and GA4. The package should remain useful six months from now because it standardizes auth, CLI entrypoints, MCP tools, safety checks, and repeatable validation around Google APIs rather than around one website or one agency workflow.

The repo should not be published if the package remains mostly a wrapper around Ehukai-specific scripts, hardcoded containers, or transient internal playbooks.

## Open Decisions

- Confirm final license, likely MIT or ISC, before adding root `LICENSE`.
- Confirm npm publishing identity and 2FA requirements.
- Decide whether `seo-audit-smart` is public-ready or should be withheld from the first tarball.
- Decide whether destructive GTM cleanup belongs in this package at all or should move to a private website operations repo.
- Coordinate the one-time history rewrite and force push because it will invalidate existing clone state and may require PR recreation or branch repair.
