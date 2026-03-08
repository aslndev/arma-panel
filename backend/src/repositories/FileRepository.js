import { readdir, mkdir, readFile, writeFile, rename, unlink, rm, stat } from "fs/promises";
import { join, resolve } from "path";

/**
 * Resolve relative path against basePath and ensure it stays inside basePath (no traversal).
 */
function resolveSafe(basePath, relativePath) {
  const base = resolve(basePath);
  const full = relativePath ? resolve(basePath, relativePath) : base;
  const normalized = resolve(full);
  if (!normalized.startsWith(base)) {
    throw new Error("Invalid path");
  }
  return normalized;
}

function formatSize(bytes) {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatModified(mtime) {
  return mtime.toISOString().slice(0, 16).replace("T", " ");
}

export async function list(basePath, relativePath) {
  const dir = resolveSafe(basePath, relativePath || "");
  const entries = await readdir(dir, { withFileTypes: true });
  const result = [];
  for (const e of entries) {
    try {
      const full = join(dir, e.name);
      const s = await stat(full);
      result.push({
        id: full,
        path: relativePath || "",
        name: e.name,
        type: s.isDirectory() ? "folder" : "file",
        size: s.isFile() ? formatSize(s.size) : null,
        modified: formatModified(s.mtime),
      });
    } catch (_) {
      // skip inaccessible entries
    }
  }
  result.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  return result;
}

export async function createFolder(basePath, relativePath, name, byUser) {
  const dir = resolveSafe(basePath, relativePath || "");
  const full = join(dir, name.trim());
  const base = resolve(basePath);
  if (!resolve(full).startsWith(base)) throw new Error("Invalid path");
  await mkdir(full, { recursive: true });
  return list(basePath, relativePath);
}

export async function writeFileAt(basePath, relativePath, name, content, byUser) {
  const dir = resolveSafe(basePath, relativePath || "");
  const full = join(dir, name.trim());
  const base = resolve(basePath);
  if (!resolve(full).startsWith(base)) throw new Error("Invalid path");
  await writeFile(full, content ?? "", "utf8");
  return list(basePath, relativePath);
}

export async function readFileContent(basePath, relativePath, name) {
  const dir = resolveSafe(basePath, relativePath || "");
  const full = join(dir, name);
  const base = resolve(basePath);
  if (!resolve(full).startsWith(base)) throw new Error("Invalid path");
  const s = await stat(full);
  if (s.isDirectory()) return null;
  const content = await readFile(full, "utf8");
  return { content, name };
}

export async function updateContent(basePath, relativePath, name, content, byUser) {
  const dir = resolveSafe(basePath, relativePath || "");
  const full = join(dir, name);
  const base = resolve(basePath);
  if (!resolve(full).startsWith(base)) throw new Error("Invalid path");
  await writeFile(full, content ?? "", "utf8");
  return list(basePath, relativePath);
}

export async function renameEntry(basePath, relativePath, oldName, newName, type, byUser) {
  const dir = resolveSafe(basePath, relativePath || "");
  const oldFull = join(dir, oldName);
  const newFull = join(dir, newName.trim());
  const base = resolve(basePath);
  if (!resolve(oldFull).startsWith(base) || !resolve(newFull).startsWith(base)) throw new Error("Invalid path");
  await rename(oldFull, newFull);
  return list(basePath, relativePath);
}

export async function remove(basePath, relativePath, name, byUser) {
  const dir = resolveSafe(basePath, relativePath || "");
  const full = join(dir, name);
  const base = resolve(basePath);
  if (!resolve(full).startsWith(base)) throw new Error("Invalid path");
  const s = await stat(full);
  if (s.isDirectory()) {
    await rm(full, { recursive: true });
  } else {
    await unlink(full);
  }
  return list(basePath, relativePath);
}
