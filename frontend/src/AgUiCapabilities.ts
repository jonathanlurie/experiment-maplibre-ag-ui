import type { Tool, Context } from "@ag-ui/client";

type ToolHandler = (args: any) => Promise<unknown>;
type ContextHandler = () => string |Promise<string>;

export class AgUiCapabilities {
  private toolStaticDescription: Map<string, Tool>;
  private toolCallbacks: Map<string, ToolHandler>;
  private contextEntries: { description: string; callback: ContextHandler }[] = [];

  constructor() {
    this.toolStaticDescription = new Map();
    this.toolCallbacks = new Map();
    this.contextEntries = [];
  }

  addTool<TArgs>(
    description: Tool,
    callback: (args: TArgs) => Promise<unknown>,
  ) {
    this.toolStaticDescription.set(description.name, description);
    this.toolCallbacks.set(description.name, callback as ToolHandler);
  }

  getToolDescriptions(): Tool[] {
    return Array.from(this.toolStaticDescription.values());
  }

  async callTool(toolCallName: string, toolCallArgs: Record<string, unknown>): Promise<unknown> {
    if (!this.toolCallbacks.has(toolCallName)) {
      return {
        success: false,
        error: "Tool not found: " + toolCallName,
      };
    }

    const callback = this.toolCallbacks.get(toolCallName)!;
    try {
      return await callback(toolCallArgs);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  addContextEntry(description: string, callback: ContextHandler) {
    this.contextEntries.push({ description, callback });
  }


  async generateContext(): Promise<Context[]> {
    const context: Context[] = [];
    for (const entry of this.contextEntries) {
      try {
        const value = await entry.callback();
        context.push({ description: entry.description, value });
      } catch (error) {
        console.error("Error generating context entry:", error);
      }
    }
    return context;
  }

}
