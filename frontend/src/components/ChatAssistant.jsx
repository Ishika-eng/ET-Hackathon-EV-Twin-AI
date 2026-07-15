import { useRef, useState, useEffect } from "react";
import { api } from "../api";
import { ErrorBanner } from "./Loading";

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
    <div className="flex flex-col h-[calc(100vh-180px)] panel">
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="text-[var(--text-dim)] text-sm flex flex-col gap-2">
            <p>Ask the Orchestrator Agent a cross-cutting question — it will call the Procurement, Fleet Health, and Supply Chain agents as needed.</p>
            <div className="flex flex-col gap-2 mt-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-left text-sm px-3 py-2 rounded-md border border-[var(--panel-border)] hover:border-[var(--accent)] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-[var(--accent-dim)] text-[var(--text)]" : "bg-[var(--bg)] border border-[var(--panel-border)]"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && <div className="text-[var(--text-dim)] text-sm">Thinking...</div>}
        {error && <ErrorBanner message={error} />}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-[var(--panel-border)] flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="e.g. Why is vehicle V017 degrading faster than average?"
          className="flex-1 bg-[var(--bg)] border border-[var(--panel-border)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={send}
          disabled={sending}
          className="bg-[var(--accent)] text-[var(--bg)] font-medium px-4 py-2 rounded-md text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
