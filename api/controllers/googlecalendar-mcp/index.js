'use strict';

const HELPER_BASE = "../../helpers/opt/" || "/opt/";
const jsonfile = require(HELPER_BASE + 'jsonfile-utils');
const HttpUtils = require(HELPER_BASE + 'http-utils');

const { McpServer, ResourceTemplate } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require("zod");

const TOKEN_FILE_PATH = process.env.THIS_BASE_PATH + '/data/gapi/access_token.json';
const GOOGLEAPI_CLIENT_ID = process.env.GOOGLEAPI_CLIENT_ID;
const GOOGLEAPI_CLIENT_SECRET = process.env.GOOGLEAPI_CLIENT_SECRET;
const GOOGLEAPI_REDIRECT_URL = process.env.GOOGLEAPI_REDIRECT_URL;

const token_url_base = process.env.PUBLIC_HOST_NAME;
const GAPI_API_KEY = process.env.GAPI_API_KEY;

const { google } = require('googleapis');

const calendar_name = "Aiエージェント";
const public_calendar_list = [
];
let private_calendar;
const googleAuth = new google.auth.OAuth2(GOOGLEAPI_CLIENT_ID, GOOGLEAPI_CLIENT_SECRET, GOOGLEAPI_REDIRECT_URL);

(async () =>{
  try{
    var json = await jsonfile.read_json(TOKEN_FILE_PATH);
    if (!json) {
      console.log('file is not ready.');
      throw 'file is not ready.';
    }
    if( (json.expiry_date - 3 * 60 * 1000) < new Date().getTime() ){
      var input = {
        url: token_url_base + "/gapi/token-refresh",
        api_key: GAPI_API_KEY
      };
      let result = await HttpUtils.do_http(input);
      console.log(result);
      json = await jsonfile.read_json(TOKEN_FILE_PATH);
    }
    googleAuth.setCredentials(json);
    const calendar = google.calendar({version: 'v3', auth: googleAuth});
    
    var result = await calendar.calendarList.list();
//    console.log(result);
    let item = result.data.items.find(item => item.summary == calendar_name);
    if( !item )
      throw "calendar not found";
    private_calendar = item.id;
  }catch(error){
    console.error(error);
  }
})();

