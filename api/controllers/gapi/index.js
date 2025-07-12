'use strict';

const HELPER_BASE = process.env.HELPER_BASE || '../../helpers/';
const Response = require(HELPER_BASE + 'response');
const Redirect = require(HELPER_BASE + 'redirect');
const jsonfile = require(HELPER_BASE + 'jsonfile-utils');

const TOKEN_FILE_PATH = process.env.THIS_BASE_PATH + '/data/gapi/access_token.json';
const GOOGLEAPI_CLIENT_ID = process.env.GOOGLEAPI_CLIENT_ID;
const GOOGLEAPI_CLIENT_SECRET = process.env.GOOGLEAPI_CLIENT_SECRET;
const GOOGLEAPI_REDIRECT_URL = process.env.GOOGLEAPI_REDIRECT_URL;

const GAPI_API_KEY = process.env.GAPI_API_KEY;

var GOOGLEAPI_SCOPES = [
  "openid",
  'profile',
	'https://www.googleapis.com/auth/gmail.send',
	'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
	'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/tasks',
];

const {google} = require('googleapis');

exports.handler = async (event, context, callback) => {
  if( event.path == "/gapi/client_info"){
    return new Response({
      client_id: GOOGLEAPI_CLIENT_ID,
      redirect_url: GOOGLEAPI_REDIRECT_URL
    });
  }else

	if( event.path == '/gapi/authorize' ){
    console.log(event.queryStringParameters);
		var params = {
			scope: GOOGLEAPI_SCOPES,
			access_type: 'offline'
		};
		if( event.queryStringParameters.state )
			params.state = event.queryStringParameters.state;
		if( event.queryStringParameters.prompt )
			params.prompt = event.queryStringParameters.prompt;
		if( event.queryStringParameters.access_type )
			params.access_type = event.queryStringParameters.access_type;
    console.log(params);
		const auth = new google.auth.OAuth2(GOOGLEAPI_CLIENT_ID, GOOGLEAPI_CLIENT_SECRET, GOOGLEAPI_REDIRECT_URL);
		var url = auth.generateAuthUrl(params);
		return new Redirect(url);
	}else

	if( event.path == '/gapi/token'){
    if( event.requestContext.apikeyAuth?.apikey != GAPI_API_KEY )
      throw Error("invalid apikey");

    var body = JSON.parse(event.body);
    const auth = new google.auth.OAuth2(GOOGLEAPI_CLIENT_ID, GOOGLEAPI_CLIENT_SECRET, GOOGLEAPI_REDIRECT_URL);
    var result = await auth.getToken(body.code);
    console.log(result);
    var token = result.tokens;

    var json = await jsonfile.read_json(TOKEN_FILE_PATH, {});
    json.access_token = token.access_token;
    json.id_token = token.id_token;
    if (token.refresh_token ){
      json.refresh_token = token.refresh_token;
      json.refresh_token_expires_in = token.refresh_token_expires_in;
    }
    json.scope = token.scope;
    json.token_type = token.token_type;
    json.expiry_date = token.expiry_date;
    json.created_at = new Date().getTime();

    await jsonfile.write_json(TOKEN_FILE_PATH, json);    

    return new Response(token);
  }else

  if (event.path == '/gapi/token-refresh') {
    if( event.requestContext.apikeyAuth?.apikey != GAPI_API_KEY )
      throw Error("invalid apikey");

    var json = await jsonfile.read_json(TOKEN_FILE_PATH);
    if (!json) {
      console.log('file is not ready.');
      throw 'file is not ready.';
    }

    try{
      const auth = new google.auth.OAuth2(GOOGLEAPI_CLIENT_ID, GOOGLEAPI_CLIENT_SECRET, GOOGLEAPI_REDIRECT_URL);
      var result = await auth.refreshToken(json.refresh_token);
      var token = result.tokens;

      var json = await jsonfile.read_json(TOKEN_FILE_PATH, {});
      json.access_token = token.access_token;
      json.id_token = token.id_token;
      if (token.refresh_token ){
        json.refresh_token = token.refresh_token;
        json.refresh_token_expires_in = token.refresh_token_expires_in;
      }
      json.scope = token.scope;
      json.token_type = token.token_type;
      json.expiry_date = token.expiry_date;
      json.created_at = new Date().getTime();

      await jsonfile.write_json(TOKEN_FILE_PATH, json);    

      return new Response(token);
    }catch(error){
      throw new Error(error);
    }
  }else

  {
    throw new Error("Unknown endpoint");
  }
};
