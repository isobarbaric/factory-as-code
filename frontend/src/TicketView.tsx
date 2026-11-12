import { useState, type FormEvent } from "react";
import type { Ticket } from "../../schemas";
import { TicketTemplate } from "./templates/TicketTemplate";
import { query } from "./api";

interface TicketViewProps {
  ticket: Ticket; statuses: readonly string[]; csrf: string; refresh: () => void;
}

export function TicketView({ ticket, statuses, csrf, refresh }: TicketViewProps) {
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const body = new FormData(event.currentTarget);
      body.set("csrf", csrf);
      body.set("previous_status", ticket.status);
      body.set("previous_assignee", ticket.assignee || "");
      setSaving(true); setError("");
      try {
        const response = await fetch("/api/ticket?" + query({entity: ticket.entity_name, id: ticket.ticket_id}), { method: "POST", body });
        if (!response.ok) throw new Error(response.status === 409 ? "This ticket changed. Reload before saving." : "Could not save changes.");
        refresh();
      } catch (e) { setError(e instanceof Error ? e.message : "Could not save changes."); }
      finally { setSaving(false); }
  }

  return <TicketTemplate identifier={ticket.ticket_id} title={ticket.title} description={ticket.description || "No description."} properties={
    <form className="properties" onSubmit={handleSubmit}><h2>Properties</h2><label htmlFor="status">Status</label>
      <select id="status" name="status" defaultValue={ticket.status}>
        {!statuses.includes(ticket.status) && <option disabled>{ticket.status}</option>}
        {statuses.map(s => <option key={s}>{s}</option>)}</select>
      <label htmlFor="assignee">Assignee</label><input id="assignee" name="assignee" defaultValue={ticket.assignee || ""} placeholder="Unassigned" />
      {error && <p role="alert">{error}</p>}<button disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
    </form>
  } />;
}
