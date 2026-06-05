"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button, Tabs } from "@/components/ui";
import AnimatedContent from "@/components/bits/AnimatedContent";
import { saveDecision } from "./actions";
import { FREE_MESSAGE_LIMIT } from "@/lib/quotaConstants";
import type { ChatMessage, Decision, Plan, TaskType } from "@/lib/types";

const TASK_LABELS: Record<TaskType, string> = {
  general: "General",
  email: "Email",
  social_post: "Social",
  blog: "Blog",
  ad_copy: "Ad Copy",
  landing_page: "Landing Page",
};

const TASK_KEYS = Object.keys(TASK_LABELS) as TaskType[];

interface Props {
  clientId: string;
  clientName: string;
  clientIndustry: string;
  brandVoice: string | null;
  toneRulesCount: number;
  vocabAvoidCount: number;
  initialTaskType: TaskType;
  initialMessages: ChatMessage[];
  initialDecisions: Decision[];
  userPlan: Plan;
  initialMessageCount: number;
}

interface Message extends ChatMessage {
  id: string;
  streaming?: boolean;
}

function toUiMessages(msgs: ChatMessage[]): Message[] {
  return msgs.map((m) => ({ ...m, id: crypto.randomUUID() }));
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-xs px-2 py-1"
    >
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}

type HudFacet = "toneRules" | "vocabAvoid" | "decisions";

