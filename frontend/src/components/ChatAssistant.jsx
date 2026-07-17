import { useRef, useState, useEffect } from "react";
import { Send, Bot, Loader2 } from "lucide-react";
import { api } from "../api";
import { ErrorBanner } from "./Loading";
import Button from "./Button";

export default function ChatAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const res = await api.chat(text, messages);
      setMessages([...nextMessages, { role: "assistant", content: res.reply }]);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Chat request failed");
    } finally {
      setSending(false);
    }
  };

  const suggestions = [
    "Which vehicles should we prioritize for electrification next quarter?",
    "Are there any battery health risks I should know about?",
    "Which suppliers pose the highest concentration risk?",
  ];

  return (
    <div className="flex flex-col h-full min-h-[500px] panel">
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="text-[var(--text-dim)] text-sm flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[var(--text)] font-medium mb-1">
              <Bot size={16} strokeWidth={2.25} className="text-[var(--accent-blue)]" />
              Orchestrator Agent
            </div>
            <p>Ask a cross-cutting question — it will call the Procurement, Fleet Health, and Supply Chain agents as needed.</p>
            <div className="flex flex-col gap-2 mt-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-left text-sm px-3 py-2 rounded-lg border border-[var(--panel-border)] hover:border-[var(--accent-blue)] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <span className="shrink-0 w-7 h-7 rounded-full bg-[var(--accent-blue-dim)] flex items-center justify-center mt-0.5">
                <Bot size={14} strokeWidth={2.25} className="text-[var(--accent-blue)]" />
              </span>
            )}
            <div
              className={`max-w-[75%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-[var(--accent-blue-dim)] text-[var(--text)]" : "bg-[var(--bg)] border border-[var(--panel-border)]"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-[var(--text-dim)] text-sm">
            <span className="shrink-0 w-7 h-7 rounded-full bg-[var(--accent-blue-dim)] flex items-center justify-center">
              <Loader2 size={14} className="animate-spin text-[var(--accent-blue)]" />
            </span>
            Thinking...
          </div>
        )}
        {error && <ErrorBanner message={error} />}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-[var(--panel-border)] flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="e.g. Why is vehicle V017 degrading faster than average?"
          className="flex-1 bg-[var(--bg)] border border-[var(--panel-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent-blue)]"
        />
        <Button onClick={send} disabled={sending} icon={Send}>
          Send
        </Button>
      </div>
    </div>
  );
}
