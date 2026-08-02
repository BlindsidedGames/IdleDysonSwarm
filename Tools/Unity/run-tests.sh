#!/bin/zsh

# Project-scoped Unity Test Runner with safe licensing-client lifecycle handling.
#
# This wrapper deliberately:
# - never touches Unity Hub's generic licensing client or any license artifact;
# - terminates only the exact Unity 6000.5.5 editor-specific client after proving
#   that no 6000.5.5 editor remains alive and the client did not exit naturally;
# - omits -quit because Unity Test Runner owns batch shutdown and -quit can exit
#   before test execution/result publication;
# - verifies that Unity produced a passing NUnit result file;
# - retries once only when the first attempt failed during licensing startup.

set -uo pipefail

readonly SCRIPT_DIR="${0:A:h}"
readonly PROJECT_ROOT="${SCRIPT_DIR:h:h}"
readonly UNITY_VERSION="6000.5.5f1"
readonly UNITY_STREAM="6000.5.5"
readonly UNITY_EDITOR_DEFAULT="/Applications/Unity/Hub/Editor/${UNITY_VERSION}/Unity.app/Contents/MacOS/Unity"
readonly UNITY_EDITOR="${UNITY_EDITOR_PATH:-$UNITY_EDITOR_DEFAULT}"
readonly UNITY_APP="${UNITY_EDITOR%/Contents/MacOS/Unity}"
readonly LICENSING_CLIENT="${UNITY_APP}/Contents/Helpers/UnityLicensingClient.app/Contents/MacOS/Unity.Licensing.Client"
readonly VERSION_PIPE="Unity-LicenseClient-${USER}-${UNITY_STREAM}"

TEST_PLATFORM="EditMode"
TEST_FILTER=""
RESULTS_PATH="/tmp/idle-dyson-editmode-results.xml"
LOG_PATH="/tmp/idle-dyson-editmode.log"
UNITY_PID=""
SIGNAL_RECEIVED=""

usage() {
  print "Usage: Tools/Unity/run-tests.sh [--platform EditMode|PlayMode] [--filter TEST_FILTER]"
  print "          [--results PATH] [--log PATH]"
}

fail() {
  print -u2 "Unity test preflight failed: $1"
  exit "${2:-1}"
}

