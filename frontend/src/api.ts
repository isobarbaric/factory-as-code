import { useEffect, useState } from "react";
import type { Document, Ticket, Files, ProcessConfig } from "../../schemas";

export interface Workspace {
  repo: string;
  config: ProcessConfig;
  csrf: string;
  configUrl: string | null;
}

export interface Browse {
  items: { id: string; label: string; summary?: [string, string | null] }[];
  record: Document | Ticket | Files | null;
  selected: string | null;
  versions: number[];
  objects: string[];
  error: string | null;
}

export function query(values: Record<string, string>) {
  return new URLSearchParams(values).toString();
}

export function useResource<T>(url: string): {data?: T; error?: string} {
  const [result, setResult] = useState<{url: string; data?: T; error?: string}>();
  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(`Could not load this view (${response.status}).`);
      const data: T = await response.json();
      if (!controller.signal.aborted) setResult({ url, data });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ url, error: error.message });
    });
    return () => controller.abort();
  }, [url]);
  return result?.url === url ? result : {};
}
