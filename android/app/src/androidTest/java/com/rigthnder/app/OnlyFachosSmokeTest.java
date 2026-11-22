package com.rigthnder.app;

import static org.junit.Assert.*;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import com.google.android.gms.tasks.Tasks;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.concurrent.TimeUnit;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class OnlyFachosSmokeTest {
    @Test public void foregroundNotificationUsesVisibleChannelAndPrivateGenericContent() throws Exception {
        android.content.Context context = androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().getTargetContext();
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            try (android.os.ParcelFileDescriptor descriptor = androidx.test.platform.app.InstrumentationRegistry.getInstrumentation()
                .getUiAutomation().executeShellCommand("pm grant com.rigthnder.app android.permission.POST_NOTIFICATIONS");
                 java.io.FileInputStream stream = new java.io.FileInputStream(descriptor.getFileDescriptor())) {
                stream.readAllBytes();
            }
        }
        android.app.NotificationManager notifications = context.getSystemService(android.app.NotificationManager.class);
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> {
                try {
                    com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin plugin =
                        (com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin) activity.getBridge().getPlugin("PushNotifications").getInstance();
                    com.google.firebase.messaging.RemoteMessage message = new com.google.firebase.messaging.RemoteMessage.Builder("qa-only")
                        .addData("gcm.n.e", "1").addData("gcm.n.title", "OnlyFachos QA")
                        .addData("gcm.n.body", "Prueba de notificaciones")
                        .addData("gcm.n.android_channel_id", "onlyfachos-activity").build();
                    assertNotNull(message.getNotification());
                    plugin.fireNotification(message);
                } catch (Exception error) { throw new AssertionError(error); }
            });
            android.service.notification.StatusBarNotification found = null;
            for (int attempt=0; attempt<60 && found==null; attempt++) {
                for (android.service.notification.StatusBarNotification entry: notifications.getActiveNotifications())
                    if ("OnlyFachos QA".equals(entry.getNotification().extras.getString(android.app.Notification.EXTRA_TITLE))) found=entry;
                if (found==null) Thread.sleep(50);
            }
            assertNotNull("Foreground push must appear in Android notifications", found);
            assertEquals("onlyfachos-activity", found.getNotification().getChannelId());
            assertEquals(android.app.Notification.VISIBILITY_PRIVATE, notifications.getNotificationChannel("onlyfachos-activity").getLockscreenVisibility());
        } finally { notifications.cancelAll(); }
    }
    @Test public void nativePluginsLoadAndFirebaseCanRegister() throws Exception {
        // Runs on a disposable CI emulator. Never uploads or prints the token,
        // creates a user account, requests ads, or sends a notification.
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> {
                assertNotNull(activity.getBridge());
                for (String name : new String[]{"PushNotifications", "OnlyFachosDevice", "OnlyFachosUpdates", "SecureStorage", "AdMob"})
                    assertNotNull("Native plugin missing: " + name, activity.getBridge().getPlugin(name));
                assertNotNull(activity.getBridge().getWebView());
            });
            FirebaseApp app = FirebaseApp.getInstance();
            assertEquals("onlyfachos", app.getOptions().getProjectId());
            FirebaseMessaging messaging = FirebaseMessaging.getInstance();
            try {
                String token = Tasks.await(messaging.getToken(), 75, TimeUnit.SECONDS);
                assertNotNull(token);
                assertTrue("FCM returned an empty token", token.length() > 20);
            } finally {
                messaging.setAutoInitEnabled(false);
                Tasks.await(messaging.deleteToken(), 30, TimeUnit.SECONDS);
            }
        }
    }
}
