import { useState, useEffect } from "react";
import { Globe, Plus, Trash2, Copy } from "lucide-react";
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
import { allocationsApi } from "@/api/endpoints";

interface Allocation {
  id: string;
  ip: string;
  port: number;
  alias: string;
  primary: boolean;
}

const NetworkPanel = () => {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Allocation | null>(null);
  const [newIp, setNewIp] = useState("0.0.0.0");
  const [newPort, setNewPort] = useState("2489");
  const [newAlias, setNewAlias] = useState("");

  const fetchAllocations = async () => {
    try {
      const list = await allocationsApi.list();
      setAllocations(list);
    } catch {
      toast.error("Failed to load allocations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, []);

  const copyAddress = (ip: string, port: number) => {
    navigator.clipboard.writeText(`${ip}:${port}`);
    toast.success("Address copied!");
  };

  const handleAdd = async () => {
    const port = parseInt(newPort, 10);
    if (!newIp.trim() || isNaN(port) || port < 1 || port > 65535) {
      toast.error("IP and port must be valid");
      return;
    }
    try {
      await allocationsApi.add({
        ip: newIp.trim(),
        port,
        alias: newAlias.trim() || undefined,
      });
      setAddOpen(false);
      setNewIp("0.0.0.0");
      setNewPort("2489");
      setNewAlias("");
      toast.success("Allocation added");
      fetchAllocations();
    } catch (e) {
      toast.error((e as Error).message || "Failed to add allocation");
    }
  };

  const handleDelete = async (alloc: Allocation) => {
    try {
      await allocationsApi.remove(alloc.id);
      setDeleteTarget(null);
      toast.success("Allocation removed");
      fetchAllocations();
    } catch (e) {
      toast.error((e as Error).message || "Failed to remove allocation");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Network Allocations</h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Allocation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add allocation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>IP Address</Label>
                <Input value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="0.0.0.0" />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input type="number" min={1} max={65535} value={newPort} onChange={(e) => setNewPort(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Alias (optional)</Label>
                <Input value={newAlias} onChange={(e) => setNewAlias(e.target.value)} placeholder="Game Port" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading...</div>
      ) : (
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_1fr_80px_60px] gap-4 px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div>IP Address</div>
          <div>Port</div>
          <div>Alias</div>
          <div>Primary</div>
          <div />
        </div>

        {allocations.map((alloc) => (
          <div key={alloc.id} className="grid grid-cols-[1fr_100px_1fr_80px_60px] gap-4 px-4 py-3 border-b border-border text-sm items-center hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-foreground font-mono">{alloc.ip}</span>
            </div>
            <span className="text-foreground font-mono">{alloc.port}</span>
            <span className="text-muted-foreground">{alloc.alias}</span>
            <span>
              {alloc.primary && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Primary</span>
              )}
            </span>
            <div className="flex gap-1">
              <button
                className="p-1 text-muted-foreground hover:text-primary"
                onClick={() => copyAddress(alloc.ip, alloc.port)}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {!alloc.primary && (
                <button
                  className="p-1 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(alloc)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete allocation?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>{deleteTarget.alias || `${deleteTarget.ip}:${deleteTarget.port}`} will be removed.</>
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

export default NetworkPanel;
