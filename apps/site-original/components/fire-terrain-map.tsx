"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LibreMap, GeoJSONSource, RasterTileSource } from "maplibre-gl";
import { Crosshair, Layers, Mountain } from "lucide-react";
import type { InterestArea } from "../lib/areas";
import type { Place } from "../lib/environment";
import { replayBoundary, replayPoints, type ReplayDetection } from "../lib/fire-replay";
import { SATELLITE_TILES, SATELLITE_ATTRIBUTION, type Basemap } from "../lib/satellite-basemap";
import RegionalMap from "./regional-map";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";

type Props = { place: Place; radius: number; area?: InterestArea | null; fires: ReplayDetection[]; cursor: number; selected: string | null; onSelect: (id: string) => void; focus: { lat: number; lon: number; key: string } | null; showEvents: boolean };
const empty = { type: "FeatureCollection" as const, features: [] };

export default function FireTerrainMap(props: Props) {
  const container = useRef<HTMLDivElement>(null), mapRef = useRef<LibreMap | null>(null), latest = useRef(props);
  latest.current = props;
  const [ready, setReady] = useState(false), [error, setError] = useState(""), [terrainError, setTerrainError] = useState(false), [baseError, setBaseError] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>("satellite"), [satelliteError, setSatelliteError] = useState(false);
  const basemapRef = useRef(basemap); basemapRef.current = basemap;
  const [exaggeration, setExaggeration] = useState(1), [tilted, setTilted] = useState(true), [attempt, setAttempt] = useState(0);
  const boundary = useMemo(() => replayBoundary(props.place, props.radius, props.area), [props.place, props.radius, props.area]);
  const points = useMemo(() => replayPoints(props.fires, props.cursor), [props.fires, props.cursor]);
  const groups = useMemo(() => {
    const buckets = new Map<string, ReplayDetection[]>();
    for (const f of props.fires) { const bucket = buckets.get(f.eventId) ?? []; bucket.push(f); buckets.set(f.eventId, bucket); }
    return { type: "FeatureCollection" as const, features: [...buckets].filter(([, fs]) => fs.length > 1).map(([id, fs]) => ({ type: "Feature" as const, properties: { id, count: fs.length }, geometry: { type: "Point" as const, coordinates: [fs.reduce((n, f) => n + f.lon, 0) / fs.length, fs.reduce((n, f) => n + f.lat, 0) / fs.length] } })) };
  }, [props.fires]);

  useEffect(() => {
    let stopped = false, map: LibreMap | null = null, observer: ResizeObserver | null = null;
    function fail(message: string) {
      if (stopped) return;
      observer?.disconnect(); const previous = map; map = null; mapRef.current = null; previous?.remove();
      setReady(false); setError(message);
    }
    const deadline = setTimeout(() => fail("O mapa 3D demorou para responder. O mapa 2D e a lista permanecem disponíveis."), 30000);
    setReady(false); setError(""); setTerrainError(false); setBaseError(false); setSatelliteError(false);
    void import("maplibre-gl").then(lib => {
      if (stopped || !container.current) return;
      lib.setWorkerUrl(workerUrl);
      lib.setWorkerCount(2);
      const p = latest.current;
      map = new lib.Map({ container: container.current, center: [p.place.lon, p.place.lat], zoom: 8, pitch: 55, bearing: -12,
        maxZoom: 15, minZoom: 4, maxPitch: 70, maxBounds: [[-64, -13], [-48, 3]], attributionControl: false,
        maxTileCacheSize: 64, fadeDuration: 0, cooperativeGestures: true,
        transformRequest: url => ({ url, credentials: "same-origin" }),
        style: { version: 8, sources: {
          basemap: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>' },
          satellite: { type: "raster", tiles: [SATELLITE_TILES], tileSize: 256, maxzoom: 14, attribution: SATELLITE_ATTRIBUTION },
          elevation: { type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], encoding: "terrarium", tileSize: 256, maxzoom: 14, attribution: '<a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer">Mapzen / Tilezen · USGS SRTM / GMTED2010 · NOAA</a>' },
        }, layers: [
          { id: "basemap", type: "raster", source: "basemap", layout: { visibility: basemapRef.current === "map" ? "visible" : "none" }, paint: { "raster-saturation": -0.45, "raster-brightness-max": 0.93 } },
          { id: "satellite", type: "raster", source: "satellite", layout: { visibility: basemapRef.current === "satellite" ? "visible" : "none" }, paint: { "raster-fade-duration": 0 } },
        ], terrain: { source: "elevation", exaggeration: 1 } },
      });
      mapRef.current = map;
      map.addControl(new lib.NavigationControl({ visualizePitch: true }), "top-right");
      map.addControl(new lib.ScaleControl({ unit: "metric", maxWidth: 100 }), "bottom-left");
      map.addControl(new lib.AttributionControl({ compact: true }), "bottom-right");
      map.getCanvas().setAttribute("aria-label", "Mapa 3D das detecções do INPE. Use também a lista de focos abaixo para selecionar por teclado.");
      map.on("load", () => {
        if (stopped || !map) return;
        clearTimeout(deadline);
        map.addSource("scope", { type: "geojson", data: empty });
        map.addLayer({ id: "scope-casing", source: "scope", type: "line", paint: { "line-color": "#fff9ee", "line-width": 4, "line-opacity": 0.8, "line-dasharray": [3, 2] } });
        map.addLayer({ id: "scope-line", source: "scope", type: "line", paint: { "line-color": "#26725e", "line-width": 2, "line-dasharray": [3, 2] } });
        map.addSource("groups", { type: "geojson", data: empty });
        map.addLayer({ id: "groups", source: "groups", type: "circle", paint: { "circle-radius": 19, "circle-color": "#8359ae", "circle-opacity": 0.12, "circle-stroke-width": 1.5, "circle-stroke-color": "#8054ab" } });
        map.addSource("fires", { type: "geojson", data: empty });
        map.addLayer({ id: "fires", source: "fires", type: "circle", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 15, 9], "circle-color": ["case", ["==", ["get", "recent"], 1], "#f05e30", "#a08263"], "circle-opacity": 0.9, "circle-stroke-width": 1, "circle-stroke-color": "#fff9ee" } });
        map.addLayer({ id: "selected-fire", source: "fires", type: "circle", filter: ["==", ["get", "id"], ""], paint: { "circle-radius": 12, "circle-opacity": 0, "circle-stroke-width": 3, "circle-stroke-color": "#147a94" } });
        map.on("click", "fires", e => { const id = e.features?.[0]?.properties?.id; if (typeof id === "string") latest.current.onSelect(id); });
        map.on("mouseenter", "fires", () => { if (map) map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "fires", () => { if (map) map.getCanvas().style.cursor = ""; });
        setReady(true);
      });
      map.on("error", e => {
        if (stopped) return;
        const source = (e as unknown as { sourceId?: string }).sourceId;
        if (source === "elevation") { setTerrainError(true); map?.setTerrain(null); map?.setPitch(0); }
        if (source === "basemap") setBaseError(true);
        if (source === "satellite") { setSatelliteError(true); setBasemap("map"); }
      });
      map.on("webglcontextlost", () => fail("O aparelho perdeu o contexto gráfico 3D. O mapa 2D e a lista de detecções continuam disponíveis."));
      observer = new ResizeObserver(() => map?.resize()); observer.observe(container.current);
    }).catch(() => { clearTimeout(deadline); fail("O mapa 3D não pôde iniciar neste navegador. Use o mapa 2D e a lista de detecções."); });
    return () => { stopped = true; clearTimeout(deadline); observer?.disconnect(); map?.remove(); mapRef.current = null; };
  }, [attempt]);

  useEffect(() => { if (!ready) return; const map = mapRef.current; if (!map) return;
    (map.getSource("fires") as GeoJSONSource).setData(points);
    (map.getSource("groups") as GeoJSONSource).setData(groups);
    map.setFilter("selected-fire", ["==", ["get", "id"], props.selected ?? ""]);
    map.setLayoutProperty("groups", "visibility", props.showEvents ? "visible" : "none");
  }, [ready, points, groups, props.selected, props.showEvents]);
  useEffect(() => { if (!ready) return; (mapRef.current?.getSource("scope") as GeoJSONSource)?.setData(boundary);
    const coordinates = boundary.features.flatMap(f => f.geometry.coordinates);
    if (!coordinates.length) return;
    const west = Math.min(...coordinates.map(p => p[0])), east = Math.max(...coordinates.map(p => p[0])), south = Math.min(...coordinates.map(p => p[1])), north = Math.max(...coordinates.map(p => p[1]));
    mapRef.current?.fitBounds([[west, south], [east, north]], { padding: 48, maxZoom: 12, duration: 0 });
  }, [ready, boundary]);
  useEffect(() => { if (!ready || terrainError) return; mapRef.current?.setTerrain({ source: "elevation", exaggeration }); }, [ready, exaggeration, terrainError]);
  useEffect(() => { if (ready) mapRef.current?.easeTo({ pitch: tilted && !terrainError ? 55 : 0, duration: 350 }); }, [ready, tilted, terrainError]);
  useEffect(() => { if (ready && props.focus) mapRef.current?.easeTo({ center: [props.focus.lon, props.focus.lat], zoom: Math.max(mapRef.current.getZoom(), 11), duration: 450 }); }, [ready, props.focus]);
  useEffect(() => { const map = mapRef.current; if (!ready || !map) return;
    map.setLayoutProperty("basemap", "visibility", basemap === "map" ? "visible" : "none");
    map.setLayoutProperty("satellite", "visibility", basemap === "satellite" ? "visible" : "none");
  }, [ready, basemap]);
  function chooseBasemap(value: Basemap) {
    if (value === "satellite" && satelliteError) { (mapRef.current?.getSource("satellite") as RasterTileSource | undefined)?.setTiles([SATELLITE_TILES]); setSatelliteError(false); }
    setBasemap(value);
  }

  return <div className="fire3d-map-wrap">
    <div className="fire3d-basemap-bar"><div className="fire3d-basemap-switch" role="group" aria-label="Imagem de fundo"><button aria-pressed={basemap === "map"} onClick={() => chooseBasemap("map")}>Mapa</button><button aria-pressed={basemap === "satellite"} onClick={() => chooseBasemap("satellite")}>Satélite</button></div><span>{basemap === "satellite" ? "Sentinel-2 · mosaico 2024 · imagem de referência" : "OpenStreetMap · mapa de referência"}</span></div>
    <div className="fire3d-map-surface">
    {error ? <div className="fire3d-map-fallback"><div className="notice warning" role="status">{error}<button className="text-button" onClick={() => { setError(""); setAttempt(v => v + 1); }}>Tentar 3D novamente</button></div><RegionalMap place={props.place} radius={props.radius} area={props.area} fires={props.fires} sensors={[]} weather={null} basemap={basemap} /></div> : <>
      <div ref={container} className="fire3d-canvas" />
      {!ready && <div className="fire3d-loading" role="status"><Mountain size={24} /><span>Preparando terreno e detecções…</span></div>}
      <div className="fire3d-map-controls"><button disabled={!ready} aria-pressed={tilted && !terrainError} onClick={() => setTilted(v => !v)}><Layers size={15} />{tilted && !terrainError ? "Vista 3D" : "Vista de cima"}</button><button disabled={!ready} onClick={() => { const p = props.place; mapRef.current?.easeTo({ center: [p.lon, p.lat], zoom: Math.max(5, 10 - Math.log2(Math.max(10, props.radius) / 10)), bearing: 0, pitch: terrainError ? 0 : 55 }); setTilted(true); }}><Crosshair size={15} />Recorte</button><label>Relevo<select disabled={!ready || terrainError} value={exaggeration} onChange={e => setExaggeration(Number(e.target.value))}><option value="1">Real · 1×</option><option value="3">Realçado · 3×</option><option value="6">Realçado · 6×</option></select></label></div>
    </>}
    {(terrainError || baseError || satelliteError) && !error && <div className="fire3d-tile-notice" role="status">{terrainError ? "Elevação indisponível nesta consulta; exibindo mapa plano. " : ""}{satelliteError ? "As imagens de satélite falharam; o mapa de referência foi selecionado. Você pode tentar Satélite novamente. " : ""}{baseError && basemap === "map" ? "Há falhas no mapa base; confira também a lista de coordenadas." : ""}</div>}
    </div>
    {!error && <div className="fire3d-legend"><span><i className="fire3d-dot recent" />Observação na última hora do quadro</span><span><i className="fire3d-dot previous" />Observação anterior</span>{props.showEvents && <span><i className="fire3d-dot event" />Centro de possível evento</span>}</div>}
  </div>;
}
