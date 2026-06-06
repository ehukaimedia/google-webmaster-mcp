# Spec / Plan / Playground Artifact Audit (Custodial Review)

Date: 2026-06-06
Reviewer: Claude (Claude Code, Opus 4.8 - 1M)
Skills used: `ehukai-oss-standard`, `playground-architect`, `playground`
Scope: custodial review of the three release-readiness artifacts added in commit `8d5dd2f`:
- `docs/specs/google-webmaster-mcp-oss-npm-publish-readiness.md`
- `docs/plans/google-webmaster-mcp-oss-npm-publish-readiness.md`
- `docs/playgrounds/specs/google-webmaster-mcp-oss-npm-publish.html`

This is anti-drift verification (claims vs source, lifecycle state, inbound wiring), not a re-audit of
the codebase. **Audit only - no artifact was modified.**

## Verdict

**Sound and authoritative - approve with fixes.** The spec and plan accurately encode every blocker
from both prior audits, place themselves correctly in the lifecycle, and cross-reference each other
and the source. One acceptance gate rests on an unbuilt premise (must-fix before that gate runs); the
rest are anchor/consistency cleanups. Nothing here is AI-slop or aspirational - the gates are an honest
manual checklist, not a hardcoded `safe:true`.

## Codex's verification claims - all hold

| Claim | Result |
| --- | --- |
| Artifacts are ASCII-only | Confirmed (byte scan of all 3 files: zero codepoints > 126) |
| Playground script parses | Confirmed (`node --check` on the extracted 269-line script: OK) |
| Worktree changes left untouched | Confirmed (the 6 pre-existing dirty files remain unstaged) |
| Commit pushed to PR #1 | Confirmed (`8d5dd2f` on `origin/codex/oss-npm-publish-audit`; my `5b334fe` is an ancestor) |
| npm name not in registry (404) | Confirmed independently (`npm view google-webmaster-mcp version` -> E404) |

(`8d5dd2f` was preceded by `f16d0cd "add website compatibility to OSS audit"`, which modified only the
Codex audit file, not the Claude verification audit.) I verified the playground *parses*; I did not
exercise its runtime rendering in a browser - the render code has no obvious fault, but the score math
is unverified at runtime.

## Coverage cross-walk - this is what makes the artifacts authoritative

Every blocker from both audits maps to a gate; nothing was dropped or softened:

| Audit finding | Encoded as |
| --- | --- |
| C1 two real secrets in history, on remote | Gate 1 (both secrets, rotate-before-rewrite, full-history scan) |
| C2 / V6 committed has no `files`; ships secret + omits dist; internal scripts | Gate 2 + Plan Phase 2 |
| C3 axios high; `1.16.1` quarantine-compliant | Gate 4 + Plan Phase 3 (`1.16.1` named) |
| V3 / V4 token perms + profile; SEO fetch guards | Gate 3 + Plan Phase 3 |
| V5 / V7 OSS health files; stale docs | Gate 5 + Plan Phase 4 |
| committed-vs-working spine | Operating Rule "treat the committed tree as truth" + prompt non-negotiable |
| no `prepare`/`prepublishOnly` | Plan Phase 2 task ("add prepack or prepublishOnly") |
| durability gate (flagged unevaluated) | Spec "Durability Thesis" section |

The cross-repo compatibility claims are also grounded (verified, not carried): `ehukaimedia_website`
has **no** `webmaster` dependency in `package.json`, and its only coupling is the operator script
`gtm:setup` = `node ../Google-Webmaster-MCP/scripts/setup_ga4_tags.js` - exactly what Gate 6 / Phase 5
describe and target for migration.

## Findings

### F1 - The tarball smoke test's premise is unbuilt (must-fix before Gate 2/CI runs)

Severity: high (for the gate; not a defect in the prose). Confidence: 100.

Both the spec ("Minimum tarball smoke test") and the plan (Phase 2) assert:

```sh
"$tmpdir/bin/google-webmaster-mcp" --help
"$tmpdir/bin/google-webmaster-mcp-auth" --help
"$tmpdir/bin/seo-audit" --help
```

This gate **never actually verifies `--help`**, in any environment:

- `google-webmaster-mcp` -> `dist/index.js` is an MCP stdio server (`src/index.ts:48-52`:
  `new StdioServerTransport(); await server.connect(...)`). It has **no** argv handling, so `--help`
  is ignored and the process connects the transport: it blocks on an interactive TTY, EOF-exits under
  CI (`stdin=/dev/null`), and prints no help either way.
- `seo-audit` -> `scripts/audit-cli.mjs:503-518` treats `--help` as "no URL provided", prints a usage
  error to stderr, and `process.exit(1)` (non-zero).
- Only `google-webmaster-mcp-auth` (`src/auth/cli.ts:13`) actually honors `--help`.

So the command as written is not falsifiable as a help check - it tests nothing it claims to. Note the
exec path itself is fine: all bins carry `#!/usr/bin/env node` (`dist/index.js:1`, `dist/auth/cli.js:1`,
`scripts/audit-cli.mjs:1`), so this is purely a missing `--help`/`--version` contract, not a broken shim.

Two distinct fixes, and the plan should name both:

1. **Doc fix** - replace the smoke command with something a stdio server can pass: a spawn-with-timeout
   that sends an MCP `initialize` handshake, a `--version` check, or (minimum) assert each bin file
   exists and is executable. Fix it in the spec's Acceptance Commands and Plan Phase 2/6.
