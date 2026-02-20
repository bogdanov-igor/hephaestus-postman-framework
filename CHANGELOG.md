# Changelog

---

## [3.0.0] — 2026-02-20 — Initial release

First public release of Hephaestus v3.

### Features
- Pipeline architecture: `orchestrator → ctx → modules`
- Config system: `hephaestus.defaults` (collection) + `override` (per-request)
- Auth plugin: `none`, `basic`, `bearer`, `headers`, `variables`
- Extract API: `ctx.api.get / find / count / save`
- Assertions: `keysToFind`, `varsToSave`, `keysToCount`
- Snapshot regression: `strict` / `non-strict`, `checkPaths`, `ignorePaths`, `autoSaveMissing`
- Schema validation via `tv4`
- Secret masking: keys and URL query params
- Structured logs: ASCII borders, response preview, CI mode (JSON)
- Auto-update engine from Git: `engine-update` (public + private repos via PAT)
- `urlBuilder`: auto-prepends `defaultProtocol`, warns on `http://`
- Postman collection template with system methods: `engine-update`, `defaults`, `snapshot-view`, `snapshot-clear`
- Full compatibility with Apidog
