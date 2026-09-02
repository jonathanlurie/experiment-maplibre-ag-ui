// import { type FeatureCollection, type LineString } from "geojson";

const ROUTING_URL_SCHEMA = "https://router.project-osrm.org/route/v1/{MEAN_OF_TRANSPORTATION}/{START_LONGITUDE},{START_LATITUDE};{END_LONGITUDE},{END_LATITUDE}?overview=full&geometries=geojson"


type RoutingResponse = {
    code: string,
    routes: {
        legs: {
            steps: [],
            weight: number,
            summary: string,
            duration: number,
            distance: number
        }[],
        weight_name: string,
        geometry: {
            coordinates: [number, number][],
            type: string
        },
        weight: number,
        duration: number,
        distance: number
    }[] 
}



export function getRoutingUrl(startPoint: [number, number], endPoint: [number, number], meanOfTransportation: "driving" | "bicycle"): string {
    const url = ROUTING_URL_SCHEMA
        .replace("{MEAN_OF_TRANSPORTATION}", meanOfTransportation)
        .replace("{START_LONGITUDE}", startPoint[0].toString())
        .replace("{START_LATITUDE}", startPoint[1].toString())
        .replace("{END_LONGITUDE}", endPoint[0].toString())
        .replace("{END_LATITUDE}", endPoint[1].toString());
    return url;
}

export async function getRoutingPolyline(startPoint: [number, number], endPoint: [number, number], meanOfTransportation: "driving" | "bicycle") {
    const url = getRoutingUrl(startPoint, endPoint, meanOfTransportation);
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Could not fetch the routing polyline");
    }

    const data: RoutingResponse = await response.json();


    // Generating a valid GeoJSON polyline out of the routing response
    const polyline = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    weight: data.routes[0].weight,
                    duration: data.routes[0].duration,
                    distance: data.routes[0].distance,
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": data.routes[0].geometry.coordinates
                }
            }
        ]
    };

    return polyline;
}