#!/usr/bin/env node
// Minimal fake MCP server for testing agent-reach X MCP backend detection.
// Returns fake tweets — verifies the routing logic in twitter.py without
// requiring a real Twitter MCP server (which needs API keys or cookies).
//
// Usage:
//   mcporter config add twitter --command node --arg <path-to-this-file> --transport stdio
//   mcporter call "twitter.search_tweets(query: \"test\", count: 3)"
//   agent-reach doctor | grep Twitter   # should show X MCP (mcporter) active

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "fake-x-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "search_tweets",
    description: "Fake search tweets for testing X MCP backend routing",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        count: { type: "number" }
      }
    }
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => ({
  content: [{
    type: "text",
    text: JSON.stringify({
      tool: req.params.name,
      args: req.params.arguments,
      result: "fake success - X MCP backend routing works!",
      tweets: [
        { id: "1", text: "Fake tweet about " + (req.params.arguments?.query || "test"), author: "testuser" },
        { id: "2", text: "Another fake tweet about " + (req.params.arguments?.query || "test"), author: "another" }
      ]
    }, null, 2)
  }]
}));

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("fake-x-mcp ready");
