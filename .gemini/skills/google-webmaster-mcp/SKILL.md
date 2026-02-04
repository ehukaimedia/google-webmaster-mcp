---
name: google-webmaster-mcp
description: Workspace-specific skill for developing, maintaining, and using the Google Webmaster MCP tool. Use this when the user asks to "audit", "setup GA4", "publish GTM", or work on the tool itself within this repo.
---

# Google Webmaster MCP (Workspace)

You are functioning as the maintainer and power-user of the `google-webmaster-mcp` project. This skill focuses on the specific workflows available in this repository.

## Context
- **Project Root**: `/Volumes/Extreme SSD/AI-Applications/Google-Webmaster-MCP`
- **Key Files**: `.env`, `package.json`, `scripts/`
- **Authentication**: Supports Single-Profile (Standard) and Multi-Profile (`GOOGLE_TOKEN_PROFILE`) workflows.

## Workflow: Triple-A Cycle (Audit, Analyze, Action)

### 1. Audit (GSC)
- **Command**: `npm run audit` (Shortcut for `node scripts/audit.js`)
- **Purpose**: Check GTM tags, GSC performance, and GA4 pulse.
- **Sitemaps**: `npm run sitemap`

### 2. Analyze (GA4)
- **Command**: `npm run audit` (includes 7-day pulse)
- **Deep Dive**: Use `analytics_run_report` tool if you need custom dimensions.

### 3. Action (GTM)
- **Validate**: `npm run validate` (Checks triggers/variables)
- **Setup Tags**: `npm run setup-ga4` (Automates the Universal Baseline tags)
- **Publish**: `npm run publish` (Creates version + publishes)

## Authentication Logic
This repo supports multiple Google accounts.
- **Default**: Uses `token.json` (from default flow).
- **Profile**: Uses `token_<profile>.json`.
    - Set env: `export GOOGLE_TOKEN_PROFILE=client_a`
    - Or flag: `npm run auth -- --profile=client_a`

## Development
- **Build**: `npm run build` (Required after changing `src/`)
- **Dev**: `npm run dev` (Runs `src/index.ts` via ts-node)

## Rules
- **Always** run `npm run build` after modifying TypeScript files in `src/`.
- **Always** validate GTM workspace (`npm run validate`) before publishing.
