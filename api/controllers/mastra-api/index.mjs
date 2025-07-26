const HELPER_BASE = "../../helpers/opt/" || "/opt/";
import Response from '../../helpers/opt/response.mjs';
import Redirect from '../../helpers/opt/redirect.mjs';

import { google } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";
import { MCPClient } from "@mastra/mcp";
import { Memory } from '@mastra/memory';
import { LibSQLStore } from "@mastra/libsql";

const MASTRA_API_KEY = process.env.MASTRA_API_KEY;
const EXA_API_KEY = process.env.EXA_API_KEY;
const PUBLIC_HOST_NAME = process.env.PUBLIC_HOST_NAME;

let agent;
let memory;
let g_threadId = 0;
let g_lastAgentGenerated = 0;

function getThreadId(){
	var datetime = new Date().getTime();
	if( g_threadId == 0 || (g_lastAgentGenerated + 10 * 60 * 1000) < datetime){
		g_threadId = datetime;
		g_lastAgentGenerated = datetime;
	}else{
		g_lastAgentGenerated = datetime;
	}

	return String(g_threadId);
}

(async () =>{
	try{
		const mcp = new MCPClient({
			servers: {
				Weather: {
					url: new URL(PUBLIC_HOST_NAME + "/mcp-weather")
				},
				GoogleMap: {
					url: new URL(PUBLIC_HOST_NAME + "/mcp-googlemap")
				},
				BraveSearch: {
					url: new URL(PUBLIC_HOST_NAME + "/mcp-bravesearch")
				},
				GoogleCalendar: {
					url: new URL(PUBLIC_HOST_NAME + "/mcp-googlecalendar")
				},
				Gmail: {
					url: new URL(PUBLIC_HOST_NAME + "/mcp-gmail")
				},
				GoogleTask: {
					url: new URL(PUBLIC_HOST_NAME + "/mcp-googletask")
				},
				DateTime: {
					url: new URL(PUBLIC_HOST_NAME + "/mcp-datetime")
				},
				Exa:{
					url: new URL("https://mcp.exa.ai/mcp?exaApiKey=" + EXA_API_KEY)
				},
			},
		});

		memory = new Memory({
			storage: new LibSQLStore({
				url: "file:" + process.env.THIS_BASE_PATH + "/data/mastra/mastra.db"
			}),
			options: {
				threads: {
					generateTitle: true
				}
			}
		});
		agent = new Agent({
			name: 'Chat Agent',
			instructions: `自由に会話をします。`,
			model: google('gemini-1.5-pro-latest'),
			tools: await mcp.getTools(),
			memory: memory
		});

		console.log("Mastra Agent started");
	}catch(error){
		console.error(error);
	}
})();

export const handler = async (event, context, callback) => {
	var body = JSON.parse(event.body);
	console.log(body);

	var apikey = event.requestContext.apikeyAuth?.apikey;
	if( apikey != MASTRA_API_KEY )
		throw new Error("invalid apikey");

	if( event.path == "/mastra-generate" ){
		var threadId = getThreadId();
		const response = await agent.generate(
			[
				{
					role: "user", // "system" "assistant" "user"
					content: body.message,
				},
			],
			{
				resourceId: "myresource",
				threadId: threadId,
			}
		);
		console.log(response);

		return new Response({ message: response.text, threadId: threadId });
	}else

	if( event.path == "/mastra-get-thread-list" ){
		var threads = await memory.getThreadsByResourceId({ resourceId: "myresource" });
//		console.log(threads);

		return new Response({ list: threads });
	}else

	if( event.path == "/mastra-query-thread" ){
		var thread = await memory.query({ threadId: body.id });
		console.log(thread);

		return new Response({ thread: thread.messages });
	}else

	if( event.path == "/mastra-delete-all-thread" ){
		var threads = await memory.getThreadsByResourceId({ resourceId: "myresource" });
		console.log(threads);

		for( let item of threads ){
			memory.deleteThread(item.id);
		}

		return new Response({});
	}else

	if( event.path == "/mastra-new-thread" ){
		g_threadId = 0;
		return new Response({});
	}else

	if( event.path == "/mastra-list-tools" ){
		var tools = agent.getTools();
		var list = Object.keys(tools).map(key => {
			return {
				id: tools[key].id,
				description: tools[key].description,
			}
		});
		return new Response({ list: list });
	}else

	{
		throw new Error("unknown endpoint");
	}
};
