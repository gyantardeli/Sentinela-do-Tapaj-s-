package br.com.sentinelatapajos.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.os.Bundle;
import android.view.MotionEvent;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;

import org.maplibre.android.MapLibre;
import org.maplibre.android.camera.CameraPosition;
import org.maplibre.android.geometry.LatLng;
import org.maplibre.android.maps.MapView;
import org.maplibre.android.maps.MapLibreMap;
import org.maplibre.android.maps.Style;
import org.maplibre.android.style.layers.CircleLayer;
import org.maplibre.android.style.layers.PropertyFactory;
import org.maplibre.android.style.sources.GeoJsonSource;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Mapa vetorial MapLibre Native; dados ambientais apenas por APIs oficiais do projeto. */
public final class NativeMapPanel extends LinearLayout {
    private static final String STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
    private static final String AIR_URL = "https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/api/air-map";
    private static final String EMPTY = "{\"type\":\"FeatureCollection\",\"features\":[]}";
    private static final String FIRE_SOURCE = "sentinela-fire-points";
    private static final int[] AIR_COLORS = {0xff39885a,0xffe1c34c,0xffe38c32,0xffcc5758,0xff8f61ab,0xff75344e};
    private final Activity host;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final MapView mapView;
    private final TextView legend;
    private final Button fireButton, airButton, bothButton, tiltButton;
    private MapLibreMap map;
    private Style style;
    private JSONObject dashboard, airPacket;
    private int mode = 0, frameOffset = 0, radiusKm, hours;
    private double centerLat, centerLon;
    private boolean tilted = false, closed = false, started = false, resumed = false;
    private int airRequest = 0;
    private JSONArray visibleFires = new JSONArray(), visibleAir = new JSONArray();

    public NativeMapPanel(Activity activity, JSONObject snapshot, double lat, double lon, int radius, int hours) {
        super(activity);
        host = activity;
        dashboard = snapshot;
        centerLat = lat;
        centerLon = lon;
        radiusKm = radius;
        this.hours = hours;
        setOrientation(VERTICAL);
        setBackgroundColor(0xffeef3e8);
        setPadding(dp(2), dp(6), dp(2), dp(6));

        MapLibre.getInstance(host);
        LinearLayout controls = new LinearLayout(host);
        controls.setOrientation(HORIZONTAL);
        fireButton = button("Focos");
        airButton = button("PM2,5");
        bothButton = button("Ambos");
        tiltButton = button("Inclinar");
        controls.addView(fireButton, new LayoutParams(0, dp(48), 1));
        controls.addView(airButton, new LayoutParams(0, dp(48), 1));
        controls.addView(bothButton, new LayoutParams(0, dp(48), 1));
        controls.addView(tiltButton, new LayoutParams(0, dp(48), 1));
        addView(controls);

        mapView = new MapView(host);
        mapView.onCreate(null);
        addView(mapView, new LayoutParams(-1, dp(355)));
        // O ScrollView externo não deve roubar gesto de arraste e zoom do mapa.
        mapView.setOnTouchListener((v,event) -> {
            if(event.getActionMasked()==MotionEvent.ACTION_DOWN ||
               event.getActionMasked()==MotionEvent.ACTION_MOVE) {
                v.getParent().requestDisallowInterceptTouchEvent(true);
                NativeMapPanel.this.requestDisallowInterceptTouchEvent(true);
            }
            if(event.getActionMasked()==MotionEvent.ACTION_UP ||
               event.getActionMasked()==MotionEvent.ACTION_CANCEL)
                v.getParent().requestDisallowInterceptTouchEvent(false);
            return false;
        });

        legend = new TextView(host);
        legend.setTextSize(12);
        legend.setTextColor(0xff244e37);
        legend.setPadding(dp(10),dp(9),dp(10),dp(10));
        addView(legend);
        TextView credit = new TextView(host);
        credit.setText("Mapa vetorial: © OpenStreetMap · OpenFreeMap  |  Dados: INPE e CAMS/Open-Meteo\nRequer internet · sem pacote offline · inclinação não é relevo 3D.");
        credit.setTextColor(0xff637568);
        credit.setTextSize(10);
        credit.setPadding(dp(9), 0, dp(9), dp(8));
        addView(credit);

        fireButton.setOnClickListener(v -> selectMode(0));
        airButton.setOnClickListener(v -> selectMode(1));
        bothButton.setOnClickListener(v -> selectMode(2));
        tiltButton.setOnClickListener(v -> toggleTilt());
        updateButtons();
        legend.setText("Carregando mapa vetorial…");
        mapView.getMapAsync(ready -> {
            if(closed) return;
            map = ready;
            map.setMinZoomPreference(2);
            map.setMaxZoomPreference(17);
            map.setTileCacheEnabled(false);
            map.setCameraPosition(new CameraPosition.Builder()
                .target(new LatLng(centerLat, centerLon))
                .zoom(radiusKm<=25?10.0:radiusKm<=50?9.0:radiusKm<=100?8.0:7.0)
                .build());
            map.setStyle(STYLE_URL, this::prepareStyle);
            map.addOnMapClickListener(point -> {
                describeNearest(point);
                return false;
            });
        });
    }

