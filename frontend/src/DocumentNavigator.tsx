import { ChevronDown, FileText, Search } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { query, type Browse } from "./api";

interface DocumentNavigatorProps {
  entity: string;
  items: Browse["items"];
  selected: string | null;
}

export function DocumentNavigator({entity, items, selected}: DocumentNavigatorProps) {
  const [search, setSearch] = useState<string>("");
  function handleSearch(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
  }
  const matches = items.filter(item => item.label.toLowerCase().includes(search.trim().toLowerCase()));
  return <aside className="records doc-nav" aria-label="Document navigator">
    <label className="doc-search"><Search/><input type="search" aria-label="Search documents" placeholder="Search documents…" value={search} onChange={handleSearch}/></label>
    <details open><summary><ChevronDown/>{entity}</summary>
      {matches.map(item => <a key={item.id} aria-current={item.id === selected ? "page" : undefined}
        href={"#" + query({entity, id:item.id})}><FileText/>{item.label}</a>)}
      {!matches.length && <small>{search ? "No matching documents." : "No documents yet."}</small>}
    </details>
  </aside>;
}
