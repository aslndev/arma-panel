import { useState, useEffect } from "react";
import { Clock, Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { schedulesApi } from "@/api/endpoints";

interface Schedule {
  id: string;
  name: string;
  cron: string;
  action: string;
  enabled: boolean;
  lastRun: string;
  nextRun: string;
}

const formatNextRun = (cron: string) => {
  const next = new Date(Date.now() + 60 * 60 * 1000);
  return next.toISOString().slice(0, 16).replace("T", " ");
};

const SchedulesPanel = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);
  const [formName, setFormName] = useState("");
  const [formCron, setFormCron] = useState("0 * * * *");
  const [formAction, setFormAction] = useState("restart");

  const fetchSchedules = async () => {
    try {
      const list = await schedulesApi.list();
      setSchedules(list);
    } catch {
      toast.error("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const toggleSchedule = async (id: string) => {
    const s = schedules.find((x) => x.id === id);
    if (!s) return;
    try {
      await schedulesApi.update(id, { ...s, enabled: !s.enabled });
      toast.success("Schedule updated");
      fetchSchedules();
    } catch {
      toast.error("Failed to update schedule");
    }
  };

  const handleAdd = async () => {
    if (!formName.trim()) {
      toast.error("Schedule name is required");
      return;
    }
    try {
      await schedulesApi.create({ name: formName.trim(), cron: formCron, action: formAction });
      setAddOpen(false);
      setFormName("");
      setFormCron("0 * * * *");
      setFormAction("restart");
      toast.success("Schedule created");
      fetchSchedules();
    } catch (e) {
      toast.error((e as Error).message || "Failed to create schedule");
    }
  };

  const openEdit = (s: Schedule) => {
    setEditSchedule(s);
    setFormName(s.name);
    setFormCron(s.cron);
    setFormAction(s.action);
  };

  const handleEdit = async () => {
    if (!editSchedule || !formName.trim()) return;
    try {
      await schedulesApi.update(editSchedule.id, {
        name: formName.trim(),
        cron: formCron,
        action: formAction,
        enabled: editSchedule.enabled,
      });
      setEditSchedule(null);
      toast.success("Schedule updated");
      fetchSchedules();
    } catch {
      toast.error("Failed to update schedule");
    }
  };

  const handleDelete = async (s: Schedule) => {
    try {
      await schedulesApi.remove(s.id);
      setDeleteTarget(null);
      toast.success("Schedule removed");
      fetchSchedules();
    } catch {
      toast.error("Failed to remove schedule");
    }
  };

  if (loading) {
    return <div className="text-muted-foreground text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Schedules</h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Schedule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="Auto Restart" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cron expression</Label>
                <Input placeholder="0 */6 * * *" value={formCron} onChange={(e) => setFormCron(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={formAction} onValueChange={setFormAction}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restart">Restart</SelectItem>
                    <SelectItem value="backup">Backup</SelectItem>
                    <SelectItem value="command">Command</SelectItem>
                    <SelectItem value="start">Start</SelectItem>
                    <SelectItem value="stop">Stop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {schedules.map((schedule) => (
          <div
            key={schedule.id}
            className={`rounded-lg border border-border bg-card p-4 transition-opacity ${
              !schedule.enabled ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">{schedule.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{schedule.cron}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={schedule.enabled}
                  onCheckedChange={() => toggleSchedule(schedule.id)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => openEdit(schedule)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(schedule)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Action:</span>{" "}
                <span className="text-foreground capitalize">{schedule.action}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last run:</span>{" "}
                <span className="text-foreground">{schedule.lastRun}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Next run:</span>{" "}
                <span className="text-foreground">{schedule.nextRun}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editSchedule} onOpenChange={(open) => !open && setEditSchedule(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cron expression</Label>
              <Input value={formCron} onChange={(e) => setFormCron(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={formAction} onValueChange={setFormAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="restart">Restart</SelectItem>
                  <SelectItem value="backup">Backup</SelectItem>
                  <SelectItem value="command">Command</SelectItem>
                  <SelectItem value="start">Start</SelectItem>
                  <SelectItem value="stop">Stop</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSchedule(null)}>Cancel</Button>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && <>Schedule <strong>{deleteTarget.name}</strong> will be permanently removed.</>}
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

export default SchedulesPanel;
