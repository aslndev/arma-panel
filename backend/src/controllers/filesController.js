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
    const content = req.file ? req.file.buffer?.toString("utf8") : req.body?.content;
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
