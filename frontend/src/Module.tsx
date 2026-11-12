import { useState } from "react";
import { FileText, Download, Folder, ArrowLeft } from "lucide-react";
import type { Entity } from "../../schemas";
import { query, useResource, type Browse } from "./api";
import { TicketView } from "./TicketView";

function Preview({ entity, id, path }: {entity: string; id: string; path: string}) {
  const url = "/api/file?" + query({entity, id, path});
  const {data, error} = useResource<{preview: string | null}>(url);
  return <article><a href={"#" + query({entity, id})}><ArrowLeft /> Collection</a><h1>{path}</h1>
    <a href={url + "&download=1"}><Download /> Download</a>
    {error ? <p role="alert">{error}</p> : !data ? <p>Loading preview…</p> : data.preview === null ?
      <p>Download this file to open it.</p> : <><p>Text preview · first 64 KiB</p><pre>{data.preview}</pre></>}
  </article>;
}

export function Module({entity, route, csrf}: {entity: Entity; route: URLSearchParams; csrf: string}) {
  const [generation, setGeneration] = useState(0);
  const params = new URLSearchParams(route);
  params.set("entity", entity.name);
  params.delete("path");
  const {data, error} = useResource<Browse>("/api/browse?" + params + "&refresh=" + generation);
  if (error || !data) return <article role="status">{error || "Loading records…"}</article>;
  const record = data.record;
  const location = {entity: entity.name, id: data.selected || ""};
  const path = route.get("path");
  return <div className="workspace"><aside className="records" aria-label="Records"><h2>{entity.name}</h2>
    {data.items.map(item => <a key={item.id} aria-current={item.id === data.selected ? "page" : undefined}
      href={"#" + query({entity: entity.name, id: item.id})}>{item.label}
      {item.summary && <small>{item.summary[0]} · {item.summary[1] || "Unassigned"}</small>}</a>)}</aside>
    {!record ? <article><h1>{entity.name}</h1><p>No records yet.</p></article> :
      "document_id" in record ? <article><div className="revision"><FileText /><label>Revision <select aria-label="Revision"
        value={record.version_number} onChange={e => {window.location.hash = query({...location, version: e.target.value});}}>
        {data.versions.map(v => <option key={v}>{v}</option>)}</select></label></div>
        <h1>{record.title}</h1><div className="content">{record.content}</div></article> :
      "ticket_id" in record ? <article><TicketView ticket={record} statuses={entity.statuses || []} csrf={csrf} refresh={() => setGeneration(g => g + 1)} /></article> :
      path ? <Preview {...location} path={path}/> : <article><Folder /><h1>{record.files_id}</h1><code>{record.object_prefix}</code>
        {data.error ? <p role="alert">{data.error}</p> : !data.objects.length ? <p>This collection is empty.</p> :
          <ul>{data.objects.map(name => <li key={name}><a href={"#" + query({...location,path:name})}><FileText /> {name}</a></li>)}</ul>}</article>}
  </div>;
}
