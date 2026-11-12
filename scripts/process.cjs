#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function validate(config, base, schema) {
  if (!Array.isArray(config?.entities)) throw new Error("entities must be an array");
  const names = new Set();
  for (const entity of config.entities) {
    if (typeof entity?.name !== "string" || !entity.name.trim()) {
      throw new Error("Each entity needs a nonblank name");
    }
    const name = entity.name.trim();
    if (names.has(name)) throw new Error(`Duplicate entity name: ${name}`);
    names.add(name);
    if (entity.type === schema.EntityType.Ticket) {
      const statuses = entity.statuses;
      if (!Array.isArray(statuses) || statuses.length === 0 ||
          statuses.some(status => typeof status !== "string" || !status || status !== status.trim()) ||
          new Set(statuses).size !== statuses.length) {
        throw new Error(`Ticket entity ${name} needs unique, nonblank statuses without surrounding whitespace`);
      }
    } else if ("statuses" in entity) {
      throw new Error(`Only ticket entities may declare statuses: ${name}`);
    }
    if (!Object.values(schema.EntityType).includes(entity.type)) {
      throw new Error(`Unknown entity type for ${name}: ${entity.type}`);
    }
  }
  if (config.integrations !== undefined && (!Array.isArray(config.integrations) ||
      !config.integrations.every(value => Object.values(schema.Integration).includes(value)))) {
    throw new Error("integrations must be an array of supported Integration values");
  }
  for (const key of ["automations", "skills"]) {
    if (config[key] === undefined) continue;
    const root = config[key]?.root;
    if (typeof root !== "string" || !root.trim() || path.isAbsolute(root) ||
        !fs.statSync(path.resolve(base, root), { throwIfNoEntry: false })?.isDirectory()) {
      throw new Error(`${key}.root must point to an existing directory relative to .process/`);
    }
  }
}

function build() {
  const { require: loadTypeScript } = require("tsx/cjs/api");
  const base = path.resolve(".process");
  const configPath = path.join(base, "process.ts");
  const schemaPath = require.resolve("@process-as-code/process-config");
  if (!fs.existsSync(configPath)) throw new Error("Missing .process/process.ts");
  const temp = fs.mkdtempSync(path.resolve(".process-build-"));
  try {
    const check = path.join(temp, "check.ts");
    fs.writeFileSync(check, [
      `import type { ProcessConfig } from ${JSON.stringify(schemaPath)};`,
      `import config from ${JSON.stringify(configPath)};`,
      "config satisfies ProcessConfig;",
    ].join("\n"));
    execFileSync(process.execPath, [
      require.resolve("typescript/bin/tsc"), "--noEmit", "--strict",
      "--allowImportingTsExtensions", "--target", "ES2022", "--module", "preserve", check,
    ], { stdio: "inherit" });

    const config = loadTypeScript(configPath, __filename).default;
    validate(config, base, loadTypeScript(schemaPath, __filename));
    const manifest = JSON.stringify(config, null, 2) + "\n";
    const staged = path.join(temp, "process.json");
    fs.writeFileSync(staged, manifest);
    const dist = path.join(base, "dist");
    fs.mkdirSync(dist, { recursive: true });
    fs.renameSync(staged, path.join(dist, "process.json"));
    console.log("Built .process/dist/process.json");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function connect(repoId) {
  const manifest = path.resolve(".process/dist/process.json");
  if (!fs.existsSync(manifest)) {
    throw new Error("Missing .process/dist/process.json. Run process build in the project root first.");
  }
  const root = path.resolve(__dirname, "..");
  execFileSync("uv", ["run", "--locked", "python", "-m", "scripts.local_setup", "--register"], {
    cwd: root,
    env: {
      ...process.env,
      PROCESS_REPOS: process.env.PROCESS_REPOS || path.join(root, ".local", "repos.json"),
      REPO_ID: repoId,
      MANIFEST: manifest,
    },
    stdio: "inherit",
  });
}

try {
  const [command, ...args] = process.argv.slice(2);
  if (command === "build" && args.length === 0) {
    build();
  } else if (command === "connect" && args.length === 2 && args[0] === "--repo-id" && args[1].trim()) {
    connect(args[1]);
  } else {
    throw new Error("Usage: process build | process connect --repo-id <stable-id>");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
