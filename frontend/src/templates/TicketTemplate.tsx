import type { ReactNode } from "react";

interface TicketTemplateProps {
  identifier: string;
  title: string;
  description: string;
  properties: ReactNode;
}

export function TicketTemplate({ identifier, title, description, properties }: TicketTemplateProps) {
  return <article><div className="ticket">
    <section>
      <small>{identifier}</small>
      <h1>{title}</h1>
      <div className="content">{description}</div>
    </section>
    {properties}
  </div></article>;
}
