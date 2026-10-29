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
import android.widget.HorizontalScrollView;
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
 * Sem WebView, Custom Tabs ou armazenamento de dados ambientais no aparelho.
 * Mapas proprietários, 3D real e operações administrativas não são reproduzidos.
 */
public final class NativeDashboardActivity extends Activity {
    private static final String ORIGIN="https://sentinela-tapajos-ar.gyantardeli.chatgpt.site";
    private static final String[] IDS={"overview","fire3d","maps","purpleair","weather","inpe","radar",
            "history","health","areas","alerts","collection","sources","diary","apoie"};
    private static final String[] LABELS={"Visão geral","Mapa 3D","Mapas","Qualidade do ar",
            "Previsão","Queimadas INPE","Radar regional","Histórico","Saúde das fontes",
            "Áreas de interesse","Alertas","Coleta","Fontes e método","Diário","Apoie"};
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
    private LinearLayout page, nav;
    private Spinner cityControl;
    private TextView status;
    private boolean suppressCityEvents=false;
    private JSONObject current;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
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
        wrap.setBackgroundColor(Color.WHITE);
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
        LinearLayout root=vertical();root.setBackgroundColor(BG);root.setFitsSystemWindows(true);setContentView(root);
        LinearLayout header=horizontal();header.setPadding(dp(13),dp(8),dp(12),dp(6));header.setBackgroundColor(GREEN);
        ImageView logo=new ImageView(this);logo.setImageResource(R.drawable.guardian);
        header.addView(logo,new LinearLayout.LayoutParams(dp(48),dp(48)));
        TextView name=text("SENTINELA TAPAJÓS\nMonitoramento ambiental • Android",16,true,Color.WHITE);
        name.setPadding(dp(12),0,0,0);header.addView(name);root.addView(header);
        HorizontalScrollView scroller=new HorizontalScrollView(this);scroller.setHorizontalScrollBarEnabled(false);
        nav=horizontal();nav.setPadding(dp(7),dp(5),dp(7),dp(5));scroller.addView(nav);root.addView(scroller);
        LinearLayout filters=horizontal();filters.setPadding(dp(10),dp(2),dp(10),dp(2));
        cityControl=new Spinner(this);
        ArrayAdapter<String> adapter=new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,PLACES);
        cityControl.setAdapter(adapter);
        filters.addView(cityControl,new LinearLayout.LayoutParams(0,dp(48),1));
        filters.addView(button("Raio / Período",()->new AlertDialog.Builder(this)
                .setTitle("Filtros dos focos")
                .setSingleChoiceItems(new String[]{"25 km | 6 h","50 km | 12 h","100 km | 24 h","200 km | 24 h"},filterIndex(),
                (dialog,selected)->{radius=new int[]{25,50,100,200}[selected];
                    hours=new int[]{6,12,24,24}[selected];dialog.dismiss();select(tab);}).show()));
        filters.addView(button("↻",()->select(tab)));
        root.addView(filters);
        cityControl.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener(){
            public void onNothingSelected(android.widget.AdapterView<?> parent){}
            public void onItemSelected(android.widget.AdapterView<?> parent,View view,int pos,long id){
                if(!suppressCityEvents&&city!=pos){city=pos;select(tab);}
            }
        });
        status=text("Consulta online necessária. Sem cache local.",11,false,MUTED);
        status.setPadding(dp(15),dp(3),dp(15),dp(3));root.addView(status);
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        page=vertical();page.setPadding(dp(15),dp(12),dp(15),dp(28));scroll.addView(page);
    }
    private int filterIndex(){return radius==25?0:radius==50?1:radius==100?2:3;}
    private void select(int index) {
        tab=index;sequence++;
        nav.removeAllViews();
        for(int i=0;i<LABELS.length;i++) {
            final int next=i;
            Button b=button(LABELS[i],()->select(next));
            b.setTextColor(i==tab?Color.WHITE:GREEN);
            if(i==tab)b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(GREEN));
            nav.addView(b);
        }
        page.removeAllViews();
        addText(LABELS[tab],23,true,GREEN);
        addText("Consulta municipal: "+PLACES[city]+" | "+radius+" km | "+hours+" h",12,false,MUTED);
        if(tab==13){renderDiary();return;}
        if(tab==14){renderSupport();return;}
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
                    addText(LABELS[tab],23,true,GREEN);
                    addText("Município: "+PLACES[city]+" · raio "+radius+" km",12,false,MUTED);
                    status.setText("Resposta recebida "+clock(System.currentTimeMillis()/1000)+" · "+route);
                    render(packet);
                });
            }catch(Exception e) {
                runOnUiThread(()->{if(request!=sequence||isFinishing())return;
                    page.removeAllViews();addText(LABELS[tab],23,true,GREEN);
                    card("Dados indisponíveis","Não foi possível consultar o servidor: "+
                         (e.getMessage()==null?"Falha de rede.":e.getMessage())+
                         "\nA ausência de dados não significa ausência de focos ou poluentes.");
                    status.setText("Erro de consulta. Requer internet e acesso público à API.");
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
        NativeFiresView map=new NativeFiresView(this);
        map.setFires(filteredFires(data),LATS[city],LONS[city],radius,hours);
        page.addView(map,new LinearLayout.LayoutParams(-1,dp(300)));
    }
    private void render(JSONObject data){
        switch(tab) {
            case 0:renderOverview(data);break;
            case 1:
                card("Focos georreferenciados — projeção nativa",
                     "A visualização 2D abaixo é produzida pelo Android diretamente a partir das coordenadas INPE. O terreno 3D real e a linha do tempo animada ainda não foram portados.");
                addNativeMap(data);fireList(data,10);break;
            case 2:
                card("Comparação nativa","Focos no entorno versus valores meteorológicos do servidor. Não há painel Windy incorporado nem mapa-base de satélite nesta versão.");
                addNativeMap(data);
                JSONObject met=data.optJSONObject("weather");
                card("Vento","Velocidade: "+value(met,"speed"," km/h")+"\nDireção: "+value(met,"direction","°"));
                showLink("Windy • abrir provedor externo","https://www.windy.com/");break;
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
        card("Sensores PurpleAir e IQAir","Os mapas interativos de terceiros não foram recriados como SDK nativo. Não atribua a este valor modelado a condição de leitura local de sensor.");
        showLink("PurpleAir • mapa oficial","https://map.purpleair.com/");
        showLink("IQAir • mapa oficial","https://www.iqair.com/br/air-quality-map");
    }
    private void renderWeather(JSONObject data){
        JSONObject m=data.optJSONObject("weather");
        card("Condições numéricas · modelo","Temperatura: "+value(m,"temperature"," °C")+"\nUmidade: "+value(m,"humidity"," %")+"\nVento: "+value(m,"speed"," km/h")+"\nDireção: "+value(m,"direction","°")+"\nChuva: "+value(m,"rain"," mm")+"\nHora do dado: "+clock(m==null?0:m.optLong("time")));
        card("Previsões externas","RadarClima, AccuWeather e Windy têm suas próprias referências de horário. As camadas animadas proprietárias não estão reproduzidas nativamente.");
        showLink("Clima & Radar","https://www.climaeradar.com.br/radarclima");
        showLink("AccuWeather","https://www.accuweather.com/");
        showLink("Windy","https://www.windy.com/");
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
        addText("Diário do Explorador",23,true,GREEN);
        card("Página "+(diaryPage+1)+" / 8 · "+DIARY_TITLES[diaryPage],DIARY_TEXT[diaryPage]);
        showLink("Consultar a referência institucional",DIARY_URLS[diaryPage]);
        LinearLayout controls=horizontal();
        controls.addView(button("← Anterior",()->{diaryPage=(diaryPage+7)%8;page.removeAllViews();renderDiary();}));
        controls.addView(button("Próxima →",()->{diaryPage=(diaryPage+1)%8;page.removeAllViews();renderDiary();}));
        page.addView(controls);
        addText("Adaptação editorial abreviada das oito páginas do Diário original. Ilustrações e interações do site ainda não foram portadas.",12,false,MUTED);
    }
    private void renderSupport(){
        addText("Me paga um café? ☕",23,true,GREEN);
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
        if(tab!=0) select(0); else super.onBackPressed();
    }
    @Override protected void onDestroy(){sequence++;executor.shutdownNow();super.onDestroy();}
}
