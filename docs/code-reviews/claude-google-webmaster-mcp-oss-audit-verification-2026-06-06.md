# Google Webmaster MCP — OSS / npm Publish Audit (Independent Verification)

Date: 2026-06-06
Reviewer: Claude (Claude Code, Opus 4.8 — 1M)
Skills used: `ehukai-oss-standard`
Scope: independent verification and extension of the prior Codex audit
(`docs/code-reviews/codex-google-webmaster-mcp-oss-audit-2026-06-06.md`). Re-derives every
claim from first-hand evidence, corrects what was wrong or under-scoped, and adds what was
missed. **Audit only — no code or config was modified.**

Archive note: this review records the pre-fix state. Retired credential identifiers have been
redacted for publish hygiene, and later commits plus the 2026-06-06 reauthorization supersede the
credential-status language below.

## Relationship to the Codex audit

The Codex audit is good work: structure, severity ordering, and most findings hold up. I ran
every check myself rather than inheriting its pasted numbers. This document leads with the
**deltas** — what I confirmed, what I corrected, what Codex missed — instead of re-litigating
each finding. Where Codex is right, I say so in one line and move on.

**Process claims verified:** commit `77c9f2a` contains exactly one file (the Codex audit
markdown); the pre-existing local edits to `README.md`, `package.json`, `.gitignore`,
`mcp-config.json`, `package-lock.json`, `GWMPC_Workflow.md` remain **unstaged** in the worktree.
Both are accurate.

## Verdict

**Not ready for public release or npm publish.** Confirmed. But the headline reasons differ
from the Codex framing in two material ways:

1. The secret exposure is **broader and unconditional** than reported — two distinct real OAuth
   client secrets in git history (not one), already pushed to the GitHub remote.
2. The most dangerous packaging fact is in the **committed** tree, which Codex never evaluated:
   the committed `package.json` has **no `files` allowlist**, so `npm publish` from the branch
   would ship the live client-secret file *and* a broken package with no `dist/`.

The build is healthy (TypeScript compiles, 53/53 tests pass). The blockers are security,
git history, packaging, and OSS-health hygiene — not code correctness.

---

## The spine: committed state ≠ working tree

Every other finding has to be read through this lens, and it is the single most important
correction to the prior audit.

- **PR #1 contains only the audit markdown.** None of the local improvements — the `files`
  allowlist, the README edits, the `mcp-config.json` cleanup, the `.gitignore` line that ignores
  retired credential JSON files are committed to any branch. They exist only as uncommitted worktree
  state and are lost the moment the tree is cleaned or cloned elsewhere.
- **The Codex audit's line citations describe the worktree, not the repo.** For example it cites
	  `.gitignore:10` as "now ignores retired credential JSON files" and `package.json:5-10` as "publishes
  the entire `scripts` directory." Both are true of the dirty worktree only. On `HEAD` — the
	  state a reviewer actually clones — `.gitignore` does **not** mention retired credential JSON files, and
  `package.json` has **no `files` field at all**. So the prior audit does not reproduce against
  the committed repo. That mismatch is itself a finding.
- **Consequence:** "fixes are in progress" is misleading. They are uncommitted. The release
  checklist below must include *committing* these changes, not just making them.

Evidence:
```
git show HEAD:.gitignore        # -> no retired credential JSON ignore line
git show HEAD:package.json      # -> "files" key absent
git status                      # -> README/package.json/.gitignore/mcp-config.json modified, unstaged
git show --stat 77c9f2a         # -> 1 file changed (the audit)
```

---

## Critical findings

### C1 — Two real OAuth client secrets in git history; already on the remote (CORRECTED / more severe)

Confidence: 100.

