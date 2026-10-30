package br.com.sentinelatapajos.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.ArrayAdapter;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Interfaces Android nativas: TextView, Canvas, controles e listas.
 * MapLibre, controles e dados próprios são nativos. Terceiros são exibidos em WebView
 * isolada na tela Android; NÃO são SDK nativo ou dados controlados pelo Sentinela.
 * Sem downloads ambientais ou pacotes offline. 3D real não implementado.
 */
public final class NativeDashboardActivity extends Activity {
    private static final String ORIGIN="https://sentinela-tapajos-ar.gyantardeli.chatgpt.site";
    private static final String[] IDS={"overview","fire3d","maps","purpleair","weather","inpe","radar",
            "history","health","areas","alerts","collection","sources","diary","apoie"};
    // Espelha os 14 paineis de site/lib/panel-navigation.ts; Apoie permanece separado.
    private static final String[] LABELS={"Visão geral","Mapa 3D · evolução","Comparar mapas","Qualidade do ar",
            "Previsão do tempo","INPE · Queimadas","Radar regional","Histórico regional","Saúde das fontes",
            "Áreas de interesse","Alertas da operação","Coleta","Fontes e método","Diário do Explorador","Apoie"};
    private static final String[] HEADINGS={
        "Sentinela Tapajós","O fogo no tempo e no terreno.","Duas perspectivas. Uma região.",
        "Qualidade do ar no Tapajós","Previsão do tempo no Tapajós",
        "Queimadas com a referência do INPE","Radar de notícias da região",
        "A região ao longo do tempo.","Acompanhe a qualidade das fontes.",
        "Suas áreas de interesse.","Acompanhe o que pede atenção.",
        "Coleta de informações","Cada dado tem uma origem.","Diário do Explorador","Me paga um café? ☕"
    };
    private static final String[] DESCRIPTIONS={
        "Queimadas, qualidade do ar, vento e notícias para acompanhar a região.",
        "Explore detecções no mapa, acompanhe registros e a evolução do fogo. Sem relevo 3D real nesta beta.",
        "Compare as detecções de calor com a circulação do vento e os poluentes no Windy.",
        "Mapa PurpleAir de sensores de qualidade do ar, com legendas em português e referências.",
        "AccuWeather, Clima & Radar e Windy para acompanhar o tempo na região.",
        "Dados ambientais, risco de fogo e acesso ao monitoramento oficial do Programa Queimadas.",
        "Notícias e comunicados sobre queimadas e incêndios, classificados por local e relevância.",
        "Histórico de 7 e 30 dias para comparar detecções, modelo de partículas e notícias.",
        "Confira respostas, atrasos, falhas e a cobertura real de cada canal monitorado.",
        "Consulte áreas de interesse e seus focos. Edição de polígonos depende da versão web.",
        "Consulte os avisos e limites de detecções, partículas e falhas de coleta.",
        "Acompanhe verificações, horários e falhas da coleta.",
        "Entenda o que foi observado, calculado e os limites de cada fonte.",
        "Histórias, povos e expedições pela região do Tapajós.",
        "Apoio voluntário ao monitoramento ambiental da Amazônia."
    };
    private static final String[] NAV_SYMBOLS={"◫","▤","▦","◉","☀","♨","◈","◷","✚","⌖","♢","↻","ⓘ","▣"};
    private static final String[] PLACES={"Itaituba","Jacareacanga","Novo Progresso","Rurópolis",
            "Placas","Aveiro","Trairão","Santarém"};
    private static final String[] PLACE_IDS={"itaituba","jacareacanga","novo-progresso",
            "ruropolis","placas","aveiro","trairao","santarem"};
    private static final double[] LATS={-4.2761,-6.2222,-7.1436,-4.0967,-3.8694,-3.6094,-4.5736,-2.4385};
    private static final double[] LONS={-55.9836,-57.7644,-55.3783,-54.9097,-54.2172,-55.3319,-55.9422,-54.6996};
    private static final int BG=Color.rgb(244,248,241), GREEN=Color.rgb(23,63,46),
            MUTED=Color.rgb(66,97,72), ORANGE=Color.rgb(186,84,35);
    private final ExecutorService executor=Executors.newSingleThreadExecutor();
    private int tab=0, city=0, radius=100, hours=24, days=7, sequence=0, diaryPage=0;
    private LinearLayout page, filtersBar;
    private FrameLayout appFrame, menuOverlay;
    private TextView currentPanel;
    private Button filterButton;
    private Spinner cityControl;
    private TextView status;
    private boolean suppressCityEvents=false;
    private JSONObject current;
    private NativeMapPanel activeMap;
    private NativeProviderPanel activeProvider;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        // Zero ambient tile cache: the Sentinela does not provide offline maps.
        org.maplibre.android.MapLibre.getInstance(this);
        org.maplibre.android.offline.OfflineManager.getInstance(this)
            .setMaximumAmbientCacheSize(0L, null);
        getWindow().setStatusBarColor(GREEN);
        getWindow().setNavigationBarColor(GREEN);
        buildShell();
        select(0);
    }

    private int dp(float n) { return (int)(n*getResources().getDisplayMetrics().density+.5f); }
    private LinearLayout vertical() { LinearLayout l=new LinearLayout(this); l.setOrientation(1); return l; }
    private LinearLayout horizontal() { LinearLayout l=new LinearLayout(this); l.setOrientation(0); l.setGravity(Gravity.CENTER_VERTICAL); return l; }
    private TextView text(String value,int size,boolean strong,int color) {
        TextView t=new TextView(this); t.setText(value); t.setTextSize(size);
        t.setTextColor(color); t.setPadding(0,dp(5),0,dp(6));
        if(strong)t.setTypeface(null,1);
        t.setTextIsSelectable(true);
        return t;
    }
    private void addText(String value,int size,boolean strong,int color) { page.addView(text(value,size,strong,color)); }
    private void gap(int size) { View v=new View(this);page.addView(v,new LinearLayout.LayoutParams(1,dp(size))); }
    private Button button(String title,Runnable action) {
        Button b=new Button(this);
        b.setText(title); b.setTextSize(12); b.setAllCaps(false); b.setTextColor(GREEN);
        b.setOnClickListener(v->action.run());
        return b;
    }
    private void card(String title,String body) {
        LinearLayout wrap=vertical();wrap.setPadding(dp(14),dp(10),dp(14),dp(10));
        android.graphics.drawable.GradientDrawable panelBackground=
            new android.graphics.drawable.GradientDrawable();
        panelBackground.setColor(Color.argb(239,250,255,248));
        panelBackground.setCornerRadius(dp(12));
        panelBackground.setStroke(dp(1),Color.argb(55,64,120,78));
        wrap.setBackground(panelBackground);
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);
        lp.bottomMargin=dp(9);page.addView(wrap,lp);
        wrap.addView(text(title,16,true,GREEN));wrap.addView(text(body,14,false,MUTED));
    }
    private void showLink(String title,String url) {
        if(url==null||!url.startsWith("https://"))return;
        Button b=button(title,()->openUrl(url));
        page.addView(b,new LinearLayout.LayoutParams(-1,-2));
    }
    private void openUrl(String url) {
        try{
            Uri uri=Uri.parse(url);
            if(!"https".equals(uri.getScheme()))throw new IllegalArgumentException("Endereço inválido");
            startActivity(new Intent(Intent.ACTION_VIEW,uri));
        }catch(Exception error) { status.setText("Não foi possível abrir o endereço externo."); }
    }
    private void buildShell() {
        appFrame=new FrameLayout(this);
        setContentView(appFrame);
        LinearLayout root=vertical();
        root.setBackgroundResource(R.drawable.sentinela_forest_background);
        root.setFitsSystemWindows(true);
        appFrame.addView(root,new FrameLayout.LayoutParams(-1,-1));

        // Barra superior com menu recolhivel: mesma estrutura do site em celulares.
        LinearLayout header=horizontal();
        header.setPadding(dp(6),dp(8),dp(10),dp(8));
        header.setBackgroundColor(GREEN);
        Button menu=button("☰",this::openMenu);
        menu.setTextSize(24);menu.setTextColor(Color.WHITE);
        menu.setContentDescription("Abrir menu de abas do Sentinela");
        menu.setBackgroundTintList(android.content.res.ColorStateList.valueOf(GREEN));
        header.addView(menu,new LinearLayout.LayoutParams(dp(49),dp(52)));
        ImageView logo=new ImageView(this);
        logo.setImageResource(R.drawable.guardian);
        logo.setContentDescription("Harpia guardiã do Tapajós");
        header.addView(logo,new LinearLayout.LayoutParams(dp(43),dp(48)));
        LinearLayout brand=vertical(); brand.setPadding(dp(10),0,0,0);
        TextView title=text("SENTINELA TAPAJÓS",16,true,Color.WHITE);
        title.setPadding(0,0,0,0);brand.addView(title);
        currentPanel=text("Visão geral",12,false,0xffcbe5d3);
        currentPanel.setPadding(0,0,0,0);brand.addView(currentPanel);
        header.addView(brand,new LinearLayout.LayoutParams(0,-2,1));
        root.addView(header);

        filtersBar=horizontal();
        filtersBar.setPadding(dp(10),dp(4),dp(10),dp(4));
        filtersBar.setBackgroundColor(0xecebf2e8);
        cityControl=new Spinner(this);
        ArrayAdapter<String> adapter=new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,PLACES);
        cityControl.setAdapter(adapter);
        cityControl.setContentDescription("Município de referência");
        filtersBar.addView(cityControl,new LinearLayout.LayoutParams(0,dp(51),1));
        filterButton=button("Raio / Período",()->new AlertDialog.Builder(this)
                .setTitle("Filtros dos focos")
                .setSingleChoiceItems(new String[]{"25 km | 6 h","50 km | 12 h","100 km | 24 h","200 km | 24 h"},filterIndex(),
                (dialog,selected)->{radius=new int[]{25,50,100,200}[selected];
                    hours=new int[]{6,12,24,24}[selected];dialog.dismiss();select(tab);}).show());
        filtersBar.addView(filterButton);
        filtersBar.addView(button("↻",()->select(tab)));
        root.addView(filtersBar);
        cityControl.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener(){
            public void onNothingSelected(android.widget.AdapterView<?> parent){}
            public void onItemSelected(android.widget.AdapterView<?> parent,View view,int pos,long id){
                if(!suppressCityEvents&&city!=pos){city=pos;select(tab);}
            }
        });

        status=text("Consulta online necessária. Sem cache local.",11,false,MUTED);
        status.setPadding(dp(15),dp(7),dp(15),dp(6));
        root.addView(status);
        ScrollView scroll=new ScrollView(this);
        scroll.setFillViewport(true);
        root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        page=vertical();
        page.setPadding(dp(15),dp(12),dp(15),dp(28));
        scroll.addView(page);
    }
    private void openMenu() {
        if(menuOverlay!=null)return;
        menuOverlay=new FrameLayout(this);
        menuOverlay.setBackgroundColor(0x9c06180e);
        menuOverlay.setOnClickListener(v->closeMenu());
        appFrame.addView(menuOverlay,new FrameLayout.LayoutParams(-1,-1));
        ScrollView navScroll=new ScrollView(this);
        navScroll.setFillViewport(true);
        navScroll.setBackgroundColor(0xff102c1e);
        navScroll.setOnClickListener(v->{});
        FrameLayout.LayoutParams panelParams=new FrameLayout.LayoutParams(
            dp(300),-1,Gravity.START);
        menuOverlay.addView(navScroll,panelParams);
        LinearLayout drawer=vertical();
        drawer.setPadding(dp(14),dp(24),dp(14),dp(20));
        navScroll.addView(drawer);

        LinearLayout drawerBrand=horizontal();
        ImageView logo=new ImageView(this);
        logo.setImageResource(R.drawable.guardian);
        drawerBrand.addView(logo,new LinearLayout.LayoutParams(dp(46),dp(52)));
        TextView brandName=text("SENTINELA\nTAPAJÓS",20,true,Color.WHITE);
        brandName.setPadding(dp(12),0,0,0);
        drawerBrand.addView(brandName);
        drawer.addView(drawerBrand);
        TextView caption=text("MONITORAMENTO AMBIENTAL",11,true,0xffa8cda9);
        caption.setPadding(dp(8),dp(11),0,dp(9));
        drawer.addView(caption);

        for(int i=0;i<14;i++) {
            final int next=i;
            Button option=button(NAV_SYMBOLS[i]+"   "+LABELS[i],()->{
                closeMenu();select(next);
            });
            option.setContentDescription("Abrir "+LABELS[i]);
            option.setGravity(Gravity.CENTER_VERTICAL|Gravity.START);
            option.setPadding(dp(15),0,dp(8),0);
            option.setTextSize(13);
            option.setTextColor(i==tab?Color.WHITE:0xffc5d9be);
            option.setBackgroundTintList(android.content.res.ColorStateList.valueOf(
                i==tab?0xff365c37:0xff173625));
            LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(48));
            lp.bottomMargin=dp(3);
            drawer.addView(option,lp);
        }
        View separator=new View(this);
        separator.setBackgroundColor(0xff426144);
        LinearLayout.LayoutParams rule=new LinearLayout.LayoutParams(-1,dp(1));
        rule.topMargin=dp(13);rule.bottomMargin=dp(12);
        drawer.addView(separator,rule);
        Button support=button("☕  Me paga um café?",()->{closeMenu();select(14);});
        support.setGravity(Gravity.CENTER_VERTICAL|Gravity.START);
        support.setPadding(dp(15),0,dp(8),0);
        support.setTextColor(0xffe7f4db);
        support.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xff315d3b));
        drawer.addView(support,new LinearLayout.LayoutParams(-1,dp(50)));

        TextView region=text("REGIÃO MONITORADA",11,true,0xffa8cda9);
        region.setPadding(dp(8),dp(22),0,0);
        drawer.addView(region);
        TextView location=text("Oeste do Pará · 8 sedes municipais\nReferência: "+PLACES[city],
            13,false,0xffdde9d9);
        location.setPadding(dp(8),dp(4),0,dp(15));
        drawer.addView(location);
        TextView footer=text("Origem e horário identificados\nDetecção · modelo · leitura local",
            11,false,0xffb9d5be);
        footer.setPadding(dp(8),dp(10),dp(8),dp(10));
        drawer.addView(footer);
    }
    private void closeMenu() {
        if(menuOverlay!=null) {
            appFrame.removeView(menuOverlay);
            menuOverlay=null;
        }
    }
    private void renderHeading() {
        addText(HEADINGS[tab],23,true,GREEN);
        addText(DESCRIPTIONS[tab],13,false,MUTED);
    }
    private void updateTabChrome() {
        currentPanel.setText(LABELS[tab]);
        boolean showsFilters=tab<=5||tab==7;
        filtersBar.setVisibility(showsFilters?View.VISIBLE:View.GONE);
        filterButton.setVisibility((tab==3||tab==4)?View.GONE:View.VISIBLE);
    }
    private int filterIndex(){return radius==25?0:radius==50?1:radius==100?2:3;}
    private void select(int index) {
        disposeMap();
        disposeProvider();
        if(index<0||index>=LABELS.length)return;
        tab=index;sequence++;
        closeMenu();
        updateTabChrome();
        page.removeAllViews();
        renderHeading();
        if(tab<=5||tab==7)addText("Município: "+PLACES[city]+" · raio "+radius+" km",12,false,MUTED);
        if(tab==13){status.setText("Diário do Explorador · oito páginas");renderDiary();return;}
        if(tab==14){status.setText("Apoio voluntário ao projeto");renderSupport();return;}
        card("Consultando servidor…","Os horários e os estados das fontes serão informados após a resposta.");
        current=null; int request=sequence;
        final String route=routeForTab();
        status.setText("Buscando "+route+" • dados exclusivamente online");
        executor.execute(()->{
            try{
                JSONObject packet=download(route);
                runOnUiThread(()->{if(request!=sequence||isFinishing())return;
                    current=packet;
                    page.removeAllViews();
                    renderHeading();
                    if(tab<=5||tab==7)addText("Município: "+PLACES[city]+" · raio "+radius+" km",12,false,MUTED);
                    status.setText("Resposta recebida "+clock(System.currentTimeMillis()/1000)+" · "+route);
                    render(packet);
                });
            }catch(Exception e) {
                runOnUiThread(()->{if(request!=sequence||isFinishing())return;
                    page.removeAllViews();renderHeading();
                    card("Dados indisponíveis","Não foi possível consultar o servidor: "+
                         (e.getMessage()==null?"Falha de rede.":e.getMessage())+
                         "\nA ausência de dados não significa ausência de focos ou poluentes.");
                    status.setText("Servidor ambiental indisponível; fontes externas mantidas em painel próprio.");
                    if(tab==2) addProvider(NativeProviderPanel.Provider.WINDY,
                        NativeProviderPanel.Provider.WINDY, NativeProviderPanel.Provider.RADARCLIMA,
                        NativeProviderPanel.Provider.PURPLEAIR, NativeProviderPanel.Provider.IQAIR,
                        NativeProviderPanel.Provider.ACCUWEATHER);
                    else if(tab==3) addProvider(NativeProviderPanel.Provider.PURPLEAIR,
                        NativeProviderPanel.Provider.PURPLEAIR, NativeProviderPanel.Provider.IQAIR);
                    else if(tab==4) addProvider(NativeProviderPanel.Provider.RADARCLIMA,
                        NativeProviderPanel.Provider.RADARCLIMA, NativeProviderPanel.Provider.ACCUWEATHER,
                        NativeProviderPanel.Provider.WINDY);
                });
            }
        });
    }

    private String routeForTab(){
        String id=PLACE_IDS[city];
        switch(tab) {
            case 6:return "/api/radar";
            case 7:return "/api/history?place="+id+"&radius="+radius+"&satellite=all&days="+days;
            case 8:case 11:return "/api/source-health?days=7";
            case 9:return "/api/areas";
            case 10:return "/api/alerts";
            default:return "/api/dashboard?place="+id;
        }
    }
    private JSONObject download(String route) throws Exception {
        if(!route.startsWith("/api/"))throw new IllegalArgumentException("Rota inválida");
        HttpURLConnection c=(HttpURLConnection)new URL(ORIGIN+route).openConnection();
        c.setRequestMethod("GET");c.setConnectTimeout(13000);c.setReadTimeout(17000);
        c.setRequestProperty("Accept","application/json");
        c.setUseCaches(false);c.setRequestProperty("Cache-Control","no-store");
        try {
            int code=c.getResponseCode();
            if(code<200||code>=300)throw new java.io.IOException("HTTP "+code);
            String type=c.getContentType();
            if(type==null||!type.toLowerCase(Locale.ROOT).contains("json"))throw new java.io.IOException("API não retornou JSON");
            ByteArrayOutputStream bytes=new ByteArrayOutputStream();
            byte[] buffer=new byte[8192];
            try(InputStream in=c.getInputStream()){
                int n;
                while((n=in.read(buffer))!=-1){
                    bytes.write(buffer,0,n);
                    if(bytes.size()>3_000_000)throw new java.io.IOException("Resposta acima do limite de segurança");
                }
            }
            JSONObject result=new JSONObject(bytes.toString("UTF-8"));
            if(result.has("error")&&!result.isNull("error"))throw new java.io.IOException(result.optString("error"));
            return result;
        } finally{c.disconnect();}
    }

    private String clock(long seconds){
        if(seconds<=0)return "sem horário";
        SimpleDateFormat f=new SimpleDateFormat("dd/MM/yyyy HH:mm",new Locale("pt","BR"));
        f.setTimeZone(TimeZone.getTimeZone("America/Santarem"));
        return f.format(new Date(seconds*1000));
    }
    private String number(double value,int precision) {
        if(!Double.isFinite(value))return "—";
        return String.format(new Locale("pt","BR"),precision==0?"%.0f":"%.1f",value);
    }
    private String value(JSONObject o,String key,String suffix){
        if(o==null||o.isNull(key))return "indisponível";
        Object v=o.opt(key);
        return v instanceof Number?number(((Number)v).doubleValue(),1)+suffix:String.valueOf(v);
    }
    private double distance(double lat,double lon){
        double a=LATS[city],b=LONS[city],r=Math.PI/180;
        double dLat=(lat-a)*r,dLon=(lon-b)*r;
        double s=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a*r)*Math.cos(lat*r)*Math.sin(dLon/2)*Math.sin(dLon/2);
        return 6371*2*Math.atan2(Math.sqrt(s),Math.sqrt(Math.max(0,1-s)));
    }
    private JSONArray filteredFires(JSONObject data) {
        JSONArray raw=data.optJSONArray("fires"),result=new JSONArray();
        if(raw==null)return result;
        long now=System.currentTimeMillis()/1000;
        for(int i=0;i<raw.length();i++) {
            JSONObject f=raw.optJSONObject(i);if(f==null)continue;
            if(f.optLong("time")<now-hours*3600L||f.optLong("time")>now+300)continue;
            if(distance(f.optDouble("lat"),f.optDouble("lon"))>radius)continue;
            result.put(f);
        }
        return result;
    }
    private JSONObject nearestAir(JSONObject data) {
        JSONArray a=data.optJSONArray("air");if(a==null)return null;
        JSONObject best=null;long now=data.optLong("fetchedAt",System.currentTimeMillis()/1000);
        for(int i=0;i<a.length();i++) {
            JSONObject p=a.optJSONObject(i);if(p==null)continue;
            if(best==null||Math.abs(p.optLong("time")-now)<Math.abs(best.optLong("time")-now))best=p;
        }
        return best;
    }
    private void addNativeMap(JSONObject data){
        disposeMap();
        activeMap = new NativeMapPanel(this,data,LATS[city],LONS[city],radius,hours);
        page.addView(activeMap,new LinearLayout.LayoutParams(-1,-2));
        activeMap.onHostStart();
        activeMap.onHostResume();
    }
    private void disposeMap(){
        if(activeMap!=null){activeMap.close();activeMap=null;}
    }
    private void addProvider(NativeProviderPanel.Provider first, NativeProviderPanel.Provider... choices){
        disposeProvider();
        activeProvider=new NativeProviderPanel(this,LATS[city],LONS[city],first,choices);
        page.addView(activeProvider,new LinearLayout.LayoutParams(-1,-2));
        activeProvider.onHostResume();
    }
    private void disposeProvider(){
        if(activeProvider!=null){activeProvider.close();activeProvider=null;}
    }
    private void render(JSONObject data){
        switch(tab) {
            case 0:renderOverview(data);break;
            case 1:
                card("Focos georreferenciados — projeção nativa",
                     "A base cartográfica vetorial é renderizada pelo MapLibre Android. Gestos, inclinação, focos e camadas ambientais funcionam nativamente; terreno 3D real e linha do tempo animada ainda não foram portados.");
                addNativeMap(data);fireList(data,10);break;
            case 2:
                card("Mapa unificado · camadas nativas",
                    "MapLibre representa focos INPE e PM2,5 modelado. Abaixo, o widget interativo Windy é carregado do próprio provedor em painel web integrado ao APK.");
                addNativeMap(data);
                JSONObject met=data.optJSONObject("weather");
                card("Vento · modelo verificado","Velocidade: "+value(met,"speed"," km/h")+"\nDireção: "+value(met,"direction","°"));
                addProvider(NativeProviderPanel.Provider.WINDY,
                    NativeProviderPanel.Provider.WINDY,NativeProviderPanel.Provider.RADARCLIMA,
                    NativeProviderPanel.Provider.PURPLEAIR,NativeProviderPanel.Provider.IQAIR,
                    NativeProviderPanel.Provider.ACCUWEATHER);
                break;
            case 3:renderAir(data);break;
            case 4:renderWeather(data);break;
            case 5:
                card("Programa Queimadas • INPE", "Focos são detecções térmicas, não área queimada. Dados ausentes não significam ausência de incêndio.");
                addNativeMap(data);fireList(data,25);
                showLink("Consultar INPE diretamente","https://data.inpe.br/queimadas/portal/");break;
            case 6:renderRadar(data);break;
            case 7:renderHistory(data);break;
            case 8:case 11:renderHealth(data);break;
            case 9:renderAreas(data);break;
            case 10:renderAlerts(data);break;
            case 12:renderSources(data);break;
        }
    }
    private void renderOverview(JSONObject data){
        JSONArray fs=filteredFires(data);JSONObject air=nearestAir(data),met=data.optJSONObject("weather");
        card("Focos de calor",fs.length()+" detecções no recorte. Fonte: INPE.\nConsulta: "+clock(data.optLong("fetchedAt")));
        card("Qualidade do ar · CAMS/Open-Meteo","PM2,5 (modelo): "+value(air,"pm25"," µg/m³")+"\nAQI estimado: "+value(air,"aqi","")+"\nVálido em: "+clock(air==null?0:air.optLong("time")));
        card("Meteorologia • modelo","Temperatura: "+value(met,"temperature"," °C")+"\nVento: "+value(met,"speed"," km/h")+"\nUmidade: "+value(met,"humidity"," %"));
        addNativeMap(data);
        showLink("Compartilhar Sentinela",ORIGIN);
    }
    private void renderAir(JSONObject data){
        JSONObject air=nearestAir(data);
        card("Modelo regional, não sensor físico","PM2,5: "+value(air,"pm25"," µg/m³")+"\nPM10: "+value(air,"pm10"," µg/m³")+"\nÍndice AQI: "+value(air,"aqi","")+"\nReferência: "+clock(air==null?0:air.optLong("time")));
        addNativeMap(data);
        activeMap.showAirLayer();
        card("Sensores PurpleAir e IQAir",
            "O mapa acima exibe PM2,5 MODELADO, não leitura física. Use abaixo os mapas originais para consultar sensores e fontes separadamente; indisponibilidade do provedor não equivale a ar limpo.");
        addProvider(NativeProviderPanel.Provider.PURPLEAIR,
            NativeProviderPanel.Provider.PURPLEAIR,NativeProviderPanel.Provider.IQAIR);
    }
    private void renderWeather(JSONObject data){
        JSONObject m=data.optJSONObject("weather");
        card("Condições numéricas · modelo","Temperatura: "+value(m,"temperature"," °C")+"\nUmidade: "+value(m,"humidity"," %")+"\nVento: "+value(m,"speed"," km/h")+"\nDireção: "+value(m,"direction","°")+"\nChuva: "+value(m,"rain"," mm")+"\nHora do dado: "+clock(m==null?0:m.optLong("time")));
        card("Mapas de previsão integrados",
            "RadarClima, AccuWeather e Windy são carregados em painéis próprios do aplicativo. Mantêm autoria, data de atualização e restrições da fonte original. Sem scraping de dados.");
        addProvider(NativeProviderPanel.Provider.RADARCLIMA,
            NativeProviderPanel.Provider.RADARCLIMA,
            NativeProviderPanel.Provider.ACCUWEATHER,NativeProviderPanel.Provider.WINDY);
    }
    private void fireList(JSONObject data,int limit){
        JSONArray a=filteredFires(data);
        addText("Registros do INPE ("+a.length()+")",18,true,GREEN);
        if(a.length()==0){card("Sem registros no recorte","Verifique o status da fonte antes de interpretar o resultado.");return;}
        for(int i=0;i<Math.min(a.length(),limit);i++){
            JSONObject f=a.optJSONObject(i);if(f==null)continue;
            card("Foco "+(i+1)+" · "+f.optString("satellite","satélite não informado"),
                 "Local: "+number(f.optDouble("lat"),1)+", "+number(f.optDouble("lon"),1)+
                 "\nHora: "+clock(f.optLong("time"))+
                 "\nFRP: "+value(f,"frp"," MW")+
                 "\nFonte: "+f.optString("source","INPE"));
        }
        if(a.length()>limit)addText("Exibidos "+limit+" dos "+a.length()+" registros.",12,false,MUTED);
    }
    private void renderRadar(JSONObject data){
        JSONObject run=data.optJSONObject("run");
        card("Execução da coleta de notícias",run==null?"Sem execução registrada.":
             "Status: "+run.optString("status","não informado")+"\nÚltima coleta: "+clock(run.optLong("completedAt"))+
             "\nFontes verificadas: "+run.optInt("checked")+"\nDisponíveis: "+run.optInt("available"));
        JSONArray a=data.optJSONArray("items");
        if(a==null||a.length()==0){card("Sem notícias","Ausência de itens não confirma ausência de ocorrências.");return;}
        int shown=0;
        for(int i=0;i<a.length()&&shown<20;i++){
            JSONObject item=a.optJSONObject(i);if(item==null)continue;
            if(item.optLong("publishedAt")<System.currentTimeMillis()/1000-30*86400L)continue;
            String title=item.optString("title","Sem título");
            card(title,"Publicado: "+clock(item.optLong("publishedAt"))+
                 "\nTema: "+item.optString("topic","")+"\nFonte: "+item.optString("sourceId",""));
            showLink("Abrir notícia na fonte",item.optString("url"));shown++;
        }
        if(shown==0)card("Sem itens recentes","A fonte pode ter notícias antigas; confira os horários.");
    }
    private void renderHistory(JSONObject data){
        LinearLayout row=horizontal();
        row.addView(button("7 dias",()->{days=7;select(tab);}));
        row.addView(button("30 dias",()->{days=30;select(tab);}));
        page.addView(row);
        card("Cobertura histórica","Período: "+data.optInt("days")+" dias.\nInício do arquivo: "+
            clock(data.optLong("archiveStartedAt"))+"\nDado modelado importado: "+
            clock(data.optLong("modelImportedAt"))+"\nFaltas na coleta são exibidas, nunca convertidas em zero.");
        JSONArray a=data.optJSONArray("daily");
        if(a==null||a.length()==0){card("Sem série histórica","Não há dias disponíveis.");return;}
        for(int i=a.length()-1;i>=0;i--){
            JSONObject d=a.optJSONObject(i);if(d==null)continue;
            card(d.optString("day","Dia"),"Focos: "+value(d,"fireCount","")+
                    " | Cobertura: "+d.optString("fireCoverage","indisponível")+
                    "\nPM2,5 médio: "+value(d,"pm25"," µg/m³")+
                    "\nAmostras: "+d.optInt("pmSamples")+
                    " | Notícias: "+d.optInt("newsPublications"));
        }
    }
    private void renderHealth(JSONObject data){
        JSONArray a=data.optJSONArray("sources");
        card(tab==11?"Coleta e disponibilidade":"Saúde das fontes",
             "Início do histórico: "+clock(data.optLong("startedAt"))+
             "\nJanela: "+data.optInt("days")+" dias.\nCada fonte conserva status, horário e método.");
        if(a==null||a.length()==0){card("Fontes indisponíveis","Nenhum diagnóstico retornou do servidor.");return;}
        int healthy=0;
        for(int i=0;i<a.length();i++){
            JSONObject s=a.optJSONObject(i);if(s==null)continue;
            JSONObject latest=s.optJSONObject("latest");
            if(latest!=null&&"ok".equals(latest.optString("status")))healthy++;
            card(s.optString("name",s.optString("id",s.optString("sourceId","Fonte"))),
                 "Estado: "+(latest==null?"Sem consulta":latest.optString("status","indisponível"))+
                 "\nÚltima: "+clock(latest==null?0:latest.optLong("checkedAt"))+
                 "\nRespostas: "+s.optInt("responses")+" / "+s.optInt("checks")+
                 "\n"+(latest==null?"Sem detalhes":latest.optString("detail","")));
        }
        addText("Fontes com último status OK: "+healthy+" de "+a.length(),12,true,GREEN);
    }
    private void renderAreas(JSONObject data){
        card("Áreas de interesse (consulta nativa)",
             "Leitura das geometrias registradas no servidor. A edição e a sincronização de polígonos exigem autorização e ainda não estão disponíveis neste aplicativo.");
        JSONArray a=data.optJSONArray("areas");
        if(a==null||a.length()==0){card("Sem áreas cadastradas","O servidor não retornou áreas de interesse.");return;}
        for(int i=0;i<a.length();i++){
            JSONObject item=a.optJSONObject(i);if(item==null)continue;
            card(item.optString("name","Área "+(i+1)),
                 "Tipo: "+item.optString("kind",item.optString("type","não informado"))+
                 "\nIdentificador: "+item.optString("id","—"));
        }
    }
    private void renderAlerts(JSONObject data){
        JSONObject config=data.optJSONObject("config");
        JSONArray rules=config==null?null:config.optJSONArray("rules"),events=data.optJSONArray("events");
        card("Monitoramento de alertas",
             "Regras cadastradas: "+(rules==null?0:rules.length())+
             "\nEventos recentes: "+(events==null?0:events.length())+
             "\nÚltima avaliação: "+clock(data.optLong("evaluatedAt"))+
             "\nConfiguração administrativa não está habilitada nesta versão nativa.");
        if(events!=null)for(int i=0;i<Math.min(events.length(),25);i++){
            JSONObject e=events.optJSONObject(i);if(e==null)continue;
            card(e.optString("title",e.optString("label","Alerta "+(i+1))),
                 e.optString("message",e.optString("detail",""))+
                 "\nRegistrado em: "+clock(e.optLong("createdAt")));
        }
    }
    private void renderSources(JSONObject data){
        card("Método e evidência",
             "Detecção do INPE: pixel de calor; não é área queimada. CAMS/Open-Meteo: estimativa do modelo, não sensor. Um mesmo modelo apresentado por dois painéis não constitui duas medições independentes.");
        JSONArray sources=data.optJSONArray("sources");
        if(sources!=null)for(int i=0;i<sources.length();i++){
            JSONObject s=sources.optJSONObject(i);if(s==null)continue;
            card(s.optString("name","Fonte"),"Status: "+s.optString("status","")+
                 "\nHora do dado: "+clock(s.optLong("dataTime"))+
                 "\nConsultado: "+clock(s.optLong("checkedAt"))+
                 "\n"+s.optString("detail",""));
            showLink("Abrir referência da fonte",s.optString("url"));
        }
    }
    private static final String[] DIARY_TITLES={"Povos Originários","Aldeia dos Tapajós",
        "Barbosa Rodrigues","Expedição Científica","Ciclo da Borracha",
        "Fordlândia e a Região","Rio Tapajós e Navegação","Biodiversidade e Conservação"};
    private static final String[] DIARY_TEXT={
        "O território Tapajós já era conhecido e habitado por povos com histórias, línguas e territórios diversos antes da colonização. A continuidade dessas comunidades precisa ser reconhecida.",
        "A história de Santarém não começou com a missão jesuítica de 1661. A região possuía ocupação e culturas indígenas anteriores.",
        "Em 1875 João Barbosa Rodrigues publicou uma obra sobre o rio Tapajós. Relatos históricos exigem leitura crítica de seu contexto.",
        "A expedição de 1986 aos rios Xingu e Tapajós documentou deslocamentos e observações técnicas, inclusive em Itaituba e Fordlândia.",
        "A produção de borracha conectou a Amazônia ao mercado internacional, mas também envolveu desigualdade, trabalho e migrações.",
        "Fordlândia, em Aveiro, foi implantada em 1927. Sua história industrial e patrimonial continua relevante para a região.",
        "O Tapajós é via de circulação e meio de vida. Mapas ilustrativos não substituem cartas e avisos oficiais para navegação.",
        "A conservação exige conhecimento científico, participação comunitária e respeito aos territórios e à diversidade da floresta."
    };
    private static final String[] DIARY_URLS={
        "https://www.gov.br/funai/pt-br/acesso-a-informacao/institucional/coordenacoes-regionais-funai/cr-tapajos",
        "https://santarem.pa.gov.br/institucional/historia-de-santarem",
        "https://digital.bbm.usp.br/handle/bbm/4449",
        "https://www.infoteca.cnptia.embrapa.br/bitstream/doc/385792/3/CPATUDoc99.pdf",
        "https://visite.museus.gov.br/instituicoes/museu-do-seringal-vila-paraiso/",
        "https://www.mpf.mp.br/o-mpf/unidades/pr-pa/noticias/justica-federal-atende-a-pedido-do-mpf-e-condena-poder-publico-a-recuperar-o-complexo-historico-de-fordlandia-pa",
        "https://www.gov.br/ana/pt-br/panorama-das-aguas/divisoes-hidrograficas/rios-do-brasil/rio-tapajos",
        "https://brasil.mapbiomas.org/"
    };
    private void renderDiary(){
        card("Página "+(diaryPage+1)+" / 8 · "+DIARY_TITLES[diaryPage],DIARY_TEXT[diaryPage]);
        showLink("Consultar a referência institucional",DIARY_URLS[diaryPage]);
        LinearLayout controls=horizontal();
        controls.addView(button("← Anterior",()->{diaryPage=(diaryPage+7)%8;page.removeAllViews();renderHeading();renderDiary();}));
        controls.addView(button("Próxima →",()->{diaryPage=(diaryPage+1)%8;page.removeAllViews();renderHeading();renderDiary();}));
        page.addView(controls);
        addText("Adaptação editorial abreviada das oito páginas do Diário original. Ilustrações e interações do site ainda não foram portadas.",12,false,MUTED);
    }
    private void renderSupport(){
        card("Apoio voluntário",
             "O Sentinela fica de olho na Amazônia. Quem cuida de mapas, servidores e bugs às vezes precisa de um café — ou dois!\n\nA plataforma continua gratuita. Nenhuma chave Pix é inventada ou armazenada no APK.");
        card("Pix empresarial","Para verificar o favorecido e a disponibilidade do Pix, consulte a página oficial do projeto. A tela nativa não processa pagamentos.");
        showLink("Consultar apoio no site oficial",ORIGIN+"/apoie");
        page.addView(button("Compartilhar o projeto",()->{
            Intent i=new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");i.putExtra(Intent.EXTRA_TEXT,"Sentinela Tapajós — "+ORIGIN);
            startActivity(Intent.createChooser(i,"Compartilhar Sentinela"));
        }));
    }
    @Override public void onBackPressed() {
        if(menuOverlay!=null){closeMenu();return;}
        if(activeProvider!=null&&activeProvider.canGoBack())activeProvider.goBack();
        else if(tab!=0) select(0);
        else super.onBackPressed();
    }
    @Override protected void onStart(){super.onStart();if(activeMap!=null)activeMap.onHostStart();}
    @Override protected void onResume(){super.onResume();if(activeMap!=null)activeMap.onHostResume();
        if(activeProvider!=null)activeProvider.onHostResume();}
    @Override protected void onPause(){if(activeMap!=null)activeMap.onHostPause();
        if(activeProvider!=null)activeProvider.onHostPause();super.onPause();}
    @Override protected void onStop(){if(activeMap!=null)activeMap.onHostStop();super.onStop();}
    @Override public void onLowMemory(){if(activeMap!=null)activeMap.onHostLowMemory();super.onLowMemory();}
    @Override protected void onDestroy(){disposeProvider();disposeMap();sequence++;executor.shutdownNow();super.onDestroy();}
}
