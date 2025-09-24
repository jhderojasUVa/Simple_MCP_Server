import * as readline from "node:readline";
import { stdin, stdout } from "node:process";
import {
  InitializeResult,
  JsonRpcRequest,
  JsonRpcResponse,
  ExecuteParams,
  ServerInfo
} from "./types";
import { drinks } from "./data/data";
import { tools } from "./tools/tools";

const serverInfo: ServerInfo = {
  name: "Example MCP Coffee Server",
  version: "1.0.0",
  description: "A simple coffee shop server"
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

export function isGetDrinkParams(params: unknown): params is { name: string } {
  return typeof params === "object" && params !== null && "name" in params && typeof (params as { name: unknown }).name === "string";
}

export function executeTool(
  toolName: string,
  params: unknown
): { result: unknown } | { error: string } {
  switch (toolName) {
    case "getDrinkNames":
      return { result: drinks.map((d) => d.name) };
    
    case "getDrinkInformation":
        return { result: drinks.map((d) => d) };

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

export function processRequest(line: string) {
  try {
    const request: JsonRpcRequest = JSON.parse(line);
    if (request.jsonrpc !== "2.0") return;

    switch (request.method) {
      case "initialize": {
        const result: InitializeResult = {
          protocolVersion: "2025-03-26",
          capabilities: { tools: { listChanged: true } },
          serverInfo,
        };
        sendResponse(request.id, result);
        break;
      }

      case "tools/list": {
        sendResponse(request.id, { tools });
        break;
      }

      case "tools/execute":
      case "tools/call": { // Fall-through to handle both legacy and current method names
        const params = request.params as ExecuteParams;
        if (typeof params !== "object" || params === null || typeof params.name !== "string") {
          sendError(request.id, -32602, "Invalid params: 'name' property is missing or not a string.");
          return;
        }

        const toolName = params.name;
        const toolParams = params.parameters ?? {};
        const execution = executeTool(toolName, toolParams);

        if ("result" in execution) {
          sendResponse(request.id, { result: execution.result });
        } else {
          sendError(request.id, -32001, execution.error);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Failed to process request:", err);
  }
}

async function main() {
  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
    terminal: false
  });

  console.log("MCP Server is running");
  for await (const line of rl) {
    processRequest(line);
  }
}

// Run the main function only when the script is executed directly
if (require.main === module) {
  main();
}