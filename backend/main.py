import logging
import os
from typing import Any, TypedDict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from langchain_core.messages import AIMessage, SystemMessage
from langchain_openai import ChatOpenAI

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import StateGraph, MessagesState, START, END

from ag_ui_langgraph import (
    LangGraphAgent,
    add_langgraph_fastapi_endpoint,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------
# LangGraph state
# ---------------------------------------------------

# The adapter uses the literal key "ag-ui". A functional TypedDict is needed
# because that hyphenated key cannot be declared with normal class syntax.
AgentState = TypedDict(
    "AgentState",
    {
        **MessagesState.__annotations__,
        "tools": list[Any],
        "ag-ui": dict[str, Any],
    },
)


# ---------------------------------------------------
# LangGraph node
# ---------------------------------------------------

async def chat_node(state: AgentState):
    # Direct OpenAI configuration kept for reference:
    # model = ChatOpenAI(
    #     model="gpt-5.1",
    #     api_key=os.environ["OPENAI_API_KEY"],
    # )

    # OpenRouter exposes an OpenAI-compatible API, so ChatOpenAI can be kept
    # while pointing it at OpenRouter's endpoint and using an OpenRouter model
    # slug. OPENROUTER_MODEL is optional and makes switching models painless.
    model = ChatOpenAI(
        model=os.getenv("OPENROUTER_MODEL", "openai/gpt-5.1"),
        api_key=os.environ["OPENROUTER_API_KEY"],
        base_url="https://openrouter.ai/api/v1",
        default_headers={
            "HTTP-Referer": "http://localhost:5173",
            "X-OpenRouter-Title": "AG-UI map agent",
        },
    )
    model_with_tools = model.bind_tools(state.get("tools", []))

    # ag-ui-langgraph stores frontend context in its nested AG-UI state.
    frontend_context = state.get("ag-ui", {}).get("context", [])

    context_text = "\n".join(
        f"{item.description}: {item.value}"
        for item in frontend_context
    )

    print(f"Frontend context:\n{context_text}")

    try:
        response = await model_with_tools.ainvoke(
            [
                SystemMessage(
                    content=(
                        "You are a helpful map assistant.\n\n"
                        f"Frontend context:\n{context_text}"
                    )
                ),
                *state["messages"],
            ]
        )
    except Exception:
        logger.exception("Model invocation failed")

        return {
            "messages": [
                AIMessage(
                    content=(
                        "I couldn't complete that request because the model "
                        "conversation was in an invalid state."
                    )
                )
            ]
        }

    return {"messages": [response]}

# ---------------------------------------------------
# LangGraph
# ---------------------------------------------------

builder = StateGraph(AgentState)

builder.add_node(
    "chat",
    chat_node,
)

builder.add_edge(
    START,
    "chat",
)

builder.add_edge(
    "chat",
    END,
)

# The AG-UI adapter reads LangGraph state by thread ID before each run, so the
# graph must have a checkpointer. In-memory storage is sufficient for this
# local example; use a persistent saver in production.
graph = builder.compile(checkpointer=InMemorySaver())


# ---------------------------------------------------
# FastAPI
# ---------------------------------------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------
# AG-UI adapter
# ---------------------------------------------------

agent = LangGraphAgent(
    name="map-agent",
    graph=graph,
    emit_raw_events=False,
)

add_langgraph_fastapi_endpoint(
    app=app,
    agent=agent,
    path="/agent",
)
