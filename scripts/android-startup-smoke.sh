#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-startup-results
adb install -r android/app/build/outputs/apk/release/app-release.apk
for launch in first-install cold-start; do
  adb shell am force-stop com.rigthnder.app
  adb logcat -c
  adb shell am start -W -n com.rigthnder.app/.MainActivity
  ready=false
  for attempt in $(seq 1 40); do
    adb logcat -d -s OnlyFachosStartup:I '*:S' > "android-startup-results/$launch.log"
    if grep -q 'screen=access' "android-startup-results/$launch.log"; then
      ready=true
      break
    fi
    if grep -q 'screen=error' "android-startup-results/$launch.log"; then break; fi
    sleep 1
  done
  adb shell screencap -p /sdcard/onlyfachos-startup.png
  adb pull /sdcard/onlyfachos-startup.png "android-startup-results/$launch.png"
  if [ "$ready" != true ]; then
    adb logcat -d > "android-startup-results/$launch-full.log"
    echo 'Release WebView did not reach the login screen.' >&2
    exit 1
  fi
done
adb shell am force-stop com.rigthnder.app
