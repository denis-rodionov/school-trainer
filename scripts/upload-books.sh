#!/usr/bin/env bash
# Upload epub books from repo books/ to Firebase Storage books/ prefix.
# Requires: gsutil (Google Cloud SDK) and auth (gcloud auth login).
#
# Usage:
#   ./scripts/upload-books.sh
#   FIREBASE_STORAGE_BUCKET=my-project.firebasestorage.app ./scripts/upload-books.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUCKET="${FIREBASE_STORAGE_BUCKET:-school-trainer-70cb5.firebasestorage.app}"
SRC="${ROOT}/books"

if ! command -v gsutil >/dev/null 2>&1; then
  echo "gsutil not found. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

shopt -s nullglob
epubs=("${SRC}"/*.epub)
if [ ${#epubs[@]} -eq 0 ]; then
  echo "No .epub files in ${SRC}"
  exit 1
fi

for f in "${epubs[@]}"; do
  name="$(basename "$f")"
  echo "Uploading ${name} -> gs://${BUCKET}/books/${name}"
  gsutil cp "$f" "gs://${BUCKET}/books/${name}"
done

echo "Done. Books are at gs://${BUCKET}/books/"
