import type { ProcessConfig } from "../../schemas";

interface SettingsProps {
  config: ProcessConfig;
}

export function Settings({ config }: SettingsProps) {
  return (
    <article>
      <h1>Settings</h1>
      <p>
        Defined in <code>.process/process.ts</code>.
      </p>
      <h2>Entities</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Statuses</th>
          </tr>
        </thead>
        <tbody>
          {config.entities.map((e) => (
            <tr key={e.name}>
              <td>{e.name}</td>
              <td>{e.type}</td>
              <td>{e.statuses?.join(", ") || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Declared integrations</h2>
      <p>{config.integrations?.join(", ") || "None declared"}</p>
      <h2>Directories</h2>
      <dl>
        <dt>Skills</dt>
        <dd>{config.skills?.root || "None declared"}</dd>
        <dt>Automations</dt>
        <dd>{config.automations?.root || "None declared"}</dd>
      </dl>
    </article>
  );
}
