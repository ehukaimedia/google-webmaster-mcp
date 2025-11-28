# Google Webmaster MCP

A Unified Model Context Protocol (MCP) server for managing **Google Tag Manager (GTM)**, **Google Search Console (GSC)**, and **Google Analytics (GA4)**.

This tool allows AI agents (like Claude, Cursor, etc.) to interact with your Google Webmaster tools directly, enabling automated auditing, tag management, and reporting.

## Features

### 🏷️ Google Tag Manager (GTM)
- **List & Search**: Find tags, triggers, and variables.
- **Manage Tags**: Create, update, pause, and delete tags (HTML, GA4 Event, GA4 Config).
- **Manage Variables**: Create and update Custom JavaScript and Data Layer variables.
- **Versioning**: Create versions, submit workspaces, and publish containers.
- **Validation**: Check for common issues (missing triggers, unknown variables) before publishing.

### 🔍 Google Search Console (GSC)
- **Site Management**: List all accessible properties.
- **Performance Data**: Query search analytics (clicks, impressions, CTR, position).
- **URL Inspection**: Inspect URLs for indexing status and mobile usability.
- **Sitemaps**: List, submit, and extract URLs from sitemaps.

### 📊 Google Analytics (GA4)
- **Reporting**: Run reports with custom dimensions and metrics.
- **Account Summary**: List accessible accounts and properties.

## Prerequisites

- Node.js (v18 or higher)
- A Google Cloud Project with the following APIs enabled:
  - Google Tag Manager API
  - Google Search Console API
  - Google Analytics Data API
  - Google Analytics Admin API

## Installation

1.  **Clone the repository** (or download the source):
    ```bash
    git clone <repository-url>
    cd google-webmaster-mcp
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Build the project**:
    ```bash
    npm run build
    ```

## Configuration

1.  **Create a `.env` file**:
    Copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```

2.  **Set up Google OAuth**:
    -   Go to your Google Cloud Console.
    -   Create OAuth 2.0 credentials (Desktop App).
    -   Download the client secret JSON or copy the Client ID and Secret.
    -   Update `.env` with your credentials:
        ```env
        GOOGLE_CLIENT_ID=your_client_id
        GOOGLE_CLIENT_SECRET=your_client_secret
        ```

3.  **Authenticate**:
    Run the authentication script to generate your `token.json`:
    ```bash
    npm run auth
    ```
    -   Click the link to authorize the app.
    -   Grant all requested permissions (GTM, GSC, Analytics).
    -   The script will save `token.json` in the root directory.

## Usage

### Running the Server

To use this with an MCP client, configure it to run the built Node.js script:

```json
{
  "mcpServers": {
    "google-webmaster": {
      "command": "node",
      "args": ["/path/to/google-webmaster-mcp/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "...",
        "GOOGLE_CLIENT_SECRET": "..."
      }
    }
  }
}
```

### Available Tools

#### GTM Tools
- `gtm_list_tags`, `gtm_find_tags`
- `gtm_create_tag`, `gtm_update_tag`, `gtm_delete_tag`
- `gtm_create_ga4_event`, `gtm_create_ga4_configuration`
- `gtm_list_variables`, `gtm_create_variable`
- `gtm_list_triggers`, `gtm_create_trigger`
- `gtm_create_version`, `gtm_publish_version`

#### GSC Tools
- `gsc_list_sites`
- `gsc_analytics_query`
- `gsc_inspect_url`
- `gsc_sitemaps_submit`, `gsc_list_sitemaps`

#### Analytics Tools
- `analytics_list_account_summaries`
- `analytics_run_report`

## Development

-   **Build**: `npm run build`
-   **Dev (Watch)**: `npm run dev`
-   **Auth**: `npm run auth`

## License

ISC
