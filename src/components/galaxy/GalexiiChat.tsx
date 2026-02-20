"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Loader2,
  Minimize2,
  Maximize2,
  Trash2,
  AlertTriangle,
} from "lucide-react";

// ── Types ──

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type ChatState = "idle" | "streaming" | "error";

// ── Component ──

export function GalexiiChat({
  analysisContext,
}: {
  /** Optional JSON string of current Deep Space analysis results to inject as AI context */
  analysisContext?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Check AI availability on mount
  useEffect(() => {
    fetch("/api/ai/chat")
      .then((r) => r.json())
      .then((data) => setAiConfigured(data.configured))
      .catch(() => setAiConfigured(false));
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatState]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || chatState === "streaming") return;

    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setChatState("streaming");
    setErrorMsg(null);

    // Build history for API (last 20 messages for token budget)
    const history = [...messages, userMsg].slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", timestamp: Date.now() },
    ]);

    try {
      abortRef.current = new AbortController();

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, context: analysisContext }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Chat failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + parsed.content }
                    : m
                )
              );
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      setChatState("idle");
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setChatState("idle");
        return;
      }
      setChatState("error");
      setErrorMsg((err as Error).message);
      // Remove empty assistant placeholder on error
      setMessages((prev) =>
        prev.filter((m) => !(m.id === assistantId && !m.content))
      );
    }
  }, [input, messages, chatState, analysisContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setChatState("idle");
    setErrorMsg(null);
  };

  // ── Render ──

  // Floating toggle button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-6 z-50 flex items-center gap-2 rounded-full
          bg-linear-to-r from-violet-600 to-cyan-500 px-4 py-3 
          text-white font-semibold text-sm shadow-lg shadow-violet-500/30
          hover:shadow-violet-500/50 hover:scale-105 transition-all duration-200
          ring-2 ring-white/10"
        aria-label="Open Galexii AI Chat"
      >
        <Sparkles className="h-5 w-5" />
        <span className="hidden sm:inline">Ask Galexii</span>
        <MessageSquare className="h-4 w-4 sm:hidden" />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-bold text-black">
            {messages.filter((m) => m.role === "assistant").length}
          </span>
        )}
      </button>
    );
  }

  // Chat panel
  const panelWidth = isExpanded ? "w-[720px] max-w-[95vw]" : "w-[460px] max-w-[90vw]";
  const panelHeight = isExpanded ? "h-[85vh]" : "h-[65vh]";

  return (
    <div
      className={`fixed bottom-20 right-6 z-50 ${panelWidth} ${panelHeight} 
        flex flex-col rounded-2xl overflow-hidden
        bg-[#0c0a1a]/95 backdrop-blur-xl border border-violet-500/30
        shadow-2xl shadow-violet-900/40 transition-all duration-300`}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-linear-to-r from-violet-900/80 to-cyan-900/40 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-300" />
          <span className="font-bold text-white text-sm tracking-wide">
            GALEXII AI
          </span>
          {analysisContext && (
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-medium">
              Analysis Context Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-red-400 transition"
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition"
            title="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Not Configured Warning ── */}
      {aiConfigured === false && (
        <div className="px-4 py-3 bg-amber-900/30 border-b border-amber-500/20 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/80 leading-relaxed">
            AI features aren&apos;t configured yet. Add{" "}
            <code className="bg-black/30 px-1 rounded text-amber-300">
              OPENAI_API_KEY
            </code>{" "}
            to your <code className="bg-black/30 px-1 rounded">.env.local</code>{" "}
            to enable Galexii AI.
          </p>
        </div>
      )}

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollCosmic"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-4">
            <Sparkles className="h-10 w-10 text-violet-400/60" />
            <h3 className="text-white/90 font-semibold text-base">
              Hey there, I&apos;m Galexii! ✨
            </h3>
            <p className="text-white/50 text-sm leading-relaxed max-w-65">
              I&apos;m your SpEd AI assistant. Ask me about IEPs,
              accommodations, IDEA compliance, parent rights, or anything
              special education.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {[
                "What is a PLAAFP?",
                "Explain LRE",
                "REED vs FIE?",
                "ARD meeting tips",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className="text-xs bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 
                    px-3 py-1.5 rounded-full transition border border-violet-500/20 hover:border-violet-400/40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-violet-600/40 text-white/95 rounded-br-md"
                  : "bg-white/6 text-white/85 rounded-bl-md border border-white/6"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-headings:my-2 prose-code:text-cyan-300 prose-code:bg-black/30 prose-code:px-1 prose-code:rounded">
                  <ReactMarkdown>{msg.content || "…"}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {chatState === "streaming" && (
          <div className="flex items-center gap-2 text-cyan-400/60 text-xs px-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Galexii is thinking…</span>
          </div>
        )}

        {chatState === "error" && errorMsg && (
          <div className="flex items-start gap-2 bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="px-3 pb-3 pt-2 border-t border-white/6">
        <div className="flex items-end gap-2 bg-white/4 rounded-xl border border-white/8 px-3 py-2 focus-within:border-violet-500/40 transition">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              aiConfigured === false
                ? "AI not configured…"
                : "Ask Galexii anything about special education…"
            }
            disabled={aiConfigured === false}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-white/90 placeholder:text-white/30 
              outline-none disabled:opacity-40 max-h-25 min-h-6"
            style={{
              height: "auto",
              overflow: "hidden",
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 100) + "px";
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || chatState === "streaming" || aiConfigured === false}
            className="shrink-0 p-2 rounded-lg bg-violet-600/60 hover:bg-violet-600/80 
              text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            aria-label="Send message"
          >
            {chatState === "streaming" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-white/25 text-center mt-1.5">
          Galexii is an AI assistant, not a lawyer. Always verify legal advice.
        </p>
      </div>
    </div>
  );
}
