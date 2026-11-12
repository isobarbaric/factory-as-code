import { useState } from "react";
import { FileText, Folder } from "lucide-react";
import { EntityType, type Entity } from "../../schemas";
import { query, useResource, type Browse } from "./api";
import { DocumentTemplate } from "./templates/DocumentTemplate";
import { Preview } from "./Preview";
import { DocumentNavigator } from "./DocumentNavigator";
import { TicketTable } from "./TicketTable";
import { TicketView } from "./TicketView";

interface ModuleProps { entity: Entity; route: URLSearchParams; csrf: string }

export function Module({entity, route, csrf}: ModuleProps) {
  const [generation, setGeneration] = useState<number>(0);
  const params = new URLSearchParams(route);
  params.set("entity", entity.name);
  params.delete("path");
  const {data, error} = useResource<Browse>("/api/browse?" + params + "&refresh=" + generation);
  if (error || !data) return <article role="status">{error || "Loading records…"}</article>;
  const record = data.record;
  const location = {entity: entity.name, id: data.selected || ""};
  const path = route.get("path");
  function handleVersionChange(version: number) {
    window.location.hash = query({...location, version: String(version)});
  }
  if (entity.type === EntityType.Ticket) {
    const ticketDetail = record && "ticket_id" in record
      ? <TicketView ticket={record} statuses={entity.statuses} csrf={csrf} refresh={() => setGeneration(g => g + 1)} />
      : null;
    return <TicketTable entity={entity.name} items={data.items} selected={data.selected} detail={ticketDetail} />;
  }
  let detail;
  if (!record) {
    detail = <article><h1>{entity.name}</h1><p>No records yet.</p></article>;
  } else if ("document_id" in record) {
    detail = <DocumentTemplate title={record.title} content={record.content} version={record.version_number}
      versions={data.versions} onVersionChange={handleVersionChange} />;
  } else if (path) {
    detail = <Preview {...location} path={path} />;
  } else if ("files_id" in record) {
    let listing = <p>This collection is empty.</p>;
    if (data.error) listing = <p role="alert">{data.error}</p>;
    else if (data.objects.length) listing = <ul>{data.objects.map(name => <li key={name}>
      <a href={"#" + query({...location, path:name})}><FileText /> {name}</a></li>)}</ul>;
    detail = <article><Folder /><h1>{record.files_id}</h1><code>{record.object_prefix}</code>{listing}</article>;
  }
  if (entity.type === EntityType.Document) return <div className="workspace doc-workspace"><DocumentNavigator entity={entity.name} items={data.items} selected={data.selected}/>{detail}</div>;
  return <div className="workspace"><aside className="records" aria-label="Records"><h2>{entity.name}</h2>
    {data.items.map(item => <a key={item.id} aria-current={item.id === data.selected ? "page" : undefined}
      href={"#" + query({entity: entity.name, id: item.id})}>{item.label}
      {item.summary && <small>{item.summary[0]} · {item.summary[1] || "Unassigned"}</small>}</a>)}</aside>
    {detail}
  </div>;
}
