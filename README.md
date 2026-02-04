# Google Webmaster MCP

A Unified Model Context Protocol (MCP) server for managing **Google Tag Manager (GTM)**, **Google Search Console (GSC)**, and **Google Analytics (GA4)**.

## Features

### 🏷️ Google Tag Manager (GTM)
- **List & Search**: Find tags, triggers, and variables.
- **Manage Tags**: Create, update, pause, and delete tags.
- **Validation**: Check for common issues.

### 🔍 Google Search Console (GSC)
- **Site Management**: List properties.
- **Performance**: Query analytics and inspect URLs.
- **Sitemaps**: Submit and list sitemaps.

### 📊 Google Analytics (GA4)
- **Reporting**: Run custom reports.
- **Pulse**: Check active users and sessions.



## Installation

1.  **Clone**:
    ```bash
    git clone <repository-url>
    cd google-webmaster-mcp
    ```

2.  **Install & Build**:
    ```bash
    npm install
    npm run build
    ```

3.  **Global Link (Required for CLI)**:
    ```bash
    npm install -g .
    ```

## Configuration

1.  **Google OAuth**:
    -   Create Desktop App credentials in Google Cloud Console.
    -   Save Client ID and Secret.

4.  **Multi-Profile Support (Optional)**:
    auth commands support a `--profile` flag to manage multiple accounts:
    ```bash
    npm run auth -- --profile=client_a
    ```
    To use a specific profile, set `GOOGLE_TOKEN_PROFILE=client_a` in your `.env` file or environment.

5.  **Authenticate**:
    ```bash
    npm run auth
    ```

## Usage

### 1. As an AI Agent Tool (MCP)
Configure your AI client (Cursor, Claude, etc.) to use this server.
- **Command**: `node /path/to/google-webmaster-mcp/dist/index.js`
- **Env**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**Workflow**:
The agent will read the `.env` file in your **current project** (e.g., `my-website/.env`) to find `GTM_ID`, `GSC_SITE`, etc., and pass them to the tool.

### 2. Global CLI Tool Suite
You can run these tools from **any** directory on your machine.

**Prerequisite**:
Ensure you have a `.env` file in your **current working directory** with:
```env
GTM_ID=GTM-XXXX
GSC_SITE=https://example.com
GSC_SITE=https://example.com
GA4_PROPERTY_ID=123456789

```

**Available Commands**:

#### 🔍 Audit
Checks GTM tags, GSC performance, and GA4 traffic.
```bash
google-webmaster-audit
```

#### 🗺️ Submit Sitemap
Submits your sitemap to Google Search Console.
```bash
# Auto-detects sitemap from GSC_SITE/sitemap.xml
google-webmaster-submit-sitemap

# Or specify manually
google-webmaster-submit-sitemap https://example.com https://example.com/custom-sitemap.xml
```

#### ✅ Validate GTM
Checks your GTM workspace for missing triggers, unknown variables, and GA4 config issues.
```bash
google-webmaster-gtm-validate
```

#### 🚀 Publish GTM
Creates a new version and publishes the current GTM workspace.
```bash
# Publish with default notes
google-webmaster-gtm-publish

# Publish with custom notes
google-webmaster-gtm-publish GTM-XXXX "Updated GA4 tags"
```

#### 📈 Setup GA4 Tags
Automatically creates GA4 Configuration and Event tags (contact_click, generate_lead) in GTM.
```bash
# Requires GTM_ID and GA4_MID in .env
google-webmaster-setup-ga4
```


#### 🎯 Setup KPI Tags
Automatically creates conversion tracking tags for key performance indicators in GTM.
```bash
# Requires GTM_ID and GA4_MID in .env
node scripts/setup_kpi_tags.js
```

---

### 🔍 SEO/GEO Audit CLI

A full 25-check technical audit tool that works on any URL (public or localhost).

#### Standard Mode (Flags)
```bash
# Basic audit
seo-audit https://example.com

# With AI recommendations (requires: ollama serve)
seo-audit http://localhost:3000 --ai

# With PageSpeed score (public URLs only)
seo-audit https://example.com --pagespeed

# Batch mode (multiple URLs from file)
seo-audit --file urls.txt
```

#### Smart Mode (Natural Language)
```bash
seo-audit-smart "audit localhost with AI"
seo-audit-smart "check example.com performance"
```

**Checks Include:**
- SEO (10): Title, Meta, H1, Alt Text, Canonical, OG Tags, etc.
- GEO (4): Schema.org, FAQ, Citation Signals, Content Clarity
- Security (5): HTTPS, CSP, HSTS, X-Frame-Options
- Accessibility (4): Lang, Labels, Skip Nav, Focus
- Mobile (2): Touch Targets, Font Legibility
- Speed (1): PageSpeed Insights (optional)

**Output:** JSON to stdout (pipe to file or parse with jq).



## Troubleshooting

### "Error: Missing configuration"
If you see this error, it means the tool cannot find your `.env` file.
1.  Make sure you are running the command from the **root of your project**.
2.  Make sure a `.env` file exists in that directory.
3.  Make sure the `.env` file contains the required keys (`GTM_ID`, `GSC_SITE`, etc.).

### "command not found"
If you cannot run `google-webmaster-audit`, try reinstalling the package globally:
```bash
cd /path/to/google-webmaster-mcp
npm install -g .
```

## License
ISC
