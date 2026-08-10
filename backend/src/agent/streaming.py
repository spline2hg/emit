"""Route CrewAI events to the SSE request that owns the running crew."""

from __future__ import annotations

from dataclasses import dataclass
import json
import logging
import queue
import threading
import uuid
from typing import Any, Callable

from crewai.events import (
    BaseEventListener,
    CrewKickoffCompletedEvent,
    CrewKickoffFailedEvent,
    LLMStreamChunkEvent,
    ToolUsageFinishedEvent,
    ToolUsageStartedEvent,
)


@dataclass(frozen=True)
class StreamChannel:
    response_queue: queue.Queue
    identifiers: frozenset[str]
    on_event: Callable[[str, Any], None] | None = None


def _event_value(event, *names: str, default=None):
    """Read a CrewAI event field across minor event-model versions."""
    for name in names:
        value = getattr(event, name, None)
        if value is not None:
            return value
    return default


def _json_safe(value, max_length: int = 4000):
    """Keep event payloads JSON-safe and bounded before sending them to the UI."""
    if value is None:
        return None
    if hasattr(value, "model_dump"):
        value = value.model_dump()
    elif hasattr(value, "dict") and callable(value.dict):
        value = value.dict()

    try:
        encoded = json.dumps(value, default=str)
    except (TypeError, ValueError):
        encoded = json.dumps(str(value))

    if len(encoded) <= max_length:
        return value
    return encoded[: max_length - 3] + "..."


def _tool_event_payload(event, finished: bool) -> dict:
    """Create the stable tool event contract consumed by ChatPanel."""
    name = str(_event_value(event, "tool_name", "name", default="tool"))
    call_id = _event_value(
        event,
        "started_event_id" if finished else "tool_call_id",
        "tool_call_id" if finished else "call_id",
        "call_id" if finished else "event_id",
        "event_id",
    )
    payload = {"name": name}
    if call_id is not None:
        payload["call_id"] = str(call_id)

    payload["arguments"] = _json_safe(
        _event_value(
            event,
            "tool_input",
            "tool_args",
            "arguments",
            "input",
            default={},
        )
    )
    if finished:
        payload["result"] = _json_safe(
            _event_value(event, "output", "result", "tool_output", default=None)
        )
    return payload


class SSEEventBridge(BaseEventListener):
    """Forward each CrewAI event only to the request that owns its crew.

    The browser receives a small, stable event contract instead of raw CrewAI
    objects. Tool start/end events contain the tool name, call id, arguments,
    and bounded result so the thinking panel can show what actually happened.
    """

    def __init__(self) -> None:
        super().__init__()
        self._channels: dict[str, StreamChannel] = {}
        self._lock = threading.Lock()

    def register(
        self,
        response_queue: queue.Queue,
        identifiers: set[str],
        on_event: Callable[[str, Any], None] | None = None,
    ) -> str:
        if not identifiers:
            raise ValueError("A stream requires at least one CrewAI identifier")
        channel_id = str(uuid.uuid4())
        channel = StreamChannel(response_queue, frozenset(identifiers), on_event)
        with self._lock:
            self._channels[channel_id] = channel
        return channel_id

    def unregister(self, channel_id: str) -> None:
        with self._lock:
            self._channels.pop(channel_id, None)

    @staticmethod
    def _event_identifiers(event) -> set[str]:  # type: ignore[no-untyped-def]
        identifiers = set()
        for attribute in ("source_fingerprint", "task_id", "agent_id"):
            value = getattr(event, attribute, None)
            if value:
                identifiers.add(str(value))
        return identifiers

    def _emit(
        self,
        kind: str,
        payload,
        event,
    ) -> None:  # type: ignore[no-untyped-def]
        event_identifiers = self._event_identifiers(event)
        if not event_identifiers:
            return

        with self._lock:
            channels = list(self._channels.values())

        for channel in channels:
            if channel.identifiers.intersection(event_identifiers):
                if channel.on_event is not None:
                    try:
                        channel.on_event(kind, payload)
                    except Exception:
                        logging.getLogger(__name__).exception(
                            "Failed to persist chat event"
                        )
                channel.response_queue.put((kind, payload))

    def setup_listeners(self, bus) -> None:  # type: ignore[no-untyped-def]
        @bus.on(LLMStreamChunkEvent)
        def _on_chunk(_sender, event):  # type: ignore[no-untyped-def]
            self._emit("token", event.chunk, event)

        @bus.on(ToolUsageStartedEvent)
        def _on_tool_start(_sender, event):  # type: ignore[no-untyped-def]
            self._emit("tool_start", _tool_event_payload(event, finished=False), event)

        @bus.on(ToolUsageFinishedEvent)
        def _on_tool_end(_sender, event):  # type: ignore[no-untyped-def]
            self._emit("tool_end", _tool_event_payload(event, finished=True), event)

        @bus.on(CrewKickoffCompletedEvent)
        def _on_done(_sender, event):  # type: ignore[no-untyped-def]
            self._emit("done", None, event)

        @bus.on(CrewKickoffFailedEvent)
        def _on_fail(_sender, event):  # type: ignore[no-untyped-def]
            self._emit("error", _json_safe(event.error), event)


# Instantiation registers this listener on CrewAI's global event bus.
bridge = SSEEventBridge()