Codex flagged one tracked retired credential JSON file and made history purge **conditional** ("if
this repo was ever pushed/shared"). Both halves need correction.

Evidence (first-hand):
- A full-history content scan (`git grep` across `git rev-list --all` for common secret patterns,
  `GOOGLE_CLIENT_SECRET`) surfaces **two distinct real client-secret files**:
  - Retired OAuth credential JSON file A, added in `c00d402`.
  - Retired OAuth credential JSON file B, present at `80c866d`, **still tracked at HEAD**
    (`git ls-files` lists it).
  - Both parse as Google OAuth client credential JSON with a 35-char secret -> both are real, and they are
    **different OAuth clients** (different project numbers ⇒ different secrets).
- The repo is **private** but **already pushed**: the tracked secret is present on both
  `origin/main` and `origin/codex/oss-npm-publish-audit` (`git ls-tree -r origin/main`). Private
  ≠ unexposed — the credential has been transmitted to a third party (GitHub) and is one
  visibility flip away from public.
- The historical `.env.example` hits in the scan are **placeholders**, not real. `token.json` and `.env` were **never committed**
  (confirmed clean in history). So the real-secret blast radius is exactly these two JSON files.

Why it matters: violates the Ehukai OSS Standard "no secrets in the repo or its history" gate.
Git surgery cannot un-leak what is already on GitHub's servers.

Fix (unconditional, do-once): **rotate/revoke both client secrets in Google Cloud first**, then
rewrite history to purge both files, force-push, and add CI secret scanning. Because a
history rewrite is expensive and done once, enumerate *all* secrets before the rewrite (this
scan did — it is two files) so it is a single pass.

### C2 — Committed `package.json` has no `files` allowlist → npm tarball would leak the secret and omit `dist/` (MISSED by Codex)

Confidence: 100.

This is the most severe packaging finding and is invisible if you only look at the worktree.

Evidence (first-hand, committed state via `git archive HEAD | tar -x` → `npm pack --dry-run`):
- Committed `package.json` `files` field: **absent**. With no `files` and no `.npmignore`, npm
  falls back to `.gitignore`.
- The committed tarball would contain **55 files including**
  one retired OAuth credential JSON file (467 B) — **credential material would have shipped to the public npm
  registry** — and **zero `dist/` entries** (`dist/` is gitignored), so the `bin` targets
  (`./dist/index.js`, `./dist/auth/cli.js`) would be missing and the package would be
  **non-functional**.
- The worktree pack is fine by contrast (34 files, 37.9 kB, no secret files) **because** the
  uncommitted `files: ["dist","scripts","README.md","SEO_AUDIT_CLI.md","GWMPC_Workflow.md"]`
  allowlist overrides gitignore. That allowlist is not committed (see the spine).
- There is **no `prepare`/`prepublishOnly`/`prepack` script** (verified), so `dist/` is not
  rebuilt at publish time — the missing `dist/` genuinely ships missing rather than regenerating.

Why it matters: anyone running `npm publish` from the branch today leaks an OAuth client secret
*and* ships a broken package. This subsumes and outranks Codex finding #6.

Fix: commit a `files` allowlist (the worktree one is a good start); never rely on `.gitignore`
for publish scoping; add a `prepublishOnly`/CI guard that fails if credential JSON, `.env`, or
`token.json` appear in `npm pack --dry-run`.

### C3 — Dependency audit fails high on axios; a quarantine-compliant fix already exists (CORRECTED)

Confidence: 100.

Codex correctly found the failing high audit, but concluded the only fix (axios `1.17.0`) is
inside the 7-day quarantine, so you must wait or file an exception. **That conclusion is wrong.**

Evidence (first-hand, run 2026-06-06T16:47:29Z):
- `npm run audit:deps` (`npm audit --audit-level=high`) exits **1**: 1 high. Current pin
  `axios@1.15.2` is hit by `GHSA-654m-c8p4-x5fp` (range `=1.15.2`) plus seven advisories ranged
  `>=1.0.0 <1.16.0`. Every advisory caps at **`<1.16.0`**.
- `npm view axios time`: `1.16.0` → 2026-05-02, `1.16.1` → **2026-05-13 (24 days ago)**,
  `1.17.0` → 2026-06-03 (3 days ago, inside quarantine).
- Empirical check, advisory DB (`npm i axios@X --package-lock-only` + `npm audit` in a throwaway
  dir): **`1.16.0`, `1.16.1`, and `1.17.0` all PASS.**
- Empirical check, **real dependency tree** (copy this project's `package.json`, pin
  `axios@1.16.1`, `npm install --package-lock-only` to resolve every transitive, then `npm audit
  --audit-level=high`): exactly one axios resolves — `node_modules/axios -> 1.16.1`, nothing pins
  it back — and audit reports **`found 0 vulnerabilities`, exit 0**. So `1.16.1` clears the high
  on the actual tree, comfortably past the 7-day quarantine.
- `npm audit fix` wants `1.17.0` only because the dependency is pinned to the **exact** version
  `"axios": "1.15.2"`; npm reports `1.17.0` as "outside the stated dependency range" and jumps to
  latest. It is not the only fixed line.

Fix: bump the pin to `axios@1.16.1` (quarantine-compliant), run `npm run audit:deps` to confirm
green, commit the lockfile. No exception needed. Note `src/gsc/client.ts:385` uses axios as the
default sitemap HTTP client (public-URL fetch), so resolving this matters beyond CI color.

CI impact: `.github/workflows/ci.yml` runs the same audit, so CI on this branch is currently
**red** — confirmed by reproducing the failure locally.

---

## Important findings (Codex findings I verified first-hand — confirmed)

### V3 — Token files written without restrictive permissions; profile name unsanitized
Confidence: 95. `src/auth/auth.ts:11` `fs.mkdirSync(CONFIG_DIR, { recursive: true })` (no
`mode: 0o700`); `src/auth/auth.ts:67` `fs.writeFileSync(tokenPath, JSON.stringify(...))` (no
`mode: 0o600`). `token.json` on disk is a **live** credential (access 253 ch, refresh 103 ch,
415 ch of scope). **New, beyond Codex:** `getTokenPath()` interpolates the profile directly into
the filename (`token_${profile}.json`) with no sanitization, so `GOOGLE_TOKEN_PROFILE` /
`--profile` is a path-traversal vector. Fix: `0o700` dir, `0o600` file, `chmod` on save, and a
strict `[A-Za-z0-9_-]` profile guard.

### V4 — `seo-audit` fetches arbitrary URLs with no timeout or response-size cap
Confidence: 90. `scripts/audit-cli.mjs:47` `await fetch(targetUrl…)` (no `AbortController`);
`scripts/audit-cli.mjs:61` `await response.text()` (full body, no cap). README advertises it on
"any URL." Fix: abort timeout, content-length cap, content-type allowlist, negative tests.

### V5 — OSS health files and package metadata missing
Confidence: 100. Absent: `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`,
`CHANGELOG.md`, issue/PR templates, `AGENTS.md`. `.github/` contains only `workflows/ci.yml`.
`package.json` `description`/`author` empty and `keywords` `[]` in **both** HEAD and worktree;
`license: "ISC"` declared with **no LICENSE file**. `README.md:27` is `git clone
<repository-url>` in **both** HEAD and worktree. Fix: add the standard health files, a real OSI
LICENSE with holder/year, templates, an `AGENTS.md`, and fill metadata.

### V6 — Package ships internal, hardcoded, destructive scripts
Confidence: 95. The worktree `files` ships the **entire** `scripts/` dir (13 files). Several are
not exposed as `bin` commands and are effectively undocumented internals:
`scripts/cleanup_gtm.js` calls `gtm.deleteTag(...)` then `gtm.publishVersion(...)` (mutates real
GTM state with no dry-run/confirmation); `scripts/setup_webmaster_fixed.js:12-14` hardcodes
`ACCOUNT_ID='6142216323'`, `CONTAINER_ID='138706108'`, and a `G-…` measurement ID — one
customer's container baked into the package. Fix: ship only supported `bin` entrypoints, remove
hardcoded IDs, gate destructive ops behind explicit confirmation/dry-run.

### V7 — Active docs disagree with current setup and safe operation
Confidence: 85. `README.md:49-50` tells users to copy `.env.example` and add
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, but `.env.example` contains **neither key** (it still
lists removed GMB keys — `BUSINESS_ACCOUNT_ID`, `BUSINESS_LOCATION_ID*` — despite `27a8c3f`
"remove GMB API usage"). `GWMPC_Workflow.md` (read in full) contains **no** GTM
rate-limit/quota guidance — the local operating skill requires ≥3 min between GTM commands — and
its phase numbering jumps 1 → 2 → 3 → **5** (no Phase 4). **New, beyond Codex:** the **committed** `mcp-config.json`
hardcodes a machine-specific absolute path
(`/Volumes/Extreme SSD/AI-Applications/Google-Webmaster-MCP/dist/index.js`); the worktree fixes
this to `npx -y google-webmaster-mcp`, but — per the spine — that fix is uncommitted.

---

## What's healthy (verified)

- `npm ci` exit **0** (worktree lock; clean install, 176 pkgs). `npm run build` exit **0** (tsc
  clean). `npm test` exit **0** — **53/53 pass**, 0 fail. Tests cover GTM drift, workspace
  validation, duplicate handling, sitemap SSRF/private-address blocking, and tool-registry
  schema validation.
- CI uses least-privilege `permissions: contents: read`.
- The worktree publish surface (with the uncommitted `files` allowlist) is clean and reasonably
  scoped (34 files, 37.9 kB).

---

## Verification evidence (commands actually run, 2026-06-06)

```
git ls-files | grep <retired credential pattern>          # 1 tracked secret at HEAD
git grep -l -E '<secret patterns>' $(git rev-list --all)  # full-history scan: 2 real secret files
git ls-tree -r origin/main | grep <retired credential pattern>  # secret present on remote
gh repo view … --json visibility                          # PRIVATE, already pushed
git archive HEAD | tar -x -C tmp && (cd tmp && npm pack --dry-run)
                                                          # committed pack: 55 files, ships secret, 0 dist
npm pack --dry-run                                        # worktree pack: 34 files, no secrets
npm ci            # exit 0
npm run build     # exit 0
npm test          # exit 0, 53/53
npm run audit:deps# exit 1, 1 high (axios)
npm view axios time --json                                # 1.16.1 = 2026-05-13; 1.17.0 = 2026-06-03
# real tree: cp package.json, pin axios@1.16.1, npm install --package-lock-only, npm audit
#   -> node_modules/axios=1.16.1 only; "found 0 vulnerabilities"; exit 0
Read GWMPC_Workflow.md ; grep -rn axios src/             # phase-4 gap; axios at src/gsc/client.ts:385
```

Results: build pass · tests 53/53 · dep audit FAIL (axios high) · worktree pack clean ·
committed pack ships the secret + omits dist · 2 real secrets in history, on the remote.

---

## Corrected remediation order

0. **Rotate/revoke in Google Cloud first** — both OAuth client secrets and the local refresh token.
   This was later reported complete by the operator. Nothing below un-leaks a credential
   already on GitHub; rotation is what actually closes the exposure.
1. **Purge history once.** `git rm --cached` the tracked secret, rewrite history to remove both
   retired credential JSON files, force-push, add CI secret scanning. (Full-history scan already
   done: scope is exactly those two files.)
2. **Fix the publish surface.** Commit a `files` allowlist; add a `prepublishOnly`/CI guard that
   fails if credential JSON/`.env`/`token.json` appear in `npm pack --dry-run`; confirm `dist/`
   is present and `bin` targets resolve.
3. **Resolve axios.** Pin `axios@1.16.1`; re-run `npm run audit:deps` to green; commit the lock.
4. **Commit the in-flight worktree fixes** (README, `mcp-config.json`, `.gitignore`,
   `package.json`) — they are currently uncommitted and not in PR #1.
5. **Harden auth:** `0o700` dir / `0o600` token file / chmod-on-save / sanitized profile name.
6. **Guard `seo-audit`:** timeout + body-size cap + content-type allowlist + negative tests.
7. **Trim/secure scripts:** ship only supported `bin` entrypoints; remove hardcoded IDs; gate
   destructive GTM ops.
8. **Add OSS health files + metadata** (LICENSE/CONTRIBUTING/SECURITY/CoC/CHANGELOG/templates/
   `AGENTS.md`; fill description/author/keywords; real clone URL).
9. **Reconcile docs** (`.env.example` keys, README setup, `GWMPC_Workflow.md` rate limits/phase
   numbering).

## Green criteria (carried from Codex, refined)

- No real secret in the working tree, in git history, on any remote, or in `npm pack --dry-run`;
  rotated credentials; CI secret scanning active.
- `npm ci` + build + `npm test` + `npm run audit:deps` + `npm pack --dry-run` all pass, with a
  committed `files` allowlist that includes `dist/` and excludes secrets — evidenced.
- All §3.1 OSS-health files present, accurate, link-checked; metadata filled; SemVer + CHANGELOG.
- README quickstart works from a cold clone; docs match the current supported path.
- The committed state — not just the worktree — satisfies all of the above.

## Out of scope (flagged, not done)

Neither this audit nor the Codex audit evaluated the Ehukai OSS Standard **§2 durability gate**
(the six-month usefulness thesis / durable-wedge question). That should be answered before
investing further in public-release polish, but it was not assessed here.

## Bottom line

Codex's direction is right and its build/test signal reproduces. The corrections that change the
release plan: (1) **two** real secrets in history, already on the remote — rotation + purge is
mandatory, not conditional; (2) the **committed** package would publish the secret and a broken
artifact because it has no `files` allowlist — the worst issue, and worktree-only audits miss it;
(3) a **quarantine-compliant axios fix already exists** (`1.16.1`) — no waiting or exception
needed; and (4) the fixes people think are "done" are **uncommitted** and absent from PR #1.
