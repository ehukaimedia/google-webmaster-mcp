# Checkpoint Audit - google-webmaster-mcp OSS/npm Readiness Slice

Date: 2026-06-06
Agent: claude-sonnet-4-6
Mode: no-tool fallback after Opus API 529 and Sonnet tool-run stall
Branch: codex/oss-npm-publish-audit
Scope: Non-destructive OSS/npm readiness. Out of scope: credential rotation, git history purge, force push, GitHub visibility change, npm publish.

## Verdict: Conditional Pass

All in-scope checks reported green. The implementation is structurally sound and ready for the next review step pending the residual blockers below. No blocking bugs were found from the supplied evidence. This checkpoint is based on reported verification, not independent tool reproduction.

## Findings

### Security

| ID | Finding | Severity | Status |
| --- | --- | --- | --- |
| S1 | `client_secret_*.json` removed from git index; local file remains ignored. | High | Resolved for current tree |
| S2 | `secrets:check` scans tracked files for credential path and content patterns. | High | Resolved |
| S3 | Auth config dir uses `0700`, token files use `0600`, with chmod best-effort. | Medium | Resolved |
| S4 | Token profile names are restricted to letters, numbers, underscores, and hyphens. | Medium | Resolved |
| S5 | Git history still contains credential JSON in prior commits. | High | Residual blocker |

### Package Surface

| ID | Finding | Status |
| --- | --- | --- |
| P1 | `files` allowlist narrowed to 31 package files; internal GTM/KPI/setup scripts excluded. | Resolved |
| P2 | `pack:check` and `smoke:tarball` gates enforce package surface before publish. | Resolved |
| P3 | Public CLI commands expose deterministic `--help` and `--version`. | Resolved |
| P4 | `engines >=20` is declared and CI covers Node 20 and 22. | Resolved |

### Dependencies

| ID | Finding | Status |
| --- | --- | --- |
| D1 | `axios` updated from `1.15.2` to `1.16.1`; lockfile refreshed. | Resolved |
| D2 | `npm audit --audit-level=high` reports 0 vulnerabilities. | Resolved |

### Hardening

| ID | Finding | Status |
| --- | --- | --- |
| H1 | `seo-audit` primary fetch has 10s timeout, content-type allowlist, and 2 MiB body cap. | Resolved |
| H2 | Generic `google-webmaster-mcp` user agent replaces internal branding. | Resolved |
| H3 | Dotenv quiet mode prevents CLI metadata output pollution. | Resolved |

### OSS Health

| ID | Finding | Status |
| --- | --- | --- |
| O1 | `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, and `AGENTS.md` are present. | Resolved |
| O2 | GitHub issue templates and PR template are present. | Resolved |
| O3 | README and workflow docs were rewritten to remove stale private paths and GMB envs. | Resolved |
| O4 | `.env.example` was cleaned and GTM rate-limit rules are documented. | Resolved |

### Tests

| ID | Finding | Status |
| --- | --- | --- |
| T1 | Reported test suite passes 58/58 and covers auth modes, CLI flags, and SEO response rejection. | Resolved |
| T2 | No unit tests directly exercise `secrets:check` regex corpus. | Low, acceptable for checkpoint |

## Residual Blockers

1. Git history still contains credential JSON. The current tree is clean, but prior commits still need credential rotation and history purge before public visibility or npm publish.
2. This checkpoint is a no-tool fallback. Opus failed with a 529 overload, and the tool-using Sonnet checkpoint stalled. A full independent reproduction is still recommended before final release.

## Next Steps

1. Rotate or revoke the exposed Google OAuth credential before any history rewrite.
2. Purge credential JSON from git history in a coordinated branch/rewrite step.
3. Re-run `npm run ci`, `npm pack --dry-run`, and an independent reproduction audit after the purge.
4. Keep GitHub private and do not run `npm publish` until the history and credential blockers are closed.
5. Consider adding fixture tests for `secrets:check` patterns in a follow-up.

## Bottom Line

The non-destructive OSS/npm readiness slice passes the reported gates and is ready for a checkpoint commit. It is not yet ready for public GitHub visibility or npm publish until credential rotation and history purge are completed.
