# Contributing

Thanks for helping improve Google Webmaster MCP.

## Setup

```bash
git clone https://github.com/ehukaimedia/google-webmaster-mcp.git
cd google-webmaster-mcp
npm ci
npm run build
npm test
```

## Required Checks

Run the release gate before opening a PR:

```bash
npm run ci
```

For smaller local loops:

```bash
npm run build
npm test
npm run audit:deps
npm run secrets:check
npm run pack:check
```

## Security Rules

- Never commit `.env`, OAuth client-secret JSON files, token files, or API keys.
- Use placeholders in examples.
- Run `npm run secrets:check` before pushing.

## Pull Requests

Keep PRs focused. Include:

- What changed.
- Why it changed.
- Verification commands and results.
- Any known limitations or follow-up work.

Architecture/spec changes belong in `docs/specs/`, `docs/plans/`, and `docs/playgrounds/` according to the project workflow.
