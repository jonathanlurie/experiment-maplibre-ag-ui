# AG-UI frontend tool example

This example connects a Vite/TypeScript frontend to a Python LangGraph agent
over AG-UI. The browser advertises a `print` tool on every run. When the model
calls it, the frontend executes it with `console.log`.

## Run the backend

Set your OpenRouter API key, then start FastAPI:

```sh
cd backend
export OPENROUTER_API_KEY="your-key"
# Optional; defaults to openai/gpt-5.1:
export OPENROUTER_MODEL="openai/gpt-5.1"
uv sync
uv run uvicorn main:app --reload --port 8000
```

## Run the frontend

In a second terminal:

```sh
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, open the browser developer console, and send a
prompt such as `Print hello from AG-UI in the browser console.`

The frontend is intentionally responsible for executing `print`; the backend
only forwards its schema to the model and streams the resulting tool call.
