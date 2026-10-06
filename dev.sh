#!/bin/bash
set -euo pipefail

# ── Config ──────────────────────────────────────────────
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$PROJECT_DIR/.wrangler"
PID_FILE="$PID_DIR/dev.pid"
PORT=8787
LOG_DIR="$PROJECT_DIR/.wrangler/logs"

LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
if [ -n "$LAN_IP" ]; then
  export no_proxy="${no_proxy:+$no_proxy,}$LAN_IP"
  export NO_PROXY="${NO_PROXY:+$NO_PROXY,}$LAN_IP"
fi

# ── Helpers ─────────────────────────────────────────────
info()  { echo -e "\033[1;34m[dev]\033[0m $*"; }
ok()    { echo -e "\033[1;32m[ok]\033[0m $*"; }
warn()  { echo -e "\033[1;33m[warn]\033[0m $*"; }
die()   { echo -e "\033[1;31m[error]\033[0m $*" >&2; exit 1; }

process_stamp() {
  [ -r "/proc/$1/stat" ] || return 1
  awk '{print $22}' "/proc/$1/stat"
}

is_running() {
  [ -f "$PID_FILE" ] || return 1
  local pid saved_stamp current_stamp command
  read -r pid saved_stamp < "$PID_FILE" || return 1
  [[ "$pid" =~ ^[0-9]+$ ]] && [ "$pid" -gt 1 ] || return 1
  kill -0 "$pid" 2>/dev/null || return 1
  current_stamp=$(process_stamp "$pid") || return 1
  [ -z "${saved_stamp:-}" ] || [ "$saved_stamp" = "$current_stamp" ] || return 1
  command=$(tr '\0' ' ' < "/proc/$pid/cmdline") || return 1
  [[ "$command" == *"$PROJECT_DIR/node_modules/wrangler/bin/wrangler.js dev"* ]] || return 1
  [ "$(readlink "/proc/$pid/cwd")" = "$PROJECT_DIR" ]
}

port_bound() {
  ss -tln 2>/dev/null | awk -v port=":$1" 'substr($4, length($4)-length(port)+1) == port { found=1 } END {exit !found}'
}

wait_for_port() {
  local timeout=${2:-30} i
  for ((i=0; i<timeout; i++)); do
    is_running || return 1
    if curl --noproxy '*' --silent --fail --max-time 1 "http://127.0.0.1:$1/api/health" >/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

ensure_log_dir() {
  mkdir -p "$LOG_DIR"
}

# ── Commands ────────────────────────────────────────────

cmd_start() {
  ensure_log_dir

  # --- Ensure git hooks are installed ---
  if [ -d "$PROJECT_DIR/hooks" ]; then
    if ! git config core.hooksPath "$PROJECT_DIR/hooks" 2>/dev/null; then
      warn "Could not configure git hooks (repository metadata may be read-only)."
    fi
  fi

  # --- Ensure admin SPA is built ---
  if [ ! -f "$PROJECT_DIR/public/admin/index.html" ]; then
    info "Admin SPA not built, building now..."
    cd "$PROJECT_DIR/admin"
    if [ ! -d node_modules ]; then npm ci; fi
    npm run build
    cd "$PROJECT_DIR"
    ok "Admin SPA built."
  fi

  # --- Start single wrangler dev server ---
  if is_running; then
    ok "Server already running on :$PORT"
  elif port_bound "$PORT"; then
    die "Port $PORT belongs to an untracked process. Nothing was changed."
  else
    info "Starting dev server on :$PORT ..."
    setsid node "$PROJECT_DIR/node_modules/wrangler/bin/wrangler.js" dev \
      --ip 0.0.0.0 --port "$PORT" --test-scheduled \
      > "$LOG_DIR/api.log" 2>&1 &
    local pid=$! stamp
    stamp=$(process_stamp "$pid") || die "Dev server exited during startup."
    printf '%s %s\n' "$pid" "$stamp" > "$PID_FILE"

    if wait_for_port "$PORT" 30; then
      ok "Ready → http://localhost:$PORT"
    else
      cmd_stop
      die "Startup failed. Check $LOG_DIR/api.log"
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
  if is_running; then
    local pid stamp i
    read -r pid stamp < "$PID_FILE"
    info "Stopping dev server (PID $pid)..."
    kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    for ((i=0; i<10; i++)); do
      is_running || break
      sleep 1
    done
    if is_running; then
      kill -KILL -- -"$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
    ok "Stopped."
  else
    rm -f "$PID_FILE"
    warn "No tracked dev server is running. Other processes were left untouched."
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
  npm run db:migrate:local
  ok "Migrations applied."
}

cmd_status() {
  echo ""
  info "Dev environment status:"
  echo ""

  if is_running && port_bound "$PORT"; then
    local pid stamp
    read -r pid stamp < "$PID_FILE"
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
