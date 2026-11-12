import { CircleDot, Table2, X } from "lucide-react";
import type { ReactNode } from "react";
import type { Ticket } from "../../schemas";
import { query } from "./navigation";

interface TicketTableProps {
  entity: string;
  items: readonly Ticket[];
  selected: string | null;
  detail: ReactNode;
}

export function TicketTable({ entity, items, selected, detail }: TicketTableProps) {
  return <div className="tickets-layout">
    <section className="ticket-list" aria-label={entity}>
      <header className="view-header"><Table2 /><h1>{entity}</h1><small>{items.length}</small></header>
      <div className="table-scroll"><table aria-label={entity}>
        <thead><tr><th scope="col">Name</th><th scope="col">Status</th><th scope="col">Assignee</th></tr></thead>
        <tbody>{items.map(({ ticket_id: id, title, status, assignee }) => <tr key={id} className={selected === id ? "selected-row" : undefined}>
          <td><a href={"#" + query({ entity, id })}><small>{id}</small>{title}</a></td>
          <td><span className="status-chip"><CircleDot />{status}</span></td>
          <td>{assignee || "Unassigned"}</td>
        </tr>)}</tbody>
      </table></div>
      {!items.length && <p>No tickets yet.</p>}
    </section>
    {detail && <section className="ticket-detail" aria-label="Ticket details"><header className="view-header">
      <strong>Details</strong><a className="close-detail" aria-label="Close ticket details" href={"#" + query({entity})}><X /></a>
    </header>{detail}</section>}
  </div>;
}
