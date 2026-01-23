#!/usr/bin/env node
/**
 * Ehukai Media Full Audit CLI
 * 
 * Usage:
 *   node scripts/audit-cli.mjs <url> [--ai] [--pagespeed]
 *   node scripts/audit-cli.mjs --file <urls.txt> [--ai] [--pagespeed]
 * 
 * Options:
 *   --ai        Include Ollama AI recommendations (requires: ollama serve)
 *   --pagespeed Include Google PageSpeed score (requires: GOOGLE_WEBMASTER_MCP_API_KEY env var)
 *   --file      Path to a text file with URLs (one per line)
 * 
 * Output:
 *   JSON to stdout (single object for single URL, array for batch)
 * 
 * Examples:
 *   node scripts/audit-cli.mjs https://example.com
 *   node scripts/audit-cli.mjs http://localhost:3000 --ai
 *   node scripts/audit-cli.mjs --file urls.txt --pagespeed > audits.json
 */

import * as cheerio from "cheerio";
import { config } from "dotenv";
import { readFileSync } from "fs";

// Load .env file for API keys
config({ path: new URL("../.env", import.meta.url).pathname });

// --- Audit a single URL ---
async function auditUrl(urlString, options = {}) {
    const { includeAI = false, includePageSpeed = false } = options;

    // Validate URL
    let targetUrl;
    try {
        targetUrl = new URL(urlString.startsWith("http") ? urlString : `https://${urlString}`);
    } catch {
        return { error: "Invalid URL format", url: urlString };
    }

    const startTime = Date.now();
    const checks = [];

    try {
        // Fetch the page
        const response = await fetch(targetUrl.toString(), {
            headers: {
                "User-Agent": "EhukaiAuditCLI/1.0",
                "Accept": "text/html,application/xhtml+xml",
            },
        });

        if (!response.ok) {
            return {
                error: `Failed to fetch: ${response.status} ${response.statusText}`,
                url: targetUrl.toString()
            };
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const responseHeaders = response.headers;

        // ========== SEO CHECKS ==========

        // 1. Title Tag
        const title = $("title").text().trim();
        if (!title) {
            checks.push({ name: "Title Tag", status: "fail", value: "Missing", recommendation: "Add a descriptive title tag.", weight: 10, category: "seo" });
        } else if (title.length < 30) {
            checks.push({ name: "Title Tag", status: "warn", value: `${title.length} chars`, recommendation: "Title is too short. Aim for 50-60 characters.", weight: 10, category: "seo" });
        } else if (title.length > 60) {
            checks.push({ name: "Title Tag", status: "warn", value: `${title.length} chars`, recommendation: "Title may be truncated in search results.", weight: 10, category: "seo" });
        } else {
            checks.push({ name: "Title Tag", status: "pass", value: `${title.length} chars`, weight: 10, category: "seo" });
        }

        // 2. Meta Description
        const metaDesc = $('meta[name="description"]').attr("content")?.trim() || "";
        if (!metaDesc) {
            checks.push({ name: "Meta Description", status: "fail", value: "Missing", recommendation: "Add a compelling meta description.", weight: 8, category: "seo" });
        } else if (metaDesc.length < 50) {
            checks.push({ name: "Meta Description", status: "warn", value: `${metaDesc.length} chars`, recommendation: "Description is too short.", weight: 8, category: "seo" });
        } else if (metaDesc.length > 160) {
            checks.push({ name: "Meta Description", status: "warn", value: `${metaDesc.length} chars`, recommendation: "Description may be truncated.", weight: 8, category: "seo" });
        } else {
            checks.push({ name: "Meta Description", status: "pass", value: `${metaDesc.length} chars`, weight: 8, category: "seo" });
        }

        // 3. H1 Heading
        const h1s = $("h1");
        if (h1s.length === 0) {
            checks.push({ name: "H1 Heading", status: "fail", value: "Missing", recommendation: "Add exactly one H1 heading.", weight: 8, category: "seo" });
        } else if (h1s.length > 1) {
            checks.push({ name: "H1 Heading", status: "warn", value: `${h1s.length} found`, recommendation: "Use only one H1 per page.", weight: 8, category: "seo" });
        } else {
            checks.push({ name: "H1 Heading", status: "pass", value: "1 found", weight: 8, category: "seo" });
        }

        // 4. Image Alt Text
        const images = $("img");
        const imagesWithAlt = $("img[alt]").filter((_, el) => $(el).attr("alt")?.trim());
        const altRatio = images.length > 0 ? imagesWithAlt.length / images.length : 1;
        if (images.length === 0) {
            checks.push({ name: "Image Alt Text", status: "pass", value: "No images", weight: 6, category: "seo" });
        } else if (altRatio >= 0.9) {
            checks.push({ name: "Image Alt Text", status: "pass", value: `${imagesWithAlt.length}/${images.length} have alt`, weight: 6, category: "seo" });
        } else if (altRatio >= 0.5) {
            checks.push({ name: "Image Alt Text", status: "warn", value: `${imagesWithAlt.length}/${images.length} have alt`, recommendation: "Add alt text to all images.", weight: 6, category: "seo" });
        } else {
            checks.push({ name: "Image Alt Text", status: "fail", value: `${imagesWithAlt.length}/${images.length} have alt`, recommendation: "Most images missing alt text.", weight: 6, category: "seo" });
        }

        // 5. Viewport Meta
        const viewport = $('meta[name="viewport"]').attr("content");
        if (viewport) {
            checks.push({ name: "Viewport Meta", status: "pass", value: "Present", weight: 5, category: "seo" });
        } else {
            checks.push({ name: "Viewport Meta", status: "fail", value: "Missing", recommendation: "Add viewport meta for mobile.", weight: 5, category: "seo" });
        }

        // 6. Canonical Tag
        const canonical = $('link[rel="canonical"]').attr("href");
        if (canonical) {
            checks.push({ name: "Canonical Tag", status: "pass", value: "Present", weight: 5, category: "seo" });
        } else {
            checks.push({ name: "Canonical Tag", status: "warn", value: "Missing", recommendation: "Add canonical tag to prevent duplicate content.", weight: 5, category: "seo" });
        }

        // 7. Open Graph Tags
        const ogTitle = $('meta[property="og:title"]').attr("content");
        const ogDesc = $('meta[property="og:description"]').attr("content");
        const ogImage = $('meta[property="og:image"]').attr("content");
        const ogCount = [ogTitle, ogDesc, ogImage].filter(Boolean).length;
        if (ogCount === 3) {
            checks.push({ name: "Open Graph Tags", status: "pass", value: "Complete", weight: 4, category: "seo" });
        } else if (ogCount > 0) {
            checks.push({ name: "Open Graph Tags", status: "warn", value: `${ogCount}/3 present`, recommendation: "Add missing OG tags.", weight: 4, category: "seo" });
        } else {
            checks.push({ name: "Open Graph Tags", status: "fail", value: "Missing", recommendation: "Add og:title, og:description, og:image.", weight: 4, category: "seo" });
        }

        // 8. Robots Meta
        const robotsMeta = $('meta[name="robots"]').attr("content") || "";
        if (robotsMeta.includes("noindex")) {
            checks.push({ name: "Robots Meta", status: "fail", value: "noindex", recommendation: "Remove noindex to allow indexing.", weight: 8, category: "seo" });
        } else {
            checks.push({ name: "Robots Meta", status: "pass", value: "Indexable", weight: 8, category: "seo" });
        }

        // 9. Internal Links
        const internalLinks = $('a[href^="/"], a[href^="' + targetUrl.origin + '"]');
        if (internalLinks.length >= 3) {
            checks.push({ name: "Internal Links", status: "pass", value: `${internalLinks.length} found`, weight: 4, category: "seo" });
        } else {
            checks.push({ name: "Internal Links", status: "warn", value: `${internalLinks.length} found`, recommendation: "Add more internal links for crawlability.", weight: 4, category: "seo" });
        }

        // 10. Content Length
        const bodyText = $("body").text().replace(/\s+/g, " ").trim();
        const wordCount = bodyText.split(/\s+/).length;
        if (wordCount >= 300) {
            checks.push({ name: "Content Length", status: "pass", value: `${wordCount} words`, weight: 5, category: "seo" });
        } else {
            checks.push({ name: "Content Length", status: "warn", value: `${wordCount} words`, recommendation: "Add more content (min 300 words).", weight: 5, category: "seo" });
        }

        // ========== GEO CHECKS ==========

        // 11. Schema.org Data
        const jsonLdScripts = $('script[type="application/ld+json"]');
        let schemaTypes = [];
        jsonLdScripts.each((_, el) => {
            try {
                const data = JSON.parse($(el).html() || "{}");
                const items = Array.isArray(data) ? data : [data];
                items.forEach(item => {
                    if (item["@type"]) {
                        const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
                        schemaTypes.push(...types.filter(t => typeof t === "string"));
                    }
                });
            } catch { /* ignore parse errors */ }
        });
        if (schemaTypes.length > 0) {
            checks.push({ name: "[GEO] Schema.org", status: "pass", value: schemaTypes.join(", "), weight: 8, category: "geo" });
        } else {
            checks.push({ name: "[GEO] Schema.org", status: "fail", value: "Missing", recommendation: "Add JSON-LD schema (FAQPage, Article, etc.).", weight: 8, category: "geo" });
        }

        // 12. FAQ Schema
        const hasFAQ = schemaTypes.some(t => t.toLowerCase().includes("faq"));
        if (hasFAQ) {
            checks.push({ name: "[GEO] FAQ Schema", status: "pass", value: "Present", weight: 8, category: "geo" });
        } else {
            checks.push({ name: "[GEO] FAQ Schema", status: "warn", value: "Missing", recommendation: "Add FAQPage schema for AI visibility.", weight: 8, category: "geo" });
        }

        // 13. Citation Signals
        const citationPatterns = [
            /\d{1,3}%/g,
            /\$[\d,]+/g,
            /\b(20\d{2})\b/g,
            /\b\d+\s*(million|billion|k)\b/gi,
            /\b\d+x\b/gi,
        ];
        let citationCount = 0;
        citationPatterns.forEach(pattern => {
            const matches = bodyText.match(pattern);
            if (matches) citationCount += matches.length;
        });
        citationCount += $("blockquote").length;

        if (citationCount >= 5) {
            checks.push({ name: "[GEO] Citation Signals", status: "pass", value: `${citationCount} found`, weight: 6, category: "geo" });
        } else if (citationCount >= 2) {
            checks.push({ name: "[GEO] Citation Signals", status: "warn", value: `${citationCount} found`, recommendation: "Add more stats, dates, or quotes.", weight: 6, category: "geo" });
        } else {
            checks.push({ name: "[GEO] Citation Signals", status: "fail", value: `${citationCount} found`, recommendation: "Add statistics, percentages, or blockquotes.", weight: 6, category: "geo" });
        }

        // 14. Content Clarity
        const listItems = $("ul li, ol li").length;
        const subHeadings = $("h2, h3, h4").length;
        if (listItems >= 5 && subHeadings >= 3) {
            checks.push({ name: "[GEO] Content Clarity", status: "pass", value: `${listItems} list items, ${subHeadings} headings`, weight: 5, category: "geo" });
        } else if (listItems >= 3 || subHeadings >= 2) {
            checks.push({ name: "[GEO] Content Clarity", status: "warn", value: `${listItems} list items, ${subHeadings} headings`, recommendation: "Add more lists and subheadings.", weight: 5, category: "geo" });
        } else {
            checks.push({ name: "[GEO] Content Clarity", status: "fail", value: `${listItems} list items, ${subHeadings} headings`, recommendation: "Structure content with lists and headings.", weight: 5, category: "geo" });
        }

        // ========== SECURITY CHECKS ==========

        // 15. HTTPS
        checks.push({
            name: "HTTPS",
            status: targetUrl.protocol === "https:" ? "pass" : "fail",
            value: targetUrl.protocol === "https:" ? "Enabled" : "Not enabled",
            recommendation: targetUrl.protocol === "https:" ? undefined : "Use HTTPS for security.",
            weight: 10,
            category: "security"
        });

        // 16. Content-Security-Policy
        const csp = responseHeaders.get("content-security-policy");
        checks.push({
            name: "Content-Security-Policy",
            status: csp ? "pass" : "warn",
            value: csp ? "Present" : "Missing",
            recommendation: csp ? undefined : "Add CSP header to prevent XSS.",
            weight: 6,
            category: "security"
        });

        // 17. X-Frame-Options
        const xfo = responseHeaders.get("x-frame-options");
        checks.push({
            name: "X-Frame-Options",
            status: xfo ? "pass" : "warn",
            value: xfo || "Missing",
            recommendation: xfo ? undefined : "Add X-Frame-Options to prevent clickjacking.",
            weight: 5,
            category: "security"
        });

        // 18. HSTS
        const hsts = responseHeaders.get("strict-transport-security");
        checks.push({
            name: "HSTS",
            status: hsts ? "pass" : "warn",
            value: hsts ? "Enabled" : "Missing",
            recommendation: hsts ? undefined : "Add HSTS header.",
            weight: 5,
            category: "security"
        });

        // 19. X-Content-Type-Options
        const xcto = responseHeaders.get("x-content-type-options");
        checks.push({
            name: "X-Content-Type-Options",
            status: xcto ? "pass" : "warn",
            value: xcto || "Missing",
            recommendation: xcto ? undefined : "Add 'nosniff' header.",
            weight: 4,
            category: "security"
        });

        // ========== ACCESSIBILITY CHECKS ==========

        // 20. Language Attribute
        const htmlLang = $("html").attr("lang");
        checks.push({
            name: "Language Attribute",
            status: htmlLang ? "pass" : "warn",
            value: htmlLang || "Missing",
            recommendation: htmlLang ? undefined : "Add lang attribute to <html>.",
            weight: 5,
            category: "accessibility"
        });

        // 21. Form Labels
        const inputs = $("input:not([type='hidden']):not([type='submit']):not([type='button'])");
        const inputsWithLabels = inputs.filter((_, el) => {
            const id = $(el).attr("id");
            if (id && $(`label[for="${id}"]`).length > 0) return true;
            if ($(el).closest("label").length > 0) return true;
            if ($(el).attr("aria-label")) return true;
            return false;
        });
        if (inputs.length === 0) {
            checks.push({ name: "Form Labels", status: "pass", value: "No forms", weight: 5, category: "accessibility" });
        } else {
            const percentage = Math.round((inputsWithLabels.length / inputs.length) * 100);
            checks.push({
                name: "Form Labels",
                status: percentage === 100 ? "pass" : "warn",
                value: `${inputsWithLabels.length}/${inputs.length} labeled`,
                recommendation: percentage < 100 ? "Add labels to all form inputs." : undefined,
                weight: 5,
                category: "accessibility"
            });
        }

        // 22. Skip Navigation Link
        const skipLink = $('a[href="#main"], a[href="#content"], a[href="#main-content"]');
        checks.push({
            name: "Skip Navigation Link",
            status: skipLink.length > 0 ? "pass" : "warn",
            value: skipLink.length > 0 ? "Present" : "Missing",
            recommendation: skipLink.length > 0 ? undefined : "Add skip-to-content link.",
            weight: 4,
            category: "accessibility"
        });

        // 23. Focus Indicators
        const styleContent = $("style").text();
        const hasFocusStyles = styleContent.includes(":focus") || $('link[rel="stylesheet"]').length > 0;
        checks.push({
            name: "Focus Indicators",
            status: hasFocusStyles ? "pass" : "warn",
            value: hasFocusStyles ? "Likely present" : "Not detected",
            recommendation: hasFocusStyles ? undefined : "Ensure :focus styles are visible.",
            weight: 4,
            category: "accessibility"
        });

        // ========== MOBILE USABILITY ==========

        // 24. Touch Target Size
        const smallButtons = $('button, a').filter((_, el) => {
            const classes = $(el).attr("class") || "";
            return classes.includes("text-xs") || classes.includes("text-sm");
        });
        const totalButtons = $("button, a[href]").length;
        checks.push({
            name: "Touch Target Size",
            status: smallButtons.length < totalButtons * 0.3 ? "pass" : "warn",
            value: `${totalButtons} interactive elements`,
            recommendation: smallButtons.length >= totalButtons * 0.3 ? "Ensure tap targets are at least 44x44px." : undefined,
            weight: 5,
            category: "mobile"
        });

        // 25. Font Legibility
        const hasBaseFont = styleContent.includes("font-size") || $('link[rel="stylesheet"]').length > 0;
        checks.push({
            name: "Font Legibility",
            status: hasBaseFont ? "pass" : "warn",
            value: hasBaseFont ? "Styles present" : "Check manually",
            recommendation: hasBaseFont ? undefined : "Ensure base font is 16px+.",
            weight: 4,
            category: "mobile"
        });

        // ========== PAGE SPEED (Optional) ==========
        let pageSpeedScore = null;
        if (includePageSpeed) {
            const pageSpeedApiKey = process.env.GOOGLE_WEBMASTER_MCP_API_KEY;

            if (!pageSpeedApiKey) {
                checks.push({
                    name: "Performance Score",
                    status: "warn",
                    value: "API key missing",
                    recommendation: "Set GOOGLE_WEBMASTER_MCP_API_KEY in .env",
                    weight: 12,
                    category: "speed"
                });
            } else if (targetUrl.hostname === "localhost" || targetUrl.hostname === "127.0.0.1") {
                checks.push({
                    name: "Performance Score",
                    status: "warn",
                    value: "N/A (localhost)",
                    recommendation: "Use ngrok to test PageSpeed on localhost.",
                    weight: 12,
                    category: "speed"
                });
            } else {
                try {
                    const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl.toString())}&key=${pageSpeedApiKey}&strategy=mobile&category=performance`;
                    const psResponse = await fetch(psUrl);

                    if (psResponse.ok) {
                        const psData = await psResponse.json();
                        const perfScore = psData.lighthouseResult?.categories?.performance?.score;
                        if (typeof perfScore === "number") {
                            pageSpeedScore = Math.round(perfScore * 100);
                            checks.push({
                                name: "Performance Score",
                                status: pageSpeedScore >= 90 ? "pass" : pageSpeedScore >= 50 ? "warn" : "fail",
                                value: `${pageSpeedScore}/100`,
                                recommendation: pageSpeedScore < 90 ? "Optimize images, reduce JS, enable caching." : undefined,
                                weight: 12,
                                category: "speed"
                            });
                        }
                    } else {
                        checks.push({
                            name: "Performance Score",
                            status: "warn",
                            value: "API error",
                            recommendation: "PageSpeed API returned an error.",
                            weight: 12,
                            category: "speed"
                        });
                    }
                } catch {
                    checks.push({
                        name: "Performance Score",
                        status: "warn",
                        value: "Could not fetch",
                        recommendation: "PageSpeed API unavailable.",
                        weight: 12,
                        category: "speed"
                    });
                }
            }
        }

        // ========== CALCULATE SCORE ==========
        const maxScore = checks.reduce((sum, c) => sum + c.weight, 0);
        const earnedScore = checks.reduce((sum, c) => {
            if (c.status === "pass") return sum + c.weight;
            if (c.status === "warn") return sum + c.weight * 0.5;
            return sum;
        }, 0);
        const score = Math.round((earnedScore / maxScore) * 100);

        // ========== AI RECOMMENDATIONS (Optional) ==========
        let aiRecommendations = null;
        if (includeAI) {
            try {
                const failingChecks = checks.filter(c => c.status !== "pass");
                const prompt = `You are an SEO expert. Analyze these failing audit checks and provide 3-5 prioritized, actionable recommendations:\n\n${JSON.stringify(failingChecks, null, 2)}\n\nBe specific and concise.`;

                const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "gemma3:4b",
                        prompt: prompt,
                        stream: false
                    })
                });

                if (ollamaResponse.ok) {
                    const ollamaData = await ollamaResponse.json();
                    aiRecommendations = ollamaData.response?.trim() || null;
                }
            } catch {
                // Ollama not available, skip AI
            }
        }

        const fetchTime = Date.now() - startTime;

        return {
            url: targetUrl.toString(),
            score,
            fetchTime,
            checks,
            summary: {
                total: checks.length,
                passed: checks.filter(c => c.status === "pass").length,
                warnings: checks.filter(c => c.status === "warn").length,
                failed: checks.filter(c => c.status === "fail").length
            },
            ...(pageSpeedScore !== null && { pageSpeedScore }),
            ...(aiRecommendations && { aiRecommendations })
        };

    } catch (error) {
        return {
            error: error instanceof Error ? error.message : "Unknown error",
            url: targetUrl.toString()
        };
    }
}

// --- Main ---
async function main() {
    const args = process.argv.slice(2);
    const includeAI = args.includes("--ai");
    const includePageSpeed = args.includes("--pagespeed");

    // Check for --file flag
    const fileIndex = args.indexOf("--file");
    const filePath = fileIndex !== -1 ? args[fileIndex + 1] : null;

    // Get URL argument (if not using file mode)
    const urlArg = args.find(arg => !arg.startsWith("--") && arg !== filePath);

    if (!urlArg && !filePath) {
        console.error(JSON.stringify({ error: "Usage: audit-cli.mjs <url> [--ai] [--pagespeed] OR audit-cli.mjs --file <urls.txt>" }));
        process.exit(1);
    }

    const options = { includeAI, includePageSpeed };

    if (filePath) {
        // Batch mode: read URLs from file
        try {
            const fileContent = readFileSync(filePath, "utf-8");
            const urls = fileContent
                .split("\n")
                .map(line => line.trim())
                .filter(line => line && !line.startsWith("#"));

            if (urls.length === 0) {
                console.error(JSON.stringify({ error: "No URLs found in file" }));
                process.exit(1);
            }

            // Audit all URLs
            const results = [];
            for (const url of urls) {
                const result = await auditUrl(url, options);
                results.push(result);
                // Small delay to avoid overwhelming servers
                await new Promise(r => setTimeout(r, 500));
            }

            console.log(JSON.stringify(results, null, 2));

        } catch (err) {
            console.error(JSON.stringify({ error: `Failed to read file: ${err.message}` }));
            process.exit(1);
        }
    } else {
        // Single URL mode
        const result = await auditUrl(urlArg, options);
        console.log(JSON.stringify(result, null, 2));

        if (result.error) {
            process.exit(1);
        }
    }
}

main();
