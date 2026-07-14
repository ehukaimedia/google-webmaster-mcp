#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import { existsSync, lstatSync, mkdtempSync, rmSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

const cleanEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith("npm_"))
);

function run(command, args, options = {}) {
    execFileSync(command, args, {
        cwd: root,
        stdio: options.stdio || "pipe",
        encoding: "utf8",
        timeout: options.timeout || 30_000,
        env: cleanEnv,
    });
}

function binPath(prefix, name) {
    return join(prefix, "bin", process.platform === "win32" ? `${name}.cmd` : name);
}

function assertBin(prefix, name) {
    const candidate = binPath(prefix, name);
    if (!existsSync(candidate)) {
        throw new Error(`Missing installed bin: ${name}`);
    }

    const stat = lstatSync(candidate);
    if (!stat.isFile() && !stat.isSymbolicLink()) {
        throw new Error(`Installed bin is not executable file or symlink: ${name}`);
    }

    return candidate;
}

function runBin(prefix, name, args) {
    execFileSync(assertBin(prefix, name), args, {
        cwd: root,
        stdio: "pipe",
        encoding: "utf8",
        timeout: 5_000,
        env: cleanEnv,
    });
}

function assertMcpServerStarts(prefix) {
    return new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(assertBin(prefix, "google-webmaster-mcp"), [], {
            cwd: root,
            stdio: ["pipe", "pipe", "pipe"],
            env: cleanEnv,
        });

        let stderr = "";
        let settled = false;

        const timeout = setTimeout(() => {
            if (!settled) {
                settled = true;
                child.kill("SIGTERM");
                rejectPromise(new Error("MCP server did not report stdio startup before timeout"));
            }
        }, 5_000);

        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
            if (!settled && stderr.includes("Google Webmaster MCP server running on stdio")) {
                settled = true;
                clearTimeout(timeout);
                child.kill("SIGTERM");
                resolvePromise();
            }
        });

        child.on("exit", (code, signal) => {
            if (!settled && signal !== "SIGTERM") {
                settled = true;
                clearTimeout(timeout);
                rejectPromise(new Error(`MCP server exited before startup signal (code ${code})`));
            }
        });

        child.on("error", (error) => {
            if (!settled) {
                settled = true;
                clearTimeout(timeout);
                rejectPromise(error);
            }
        });
    });
}

async function main() {
    const workspace = mkdtempSync(join(tmpdir(), "google-webmaster-mcp-smoke-"));
    let tarball;

    try {
        const packOutput = execFileSync("npm", ["pack", "--json", "--ignore-scripts"], {
            cwd: root,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 30_000,
            env: cleanEnv,
        });
        const [packInfo] = JSON.parse(packOutput);
        tarball = resolve(root, packInfo.filename);

        run("npm", ["install", "--global", "--prefix", workspace, tarball], { timeout: 120_000 });

        for (const binName of Object.keys(manifest.bin || {})) {
            assertBin(workspace, binName);
        }

        runBin(workspace, "google-webmaster-mcp", ["--version"]);
        runBin(workspace, "google-webmaster-mcp-auth", ["--help"]);
        runBin(workspace, "google-webmaster-mcp-auth", ["--version"]);
        runBin(workspace, "seo-audit", ["--help"]);
        runBin(workspace, "seo-audit", ["--version"]);
        runBin(workspace, "seo-audit-smart", ["--help"]);
        runBin(workspace, "seo-audit-smart", ["--version"]);
        await assertMcpServerStarts(workspace);

        console.log("Tarball smoke OK.");
    } finally {
        if (tarball && existsSync(tarball)) {
            unlinkSync(tarball);
        }
        rmSync(workspace, { recursive: true, force: true });
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
