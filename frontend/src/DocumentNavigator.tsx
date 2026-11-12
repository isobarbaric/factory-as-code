import { ChevronDown, FileText, Search } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import type { Document } from "../../schemas";
import { query } from "./navigation";

interface DocumentNavigatorProps {
  entity: string;
  items: readonly Document[];
  selected: string | null;
}

export function DocumentNavigator({entity, items, selected}: DocumentNavigatorProps) {
  const [search, setSearch] = useState<string>("");
  function handleSearch(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
  }
  const matches = items.filter(item => item.title.toLowerCase().includes(search.trim().toLowerCase()));
  return <aside className="records doc-nav" aria-label="Document navigator">
    <label className="doc-search"><Search/><input type="search" aria-label="Search documents" placeholder="Search documents…" value={search} onChange={handleSearch}/></label>
    <details open><summary><ChevronDown/>{entity}</summary>
      {matches.map(item => <a key={item.document_id} aria-current={item.document_id === selected ? "page" : undefined}
        href={"#" + query({entity, id:item.document_id})}><FileText/>{item.title}</a>)}
      {!matches.length && <small>{search ? "No matching documents." : "No documents yet."}</small>}
    </details>
  </aside>;
}
