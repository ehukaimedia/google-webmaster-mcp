import { readFileSync } from "node:fs";

let cachedPackage;

export function getPackageInfo() {
    if (!cachedPackage) {
        cachedPackage = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    }
    return cachedPackage;
}

export function getPackageVersion() {
    return getPackageInfo().version || "0.0.0";
}

export function hasHelpFlag(args) {
    return args.includes("--help") || args.includes("-h");
}

export function hasVersionFlag(args) {
    return args.includes("--version") || args.includes("-v");
}

export function printVersion() {
    console.log(getPackageVersion());
}
