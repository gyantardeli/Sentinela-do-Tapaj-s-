package br.com.sentinelatapajos.mobile;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/**
 * Invólucro Android para o SITE ORIGINAL (não para o frontend independente V2.2).
 * Carrega a publicação vigente: a versão 24 e as publicações subsequentes
 * aparecem online sem reinstalar o APK.
 *
 * Não embute tokens, credenciais, snapshots pessoais nem permissões amplas.
 * O modo offline efetivo depende do service worker e do cache do site original.
 */
public final class MainActivity extends Activity {
    private static final String HOME = "https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/";
    private static final String TRUSTED_HOST = "sentinela-tapajos-ar.gyantardeli.chatgpt.site";
    private static final int FILE_CHOOSER_REQUEST = 741;
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setSafeBrowsingEnabled(true);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri uri = request.getUrl();
                if (isTrusted(uri)) return false;
                if ("https".equalsIgnoreCase(uri.getScheme())) openExternal(uri);
                // Bloqueia esquemas externos arbitrários e HTTP.
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame() && isTrusted(request.getUrl())) {
                    showOffline();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view,
                    ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException ex) {
                    fileCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, length) -> {
            Uri uri = Uri.parse(url);
            if ("https".equalsIgnoreCase(uri.getScheme())) {
                openExternal(uri); // O navegador gerencia PDFs/arquivos de forma segura.
            } else {
                Toast.makeText(this, "Para baixar este arquivo, abra o site no navegador.", Toast.LENGTH_LONG).show();
            }
        });

        webView.loadUrl(HOME);
    }

    private boolean isTrusted(Uri uri) {
        return uri != null
            && "https".equalsIgnoreCase(uri.getScheme())
            && TRUSTED_HOST.equalsIgnoreCase(uri.getHost())
            && (uri.getPort() == -1 || uri.getPort() == 443);
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri)
                    .addCategory(Intent.CATEGORY_BROWSABLE));
        } catch (ActivityNotFoundException ex) {
            Toast.makeText(this, "Nenhum navegador disponível.", Toast.LENGTH_SHORT).show();
        }
    }

    private void showOffline() {
        // Nenhum mapa ou dado simulado; nunca apresentar informação antiga como atual.
        final String html = "<!doctype html><html lang='pt-br'><head>"
            + "<meta name='viewport' content='width=device-width,initial-scale=1'>"
            + "<style>body{font-family:sans-serif;background:#f5f8f5;color:#14382c;"
            + "padding:32px;line-height:1.6}a{display:inline-block;background:#14382c;"
            + "color:white;padding:12px 20px;border-radius:8px;text-decoration:none}</style>"
            + "</head><body><h2>Sentinela Tapajós</h2>"
            + "<p>Sem conexão para consultar o painel. Os dados não foram zerados.</p>"
            + "<p>Se houver um recorte salvo pelo próprio site, ele poderá estar disponível"
            + " quando a conexão for restabelecida ou se o site oferecer consulta offline.</p>"
            + "<a href='" + HOME + "'>Tentar novamente</a></body></html>";
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (fileCallback != null) {
            fileCallback.onReceiveValue(null);
            fileCallback = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
