import { useState } from "react";
import { ArrowUp, Sparkles, X } from "lucide-react";

export function Agent({ close }: { close: () => void }) {
  const [messages, setMessages] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  return <aside className="agent" aria-label="Agent preview">
    <header><Sparkles size={16} /><strong>Agent</strong><small>Preview</small>
      <button className="icon end" aria-label="Close agent" onClick={close}><X /></button></header>
    <div className="conversation" role="log">
      {messages.length === 0 && <p>Try the agent panel with a sample message.</p>}
      {messages.map((text, index) => <div key={index}><p className="message">{text}</p><p>This is a preview. No agent is connected.</p></div>)}
    </div>
    <form className="composer" onSubmit={event => {
      event.preventDefault();
      if (draft.trim()) { setMessages([...messages, draft.trim()]); setDraft(""); }
    }}>
      <textarea aria-label="Message agent" placeholder="Message agent…" value={draft} onChange={e => setDraft(e.target.value)} />
      <button className="icon send" disabled={!draft.trim()} aria-label="Send message"><ArrowUp /></button>
    </form>
  </aside>;
}
