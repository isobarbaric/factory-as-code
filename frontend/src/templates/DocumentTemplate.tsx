import type { ChangeEvent } from "react";
import { FileText } from "lucide-react";

interface DocumentTemplateProps {
  title: string;
  content: string;
  version: number;
  versions: readonly number[];
  onVersionChange: (version: number) => void;
}

export function DocumentTemplate({ title, content, version, versions, onVersionChange }: DocumentTemplateProps) {
  function handleVersionChange(event: ChangeEvent<HTMLSelectElement>) {
    onVersionChange(Number(event.target.value));
  }

  return <article>
    <div className="revision">
      <FileText />
      <label>Revision <select aria-label="Revision" value={version} onChange={handleVersionChange}>
        {versions.map(v => <option key={v}>{v}</option>)}
      </select></label>
    </div>
    <h1>{title}</h1>
    <div className="content">{content}</div>
  </article>;
}