2. **Product gap** - no plan task creates the `--help`/`--version` surface the smoke test assumes.
   Phase 4 adds README/docs but never a CLI `--help`. The Ehukai OSS Standard agent-ergonomics gate
   (section 8) wants `--help` + deterministic exit codes + `--json` on the headless paths anyway; add an
   explicit task (most naturally in Phase 3 or a new Phase 4 task) to build that contract, then have
   the smoke test verify it.

This is a premise-unbuilt issue in a plan, not an unacceptable artifact - the command does not run
until Phase 2/6. But left unfixed it would either hang an interactive run or pass vacuously in CI while
claiming to prove the CLIs work.

### F2 - Source anchors resolve against the dirty worktree, not the committed tree (should-fix)

Severity: medium. Confidence: 100.

The spec's Source Anchors table and the playground's anchor table cite working-tree line numbers that
do not match `HEAD` - the exact committed-vs-working trap the spec itself warns against:

| Anchor | Working tree | HEAD (committed) |
| --- | --- | --- |
| `package.json:12` "bins" | `"bin": {` (correct) | `"...setup-ga4": "./scripts/setup_ga4_tags.js"` |
| `package.json:46` "axios pin" | `"axios": "1.15.2"` (correct) | `"zod": "^4.1.13"` |
| `mcp-config.json:4` "agnostic direction" | `"command": "npx"` (correct) | `"command": "node"` |

This is ironic against the spec's own Operating Rule ("treat the committed tree as truth") and the
playground prompt's non-negotiable ("not dirty worktree state"). It will also rot the moment the
worktree edits are committed or split (Phase 0). Fix: cite stable identifiers (the `"axios":` key, the
`bin` block) or pin to committed line numbers, or label these as working-tree references.

The other anchors are accurate: the Claude-audit anchors (`:39` spine, `:69` C1, `:100` C2, `:127` C3)
all resolve to the right section headings, and `audit-cli.mjs:47/61`, `setup_webmaster_fixed.js:11`,
`cleanup_gtm.js:6/47`, `codex-audit:138` are correct. (`auth.ts:9/65` point to the CONFIG_DIR/saveToken
region rather than the exact `mkdir`/`writeFileSync` lines at `:11/:67` - close enough.)

### F3 - Plan and playground disagree on phase set (low)

Severity: low. Confidence: 100.

The plan defines Phases **0-9** (0 = Release Coordination, 9 = Post-Release Monitoring). The playground's
`phases` array and `Critical Path` board model only Phases **1-8**, dropping Phase 0 and Phase 9. The
"Critical Path" therefore omits release coordination and post-release monitoring. Align the playground
board with the plan's phase set (or note the board is the execution subset).

### F4 - Playground "Spec Seed" is a stub (low)

Severity: low. Confidence: 95.

`playground-architect` specifies a Spec Seed that captures current-vs-target behavior, ownership,
interfaces, data flow, build sequence, acceptance tests, and non-goals. The playground's "Spec Seed"
section is a header plus one sentence pointing at the generated prompt (line ~400). Low impact because
the real `docs/specs/...` already fulfills that role - but the labeled section is empty of seed content.
Either link it to the spec explicitly or flesh it out; don't leave a named-but-empty section.

## Lifecycle and wiring (per playground-architect)

- **Placement: correct.** Spec in `docs/specs/`, plan in `docs/plans/`, playground in
  `docs/playgrounds/specs/` (the spec-playground bucket). Status fields ("Draft target contract" /
  "Draft execution plan") are honest.
- **Inbound/outbound wiring: good.** Spec links plan + playground + both audits; plan links spec +
  playground + audits; playground's generated prompt names all five source artifacts. No active doc
  points at an archived/stale playground.
- **Intent: present.** HTML intent comment at `body` top (line 383, `<!-- Intent: ... -->`; casing
  differs from the skill's `INTENT:` example - cosmetic). The visible hero/sidebar convey the decision;
  the anti-pattern it prevents lives only in the comment, not a visible line (minor).
- **Self-contained: yes.** Inline CSS/JS, no external `<script>`/`<link>`/CDN; dark theme, presets,
  live render, working copy button with fallback.

## What I verified (commands run, 2026-06-06)

```
git show --stat 8d5dd2f ; git merge-base --is-ancestor 5b334fe HEAD   # 3 files; my audit is ancestor
python3 byte-scan of all 3 artifacts                                  # ASCII-only
node --check <extracted playground script>                            # parses
sed -n line checks of every cited anchor vs working tree AND HEAD     # F2
grep argv/--help in src/index.ts, src/auth/cli.ts, scripts/audit-cli.mjs  # F1
sed -n '1p' on all bin entrypoints                                    # shebangs present
npm view google-webmaster-mcp version --json                         # E404 (name free)
package.json + gtm:setup scan of ../ehukaimedia_website              # cross-repo claims grounded
```

## Bottom line

The artifacts are good and faithfully carry every correction from both audits, with correct placement,
wiring, and a grounded durability thesis - they are safe to use as the release contract. Before the
verification gates are actually executed, fix F1 (the smoke test verifies nothing as written, and no
task builds the `--help`/`--version` contract it assumes) and F2 (anchors must resolve against the
committed tree the spec says to trust). F3/F4 are polish. None of this blocks the documents from
guiding Phase 1 (credential rotation + history purge), which remains the correct next action.
