# Changelog

All notable changes to this project will be documented in this file.

This project follows Keep a Changelog and Semantic Versioning.

## [Unreleased]

### Added

- Release-readiness gates for package surface, secret scanning, tarball smoke tests, and CLI ergonomics.
- Public OSS health files and contribution/security guidance.
- Optional Google Business Profile MCP tools (`gbp_*`), off unless `GBP_ENABLED=true`.

### Changed

- Prepared package metadata and docs for an agnostic public npm package.
- Updated workflow guidance with GTM rate-limit rules.

### Security

- Added current-tree secret scanning and private token-file permission requirements.
- Google Business Profile tools and the `business.manage` OAuth scope stay behind `GBP_ENABLED` (default off) until API access is approved.
- Upgraded axios, ajv, undici, fast-uri, and ip-address to clear high-severity npm audit findings.

## [1.0.0] - 2026-06-06

### Added

- Initial local MCP server and CLI toolkit for GSC, GTM, GA4, sitemap, and SEO audit workflows.
