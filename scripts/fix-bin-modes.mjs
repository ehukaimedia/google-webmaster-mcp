#!/usr/bin/env node
import { chmodSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const missingTargets = [];

for (const binTarget of Object.values(manifest.bin || {})) {
    const relativeTarget = binTarget.replace(/^\.\//, "");
    const absoluteTarget = resolve(repoRoot, relativeTarget);

    if (!existsSync(absoluteTarget)) {
        missingTargets.push(relativeTarget);
        continue;
    }

    chmodSync(absoluteTarget, 0o755);
}

if (missingTargets.length > 0) {
    console.error(`Missing bin target(s): ${missingTargets.join(", ")}`);
    process.exit(1);
}
