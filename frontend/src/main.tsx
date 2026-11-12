import { useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import {
  Box,
  ChevronRight,
  FileText,
  Folder,
  PanelLeft,
  Settings2,
  SquareCheck,
} from "lucide-react";
import { query } from "./navigation";
import config from "../../.process/process";
import { EntityView } from "./EntityView";
import { Settings } from "./Settings";
import "./workspace.css";

function subscribe(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}
const icons = { document: FileText, ticket: SquareCheck, files: Folder };

function App() {
  const hash = useSyncExternalStore<string>(
    subscribe,
    () => window.location.hash,
  );
  const [nav, setNav] = useState<boolean>(() => window.innerWidth > 700);
  const route = new URLSearchParams(hash.slice(1));
  const entities = config.entities;
  const entity =
    entities.find((e) => e.name === route.get("entity")) ?? entities[0];
  const settings = route.has("settings") || !entity;
  function navigate() {
    if (window.innerWidth <= 700) setNav(false);
  }
  return (
    <div className="shell">
      {nav && (
        <aside className="sidebar">
          <header>
            <Box />
            <strong>Process preview</strong>
          </header>
          <nav aria-label="Repository navigation">
            {entities.map((e) => {
              const Icon = icons[e.type];
              return (
                <a
                  key={e.name}
                  href={"#" + query({ entity: e.name })}
                  onClick={navigate}
                  aria-current={
                    !settings && entity.name === e.name ? "page" : undefined
                  }
                >
                  <Icon />
                  {e.name}
                </a>
              );
            })}
          </nav>
          <a
            className="settings"
            href="#settings"
            onClick={navigate}
            aria-current={settings ? "page" : undefined}
          >
            <Settings2 />
            Settings
          </a>
        </aside>
      )}
      <main>
        <header className="bar">
          <button
            className="icon"
            aria-label="Toggle sidebar"
            aria-expanded={nav}
            onClick={() => setNav(!nav)}
          >
            <PanelLeft />
          </button>
          <span>Sample workspace</span>
          <ChevronRight />
          <strong>{settings ? "Settings" : entity.name}</strong>
        </header>
        {settings ? (
          <Settings config={config} />
        ) : (
          <EntityView
            key={entity.name}
            entity={entity}
            selectedId={route.get("id")}
          />
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
