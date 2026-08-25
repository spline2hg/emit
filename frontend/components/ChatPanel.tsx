import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Markdown from "react-markdown";
import { InputMessage } from "@/components/ui/input-message";
import { ChatMessage } from "@/components/ui/chat-message";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { MenuItem } from "@/components/ui/menu-item";
import { Tooltip } from "@/components/ui/tooltip";
import { useIcon } from "@/lib/icon-context";
import type { IconName } from "@/lib/icon-context";
import { spring } from "@/lib/springs";
import {
  ThinkingSteps,
  ThinkingStepsHeader,
  ThinkingStepsContent,
  ThinkingStep,
  ThinkingStepDetails,
} from "@/components/ui/thinking-steps";
import type { StepStatus } from "@/components/ui/thinking-steps";

const MODELS = ["Sonnet 5", "Sonnet 4.6", "Sonnet 4.5", "Haiku 4"] as const;

interface ThinkingStepData {
  icon: IconName;
  label: string;
  description?: string;
  status: StepStatus;
  details?: string[];
  detailSummary?: string;
}

interface Message {
  text: string;
  files: File[];
  from: "user" | "assistant";
  thinkingSteps?: ThinkingStepData[];
}

const DEMO_STEPS: ThinkingStepData[] = [
  {
    icon: "search",
    label: "grep_logs",
    description: 'pattern="ECONNREFUSED" service="auth-api" since="1h"',
    status: "complete",
    detailSummary: "Found 3 matching entries",
    details: [
      "10:13:48 inventory-api ECONNREFUSED",
      "10:14:12 auth-api ECONNREFUSED",
      "10:14:55 payment-gateway ECONNREFUSED",
    ],
  },
  {
    icon: "globe",
    label: "query_logs",
    description: 'level="error" range="10:00–10:30"',
    status: "complete",
    detailSummary: "Found 12 matching entries",
    details: [
      "10:02:11 auth-api timeout",
      "10:04:33 payment-gateway retry_exhausted",
      "10:05:01 inventory-api db_connection_failed",
      "... and 9 more",
    ],
  },
  {
    icon: "brain",
    label: "analyze_results",
    description: "Summarizing patterns across 15 log entries",
    status: "complete",
  },
];

const DEMO_RESPONSES = [
  "There are **23 logs** in total in your workspace.\n\nHere are a few representative examples:\n\n- **Timestamp:** 2026-08-09T10:15:32Z  \n  **Level:** INFO  \n  **Service:** auth-service  \n  **Message:** User login successful for user_id=42\n\n- **Timestamp:** 2026-08-09T10:14:55Z  \n  **Level:** WARNING  \n  **Service:** payment-gateway  \n  **Message:** Retry attempt 2 for transaction tx_9876\n\n- **Timestamp:** 2026-08-09T10:13:48Z  \n  **Level:** ERROR  \n  **Service:** inventory-api  \n  **Message:** Failed to connect to database: timeout\n\nLet me know if you'd like to filter or explore specific logs further",
];

function getStepStatus(stepIndex: number, activeIndex: number): StepStatus {
  if (stepIndex < activeIndex) return "complete";
  if (stepIndex === activeIndex) return "active";
  return "pending";
}

