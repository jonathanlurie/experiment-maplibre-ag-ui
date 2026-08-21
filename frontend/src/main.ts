import { initGlobe } from './globe';
import './style.css'
import { HttpAgent } from "@ag-ui/client";
import type { LngLatBoundsLike } from 'maplibre-gl';
import { marked } from 'marked';

const globe = initGlobe();

const frontendTools = [
  {
    name: "print",
    description: "Print a message in the browser developer console.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The message to print.",
        },
      },
      required: ["message"],
      additionalProperties: false,
    },
  },
  // {
  //   name: "showPointLocation",
  //   description: "Centers the map to a precise WGS84 location from a single [longitude, latitude] coordinate pair.",
  //   parameters: {
  //     type: "object",
  //     properties: {
  //       coordinates: {
  //         type: "array",
  //         description: "WGS84 coordinates ordered as [longitude, latitude].",
  //         prefixItems: [
  //           {
  //             type: "number",
  //             minimum: -180,
  //             maximum: 180,
  //             description: "Longitude in decimal degrees.",
  //           },
  //           {
  //             type: "number",
  //             minimum: -90,
  //             maximum: 90,
  //             description: "Latitude in decimal degrees.",
  //           },
  //         ],
  //         minItems: 2,
  //         maxItems: 2,
  //       },
  //     },
  //     required: ["coordinates"],
  //     additionalProperties: false,
  //   },
  // },

  {
    name: "showBoundingBox",
    description: "Centers the map on a region defined by a geographical bounding box of the form [minLongitude, minLatitude, maxLongitude, maxLatitude] in WGS84 coordinates.",
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
      },
      required: ["coordinates"],
      additionalProperties: false,
    },
  },
];

function print(message: string) {
  console.log(message);
}


function showLocation(coordinates: [number, number]) {
  console.log("WGS84 location [longitude, latitude]:", coordinates);

  globe.flyTo({
    center: coordinates,
    zoom: 10,
    essential: true,
  });
}


function showBoundingBox(coordinates: [number, number, number, number]) {
  console.log("WGS84 bounding box [minLongitude, minLatitude, maxLongitude, maxLatitude]:", coordinates);

  const [minLng, minLat, maxLng, maxLat] = coordinates;

  const bounds: LngLatBoundsLike = [
    [minLng, minLat],
    [maxLng, maxLat],
  ];

  globe.fitBounds(bounds, {
    padding: 0,
    essential: true,
  });
}

const agent = new HttpAgent({
  url: "http://localhost:8000/agent",
  agentId: "map-agent",
  threadId: crypto.randomUUID(),
});

const input =
  document.querySelector<HTMLInputElement>(
    "#prompt"
  )!;

const button =
  document.querySelector<HTMLButtonElement>(
    "#send"
  )!;

const responseElement =
  document.querySelector<HTMLDivElement>(
    "#response"
  )!;


button.addEventListener(
  "click",
  async () => {
    const content =
      input.value.trim();

    if (!content) {
      return;
    }

    responseElement.innerHTML = "";
    responseElement.style.display = "none";
    button.disabled = true;

    agent.messages.push({
      id: crypto.randomUUID(),
      role: "user",
      content,
    });

    const toolResults: Array<{
      id: string;
      role: "tool";
      toolCallId: string;
      content: string;
    }> = [];

    let markdownResponse = "";

    try {
      // Map bounds
      const bounds = globe.getBounds();

      await agent.runAgent(
        {
          tools: frontendTools,
          context: [
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
          ],
        },
        {
          async onTextMessageContentEvent({ event }) {
            responseElement.style.display = "block";
            markdownResponse += event.delta;
            responseElement.innerHTML = await marked.parse(markdownResponse);
          },

          onToolCallEndEvent({ event, toolCallName, toolCallArgs }) {
            let result: unknown;

            if (toolCallName === "print") {
              print(String(toolCallArgs.message));
              result = { success: true };
            }

            if (toolCallName === "showPointLocation") {
              const coordinates = toolCallArgs.coordinates as [number, number];
              showLocation(coordinates);
              result = { success: true, coordinates };
            }

            if (toolCallName === "showBoundingBox") {
              const coordinates = toolCallArgs.coordinates as [number, number, number, number];
              showBoundingBox(coordinates);
              result = { success: true, coordinates };
            }

            if (result !== undefined) {
              toolResults.push({
                id: crypto.randomUUID(),
                role: "tool",
                toolCallId: event.toolCallId,
                content: JSON.stringify(result),
              });
            }
          },

          onRunErrorEvent({ event }) {
            console.error("Agent error:", event);
            responseElement.style.display = "block";
            responseElement.textContent = `Error: ${event.message}`;
          },
        },
      );

      for (const result of toolResults) {
        agent.addMessage(result);
      }
    } catch (error) {
      console.error("Could not reach the agent:", error);
      responseElement.style.display = "block";
      responseElement.textContent = "Could not reach the agent.";
    } finally {
      button.disabled = false;
      input.focus();
    }
  },
);

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !button.disabled) {
    button.click();
  }
});

