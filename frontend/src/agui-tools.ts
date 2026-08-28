import type { LngLatBoundsLike } from 'maplibre-gl';
import { getGlobe } from './globe';

class AgUiToolCollection {
  private toolStaticDescription: Map<string, any>;
  private toolCallbacks: Map<string, (args: any) => Promise<any>>;

  constructor() {
    this.toolStaticDescription = new Map();
    this.toolCallbacks = new Map();
  }

  registerTool(description: any, callback: (args: any) => Promise<any>) {
    this.toolStaticDescription.set(description.name, description);
    this.toolCallbacks.set(description.name, callback);
  }

  getToolDescriptions() {
    return Array.from(this.toolStaticDescription.values());
  }

  async callTool(toolCallName: string, toolCallArgs: Record<string, any>): Promise<any> {
    if (!this.toolCallbacks.has(toolCallName)) {
      return {
        success: false,
        error: "Tool not found: " + toolCallName,
      };
    }

    const callback = this.toolCallbacks.get(toolCallName)!;
    try {
      return await callback(toolCallArgs);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}


export const agUiToolCollection = new AgUiToolCollection();
const globe = getGlobe();


agUiToolCollection.registerTool(
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





agUiToolCollection.registerTool(
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


agUiToolCollection.registerTool(
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


agUiToolCollection.registerTool(
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


agUiToolCollection.registerTool(
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


agUiToolCollection.registerTool(
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


agUiToolCollection.registerTool(
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


agUiToolCollection.registerTool(
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


agUiToolCollection.registerTool(
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


agUiToolCollection.registerTool(
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


agUiToolCollection.registerTool(
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