    private int dp(float value) {
        return Math.round(value*getResources().getDisplayMetrics().density);
    }

    private Button button(String label) {
        Button b = new Button(host);
        b.setAllCaps(false);
        b.setTextSize(11);
        b.setText(label);
        return b;
    }

    private void updateButtons() {
        fireButton.setEnabled(mode != 0);
        airButton.setEnabled(mode != 1);
        bothButton.setEnabled(mode != 2);
        tiltButton.setText(tilted ? "Vista 2D" : "Inclinar");
    }

    private void selectMode(int nextMode) {
        if(closed) return;
        mode=nextMode;
        updateButtons();
        if(mode!=0 && airPacket==null) loadAirData();
        redraw();
    }

    private void toggleTilt() {
        if(map==null || closed) return;
        tilted=!tilted;
        CameraPosition old=map.getCameraPosition();
        map.setCameraPosition(new CameraPosition.Builder()
           .target(old.target).zoom(old.zoom).bearing(old.bearing)
           .tilt(tilted?45.0:0.0).build());
        updateButtons();
    }

    private void prepareStyle(Style loaded) {
        if(closed)return;
        style=loaded;
        loaded.addSource(new GeoJsonSource(FIRE_SOURCE, EMPTY));
        CircleLayer fires = new CircleLayer("sentinela-fires",FIRE_SOURCE);
        fires.setProperties(
            PropertyFactory.circleRadius(5.5f),
            PropertyFactory.circleColor(0xffed5b23),
            PropertyFactory.circleStrokeColor(Color.WHITE),
            PropertyFactory.circleStrokeWidth(1.2f),
            PropertyFactory.circleOpacity(.9f)
        );
        loaded.addLayer(fires);
        for(int band=0;band<AIR_COLORS.length;band++){
            String id="sentinela-air-"+band;
            loaded.addSource(new GeoJsonSource(id,EMPTY));
            CircleLayer layer=new CircleLayer("sentinela-air-circle-"+band,id);
            layer.setProperties(
                PropertyFactory.circleRadius(12f),
                PropertyFactory.circleColor(AIR_COLORS[band]),
                PropertyFactory.circleOpacity(.66f),
                PropertyFactory.circleStrokeColor(0xfffbf9ec),
                PropertyFactory.circleStrokeWidth(.7f)
            );
            loaded.addLayerBelow(layer,"sentinela-fires");
        }
        redraw();
    }

    private static double distance(double a,double b,double c,double d){
        double lat=Math.toRadians(c-a),lon=Math.toRadians(d-b);
        double h=Math.pow(Math.sin(lat/2),2)+
            Math.cos(Math.toRadians(a))*Math.cos(Math.toRadians(c))*Math.pow(Math.sin(lon/2),2);
        return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
    }

