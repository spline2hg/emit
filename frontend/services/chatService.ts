import { BACKEND_URL } from './config';

export interface ChatToolEvent {
  name: string;
  call_id?: string;
  arguments?: unknown;
  result?: unknown;
}

export interface ChatEvent {
  type: 'tool_start' | 'tool_end' | 'token' | 'answer' | 'done' | 'error';
  content: string | ChatToolEvent | null;
  session_id?: string;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  updated_at: string;
}

export interface ChatTranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  turn_id: string | null;
  created_at: string;
}

export interface SavedToolCall {
  id: string;
  turn_id: string | null;
  tool_name: string;
  arguments: unknown;
  result: string | null;
  status: 'running' | 'completed';
  created_at: string;
  finished_at: string | null;
}

export interface ChatTranscript {
  session_id: string;
  messages: ChatTranscriptMessage[];
  tool_calls: SavedToolCall[];
}

function errorMessage(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return 'Chat request failed';
  }
}

export async function getChatSessions(workspaceKey: string): Promise<ChatSessionSummary[]> {
  const response = await fetch(`${BACKEND_URL}/chat/sessions`, {
    headers: { 'X-API-Key': workspaceKey },
  });
  if (!response.ok) throw new Error(`Could not load chats (${response.status})`);
  const body = await response.json();
  return body.sessions;
}

export async function getChatTranscript(
  workspaceKey: string,
  sessionId: string,
): Promise<ChatTranscript> {
  const response = await fetch(`${BACKEND_URL}/chat/sessions/${sessionId}`, {
    headers: { 'X-API-Key': workspaceKey },
  });
  if (!response.ok) throw new Error(`Could not load chat (${response.status})`);
  return response.json();
}

export async function streamChat(
  message: string,
  workspaceKey: string,
  sessionId: string,
  onEvent: (event: ChatEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': workspaceKey,
    },
    body: JSON.stringify({ message, session_id: sessionId }),
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Chat request failed (${response.status})`);
  }

  if (!response.body) throw new Error('Chat response did not contain a stream');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const consume = (block: string) => {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');

    if (!data) return;
    try {
      onEvent(JSON.parse(data) as ChatEvent);
    } catch {
      throw new Error(`Invalid chat event: ${errorMessage(data)}`);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || '';
    blocks.forEach(consume);

    if (done) {
      if (buffer.trim()) consume(buffer);
      break;
    }
  }
}
