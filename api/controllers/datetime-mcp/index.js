'use strict';

const HELPER_BASE = "../../helpers/opt/" || "/opt/";
const HttpUtils = require(HELPER_BASE + 'http-utils');

const { McpServer, ResourceTemplate } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require("zod");

exports.handler = () => {
    const server = new McpServer({
        name: "Mcp/DateTime",
        version: "1.0.0"
    });

    // Add tools
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