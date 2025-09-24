export interface Item {
    name: string;
    price: number;
    description: string;
}

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: {
    tools: {
      listChanged: boolean;
    };
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface ExecuteParams {
  name: string;
  parameters?: Record<string, unknown>;
}