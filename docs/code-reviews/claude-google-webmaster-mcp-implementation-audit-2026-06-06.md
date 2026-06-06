# Implementation Audit - OSS/npm Readiness Gates (Independent Reproduction)

Date: 2026-06-06
Reviewer: Claude (Claude Code, Opus 4.8 - 1M)
Skills used: `ehukai-oss-standard`, `playground-architect`, `playground`, `headless-cli-agents`
Scope: independent audit of the implementation in `76bcd9a feat: add oss npm readiness gates`
(and `f182687 docs: incorporate oss artifacts audit`). This is the **independent tool reproduction**
that the prior checkpoint (`claude-...-implementation-checkpoint-2026-06-06.md`, a no-tool Sonnet
fallback after an Opus 529) explicitly said was "still recommended". **Audit only - nothing modified.**

## Verdict

**Pass - the implementation is correct, complete for its scope, and independently verified green.**
Every blocker from the prior audits is resolved, and the committed tree now matches the working tree
(the committed-vs-working gap is closed). Two residual items remain before public GitHub/npm, and they
are **not equal** - see "The two blockers" below. Neither is a code defect; both were correctly
identified by the implementer.

## Independent reproduction (the value-add over the checkpoint)

Run first-hand, 2026-06-06T18:53Z. The checkpoint was "based on reported verification, not independent
tool reproduction"; this is the reproduction.

| Check | Result |
| --- | --- |
| `npm run ci` (build + test + audit:deps + secrets:check + pack:check + smoke:tarball) | **EXIT 0** |
| Tests | **58 / 58 pass, 0 fail** |
| `npm audit --audit-level=high` | **found 0 vulnerabilities** |
| `secrets:check` (tracked-file scan) | Tracked-file secret scan OK |
| `pack:check` (package surface) | Package surface OK: **31 files** |
| `smoke:tarball` (global install + bin probes) | Tarball smoke OK |
| `google-webmaster-mcp --help` / `--version` | prints + **exit 0**, stderr empty (no transport) |
| `seo-audit --help` / `--version` | prints + **exit 0** |
| `google-webmaster-mcp-auth --version` | `1.0.0`, exit 0 |
| `npm pack` surface | 31 files; `dist/index.js` present; **secrets NONE; internal scripts NONE** |
| CI workflow | matrix Node **20 + 22**, least-privilege, runs `npm ci` then `npm run ci` on push + PR |

## Prior findings - all resolved (verified, not reported)

| Prior finding | Resolution (first-hand evidence) |
| --- | --- |
| **F1** smoke test verified nothing; no `--help` on server/seo-audit | `src/index.ts:88-91` `main()` calls `handledCliFlag()` and **returns before** `StdioServerTransport`/`connect`; `smoke-tarball.mjs` probes the server via startup-signal, not `--help`; `cli-flags.test.js` asserts server stderr is empty on `--help`. All bins exit 0. |
| **F2** working-tree-only source anchors | `f182687` rewrote the spec anchors to key-based (`package.json` key `bin`/`dependencies.axios`, "committed HEAD differs from dirty worktree"). |
| **C2** committed had no `files`; tarball would ship secret + omit dist | `files` allowlist committed (dist + 8 public scripts + cli-utils + docs + mcp-config); `pack:check` asserts required files/bins present AND credentials/internal scripts absent; `prepublishOnly: npm run ci`. |
| **C3** axios high; `1.16.1` quarantine-compliant | `axios` pinned `1.16.1` (all deps now exact-pinned); `npm audit` = 0 high. |
| **V3** token perms + profile traversal | `auth.ts:11/14` mkdir `0o700` + chmod; `:80/82` write `0o600` + chmod-after; `normalizeTokenProfile` `/^[A-Za-z0-9_-]{1,64}$/`; `auth.test.js` asserts traversal throws + on-disk modes. |
| **V4** seo-audit fetch unbounded | 10s timeout, content-type allowlist, 2 MiB body cap; `seo-audit-cli.test.js` proves exit-1 on bad content-type and oversize. |
| **V5** OSS health files missing | LICENSE (ISC, "Copyright (c) 2026 Ehukai Media", matches `package.json`), CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, CHANGELOG (Keep a Changelog + Unreleased/1.0.0), AGENTS.md, issue/PR templates; full package metadata. |
| **V6** internal/destructive scripts shipped | `cleanup_gtm.js`, `setup_webmaster_fixed.js`, `setup_kpi_tags.js` excluded by allowlist AND blocked by `pack:check` prohibited patterns. |
| **V7** stale docs | README uses the real clone URL; `.env.example` has `GOOGLE_CLIENT_ID/SECRET` and the GMB keys are gone; `GWMPC_Workflow.md` rewritten. |
| committed-vs-working spine | Working tree is clean (only the 3 intentionally-untracked items); the previously-dirty files are committed. |

