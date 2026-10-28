package br.com.sentinelatapajos.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.widget.TextView;

/** Online entry point. Environmental data is handled by the published Site. */
public final class MainActivity extends Activity {
    private static final String PANEL_URL = "https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/?campo=0";
    private static final String SHARE_URL = "https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/";
    private TextView status;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.activity_main);
        status = findViewById(R.id.status);
        View root = findViewById(R.id.root);
        int padding = Math.round(24 * getResources().getDisplayMetrics().density);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(padding + bars.left, padding + bars.top, padding + bars.right, padding + bars.bottom);
            } else {
                view.setPadding(padding + insets.getSystemWindowInsetLeft(), padding + insets.getSystemWindowInsetTop(), padding + insets.getSystemWindowInsetRight(), padding + insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        root.requestApplyInsets();
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) controller.setSystemBarsAppearance(
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
        }
        findViewById(R.id.open_panel).setOnClickListener(v -> openPanel());
        findViewById(R.id.share_site).setOnClickListener(v -> shareSite());
    }

    private void openPanel() {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(PANEL_URL));
        Bundle session = new Bundle();
        session.putBinder("android.support.customtabs.extra.SESSION", (IBinder) null);
        intent.putExtras(session);
        intent.putExtra("android.support.customtabs.extra.TOOLBAR_COLOR", Color.rgb(23, 63, 46));
        intent.putExtra("android.support.customtabs.extra.TITLE_VISIBILITY", 1);
        intent.putExtra("android.support.customtabs.extra.SHARE_MENU_ITEM", true);
        try {
            startActivity(intent);
            status.setText(R.string.opened_status);
        } catch (ActivityNotFoundException | SecurityException error) {
            status.setText(R.string.browser_missing);
        }
    }

    private void shareSite() {
        Intent share = new Intent(Intent.ACTION_SEND);
        share.setType("text/plain");
        share.putExtra(Intent.EXTRA_SUBJECT, getString(R.string.app_name));
        share.putExtra(Intent.EXTRA_TEXT, getString(R.string.share_text) + "\n" + SHARE_URL);
        try {
            startActivity(Intent.createChooser(share, getString(R.string.share_title)));
        } catch (ActivityNotFoundException | SecurityException error) {
            status.setText(R.string.share_unavailable);
        }
    }
}
