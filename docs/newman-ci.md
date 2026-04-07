# Newman + CI Integration Guide

Run Hephaestus collections from the CLI and integrate with any CI/CD system.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Basic Newman Run](#basic-newman-run)
- [Environment File](#environment-file)
- [CI Mode Output](#ci-mode-output)
- [Parsing CI JSON](#parsing-ci-json)
- [HTML Reports](#html-reports)
- [GitHub Actions](#github-actions)
- [GitLab CI](#gitlab-ci)
- [Jenkins](#jenkins)
- [Tips & Troubleshooting](#tips--troubleshooting)

---

## Prerequisites

```bash
# Install Newman globally
npm install -g newman

# Optional: HTML reporter
npm install -g newman-reporter-htmlextra
```

Verify:
```bash
newman --version
```

---

## Basic Newman Run

```bash
newman run collection/hephaestus-template.postman_collection.json \
  --environment your-environment.json \
  --reporters cli,json \
  --reporter-json-export results/report.json
```

### Key flags

| Flag | Description |
|---|---|
| `--environment` | Path to exported Postman environment JSON |
| `--globals` | Path to exported Postman globals JSON |
| `--reporters` | Output formats: `cli`, `json`, `junit`, `htmlextra` |
| `--reporter-json-export` | Save JSON results to file |
| `--reporter-junit-export` | Save JUnit XML (for CI test dashboards) |
| `--bail` | Stop on first failure |
| `--timeout-request` | Per-request timeout in ms (default: none) |
| `--delay-request` | Delay between requests in ms |
| `--folder` | Run only a specific folder |
| `--iteration-count` | Number of iterations (for data-driven runs) |

---

## Environment File

Export your Postman environment via **Postman → Environments → Export**, or create one manually:

```json
{
  "name": "Production",
  "values": [
    { "key": "login.technical.main",   "value": "tech_user",     "enabled": true },
    { "key": "password.technical.main","value": "secret123",     "enabled": true },
    { "key": "channel.technical.main", "value": "WEB",           "enabled": true }
  ]
}
```

> **Security:** Never commit files with real credentials. Use CI secrets instead (see [GitHub Actions](#github-actions)).

---

## CI Mode Output

Enable CI mode in `hephaestus.defaults` before running Newman:

```json
{
  "baseUrl": "https://your-api.example.com",
  "ci": true
}
```

With `ci: true`, each request appends a structured JSON line to the console:

```
[HEPHAESTUS_CI] {"v":"3.2.0","request":"Получение токена","method":"GET","status":200,"time":142,"size":1024,"format":"xml","found":[],"saved":["prod.token"],"counts":[],"headers":[{"name":"Content-Type","ok":true}],"snapshot":null,"schema":null,"errors":[]}
```

---

## Parsing CI JSON

Extract and aggregate CI output from Newman's console dump:

```bash
# Run Newman and capture output
newman run collection/hephaestus-template.postman_collection.json \
  --environment env.json \
  --reporters cli 2>&1 | tee newman-output.txt

# Extract all Hephaestus CI lines
grep '\[HEPHAESTUS_CI\]' newman-output.txt | \
  sed 's/\[HEPHAESTUS_CI\] //' | \
  jq -s '.' > hephaestus-results.json
```

### Node.js parser example

```javascript
const fs   = require('fs');
const lines = fs.readFileSync('newman-output.txt', 'utf8').split('\n');

const results = lines
  .filter(l => l.includes('[HEPHAESTUS_CI]'))
  .map(l => JSON.parse(l.replace('[HEPHAESTUS_CI] ', '')));

const summary = {
  total:   results.length,
  passed:  results.filter(r => r.errors.length === 0).length,
  failed:  results.filter(r => r.errors.length > 0).length,
  slowest: results.sort((a, b) => b.time - a.time).slice(0, 3).map(r => `${r.request}: ${r.time}ms`)
};

console.log(JSON.stringify(summary, null, 2));
```

---

## HTML Reports

Using [newman-reporter-htmlextra](https://github.com/DannyDainton/newman-reporter-htmlextra):

```bash
newman run collection/hephaestus-template.postman_collection.json \
  --environment env.json \
  --reporters htmlextra \
  --reporter-htmlextra-export results/report.html \
  --reporter-htmlextra-title "Hephaestus — API Test Report" \
  --reporter-htmlextra-logs \
  --reporter-htmlextra-showOnlyFails
```

Open `results/report.html` in a browser — includes test results, response times, and console logs.

---

## GitHub Actions

### Basic collection run

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on:
  schedule:
    - cron: '0 6 * * *'   # Daily at 06:00 UTC
  workflow_dispatch:        # Manual trigger

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Newman
        run: npm install -g newman newman-reporter-htmlextra

      - name: Create environment file
        run: |
          cat > env.json << 'EOF'
          {
            "name": "CI",
            "values": [
              { "key": "login.technical.main",    "value": "${{ secrets.API_LOGIN }}",    "enabled": true },
              { "key": "password.technical.main", "value": "${{ secrets.API_PASSWORD }}", "enabled": true },
              { "key": "channel.technical.main",  "value": "API",                         "enabled": true }
            ]
          }
          EOF

      - name: Run Hephaestus collection
        run: |
          newman run collection/hephaestus-template.postman_collection.json \
            --environment env.json \
            --reporters cli,htmlextra,junit \
            --reporter-htmlextra-export results/report.html \
            --reporter-htmlextra-title "Hephaestus API Tests — ${{ github.run_number }}" \
            --reporter-htmlextra-logs \
            --reporter-junit-export results/junit.xml

      - name: Upload HTML report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: api-test-report-${{ github.run_number }}
          path: results/report.html

      - name: Upload JUnit results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: junit-results-${{ github.run_number }}
          path: results/junit.xml

      - name: Publish test results
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: 'API Test Results'
          path: results/junit.xml
          reporter: java-junit
```

### With Hephaestus CI JSON parsing

```yaml
      - name: Run with CI mode
        run: |
          newman run collection/hephaestus-template.postman_collection.json \
            --environment env.json \
            --reporters cli 2>&1 | tee newman-output.txt

      - name: Parse Hephaestus CI output
        if: always()
        run: |
          node - << 'EOF'
          const fs = require('fs');
          const lines = fs.readFileSync('newman-output.txt', 'utf8').split('\n');
          const results = lines
            .filter(l => l.includes('[HEPHAESTUS_CI]'))
            .map(l => {
              try { return JSON.parse(l.replace('[HEPHAESTUS_CI] ', '')); } catch(e) { return null; }
            }).filter(Boolean);

          const failed = results.filter(r => r.errors.length > 0);
          console.log(`Total: ${results.length}, Failed: ${failed.length}`);
          if (failed.length > 0) {
            failed.forEach(r => console.log(`  ❌ ${r.request}: ${r.errors.join(', ')}`));
            process.exit(1);
          }
          EOF
```

---

## GitLab CI

```yaml
# .gitlab-ci.yml
api-tests:
  image: node:20-slim
  stage: test
  
  before_script:
    - npm install -g newman newman-reporter-htmlextra
  
  script:
    - |
      cat > env.json << EOF
      {
        "name": "CI",
        "values": [
          { "key": "login.technical.main",    "value": "${API_LOGIN}",    "enabled": true },
          { "key": "password.technical.main", "value": "${API_PASSWORD}", "enabled": true }
        ]
      }
      EOF
    - |
      newman run collection/hephaestus-template.postman_collection.json \
        --environment env.json \
        --reporters cli,junit,htmlextra \
        --reporter-junit-export results/junit.xml \
        --reporter-htmlextra-export results/report.html
  
  artifacts:
    when: always
    reports:
      junit: results/junit.xml
    paths:
      - results/report.html
    expire_in: 7 days
  
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
    - if: $CI_PIPELINE_SOURCE == "web"
```

---

## Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        API_LOGIN    = credentials('api-login')
        API_PASSWORD = credentials('api-password')
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm install -g newman newman-reporter-htmlextra'
            }
        }

        stage('Create Environment') {
            steps {
                writeFile file: 'env.json', text: """
                {
                  "name": "CI",
                  "values": [
                    { "key": "login.technical.main",    "value": "${env.API_LOGIN}",    "enabled": true },
                    { "key": "password.technical.main", "value": "${env.API_PASSWORD}", "enabled": true }
                  ]
                }
                """
            }
        }

        stage('API Tests') {
            steps {
                sh '''
                    newman run collection/hephaestus-template.postman_collection.json \\
                      --environment env.json \\
                      --reporters cli,junit,htmlextra \\
                      --reporter-junit-export results/junit.xml \\
                      --reporter-htmlextra-export results/report.html
                '''
            }
            post {
                always {
                    junit 'results/junit.xml'
                    publishHTML(target: [
                        reportDir:   'results',
                        reportFiles: 'report.html',
                        reportName:  'Hephaestus API Report'
                    ])
                }
            }
        }
    }
}
```

---

## Tips & Troubleshooting

### Engine not loaded in Newman

Newman runs the collection without `engine-update`. The engine must already be saved in `hephaestus.v3.pre` / `hephaestus.v3.post` collection variables **before** exporting the collection.

**Workflow:**
1. Run `🔧 engine-update` in Postman Desktop
2. Export the collection (File → Export)
3. Use the exported JSON with Newman

### Globals file for engine variables

Alternatively, use a globals file with pre-populated engine code:

```bash
newman run collection.json \
  --environment env.json \
  --globals globals-with-engine.json
```

### `eval()` not working in Newman

Newman supports `eval()` — this is expected behavior in Postman sandbox emulation. If scripts fail:
- Check Newman version: `newman --version` (use latest)
- Make sure `hephaestus.v3.pre` / `hephaestus.v3.post` contain the actual engine code (not the placeholder)

### Timeout issues

For slow APIs, increase timeouts:

```bash
newman run collection.json \
  --environment env.json \
  --timeout-request 30000 \
  --timeout-script 30000
```

### Run a single folder

```bash
newman run collection.json \
  --environment env.json \
  --folder "📁 Авторизация"
```
