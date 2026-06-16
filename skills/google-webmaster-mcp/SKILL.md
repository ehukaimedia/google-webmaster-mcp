---
name: google-webmaster-mcp
description: |
  Use this skill when working with the google-webmaster-mcp package, MCP server, or CLI tools for Google Search Console, Google Tag Manager, Google Analytics 4, sitemap submission, and technical SEO audits. Trigger on google-webmaster-mcp, google-webmaster-audit, google-webmaster-mcp-auth, google-webmaster-submit-sitemap, google-webmaster-gtm-validate, google-webmaster-setup-ga4, google-webmaster-gtm-publish, seo-audit, GTM_ID, GSC_SITE, GA4_PROPERTY_ID, GA4_MID, Google Search Console, GTM, GA4, sitemap indexing, analytics setup, or SEO audit workflows.
---

# Google Webmaster MCP

Use this skill to operate the agnostic `google-webmaster-mcp` MCP server and CLI toolkit. The package works with any user's Google OAuth client, Search Console property, Tag Manager container, and GA4 property. It does not require any specific organization's infrastructure.

> **No-auth quick win:** `seo-audit <url>` runs a bounded technical + GEO audit with **no Google OAuth** — use it for per-page checks anytime, including before auth is configured or when GSC/GA4/GTM access is unavailable. Only the GSC/GA4/GTM operations need the OAuth in the Authentication section.

## Safety Rules

- Do not print OAuth client secrets, token JSON, API keys, or `.env` contents.
- Prefer read-only checks before setup or publish actions.
- Ask for explicit confirmation before GTM writes, GTM publish, sitemap submission, or any operation that changes Google-side state.
- After a GTM `429 RESOURCE_EXHAUSTED`, stop and wait 3-5 minutes before one retry.
- Keep project-specific IDs in local environment variables, not in repo files.

## Authentication

The package reads OAuth credentials from the current shell or the **current working directory's** `.env` — so the secret must be current in whatever directory you run the CLI from (a stale `.env` in one project is a common cause of `invalid_client`):

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_TOKEN_PROFILE=default
```

Authenticate once per Google account/profile:

```bash
google-webmaster-mcp-auth
google-webmaster-mcp-auth --profile=client_a
```

Tokens are stored under `~/.config/google-webmaster-mcp/` with private permissions.

## Project Variables

Run CLI commands from the project being audited with these values available:

```env
GTM_ID=GTM-XXXXXXX
GSC_SITE=sc-domain:example.com
GA4_PROPERTY_ID=123456789
GA4_MID=G-XXXXXXXXXX
GTM_WORKSPACE_ID=
GOOGLE_WEBMASTER_MCP_API_KEY=
```

`GA4_PROPERTY_ID` is numeric. `GA4_MID` is the `G-` measurement ID.

## Read-Only Connection Check

Use read-only operations to verify access:

```bash
google-webmaster-mcp-auth --version
google-webmaster-audit --help
google-webmaster-gtm-validate --help
seo-audit --help
```

For live Google API connectivity, use the package clients or MCP tools to check:

- GSC: list accessible sites and confirm `GSC_SITE` is present.
- GA4: list account summaries and run a tiny report against `GA4_PROPERTY_ID`.
- GTM: list accounts/containers and confirm `GTM_ID` is found.

Report counts and pass/fail status only.

## Common Workflow

1. Audit current state:

   ```bash
   google-webmaster-audit
   ```

2. Submit a sitemap only when requested:

   ```bash
   google-webmaster-submit-sitemap "sc-domain:example.com" "https://example.com/sitemap.xml"
   ```

3. Validate GTM before changing it:

   ```bash
   google-webmaster-gtm-validate
   ```

4. Set up baseline GA4 tags only after confirmation:

   ```bash
   google-webmaster-setup-ga4
   ```

5. Validate and publish only after confirmation:

   ```bash
   google-webmaster-gtm-validate
   google-webmaster-gtm-publish GTM-XXXXXXX "Add GA4 baseline tags"
   ```

## GTM Rate Limits

Wait at least 3 minutes between GTM commands. Avoid running audit, validate, setup, and publish back-to-back. Never use polling loops around GTM commands.

## Conversion Attribution

Use one generic lead event and distinguish sources with parameters:

```js
window.dataLayer.push({ event: "generate_lead", label: "header_cta" });
window.dataLayer.push({ event: "generate_lead", label: "hero_quote_button" });
```

Map `label` to the GA4 `event_label` parameter in GTM when attribution detail is needed.

## Troubleshooting

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| Missing config | `.env` lacks OAuth or project values | Add values locally; do not commit secrets |
| `invalid_client` / "provided client secret is invalid" | `.env` `GOOGLE_CLIENT_SECRET` is stale or no longer matches the OAuth client (e.g. rotated/regenerated in Cloud Console) | Update `GOOGLE_CLIENT_SECRET` to the current value, then re-auth. Diagnostic: if browser consent succeeds (an auth code is returned) but the **token exchange** fails, it is the secret, not consent — re-running auth alone will not fix it |
| Auth error (expired token / wrong profile) | Access or refresh token expired, or wrong profile | Re-run `google-webmaster-mcp-auth` or set `GOOGLE_TOKEN_PROFILE` |
| No GA4 rows | New property, no data, or wrong numeric ID | Verify `GA4_PROPERTY_ID` and GA4 Realtime |
| Sitemap error with `sc-domain:` | Inferred URL is wrong | Pass explicit site and sitemap URL |
| GTM 429 | Rate limit | Stop, wait 3-5 minutes, retry once |