    private void redraw() {
        if(closed)return;
        JSONArray fireFeatures=new JSONArray();
        visibleFires=new JSONArray();
        JSONArray raw=dashboard==null?null:dashboard.optJSONArray("fires");
        long now=System.currentTimeMillis()/1000;
        if(raw!=null)for(int i=0;i<raw.length()&&visibleFires.length()<1800;i++){
            JSONObject f=raw.optJSONObject(i);
            if(f==null)continue;
            double lat=f.optDouble("lat",Double.NaN),lon=f.optDouble("lon",Double.NaN);
            long time=f.optLong("time");
            if(!Double.isFinite(lat)||!Double.isFinite(lon)||
               time<now-hours*3600L||time>now+300 ||
               distance(centerLat,centerLon,lat,lon)>radiusKm)continue;
            fireFeatures.put(feature(lon,lat,"Foco INPE",f.optString("satellite","satélite não informado")));
            visibleFires.put(f);
        }
        if(style!=null){
            GeoJsonSource fs=style.getSourceAs(FIRE_SOURCE);
            if(fs!=null)fs.setGeoJson(mode==1?EMPTY:collection(fireFeatures));
        }
        visibleAir=new JSONArray();
        JSONArray[] airFeatures=new JSONArray[AIR_COLORS.length];
        for(int i=0;i<airFeatures.length;i++)airFeatures[i]=new JSONArray();
        String modelState="sem dados";
        long selectedTime=0;
        if(mode!=0 && airPacket!=null) {
            JSONObject model=airPacket.optJSONObject("model");
            modelState=model==null?"sem diagnóstico":model.optString("state","desconhecido");
            JSONArray times=airPacket.optJSONArray("times");
            JSONArray cells=airPacket.optJSONArray("cells");
            int frame=-1;
            if(times!=null) {
                for(int i=0;i<times.length();i++)if(times.optLong(i)<=now)frame=i;
                frame=Math.min(times.length()-1,Math.max(0,frame+frameOffset));
                if(frame>=0&&frame<times.length()) selectedTime=times.optLong(frame);
            }
            if(cells!=null&&selectedTime>0&&!"unavailable".equals(modelState))
                for(int i=0;i<cells.length();i++){
                    JSONObject cell=cells.optJSONObject(i);
                    if(cell==null||cell.optLong("collectedAt")<now-21600L)continue;
                    double lat=cell.optDouble("lat",Double.NaN),lon=cell.optDouble("lon",Double.NaN);
                    if(!Double.isFinite(lat)||!Double.isFinite(lon)||distance(centerLat,centerLon,lat,lon)>radiusKm)continue;
                    JSONArray values=cell.optJSONArray("aqiPm25");
                    JSONArray pm=cell.optJSONArray("pm25");
                    if(values==null||pm==null||frame>=values.length())continue;
                    double aqi=values.isNull(frame)?Double.NaN:values.optDouble(frame,Double.NaN);
                    double micro=pm.isNull(frame)?Double.NaN:pm.optDouble(frame,Double.NaN);
                    if(!Double.isFinite(aqi)||!Double.isFinite(micro))continue;
                    int band=aqi<=50?0:aqi<=100?1:aqi<=150?2:aqi<=200?3:aqi<=300?4:5;
                    airFeatures[band].put(feature(lon,lat,"CAMS · PM2,5",String.format(Locale.US,"%.1f µg/m³ | AQI %.0f",micro,aqi)));
                    JSONObject copy=new JSONObject();
                    try{copy.put("lat",lat);copy.put("lon",lon);copy.put("aqi",aqi);copy.put("pm25",micro);}catch(Exception ignored){}
                    visibleAir.put(copy);
                }
        }
        if(style!=null) for(int band=0;band<airFeatures.length;band++){
            GeoJsonSource source=style.getSourceAs("sentinela-air-"+band);
            if(source!=null)source.setGeoJson(mode==0?EMPTY:collection(airFeatures[band]));
        }
        String label=(mode==0?"Focos INPE: "+visibleFires.length():
                      mode==1?"Grade CAMS/Open-Meteo: "+visibleAir.length()+" pontos":
                      "Focos: "+visibleFires.length()+" · Modelo: "+visibleAir.length()+" pontos");
        label+=" | "+(mode==0?"últimas "+hours+" h":"estado "+modelState+
            " · quadro "+(selectedTime==0?"indisponível":new java.text.SimpleDateFormat("dd/MM HH:mm",new Locale("pt","BR")){{
                setTimeZone(java.util.TimeZone.getTimeZone("America/Santarem"));
            }}.format(new java.util.Date(selectedTime*1000))));
        legend.setText(label);
    }

    private JSONObject feature(double lon,double lat,String type,String detail){
        JSONObject geometry=new JSONObject(), f=new JSONObject(),props=new JSONObject();
        try{
            geometry.put("type","Point");
            geometry.put("coordinates",new JSONArray().put(lon).put(lat));
            props.put("kind",type);props.put("detail",detail);
            f.put("type","Feature");f.put("geometry",geometry);f.put("properties",props);
        }catch(Exception ignored){}
        return f;
    }
    private String collection(JSONArray features) {
        JSONObject root=new JSONObject();
        try{root.put("type","FeatureCollection");root.put("features",features);}catch(Exception ignored){}
        return root.toString();
    }

