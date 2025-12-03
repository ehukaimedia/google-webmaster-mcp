# Google Webmaster MCP: SEO & KPI Maintenance Workflow

This document outlines the recommended Standard Operating Procedure (SOP) for using the **Google Webmaster MCP** tool to maintain robust SEO health and track Key Performance Indicators (KPIs).

## The "Triple-A" Cycle: Audit, Analyze, Action

The most effective workflow combines the three pillars of the tool: **Google Search Console (Audit)**, **Google Analytics 4 (Analyze)**, and **Google Tag Manager (Action)**.

---

## Prerequisites for Global Use

Since this tool is installed globally, it needs to know **which** project you are working on.

1.  **Context is Key**: The tools need to know which site to act on.
    *   **Create a `.env` file** in the **root of your project** (e.g., inside `oahugaragedoors.com/`).
    *   **Required Variables**:
        ```env
        GTM_ID=GTM-XXXXXX
        GSC_SITE=https://example.com
        GSC_SITE=https://example.com
        GA4_PROPERTY_ID=123456789
        BUSINESS_ACCOUNT_ID=123456789
        BUSINESS_LOCATION_ID=987654321
        ```

2.  **Authentication**: Ensure you have authenticated globally using the command:
    ```bash
    google-webmaster-mcp-auth
    ```

---

### Phase 1: Audit (Google Search Console)
**Goal**: Ensure your site is visible, indexed, and error-free.

1.  **Health Check**:
    *   Run `google-webmaster-audit` to get a snapshot of GSC performance and sitemap status.
    *   If sitemaps are missing, run `google-webmaster-submit-sitemap`.
2.  **Indexing Status**:
    *   Use `gsc_inspect_url` (via MCP) on key landing pages.
3.  **Performance Review**:
    *   Review the "Top Pages" output from the audit command.

### Phase 2: Analyze (Google Analytics 4)
**Goal**: Understand user behavior and verify KPI performance.

1.  **Traffic Pulse**:
    *   Run `google-webmaster-audit` to see the last 7 days of active users and sessions.
2.  **KPI Verification**:
    *   Check specific conversion events using the MCP tool `analytics_run_report`.

### Phase 3: Action (Google Tag Manager)
**Goal**: Fix tracking gaps and implement new features.

1.  **Gap Filling**:
    *   Use `gtm_create_tag` (via MCP) to add missing tags.
2.  **Validation**:
    *   Run `google-webmaster-gtm-validate` to check for missing triggers or variables.
3.  **Deployment**:
    *   Run `google-webmaster-gtm-publish` to snapshot and publish your changes.

### Phase 4: Awareness (Google Business Profile)
**Goal**: Manage local presence and reputation.

1.  **Review Management**:
    *   Use `business_get_reviews` to monitor customer feedback.
    *   Reply to reviews using `business_reply_review` to engage with customers.
2.  **Profile Updates**:
    *   Keep your business information (hours, phone, etc.) up to date using `business_update_location`.
3.  **Post Management**:
    *   Share updates, offers, and events using `business_create_post`.
    *   Manage active posts with `business_list_posts`, `business_update_post`, and `business_delete_post`.


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
