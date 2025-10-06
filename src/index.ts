// Import necessary modules from Node.js and local files.
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

// Define server information, to be sent during initialization.
const serverInfo: ServerInfo = {
  name: "Example MCP Coffee Server",
  version: "1.0.0",
  description: "A simple coffee shop server",
};

/**
 * Sends a successful JSON-RPC response to the client.
 * @param res The HTTP response object.
 * @param id The ID of the original request.
 * @param result The data to be sent as the result.
 */
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
  // Write the JSON response to the stream, followed by a newline.
  res.write(JSON.stringify(response) + "\n");
};

/**
 * Sends an error JSON-RPC response to the client.
 * @param res The HTTP response object.
 * @param id The ID of the original request.
 * @param code The error code.
 * @param message The error message.
 */
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
  // Write the JSON response to the stream, followed by a newline.
  res.write(JSON.stringify(response) + "\n");
};

/**
 * Type guard to check if the given parameters are valid for the 'getDrink' tool.
 * @param params The parameters to check.
 * @returns True if the parameters are valid, false otherwise.
 */
export function isGetDrinkParams(params: unknown): params is { name: string } {
  return (
    typeof params === "object" &&
    params !== null &&
    "name" in params &&
    typeof (params as { name: unknown }).name === "string"
  );
}

/**
 * Executes a specified tool with the given parameters.
 * @param toolName The name of the tool to execute.
 * @param params The parameters for the tool.
 * @returns An object containing either the result of the execution or an error message.
 */
export function executeTool(
  toolName: string,
  params: unknown
): { result: unknown } | { error: string } {
  switch (toolName) {
    case "getDrinkNames":
      // Returns a list of all available drink names.
      return { result: drinks.map((d) => d.name) };

    case "getDrinkInformation":
      // Returns detailed information for all drinks.
      return { result: drinks.map((d) => d) };

    case "getDrink": {
      // Returns information for a specific drink.
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
      // Handles unknown tool names.
      return { error: `Unknown tool: ${toolName}` };
  }
}

/**
 * Processes a single JSON-RPC request.
 * @param res The HTTP response object.
 * @param request The JSON-RPC request to process.
 */
export function processRequest(
  res: http.ServerResponse,
  request: JsonRpcRequest
) {
  // Ensure the request is a valid JSON-RPC 2.0 request.
  if (request.jsonrpc !== "2.0") return;

  switch (request.method) {
    case "initialize": {
      // Handle the 'initialize' request to set up the connection.
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
      // Handle the 'tools/list' request to send the list of available tools.
      sendResponse(res, request.id, { tools });
      break;
    }

    case "tools/execute":
    case "tools/call": {
      // Handle both legacy and current method names for tool execution.
      const params = request.params as ExecuteParams;

      const toolName = params.name;
      // Accommodate different argument structures.
      const toolParams = params.arguments ?? (params as any).arguments ?? {};
      const execution = executeTool(toolName, toolParams);

      // Send the result or an error based on the execution outcome.
      if ("result" in execution) {
        sendResponse(res, request.id, { result: execution.result });
      } else {
        sendError(res, request.id, -32001, execution.error);
      }
      break;
    }
  }
}

/**
 * The main function that starts the HTTP server.
 */
async function main() {
  // Create an HTTP server to handle incoming requests.
  const server = http.createServer((req, res) => {
    // Only handle POST requests to the root URL.
    if (req.method === "POST" && req.url === "/") {
      let body = "";
      // Accumulate request body data.
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      // Process the request body when it's fully received.
      req.on("end", () => {
        try {
          // Split the body by newlines to handle multiple JSON objects.
          const requests: JsonRpcRequest[] = body
            .split("\n")
            .filter((line) => line.length > 0)
            .map((line) => JSON.parse(line));
          // Process each request individually.
          for (const request of requests) {
            processRequest(res, request);
          }
        } catch (err) {
          console.error("Failed to process request:", err);
        } finally {
          // End the response stream.
          res.end();
        }
      });
    } else {
      // Respond with a 404 for any other requests.
      res.writeHead(404);
      res.end();
    }
  });

  // Define the port for the server to listen on.
  const port = 3000;
  // Start the server.
  server.listen(port, () => {
    console.log(`MCP Server is running on port ${port}`);
  });
}

// Run the main function only when the script is executed directly.
if (require.main === module) {
  main();
}
