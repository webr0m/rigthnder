package com.rigthnder.app;

import static org.junit.Assert.*;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.google.android.gms.tasks.Tasks;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.concurrent.TimeUnit;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class OnlyFachosSmokeTest {
    @Test public void optimizedAppLoadsNativePluginsAndFirebaseCanRegister() throws Exception {
        // Runs on a disposable CI emulator. Never uploads or prints the token,
        // creates a user account, requests ads, or sends a notification.
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> {
                assertNotNull(activity.getBridge());
                for (String name : new String[]{"PushNotifications", "OnlyFachosDevice", "SecureStorage", "AdMob"})
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
