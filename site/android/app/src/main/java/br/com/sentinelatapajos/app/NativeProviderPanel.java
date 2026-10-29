package br.com.sentinelatapajos.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.Locale;

/**
 * Uma tela ANDROID nativa contendo a visualizacao oficial do terceiro.
 * O conteudo do provedor e WEB: nao representa um SDK nativo nem reempacota dados.
 * Sem JavaScript bridge, GPS, cookies, navegador de URLs livres ou modo offline.
 */
public final class NativeProviderPanel extends LinearLayout {
    public enum Provider { WINDY, PURPLEAIR, IQAIR, RADARCLIMA, ACCUWEATHER }
    private final Activity host;
    private final double lat, lon;
    private final TextView header, info;
    private final LinearLayout viewer;
    private final HorizontalScrollView menu;
    private WebView web;
    private Provider selected;
    private boolean closed=false, resumed=false;

    public NativeProviderPanel(Activity activity, double lat, double lon,
                               Provider selected, Provider... available){
        super(activity);
        this.host=activity;
        this.lat=lat;
        this.lon=lon;
        setOrientation(VERTICAL);
        setPadding(px(5),px(7),px(5),px(10));
        setBackgroundColor(0xf5e8f0e8);

        header=new TextView(host);
        header.setTextColor(0xff193d2e);
        header.setTextSize(17);
        header.setTypeface(null,Typeface.BOLD);
        header.setPadding(px(8),px(4),px(8),px(4));
        addView(header);

        TextView note=new TextView(host);
        note.setText("Visualização integrada do site do provedor · conteúdo web dentro do APK. " +
            "O mapa e os dados originais pertencem à fonte indicada, não ao Sentinela.");
        note.setTextColor(0xff456756);
        note.setTextSize(12);
        note.setPadding(px(8),px(1),px(8),px(7));
        addView(note);

        menu=new HorizontalScrollView(host);
        menu.setHorizontalScrollBarEnabled(false);
        LinearLayout buttons=new LinearLayout(host);
        buttons.setOrientation(HORIZONTAL);
        buttons.setGravity(Gravity.CENTER_VERTICAL);
        for(Provider p:available){
            Button b=new Button(host);
            b.setText(label(p));b.setTextSize(11);b.setAllCaps(false);
            b.setOnClickListener(v->load(p));
            buttons.addView(b);
        }
        menu.addView(buttons);
        addView(menu, new LayoutParams(-1,px(52)));

        info=new TextView(host);
        info.setTextColor(0xff325c45);
        info.setTextSize(12);
        info.setPadding(px(10),px(6),px(10),px(7));
        addView(info);

        viewer=new LinearLayout(host);
        viewer.setOrientation(VERTICAL);
        viewer.setBackgroundColor(0xffedf4ec);
        addView(viewer, new LayoutParams(-1,px(375)));

        LinearLayout row=new LinearLayout(host);
        row.setOrientation(HORIZONTAL);
        Button refresh=new Button(host);
        refresh.setText("↻ Recarregar");refresh.setTextSize(11);refresh.setAllCaps(false);
        refresh.setOnClickListener(v->{if(selected!=null)load(selected);});
        row.addView(refresh,new LayoutParams(0,px(49),1));
        Button original=new Button(host);
        original.setText("Abrir fonte oficial");original.setTextSize(11);original.setAllCaps(false);
        original.setOnClickListener(v->{
            if(selected!=null)try{
                host.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(address(selected))));
            }catch(Exception e){info.setText("Navegador externo indisponível.");}
        });
        row.addView(original,new LayoutParams(0,px(49),1));
        addView(row);

        load(selected);
    }

    private int px(int dp){return Math.round(dp*getResources().getDisplayMetrics().density);}
    private static String label(Provider p){
        switch(p){
            case WINDY:return "Windy";
            case PURPLEAIR:return "PurpleAir";
            case IQAIR:return "IQAir";
            case RADARCLIMA:return "RadarClima";
            case ACCUWEATHER:return "AccuWeather";
            default:return "Provedor";
        }
    }
    private String address(Provider p){
        switch(p){
            case WINDY:
                return String.format(Locale.US,
                   "https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=7&overlay=wind&product=ecmwf&level=surface&lat=%.5f&lon=%.5f",
                   lat,lon);
            case PURPLEAIR:
                return String.format(Locale.US,
                    "https://map.purpleair.com/air-quality-standards-us-epa-aqi#7/%.4f/%.4f",lat,lon);
            case IQAIR:return "https://www.iqair.com/br/air-quality-map";
            case RADARCLIMA:return "https://www.climaeradar.com.br/radarclima";
            case ACCUWEATHER:return "https://www.accuweather.com/pt/br/brazil-weather";
            default:throw new IllegalArgumentException("Provedor desconhecido");
        }
    }
    private boolean validHost(Uri uri, Provider p){
        if(uri==null||!"https".equalsIgnoreCase(uri.getScheme()))return false;
        String hostName=uri.getHost();
        if(hostName==null)return false;
        hostName=hostName.toLowerCase(Locale.ROOT);
        String suffix;
        switch(p){
            case WINDY:suffix="windy.com";break;
            case PURPLEAIR:suffix="purpleair.com";break;
            case IQAIR:suffix="iqair.com";break;
            case RADARCLIMA:suffix="climaeradar.com.br";break;
            case ACCUWEATHER:suffix="accuweather.com";break;
            default:return false;
        }
        return hostName.equals(suffix)||hostName.endsWith("."+suffix);
    }

    private void releaseBrowser(){
        if(web==null)return;
        WebView w=web;
        web=null;
        w.stopLoading();w.setWebChromeClient(null);w.setWebViewClient(new WebViewClient());
        w.loadUrl("about:blank");w.onPause();
        viewer.removeView(w);
        w.clearHistory();w.clearCache(true);w.clearFormData();
        w.destroy();
    }

    public void load(Provider p){
        if(closed)return;
        selected=p;
        releaseBrowser();
        header.setText(label(p)+" · painel integrado");
        String restriction;
        switch(p) {
            case WINDY:restriction="Widget oficial incorporável do Windy. Vento e camadas de previsão externa.";break;
            case PURPLEAIR:restriction="Mapa oficial de sensores PurpleAir. Não confundir com estimativa CAMS.";break;
            case IQAIR:restriction="Site oficial IQAir, exibido internamente quando permitido.";break;
            case RADARCLIMA:restriction="RadarClima do Clima & Radar; carregamento depende de compatibilidade do provedor.";break;
            case ACCUWEATHER:restriction="Previsão do AccuWeather; selecione o local no provedor.";break;
            default:restriction="Fonte externa.";
        }
        info.setText("Carregando "+label(p)+"… "+restriction);
        try{
            WebView w=new WebView(host);
            web=w;
            w.setBackgroundColor(Color.WHITE);
            WebSettings s=w.getSettings();
            s.setJavaScriptEnabled(true);
            s.setDomStorageEnabled(true); // Alguns mapas requerem armazenamento de sessao; eliminado ao encerrar.
            s.setCacheMode(WebSettings.LOAD_NO_CACHE);
            s.setAllowFileAccess(false);
            s.setAllowContentAccess(false);
            s.setJavaScriptCanOpenWindowsAutomatically(false);
            s.setSupportMultipleWindows(false);
            s.setGeolocationEnabled(false);
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            s.setBuiltInZoomControls(true);
            s.setDisplayZoomControls(false);
            s.setMediaPlaybackRequiresUserGesture(true);
            CookieManager.getInstance().setAcceptCookie(false);
            CookieManager.getInstance().setAcceptThirdPartyCookies(w,false);
            w.setWebChromeClient(new WebChromeClient(){
                @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback){
                    callback.invoke(origin,false,false);
                }
                @Override public void onPermissionRequest(PermissionRequest request){
                    request.deny();
                }
            });
            w.setWebViewClient(new WebViewClient(){
                @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request){
                    if(!request.isForMainFrame())return false;
                    Uri next=request.getUrl();
                    if(validHost(next,p))return false;
                    if("https".equalsIgnoreCase(next.getScheme()))
                        try{host.startActivity(new Intent(Intent.ACTION_VIEW,next));}catch(Exception ignored){}
                    return true;
                }
                @Override public void onPageFinished(WebView view,String url){
                    if(web==view && !closed)
                        info.setText(label(p)+" · fonte externa exibida. "+restriction+
                            " Sem dados locais verificados adicionalmente.");
                }
                @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error){
                    if(request.isForMainFrame()&&web==view && !closed)
                        info.setText(label(p)+" não pôde ser exibido internamente. Use “Abrir fonte oficial”.");
                }
            });
            // Evita que o scroll vertical da pagina intercepte gestos dos mapas.
            w.setOnTouchListener((v,e)->{
                if(e.getActionMasked()==MotionEvent.ACTION_DOWN ||
                   e.getActionMasked()==MotionEvent.ACTION_MOVE)
                    v.getParent().requestDisallowInterceptTouchEvent(true);
                else if(e.getActionMasked()==MotionEvent.ACTION_UP ||
                        e.getActionMasked()==MotionEvent.ACTION_CANCEL)
                    v.getParent().requestDisallowInterceptTouchEvent(false);
                return false;
            });
            viewer.addView(w,new LayoutParams(-1,-1));
            w.loadUrl(address(p));
        }catch(Exception e){
            info.setText("Visualização "+label(p)+" indisponível neste Android. Abra no navegador.");
        }
    }

    public void onHostResume(){if(!closed&&web!=null&&!resumed){web.onResume();resumed=true;}}
    public void onHostPause(){if(!closed&&web!=null&&resumed){web.onPause();resumed=false;}}
    public boolean canGoBack(){return web!=null&&web.canGoBack();}
    public void goBack(){if(canGoBack())web.goBack();}
    public void close(){
        if(closed)return;
        onHostPause();
        closed=true;
        releaseBrowser();
        android.webkit.WebStorage.getInstance().deleteAllData();
    }
}
