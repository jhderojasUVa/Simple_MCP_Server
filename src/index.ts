import * as http from "http";
import {
  InitializeResult,
  JsonRpcRequest,
  JsonRpcResponse,
  ExecuteParams,
  ServerInfo,
} from "./types";
import { drinks } from "./data/data";
import { tools } from "./tools/tools";

const serverInfo: ServerInfo = {
  name: "Example MCP Coffee Server",
  version: "1.0.0",
  description: "A simple coffee shop server",
};

const sendResponse = (
  res: http.ServerResponse,
  id: number,
  result: unknown
) => {
  const response: JsonRpcResponse = {
    jsonrpc: "2.0",
    id,
    result,
  };
  res.write(JSON.stringify(response) + "\n");
};

const sendError = (
  res: http.ServerResponse,
  id: number,
  code: number,
  message: string
) => {
  const response: JsonRpcResponse = {
    jsonrpc: "2.0",
    id,
    error: { code, message },
  };
  res.write(JSON.stringify(response) + "\n");
};

export function isGetDrinkParams(params: unknown): params is { name: string } {
  return (
    typeof params === "object" &&
    params !== null &&
    "name" in params &&
    typeof (params as { name: unknown }).name === "string"
  );
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
        const drink = drinks.find(
          (d) => d.name.toLowerCase() === params.name.toLowerCase()
        );
        return drink
          ? { result: drink }
          : { error: `Drink '${params.name}' not found.` };
      }
      return {
        error: "Invalid parameters for getDrink. 'name' must be a string.",
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

export function processRequest(
  res: http.ServerResponse,
  request: JsonRpcRequest
) {
  if (request.jsonrpc !== "2.0") return;

  switch (request.method) {
    case "initialize": {
      const result: InitializeResult = {
        protocolVersion: "2025-03-26",
        capabilities: {
          tools: { listChanged: true },
          transport: "streamable-http",
        },
        serverInfo,
      };
      sendResponse(res, request.id, result);
      break;
    }

    case "tools/list": {
      sendResponse(res, request.id, { tools });
      break;
    }

    case "tools/execute":
    case "tools/call": {
      // Fall-through to handle both legacy and current method names
      const params = request.params as ExecuteParams;

      const toolName = params.name;
      const toolParams = params.arguments ?? (params as any).arguments ?? {};
      const execution = executeTool(toolName, toolParams);

      if ("result" in execution) {
        sendResponse(res, request.id, { result: execution.result });
      } else {
        sendError(res, request.id, -32001, execution.error);
      }
      break;
    }
  }
}

async function main() {
  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const requests: JsonRpcRequest[] = body
            .split("\n")
            .filter((line) => line.length > 0)
            .map((line) => JSON.parse(line));
          for (const request of requests) {
            processRequest(res, request);
          }
        } catch (err) {
          console.error("Failed to process request:", err);
        } finally {
          res.end();
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const port = 3000;
  server.listen(port, () => {
    console.log(`MCP Server is running on port ${port}`);
  });
}

// Run the main function only when the script is executed directly
if (require.main === module) {
  main();
}