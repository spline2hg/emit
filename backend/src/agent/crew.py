"""Agent + per-turn crew for the Emit log-chat feature.

A fresh ``Agent``/``Task``/``Crew`` is built per request. That is cheap and is
what makes workspace scoping watertight: the tools are bound to that request's
``workspace_id`` for the lifetime of the crew, so no cross-request or
cross-tenant leakage is possible.

Uses only stable CrewAI APIs (``Agent``/``Task``/``Crew`` + the ``LLM``
connection object), not the experimental Conversational Flow.
"""

from __future__ import annotations

from datetime import datetime
from typing import List

from crewai import Agent, Crew, Task, LLM

from config import Config
from agent.tools import LogCountTool, LogSearchTool, ListServicesTool


def build_llm() -> LLM:
    """Construct the OpenAI-compatible LLM from env-driven config.

    Fresh per turn so config changes (e.g. a rotated key) take effect without a
    restart. ``base_url`` is passed through even when ``None`` — CrewAI/litellm
    then falls back to the model's default endpoint.
    """
    return LLM(
        model=Config.LLM_MODEL,
        base_url=Config.LLM_BASE_URL,
        api_key=Config.LLM_API_KEY,
        temperature=Config.LLM_TEMPERATURE,
    )


def _format_history(history: List[dict]) -> str:
    """Render prior turns as a compact transcript for the task description."""
    if not history:
        return "(none)"
    lines = []
    for msg in history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        speaker = "User" if role == "user" else "Assistant"
        lines.append(f"{speaker}: {content}")
    return "\n".join(lines)


def build_log_crew(workspace_id: str, message: str, history: List[dict]) -> Crew:
    """Build a single-agent crew scoped to ``workspace_id`` for one question."""
    agent = Agent(
        role="Emit Log Analyst",
        goal=(
            "Answer the user's questions about their logs accurately using the "
            "provided log tools. For any factual question about logs, call a "
            "log tool before answering; for how-many questions, call "
            "count_logs. Greetings, thanks, and small talk need no tools — "
            "just reply briefly. Never invent log entries or counts; if a "
            "tool returns nothing, say no matching logs were found."
        ),
        backstory=(
            "You are an SRE assistant inside Emit, a multi-tenant log platform. "
            "You can only see logs in the user's workspace through the "
            "search/count/list tools."
        ),
        llm=build_llm(),
        tools=[
            LogSearchTool(workspace_id),
            LogCountTool(workspace_id),
            ListServicesTool(workspace_id),
        ],
        allow_delegation=False,
        verbose=False,
    )

    today = datetime.utcnow().date().isoformat()
    task = Task(
        description=(
            f"Conversation so far:\n{_format_history(history)}\n\n"
            f"New question:\n{message}\n\n"
            "Use the log tools to find facts before answering; do not answer "
            "from memory or assumptions. Greetings and small talk (hi, hello, "
            "thanks) need no tool calls — reply briefly and offer help.\n"
            "Date rules: leave from_time and to_time empty unless the user "
            "names a day or range. Never default them to today. When the "
            "user does name a day or range, resolve it against today's date.\n"
            "Keep answers concise; cite counts and a few representative "
            "examples (timestamp, level, service).\n"
            f"Today is {today}."
        ),
        expected_output=(
            "A concise answer grounded in tool results, with counts and "
            "examples where relevant."
        ),
        agent=agent,
    )

    return Crew(agents=[agent], tasks=[task], verbose=False)
