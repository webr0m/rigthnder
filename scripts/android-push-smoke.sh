#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-startup-results
dump_ui() {
  adb shell uiautomator dump /sdcard/onlyfachos-push-ui.xml >/dev/null 2>&1
  adb pull /sdcard/onlyfachos-push-ui.xml android-startup-results/push-ui.xml >/dev/null 2>&1
}
wait_text() {
  local expected="$1"
  for attempt in $(seq 1 30); do
    if dump_ui; then
      if grep -q 'PUSH_QA_FAILED' android-startup-results/push-ui.xml; then
        echo 'Optimized JS/native push bridge failed.' >&2
        return 1
      fi
      if grep -q "$expected" android-startup-results/push-ui.xml; then return 0; fi
    fi
    sleep 1
  done
  echo "Android push UI did not reach $expected" >&2
  return 1
}
tap_control() {
  local attribute="$1" expected="$2"
  read -r x y < <(python3 - "$attribute" "$expected" <<'PY'
import re, sys, xml.etree.ElementTree as ET
root=ET.parse('android-startup-results/push-ui.xml')
nodes=[n for n in root.iter('node') if n.get(sys.argv[1]) == sys.argv[2]]
assert len(nodes)==1, 'Expected exactly one Android control'
x1,y1,x2,y2=map(int,re.findall(r'\d+',nodes[0].get('bounds')))
print((x1+x2)//2,(y1+y2)//2)
PY
  )
  adb shell input tap "$x" "$y"
}
adb shell am force-stop com.rigthnder.app
adb shell am start -W -n com.rigthnder.app/.MainActivity --ez onlyfachosPushProbe true
# Fresh API 35 emulator: checkPermissions must return a real prompt record,
# not undefined. Do not pre-grant the permission in this test.
wait_text 'PUSH_QA_READY_prompt'
tap_control text 'ACTIVAR PUSH QA'
wait_text 'com.android.permissioncontroller:id/permission_allow_button'
adb shell screencap -p /sdcard/onlyfachos-push.png
adb pull /sdcard/onlyfachos-push.png android-startup-results/push-permission-dialog.png >/dev/null
tap_control resource-id 'com.android.permissioncontroller:id/permission_allow_button'
wait_text 'PUSH_QA_REGISTERED_AND_REVOKED'
adb shell screencap -p /sdcard/onlyfachos-push.png
adb pull /sdcard/onlyfachos-push.png android-startup-results/push-registration-success.png >/dev/null
echo 'Optimized JS bridge: permission dialog, granted record, FCM registration and revocation passed.'
adb shell am force-stop com.rigthnder.app
