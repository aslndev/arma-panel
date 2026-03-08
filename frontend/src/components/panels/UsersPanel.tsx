import { useState, useEffect } from "react";
import { UserPlus, Trash2, Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { usersApi } from "@/api/endpoints";

interface User {
  id: string;
  email: string;
  role: "owner" | "admin" | "subuser";
  permissions: string[];
  addedAt: string;
}

const PERM_OPTIONS = ["console", "start", "stop", "restart", "files", "backups", "users", "schedules"];

const roleConfig: Record<string, { icon: typeof Shield; color: string; label: string }> = {
  owner: { icon: ShieldAlert, color: "text-warning", label: "Owner" },
  admin: { icon: ShieldCheck, color: "text-primary", label: "Admin" },
  subuser: { icon: Shield, color: "text-muted-foreground", label: "Sub User" },
};

const UsersPanel = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "subuser">("subuser");
  const [invitePerms, setInvitePerms] = useState<string[]>([]);

  const fetchUsers = async () => {
    try {
      const list = await usersApi.list();
      setUsers(list as User[]);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    try {
      await usersApi.invite({
        email: inviteEmail.trim(),
        role: inviteRole,
        permissions: invitePerms.length > 0 ? invitePerms : ["console"],
      });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("subuser");
      setInvitePerms([]);
      toast.success("Invitation sent to " + inviteEmail.trim());
      fetchUsers();
    } catch (e) {
      toast.error((e as Error).message || "Failed to invite");
    }
  };

  const handleDelete = async (user: User) => {
    try {
      await usersApi.remove(user.id);
      setDeleteTarget(null);
      toast.success("User removed");
      fetchUsers();
    } catch {
      toast.error("Failed to remove user");
    }
  };

  const togglePerm = (perm: string) => {
    setInvitePerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  if (loading) {
    return <div className="text-muted-foreground text-sm">Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Users</h2>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-1" /> Invite User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "subuser")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subuser">Sub User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="flex flex-wrap gap-3">
                  {PERM_OPTIONS.map((perm) => (
                    <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={invitePerms.includes(perm)}
                        onCheckedChange={() => togglePerm(perm)}
                      />
                      {perm}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite}>Send Invitation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_1fr_100px_60px] gap-4 px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div>Email</div>
          <div>Role</div>
          <div>Permissions</div>
          <div>Added</div>
          <div />
        </div>

        {users.map((user) => {
          const role = roleConfig[user.role] || roleConfig.subuser;
          const RoleIcon = role.icon;
          return (
            <div
              key={user.id}
              className="grid grid-cols-[1fr_120px_1fr_100px_60px] gap-4 px-4 py-3 border-b border-border text-sm items-center hover:bg-accent/50 transition-colors"
            >
              <div className="text-foreground font-mono text-xs">{user.email}</div>
              <div className="flex items-center gap-1.5">
                <RoleIcon className={`h-4 w-4 ${role.color}`} />
                <span className="text-foreground text-xs">{role.label}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {user.permissions.map((perm) => (
                  <Badge key={perm} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {perm}
                  </Badge>
                ))}
              </div>
              <div className="text-muted-foreground text-xs">{user.addedAt}</div>
              <div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(user)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>User <strong>{deleteTarget.email}</strong> will be removed and will no longer have access to the panel. This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersPanel;
