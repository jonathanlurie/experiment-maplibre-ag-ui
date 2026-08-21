import "maplibre-gl/dist/maplibre-gl.css";

import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { Protocol } from "pmtiles";
import { getStyle } from "basemapkit";

export function initGlobe(): maplibregl.Map {
    maplibregl.setWorkerUrl(workerUrl);
    maplibregl.addProtocol("pmtiles", new Protocol().tile);

    const style = getStyle("avenue", {
    pmtiles:
        "https://fsn1.your-objectstorage.com/public-map-data/pmtiles/planet.pmtiles",
    sprite:
        "https://raw.githubusercontent.com/jonathanlurie/phosphor-mlgl-sprite/refs/heads/main/sprite/phosphor-diecut",
    glyphs:
        "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
    lang: "en",
    terrain: {
        pmtiles:
        "https://fsn1.your-objectstorage.com/public-map-data/pmtiles/terrain-mapterhorn.pmtiles",
        encoding: "terrarium",
    },
    globe: true,
    });

    const globe = new maplibregl.Map({
    container: "globe-container",
    style,
    center: [0, 20],
    zoom: 1.5,
    maxPitch: 89,
    });

    return globe;

}

