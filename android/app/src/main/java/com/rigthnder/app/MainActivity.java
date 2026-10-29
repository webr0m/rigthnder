package com.rigthnder.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OnlyFachosDevicePlugin.class);
        super.onCreate(savedInstanceState);
        WindowCompat.enableEdgeToEdge(getWindow());
    }
}
