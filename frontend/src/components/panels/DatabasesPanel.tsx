import { useState, useEffect } from "react";
import { Database, Plus, Trash2, Eye, EyeOff, Copy } from "lucide-react";
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
import { databasesApi } from "@/api/endpoints";

interface DbItem {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  connections: number;
  maxConnections: number;
}

const DatabasesPanel = () => {
  const [dbs, setDbs] = useState<DbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DbItem | null>(null);
  const [newName, setNewName] = useState("");

  const fetchDbs = async () => {
    try {
      const list = await databasesApi.list();
      setDbs(list);
    } catch {
      toast.error("Failed to load databases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDbs();
  }, []);

  const togglePassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("Database name is required");
      return;
    }
    try {
      await databasesApi.create({ name: newName.trim() });
      setAddOpen(false);
      setNewName("");
      toast.success("Database created");
      fetchDbs();
    } catch (e) {
      toast.error((e as Error).message || "Failed to create database");
    }
  };

  const handleDelete = async (db: DbItem) => {
    try {
      await databasesApi.remove(db.id);
      setDeleteTarget(null);
      toast.success("Database removed");
      fetchDbs();
    } catch {
      toast.error("Failed to remove database");
    }
  };

  if (loading) {
    return <div className="text-muted-foreground text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Databases</h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Database
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Database</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Database name</Label>
                <Input
                  placeholder="database_name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {dbs.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No databases yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dbs.map((db) => (
            <div key={db.id} className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">{db.name}</span>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteTarget(db)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Host</p>
                  <p className="text-foreground font-mono">{db.host}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Port</p>
                  <p className="text-foreground font-mono">{db.port}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Username</p>
                  <div className="flex items-center gap-1">
                    <p className="text-foreground font-mono">{db.username}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(db.username);
                        toast.success("Copied!");
                      }}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Password</p>
                  <div className="flex items-center gap-1">
                    <p className="text-foreground font-mono">
                      {showPasswords[db.id] ? db.password : "••••••••"}
                    </p>
                    <button
                      onClick={() => togglePassword(db.id)}
                      className="text-muted-foreground hover:text-primary"
                    >
                      {showPasswords[db.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Connections: {db.connections} / {db.maxConnections}
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete database?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>Database <strong>{deleteTarget.name}</strong> and all its data will be deleted. This action cannot be undone.</>
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

export default DatabasesPanel;
