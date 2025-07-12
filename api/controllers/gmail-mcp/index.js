'use strict';

const HELPER_BASE = "../../helpers/opt/" || "/opt/";
const { McpServer, ResourceTemplate } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require("zod");
const jsonfile = require(HELPER_BASE + 'jsonfile-utils');
const HttpUtils = require(HELPER_BASE + 'http-utils');

const TOKEN_FILE_PATH = process.env.THIS_BASE_PATH + '/data/gapi/access_token.json';
const GOOGLEAPI_CLIENT_ID = process.env.GOOGLEAPI_CLIENT_ID;
const GOOGLEAPI_CLIENT_SECRET = process.env.GOOGLEAPI_CLIENT_SECRET;
const GOOGLEAPI_REDIRECT_URL = process.env.GOOGLEAPI_REDIRECT_URL;
const GOOGLEAPI_DEFAULT_EMAIL = process.env.GOOGLEAPI_DEFAULT_EMAIL;

const GAPI_API_KEY = process.env.GAPI_API_KEY;
const token_url_base = process.env.PUBLIC_HOST_NAME;

const { google } = require('googleapis');

const googleAuth = new google.auth.OAuth2(GOOGLEAPI_CLIENT_ID, GOOGLEAPI_CLIENT_SECRET, GOOGLEAPI_REDIRECT_URL);

exports.handler = () => {
    const server = new McpServer({
        name: "Mcp/Gmail",
        version: "1.0.0"
    });

    // Add tools
    server.tool("send_email", "メールを送信します、指定しない場合はデフォルトのメールアドレス",
        { to: z.string().describe("To").optional(), subject: z.string().describe("Subject"), body: z.string().describe('body') },
        async (args) => {
          console.log("send_email", args);
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

          var raw = createRawMessage(args.to || GOOGLEAPI_DEFAULT_EMAIL, args.subject, args.body);
          const gmail = google.gmail({version: 'v1', auth: googleAuth});
          await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
              raw: raw
            }
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

    return server;
};

function createRawMessage(to, subject, body) {
  var enc_subject = `=?UTF-8?B?` + Buffer.from(subject).toString('base64') + "?=";
  const message =
    `To: ${to}\r\n` +
    `Subject: ${enc_subject}\r\n` +
    `Content-Type: text/plain; charset="UTF-8"\r\n` +
    `\r\n` +
    `${body}`;

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
