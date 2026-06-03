#!/bin/sh
set -eu

PISTON_URL="${PISTON_URL:-http://piston:2000}"
PISTON_RUNTIMES="${PISTON_RUNTIMES:-node typescript python java gcc go}"

until node -e "fetch('${PISTON_URL}/api/v2/runtimes').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"; do
  echo "Waiting for Piston at ${PISTON_URL}..."
  sleep 2
done

for runtime in ${PISTON_RUNTIMES}; do
  echo "Installing Piston runtime: ${runtime}"
  node /opt/piston/cli/index.js -u "${PISTON_URL}" ppman install "${runtime}"
done

echo "Installed Piston runtimes:"
node -e "fetch('${PISTON_URL}/api/v2/runtimes').then(r => r.json()).then(r => { console.log(r.map(x => `${x.language}@${x.version}`).join('\n')); })"
