import { ArrowLeft, Download } from "lucide-react";
import { query, useResource } from "./api";

interface PreviewProps { entity: string; id: string; path: string }

export function Preview({entity, id, path}: PreviewProps) {
  const url = "/api/file?" + query({entity, id, path});
  const {data, error} = useResource<{preview: string | null}>(url);
  let body = <p>Loading preview…</p>;
  if (error) body = <p role="alert">{error}</p>;
  else if (data?.preview === null) body = <p>Download this file to open it.</p>;
  else if (data) body = <><p>Text preview · first 64 KiB</p><pre>{data.preview}</pre></>;
  return <article><a href={"#" + query({entity, id})}><ArrowLeft /> Collection</a><h1>{path}</h1>
    <a href={url + "&download=1"}><Download /> Download</a>{body}</article>;
}
