#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null; then
  echo "Node.js is not installed. Get it from https://nodejs.org then run this again."
  open https://nodejs.org; read -p "Press Enter to close"; exit 1
fi
(sleep 3; open http://localhost:3000) &
node server.js
