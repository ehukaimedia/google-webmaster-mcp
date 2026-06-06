# Security Policy

## Supported Versions

Security fixes target the latest release line.

## Reporting a Vulnerability

Do not open a public issue for vulnerabilities or credential exposure.

Use GitHub private vulnerability reporting for this repository, or email security@ehukaimedia.com with:

- A concise description of the issue.
- Reproduction steps or proof of concept.
- Impact and affected versions, if known.

## Credential Handling

Do not commit:

- `.env` files
- `client_secret*.json`
- `token.json` or `token_*.json`
- API keys or OAuth refresh tokens

If a credential is exposed, rotate or revoke it before attempting git history cleanup.
