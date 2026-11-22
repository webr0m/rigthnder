package com.rigthnder.app;

import android.app.Activity;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.*;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.*;

@CapacitorPlugin(name = "OnlyFachosUpdates")
public class OnlyFachosUpdatesPlugin extends Plugin {
    private AppUpdateManager manager;
    private boolean starting;
    private final InstallStateUpdatedListener listener = state -> {
        JSObject result = new JSObject();
        result.put("status", state.installStatus());
        result.put("bytesDownloaded", state.bytesDownloaded());
        result.put("totalBytes", state.totalBytesToDownload());
        notifyListeners("updateState", result);
    };
    @Override public void load() {
        manager = AppUpdateManagerFactory.create(getContext());
        manager.registerListener(listener);
    }
    @Override protected void handleOnDestroy() {
        if (manager != null) manager.unregisterListener(listener);
    }
    @PluginMethod public void check(PluginCall call) {
        manager.getAppUpdateInfo().addOnSuccessListener(info -> {
            JSObject result = new JSObject();
            result.put("available", info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                && info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE));
            result.put("status", info.installStatus());
            result.put("versionCode", info.availableVersionCode());
            result.put("bytesDownloaded", info.bytesDownloaded());
            result.put("totalBytes", info.totalBytesToDownload());
            call.resolve(result);
        }).addOnFailureListener(error -> call.reject("No se pudo consultar Google Play.", "UPDATE_UNAVAILABLE"));
    }
    @PluginMethod public void start(PluginCall call) {
        if (starting) { call.reject("La actualización ya está en curso."); return; }
        starting = true;
        manager.getAppUpdateInfo().addOnSuccessListener(info -> {
            if (!info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)
                || info.updateAvailability() != UpdateAvailability.UPDATE_AVAILABLE) {
                starting = false;
                call.reject("No hay una actualización disponible para esta cuenta de Google Play.");
                return;
            }
            getActivity().runOnUiThread(() -> manager.startUpdateFlow(info, getActivity(),
                AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build())
                .addOnSuccessListener(result -> {
                    starting = false;
                    JSObject value = new JSObject(); value.put("accepted", result == Activity.RESULT_OK);
                    call.resolve(value);
                }).addOnFailureListener(error -> {
                    starting = false; call.reject("No se pudo iniciar la actualización.");
                }));
        }).addOnFailureListener(error -> { starting = false; call.reject("No se pudo consultar Google Play."); });
    }
    @PluginMethod public void complete(PluginCall call) {
        manager.getAppUpdateInfo().addOnSuccessListener(info -> {
            if (info.installStatus() != InstallStatus.DOWNLOADED) {
                call.reject("La actualización todavía no terminó de descargarse."); return;
            }
            manager.completeUpdate().addOnSuccessListener(result -> call.resolve())
                .addOnFailureListener(error -> call.reject("No se pudo instalar la actualización."));
        }).addOnFailureListener(error -> call.reject("No se pudo consultar Google Play."));
    }
}
