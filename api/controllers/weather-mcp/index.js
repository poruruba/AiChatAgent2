'use strict';

const HELPER_BASE = "../../helpers/opt/" || "/opt/";
const HttpUtils = require(HELPER_BASE + 'http-utils');

const { McpServer, ResourceTemplate } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require("zod");

exports.handler = () => {
    const server = new McpServer({
        name: "Mcp/Get Weather",
        version: "1.0.0"
    });

    // Add tools
    server.tool("get_today_weather", "今日の天気予報を取得します。",
        { lat: z.number().describe("緯度"), lng: z.number().describe("経度") },
        async (args) => {
          console.log("get_daily_weather", args);
          var input = {
            url: "https://api.open-meteo.com/v1/forecast",
            method: "GET",
            qs: {
              latitude: args.lat,
              longitude: args.lng,
              daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
              forecast_days: 1,
              timezone: "Asia/Tokyo",
            }            
          };
          var result = await HttpUtils.do_http(input);
          console.log(result);
          result.weather_code_description = weather_code_description;
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result)
              }
            ]
          }
        }
    );

    server.tool("get_daily_weather", "今週の天気予報を取得します。",
        { lat: z.number().describe("緯度"), lng: z.number().describe("経度") },
        async (args) => {
          console.log("get_daily_weather", args);
          var input = {
            url: "https://api.open-meteo.com/v1/forecast",
            method: "GET",
            qs: {
              latitude: args.lat,
              longitude: args.lng,
              daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
              timezone: "Asia/Tokyo",
            }            
          };
          var result = await HttpUtils.do_http(input);
          console.log(result);
          result.weather_code_description = weather_code_description;
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result)
              }
            ]
          }
        }
    );

    server.tool("get_hourly_weather", "今日の時間ごとの天気予報を取得します。",
        { lat: z.number().describe("緯度"), lng: z.number().describe("経度") },
        async (args) => {
          console.log("get_hourly_weather", args);
          var input = {
            url: "https://api.open-meteo.com/v1/forecast",
            method: "GET",
            qs: {
              latitude: args.lat,
              longitude: args.lng,
              hourly: "temperature_2m,precipitation_probability,weather_code",
              forecast_days: 1,
              timezone: "Asia/Tokyo",
            }            
          };
          var result = await HttpUtils.do_http(input);
          console.log(result);
          result.weather_code_description = weather_code_description;
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result)
              }
            ]
          }
        }
    );

    server.tool("get_today", "今現在の日時と今日の始まりと終わりの時間を取得します。",
        { offset: z.number().describe("オフセットの日数").optional() },
        async (args) => {
          try{
            console.log("get_today", args);
            var now = new Date();
            if( args.offset)
              now.setDate(now.getDate() + args.offset);
            var datetime = Math.round(now.getTime() / 1000);
            var iso8601 = toISO8601WithTZ(now);
            now.setHours(0, 0, 0, 0);
            var start = Math.round(now.getTime() / 1000);
            now.setDate(now.getDate() + 1);
            now.setHours(0, 0, 0, 0);
            var end = Math.round(now.getTime() / 1000);

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    epoc_now: datetime,
                    iso8601_now: iso8601,
                    epoc_day_start: start,
                    epoc_day_end: end,
                  })
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

const weather_code_description = {
  "0": "Clear sky",
  "1, 2, 3": "Mainly clear, partly cloudy, and overcast",
  "45, 48": "Fog and depositing rime fog",
  "51, 53, 55": "Drizzle: Light, moderate, and dense intensity",
  "56, 57": "Freezing Drizzle: Light and dense intensity",
  "61, 63, 65": "Rain: Slight, moderate and heavy intensity",
  "66, 67": "Freezing Rain: Light and heavy intensity",
  "71, 73, 75": "Snow fall: Slight, moderate, and heavy intensity",
  "77": "Snow grains",
  "80, 81, 82": "Rain showers: Slight, moderate, and violent",
  "85, 86": "Snow showers slight and heavy",
  "95": "Thunderstorm: Slight or moderate",
  "96, 99": "Thunderstorm with slight and heavy hail"
}

function toISO8601WithTZ(date){
  const year = date.getFullYear().toString();
  const month = zeroPadding((date.getMonth() + 1).toString());
  const day = zeroPadding(date.getDate().toString());

  const hour = zeroPadding(date.getHours().toString());
  const minute = zeroPadding(date.getMinutes().toString());
  const second = zeroPadding(date.getSeconds().toString());

  const localDate = `${year}-${month}-${day}`;
  const localTime = `${hour}:${minute}:${second}`;

  const diffFromUtc = date.getTimezoneOffset();

  // UTCだった場合
  if (diffFromUtc === 0) {
    const tzSign = 'Z';
    return `${localDate}T${localTime}${tzSign}`;
  }

  // UTCではない場合
  const tzSign = diffFromUtc < 0 ? '+' : '-';
  const tzHour = zeroPadding((Math.abs(diffFromUtc) / 60).toString());
  const tzMinute = zeroPadding((Math.abs(diffFromUtc) % 60).toString());

  return `${localDate}T${localTime}${tzSign}${tzHour}:${tzMinute}`;
}

function zeroPadding(s){
  return ('0' + s).slice(-2);
}