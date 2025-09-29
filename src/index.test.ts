import { PassThrough } from "node:stream";
import {
  executeTool,
  isGetDrinkParams,
  processRequest,
} from "./index";
import { drinks } from "./data/data";
import { tools } from "./tools/tools";
import { JsonRpcRequest, JsonRpcResponse } from "./types";

// Mock the process I/O to capture output
let mockStdout: jest.SpyInstance;

beforeEach(() => {
  // Spy on stdout.write and mock its implementation to avoid printing to console
  mockStdout = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
});

afterEach(() => {
  // Restore the original implementation after each test
  mockStdout.mockRestore();
});

describe("isGetDrinkParams", () => {
  it("should return true for valid params", () => {
    expect(isGetDrinkParams({ name: "Latte" })).toBe(true);
  });

  it("should return false for params missing name", () => {
    expect(isGetDrinkParams({ description: "A hot drink" })).toBe(false);
  });

  it("should return false for params with non-string name", () => {
    expect(isGetDrinkParams({ name: 123 })).toBe(false);
  });

  it("should return false for null or non-object params", () => {
    expect(isGetDrinkParams(null)).toBe(false);
    expect(isGetDrinkParams("Latte")).toBe(false);
  });
});

describe("executeTool", () => {
  it("should return a list of drink names for getDrinkNames", () => {
    const expected = { result: drinks.map((d) => d.name) };
    expect(executeTool("getDrinkNames", {})).toEqual(expected);
  });

  it("should return full drink information for getDrinkInformation", () => {
    const expected = { result: drinks };
    expect(executeTool("getDrinkInformation", {})).toEqual(expected);
  });

  it("should return a specific drink for getDrink", () => {
    const basicDrink = {
      name: 'Americano',
      price: 8,
      description: "A coffee drink with a lot of water",
    }
    const drink = drinks[0] || basicDrink;
    const expected = { result: drink };
    expect(executeTool("getDrink", { name: drink.name })).toEqual(expected);
  });

  it("should return an error if getDrink drink is not found", () => {
    const drinkName = "Non-existent Drink";
    const expected = { error: `Drink '${drinkName}' not found.` };
    expect(executeTool("getDrink", { name: drinkName })).toEqual(expected);
  });

  it("should return an error for getDrink with invalid params", () => {
    const expected = {
      error: "Invalid parameters for getDrink. 'name' must be a string.",
    };
    expect(executeTool("getDrink", { wrong_param: "value" })).toEqual(expected);
  });

  it("should return an error for an unknown tool", () => {
    const toolName = "unknownTool";
    const expected = { error: `Unknown tool: ${toolName}` };
    expect(executeTool(toolName, {})).toEqual(expected);
  });
});

describe("processRequest", () => {
  it("should handle initialize request", () => {
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {},
    };
    processRequest(JSON.stringify(request));

    const response: JsonRpcResponse = {
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-03-26",
        capabilities: { tools: { listChanged: true } },
        serverInfo: {
          name: "Example MCP Coffee Server",
          version: "1.0.0",
          description: "A simple coffee shop server",
        },
      },
    };

    expect(mockStdout).toHaveBeenCalledWith(JSON.stringify(response) + "\n");
  });

  it("should handle tools/list request", () => {
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    };
    processRequest(JSON.stringify(request));

    const response: JsonRpcResponse = {
      jsonrpc: "2.0",
      id: 2,
      result: { tools },
    };

    expect(mockStdout).toHaveBeenCalledWith(JSON.stringify(response) + "\n");
  });

  it("should handle tools/execute request successfully", () => {
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/execute",
      params: { name: "getDrinkNames", parameters: {} },
    };
    processRequest(JSON.stringify(request));

    const response: JsonRpcResponse = {
      jsonrpc: "2.0",
      id: 3,
      result: { result: drinks.map((d) => d.name) },
    };

    expect(mockStdout).toHaveBeenCalledWith(JSON.stringify(response) + "\n");
  });

  it("should handle tools/execute request with an error", () => {
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/execute",
      params: { name: "unknownTool", parameters: {} },
    };
    processRequest(JSON.stringify(request));

    const response: JsonRpcResponse = {
      jsonrpc: "2.0",
      id: 4,
      error: { code: -32001, message: "Unknown tool: unknownTool" },
    };

    expect(mockStdout).toHaveBeenCalledWith(JSON.stringify(response) + "\n");
  });

  it("should send an error for invalid tools/execute params", () => {
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/execute",
      params: { parameters: {} }, // Missing 'name'
    };
    processRequest(JSON.stringify(request));

    const response: JsonRpcResponse = {
      jsonrpc: "2.0",
      id: 5,
      error: {
        code: -32601,
        message: "Unknown tool: undefined",
      },
    };

    expect(mockStdout).toHaveBeenCalledWith(JSON.stringify(response) + "\n");
  });

  it("should ignore requests with invalid jsonrpc version", () => {
    const request = { jsonrpc: "1.0", id: 6, method: "initialize" };
    processRequest(JSON.stringify(request));
    expect(mockStdout).not.toHaveBeenCalled();
  });

  it("should handle invalid JSON", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    processRequest("not a valid json");
    expect(mockStdout).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});