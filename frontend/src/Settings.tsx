import type { Workspace } from "./api";

export function Settings({ config, configUrl }: Workspace) {
  return <article><h1>Settings</h1><p>Defined in <code>.process/process.ts</code>. {configUrl && <a href={configUrl}>View config in GitHub</a>}</p>
    <h2>Entities</h2><table><thead><tr><th>Name</th><th>Type</th><th>Statuses</th></tr></thead>
      <tbody>{config.entities.map(e => <tr key={e.name}><td>{e.name}</td><td>{e.type}</td><td>{e.statuses?.join(", ") || "—"}</td></tr>)}</tbody></table>
    <h2>Declared integrations</h2><p>{config.integrations?.join(", ") || "None declared"}</p>
    <h2>Directories</h2><dl>{(["skills", "automations"] as const).map(key => <div key={key}><dt>{key}</dt><dd>{config[key]?.root || "None declared"}</dd></div>)}</dl>
  </article>;
}
