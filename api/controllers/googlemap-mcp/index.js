'use strict';

const HELPER_BASE = "../../helpers/opt/" || "/opt/";
const HttpUtils = require(HELPER_BASE + 'http-utils');

const GOOGLEMAP_API_KEY = process.env.GOOGLEMAP_API_KEY;

const { McpServer, ResourceTemplate } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require("zod");

exports.handler = () => {
    const server = new McpServer({
        name: "Mcp/google-maps",
        version: "0.1.0"
    });

    server.tool("maps_geocode", "Convert an address into geographic coordinate",
        { address: z.string().describe("The address to geocode") },
        async (args) => {
          try{
            console.log("maps_geocode", args);
            var input = {
              url: "https://maps.googleapis.com/maps/api/geocode/json",
              qs: {
                address: args.address,
                key: GOOGLEMAP_API_KEY,
                language: "ja"
              }
            };
            var result = await HttpUtils.do_http(input);
            console.log(result);
            if( result.status != 'OK' )
              throw new Error("status is not OK");

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    location: result.results[0].geometry.location,
                    formatted_address: result.results[0].formatted_address,
                    place_id: result.results[0].place_id
                  }, null, 2)
                }
              ],
            }
          }catch(error){
            console.error(error);
            return {
              content: [{
                type: "text",
                text: `Error: ${error}`
              }],
              isError: true
            };
          }
        }
    );

    server.tool("maps_reverse_geocode", "Convert coordinates into an address",
        { latitude: z.number().describe("latitude"), longitude: z.number().describe("longitude") },
        async (args) => {
          try{
            console.log("maps_reverse_geocode", args);
            var input = {
              url: "https://maps.googleapis.com/maps/api/geocode/json",
              qs: {
                latlng: `${args.latitude},${args.longitude}`,
                key: GOOGLEMAP_API_KEY,
                language: "ja"
              }
            };
            var result = await HttpUtils.do_http(input);
            console.log(result);
            if( result.status != 'OK' )
              throw new Error("status is not OK");

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    formatted_address: result.results[0].formatted_address,
                    place_id: result.results[0].place_id,
                    address_components: result.results[0].address_components
                  }, null, 2)
                }
              ],
            }
          }catch(error){
            console.error(error);
            return {
              content: [{
                type: "text",
                text: `Error: ${error}`
              }],
              isError: true
            };
          }
        }
    );

    server.tool("maps_search_places", "Search for places using Google Places API",
        {
          query: z.string().describe("Search query"),
          location: z.object({ latitude: z.number().describe("latitude"), longitude: z.number().describe("longitude")}).describe("Optional center point for the search").optional(),
          radius: z.number().describe("Search radius in meters (max 50000)").optional()
        },
        async (args) => {
          try{
            console.log("maps_search_places", args);
            var input = {
              url: "https://maps.googleapis.com/maps/api/place/textsearch/json",
              qs: {
                query: args.query,
                key: GOOGLEMAP_API_KEY,
                language: "ja"
              }
            };
            if( args.location )
              input.qs.location = `${args.location.latitude},${args.location.longitude}`;
            if( args.radius)
              input.qs.radius = args.radius;
            var result = await HttpUtils.do_http(input);
            console.log(result);
            if( result.status != 'OK' )
              throw new Error("status is not OK");

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    places: result.results.map((place) => ({
                      name: place.name,
                      formatted_address: place.formatted_address,
                      location: place.geometry.location,
                      place_id: place.place_id,
                      rating: place.rating,
                      types: place.types
                    }))
                  }, null, 2)
                }
              ],
            }
          }catch(error){
            console.error(error);
            return {
              content: [{
                type: "text",
                text: `Error: ${error}`
              }],
              isError: true
            };
          }
        }
    );

    server.tool("maps_place_details", "Get detailed information about a specific place",
        { place_id: z.string().describe("The place ID to get details for") },
        async (args) => {
          try{
            console.log("maps_place_details", args);
            var input = {
              url: "https://maps.googleapis.com/maps/api/place/details/json",
              qs: {
                place_id: args.place_id,
                key: GOOGLEMAP_API_KEY,
                language: "ja"
              }
            };
            var result = await HttpUtils.do_http(input);
            console.log(result);
            if( result.status != 'OK' )
              throw new Error("status is not OK");

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    name: result.result.name,
                    formatted_address: result.result.formatted_address,
                    location: result.result.geometry.location,
                    formatted_phone_number: result.result.formatted_phone_number,
                    website: result.result.website,
                    rating: result.result.rating,
                    reviews: result.result.reviews,
                    opening_hours: result.result.opening_hours
                  }, null, 2)
                }
              ],
            }
          }catch(error){
            console.error(error);
            return {
              content: [{
                type: "text",
                text: `Error: ${error}`
              }],
              isError: true
            };
          }
        }
    );

    server.tool("maps_distance_matrix", "Calculate travel distance and time for multiple origins and destinations",
        {
          origins: z.array(z.string()).describe("Array of origin addresses or coordinates"),
          destinations: z.array(z.string()).describe("Array of destination addresses or coordinates"),
          mode: z.enum(["driving", "walking", "bicycling", "transit"]).describe("Travel mode (driving, walking, bicycling, transit)").default("driving")
        },
        async (args) => {
          try{
            console.log("maps_distance_matrix", args);
            var input = {
              url: "https://maps.googleapis.com/maps/api/distancematrix/json",
              qs: {
                origins: args.origins.join("|"),
                destinations: args.destinations.join("|"),
                mode: args.mode,
                key: GOOGLEMAP_API_KEY,
                language: "ja"
              }
            };
            var result = await HttpUtils.do_http(input);
            console.log(result);
            if( result.status != 'OK' )
              throw new Error("status is not OK");

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    origin_addresses: result.origin_addresses,
                    destination_addresses: result.destination_addresses,
                    results: result.rows.map((row) => ({
                      elements: row.elements.map((element) => ({
                        status: element.status,
                        duration: element.duration,
                        distance: element.distance
                      }))
                    }))
                  }, null, 2)
                }
              ],
            }
          }catch(error){
            console.error(error);
            return {
              content: [{
                type: "text",
                text: `Error: ${error}`
              }],
              isError: true
            };
          }
        }
    );

    server.tool("maps_elevation", "Get elevation data for locations on the earth",
        {
          locations: z.array(z.object({ latitude: z.number().describe("latitude"), longitude: z.number().describe("longitude") })).describe("Array of locations to get elevation for")
        },
        async (args) => {
          try{
            console.log("maps_elevation", args);
            const locationString = args.locations
              .map((loc) => `${loc.latitude},${loc.longitude}`)
              .join("|");
            var input = {
              url: "https://maps.googleapis.com/maps/api/elevation/json",
              qs: {
                locations: locationString,
                key: GOOGLEMAP_API_KEY,
                language: "ja"
              }
            };
            var result = await HttpUtils.do_http(input);
            console.log(result);
            if( result.status != 'OK' )
              throw new Error("status is not OK");

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    results: result.results.map((result) => ({
                      elevation: result.elevation,
                      location: result.location,
                      resolution: result.resolution
                    }))
                  }, null, 2)
                }
              ],
            }
          }catch(error){
            console.error(error);
            return {
              content: [{
                type: "text",
                text: `Error: ${error}`
              }],
              isError: true
            };
          }
        }
    );
    
    return server;
};
