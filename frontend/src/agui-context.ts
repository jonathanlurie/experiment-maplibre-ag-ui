import * as maplibregl from 'maplibre-gl';
import { getGlobe } from './globe';



export function generateAgUiContext(): { description: string; value: string }[] {
  const globe = getGlobe();
  const bounds = globe.getBounds();

  const context = [
    {
      description:
        "Current visible map extent as a WGS84 bbox ordered [west, south, east, north].",
      value: JSON.stringify([
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]),
    },
    {
      description: "Current map zoom level.",
      value: globe.getZoom().toString(),
    },
    {
      description: "Current map center as a WGS84 coordinate ordered [longitude, latitude].",
      value: JSON.stringify([globe.getCenter().lng, globe.getCenter().lat]),
    }, 
    {
      description: "Current map pitch in degrees. The pitch is the angle of the camera relative to the plane of the map, where 0 degrees is looking straight down at the map and 90 degrees is looking at the horizon.",
      value: globe.getPitch().toString(),
    },
    {
      description: "Current map bearing in degrees. The bearing is the compass direction that the top of the map is facing, where 0 degrees is north, 90 degrees is east, 180 degrees is south, and 270 degrees is west.",
      value: globe.getBearing().toString(),
    },
    {
      description: "Current map terrain exaggeration. The terrain exaggeration is the factor by which the elevation of the terrain is multiplied, where 0 means a flat terrain, 1 is no exaggeration, 2 is double the elevation, and 0.5 is half the elevation.",
      value: globe.getTerrain()?.exaggeration?.toString() ?? "0",
    }
  ];

  return context;
}