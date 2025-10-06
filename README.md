# Example of MCP server in Typescript

A basic example of an MCP server in Typescript running over HTTP.

It gives you the list of the drinks or you can ask to order one particular.

# How to use it

Start the server by building and running it:

```bash
npm run build
npm start
```

Or, in one shot, use `npm run start:build`.

You can also start in development mode with `npm run dev`, which will watch for changes.

The server will be running on `http://localhost:3000`.

# How to test it

You can use a tool like `curl` to send JSON-RPC requests to the server.

### 1. Initialize

This request initializes the connection with the server.

```bash
curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' http://localhost:3000
```

### 2. List Tools

This request asks the server for the list of available tools.

```bash
curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' http://localhost:3000
```

### 3. Execute a Tool (getDrinkNames)

This request executes the `getDrinkNames` tool to get a list of all drink names.

```bash
curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":3,"method":"tools/execute","params":{"name":"getDrinkNames","arguments":{}}}' http://localhost:3000
```

### 4. Execute a Tool (getDrink)

This request executes the `getDrink` tool to get information about a specific drink.

```bash
curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":4,"method":"tools/execute","params":{"name":"getDrink","arguments":{"name":"Latte"}}}' http://localhost:3000
```