## Test quality

Meaningful, not tautological (I read all three new files):
- `cli-flags.test.js` - spawns all 10 bins; asserts exit 0, per-bin help text, exact `--version`, and
  (strong negative) that the MCP server's **stderr is empty** on `--help`, proving it never opens the
  transport.
- `auth.test.js` - temp `HOME`; asserts `getTokenPath('../escape')` and `normalizeTokenProfile('client/a')`
  **throw**, and that the on-disk dir/token modes are `0o700`/`0o600`.
- `seo-audit-cli.test.js` - real local HTTP server; asserts **exit 1** + `Unsupported content type` and
  `Response too large`.

These are exactly the negative/corruption tests the Ehukai standard asks for. Gap (low, already noted
in the checkpoint as T2): no fixture test exercises the `secrets:check` regex corpus.

## Current Publish Blocker

This audit was produced before the follow-up authorization cleanup. The operator later confirmed the
OAuth credential rotation/revocation step and completed a fresh local OAuth authorization. That
leaves one blocker before public GitHub visibility or npm publish: purge the retired credential JSON
files from git history across all refs.

History purge is hygiene for public release and must still be completed carefully. Even a perfect
rewrite + force-push disrupts existing clones, rewrites PR #1 SHAs, and may require recreating the PR.

Scope and mechanics (verified):
- **Scope = the two retired OAuth client-secret JSON files, all refs**. They are in history on
  **both** `origin/main` and the PR branch, and `origin/main`'s tip still tracks one of them. A
  per-branch purge is the wrong shape.
- **Right operation**: `git clone --mirror`, `git filter-repo --invert-paths --path <each file>`
  (rewrites all refs at once -> cleans main + codex together), then force-push all refs, then everyone
  re-clones.
- **Caveats**: rewrites every SHA; disrupts PR #1 (may need recreation); breaks existing clones; keep
  the repo private until done and do not `npm publish`.
- **Note**: a green `npm run ci` does **not** mean history-clean - `secrets:check` scans the current
  tracked tree only, not history. Don't read CI-green as "safe to publish".

## Minor / non-blocking notes

- The stale on-disk ignored credential JSON was deleted after fresh authorization.
- Gate 6 (downstream compat) is cross-repo and pending, not broken: `ehukaimedia_website`'s
  `gtm:setup` = `node ../Google-Webmaster-MCP/scripts/setup_ga4_tags.js` still resolves (that script
  is still shipped as the `google-webmaster-setup-ga4` bin), but the sibling-path coupling should move
  to the public command in a website-repo PR.
- Artifact polish from the prior audit still open (trivial): playground board omits plan Phases 0/9
  (F3); playground "Spec Seed" is still a stub (F4).
- Spec "Open Decisions" still to confirm: npm publish identity + 2FA, whether `seo-audit-smart` ships
  in v1, and whether the destructive GTM cleanup script belongs in this package at all. License is
  resolved as ISC.

## Gate status (vs the spec's 7 gates)

| Gate | Status |
| --- | --- |
| 1 Credential hygiene | **Partial** - tree clean + `secrets:check` + ignore done; fresh auth complete; history purge pending |
| 2 npm package surface | Done |
| 3 security/runtime guardrails | Done |
| 4 dependency hygiene | Done |
| 5 OSS repo health | Done |
| 6 downstream compatibility | Pending (cross-repo; not broken) |
| 7 CI/release automation | CI done; tag/publish are future release steps |

## What I verified (commands run, 2026-06-06)

```
git show --stat 76bcd9a f182687 ; git status            # clean tree; secret removed from index
npm run ci                                              # EXIT 0: 58/58, 0 vulns, 3 gates OK, smoke OK
node dist/index.js --help|--version ; seo-audit --help|--version ; auth --version   # all exit 0
npm pack --dry-run --json --ignore-scripts              # 31 files, dist present, no secrets/internal
git ls-tree -r origin/main | grep <retired credential pattern>   # credential file still in origin/main tip tree
git log {HEAD,origin/main,origin/codex} -- <retired credential pattern>   # 2 files in history on both refs
read of src/index.ts, src/auth/auth.ts, cli-utils.mjs, smoke-tarball.mjs, check-secrets.mjs,
     check-package-surface.mjs, package.json, LICENSE, CHANGELOG.md, ci.yml, 3 new test files
```

## Bottom line

The slice is done and verifiably green - I reproduced it, and the new tests lock in the fixes with
real negative cases. After the follow-up authorization cleanup, the remaining release blocker is to
purge the retired credential JSON files from all git history before making the repo public or
publishing to npm. Keep the repo private and unpublished until that rewrite and verification are done.
