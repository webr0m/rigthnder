# Preserve the WebView bridge and runtime plugin annotations while allowing R8
# to optimize the rest of the release. Capacitor supplies plugin keep rules.
-keepattributes RuntimeVisibleAnnotations,AnnotationDefault,SourceFile,LineNumberTable
# Capacitor reads these annotation interfaces reflectively. Attributes alone do
# not prevent R8 full mode from folding PluginHandle.pluginAnnotation to null.
# Backport of ionic-team/capacitor#8646; keep optimization for the rest of the app.
-keep @interface com.getcapacitor.annotation.** { *; }
-keep @interface com.getcapacitor.PluginMethod { *; }
-keep @interface com.getcapacitor.NativePlugin { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.rigthnder.app.OnlyFachosDevicePlugin { *; }
-keep class com.rigthnder.app.OnlyFachosUpdatesPlugin { *; }

# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
