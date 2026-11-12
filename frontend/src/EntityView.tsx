import { EntityType, type Entity } from "../../schemas";
import { DocumentNavigator } from "./DocumentNavigator";
import { documents, tickets } from "./preview-data";
import { TicketTable } from "./TicketTable";
import { DocumentTemplate } from "./templates/DocumentTemplate";
import { TicketTemplate } from "./templates/TicketTemplate";

interface EntityViewProps {
  entity: Entity;
  selectedId: string | null;
}

export function EntityView({ entity, selectedId }: EntityViewProps) {
  if (entity.type === EntityType.Ticket) {
    const items = tickets.filter(
      (ticket) => ticket.entity_name === entity.name,
    );
    const ticket = items.find((item) => item.ticket_id === selectedId);
    const detail = ticket && <TicketTemplate ticket={ticket} />;
    return (
      <TicketTable
        entity={entity.name}
        items={items}
        selected={selectedId}
        detail={detail}
      />
    );
  }
  if (entity.type === EntityType.Document) {
    const items = documents.filter((doc) => doc.entity_name === entity.name);
    const doc =
      items.find((item) => item.document_id === selectedId) ?? items[0];
    return (
      <div className="workspace doc-workspace">
        <DocumentNavigator
          entity={entity.name}
          items={items}
          selected={doc?.document_id ?? null}
        />
        {doc ? (
          <DocumentTemplate title={doc.title} content={doc.content} />
        ) : (
          <article>No documents yet.</article>
        )}
      </div>
    );
  }
  return (
    <article>
      <h1>{entity.name}</h1>
      <p>No sample files.</p>
    </article>
  );
}
