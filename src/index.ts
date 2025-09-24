import * as readline from "node:readline";
import { stdin, stdout } from "node:process";
import {
  InitializeResult,
  JsonRpcRequest,
  JsonRpcResponse,
  Tool,
  ExecuteParams,
} from "./types";
import { drinks } from "./data/data";
import { tools } from "./tools/tools";

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
});

const serverInfo = {
  name: "Example MCP Coffee Server",
  version: "1.0.0",
};

const sendResponse = (id: number, result: unknown) => {
  const response: JsonRpcResponse = {
    jsonrpc: "2.0",
    id,
    result,
  };

  stdout.write(JSON.stringify(response) + "\n");
};

const sendError = (id: number, code: number, message: string) => {
  const response: JsonRpcResponse = {
    jsonrpc: "2.0",
    id,
    error: { code, message },
  };
  stdout.write(JSON.stringify(response) + "\n");
};

function isGetDrinkParams(params: unknown): params is { name: string } {
  return typeof params === "object" && params !== null && "name" in params && typeof (params as { name: unknown }).name === "string";
}

function executeTool(
  toolName: string,
  params: unknown
): { result: unknown } | { error: string } {
  switch (toolName) {
    case "getDrinkNames":
      return { result: drinks.map((d) => d.name) };

    case "getDrink": {
      if (isGetDrinkParams(params)) {
        const drink = drinks.find((d) => d.name.toLowerCase() === params.name.toLowerCase());
        return drink ? { result: drink } : { error: `Drink '${params.name}' not found.` };
      }
      return { error: "Invalid parameters for getDrink. 'name' must be a string." };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

(async function main() {
  console.log("MCP Server is running");
  for await (const line of rl) {
    try {
      const request: JsonRpcRequest = JSON.parse(line);
      if (request.jsonrpc !== "2.0") continue;

      if (request.method === "initialize") {
        const result: InitializeResult = {
          protocolVersion: "2025-03-26",
          capabilities: { tools: { listChanged: true } },
          serverInfo,
        };
        sendResponse(request.id, result);
      } else if (request.method === "tools/list") {
        sendResponse(request.id, { tools });
      } else if (request.method === "tools/execute") {
        const params = request.params as ExecuteParams;
        // Type-safe check for execution parameters, ensuring params is a valid object with a 'name' property.
        if (typeof params !== "object" || params === null || typeof params.name !== "string") {
          sendError(request.id, -32602, "Invalid params: 'name' property is missing or not a string.");
          continue;
        }

        const toolName = params.name;
        const toolParams = params.parameters ?? {};

        const execution = executeTool(toolName, toolParams);

        if ("result" in execution) {
          sendResponse(request.id, { result: execution.result });
        } else {
          sendError(request.id, -32001, execution.error); // Use a specific error code for tool execution failure
        }
      }
    } catch (err) {
      console.error("Failed to process request:", err);
    }
  }
})();