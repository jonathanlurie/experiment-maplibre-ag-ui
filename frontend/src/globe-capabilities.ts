import type { LngLatBoundsLike } from "maplibre-gl";
import { AgUiCapabilities } from "./AgUiCapabilities";
import { getGlobe } from "./globe";
import { getRoutingPolyline } from "./routing";

export function createAgUiGlobeCapabilities() {
  const capabilities = new AgUiCapabilities();
  const globe = getGlobe();

  capabilities.addTool(
    {
      name: "frameMapOnBoundingBox",
      description: "Frame the map view on a geographical bounding box of the form [minLongitude, minLatitude, maxLongitude, maxLatitude] in WGS84 coordinates.",
      parameters: {
        type: "object",
        properties: {
          coordinates: {
            type: "array",
            description: "WGS84 coordinates ordered as [minLongitude, minLatitude, maxLongitude, maxLatitude].",
            prefixItems: [
              {
                type: "number",
                minimum: -180,
                maximum: 180,
                description: "Minimum longitude in decimal degrees.",
              },
              {
                type: "number",
                minimum: -90,
                maximum: 90,
                description: "Minimum latitude in decimal degrees.",
              },
              {
                type: "number",
                minimum: -180,
                maximum: 180,
                description: "Maximum longitude in decimal degrees.",
              },
              {
                type: "number",
                minimum: -90,
                maximum: 90,
                description: "Maximum latitude in decimal degrees.",
              },
            ],
            minItems: 4,
            maxItems: 4,
          },
          duration: {
            type: "number",
            description: "Duration of the animation in milliseconds. If 0, then there is no animation and the map view is immediately set to the bounding box. By default it will be 500 milliseconds.",
            minimum: 0,
            maximum: 4000,
          },
        },
        required: ["coordinates"],
        additionalProperties: false,
      },
    },

    async (args: { coordinates: [number, number, number, number]; duration?: number }) => {
      const coordinates = args.coordinates;
      console.log("WGS84 bounding box [minLongitude, minLatitude, maxLongitude, maxLatitude]:", coordinates, args.duration ? `with animation duration of ${args.duration} milliseconds` : "with default animation duration of 500 milliseconds");
      const [minLng, minLat, maxLng, maxLat] = coordinates;

      const bounds: LngLatBoundsLike = [
        [minLng, minLat],
        [maxLng, maxLat],
      ];

      globe.fitBounds(bounds, {
        padding: 0,
        essential: true,
        duration: args.duration ?? 500
      });
      return { success: true, coordinates };
    }
  );


  capabilities.addTool(
    {
      name: "addBoundingBoxLayer",
      description: "Display a bounding box on the map, in a new layer. The geographical bounding box is of the form [minLongitude, minLatitude, maxLongitude, maxLatitude] in WGS84 coordinates. This is adding a new layer with a given ID. The color of the bounding box must be provided as and hexadecimal string, if the user does not mention any color, just provide a bright random color.",
      parameters: {
        type: "object",
        properties: {
          coordinates: {
            type: "array",
            description: "WGS84 coordinates ordered as [minLongitude, minLatitude, maxLongitude, maxLatitude].",
            prefixItems: [
              {
                type: "number",
                minimum: -180,
                maximum: 180,
                description: "Minimum longitude in decimal degrees.",
              },
              {
                type: "number",
                minimum: -90,
                maximum: 90,
                description: "Minimum latitude in decimal degrees.",
              },
              {
                type: "number",
                minimum: -180,
                maximum: 180,
                description: "Maximum longitude in decimal degrees.",
              },
              {
                type: "number",
                minimum: -90,
                maximum: 90,
                description: "Maximum latitude in decimal degrees.",
              },
            ],
            minItems: 4,
            maxItems: 4,
          },
          layerId: {
            type: "string",
            description: "Unique identifier of the layer to be added. If a layer with the same ID already exists, it will be replaced.",
          },
          color: {
            type: "string",
            description: "The color in hexadecimal form such as #ff0000 for red.",
            pattern: "^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$",
          },
          beforeId: {
            type: "string",
            description: "The ID of an existing layer before which the new bounding box layer will be inserted. If not provided, the new layer will be added on top of all existing layers. The beforeId parameter is a bit like a z-index for the layers stack, except it required to get the full list of layers first.",
          },
        },
        required: ["coordinates", "layerId"],
        additionalProperties: false,
      },
    },

    async (args: { coordinates: [number, number, number, number]; layerId: string; color?: string, hollow?: boolean, beforeId?: string }) => {
      const coordinates = args.coordinates;
      const layerId = args.layerId;
      const color = args.color;
      const beforeId = args.beforeId ?? undefined;

      console.log("Adding bounding box layer with ID:", layerId, "and coordinates:", coordinates, "and color:", color);

      const [minLng, minLat, maxLng, maxLat] = coordinates;

      // Remove existing layer and source if they exist
      if (globe.getLayer(layerId)) {
        globe.removeLayer(layerId);
      }
      if (globe.getSource(layerId)) {
        globe.removeSource(layerId);
      }
      // Add a new source for the bounding box
      globe.addSource(layerId, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [minLng, minLat],
              [minLng, maxLat],
              [maxLng, maxLat],
              [maxLng, minLat],
              [minLng, minLat]
            ]]
          }
        }
      });

      // Add a new layer for the bounding box
      globe.addLayer({
        id: layerId,
        type: "line",
        source: layerId,
        layout: {},
        paint: {
          "line-color": color,
          "line-width": 2,
        }
      }, beforeId);

      return { success: true, coordinates, layerId, color, beforeId };
    }
  );




  capabilities.addTool(
    {
      name: "showRoutingLayer",
      description: "Add and display a new polyline layer depicting the routing (itinerary) between two places. Each place is given as a [longitude, latitude] coordinate array in WGS84. The color of the routing line must be provided as and hexadecimal string, if the user does not mention any color, just provide a bright random color.",
      parameters: {
        type: "object",
        properties: {
          startPoint: {
            type: "array",
            description: "WGS84 coordinates of the starting point of the routing, ordered as [longitude, latitude]",
            prefixItems: [
              {
                type: "number",
                minimum: -180,
                maximum: 180,
                description: "Longitude in decimal degrees.",
              },
              {
                type: "number",
                minimum: -90,
                maximum: 90,
                description: "Latitude in decimal degrees.",
              },
            ],
            minItems: 2,
            maxItems: 2,
          },
          endPoint: {
            type: "array",
            description: "WGS84 coordinates of the ending point of the routing, ordered as [longitude, latitude]",
            prefixItems: [
              {
                type: "number",
                minimum: -180,
                maximum: 180,
                description: "Longitude in decimal degrees.",
              },
              {
                type: "number",
                minimum: -90,
                maximum: 90,
                description: "Latitude in decimal degrees.",
              },
            ],
            minItems: 2,
            maxItems: 2,
          },
          layerId: {
            type: "string",
            description: "Unique identifier of the layer to be added. If a layer with the same ID already exists, it will be replaced.",
          },
          color: {
            type: "string",
            description: "The color in hexadecimal form such as #ff0000 for red.",
            pattern: "^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$",
          },
          beforeId: {
            type: "string",
            description: "The ID of an existing layer before which the new bounding box layer will be inserted. If not provided, the new layer will be added on top of all existing layers. The beforeId parameter is a bit like a z-index for the layers stack, except it required to get the full list of layers first.",
          },
        },
        required: ["startPoint", "endPoint", "layerId"],
        additionalProperties: false,
      },
    },

    async (args: { startPoint: [number, number]; endPoint: [number, number]; layerId: string; color?: string, beforeId?: string }) => {
      const startPoint = args.startPoint;
      const endPoint = args.endPoint;

      console.log("showRoutingLayer", startPoint, endPoint);

      const polyline = await getRoutingPolyline(startPoint, endPoint, "driving");

      console.log("Routing polyline:", polyline);

      // Remove existing layer and source if they exist
      if (globe.getLayer(args.layerId)) {
        globe.removeLayer(args.layerId);
      }
      if (globe.getSource(args.layerId)) {
        globe.removeSource(args.layerId);
      }

      // Add a new source for the routing polyline
      globe.addSource(args.layerId, {
        type: "geojson",
        data: polyline,
      });

      // Add a new layer for the routing polyline
      globe.addLayer({
        id: args.layerId,
        type: "line",
        source: args.layerId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": args.color ?? "#ff0000",
          "line-width": 4,
        },
      }, args.beforeId);

      return { success: true, startPoint, endPoint, layerId: args.layerId, color: args.color, beforeId: args.beforeId };
      
    }
  );

  capabilities.addTool(
    {
      name: "animateMap",
      description: "Animate the map to a specific configuration, including position, zoom level, pitch, and bearing. The position is specified as WGS84 coordinates ordered as [longitude, latitude].",
      parameters: {
        type: "object",
        properties: {
          position: {
            type: "array",
            description: "WGS84 coordinates ordered as [longitude, latitude].",
            prefixItems: [
              {
                type: "number",
                minimum: -180,
                maximum: 180,
                description: "Longitude in decimal degrees.",
              },
              {
                type: "number",
                minimum: -90,
                maximum: 90,
                description: "Latitude in decimal degrees.",
              },
            ],
            minItems: 2,
            maxItems: 2,
          },
          zoomLevel: {
            type: "number",
            description: "Optional zoom level to set after moving to the position. If not provided, the current zoom level will be maintained.",
            minimum: 0,
            maximum: 24,
          },
          bearing: {
            type: "number",
            description: "Optional bearing in degrees to set after moving to the position. If not provided, the current bearing will be maintained.",
            minimum: 0,
            maximum: 360,
          },
          pitch: {
            type: "number",
            description: "Optional pitch in degrees to set after moving to the position. If not provided, the current pitch will be maintained.",
            minimum: 0,
            maximum: 80,
          },
          duration: {
            type: "number",
            description: "Duration of the animation in milliseconds. If 0, then there is no animation and the map view is immediately set to the position. By default it will be 500 milliseconds.",
            minimum: 0,
            maximum: 4000,
          },
        },
        required: [],
        additionalProperties: false,
      },
    },

    async (args: { position?: [number, number]; zoomLevel?: number; bearing?: number; pitch?: number; duration?: number }) => {
      const [lng, lat] = args.position ?? [globe.getCenter().lng, globe.getCenter().lat];
      const zoomLevel = args.zoomLevel ?? globe.getZoom();
      const bearing = args.bearing ?? globe.getBearing();
      const pitch = args.pitch ?? globe.getPitch();
      const duration = args.duration ?? 500;

      console.log("animateMap", args);

      globe.easeTo({
        center: [lng, lat],
        zoom: zoomLevel,
        bearing,
        pitch,
        duration,
      });

      return { success: true, position: [lng, lat], zoomLevel, bearing, pitch, duration };
    }
  );  

  capabilities.addTool(
    {
      name: "getElevationAtMapCenter",
      description:
        "Returns the terrain elevation in meters above sea level at the exact current center of the map.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    async () => {
      const center = globe.getCenter();
      const elevationMeters = globe.queryTerrainElevation(center);

      return {
        coordinates: [center.lng, center.lat],
        elevationMeters,
        available: elevationMeters !== null,
      };
    }
  );

  capabilities.addTool(
    {
      name: "getMapLayerList",
      description:
        "Returns the list of map layers currently available in the map. Each layer is represented as an object with the following properties: id, type, source, and layout. The Id can often be read a human-readable name of the layer to convey the kinds of elements it contains and displays.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    async () => {
      return globe.getStyle().layers || [];
    }
  );

  capabilities.addTool(
    {
      name: "hideMapLayer",
      description: "Hides a map layer specified by its ID.",
      parameters: {
        type: "object",
        properties: {
          layerId: {
            type: "string",
            description: "The ID of the map layer to hide.",
          },
        },
        required: ["layerId"],
        additionalProperties: false,
      },
    },

    async (args: { layerId: string }) => {
      const layerId = args.layerId;
      const layer = globe.getStyle().layers.find((l) => l.id === layerId);
      if (layer) {
        globe.setLayoutProperty(layerId, "visibility", "none");
        return { success: true, layerId };
      } else {
        return { success: false, error: "Layer not found", layerId };
      }
    }
  );

  capabilities.addTool(
    {
      name: "showMapLayer",
      description: "Shows a map layer specified by its ID.",
      parameters: {
        type: "object",
        properties: {
          layerId: {
            type: "string",
            description: "The ID of the map layer to show.",
          },
        },
        required: ["layerId"],
        additionalProperties: false,
      },
    },

    async (args: { layerId: string }) => {
      const layerId = args.layerId;
      const layer = globe.getStyle().layers.find((l) => l.id === layerId);
      if (layer) {
        globe.setLayoutProperty(layerId, "visibility", "visible");
        return { success: true, layerId };
      } else {
        return { success: false, error: "Layer not found", layerId };
      }
    }
  );

  capabilities.addTool(
    {
      name: "setTerrainExaggeration",
      description: "Sets the terrain exaggeration factor.",
      parameters: {
        type: "object",
        properties: {
          exaggeration: {
            type: "number",
            description: "The terrain exaggeration factor. If 0, then the terrain is flat. If 1, then the terrain is at its natural elevation. If greater than 1, then the terrain is exaggerated.",
            minimum: 0,
            maximum: 3,},
        },
        required: ["exaggeration"],
        additionalProperties: false,
      },
    },

    async (args: { exaggeration: number }) => {
      const exaggeration = args.exaggeration;

      const terrain = globe.getTerrain();
      if (!terrain) {
        return { success: false, error: "Terrain is not enabled on the map." };
      }
      terrain.exaggeration = exaggeration;
      globe.setTerrain(terrain);
      return { success: true, exaggeration };
    }
  );

  capabilities.addTool(
    {
      name: "getTerrainExaggeration",
      description:
        "Returns the current terrain exaggeration factor. If 0, then the terrain is flat. If 1, then the terrain is at its natural elevation. If greater than 1, then the terrain is exaggerated.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    async () => {
      const terrain = globe.getTerrain();
      const exaggeration = terrain ? terrain.exaggeration : null;

      return {
        exaggeration,
        available: exaggeration !== null,
      };
    }
  );

  capabilities.addTool(
    {
      name: "isTerrainActivated",
      description:
        "Returns whether the terrain is activated.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    async () => {
      const activated = !!globe.getTerrain();

      return {
        activated,
      };
    }
  );


  capabilities.addTool(
    {
      name: "getUserPosition",
      description: "Gets the user's current position as { longitude: number, latitude: number } in WGS84.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },

    async () => {
      const response = await fetch("https://api.country.is/?fields=location");
      const data = await response.json();
      const position = {
        longitude: data.location.longitude,
        latitude: data.location.latitude,
      };

      console.log("User position:", position);
      return { success: true, position };
    }
  );


  capabilities.addTool(
    {
      name: "getVisiblePois",
      description: "Gets the currently visible points of interest (POIs) on the map. The POI layer is only visible beyond a certain zoom level, so this tool will return an empty array if the map is zoomed out too far.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },

    async () => {
      const features = globe.queryRenderedFeatures({layers: ["pois"]}).map((feature) => feature.properties);
      console.log("Visible POIs:", features);
      return { success: true, pois: features };
    }
  );



  capabilities.addContextEntry(
    "Current visible map extent as a WGS84 bbox ordered [west, south, east, north].",
    () => {
      const bounds = globe.getBounds();
      return JSON.stringify([
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]);
    }
  );

  capabilities.addContextEntry(
    "Current map zoom level.",
    () => globe.getZoom().toString()
  );

  capabilities.addContextEntry(
    "Current map center as a WGS84 coordinate ordered [longitude, latitude].",
    () => JSON.stringify([globe.getCenter().lng, globe.getCenter().lat])
  );

  capabilities.addContextEntry(
    "Current map pitch in degrees. The pitch is the angle of the camera relative to the plane of the map, where 0 degrees is looking straight down at the map and 90 degrees is looking at the horizon.",
    () => globe.getPitch().toString()
  );

  capabilities.addContextEntry(
    "Current map bearing in degrees. The bearing is the compass direction that the top of the map is facing, where 0 degrees is north, 90 degrees is east, 180 degrees is south, and 270 degrees is west.",
    () => globe.getBearing().toString()
  );

  capabilities.addContextEntry(
    "Current map terrain exaggeration. The terrain exaggeration is the factor by which the elevation of the terrain is multiplied, where 0 means a flat terrain, 1 is no exaggeration, 2 is double the elevation, and 0.5 is half the elevation.",
    () => globe.getTerrain()?.exaggeration?.toString() ?? "0"
  );

  return capabilities;
}