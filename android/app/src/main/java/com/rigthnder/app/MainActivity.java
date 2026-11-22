package com.rigthnder.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OnlyFachosDevicePlugin.class);
        registerPlugin(OnlyFachosUpdatesPlugin.class);
        super.onCreate(savedInstanceState);
        WindowCompat.enableEdgeToEdge(getWindow());
        // Only the disposable CI APK has this flag and asset. R8 removes the
        // branch from the Play bundle, which never accepts the QA entry point.
        if (BuildConfig.ONLYFACHOS_NATIVE_QA && getIntent().getBooleanExtra("onlyfachosPushProbe", false)) {
            getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl("https://localhost/native-push-qa.html"));
        }
    }
}
