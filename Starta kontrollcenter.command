#!/bin/zsh
cd "/Users/torbjornzimmerman/Documents/Codex/2026-08-26/referenced-chatgpt-conversation-this-is-an/work/idv-kvitto-live" || exit 1
npm run control-center &
control_pid=$!
sleep 1
open "http://localhost:43920/control-center.html"
wait "$control_pid"
