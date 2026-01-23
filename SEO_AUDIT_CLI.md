# SEO/GEO Audit CLI

A full 25-check technical audit tool for any URL (public or localhost).

---

## 🚀 Quick Start

```bash
# From Google-Webmaster-MCP repo
npm install -g .

# Run audit
seo-audit https://example.com
```

---

## 📋 Usage

### Standard Mode (Flags)
```bash
seo-audit <url> [--ai] [--pagespeed] [--file <urls.txt>]
```

| Flag | Description |
|------|-------------|
| `--ai` | Include AI recommendations (requires `ollama serve`) |
| `--pagespeed` | Include Google PageSpeed score (public URLs only) |
| `--file` | Batch mode: audit multiple URLs from a text file |

**Examples:**
```bash
seo-audit https://example.com
seo-audit http://localhost:3000 --ai
seo-audit https://client-site.com --pagespeed
seo-audit --file urls.txt --ai
```

### Smart Mode (Natural Language)
```bash
seo-audit-smart "audit localhost with AI"
seo-audit-smart "check example.com performance"
```

---

## ✅ Checks (25 Total)

| Category | Count | Details |
|----------|-------|---------|
| **SEO** | 10 | Title, Meta, H1, Alt Text, Viewport, Canonical, OG Tags, Robots, Internal Links, Content Length |
| **GEO** | 4 | Schema.org, FAQ Schema, Citation Signals, Content Clarity |
| **Security** | 5 | HTTPS, CSP, HSTS, X-Frame-Options, X-Content-Type |
| **Accessibility** | 4 | Language, Form Labels, Skip Nav, Focus Indicators |
| **Mobile** | 2 | Touch Targets, Font Legibility |
| **Speed** | 1 | PageSpeed Insights (optional) |

---

## 📤 Output

JSON to stdout:
```json
{
  "url": "https://example.com/",
  "score": 90,
  "fetchTime": 154,
  "checks": [...],
  "summary": { "total": 25, "passed": 19, "warnings": 6, "failed": 0 }
}
```

---

## 🔧 Requirements

- **Node.js** 20+
- **Ollama** (optional, for `--ai` flag): `ollama serve`
- **PageSpeed API Key** (optional, for `--pagespeed`): Set `GOOGLE_WEBMASTER_MCP_API_KEY` in `.env`
