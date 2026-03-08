import { useState, useEffect } from "react";
import { Archive, Plus, Download, Trash2, RotateCcw, Lock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
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
import { backupsApi } from "@/api/endpoints";

interface Backup {
  id: string;
  name: string;
  size: string;
  createdAt: string;
  locked: boolean;
  status: "completed" | "in_progress";
}

const maxBackups = 10;

const BackupsPanel = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [backupName, setBackupName] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null);

  const fetchBackups = async () => {
    try {
      const list = await backupsApi.list();
      setBackups(list);
    } catch {
      toast.error("Failed to load backups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreate = async () => {
    try {
      await backupsApi.create(backupName.trim() ? { name: backupName.trim() } : undefined);
      setCreateOpen(false);
      setBackupName("");
      toast.success("Backup created");
      fetchBackups();
    } catch (e) {
      toast.error((e as Error).message || "Failed to create backup");
    }
  };

  const handleRestore = async (backup: Backup) => {
    try {
      await backupsApi.restore(backup.id);
      setRestoreTarget(null);
      toast.success(`Restore "${backup.name}" started. Server will restart.`);
    } catch (e) {
      toast.error((e as Error).message || "Restore failed");
    }
  };

  const handleDownload = (backup: Backup) => {
    toast.success(`Download "${backup.name}" started...`);
  };

  const handleDelete = async (backup: Backup) => {
    if (backup.locked) {
      toast.error("Cannot delete locked backup");
      return;
    }
    try {
      await backupsApi.remove(backup.id);
      setDeleteTarget(null);
      toast.success("Backup deleted");
      fetchBackups();
    } catch (e) {
      toast.error((e as Error).message || "Failed to delete backup");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Backups</h2>
          <p className="text-xs text-muted-foreground">{backups.length} / {maxBackups} backup slots used</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Create Backup
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create backup</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name (optional)</Label>
                <Input
                  placeholder="manual-backup-1"
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create backup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Progress value={(backups.length / maxBackups) * 100} className="h-2" />

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading...</div>
      ) : (
      <div className="space-y-2">
        {backups.map((backup) => (
          <div key={backup.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <Archive className="h-5 w-5 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{backup.name}</p>
                  {backup.locked && <Lock className="h-3 w-3 text-warning" />}
                  {backup.status === "completed" && <CheckCircle className="h-3 w-3 text-success" />}
                </div>
                <p className="text-xs text-muted-foreground">{backup.createdAt} · {backup.size}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={() => setRestoreTarget(backup)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={() => handleDownload(backup)}
              >
                <Download className="h-4 w-4" />
              </Button>
              {!backup.locked && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(backup)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      <AlertDialog open={!!restoreTarget} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore backup?</AlertDialogTitle>
            <AlertDialogDescription>
              {restoreTarget && (
                <>The server will restart and data will be replaced with backup <strong>{restoreTarget.name}</strong>. Are you sure?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => restoreTarget && handleRestore(restoreTarget)}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete backup?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && <>Backup <strong>{deleteTarget.name}</strong> will be permanently deleted.</>}
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

export default BackupsPanel;
