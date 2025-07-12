'use strict';

const HELPER_BASE = process.env.HELPER_BASE || "/opt/";
const Response = require(HELPER_BASE + 'response');
const Redirect = require(HELPER_BASE + 'redirect');

const MASTRA_API_KEY = process.env.MASTRA_API_KEY;
const MASTRA_HOST = process.env.PUBLIC_HOST_NAME;

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

const config = {
  channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: LINE_CHANNEL_SECRET
};
const LineUtils = require(HELPER_BASE + 'line-utils');
const line = require('@line/bot-sdk');
const app = new LineUtils(line, config);
const HttpUtils = require(HELPER_BASE + 'http-utils');

const LINE_CHARACTER_NAME = process.env.LINE_CHARACTER_NAME;

app.message(async (event, client) =>{
//	console.log(event);
  console.log("app.message called", event.message.text);

  var text = event.message.text.trim();

	var input = {
		url: MASTRA_HOST + "/mastra-generate",
		body: {
			message: text
		},
		api_key: MASTRA_API_KEY
	};
	if( LINE_CHARACTER_NAME )
		input.body.message += " " + LINE_CHARACTER_NAME + "の口調で返して";
	var result = await HttpUtils.do_http(input);
	console.log(result);

	var message = app.createSimpleResponse(result.message.trim())
	return client.replyMessage(event.replyToken, message);
});

exports.handler = app.lambda();
