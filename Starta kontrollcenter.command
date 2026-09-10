#!/bin/zsh
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR" || exit 1
npm run control-center &
control_pid=$!
sleep 1
open "http://localhost:43920/control-center.html"
wait "$control_pid"