    private void describeNearest(LatLng tap) {
        JSONObject best=null;double nearest=Double.MAX_VALUE;
        if(mode!=1)for(int i=0;i<visibleFires.length();i++){
            JSONObject item=visibleFires.optJSONObject(i);if(item==null)continue;
            double d=distance(tap.getLatitude(),tap.getLongitude(),item.optDouble("lat"),item.optDouble("lon"));
            if(d<nearest){best=item;nearest=d;}
        }
        if(best!=null&&nearest<=10) {
            new AlertDialog.Builder(host).setTitle("Detecção INPE")
                .setMessage("Satélite: "+best.optString("satellite","não informado")+
                    "\nLat/Lon: "+best.optDouble("lat")+" / "+best.optDouble("lon")+
                    "\nHora UTC: "+new java.util.Date(best.optLong("time")*1000)+
                    "\nDistância do toque: "+String.format(Locale.US,"%.1f km",nearest)+
                    "\nFoco térmico não equivale a área queimada.")
                .setPositiveButton("Fechar",null).show();
            return;
        }
        if(mode!=0){
            JSONObject air=null;nearest=Double.MAX_VALUE;
            for(int i=0;i<visibleAir.length();i++){
                JSONObject item=visibleAir.optJSONObject(i);if(item==null)continue;
                double d=distance(tap.getLatitude(),tap.getLongitude(),item.optDouble("lat"),item.optDouble("lon"));
                if(d<nearest){air=item;nearest=d;}
            }
            if(air!=null&&nearest<=35){
                new AlertDialog.Builder(host).setTitle("Estimativa CAMS/Open-Meteo")
                    .setMessage(String.format(Locale.US,"PM2,5: %.1f µg/m³\nAQI modelado: %.0f\nDistância da célula: %.1f km\nNão é medição física no local.",
                        air.optDouble("pm25"),air.optDouble("aqi"),nearest))
                    .setPositiveButton("Fechar",null).show();
            }
        }
    }

    private void loadAirData(){
        if(closed)return;
        int current=++airRequest;
        legend.setText("Consultando estimativas PM2,5 por grade…");
        worker.execute(()->{
            try{
                HttpURLConnection connection=(HttpURLConnection)new URL(AIR_URL).openConnection();
                connection.setConnectTimeout(12000);connection.setReadTimeout(25000);
                connection.setRequestProperty("Accept","application/json");
                connection.setRequestProperty("Cache-Control","no-store");
                connection.setUseCaches(false);
                JSONObject data;
                try{
                    if(connection.getResponseCode()!=200)throw new java.io.IOException("HTTP "+connection.getResponseCode());
                    String contentType=connection.getContentType();
                    if(contentType==null||!contentType.toLowerCase(Locale.ROOT).contains("json"))
                        throw new java.io.IOException("Servidor não retornou JSON");
                    ByteArrayOutputStream bytes=new ByteArrayOutputStream();
                    try(InputStream in=connection.getInputStream()){
                        byte[] buf=new byte[8192];int n;
                        while((n=in.read(buf))>=0) {
                            bytes.write(buf,0,n);
                            if(bytes.size()>2_000_000)throw new java.io.IOException("Grade excedeu limite seguro");
                        }
                    }
                    data=new JSONObject(bytes.toString("UTF-8"));
                    if(data.has("error"))throw new java.io.IOException(data.optString("error"));
                }finally{connection.disconnect();}
                host.runOnUiThread(()->{if(closed||current!=airRequest)return;airPacket=data;redraw();});
            }catch(Exception e){
                String message=e.getMessage();
                host.runOnUiThread(()->{
                    if(closed||current!=airRequest)return;
                    airPacket=null;
                    redraw();
                    legend.setText("Grade PM2,5 indisponível: "+(message==null?"erro de conexão":message)+
                            ". Não interpretar como ar limpo.");
                });
            }
        });
    }

    public void onHostStart() {if(!closed&&!started){mapView.onStart();started=true;}}
    public void onHostResume(){if(!closed&&!resumed){mapView.onResume();resumed=true;}}
    public void onHostPause(){if(!closed&&resumed){mapView.onPause();resumed=false;}}
    public void onHostStop(){if(!closed&&started){mapView.onStop();started=false;}}
    public void onHostLowMemory(){if(!closed)mapView.onLowMemory();}
    public void close(){
        if(closed)return;
        onHostPause();onHostStop();
        closed=true;
        airRequest++;
        worker.shutdownNow();
        mapView.onDestroy();
        map=null;style=null;
    }
}
