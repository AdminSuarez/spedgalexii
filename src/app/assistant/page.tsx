"use client";

import React, { useEffect, useRef, useState } from "react";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { Loader2, MessageCircle, Send } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function AssistantPage() {
  const [studentId, setStudentId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"parent" | "case_manager">("case_manager");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = input.trim();
    const sid = studentId.trim();
    if (!sid) {
      setError("Enter a student ID to scope the AI.");
      return;
    }
    if (!trimmed) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const resp = await fetch("/api/ai/student-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: sid,
          messages: newMessages,
          mode,
        }),
      });

      if (!resp.ok || !resp.body) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || "Chat request failed.");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split(/\n\n/);
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as { content?: string; error?: string };
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.content) {
              assistantText += parsed.content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.role === "assistant") {
                  return [...prev.slice(0, -1), { role: "assistant", content: assistantText }];
                }
                return [...prev, { role: "assistant", content: assistantText }];
              });
            }
          } catch {
            // ignore parse errors for non-JSON lines
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Chat failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GalaxyShell>
      <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 py-6">
        <header className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-400/90 text-black shadow-md">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight">Galexii Copilot</h1>
            <p className="text-xs text-slate-300 sm:text-sm">
              Ask ARD/IEP questions with Galexii looking at one student's Deep Dive
              and audit data. Enter an ID, then chat like we do here.
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-700/70 bg-slate-950/80 p-3 sm:p-4">
          <label className="text-xs font-medium text-slate-200 sm:text-sm">
            Student ID
            <input
              className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-1.5 text-xs text-slate-50 shadow-sm focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 sm:text-sm"
              placeholder="e.g. 10126516"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300 sm:text-sm">
            <span className="font-medium text-slate-200">Audience mode:</span>
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="audience-mode"
                value="case_manager"
                checked={mode === "case_manager"}
                onChange={() => setMode("case_manager")}
                className="h-3 w-3 text-lime-400 focus:ring-lime-400"
              />
              <span>Case manager / ARD team</span>
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="audience-mode"
                value="parent"
                checked={mode === "parent"}
                onChange={() => setMode("parent")}
                className="h-3 w-3 text-lime-400 focus:ring-lime-400"
              />
              <span>Parent / caregiver</span>
            </label>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-700/70 bg-slate-950/60 p-3 text-sm sm:p-4"
        >
          {messages.length === 0 && (
            <p className="text-xs text-slate-400 sm:text-sm">
              Start by entering a student ID, then ask things like:
              "Draft a PLAAFP for reading," "Summarize STAAR data," or
              "Help me write deliberations for this ARD."
            </p>
          )}

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-xs sm:text-sm ${
                  m.role === "user"
                    ? "bg-lime-400 text-black"
                    : "bg-slate-800/90 text-slate-50"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 sm:text-sm">
              <Loader2 className="h-3 w-3 animate-spin" />
              Thinking with your student's data...
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="flex items-end gap-2">
          <textarea
            className="min-h-11 flex-1 resize-none rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 shadow-sm focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 sm:text-sm"
            placeholder="Ask Galexii about PLAAFP, goals, STAAR/MAP analysis, accommodations, or deliberations..."
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-lime-400 text-black shadow-md transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>

        {error && (
          <p className="text-xs text-rose-400 sm:text-sm">{error}</p>
        )}
      </div>
    </GalaxyShell>
  );
}
