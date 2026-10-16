package com.barncatgame.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * "Update available" helper for the test app downloaded from GitHub.
 *  - download: saves the newest BarnCat.apk into the app's private cache, reporting progress.
 *  - install:  opens Android's own install screen for it (the player always taps Install).
 * Only downloads from Barn Cat's own GitHub releases page.
 * NOT allowed on Google Play (apps there must update through the Play Store):
 * the Play version must leave this switched off and drop the REQUEST_INSTALL_PACKAGES permission.
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    private static final String ALLOWED_PREFIX = "https://github.com/Trey120234/Barn-Cat/releases/";

    private File updateFile() {
        File dir = new File(getContext().getCacheDir(), "updates");
        dir.mkdirs();
        return new File(dir, "BarnCat-update.apk");
    }

    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith(ALLOWED_PREFIX)) {
            call.reject("That isn't a Barn Cat update address.");
            return;
        }
        new Thread(() -> {
            HttpURLConnection conn = null;
            File out = updateFile();
            File part = new File(out.getPath() + ".part");
            try {
                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setInstanceFollowRedirects(true);   // GitHub sends the file from its download server
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                int code = conn.getResponseCode();
                if (code != HttpURLConnection.HTTP_OK) throw new IOException("server answered " + code);
                long total = conn.getContentLengthLong();
                long done = 0;
                int lastPercent = -1;
                try (InputStream in = conn.getInputStream(); OutputStream os = new FileOutputStream(part)) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        os.write(buf, 0, n);
                        done += n;
                        if (total > 0) {
                            int percent = (int) (done * 100 / total);
                            if (percent != lastPercent) {
                                lastPercent = percent;
                                JSObject ev = new JSObject();
                                ev.put("percent", percent);
                                notifyListeners("progress", ev);
                            }
                        }
                    }
                }
                if (out.exists()) out.delete();
                if (!part.renameTo(out)) throw new IOException("couldn't save the update");
                JSObject ret = new JSObject();
                ret.put("bytes", out.length());
                call.resolve(ret);
            } catch (Exception e) {
                part.delete();
                call.reject("Download failed: " + e.getMessage());
            } finally {
                if (conn != null) conn.disconnect();
            }
        }).start();
    }

    @PluginMethod
    public void install(PluginCall call) {
        File apk = updateFile();
        if (!apk.exists()) {
            call.reject("No update has been downloaded yet.");
            return;
        }
        // Android 8+: the player must allow Barn Cat to install apps once (a switch in Settings).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName()));
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(settings);
            JSObject ret = new JSObject();
            ret.put("needsPermission", true);
            call.resolve(ret);
            return;
        }
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
        Intent install = new Intent(Intent.ACTION_VIEW);
        install.setDataAndType(uri, "application/vnd.android.package-archive");
        install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(install);
        JSObject ret = new JSObject();
        ret.put("needsPermission", false);
        call.resolve(ret);
    }
}
