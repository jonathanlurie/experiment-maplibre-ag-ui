import './style.css'
import { HttpAgent } from "@ag-ui/client";
import type { ToolMessage, AgentSubscriber, AgentSubscriberParams } from "@ag-ui/client";
import { marked } from 'marked';
import { createAgUiGlobeCapabilities } from './globe-capabilities';

const globeCapabilities = createAgUiGlobeCapabilities();

/**
 * Number of rounds the agent can do from a single prompt,
 * as a prompt can possible require multiple calls to AG-UI tools
 * to perform the required task.
 */
const MAX_AGENT_ROUNDS = 10;

const agent = new HttpAgent({
  url: "http://localhost:8000/agent",
  agentId: "map-agent",
  threadId: crypto.randomUUID(),
});

console.log("HttpAgent initialized:", agent);


const subscriber: AgentSubscriber = {
  // Called whenever the agent produces new text content, called incrementally as the content is generated.
  onTextMessageContentEvent: (args) => {
    console.log("onTextMessageContentEvent:", args)
  },

  onTextMessageStartEvent: (args) => {
    console.log("onTextMessageStartEvent:", args)
  },

  onTextMessageEndEvent: (args) => {
    console.log("onTextMessageEndEvent:", args)
  },

  onRunFailed: ( args ) => {
    console.error("onRunFailed:", args);
  },

  // Called when the agent run completes, regardless of success or failure.
  onRunFinalized(params) {
    console.log("onRunFinalized:", params);
  },

  // Called when the agent run is first initialized, before any processing begins.
  onRunInitialized(params) {
    console.log("onRunInitialized:", params);
  },

  onRunStartedEvent(params) {
    console.log("onRunStartedEvent:", params);
  },

  onRunFinishedEvent(params) {
    console.log("onRunFinishedEvent:", params);
  },

  onRunErrorEvent(params) {
    console.error("onRunErrorEvent:", params);
  },

  onStepStartedEvent(params) {
    console.log("onStepStartedEvent:", params);
  },

  onStepFinishedEvent(params) {
    console.log("onStepFinishedEvent:", params);
  },
}

agent.subscribe(subscriber);

const input =
  document.querySelector<HTMLInputElement>(
    "#prompt"
  )!;

const button =
  document.querySelector<HTMLButtonElement>(
    "#send"
  )!;

const responseElement =
  document.querySelector<HTMLDivElement>(
    "#response"
  )!;


button.addEventListener(
  "click",
  async () => {
    const content = input.value.trim();

    if (!content) {
      return;
    }

    responseElement.innerHTML = "";
    responseElement.style.display = "none";
    button.disabled = true;

    agent.addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content,
    });

    let markdownResponse = "";

    try {
      for (let round = 0; round < MAX_AGENT_ROUNDS; round += 1) {
        console.log("agent round", round + 1);
        const toolResults: ToolMessage[] = [];

        await agent.runAgent(
          {
            tools: globeCapabilities.getToolDescriptions(),
            context: await globeCapabilities.generateContext(),
          },
          {
            async onTextMessageContentEvent({ event }) {
              responseElement.style.display = "block";
              markdownResponse += event.delta;
              responseElement.innerHTML = await marked.parse(markdownResponse);
            },

            async onToolCallEndEvent({ event, toolCallName, toolCallArgs }) {
              let result = await globeCapabilities.callTool(toolCallName, toolCallArgs);

              toolResults.push({
                id: crypto.randomUUID(),
                role: "tool",
                toolCallId: event.toolCallId,
                content: JSON.stringify(result),
              });
            },

            onRunErrorEvent({ event }) {
              console.error("Agent error:", event);
              responseElement.style.display = "block";
              responseElement.textContent = `Error: ${event.message}`;
            },
          },
        );

        if (toolResults.length === 0) {
          break;
        }

        for (const result of toolResults) {
          agent.addMessage(result);
        }

        if (round === MAX_AGENT_ROUNDS - 1) {
          throw new Error(
            `The agent exceeded the limit of ${MAX_AGENT_ROUNDS} consecutive tool-call rounds.`,
          );
        }
      }
    } catch (error) {
      console.error("Could not reach the agent:", error);
      responseElement.style.display = "block";
      responseElement.textContent =
        error instanceof Error ? error.message : "Could not reach the agent.";
    } finally {
      button.disabled = false;
      input.focus();
    }
  },
);

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !button.disabled) {
    button.click();
  }
});
