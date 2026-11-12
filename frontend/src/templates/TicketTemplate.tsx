import type { Ticket } from "../../../schemas";

interface TicketTemplateProps {
  ticket: Ticket;
}

export function TicketTemplate({ ticket }: TicketTemplateProps) {
  return (
    <article>
      <div className="ticket">
        <section>
          <small>{ticket.ticket_id}</small>
          <h1>{ticket.title}</h1>
          <div className="content">{ticket.description}</div>
        </section>
        <dl className="properties">
          <dt>Status</dt>
          <dd>{ticket.status}</dd>
          <dt>Assignee</dt>
          <dd>{ticket.assignee ?? "Unassigned"}</dd>
        </dl>
      </div>
    </article>
  );
}
