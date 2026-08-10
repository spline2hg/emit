import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import { InputMessage } from '@/components/ui/input-message';
import { ChatMessage } from '@/components/ui/chat-message';
import {
  ThinkingSteps,
  ThinkingStepsHeader,
  ThinkingStepsContent,
  ThinkingStep,
  ThinkingStepDetails,
} from '@/components/ui/thinking-steps';
import type { StepStatus } from '@/components/ui/thinking-steps';
import type { IconName } from '@/lib/icon-context';
import {
  getChatSessions,
  getChatTranscript,
  streamChat,
  type ChatEvent,
  type ChatSessionSummary,
  type ChatToolEvent,
  type SavedToolCall,
} from '@/services/chatService';

interface ThinkingStepData {
  id: string;
  icon: IconName;
  label: string;
  description?: string;
  status: StepStatus;
  details?: string[];
  detailSummary?: string;
}

interface Message {
  id: string;
  turnId?: string | null;
  text: string;
  files: File[];
  from: 'user' | 'assistant';
  thinkingSteps?: ThinkingStepData[];
}

interface ChatPanelProps {
  workspaceKey: string;
}

function newSessionId() {
  return crypto.randomUUID();
}

function toolIcon(name: string): IconName {
  if (name.includes('search')) return 'search';
  if (name.includes('service') || name.includes('count')) return 'globe';
  return 'brain';
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '{}';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function toolPayload(event: ChatEvent): ChatToolEvent | null {
  return typeof event.content === 'object' && event.content !== null
    ? (event.content as ChatToolEvent)
    : null;
}

function savedToolSteps(toolCalls: SavedToolCall[]): ThinkingStepData[] {
  return toolCalls.map((call) => ({
    id: call.id,
    icon: toolIcon(call.tool_name),
    label: call.tool_name,
    description: `Arguments: ${formatValue(call.arguments)}`,
    status: call.status === 'running' ? 'active' : 'complete',
    details: [
      `Arguments:\n${formatValue(call.arguments)}`,
      ...(call.result ? [`Result:\n${call.result}`] : []),
    ],
    detailSummary: call.result ? 'Tool call and result' : 'Tool call',
  }));
}

export default function ChatPanel({ workspaceKey }: ChatPanelProps) {
  const [value, setValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionId, setSessionId] = useState(newSessionId);
  const [thinking, setThinking] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [currentSteps, setCurrentSteps] = useState<ThinkingStepData[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const streamingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    setMessages([]);
    setSessionId(newSessionId());

    const loadHistory = async () => {
      try {
        const list = await getChatSessions(workspaceKey);
        if (cancelled) return;
        setChatSessions(list);
        if (list.length > 0) {
          const latest = await getChatTranscript(workspaceKey, list[0].id);
          if (cancelled) return;
          setSessionId(latest.session_id);
          const callsByTurn = new Map<string, SavedToolCall[]>();
          latest.tool_calls.forEach((call) => {
            if (!call.turn_id) return;
            callsByTurn.set(call.turn_id, [...(callsByTurn.get(call.turn_id) || []), call]);
          });
          setMessages(
            latest.messages.map((message) => ({
              id: message.id,
              turnId: message.turn_id,
              text: message.content,
              files: [],
              from: message.role,
              thinkingSteps:
                message.role === 'assistant'
                  ? savedToolSteps(callsByTurn.get(message.turn_id || '') || [])
                  : undefined,
            })),
          );
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not load chat history');
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    if (workspaceKey) loadHistory();
    else setHistoryLoading(false);

    return () => {
      cancelled = true;
    };
  }, [workspaceKey]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, currentSteps, streamingText]);

  const startNewChat = () => {
    if (thinking) return;
    setSessionId(newSessionId());
    setMessages([]);
    setCurrentSteps([]);
    setStreamingText('');
    setError(null);
  };

  const openChat = async (id: string) => {
    if (thinking) return;
    setHistoryLoading(true);
    setError(null);
    try {
      const transcript = await getChatTranscript(workspaceKey, id);
      const callsByTurn = new Map<string, SavedToolCall[]>();
      transcript.tool_calls.forEach((call) => {
        if (!call.turn_id) return;
        callsByTurn.set(call.turn_id, [...(callsByTurn.get(call.turn_id) || []), call]);
      });
      setSessionId(transcript.session_id);
      setMessages(
        transcript.messages.map((message) => ({
          id: message.id,
          turnId: message.turn_id,
          text: message.content,
          files: [],
          from: message.role,
          thinkingSteps:
            message.role === 'assistant'
              ? savedToolSteps(callsByTurn.get(message.turn_id || '') || [])
              : undefined,
        })),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load chat');
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshChatSessions = async () => {
    try {
      setChatSessions(await getChatSessions(workspaceKey));
    } catch {
      // The completed response is still usable if the sidebar refresh fails.
    }
  };

  const handleSend = async (text: string) => {
    const message = text.trim();
    if (!message || !workspaceKey || streamingRef.current) return;

    streamingRef.current = true;
    setValue('');
    setError(null);
    setThinking(true);
    setCurrentSteps([]);
    setStreamingText('');
    setMessages((previous) => [
      ...previous,
      { id: crypto.randomUUID(), text: message, files: [], from: 'user' },
    ]);

    let answer = '';
    let failure: string | null = null;
    let liveSteps: ThinkingStepData[] = [];

    const updateSteps = (next: ThinkingStepData[]) => {
      liveSteps = next;
      setCurrentSteps(next);
    };

    const handleEvent = (event: ChatEvent) => {
      if (event.type === 'tool_start') {
        const payload = toolPayload(event);
        if (!payload) return;
        const name = payload.name || 'tool';
        const id = payload.call_id || `${name}-${liveSteps.length}-${Date.now()}`;
        updateSteps([
          ...liveSteps,
          {
            id,
            icon: toolIcon(name),
            label: name,
            description: `Arguments: ${formatValue(payload.arguments)}`,
            status: 'active',
            details: [`Arguments:\n${formatValue(payload.arguments)}`],
            detailSummary: 'Tool call',
          },
        ]);
        return;
      }

      if (event.type === 'tool_end') {
        const payload = toolPayload(event);
        if (!payload) return;
        const index = liveSteps.findIndex(
          (step) =>
            (payload.call_id && step.id === payload.call_id) ||
            (step.label === payload.name && step.status === 'active'),
        );
        if (index === -1) return;
        const next = [...liveSteps];
        const step = next[index];
        next[index] = {
          ...step,
          status: 'complete',
          details: [...(step.details || []), `Result:\n${formatValue(payload.result)}`],
          detailSummary: 'Tool call and result',
        };
        updateSteps(next);
        return;
      }

      if (event.type === 'token') {
        answer += String(event.content || '');
        setStreamingText(answer);
      } else if (event.type === 'answer') {
        answer = String(event.content || '');
        setStreamingText(answer);
      } else if (event.type === 'error') {
        failure = String(event.content || 'The agent failed to answer');
        setError(failure);
      }
    };

    try {
      await streamChat(message, workspaceKey, sessionId, handleEvent);
      if (failure) throw new Error(failure);
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          text: answer || 'The agent did not return an answer.',
          files: [],
          from: 'assistant',
          thinkingSteps: liveSteps.map((step) => ({ ...step, status: 'complete' })),
        },
      ]);
      await refreshChatSessions();
    } catch (caught) {
      const messageText = caught instanceof Error ? caught.message : 'Chat request failed';
      setError(messageText);
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          text: `Unable to answer: ${messageText}`,
          files: [],
          from: 'assistant',
          thinkingSteps: liveSteps.map((step) => ({ ...step, status: 'complete' })),
        },
      ]);
    } finally {
      streamingRef.current = false;
      setThinking(false);
      setCurrentSteps([]);
      setStreamingText('');
    }
  };

  return (
    <div className="relative flex min-h-0 w-full flex-1">
      <div className="group pointer-events-none absolute right-0 top-0 z-30 h-1/2 w-72">
        <button
          type="button"
          aria-label="Show chat history"
          onClick={() => undefined}
          className="pointer-events-auto absolute right-2 top-2 rounded-lg border border-border bg-card/80 p-2 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent hover:text-foreground"
        >
          <MessageSquarePlus size={15} />
        </button>
        <aside className="pointer-events-none absolute inset-0 flex translate-x-2 flex-col rounded-xl border border-border bg-card/95 p-2 opacity-0 shadow-xl backdrop-blur transition-[opacity,transform] duration-150 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={startNewChat}
            disabled={thinking}
            className="mb-2 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            <MessageSquarePlus size={15} />
            New chat
          </button>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {historyLoading && chatSessions.length === 0 ? (
              <div className="flex justify-center py-4 text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
              </div>
            ) : chatSessions.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">No previous chats</p>
            ) : (
              chatSessions.map((chat) => (
                <button
                  type="button"
                  key={chat.id}
                  onClick={() => openChat(chat.id)}
                  disabled={thinking}
                  className={`w-full truncate rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-accent disabled:opacity-50 ${
                    chat.id === sessionId ? 'bg-accent text-foreground' : 'text-muted-foreground'
                  }`}
                  title={chat.title}
                >
                  {chat.title}
                </button>
              ))
            )}
          </div>
        </aside>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          <div className="mx-auto flex max-w-4xl flex-col justify-start gap-2 py-2">
            {messages.length === 0 && !thinking && (
              <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
                <p className="text-lg font-medium">Ask about your logs</p>
                <p className="text-sm">The agent will show each tool call and its parameters here.</p>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage key={message.id} from={message.from} files={message.files}>
                {message.from === 'assistant' ? (
                  <div className="flex flex-col gap-2">
                    {message.thinkingSteps && message.thinkingSteps.length > 0 && (
                      <ThinkingSteps defaultOpen={false} className="w-full max-w-sm">
                        <ThinkingStepsHeader>Thinking</ThinkingStepsHeader>
                        <ThinkingStepsContent>
                          {message.thinkingSteps.map((step, index) => (
                            <ThinkingStep
                              key={step.id}
                              icon={step.icon}
                              label={step.label}
                              description={step.description}
                              status={step.status}
                              isLast={index === message.thinkingSteps!.length - 1}
                            >
                              {step.details && step.detailSummary && (
                                <ThinkingStepDetails summary={step.detailSummary} details={step.details} />
                              )}
                            </ThinkingStep>
                          ))}
                        </ThinkingStepsContent>
                      </ThinkingSteps>
                    )}
                    <div className="chat-prose prose prose-sm dark:prose-invert max-w-none whitespace-normal">
                      <Markdown>{message.text}</Markdown>
                    </div>
                  </div>
                ) : (
                  message.text
                )}
              </ChatMessage>
            ))}

            {thinking && (
              <ChatMessage from="assistant">
                <div className="flex flex-col gap-2">
                  {currentSteps.length > 0 && (
                    <ThinkingSteps defaultOpen className="w-full max-w-sm">
                      <ThinkingStepsHeader>Thinking</ThinkingStepsHeader>
                      <ThinkingStepsContent>
                        {currentSteps.map((step, index) => (
                          <ThinkingStep
                            key={step.id}
                            icon={step.icon}
                            label={step.label}
                            description={step.description}
                            status={step.status}
                            isLast={index === currentSteps.length - 1}
                          >
                            {step.details && step.detailSummary && (
                              <ThinkingStepDetails summary={step.detailSummary} details={step.details} />
                            )}
                          </ThinkingStep>
                        ))}
                      </ThinkingStepsContent>
                    </ThinkingSteps>
                  )}
                  {streamingText ? (
                    <div className="chat-prose prose prose-sm dark:prose-invert max-w-none whitespace-normal">
                      <Markdown>{streamingText}</Markdown>
                    </div>
                  ) : (
                    <span className="shimmer">{error || 'Working'}</span>
                  )}
                </div>
              </ChatMessage>
            )}
          </div>
        </div>

        <InputMessage
          ref={inputRef}
          className="mx-auto w-full max-w-4xl shrink-0"
          value={value}
          onValueChange={setValue}
          onSend={handleSend}
          disabled={!workspaceKey || thinking || historyLoading}
          placeholder={workspaceKey ? 'Ask about your logs...' : 'Loading workspace...'}
          leftSlot={null}
          rightSlot={null}
        />
      </div>
    </div>
  );
}
