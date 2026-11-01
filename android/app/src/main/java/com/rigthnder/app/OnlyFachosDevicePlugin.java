package com.rigthnder.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.view.Window;
import android.view.WindowManager;
import android.util.Log;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "OnlyFachosDevice")
public class OnlyFachosDevicePlugin extends Plugin {
    // Fixed, non-personal milestones let release tests detect a live process
    // whose WebView never reaches a usable screen. No account data is logged.
    @PluginMethod
    public void reportStartup(PluginCall call) {
        String screen = call.getString("screen", "");
        if (!java.util.Arrays.asList("access", "community", "onboarding", "recovery", "error").contains(screen)) {
            call.reject("Invalid startup screen");
            return;
        }
        Log.i("OnlyFachosStartup", "screen=" + screen);
        call.resolve();
    }

    @PluginMethod
    public void notificationStatus(PluginCall call) {
        boolean blocked = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getContext().getSystemService(NotificationManager.class);
            NotificationChannel channel = manager.getNotificationChannel("onlyfachos-activity");
            blocked = channel != null && channel.getImportance() == NotificationManager.IMPORTANCE_NONE;
        }
        JSObject result = new JSObject();
        result.put("enabled", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        result.put("channelBlocked", blocked);
        call.resolve(result);
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(android.net.Uri.parse("package:" + getContext().getPackageName()));
            }
            try { getActivity().startActivity(intent); call.resolve(); }
            catch (Exception error) { call.reject("No se pudieron abrir los ajustes de notificaciones."); }
        });
    }

    @PluginMethod
    public void setScreenCaptureProtection(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", true);
        if (getActivity() == null) {
            call.reject("No se pudo actualizar la protección de pantalla.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            if (enabled) window.addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            else window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            call.resolve();
        });
    }
}
