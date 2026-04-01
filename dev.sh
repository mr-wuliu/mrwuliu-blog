#!/bin/bash
set -euo pipefail

# ── Config ──────────────────────────────────────────────
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$PROJECT_DIR/.wrangler"
PID_FILE="$PID_DIR/dev.pid"
PORT=8787
LOG_DIR="$PROJECT_DIR/.wrangler/logs"

# ── Helpers ─────────────────────────────────────────────
info()  { echo -e "\033[1;34m[dev]\033[0m $*"; }
ok()    { echo -e "\033[1;32m[ok]\033[0m $*"; }
warn()  { echo -e "\033[1;33m[warn]\033[0m $*"; }
die()   { echo -e "\033[1;31m[error]\033[0m $*" >&2; exit 1; }

is_running() {
  local pid_file="$1"
  [ -f "$pid_file" ] || return 1
  local pid
  pid=$(cat "$pid_file")
  kill -0 "$pid" 2>/dev/null
}

port_bound() {
  ss -tlnp 2>/dev/null | grep -q ":${1} "
}

wait_for_port() {
  local port=$1 timeout=${2:-30}
  local i=0
  while ! ss -tlnp 2>/dev/null | grep -q ":${port} " ; do
    ((i++)) || true
    if [ "$i" -ge "$timeout" ]; then
      return 1
    fi
    sleep 1
  done
  return 0
}

ensure_log_dir() {
  mkdir -p "$LOG_DIR"
}

# ── Commands ────────────────────────────────────────────

cmd_start() {
  ensure_log_dir

  # --- Ensure admin SPA is built ---
  if [ ! -f "$PROJECT_DIR/public/admin/index.html" ]; then
    info "Admin SPA not built, building now..."
    cd "$PROJECT_DIR/admin"
    npm install --silent
    npm run build
    cd "$PROJECT_DIR"
    ok "Admin SPA built."
  fi

  # --- Start single wrangler dev server ---
  if port_bound "$PORT"; then
    warn "Server already listening on :$PORT"
  else
    info "Starting dev server on :$PORT ..."
    setsid node "$PROJECT_DIR/node_modules/wrangler/bin/wrangler.js" dev \
      --ip 0.0.0.0 --port "$PORT" \
      > "$LOG_DIR/api.log" 2>&1 &
    echo $! > "$PID_FILE"

    if wait_for_port "$PORT" 30; then
      ok "Ready → http://localhost:$PORT (or http://192.168.50.108:$PORT)"
    else
      warn "Didn't bind port $PORT within 30s. Check $LOG_DIR/api.log"
    fi
  fi

  echo ""
  info "Routes:"
  echo "  Blog  → http://localhost:$PORT/"
  echo "  Admin → http://localhost:$PORT/admin"
  echo "  API   → http://localhost:$PORT/api/*"
  echo "  Logs  → $LOG_DIR/"
}

cmd_stop() {
  if is_running "$PID_FILE"; then
    local pid
    pid=$(cat "$PID_FILE")
    info "Stopping dev server (PID $pid)..."
    kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    rm -f "$PID_FILE"
    ok "Stopped."
  else
    # Fallback: kill any lingering wrangler process on the port
    local pids
    pids=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
    if [ -n "$pids" ]; then
      info "Killing orphaned process on :$PORT..."
      echo "$pids" | xargs kill 2>/dev/null || true
      ok "Stopped."
    else
      warn "Nothing running."
    fi
  fi
}

cmd_restart() {
  info "Restarting..."
  cmd_stop
  sleep 1
  cmd_start
}

cmd_migrate() {
  info "Running local D1 migrations..."
  npx wrangler d1 migrations apply blog-db --local
  ok "Migrations applied."
}

cmd_status() {
  echo ""
  info "Dev environment status:"
  echo ""

  if is_running "$PID_FILE" && port_bound "$PORT"; then
    local pid
    pid=$(cat "$PID_FILE")
    ok "Server running (PID $pid) → http://localhost:$PORT"
  elif port_bound "$PORT"; then
    warn "Port $PORT bound but PID stale"
  else
    warn "Stopped"
  fi

  echo ""
}

cmd_logs() {
  local log_file="$LOG_DIR/api.log"

  if [ ! -f "$log_file" ]; then
    die "No log file at $log_file. Is the service running?"
  fi

  info "Tailing logs (Ctrl+C to stop)..."
  tail -f "$log_file"
}

cmd_help() {
  echo ""
  echo "Usage: ./dev.sh <command>"
  echo ""
  echo "Commands:"
  echo "  start     Start dev server on :8787 (auto-build admin if needed)"
  echo "  stop      Stop dev server"
  echo "  restart   Stop then start"
  echo "  migrate   Apply D1 migrations locally"
  echo "  status    Show server status"
  echo "  logs      Tail server logs"
  echo "  help      Show this help"
  echo ""
}

# ── Main ────────────────────────────────────────────────
cd "$PROJECT_DIR"

case "${1:-help}" in
  start)    cmd_start ;;
  stop)     cmd_stop ;;
  restart)  cmd_restart ;;
  migrate)  cmd_migrate ;;
  status)   cmd_status ;;
  logs)     cmd_logs ;;
  help|--help|-h) cmd_help ;;
  *)        die "Unknown command: $1. Run './dev.sh help' for usage." ;;
esac
