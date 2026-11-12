import { FileText } from "lucide-react";

interface DocumentTemplateProps {
  title: string;
  content: string;

}

export function DocumentTemplate({ title, content }: DocumentTemplateProps) {
  return <section className="document-panel">
    <header className="view-header document-header">
      <FileText /><strong>{title}</strong>
    </header>
    <article className="document-page"><h1>{title}</h1>
    <div className="content">{content}</div>
    </article>
  </section>;
}
