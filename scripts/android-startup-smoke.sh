#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-startup-results
# sys.boot_completed can be set before the emulator has a network route.
# Distinguish an unavailable runner network from an application startup hang.
network_ready=false
for attempt in $(seq 1 30); do
  if adb shell dumpsys connectivity | grep 'VALIDATED' > /dev/null; then
    network_ready=true
    break
  fi
  sleep 2
done
if [ "$network_ready" != true ]; then
  adb shell dumpsys connectivity > android-startup-results/network-unavailable.log
  echo 'Emulator network did not become validated.' >&2
  exit 1
fi
adb install -r android/app/build/outputs/apk/release/app-release.apk
wait_for_access() {
  local output="$1"
  for attempt in $(seq 1 40); do
    adb logcat -d -s OnlyFachosStartup:I '*:S' > "$output"
    if grep -q 'screen=access' "$output"; then return 0; fi
    if grep -q 'screen=error' "$output"; then return 1; fi
    sleep 1
  done
  return 1
}
for launch in first-install cold-start; do
  adb shell am force-stop com.rigthnder.app
  adb logcat -c
  adb shell am start -W -n com.rigthnder.app/.MainActivity
  if ! wait_for_access "android-startup-results/$launch.log"; then
    adb shell screencap -p /sdcard/onlyfachos-startup.png
    adb pull /sdcard/onlyfachos-startup.png "android-startup-results/$launch-error.png"
    adb logcat -d > "android-startup-results/$launch-first-attempt-full.log"
    # A visible recoverable error is different from an endless spinner. Test
    # exactly one user retry (Tab focuses the only button in the error view).
    # A hang without a reported error, or failure after retry, still fails CI.
    if ! grep -q 'screen=error' "android-startup-results/$launch.log"; then exit 1; fi
    adb shell ping -c 1 -W 3 onlyfachos.webrom.cc > "android-startup-results/$launch-dns.log" 2>&1 || true
    adb logcat -c
    adb shell input keyevent 61
    adb shell input keyevent 66
    if ! wait_for_access "android-startup-results/$launch-retry.log"; then
      adb logcat -d > "android-startup-results/$launch-full.log"
      echo 'Release WebView did not recover to the login screen.' >&2
      exit 1
    fi
  fi
  adb shell screencap -p /sdcard/onlyfachos-startup.png
  adb pull /sdcard/onlyfachos-startup.png "android-startup-results/$launch.png"
done
adb shell am force-stop com.rigthnder.app
