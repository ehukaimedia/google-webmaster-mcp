# Google Webmaster MCP Workflow

This workflow is the standard operating path for maintaining SEO, Search Console, GA4, and GTM health with the globally installed `google-webmaster-mcp` CLI tools.

## Prerequisites

Run commands from the project you are auditing, not from the MCP package repo, unless you are developing the package itself.

Create a project-local `.env` or export equivalent environment variables:

```env
GTM_ID=GTM-XXXXXXX
GSC_SITE=sc-domain:example.com
GA4_PROPERTY_ID=123456789
GA4_MID=G-XXXXXXXXXX
GTM_WORKSPACE_ID=
```

Authenticate globally before using Google APIs:

```bash
google-webmaster-mcp-auth
```

## Phase 1: Audit

Goal: confirm the site is visible, indexed, and connected to the expected Google properties.

```bash
google-webmaster-audit
```

Check for:

- Missing or stale sitemap submissions.
- Unexpected zero-click or zero-impression Search Console data.
- GA4 "No data returned" results.
- Empty or drifted GTM containers.

For `sc-domain:` Search Console properties, submit sitemaps explicitly:

```bash
google-webmaster-submit-sitemap "sc-domain:example.com" "https://example.com/sitemap.xml"
```

## Phase 2: Analyze

Goal: understand whether traffic and events match the expected site behavior.

Use the MCP tool `analytics_run_report` for custom GA4 checks. Useful dimensions include `sessionSourceMedium`, `eventName`, and `eventLabel`. Useful metrics include `sessions`, `engagementRate`, and `eventCount`.

## Phase 3: Validate GTM

Goal: inspect the workspace before changing it.

```bash
google-webmaster-gtm-validate
```

Do this before setup or publish so partial state and drift are visible.

## Phase 4: Set Up Baseline GA4 Tracking

Goal: provision the generic baseline tracking contract.

```bash
google-webmaster-setup-ga4
```

This creates or reuses:

- GA4 configuration on all pages.
- `generate_lead` custom-event trigger and event tag.
- Standard email, phone, and LinkedIn interaction tracking where supported.

Keep `generate_lead` generic. Site-specific attribution belongs in event parameters such as `label`, not in hardcoded package defaults.

## Phase 5: Validate and Publish

Goal: confirm workspace state after setup, then publish deliberately.

```bash
google-webmaster-gtm-validate
google-webmaster-gtm-publish GTM-XXXXXXX "Add GA4 baseline tags"
```

## GTM Rate-Limit Rules

The GTM API enforces a low queries-per-minute quota. Each CLI command can make several API calls, and retrying too quickly can exhaust the quota.

Hard rules:

- Wait at least 3 minutes between GTM commands.
- Do not run audit, validate, setup, and publish back-to-back.
- Do not use polling loops to retry GTM commands.
- After a 429, stop completely and wait 3-5 minutes before one retry.
- If setup fails midway, wait, then run validate before retrying setup.

Safe sequence:

```bash
google-webmaster-audit
# wait 3 minutes
google-webmaster-gtm-validate
# wait 3 minutes
google-webmaster-setup-ga4
# wait 3 minutes
google-webmaster-gtm-validate
# wait 3 minutes
google-webmaster-gtm-publish
```

## Conversion Attribution Pattern

Use one generic conversion event and add labels for source attribution:

```js
window.dataLayer.push({ event: 'generate_lead', label: 'header_cta' });
window.dataLayer.push({ event: 'generate_lead', label: 'hero_quote_button' });
```

In GTM, create a Data Layer Variable for `label` and map it to the GA4 event parameter `event_label`.

## Troubleshooting Scenarios

Traffic dropped:

- Compare impressions and clicks in GSC.
- Inspect top affected URLs with `gsc_inspect_url`.
- Check whether GA4 sessions dropped at the same time.

New campaign:

- Use a site-owned GTM plan for campaign-specific events.
- Keep generic package commands focused on reusable baseline tracking.
- Publish only after validation passes.

Broken GTM workspace:

- Run `google-webmaster-gtm-validate`.
- Fix missing triggers, variables, or GA4 config references.
- Validate again before publish.
