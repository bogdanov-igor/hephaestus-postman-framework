# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 3.8.x | ✅ |
| 3.7.x | ⚠️ Critical fixes only |
| < 3.7 | ❌ |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub Issues.**

Send a report to: **bogdanov.ig.alex@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Affected version (`hephaestus.version` in your collection)
- Potential impact

You will receive a response within **5 business days**. If the issue is confirmed, a patch will be released as a priority.

## Security Considerations

### Secret masking

Hephaestus masks sensitive values in logs. Keys matching words in `secrets` config are replaced with `first20%***MASKED***last20%`. However:

- Masking applies **only to log output** — actual `pm.variables`/`pm.environment` values are never altered
- Short values (<6 chars) are masked as `***`
- The `secrets` list is customizable — review and extend it for your environment

### `eval()` usage

The engine is loaded into `collectionVariables` as a string and executed via `eval()`. This is intentional and required by the Postman sandbox architecture.

**Integrity & distribution (v3.8+):**

- The shipped template collection is **self-contained** — the engine is embedded at build time (`npm run build:emit`), so a fresh import runs **offline** with no network fetch. `🔧 engine-update` is only needed to *upgrade* the engine.
- When `🔧 engine-update` does fetch from GitHub, the downloaded code is verified against `engine/checksums.json` (**SHA-256**, computed in-sandbox via `CryptoJS`). A hash mismatch aborts the update and the code is **not** stored. This guards against corrupted/truncated downloads and casual tampering. Note: it is *not* a defense against an attacker who fully controls the source repository — release signing is planned.

**Recommendations:**
- Only load the engine from the **official repository** (`bogdanov-igor/hephaestus-postman-framework`)
- If using a private fork, protect `hephaestus.githubToken` — store it in Postman Environment (not Collection Variables) to limit exposure
- Do not paste untrusted code into `hephaestus.v3.pre` / `hephaestus.v3.post` variables directly

### Plugin system

Plugins loaded via `hephaestus.plugins` are also executed via `eval()` with full access to `ctx` and `pm`. Only load plugins from trusted sources.

### GitHub PAT

If using a private repository, `hephaestus.githubToken` should:
- Be a **fine-grained PAT** with `Contents: Read-only` permission only
- Be stored in **Postman Environment** (not Collection Variables) to avoid sync to shared workspaces
- Be rotated regularly
