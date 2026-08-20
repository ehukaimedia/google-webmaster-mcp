#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")/.."
exec "/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node" dist/index.js "$@"
