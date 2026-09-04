import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destination = path.join(root, "dist");
const manifest = JSON.parse(await fs.readFile(path.join(root, "scripts/public-files.json"), "utf8"));
const blockedDirectories = new Set([
  ".git", ".netlify", "node_modules", "netlify", "scripts", "seo", "audits",
  "design", "output", "outputs", "tmp", "tools", "prospectos_puebla", "promocionales"
]);
const allowedExtensions = new Set([
  ".html", ".css", ".js", ".mjs", ".json", ".xml", ".txt", ".png", ".jpg",
  ".jpeg", ".svg", ".webp", ".avif", ".ico", ".gif", ".webmanifest", ".mp3"
]);

if (!Array.isArray(manifest.files) || !manifest.files.length) {
  throw new Error("The public file manifest must contain an explicit list of files.");
}

const files = new Set();
for (const relative of manifest.files) {
  const segments = typeof relative === "string" ? relative.split("/") : [];
  if (!segments.length || path.isAbsolute(relative) || relative.includes("\\") ||
      segments.some((segment) => !segment || segment === "." || segment === ".." || blockedDirectories.has(segment)) ||
      !allowedExtensions.has(path.extname(relative).toLowerCase()) ||
      /(?:^|\/)(?:package(?:-lock)?\.json|netlify\.toml|deno\.lock|\.env(?:\..*)?)$/i.test(relative) ||
      /\.bak(?:-|\.|$)/i.test(relative)) {
    throw new Error(`Not a public website asset: ${String(relative)}`);
  }
  if (files.has(relative)) throw new Error(`Duplicate public asset: ${relative}`);
  const source = path.join(root, relative);
  const resolved = await fs.realpath(source);
  if (!resolved.startsWith(`${root}${path.sep}`) || !(await fs.lstat(source)).isFile()) {
    throw new Error(`Public assets must be regular files in the project: ${relative}`);
  }
  files.add(relative);
}

// dist is generated exclusively from the reviewed manifest. Never publish the repo root.
await fs.rm(destination, { recursive: true, force: true });
for (const relative of files) {
  const output = path.join(destination, relative);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.copyFile(path.join(root, relative), output);
}
console.log(`Published ${files.size} reviewed public files to dist; server code remains outside dist.`);
