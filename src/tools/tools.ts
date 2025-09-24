import { Tool } from "../types";

export const tools: Tool[] = [
  {
    name: "getDrinkNames",
    description: "Get the name of the drinks",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "getDrink",
    description: "Get the drink by name",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
    },
  },
];