export default function ChatPanel() {
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [modelOpen, setModelOpen] = useState(false);
  const [model, setModel] = useState<typeof MODELS[number]>("Sonnet 5");
  const [thinking, setThinking] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const modelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node))
        setModelOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, activeStep]);

  const ChevronDownIcon = useIcon("chevron-down");

  const handleSend = (text: string) => {
    setMessages((prev) => [...prev, { text, files: [], from: "user" }]);
    setValue("");
    setThinking(true);
    setActiveStep(0);

    const response = DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];

    const stepDelay = 1500;
    DEMO_STEPS.forEach((_, i) => {
      setTimeout(() => {
        setActiveStep(i + 1);
      }, stepDelay * (i + 1));
    });

    const totalDelay = stepDelay * (DEMO_STEPS.length + 1);
    setTimeout(() => {
      setThinking(false);
      setActiveStep(0);
      const completedSteps = DEMO_STEPS.map((s) => ({ ...s, status: "complete" as StepStatus }));
      setMessages((prev) => [
        ...prev,
        { text: response, files: [], from: "assistant", thinkingSteps: completedSteps },
      ]);
    }, totalDelay);
  };

  const currentSteps: ThinkingStepData[] = thinking
    ? DEMO_STEPS.map((s, i) => ({
        ...s,
        status: getStepStatus(i, activeStep),
      }))
    : [];

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto flex-1 min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide min-h-0">
        <div className="flex flex-col justify-start gap-2 py-2">
          {messages.length === 0 && !thinking && (
            <div className="flex flex-col items-center justify-center text-muted-foreground gap-2 py-20">
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm">Type a message below to begin</p>
            </div>
          )}
          {messages.map((m, i) => (
            <ChatMessage key={i} from={m.from} files={m.files}>
              {m.from === "assistant" ? (
                <div className="flex flex-col gap-2">
                  {m.thinkingSteps && m.thinkingSteps.length > 0 && (
                    <ThinkingSteps defaultOpen={false} className="w-full max-w-sm">
                      <ThinkingStepsHeader>Thinking</ThinkingStepsHeader>
                      <ThinkingStepsContent>
                        {m.thinkingSteps.map((step, si) => (
                          <ThinkingStep
                            key={si}
                            icon={step.icon}
                            label={step.label}
                            description={step.description}
                            status={step.status}
                            isLast={si === m.thinkingSteps!.length - 1}
                          >
                            {step.details && step.detailSummary && (
                              <ThinkingStepDetails
                                summary={step.detailSummary}
                                details={step.details}
                              />
                            )}
                          </ThinkingStep>
                        ))}
                      </ThinkingStepsContent>
                    </ThinkingSteps>
                  )}
                  <div className="chat-prose prose prose-sm dark:prose-invert max-w-none whitespace-normal">
                    <Markdown>{m.text}</Markdown>
                  </div>
                </div>
              ) : (
                m.text
              )}
            </ChatMessage>
          ))}
          {thinking && (
            <ChatMessage from="assistant">
              <div className="flex flex-col gap-2">
                <ThinkingSteps defaultOpen={true} className="w-full max-w-sm">
                  <ThinkingStepsHeader><span className="shimmer">Thinking</span></ThinkingStepsHeader>
                  <ThinkingStepsContent>
                    {currentSteps.map((step, si) => (
                      <ThinkingStep
                        key={si}
                        icon={step.icon}
                        label={step.label}
                        description={step.description}
                        status={step.status}
                        isLast={si === currentSteps.length - 1}
                      >
                        {step.details && step.detailSummary && (
                          <ThinkingStepDetails
                            summary={step.detailSummary}
                            details={step.details}
                          />
                        )}
                      </ThinkingStep>
                    ))}
                  </ThinkingStepsContent>
                </ThinkingSteps>
              </div>
            </ChatMessage>
          )}
        </div>
      </div>
      <InputMessage
        ref={inputRef}
        className="shrink-0"
        value={value}
        onValueChange={setValue}
        onSend={handleSend}
        leftSlot={null}
        rightSlot={
          <div ref={modelRef} className="relative">
            <Tooltip content="Select model" side="top">
              <Button
                variant="ghost"
                size="sm"
                trailingIcon={ChevronDownIcon}
                active={modelOpen}
                onClick={() => setModelOpen((o) => !o)}
              >
                {model}
              </Button>
            </Tooltip>
            <AnimatePresence>
              {modelOpen && (
                <motion.div
                  className="absolute bottom-full mb-2 right-0 z-10"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4, transition: { duration: 0.1 } }}
                  transition={spring.fast}
                >
                  <Dropdown checkedIndex={MODELS.indexOf(model)} className="w-40">
                    {MODELS.map((name, i) => (
                      <MenuItem
                        key={name}
                        index={i}
                        label={name}
                        checked={name === model}
                        onSelect={() => {
                          setModel(name);
                          setModelOpen(false);
                        }}
                      />
                    ))}
                  </Dropdown>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        }
      />
    </div>
  );
}
