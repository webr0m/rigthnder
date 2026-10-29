package com.rigthnder.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "OnlyFachosDevice")
public class OnlyFachosDevicePlugin extends Plugin {
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
}
