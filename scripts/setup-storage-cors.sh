#!/usr/bin/env bash
# Apply storage.cors.json to the Firebase Storage bucket (required for browser downloads).
# Requires: gsutil (Google Cloud SDK) — gcloud auth login first.
#
# Usage: ./scripts/setup-storage-cors.sh
#   FIREBASE_STORAGE_BUCKET=my-project.firebasestorage.app ./scripts/setup-storage-cors.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUCKET="${FIREBASE_STORAGE_BUCKET:-school-trainer-70cb5.firebasestorage.app}"

if ! command -v gsutil >/dev/null 2>&1; then
  echo "gsutil not found. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
  echo "Then run: gcloud auth login"
  exit 1
fi

echo "Applying CORS from storage.cors.json to gs://${BUCKET}"
gsutil cors set "${ROOT}/storage.cors.json" "gs://${BUCKET}"
echo "Done. Verify with: gsutil cors get gs://${BUCKET}"
