# Agent Instructions

## Mandatory Spec-Driven Architecture

- Specs live in `docs/specs/`.
- Plans live in `docs/plans/`.
- Handoffs live in `docs/handoffs/<agent><reference>-<date>.md`.
- Code reviews and audits live in `docs/code-reviews/<agent>-<reference>-<date>.md`.
- Architecture and spec playgrounds live under `docs/playgrounds/`.

## Required Skills

Use the Ehukai OSS Standard for public-readiness, npm-publish, CI, repo-health, dependency, security, and release work.

Use playground, playground-architect, playground-lifecycle, and removing-regression-context when creating or updating architecture/spec artifacts.

Use the google-webmaster-mcp operating skill for GTM, GSC, GA4, sitemap, and `google-webmaster-*` CLI workflows.

## Release Safety

- Do not make the repository public until credentials are rotated, history is purged, and secret scanning is green.
- Do not publish to npm until `npm run ci` passes from a clean tagged commit.
- Do not run destructive GTM commands without explicit confirmation.
- Preserve public CLI command names unless a downstream migration is landed first.
