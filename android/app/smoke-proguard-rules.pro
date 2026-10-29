# Instrumentation runs in the optimized app process and calls these public APIs.
# Retain its test/runtime entry points only in the disposable CI build, while
# keeping release minification and resource shrinking enabled.
-keep class kotlin.jvm.internal.Intrinsics { *; }
-keep class com.google.android.gms.tasks.Tasks { public *; }
-keepclassmembers class com.getcapacitor.BridgeActivity { public *; }
-keepclassmembers class com.getcapacitor.Bridge { public *; }
-keepclassmembers class com.google.firebase.FirebaseApp { public *; }
-keepclassmembers class com.google.firebase.FirebaseOptions { public *; }
-keepclassmembers class com.google.firebase.messaging.FirebaseMessaging { public *; }
