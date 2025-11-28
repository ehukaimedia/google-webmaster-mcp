# Google Webmaster MCP: SEO & KPI Maintenance Workflow

This document outlines the recommended Standard Operating Procedure (SOP) for using the **Google Webmaster MCP** tool to maintain robust SEO health and track Key Performance Indicators (KPIs).

## The "Triple-A" Cycle: Audit, Analyze, Action

The most effective workflow combines the three pillars of the tool: **Google Search Console (Audit)**, **Google Analytics 4 (Analyze)**, and **Google Tag Manager (Action)**.

---

### Phase 1: Audit (Google Search Console)
**Goal**: Ensure your site is visible, indexed, and error-free.

1.  **Health Check**:
    *   Use `gsc_list_sites` to confirm you are targeting the correct property.
    *   **NEW**: Use `gsc_get_performance_overview` for a 30-day snapshot of Clicks, Impressions, and Top Pages.
    *   Use `gsc_list_sitemaps` to ensure your sitemaps are submitted and fresh.
2.  **Indexing Status**:
    *   Use `gsc_inspect_url` on key landing pages (Home, Services, Blog) to verify they are:
        *   Indexed successfully.
        *   Mobile-friendly.
        *   Serving the correct canonical URL.
3.  **Performance Review**:
    *   Use `gsc_analytics_query` for deep dives into specific queries or countries.

### Phase 2: Analyze (Google Analytics 4)
**Goal**: Understand user behavior and verify KPI performance.

1.  **Preparation**:
    *   **NEW**: Use `analytics_get_metadata` to find the exact API names for dimensions (e.g., `city`) and metrics (e.g., `activeUsers`) before running reports.
2.  **Traffic Pulse**:
    *   Use `analytics_run_report` to check sessions and users for the past 7-30 days.
    *   Compare against the previous period to identify trends.
3.  **KPI Verification**:
    *   Check specific conversion events (e.g., `generate_lead`, `purchase`, `sign_up`).

### Phase 3: Action (Google Tag Manager)
**Goal**: Fix tracking gaps and implement new features.

1.  **Gap Filling**:
    *   If Phase 2 revealed missing data, use GTM to fix it.
    *   **NEW**: Use `gtm_create_tag` with the `triggerName` parameter. You can simply say "Create a tag that fires on 'Click - Contact Button'" and the tool will automatically find or create that trigger for you.
    *   Use `gtm_create_ga4_event_tag` for specialized event tracking.
2.  **Deployment**:
    *   Use `gtm_create_version` to snapshot your changes.
    *   Use `gtm_publish_version` to push changes live.
3.  **Validation**:
    *   Use `gtm_validate_workspace` before publishing to ensure no broken references.

---

## Example Scenarios

### Scenario A: "My traffic dropped!"
1.  **Agent**: "Check GSC analytics for the last 7 days. Are impressions down or just clicks?"
2.  **Agent**: "If impressions are stable but clicks are down, check average position."
3.  **Agent**: "Inspect the top dropping URL with `gsc_inspect_url` to see if it was de-indexed."

### Scenario B: "I need to track a new marketing campaign."
1.  **Agent**: "Create a new GA4 Event Tag named 'Campaign_Signup' in GTM."
2.  **Agent**: "Create a Trigger for 'Page View' where URL contains '/campaign-landing'."
3.  **Agent**: "Publish the new version."
4.  **Agent**: "Verify data starts appearing in GA4 with `analytics_run_report` tomorrow."

## Automation Tips for AI Agents

*   **Batch Audits**: Ask your agent to "Audit the top 5 pages of my site using GSC and report any mobile usability issues."
*   **Self-Healing**: "If you find a broken variable reference in GTM using `gtm_validate_workspace`, list it and suggest a fix."
