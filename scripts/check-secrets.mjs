#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const pathPatterns = [
    new RegExp("(^|/)client" + "_secret.*\\.json$", "i"),
    /(^|\/)token(?:_[A-Za-z0-9_-]+)?\.json$/i,
    /(^|\/)\.env$/i,
];

const contentPatterns = [
    { label: "Google OAuth client secret", pattern: new RegExp("GOC" + "SPX-[A-Za-z0-9_-]{20,}") },
    { label: "Google OAuth access token", pattern: /ya29\.[A-Za-z0-9_-]+/ },
    { label: "private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

function trackedFiles() {
    const output = execFileSync("git", ["ls-files", "-z"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    });
    return output.split("\0").filter(Boolean);
}

function main() {
    const failures = [];

    for (const file of trackedFiles()) {
        if (pathPatterns.some((pattern) => pattern.test(file))) {
            failures.push(`Tracked credential artifact: ${file}`);
            continue;
        }

        let content;
        try {
            content = readFileSync(file, "utf8");
        } catch {
            continue;
        }

        for (const { label, pattern } of contentPatterns) {
            if (pattern.test(content)) {
                failures.push(`Potential ${label} in tracked file: ${file}`);
            }
        }
    }

    if (failures.length > 0) {
        console.error(failures.join("\n"));
        process.exit(1);
    }

    console.log("Tracked-file secret scan OK.");
}

main();
