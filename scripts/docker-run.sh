#!/usr/bin/env bash
# Hephaestus — Docker Newman Runner  v3.6.0
#
# Запускает Newman в Docker, генерирует HTML и JUnit отчёты.
#
# Usage:
#   bash scripts/docker-run.sh \
#     -c collection.json \
#     -e environment.prod.json \
#     [-o output/]
#
# Options:
#   -c <file>   Postman collection JSON (required)
#   -e <file>   Postman environment JSON (optional)
#   -o <dir>    Output directory for reports (default: .)
#   -t          Run npm test after Newman
#   --no-build  Skip docker build step

set -euo pipefail

COLLECTION=""
ENVIRONMENT=""
OUTPUT_DIR="."
RUN_TEST=false
NO_BUILD=false
IMAGE="hephaestus-runner:3.6.0"

# ─── Parse args ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        -c) COLLECTION="$2"; shift 2 ;;
        -e) ENVIRONMENT="$2"; shift 2 ;;
        -o) OUTPUT_DIR="$2"; shift 2 ;;
        -t) RUN_TEST=true; shift ;;
        --no-build) NO_BUILD=true; shift ;;
        *) echo "Unknown arg: $1"; exit 1 ;;
    esac
done

if [[ -z "$COLLECTION" ]]; then
    echo "❌ Usage: $0 -c <collection.json> [-e <environment.json>] [-o <output_dir>]"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

RESULTS_JSON="$OUTPUT_DIR/results.json"
REPORT_HTML="$OUTPUT_DIR/hephaestus-report.html"
JUNIT_XML="$OUTPUT_DIR/junit-report.xml"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🔥 Hephaestus Docker Runner  v3.6.0                       ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Collection:  $COLLECTION"
echo "║  Environment: ${ENVIRONMENT:-(none)}"
echo "║  Output dir:  $OUTPUT_DIR"
echo "╚══════════════════════════════════════════════════════════════╝"

# ─── Build image ──────────────────────────────────────────────────────────────
if [[ "$NO_BUILD" == false ]]; then
    echo ""
    echo "🔨 Building Docker image..."
    docker build -t "$IMAGE" . -q
    echo "✅ Image ready: $IMAGE"
fi

# ─── Build Newman command ─────────────────────────────────────────────────────
NEWMAN_CMD=(
    docker run --rm
    -v "$(pwd):/data"
    "$IMAGE"
    run "/data/$COLLECTION"
    --reporter-json-export "/data/$RESULTS_JSON"
    -r json
)

if [[ -n "$ENVIRONMENT" ]]; then
    NEWMAN_CMD+=(-e "/data/$ENVIRONMENT")
fi

# ─── Run Newman ───────────────────────────────────────────────────────────────
echo ""
echo "🚀 Running Newman..."
"${NEWMAN_CMD[@]}" || true   # don't exit on test failures — still generate reports

echo ""
echo "📊 Generating HTML report → $REPORT_HTML"
node scripts/generate-report.js "$RESULTS_JSON" "$REPORT_HTML" || true

echo "📋 Generating JUnit XML  → $JUNIT_XML"
node scripts/ci-to-junit.js "$RESULTS_JSON" "$JUNIT_XML" || true

# ─── Optional npm test ────────────────────────────────────────────────────────
if [[ "$RUN_TEST" == true ]]; then
    echo ""
    echo "🔬 Running tool suite tests..."
    node scripts/test.js
fi

echo ""
echo "✅ Done. Reports:"
echo "   HTML:  $REPORT_HTML"
echo "   JUnit: $JUNIT_XML"
echo "   JSON:  $RESULTS_JSON"
