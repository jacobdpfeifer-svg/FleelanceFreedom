"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
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
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-xs text-warm-olive/50 hover:text-warm-olive/90 transition-colors px-2 py-1 rounded bg-warm-cream hover:bg-warm-taupe/50"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function ContextPanel({
  clientName,
  clientIndustry,
  brandVoice,
  toneRulesCount,
  vocabAvoidCount,
  decisionsCount,
  taskType,
  compact = false,
}: {
  clientName: string;
  clientIndustry: string;
  brandVoice: string | null;
  toneRulesCount: number;
  vocabAvoidCount: number;
  decisionsCount: number;
  taskType: TaskType;
  compact?: boolean;
}) {
  const voiceSummary = brandVoice?.trim()
    ? brandVoice.trim().slice(0, compact ? 60 : 120) +
      (brandVoice.trim().length > (compact ? 60 : 120) ? "…" : "")
    : null;

  return (
    <div className={compact ? "space-y-1" : "space-y-3"}>
      {!compact && (
        <p className="text-xs font-medium text-warm-olive/60 uppercase tracking-wide">
          Context
        </p>
      )}
      <p
        className={`font-semibold text-warm-olive truncate ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {clientName}
      </p>
      {clientIndustry && (
        <p className="text-xs text-warm-olive/50 truncate">{clientIndustry}</p>
      )}
      {voiceSummary ? (
        <p className={`text-warm-olive/60 leading-relaxed ${compact ? "text-xs" : "text-xs"}`}>
          {voiceSummary}
        </p>
      ) : (
        <p className="text-xs text-warm-olive/40 italic">No voice profile yet</p>
      )}
      <div className={`text-xs text-warm-olive/50 ${compact ? "flex flex-wrap gap-x-3 gap-y-0.5" : "space-y-1"}`}>
        <p>{toneRulesCount} tone rule{toneRulesCount !== 1 ? "s" : ""}</p>
        <p>{vocabAvoidCount} banned word{vocabAvoidCount !== 1 ? "s" : ""}</p>
        <p>
          {decisionsCount} standing decision{decisionsCount !== 1 ? "s" : ""}
        </p>
        {compact && (
          <p className="capitalize">{taskType.replace("_", " ")}</p>
        )}
      </div>
      {!compact && (
        <p className="text-xs text-warm-olive/50 capitalize">
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

  const [decisions, setDecisions] = useState<Decision[]>(initialDecisions);
  const [decisionInput, setDecisionInput] = useState("");
  const [showDecisionBar, setShowDecisionBar] = useState(false);
  const [isSavingDecision, startDecisionTransition] = useTransition();

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isFreePlan = userPlan === "free";

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
      ? "text-amber-400"
      : messageCount >= 40
      ? "text-amber-500/80"
      : "text-warm-olive/50";

  return (
    <div className="flex h-screen bg-warm-ivory">
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col border-r border-warm-taupe bg-warm-ivory px-4 py-5">
        <ContextPanel
          clientName={clientName}
          clientIndustry={clientIndustry}
          brandVoice={brandVoice}
          toneRulesCount={toneRulesCount}
          vocabAvoidCount={vocabAvoidCount}
          decisionsCount={decisions.length}
          taskType={taskType}
        />

        {isFreePlan && (
          <div className="mt-auto pt-6 border-t border-warm-taupe">
            <p className={`text-xs ${counterClass}`}>
              {messageCount} / {FREE_MESSAGE_LIMIT} messages this month
            </p>
            {messageCount >= 45 && (
              <Link
                href="/pricing"
                className="text-xs text-warm-olive hover:text-brand-dark mt-1.5 inline-block transition-colors"
              >
                Upgrade to Pro →
              </Link>
            )}
          </div>
        )}
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="bg-white/90 border-b border-warm-taupe px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/clients/${clientId}`}
              className="text-warm-olive/60 hover:text-warm-olive transition-colors text-sm"
            >
              ←
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{clientName}</span>
                {clientIndustry && (
                  <span className="text-xs text-warm-olive/60 bg-warm-cream px-2 py-0.5 rounded-full truncate md:hidden">
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
                />
              </div>
            </div>
          </div>

          <div className="flex gap-1 flex-wrap justify-end">
            {TASK_KEYS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTaskType(t)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  taskType === t
                    ? "bg-warm-olive text-warm-ivory"
                    : "bg-warm-cream text-warm-olive/60 hover:text-warm-olive"
                }`}
              >
                {TASK_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 scrollbar-thin">
          {messages.length === 0 && (
            <div className="text-center py-20 text-warm-olive/50 text-sm">
              Start writing for{" "}
              <span className="text-warm-olive/90">{clientName}</span>. Their brand
              voice is loaded — start writing.
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-warm-olive text-warm-ivory rounded-br-sm"
                    : "bg-warm-cream text-warm-olive rounded-bl-sm"
                }`}
              >
                <span style={{ whiteSpace: "pre-wrap" }}>
                  {msg.content}
                  {msg.streaming && (
                    <span className="inline-block w-0.5 h-4 bg-warm-taupe ml-0.5 align-middle animate-pulse" />
                  )}
                </span>

                {msg.role === "assistant" && !msg.streaming && msg.content && (
                  <div className="mt-2 flex justify-end">
                    <CopyButton text={msg.content} />
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {showUpgradeBanner && (
          <div className="mx-4 mb-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 flex items-center justify-between gap-4">
            <p className="text-sm text-amber-900">
              You&apos;ve used all {FREE_MESSAGE_LIMIT} free messages this month.
            </p>
            <Link
              href="/pricing"
              className="bg-amber-500 hover:bg-amber-400 text-warm-olive px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors"
            >
              Upgrade to Pro →
            </Link>
          </div>
        )}

        {saveWarning && (
          <div className="mx-4 mb-2 bg-amber-50 border border-amber-200 text-amber-900 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between gap-3">
            <span>{saveWarning}</span>
            <button
              type="button"
              onClick={() => setSaveWarning(null)}
              className="text-amber-600 hover:text-amber-800 flex-shrink-0"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="mx-4 mb-2 bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between gap-3">
            <span>{error}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {input.trim() && !isStreaming && (
                <button
                  type="button"
                  onClick={sendMessage}
                  className="text-red-700 hover:text-red-900 font-medium"
                >
                  Retry
                </button>
              )}
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {showDecisionBar && !isStreaming && (
          <div className="mx-4 mb-2 bg-warm-cream border border-warm-taupe rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-xs text-warm-olive/60 whitespace-nowrap">
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
              className="flex-1 bg-transparent text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none min-w-0"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveDecision}
              disabled={isSavingDecision || !decisionInput.trim()}
              className="text-xs bg-warm-olive hover:bg-brand-dark disabled:opacity-40 text-warm-ivory px-3 py-1.5 rounded-lg transition-colors"
            >
              {isSavingDecision ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowDecisionBar(false)}
              className="text-warm-olive/50 hover:text-warm-olive/90 text-sm"
            >
              ×
            </button>
          </div>
        )}

        <div className="border-t border-warm-taupe px-4 py-4 flex-shrink-0">
          <div className="flex items-end gap-3 bg-white/90 border border-warm-taupe rounded-2xl px-4 py-3 focus-within:border-warm-olive transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Write ${TASK_LABELS[taskType].toLowerCase()} for ${clientName}…`}
              rows={1}
              disabled={isStreaming || showUpgradeBanner}
              className="flex-1 bg-transparent text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none resize-none leading-relaxed disabled:opacity-50"
              style={{ maxHeight: "120px", overflowY: "auto" }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={isStreaming || !input.trim() || showUpgradeBanner}
              className="bg-warm-olive hover:bg-brand-dark disabled:opacity-40 text-warm-ivory px-4 py-2 rounded-xl text-sm font-medium transition-colors flex-shrink-0"
            >
              {isStreaming ? "…" : "Send"}
            </button>
          </div>
          <p className="text-center text-xs text-warm-olive/40 mt-2">
            Enter to send · Shift+Enter for newline
          </p>
        </div>
      </div>
    </div>
  );
}
