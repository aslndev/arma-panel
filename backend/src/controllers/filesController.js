import * as FilesUseCase from "../useCases/FilesUseCase.js";

export async function list(req, res) {
  try {
    const path = req.query.path ?? "";
    const listResult = await FilesUseCase.list(path);
    res.json(listResult);
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

export async function createFolder(req, res) {
  try {
    const body = req.body || {};
    const path = body.path ?? "";
    await FilesUseCase.createFolder(path, body.name, req.user?.username || "admin");
    const listResult = await FilesUseCase.list(path);
    res.status(201).json(listResult);
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

export async function uploadFile(req, res) {
  try {
    const path = req.body?.path ?? req.query.path ?? "";
    const name = req.body?.name || req.file?.originalname;
    const content = req.file?.buffer ?? req.body?.content;
    const size = req.file?.size ?? req.body?.size;
    await FilesUseCase.uploadFile(path, name, content, size, req.user?.username || "admin");
    const listResult = await FilesUseCase.list(path);
    res.status(201).json(listResult);
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

export async function getFile(req, res) {
  try {
    const path = req.query.path ?? "";
    const name = req.query.name;
    const file = await FilesUseCase.getFileContent(path, name);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }
    res.json(file);
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

export async function download(req, res) {
  try {
    const path = req.query.path ?? "";
    const name = req.query.name;
    if (!name) {
      return res.status(400).json({ error: "File name required" });
    }
    const { stream, fileName } = FilesUseCase.getDownloadStream(path, name);
    const encoded = encodeURIComponent(fileName);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"; filename*=UTF-8''${encoded}`);
    stream.pipe(res);
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

export async function zip(req, res) {
  try {
    const body = req.body || {};
    const path = body.path ?? "";
    const names = Array.isArray(body.names) ? body.names : [];
    const outputName = (body.outputName || "archive.zip").replace(/\.zip$/i, "") + ".zip";
    await FilesUseCase.zipFiles(path, names, outputName, req.user?.username || "admin");
    res.json({ success: true, file: outputName });
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

export async function unzip(req, res) {
  try {
    const body = req.body || {};
    const path = body.path ?? "";
    const name = body.name;
    if (!name) {
      return res.status(400).json({ error: "Zip file name required" });
    }
    await FilesUseCase.unzipFile(path, name, req.user?.username || "admin");
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

export async function chmod(req, res) {
  try {
    const body = req.body || {};
    const path = body.path ?? "";
    const name = body.name;
    let mode = body.mode;
    if (!name || mode === undefined) {
      return res.status(400).json({ error: "name and mode required" });
    }
    if (typeof mode === "string") {
      mode = mode.replace(/^0/, "") || "0";
      mode = parseInt(mode, 8);
    }
    if (Number.isNaN(mode) || mode < 0 || mode > 0o7777) {
      return res.status(400).json({ error: "Invalid mode (use octal e.g. 755)" });
    }
    await FilesUseCase.setPermission(path, name, mode, req.user?.username || "admin");
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

export async function updateFile(req, res) {
  try {
    const body = req.body || {};
    const path = body.path ?? req.query.path ?? "";
    const name = body.name ?? req.query.name;
    await FilesUseCase.updateFile(path, name, { content: body.content, newName: body.newName }, req.user?.username || "admin");
    const listResult = await FilesUseCase.list(path);
    res.json(listResult);
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}

export async function removeFile(req, res) {
  try {
    const path = req.query.path ?? "";
    const name = req.query.name;
    await FilesUseCase.removeFile(path, name, req.user?.username || "admin");
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message || "Bad request" });
  }
}
