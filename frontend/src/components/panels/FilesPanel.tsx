import { useState, useEffect, useRef } from "react";
import { Folder, File, ChevronRight, Upload, Plus, Download, Trash2, Edit, ArrowUp, Archive, FileArchive, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { filesApi } from "@/api/endpoints";
import { useServerSettings } from "@/contexts/ServerSettingsContext";

interface FileItem {
  id: string;
  path: string;
  name: string;
  type: string;
  size: string | null;
  modified: string;
  mode?: string;
}

/** Relative path from pathStack segments (root = ""). */
const pathFromStack = (stack: string[]) => stack.filter(Boolean).join("/");

const getDefaultContent = (name: string): string => {
  if (name === "server.json") return '{\n  "name": "Arma Reforger Server",\n  "maxPlayers": 64\n}';
  if (name === "launch.cfg") return "// Server launch config\nport 2001";
  if (name === "banned.txt") return "# Banned players list\n# One ID per line";
  if (name === "whitelist.txt") return "# Whitelist\n# Steam ID or name per line";
  if (name === "startup.sh") return "#!/bin/bash\n./ArmaReforgerServer";
  return "";
};

const FilesPanel = () => {
  const { serverFolder } = useServerSettings();
  const [pathStack, setPathStack] = useState<string[]>([""]);
  const [itemsHere, setItemsHere] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
  const [editTarget, setEditTarget] = useState<FileItem | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editName, setEditName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [zipOpen, setZipOpen] = useState(false);
  const [zipName, setZipName] = useState("archive.zip");
  const [chmodTarget, setChmodTarget] = useState<FileItem | null>(null);
  const [chmodMode, setChmodMode] = useState("644");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentDir = pathFromStack(pathStack);
  const displayPath = serverFolder + (currentDir ? "/" + currentDir : "");

  const fetchList = async (relativePath: string) => {
    try {
      const list = await filesApi.list(relativePath);
      setItemsHere(list);
    } catch {
      toast.error("Failed to load files");
      setItemsHere([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchList(currentDir);
  }, [currentDir]);

  const toggleSelect = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const goUp = () => {
    if (pathStack.length <= 1) {
      toast.info("Already at root");
      return;
    }
    setPathStack((prev) => prev.slice(0, -1));
  };

  const goInto = (name: string) => {
    const item = itemsHere.find((f) => f.name === name && f.type === "folder");
    if (!item) return;
    setPathStack((prev) => [...prev, name]);
  };

  const handleDownload = async (item: FileItem) => {
    if (item.type === "folder") return;
    try {
      await filesApi.download(currentDir, item.name);
      toast.success(`Downloaded ${item.name}`);
    } catch (e) {
      toast.error((e as Error).message || "Download failed");
    }
  };

  const handleZip = async () => {
    if (selected.length === 0) {
      toast.error("Select at least one file or folder");
      return;
    }
    const name = zipName.trim() || "archive.zip";
    const outName = name.endsWith(".zip") ? name : name + ".zip";
    try {
      await filesApi.zip(currentDir, selected, outName);
      setZipOpen(false);
      setZipName("archive.zip");
      setSelected([]);
      toast.success(`Created ${outName}`);
      fetchList(currentDir);
    } catch (e) {
      toast.error((e as Error).message || "Zip failed");
    }
  };

  const handleUnzip = async (item: FileItem) => {
    if (item.type !== "file" || !item.name.toLowerCase().endsWith(".zip")) return;
    try {
      await filesApi.unzip(currentDir, item.name);
      toast.success(`Extracted ${item.name}`);
      fetchList(currentDir);
    } catch (e) {
      toast.error((e as Error).message || "Unzip failed");
    }
  };

  const handleChmod = async () => {
    if (!chmodTarget) return;
    const mode = chmodMode.replace(/\D/g, "");
    if (!mode || mode.length > 4) {
      toast.error("Use octal digits (e.g. 755, 644)");
      return;
    }
    const octal = mode.length <= 3 ? mode.padStart(3, "0") : mode;
    try {
      await filesApi.chmod(currentDir, chmodTarget.name, octal);
      setChmodTarget(null);
      setChmodMode("644");
      toast.success(`Permissions set to ${octal}`);
      fetchList(currentDir);
    } catch (e) {
      toast.error((e as Error).message || "Failed to set permissions");
    }
  };

  const handleNewFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Folder name is required");
      return;
    }
    if (itemsHere.some((f) => f.name === newFolderName.trim())) {
      toast.error("A folder with that name already exists");
      return;
    }
    try {
      await filesApi.createFolder(currentDir, newFolderName.trim());
      setNewFolderOpen(false);
      setNewFolderName("");
      toast.success("Folder created");
      fetchList(currentDir);
    } catch (e) {
      toast.error((e as Error).message || "Failed to create folder");
    }
  };

  const handleUpload = async () => {
    const input = fileInputRef.current;
    if (!input?.files?.length) {
      toast.error("Please select a file first");
      return;
    }
    const file = input.files[0];
    try {
      await filesApi.uploadFile(currentDir, file);
    } catch (e) {
      toast.error((e as Error).message || "Upload failed");
      return;
    }
    input.value = "";
    setUploadOpen(false);
    toast.success(`File "${file.name}" uploaded`);
    fetchList(currentDir);
  };

  const handleDelete = async (item: FileItem) => {
    try {
      await filesApi.remove(currentDir, item.name);
      setDeleteTarget(null);
      toast.success(item.type === "folder" ? "Folder deleted" : "File deleted");
      fetchList(currentDir);
    } catch (e) {
      toast.error((e as Error).message || "Failed to delete");
    }
  };

  const openEdit = async (item: FileItem) => {
    setEditTarget(item);
    if (item.type === "file") {
      try {
        const data = await filesApi.getContent(currentDir, item.name);
        setEditContent(data.content ?? getDefaultContent(item.name));
      } catch {
        setEditContent(getDefaultContent(item.name));
      }
      setEditName("");
    } else {
      setEditName(item.name);
      setEditContent("");
    }
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    try {
      if (editTarget.type === "folder") {
        const name = editName.trim();
        if (!name) {
          toast.error("Folder name is required");
          return;
        }
        if (name !== editTarget.name && itemsHere.some((f) => f.name === name)) {
          toast.error("A folder with that name already exists");
          return;
        }
        await filesApi.update(currentDir, editTarget.name, { newName: name });
        toast.success("Folder renamed");
      } else {
        await filesApi.update(currentDir, editTarget.name, { content: editContent });
        toast.success("File saved");
      }
      setEditTarget(null);
      fetchList(currentDir);
    } catch (e) {
      toast.error((e as Error).message || "Failed to save");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono bg-card border border-border rounded-lg px-3 py-2">
          <Folder className="h-4 w-4 text-primary" />
          <span>{displayPath || serverFolder}</span>
        </div>
        <div className="flex gap-2">
          {selected.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => { setZipName("archive.zip"); setZipOpen(true); }}>
              <Archive className="h-4 w-4 mr-1" /> Zip ({selected.length})
            </Button>
          )}
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary">
                <Upload className="h-4 w-4 mr-1" /> Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload file</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-primary-foreground"
                  onChange={() => {}}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
                <Button onClick={handleUpload}>Upload</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary">
                <Plus className="h-4 w-4 mr-1" /> New Folder
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Folder name</Label>
                  <Input
                    placeholder="folder_name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
                <Button onClick={handleNewFolder}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_80px_100px_140px_120px] gap-4 px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="w-5" />
          <div>Name</div>
          <div>Size</div>
          <div>Modified</div>
          <div>Permissions</div>
          <div>Actions</div>
        </div>

        <button
          className="w-full grid grid-cols-[auto_1fr_80px_100px_140px_120px] gap-4 px-4 py-2.5 border-b border-border text-sm hover:bg-accent/50 transition-colors text-left"
          onClick={goUp}
        >
          <ArrowUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">..</span>
          <span /><span /><span /><span />
        </button>

        {loading ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : (
          itemsHere.map((file) => (
            <div
              key={`${file.path}-${file.name}`}
              className={`grid grid-cols-[auto_1fr_80px_100px_140px_120px] gap-4 px-4 py-2.5 border-b border-border text-sm hover:bg-accent/50 transition-colors cursor-pointer items-center ${
                selected.includes(file.name) ? "bg-primary/10" : ""
              }`}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("button, [role='checkbox']")) return;
                if (file.type === "folder") goInto(file.name);
                else toggleSelect(file.name);
              }}
            >
              <div className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={selected.includes(file.name)}
                  onChange={() => toggleSelect(file.name)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-border"
                />
                {file.type === "folder" ? (
                  <Folder className="h-4 w-4 text-primary" />
                ) : (
                  <File className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="text-foreground flex items-center gap-1 min-w-0">
                {file.name}
                {file.type === "folder" && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
              <div className="text-muted-foreground">{file.size || "—"}</div>
              <div className="text-muted-foreground">{file.modified}</div>
              <div className="text-muted-foreground font-mono text-xs">{file.mode ?? "—"}</div>
              <div className="flex gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {file.type === "file" && (
                  <button
                    className="p-1 hover:text-primary transition-colors text-muted-foreground"
                    title="Download"
                    onClick={() => handleDownload(file)}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
                {file.type === "file" && file.name.toLowerCase().endsWith(".zip") && (
                  <button
                    className="p-1 hover:text-primary transition-colors text-muted-foreground"
                    title="Unzip"
                    onClick={() => handleUnzip(file)}
                  >
                    <FileArchive className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  className="p-1 hover:text-primary transition-colors text-muted-foreground"
                  title={file.type === "folder" ? "Rename" : "Edit"}
                  onClick={() => openEdit(file)}
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  className="p-1 hover:text-primary transition-colors text-muted-foreground"
                  title="Set permission"
                  onClick={() => { setChmodTarget(file); setChmodMode(file.mode || "644"); }}
                >
                  <Lock className="h-3.5 w-3.5" />
                </button>
                <button
                  className="p-1 hover:text-destructive transition-colors text-muted-foreground"
                  title="Delete"
                  onClick={() => setDeleteTarget(file)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={zipOpen} onOpenChange={setZipOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create zip archive</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Archive name</Label>
            <Input
              value={zipName}
              onChange={(e) => setZipName(e.target.value)}
              placeholder="archive.zip"
            />
            <p className="text-xs text-muted-foreground">Selected: {selected.join(", ")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZipOpen(false)}>Cancel</Button>
            <Button onClick={handleZip}>Create zip</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!chmodTarget} onOpenChange={(open) => !open && setChmodTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set permissions</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Octal mode (e.g. 755, 644)</Label>
            <Input
              value={chmodMode}
              onChange={(e) => setChmodMode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="644"
            />
            {chmodTarget && <p className="text-xs text-muted-foreground">{chmodTarget.name}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChmodTarget(null)}>Cancel</Button>
            <Button onClick={handleChmod}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editTarget?.type === "folder" ? "Rename folder" : `Edit file — ${editTarget?.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col gap-4 py-2">
            {editTarget?.type === "folder" ? (
              <div className="space-y-2">
                <Label>Folder name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="folder_name"
                />
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col gap-2">
                <Label>File content</Label>
                <Textarea
                  className="min-h-[300px] font-mono text-sm resize-y"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Type file content..."
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTarget?.type === "folder" ? "Delete folder?" : "Delete file?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  {deleteTarget.type === "folder"
                    ? `Folder "${deleteTarget.name}" and all its contents will be deleted.`
                    : `File "${deleteTarget.name}" will be deleted.`}{" "}
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FilesPanel;
