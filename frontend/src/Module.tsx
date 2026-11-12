import { EntityType, type Entity } from "../../schemas";
import { DocumentNavigator } from "./DocumentNavigator";
import { documents, tickets } from "./preview-data";
import { TicketTable } from "./TicketTable";
import { DocumentTemplate } from "./templates/DocumentTemplate";
import { TicketTemplate } from "./templates/TicketTemplate";

interface ModuleProps {
  entity: Entity;
  route: URLSearchParams;
}

export function Module({ entity, route }: ModuleProps) {
  const id = route.get("id");
  if (entity.type === EntityType.Ticket) {
    const items = tickets.filter(ticket => ticket.entity_name === entity.name);
    const ticket = items.find(item => item.ticket_id === id);
    const detail = ticket && <TicketTemplate identifier={ticket.ticket_id} title={ticket.title}
      description={ticket.description} properties={<dl className="properties">
        <dt>Status</dt><dd>{ticket.status}</dd>
        <dt>Assignee</dt><dd>{ticket.assignee ?? "Unassigned"}</dd>
      </dl>} />;
    return <TicketTable entity={entity.name} items={items} selected={id} detail={detail} />;
  }
  if (entity.type === EntityType.Document) {
    const items = documents.filter(doc => doc.entity_name === entity.name);
    const doc = items.find(item => item.document_id === id) ?? items[0];
    return <div className="workspace doc-workspace">
      <DocumentNavigator entity={entity.name} items={items} selected={doc?.document_id ?? null} />
      {doc ? <DocumentTemplate title={doc.title} content={doc.content} /> : <article>No documents yet.</article>}
    </div>;
  }
  return <article><h1>{entity.name}</h1><p>No sample files.</p></article>;
}
