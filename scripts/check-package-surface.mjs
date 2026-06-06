#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const requiredFiles = new Set([
    "package.json",
    "LICENSE",
    "README.md",
    "GWMPC_Workflow.md",
    "SEO_AUDIT_CLI.md",
    "mcp-config.json",
    "dist/index.js",
    "dist/auth/cli.js",
    "scripts/audit.js",
    "scripts/audit-cli.mjs",
    "scripts/cli-utils.mjs",
    "scripts/publish_gtm.js",
    "scripts/setup_ga4_tags.js",
    "scripts/smart-audit.mjs",
    "scripts/submit_sitemap.js",
    "scripts/validate_gtm.js",
]);

const prohibitedPatterns = [
    { label: "credential file", pattern: new RegExp("(^|/)(client" + "_secret.*\\.json|\\.env|token(?:_[A-Za-z0-9_-]+)?\\.json)$", "i") },
    { label: "internal GTM cleanup script", pattern: /^scripts\/cleanup_gtm\.js$/ },
    { label: "hardcoded webmaster setup script", pattern: /^scripts\/setup_webmaster_fixed\.js$/ },
    { label: "site-specific KPI setup script", pattern: /^scripts\/setup_kpi_tags\.js$/ },
    { label: "private skills bundle", pattern: /^skills\// },
    { label: "local Claude state", pattern: /^\.claude\// },
    { label: "tests", pattern: /^test\// },
    { label: "review-only docs", pattern: /^docs\/code-reviews\// },
    { label: "playground drafts", pattern: /^docs\/playgrounds\// },
];

function normalizePath(path) {
    return path.replace(/^package\//, "");
}

function packDryRun() {
    const output = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    });
    const [packInfo] = JSON.parse(output);
    return packInfo.files.map((file) => normalizePath(file.path));
}

function main() {
    const files = packDryRun();
    const fileSet = new Set(files);
    const failures = [];

    for (const requiredFile of requiredFiles) {
        if (!fileSet.has(requiredFile)) {
            failures.push(`Missing required package file: ${requiredFile}`);
        }
    }

    for (const [binName, binPath] of Object.entries(manifest.bin || {})) {
        const normalizedBinPath = binPath.replace(/^\.\//, "");
        if (!fileSet.has(normalizedBinPath)) {
            failures.push(`Missing bin target for ${binName}: ${normalizedBinPath}`);
        }
    }

    for (const file of files) {
        for (const { label, pattern } of prohibitedPatterns) {
            if (pattern.test(file)) {
                failures.push(`Package includes prohibited ${label}: ${file}`);
            }
        }
    }

    if (failures.length > 0) {
        console.error(failures.join("\n"));
        process.exit(1);
    }

    console.log(`Package surface OK: ${files.length} files checked.`);
}

main();
