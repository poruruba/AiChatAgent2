'use strict';

const HELPER_BASE = "../../helpers/opt/" || "/opt/";
const HttpUtils = require(HELPER_BASE + 'http-utils');

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

const { McpServer, ResourceTemplate } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require("zod");

const RATE_LIMIT = {
  perSecond: 1,
  perMonth: 15000
};

let requestCount = {
  second: 0,
  month: 0,
  lastReset: Date.now()
};

function checkRateLimit() {
  const now = Date.now();
  if (now - requestCount.lastReset > 1000) {
    requestCount.second = 0;
    requestCount.lastReset = now;
  }
  if (requestCount.second >= RATE_LIMIT.perSecond ||
    requestCount.month >= RATE_LIMIT.perMonth) {
    throw new Error('Rate limit exceeded');
  }
  requestCount.second++;
  requestCount.month++;
}

async function performWebSearch(query, count = 10, offset = 0)
{
  checkRateLimit();
  var input = {
    url: "https://api.search.brave.com/res/v1/web/search",
    method: "GET",
    qs: {
      q: query,
      country: "JP",
      search_lang: "jp",
      count: Math.min(count, 20),
      offset: offset
    },
    headers: {
      "X-Subscription-Token": BRAVE_API_KEY,
    }
  };
  var result = await HttpUtils.do_http(input);
  console.log(result);

  const results = (result.web?.results || []).map(result => ({
    title: result.title || '',
    description: result.description || '',
    url: result.url || ''
  }));

  return results.map(r =>
    `Title: ${r.title}\nDescription: ${r.description}\nURL: ${r.url}`
  ).join('\n\n');
}

async function performLocalSearch(query, count = 5)
{
  var input = {
    url: "https://api.search.brave.com/res/v1/web/search",
    method: "GET",
    qs: {
      q: query,
      search_lang: "jp",
      result_filter: "locations",
      count: Math.min(count, 20),
    },
    headers: {
      "X-Subscription-Token": BRAVE_API_KEY,
    }
  };
  var result = await HttpUtils.do_http(input);
  console.log(result);

  const locationIds = result.locations?.results?.filter((r) => r.id != null).map(r => r.id) || [];
  if( locationsIds.length == 0 )
    return performWebSearch(query, count);

  const results = (data.web?.results || []).map(result => ({
    title: result.title || '',
    description: result.description || '',
    url: result.url || ''
  }));

  const [poisData, descriptionsData] = await Promise.all([
    getPoisData(locationIds),
    getDescriptionsData(locationIds)
  ]);

  return formatLocalResults(poisData, descriptionsData);
}

async function getPoisData(ids){
  checkRateLimit();
  const url = new URL('https://api.search.brave.com/res/v1/local/pois');
  ids.filter(Boolean).forEach(id => url.searchParams.append('ids', id));
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Brave API error: ${response.status} ${response.statusText}\n${await response.text()}`);
  }

  const poisResponse = await response.json();
  return poisResponse;
}

async function getDescriptionsData(ids){
  checkRateLimit();
  const url = new URL('https://api.search.brave.com/res/v1/local/descriptions');
  ids.filter(Boolean).forEach(id => url.searchParams.append('ids', id));
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Brave API error: ${response.status} ${response.statusText}\n${await response.text()}`);
  }

  const descriptionsData = await response.json();
  return descriptionsData;
}

function formatLocalResults(poisData, descData) {
  return (poisData.results || []).map(poi => {
    const address = [
      poi.address?.streetAddress ?? '',
      poi.address?.addressLocality ?? '',
      poi.address?.addressRegion ?? '',
      poi.address?.postalCode ?? ''
    ].filter(part => part !== '').join(', ') || 'N/A';

    return `Name: ${poi.name}
Address: ${address}
Phone: ${poi.phone || 'N/A'}
Rating: ${poi.rating?.ratingValue ?? 'N/A'} (${poi.rating?.ratingCount ?? 0} reviews)
Price Range: ${poi.priceRange || 'N/A'}
Hours: ${(poi.openingHours || []).join(', ') || 'N/A'}
Description: ${descData.descriptions[poi.id] || 'No description available'}
`;
  }).join('\n---\n') || 'No local results found';
}

exports.handler = () => {
    const server = new McpServer({
        name: "Mcp/BraveSearch",
        version: "1.0.0"
    });

    server.tool("brave_web_search", "Performs a web search using the Brave Search API, ideal for general queries, news, articles, and online content. " +
    "Use this for broad information gathering, recent events, or when you need diverse web sources. " +
    "Supports pagination, content filtering, and freshness controls. " +
    "Maximum 20 results per request, with offset for pagination. ",
        { query: z.string().describe("Search query (max 400 chars, 50 words)"),
          count: z.number().describe("Number of results (1-20, default 10)").default(10),
          offset: z.number().describe("Pagination offset (max 9, default 0)").default(0) },
        async (args) => {
          try{
            console.log(args);
            var result_text = await performWebSearch(args.query, args.query.count, args.query.offset);

            return {
              content: [
                {
                  type: "text",
                  text: result_text
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

    server.tool("brave_local_search", "Searches for local businesses and places using Brave's Local Search API. " +
    "Best for queries related to physical locations, businesses, restaurants, services, etc. " +
    "Returns detailed information including:\n" +
    "- Business names and addresses\n" +
    "- Ratings and review counts\n" +
    "- Phone numbers and opening hours\n" +
    "Use this when the query implies 'near me' or mentions specific locations. " +
    "Automatically falls back to web search if no local results are found.",
        { query: z.string().describe("Local search query (e.g. 'pizza near Central Park')"), count: z.number().describe("Number of results (1-20, default 5)").default(5) },
        async (args) => {
          try{
            console.log(args);
            var result_text = await performLocalSearch(args.query, args.count);

            return {
              content: [
                {
                  type: "text",
                  text: result_text
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
