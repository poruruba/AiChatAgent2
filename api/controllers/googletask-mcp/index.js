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

const GAPI_API_KEY = process.env.GAPI_API_KEY;
const token_url_base = process.env.PUBLIC_HOST_NAME;

const { google } = require('googleapis');

const tasklist_name = "Aiエージェント";
let tasklist_id;
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
    const tasks = google.tasks({version: 'v1', auth: googleAuth});
    
    var result = await tasks.tasklists.list();
//    console.log(result);
    let item = result.data.items.find(item => item.title == tasklist_name);
    if( !item ){
      var result = await tasks.tasklists.insert({
        requestBody: {
          title: tasklist_name
        }
      });
      console.log(result);
      tasklist_id = result.data.id;
    }else{
      tasklist_id = item.id;
    }
  }catch(error){
    console.error(error);
  }
})();

exports.handler = () => {
    const server = new McpServer({
        name: "Mcp/GoogleTask",
        version: "1.0.0"
    });

    // Add tools
    server.tool("list_task", "私のタスクリストを取得します。",
        { },
        async (args) => {
          console.log("list_task", args);
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
          const tasks = google.tasks({version: 'v1', auth: googleAuth});
          
          const res = await tasks.tasks.list({
            tasklist: tasklist_id,
          });
          var list = res.data.items;

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(list)
              }
            ]
          }
        }
    );
    
    server.tool("insert_task", "私のタスクを追加します。",
        { title: z.string().describe("タスクのタイトル"), due: z.string().describe("タスクの期日").optional(), notes: z.string().describe("タスクのメモ").optional() },
        async (args) => {
          console.log("insert_task", args);
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
          const tasks = google.tasks({version: 'v1', auth: googleAuth});

          var body = {
            title: args.title,
          };
          if( args.due ){
            var date = new Date(args.due);
            body.due = date.toISOString();
          }
          if( args.notes )
            body.notes = args.notes;
          var task = await tasks.tasks.insert({
            tasklist: tasklist_id,
            requestBody: body
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(task.data)
              }
            ]
          };
        }
    );

    server.tool("delete_task", "私のタスクを追加します。",
        { task: z.string().describe("タスクID") },
        async (args) => {
          console.log("delete_task", args);
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
          const tasks = google.tasks({version: 'v1', auth: googleAuth});

          await tasks.tasks.delete({
            tasklist: tasklist_id,
            task: args.task
          });

          return {
            content: [
              {
                type: "text",
                text: "OK"
              }
            ]
          };
        }
    );    

    server.tool("update_task", "私のタスクを更新します。",
        { task: z.string().describe("タスクID"), title: z.string().describe("タスクのタイトル").optional(), due: z.string().describe("タスクの期日").optional(), notes: z.string().describe("タスクのメモ").optional() },
        async (args) => {
          console.log("update_task", args);
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
          const tasks = google.tasks({version: 'v1', auth: googleAuth});

          var body = {
            id: args.task,
          };
          if( args.title )
            body.title = args.title;
          if( args.due ){
            var date = new Date(args.due);
            body.due = date.toISOString();
          }
          if( args.notes )
            body.notes = args.notes;
          var task = await tasks.tasks.patch({
            tasklist: tasklist_id,
            task: args.task,
            requestBody: body
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(task.data)
              }
            ]
          };
        }
    );

    return server;
};
