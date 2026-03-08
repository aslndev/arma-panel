import { readdir, mkdir, readFile, writeFile, rename, unlink, rm, stat, chmod } from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import { join, resolve } from "path";
import archiver from "archiver";
import unzipper from "unzipper";

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
          const mode = s.mode;
      const modeStr = (mode & 0o777).toString(8).padStart(3, "0");
      result.push({
        id: full,
        path: relativePath || "",
        name: e.name,
        type: s.isDirectory() ? "folder" : "file",
        size: s.isFile() ? formatSize(s.size) : null,
        modified: formatModified(s.mtime),
        mode: modeStr,
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
  const data = content ?? (Buffer.isBuffer(content) ? Buffer.alloc(0) : "");
  if (Buffer.isBuffer(data)) {
    await writeFile(full, data);
  } else {
    await writeFile(full, data, "utf8");
  }
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

export async function readFileBuffer(basePath, relativePath, name) {
  const dir = resolveSafe(basePath, relativePath || "");
  const full = join(dir, name);
  const base = resolve(basePath);
  if (!resolve(full).startsWith(base)) throw new Error("Invalid path");
  const s = await stat(full);
  if (s.isDirectory()) return null;
  return readFile(full);
}

export function createReadStreamForFile(basePath, relativePath, name) {
  const dir = resolveSafe(basePath, relativePath || "");
  const full = join(dir, name);
  const base = resolve(basePath);
  if (!resolve(full).startsWith(base)) throw new Error("Invalid path");
  return createReadStream(full);
}

export async function setPermission(basePath, relativePath, name, modeOctal, byUser) {
  const dir = resolveSafe(basePath, relativePath || "");
  const full = join(dir, name);
  const base = resolve(basePath);
  if (!resolve(full).startsWith(base)) throw new Error("Invalid path");
  const mode = typeof modeOctal === "string" ? parseInt(modeOctal, 8) : modeOctal;
  if (Number.isNaN(mode) || mode < 0 || mode > 0o7777) throw new Error("Invalid mode");
  await chmod(full, mode);
  return list(basePath, relativePath);
}

export async function zipToFile(basePath, relativePath, entryNames, outputZipName) {
  const dir = resolveSafe(basePath, relativePath || "");
  const base = resolve(basePath);
  const outPath = join(dir, outputZipName);
  if (!resolve(outPath).startsWith(base)) throw new Error("Invalid path");
  const archive = archiver("zip", { zlib: { level: 5 } });
  const writeStream = createWriteStream(outPath);
  await new Promise((resolvePromise, rejectPromise) => {
    archive.pipe(writeStream);
    writeStream.on("close", resolvePromise);
    archive.on("error", rejectPromise);
    (async () => {
      try {
        for (const entryName of entryNames) {
          const full = join(dir, entryName);
          if (!resolve(full).startsWith(base)) throw new Error("Invalid path");
          try {
            const s = await stat(full);
            if (s.isDirectory()) {
              archive.directory(full, entryName);
            } else {
              archive.file(full, { name: entryName });
            }
          } catch (_) {
            // skip inaccessible
          }
        }
        await archive.finalize();
      } catch (err) {
        rejectPromise(err);
      }
    })();
  });
  return outPath;
}

export async function unzipFile(basePath, relativePath, zipName, byUser) {
  const dir = resolveSafe(basePath, relativePath || "");
  const base = resolve(basePath);
  const zipPath = join(dir, zipName);
  if (!resolve(zipPath).startsWith(base)) throw new Error("Invalid path");
  const s = await stat(zipPath);
  if (s.isDirectory()) throw new Error("Not a file");
  await unzipper.Open.file(zipPath).then((zip) => zip.extract({ path: dir }));
  return list(basePath, relativePath);
}
