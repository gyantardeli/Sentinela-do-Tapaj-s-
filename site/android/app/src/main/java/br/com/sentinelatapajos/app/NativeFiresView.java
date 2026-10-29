package br.com.sentinelatapajos.app;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.view.View;
import org.json.JSONArray;
import org.json.JSONObject;

/** Projeção cartográfica esquemática em Canvas; sem terreno, tiles ou dados simulados. */
public final class NativeFiresView extends View {
    private JSONArray fires = new JSONArray();
    private double lat = -4.2761, lon = -55.9836;
    private int radiusKm = 100, hours = 24;
    private final Paint paint = new Paint(3);

    public NativeFiresView(Context context) {
        super(context);
        setMinimumHeight(dp(260));
        setContentDescription("Mapa esquemático de focos de calor INPE no raio selecionado, sem carta-base");
    }

    public void setFires(JSONArray items, double latitude, double longitude, int radius, int windowHours) {
        fires = items == null ? new JSONArray() : items;
        lat = latitude; lon = longitude; radiusKm = radius; hours = windowHours;
        invalidate();
    }

    private int dp(float value) { return (int)(value * getResources().getDisplayMetrics().density + 0.5f); }

    @Override protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        super.onMeasure(widthMeasureSpec, MeasureSpec.makeMeasureSpec(dp(300), MeasureSpec.EXACTLY));
    }

    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        int w = getWidth(), h = getHeight();
        canvas.drawColor(Color.rgb(227, 239, 229));
        float cx = w * .5f, cy = h * .49f, ring = Math.min(w * .43f, h * .39f);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(dp(1));
        paint.setColor(Color.rgb(188, 208, 191));
        for (int i=1; i<=4; i++) canvas.drawCircle(cx, cy, ring * i / 4f, paint);
        canvas.drawLine(cx-ring, cy, cx+ring, cy, paint);
        canvas.drawLine(cx, cy-ring, cx, cy+ring, paint);
        paint.setStyle(Paint.Style.FILL);
        paint.setTextSize(dp(12));
        paint.setColor(Color.rgb(25, 69, 48));
        canvas.drawText("N", cx-dp(4), cy-ring-dp(6), paint);
        canvas.drawText("Raio "+radiusKm+" km | últimos "+hours+" h", dp(12), dp(22), paint);
        long now = System.currentTimeMillis()/1000;
        int shown = 0;
        double kmLat=111.2, kmLon=Math.max(10,111.2*Math.cos(Math.toRadians(lat)));
        for (int i=0; i<fires.length(); i++) {
            JSONObject f=fires.optJSONObject(i);
            if(f==null) continue;
            double flat=f.optDouble("lat",Double.NaN), flon=f.optDouble("lon",Double.NaN);
            long time=f.optLong("time",0);
            if(!Double.isFinite(flat)||!Double.isFinite(flon)||time<now-hours*3600L||time>now+300)continue;
            double dx=(flon-lon)*kmLon,dy=(flat-lat)*kmLat;
            if(dx*dx+dy*dy>radiusKm*radiusKm)continue;
            float x=(float)(cx+dx/radiusKm*ring),y=(float)(cy-dy/radiusKm*ring);
            paint.setColor(Color.rgb(214, 92, 41));
            canvas.drawCircle(x,y,dp(3),paint);
            shown++;
        }
        paint.setColor(Color.rgb(17, 81, 54));
        canvas.drawCircle(cx,cy,dp(5),paint);
        paint.setTextSize(dp(12));
        canvas.drawText(shown+" focos plotados",dp(12),h-dp(22),paint);
        paint.setColor(Color.rgb(81, 112, 92));
        paint.setTextSize(dp(10));
        canvas.drawText("Esquema de coordenadas, não é mapa de terreno",dp(12),h-dp(7),paint);
    }
}