exports.handler = () => {
    const server = new McpServer({
        name: "Mcp/GoogleCalendar",
        version: "1.0.0"
    });

    // Add tools
    server.tool("list_events", "私の予定を取得します。",
        { min_time: z.string().describe("終了時間の下限(ISO8601)"), max_time: z.string().describe("開始時間の上限(ISO8601)") },
        async (args) => {
          console.log("list_events", args);
          var json = await jsonfile.read_json(TOKEN_FILE_PATH);
          if (!json) {
            console.log('file is not ready.');
            throw 'file is not ready.';
          }
          if( (json.expiry_date - 3 * 60 * 1000) < new Date().getTime() ){
            var input = {
              url: token_url_base + "/gapi/token-refresh",
              api_key: GAPI_API_KEY
            };
            var result = await HttpUtils.do_http(input);
            console.log(result);
            json = await jsonfile.read_json(TOKEN_FILE_PATH);
          }

          googleAuth.setCredentials(json);
          const calendar = google.calendar({version: 'v3', auth: googleAuth});

          var event_list = [];
          var calendar_list = await calendar.events.list({
            calendarId: private_calendar,
            singleEvents: true,
            orderBy: 'startTime',
            timeMin: args.min_time,
            timeMax: args.max_time
          });
//          console.log(calendar_list.data.items);
          for( let item of calendar_list.data.items){
            var t = {
              id: item.id,
              calendarId: private_calendar,
              summary: item.summary,
              start: item.start,
              end: item.end,
              eventType: item.eventType,
              deletable: true
            };
            event_list.push(t);
          }

          for( let calendarId of public_calendar_list ){
            var calendar_list = await calendar.events.list({
              calendarId: calendarId,
              singleEvents: true,
              orderBy: 'startTime',
              timeMin: args.min_time,
              timeMax: args.max_time
            });
//            console.log(calendar_list.data.items);
            for( let item of calendar_list.data.items){
              var t = {
                id: item.id,
                calendarId: calendarId,
                summary: item.summary,
                start: item.start,
                end: item.end,
                eventType: item.eventType,
                deletable: false
              };
              event_list.push(t);
            }
            console.log(event_list);
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(event_list)
              }
            ]
          }
        }
    );
    
    server.tool("delete_event", "私の予定を削除します。",
        { event_id: z.string().describe("EventId") },
        async (args) => {
          console.log("delete_event", args);
          var json = await jsonfile.read_json(TOKEN_FILE_PATH);
          if (!json) {
            console.log('file is not ready.');
            throw 'file is not ready.';
          }
          if( (json.expiry_date - 3 * 60 * 1000) < new Date().getTime() ){
            var input = {
              url: token_url_base + "/gapi/token-refresh",
              api_key: GAPI_API_KEY
            };
            var result = await HttpUtils.do_http(input);
            console.log(result);
            json = await jsonfile.read_json(TOKEN_FILE_PATH);
          }

          googleAuth.setCredentials(json);
          const calendar = google.calendar({version: 'v3', auth: googleAuth});

          await calendar.events.delete({
            calendarId: private_calendar,
            eventId: args.event_id
          });

          return {
            content: [
              {
                type: "text",
                text: "OK"
              }
            ]
          }
        }
    );

    server.tool("insert_event", "私の予定を追加します。",
        { summary: z.string().describe("サマリ"), description: z.string().describe("内容"), start_date: z.string().describe("開始日(ISO8601)"), end_date: z.string().describe("終了日(ISO8601)") },
        async (args) => {
          console.log("insert_event", args);
          var json = await jsonfile.read_json(TOKEN_FILE_PATH);
          if (!json) {
            console.log('file is not ready.');
            throw 'file is not ready.';
          }
          if( (json.expiry_date - 3 * 60 * 1000) < new Date().getTime() ){
            var input = {
              url: token_url_base + "/gapi/token-refresh",
              api_key: GAPI_API_KEY
            };
            var result = await HttpUtils.do_http(input);
            console.log(result);
            json = await jsonfile.read_json(TOKEN_FILE_PATH);
          }

          googleAuth.setCredentials(json);
          const calendar = google.calendar({version: 'v3', auth: googleAuth});

          const event = {
            summary: args.summary,
            description: args.description,
            start: {
              date: args.start_date,
              timeZone: 'Asia/Tokyo',
            },
            end: {
              date: args.end_date,
              timeZone: 'Asia/Tokyo',
            },
          };
          var item = await calendar.events.insert({
            calendarId: private_calendar,
            requestBody: event
          });
          item.calendarId = private_calendar;

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(item.data)
              }
            ]
          }
        }
    );    

    server.tool("update_event", "私の予定を更新します。",
        { event_id: z.string().describe("EventId"), summary: z.string().describe("サマリ").optional(), description: z.string().describe("内容").optional(),
          start_date: z.string().describe("開始日(ISO8601)").optional(), end_date: z.string().describe("終了日(ISO8601)").optional() },
        async (args) => {
          console.log("update_event", args);
          var json = await jsonfile.read_json(TOKEN_FILE_PATH);
          if (!json) {
            console.log('file is not ready.');
            throw 'file is not ready.';
          }
          if( (json.expiry_date - 3 * 60 * 1000) < new Date().getTime() ){
            var input = {
              url: token_url_base + "/gapi/token-refresh",
              api_key: GAPI_API_KEY
            };
            var result = await HttpUtils.do_http(input);
            console.log(result);
            json = await jsonfile.read_json(TOKEN_FILE_PATH);
          }

          googleAuth.setCredentials(json);
          const calendar = google.calendar({version: 'v3', auth: googleAuth});

          const event = {
            id: args.event_id,
          };
          if( args.summary )
            event.summary = args.summary;
          if( args.description )
            event.description = args.description;
          if( args.start_date ){
            event.start = {
              date: args.start_date,
              timeZone: 'Asia/Tokyo',
            };
          }
          if( args.end_date ){
            event.end = {
              date: args.end_date,
              timeZone: 'Asia/Tokyo',
            };
          };
          var item = await calendar.events.patch({
            calendarId: private_calendar,
            eventId: args.event_id,
            requestBody: event
          });
          item.calendarId = private_calendar;

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(item.data)
              }
            ]
          }
        }
    );

    return server;
};
