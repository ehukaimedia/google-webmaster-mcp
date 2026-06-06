#!/usr/bin/env node
/**
 * Smart Audit - Natural Language CLI
 * 
 * Uses FunctionGemma to interpret natural language queries
 * and route them to the appropriate audit-cli.mjs flags.
 * 
 * Usage:
 *   node scripts/smart-audit.mjs "audit localhost with AI recommendations"
 *   node scripts/smart-audit.mjs "check example.com page speed"
 *   node scripts/smart-audit.mjs "full audit of /about page on port 3000"
 * 
 * Output:
 *   Same JSON as audit-cli.mjs
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getPackageVersion, hasHelpFlag, hasVersionFlag, printVersion } from "./cli-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function printHelp() {
    console.log(`SEO Smart Audit CLI ${getPackageVersion()}

Usage:
  seo-audit-smart "audit request"

Options:
  --version, -v   Print the package version
  --help, -h      Show this help message

Examples:
  seo-audit-smart "audit localhost with AI"
  seo-audit-smart "check example.com performance"`);
}

// --- FunctionGemma Parser ---
async function parseQuery(query) {
    const systemPrompt = `Parse this audit request into JSON.

Output ONLY this exact format:
{"url": "...", "ai": true/false, "pagespeed": true/false}

Examples:
- "audit localhost" -> {"url": "http://localhost:3000", "ai": false, "pagespeed": false}
- "check example.com with AI" -> {"url": "https://example.com", "ai": true, "pagespeed": false}
- "full audit of mysite.com" -> {"url": "https://mysite.com", "ai": true, "pagespeed": true}

Rules:
- If no protocol, add https:// (or http:// for localhost)
- If localhost without port, assume :3000
- "AI" or "recommendations" means ai: true
- "speed" or "performance" means pagespeed: true`;

    try {
        const response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gemma3:4b",  // Use gemma3 for more reliable JSON
                prompt: `${systemPrompt}\n\nQuery: "${query}"\n\nJSON:`,
                format: "json",
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status}`);
        }

        const data = await response.json();
        const parsed = JSON.parse(data.response);

        // Normalize the response
        return {
            url: parsed.url || "http://localhost:3000",
            flags: [
                ...(parsed.ai ? ["--ai"] : []),
                ...(parsed.pagespeed ? ["--pagespeed"] : [])
            ],
            batch_file: parsed.batch_file || null
        };

    } catch (error) {
        // Fallback: simple regex parsing
        const urlMatch = query.match(/https?:\/\/[^\s]+/) ||
            query.match(/localhost[:\d]*/i) ||
            query.match(/\b[\w.-]+\.(com|org|net|io|dev)\b/i);

        let url = "http://localhost:3000";
        if (urlMatch) {
            url = urlMatch[0];
            if (!url.startsWith("http")) {
                url = url.includes("localhost") ? `http://${url}` : `https://${url}`;
            }
            if (url.includes("localhost") && !url.includes(":")) {
                url = url.replace("localhost", "localhost:3000");
            }
        }

        const lowerQuery = query.toLowerCase();
        return {
            url,
            flags: [
                ...(lowerQuery.includes("ai") || lowerQuery.includes("recommend") ? ["--ai"] : []),
                ...(lowerQuery.includes("speed") || lowerQuery.includes("perf") ? ["--pagespeed"] : [])
            ],
            batch_file: null
        };
    }
}

// --- Execute Audit CLI ---
function runAudit(url, flags = [], batchFile = null) {
    return new Promise((resolve, reject) => {
        const cliPath = join(__dirname, "audit-cli.mjs");
        const args = [];

        if (batchFile) {
            args.push("--file", batchFile);
        } else {
            args.push(url);
        }

        args.push(...flags);

        const child = spawn("node", [cliPath, ...args], {
            stdio: ["inherit", "pipe", "pipe"]
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => { stdout += data; });
        child.stderr.on("data", (data) => { stderr += data; });

        child.on("close", (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(stderr || `Exit code: ${code}`));
            }
        });
    });
}

// --- Main ---
async function main() {
    const args = process.argv.slice(2);

    if (hasHelpFlag(args)) {
        printHelp();
        return;
    }

    if (hasVersionFlag(args)) {
        printVersion();
        return;
    }

    const query = args.join(" ");

    if (!query) {
        console.error(JSON.stringify({
            error: "Usage: smart-audit.mjs \"your natural language query\"",
            examples: [
                "audit localhost with AI",
                "check example.com performance",
                "full audit of https://mysite.com --ai --pagespeed"
            ]
        }, null, 2));
        process.exit(1);
    }

    // Step 1: Parse query with FunctionGemma
    console.error(`Parsing: "${query}"...`);
    const parsed = await parseQuery(query);
    console.error(`Interpreted: ${JSON.stringify(parsed)}`);

    // Step 2: Run audit
    try {
        const result = await runAudit(parsed.url, parsed.flags, parsed.batch_file);
        console.log(result);
    } catch (error) {
        console.error(JSON.stringify({ error: error.message }));
        process.exit(1);
    }
}

main();