while (( $# > 0 )); do
  case "$1" in
    --platform)
      (( $# >= 2 )) || fail "--platform requires a value."
      TEST_PLATFORM="$2"
      shift 2
      ;;
    --filter)
      (( $# >= 2 )) || fail "--filter requires a value."
      TEST_FILTER="$2"
      shift 2
      ;;
    --results)
      (( $# >= 2 )) || fail "--results requires a value."
      RESULTS_PATH="$2"
      shift 2
      ;;
    --log)
      (( $# >= 2 )) || fail "--log requires a value."
      LOG_PATH="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

[[ "$TEST_PLATFORM" == "EditMode" || "$TEST_PLATFORM" == "PlayMode" ]] ||
  fail "Unsupported test platform '$TEST_PLATFORM'."
[[ -x "$UNITY_EDITOR" ]] ||
  fail "Unity ${UNITY_VERSION} was not found at '$UNITY_EDITOR'."
[[ -x "$LICENSING_CLIENT" ]] ||
  fail "Bundled Unity ${UNITY_VERSION} licensing client was not found."

editor_processes() {
  ps -axo pid=,ppid=,command= |
    awk -v editor="$UNITY_EDITOR" '
      index($0, editor) {
        line = $0
        sub(/^[[:space:]]*[0-9]+[[:space:]]+[0-9]+[[:space:]]+/, "", line)
        if (index(line, editor) == 1) print $1
      }'
}

project_editor_processes() {
  ps -axo pid=,ppid=,command= |
    awk -v editor="$UNITY_EDITOR" -v project="$PROJECT_ROOT" '
      index($0, editor) && index(tolower($0), "-projectpath") && index($0, project) {
        line = $0
        sub(/^[[:space:]]*[0-9]+[[:space:]]+[0-9]+[[:space:]]+/, "", line)
        if (index(line, editor) == 1) print $1
      }'
}

version_client_processes() {
  ps -axo pid=,ppid=,command= |
    awk -v client="$LICENSING_CLIENT" -v pipe="$VERSION_PIPE" '
      {
        pid = $1
        ppid = $2
        line = $0
        sub(/^[[:space:]]*[0-9]+[[:space:]]+[0-9]+[[:space:]]+/, "", line)
        expected = client " --namedPipe " pipe
        if (line == expected) print pid " " ppid
      }'
}

wait_for_process_exit() {
  local pid="$1"
  local attempts="${2:-20}"
  local index
  for (( index = 0; index < attempts; index++ )); do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.25
  done
  return 1
}

cleanup_verified_orphan() {
  local editor_pids
  editor_pids="$(editor_processes)"
  [[ -z "$editor_pids" ]] || return 0

  local client_pid client_ppid
  while read -r client_pid client_ppid; do
    [[ -n "$client_pid" ]] || continue

    # The helper normally has a short exit timer after the editor disconnects.
    # Give that timer a chance to release the mutex without intervention.
    if wait_for_process_exit "$client_pid" 20; then
      continue
    fi

    # Re-prove the safety conditions immediately before signalling:
    # exact bundled client/pipe, no editor using this stream, and no live parent.
    [[ -z "$(editor_processes)" ]] || continue
    local current
    current="$(version_client_processes | awk -v pid="$client_pid" '$1 == pid { print $1 " " $2 }')"
    [[ -n "$current" ]] || continue
    client_ppid="${current#* }"
    if [[ "$client_ppid" != "1" ]] && kill -0 "$client_ppid" 2>/dev/null; then
      continue
    fi

    print "Terminating verified orphaned Unity ${UNITY_STREAM} licensing client PID ${client_pid}."
    kill -TERM "$client_pid" 2>/dev/null || true
    wait_for_process_exit "$client_pid" 20 ||
      fail "Verified orphan PID ${client_pid} did not exit after SIGTERM; refusing broader cleanup."
  done <<< "$(version_client_processes)"
}

terminate_owned_unity() {
  [[ -n "$UNITY_PID" ]] || return 0
  kill -0 "$UNITY_PID" 2>/dev/null || return 0
  kill -TERM "$UNITY_PID" 2>/dev/null || true
  wait_for_process_exit "$UNITY_PID" 40 || true
}

on_signal() {
  SIGNAL_RECEIVED="$1"
  trap - EXIT INT TERM
  terminate_owned_unity
  cleanup_verified_orphan || true
  exit 130
}

on_exit() {
  local exit_status="$?"
  trap - EXIT
  terminate_owned_unity
  cleanup_verified_orphan || true
  return "$exit_status"
}

trap 'on_signal INT' INT
trap 'on_signal TERM' TERM
trap 'on_exit' EXIT

run_attempt() {
  local attempt="$1"
  local attempt_log="$LOG_PATH"
  local attempt_results="$RESULTS_PATH"
  if (( attempt > 1 )); then
    attempt_log="${LOG_PATH}.retry"
    attempt_results="${RESULTS_PATH}.retry"
  fi

  rm -f "$attempt_log" "$attempt_results"

  local -a command
  command=(
    "$UNITY_EDITOR"
    -batchmode
    -nographics
    -projectPath "$PROJECT_ROOT"
    -runTests
    -testPlatform "$TEST_PLATFORM"
  )
  [[ -z "$TEST_FILTER" ]] || command+=( -testFilter "$TEST_FILTER" )
  command+=( -testResults "$attempt_results" -logFile "$attempt_log" )

  print "Running Unity ${UNITY_VERSION} ${TEST_PLATFORM} tests (attempt ${attempt})..."
  "${command[@]}" &
  UNITY_PID="$!"
  wait "$UNITY_PID"
  local unity_status="$?"
  UNITY_PID=""

  if (( unity_status == 0 )) &&
     [[ -s "$attempt_results" ]] &&
     grep -q '<test-run[^>]*result="Passed"' "$attempt_results"; then
    if (( attempt > 1 )); then
      cp "$attempt_log" "$LOG_PATH"
      cp "$attempt_results" "$RESULTS_PATH"
    fi
    print "Unity tests passed. Results: $RESULTS_PATH"
    return 0
  fi

  print -u2 "Unity test attempt ${attempt} failed or did not publish passing results."
  return 1
}

project_pids="$(project_editor_processes)"
[[ -z "$project_pids" ]] ||
  fail "Idle Dyson Swarm is already open in Unity (PID(s): ${project_pids//$'\n'/, }). Close it before headless tests." 73

cleanup_verified_orphan

if run_attempt 1; then
  exit 0
fi

if [[ -f "$LOG_PATH" ]] &&
   grep -Eq "Licensing initialization failed|Failed to acquire global mutex ${VERSION_PIPE}|Another instance of Unity.Licensing.Client is already running|Timed-out.*Licensing" "$LOG_PATH"; then
  print "Licensing startup failed; performing one verified-orphan cleanup and retry."
  cleanup_verified_orphan
  run_attempt 2
  exit "$?"
fi

exit 1
