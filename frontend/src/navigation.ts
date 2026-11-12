export function query(values: Record<string, string>) {
  return new URLSearchParams(values).toString();
}