function ContextPanel({
  clientName,
  clientIndustry,
  brandVoice,
  toneRulesCount,
  vocabAvoidCount,
  decisionsCount,
  taskType,
  compact = false,
  highlighting = [],
  isStreaming = false,
}: {
  clientName: string;
  clientIndustry: string;
  brandVoice: string | null;
  toneRulesCount: number;
  vocabAvoidCount: number;
  decisionsCount: number;
  taskType: TaskType;
  compact?: boolean;
  highlighting?: HudFacet[];
  isStreaming?: boolean;
}) {
  const voiceSummary = brandVoice?.trim()
    ? brandVoice.trim().slice(0, compact ? 60 : 120) +
      (brandVoice.trim().length > (compact ? 60 : 120) ? "…" : "")
    : null;

  return (
    <div className={compact ? "space-y-1" : "space-y-3"}>
      {!compact && (
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
          Context
        </p>
      )}
      <p
        className={`font-semibold text-text-primary truncate ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {clientName}
      </p>
      {clientIndustry && (
        <p className="text-xs text-text-muted truncate">{clientIndustry}</p>
      )}
      {voiceSummary ? (
        <p className={`text-text-muted leading-relaxed ${compact ? "text-xs" : "text-xs"}`}>
          {voiceSummary}
        </p>
      ) : (
        <p className="text-xs text-text-muted italic">No voice profile yet</p>
      )}
      {/* Inline keyframes — scoped to this component, suppressed by global reduced-motion guard */}
      <style>{`
        @keyframes facetPulse {
          0%, 100% { background-color: transparent; }
          50%       { background-color: rgba(210, 104, 63, 0.12); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cp-facet { animation: none !important; }
        }
      `}</style>
      <div className={`text-xs text-text-muted ${compact ? "flex flex-wrap gap-x-3 gap-y-0.5" : "space-y-1"}`}>
        <p
          className="cp-facet rounded-sm"
          style={isStreaming && toneRulesCount > 0
            ? { animation: "facetPulse 1.5s ease-in-out infinite", animationDelay: "0ms" }
            : undefined}
        >
          {toneRulesCount} tone rule{toneRulesCount !== 1 ? "s" : ""}
        </p>
        <p
          className="cp-facet rounded-sm"
          style={isStreaming && vocabAvoidCount > 0
            ? { animation: "facetPulse 1.5s ease-in-out infinite", animationDelay: "500ms" }
            : undefined}
        >
          {vocabAvoidCount} banned word{vocabAvoidCount !== 1 ? "s" : ""}
        </p>
        <p
          className="cp-facet rounded-sm"
          style={isStreaming && decisionsCount > 0
            ? { animation: "facetPulse 1.5s ease-in-out infinite", animationDelay: "1000ms" }
            : undefined}
        >
          {decisionsCount} standing decision{decisionsCount !== 1 ? "s" : ""}
        </p>
        {compact && (
          <p className="capitalize">{taskType.replace("_", " ")}</p>
        )}
      </div>
      {!compact && (
        <p className="text-xs text-text-muted capitalize">
          {taskType.replace("_", " ")}
        </p>
      )}
    </div>
  );
}

export default function ChatUI({
  clientId,
  clientName,
  clientIndustry,
  brandVoice,
  toneRulesCount,
  vocabAvoidCount,
  initialTaskType,
  initialMessages,
  initialDecisions,
  userPlan,
  initialMessageCount,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(() =>
    toUiMessages(initialMessages)
  );
  const [history, setHistory] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [taskType, setTaskType] = useState<TaskType>(initialTaskType);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [messageCount, setMessageCount] = useState(initialMessageCount);

  const [hud, setHud] = useState<HudFacet[]>([]);

  const [decisions, setDecisions] = useState<Decision[]>(initialDecisions);
  const [decisionInput, setDecisionInput] = useState("");
  const [showDecisionBar, setShowDecisionBar] = useState(false);
  const [isSavingDecision, startDecisionTransition] = useTransition();

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isFreePlan = userPlan === "free";
  const isStreamingNow = messages.some((m) => m.streaming);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function rollbackFailedSend(
    text: string,
    streamingId: string,
    userMsgId: string
  ) {
    setInput(text);
    setMessages((prev) =>
      prev.filter((m) => m.id !== streamingId && m.id !== userMsgId)
    );
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setError(null);
    setSaveWarning(null);
    setShowUpgradeBanner(false);
    setShowDecisionBar(false);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const streamingId = crypto.randomUUID();
    const streamingMsg: Message = {
      id: streamingId,
      role: "assistant",
      content: "",
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, streamingMsg]);
    setIsStreaming(true);

    const activeHud: HudFacet[] = [];
    if (toneRulesCount > 0) activeHud.push("toneRules");
    if (vocabAvoidCount > 0) activeHud.push("vocabAvoid");
    if (decisions.length > 0) activeHud.push("decisions");
    setHud(activeHud);

    let fullText = "";
    let streamSaveError: string | null = null;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          message: text,
          taskType,
          history,
        }),
      });

      if (res.status === 429) {
        setShowUpgradeBanner(true);
        setError("Monthly message limit reached.");
        rollbackFailedSend(text, streamingId, userMsg.id);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;

          try {
            const parsed = JSON.parse(raw) as { text?: string; error?: string };
            if (parsed.error) {
              if (fullText.trim()) {
                streamSaveError = parsed.error;
              } else {
                throw new Error(parsed.error);
              }
              continue;
            }
            if (parsed.text) {
              fullText += parsed.text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingId
                    ? { ...m, content: fullText, streaming: true }
                    : m
                )
              );
            }
          } catch (parseErr) {
            if (
              parseErr instanceof Error &&
              parseErr.message !== "Unexpected token"
            ) {
              throw parseErr;
            }
          }
        }
      }

      if (!fullText.trim()) {
        throw new Error("No copy came back. Please try again.");
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingId ? { ...m, streaming: false } : m
        )
      );

      if (streamSaveError) {
        setSaveWarning(
          `Copy generated, but this exchange wasn't saved. ${streamSaveError}`
        );
        setShowDecisionBar(true);
        return;
      }

      setHistory((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: fullText },
      ]);

      if (isFreePlan) {
        setMessageCount((c) => c + 1);
      }

      setShowDecisionBar(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      rollbackFailedSend(text, streamingId, userMsg.id);
    } finally {
      setIsStreaming(false);
      setHud([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleSaveDecision() {
    const note = decisionInput.trim();
    if (!note) return;

    startDecisionTransition(async () => {
      const result = await saveDecision(clientId, note);
      if (result.error) {
        setError(result.error);
        return;
      }
      const newDecision: Decision = {
        topic: "Session learning",
        detail: note,
        recorded_at: new Date().toISOString(),
      };
      setDecisions((prev) => [...prev, newDecision]);
      setDecisionInput("");
      setShowDecisionBar(false);
    });
  }

  const counterClass =
    messageCount >= 45
      ? "text-warn"
      : messageCount >= 40
      ? "text-warn"
      : "text-text-muted";

  return (
    <div className="flex h-screen bg-page">
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col border-r border-border bg-page px-4 py-5">
        <ContextPanel
          clientName={clientName}
          clientIndustry={clientIndustry}
          brandVoice={brandVoice}
          toneRulesCount={toneRulesCount}
          vocabAvoidCount={vocabAvoidCount}
          decisionsCount={decisions.length}
          taskType={taskType}
          highlighting={hud}
          isStreaming={isStreamingNow}
        />

        {isFreePlan && (
          <div className="mt-auto pt-6 border-t border-border">
            <p className={`text-xs ${counterClass}`}>
              {messageCount} / {FREE_MESSAGE_LIMIT} messages this month
            </p>
            {messageCount >= 45 && (
              <Link
                href="/pricing"
                className="text-xs text-text-primary hover:text-accent mt-1.5 inline-block transition-colors"
              >
                Upgrade to Pro →
              </Link>
            )}
          </div>
        )}
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="bg-transparent border-none px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/clients/${clientId}`}
              className="text-text-muted hover:text-text-primary transition-colors text-sm"
            >
              ←
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{clientName}</span>
                {clientIndustry && (
                  <span className="text-xs text-text-muted bg-raised px-2 py-0.5 rounded-full truncate md:hidden">
                    {clientIndustry}
                  </span>
                )}
              </div>
              {isFreePlan && (
                <p className={`text-xs mt-0.5 md:hidden ${counterClass}`}>
                  {messageCount} / {FREE_MESSAGE_LIMIT} messages this month
                </p>
              )}
              <div className="mt-2 md:hidden">
                <ContextPanel
                  clientName={clientName}
                  clientIndustry={clientIndustry}
                  brandVoice={brandVoice}
                  toneRulesCount={toneRulesCount}
                  vocabAvoidCount={vocabAvoidCount}
                  decisionsCount={decisions.length}
                  taskType={taskType}
                  compact
                  highlighting={hud}
                  isStreaming={isStreamingNow}
                />
              </div>
            </div>
          </div>

          <Tabs
            variant="pill"
            activeId={taskType}
            onChange={(t) => setTaskType(t as TaskType)}
            tabs={TASK_KEYS.map((t) => ({ id: t, label: TASK_LABELS[t] }))}
            className="justify-end"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 scrollbar-thin">
          {messages.length === 0 && (
            <div className="text-center py-20 text-text-muted text-sm">
              Start writing for{" "}
              <span className="text-text-primary">{clientName}</span>. Their brand
              voice is loaded — start writing.
            </div>
          )}

          {messages.map((msg) => {
            const bubble = (
              <div
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-[var(--radius-lg)] shadow-[var(--shadow-1)] px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-accent text-text-primary rounded-br-sm"
                      : "bg-raised text-text-primary rounded-bl-sm"
                  }`}
                >
                  <span style={{ whiteSpace: "pre-wrap" }}>
                    {msg.content}
                    {msg.streaming && (
                      <span className="inline-block w-0.5 h-4 bg-raised ml-0.5 align-middle animate-pulse" />
                    )}
                  </span>

                  {msg.role === "assistant" && !msg.streaming && msg.content && (
                    <div className="mt-2 flex justify-end">
                      <CopyButton text={msg.content} />
                    </div>
                  )}
                </div>
              </div>
            );

            if (msg.role === "assistant" && !msg.streaming) {
              return (
                <AnimatedContent
                  key={msg.id}
                  direction="vertical"
                  distance={8}
                  delay={0}
                  duration={0.3}
                >
                  {bubble}
                </AnimatedContent>
              );
            }

            return <div key={msg.id}>{bubble}</div>;
          })}

          <div ref={bottomRef} />
        </div>

        {showUpgradeBanner && (
          <div className="mx-4 mb-2 bg-raised border border-warn/30 rounded-[10px] px-4 py-4 flex items-center justify-between gap-4">
            <p className="text-sm">
              You&apos;ve used all {FREE_MESSAGE_LIMIT} free messages this month.
            </p>
            <Link
              href="/pricing"
              className="bg-accent text-[#041A12] text-sm font-semibold px-4 py-2 rounded-md hover:bg-accent-press whitespace-nowrap transition-colors"
            >
              Upgrade to Pro →
            </Link>
          </div>
        )}

        {saveWarning && (
          <div className="mx-4 mb-2 bg-raised border border-warn/30 text-xs px-4 py-2.5 rounded-[10px] flex items-center justify-between gap-3">
            <span>{saveWarning}</span>
            <button
              type="button"
              onClick={() => setSaveWarning(null)}
              className="text-warn hover:text-text-primary flex-shrink-0"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="mx-4 mb-2 bg-raised border border-danger/30 text-xs px-4 py-2.5 rounded-[10px] flex items-center justify-between gap-3">
            <span>{error}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {input.trim() && !isStreaming && (
                <button
                  type="button"
                  onClick={sendMessage}
                  className="text-danger font-medium hover:opacity-80"
                >
                  Retry
                </button>
              )}
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-danger opacity-60 hover:opacity-100"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {showDecisionBar && !isStreaming && (
          <div className="mx-4 mb-2 bg-raised border border-border rounded-[10px] px-4 py-3 flex items-center gap-3">
            <span className="text-xs text-text-muted whitespace-nowrap">
              Save a decision?
            </span>
            <input
              value={decisionInput}
              onChange={(e) => setDecisionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveDecision();
                if (e.key === "Escape") setShowDecisionBar(false);
              }}
              placeholder="e.g. Always end with a call-to-action question"
              className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none min-w-0"
              autoFocus
            />
            <Button
              variant="secondary"
              onClick={handleSaveDecision}
              disabled={isSavingDecision || !decisionInput.trim()}
              className="text-xs"
            >
              {isSavingDecision ? "Saving…" : "Save"}
            </Button>
            <button
              type="button"
              onClick={() => setShowDecisionBar(false)}
              className="text-text-muted hover:text-text-primary text-sm"
            >
              ×
            </button>
          </div>
        )}

        <div className="border-t border-border px-4 py-4 flex-shrink-0">
          <div className="flex items-end gap-3 bg-card/90 border border-border rounded-[var(--radius-lg)] px-4 py-3 focus-within:border-accent transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Write ${TASK_LABELS[taskType].toLowerCase()} for ${clientName}…`}
              rows={1}
              disabled={isStreaming || showUpgradeBanner}
              className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none resize-none leading-relaxed disabled:opacity-50"
              style={{ maxHeight: "120px", overflowY: "auto" }}
            />
            <Button
              variant="primary"
              onClick={sendMessage}
              disabled={isStreaming || !input.trim() || showUpgradeBanner}
              className="rounded-[10px] flex-shrink-0"
            >
              {isStreaming ? "…" : "Send"}
            </Button>
          </div>
          <p className="text-center text-xs text-text-muted mt-2">
            Enter to send · Shift+Enter for newline
          </p>
        </div>
      </div>
    </div>
  );
}
