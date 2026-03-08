import { useState, useEffect } from "react";
import { UserPlus, Trash2, Shield, ShieldCheck, ShieldAlert, Pencil } from "lucide-react";
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
import { usersApi, type PanelUser } from "@/api/endpoints";
import { useAuth } from "@/contexts/AuthContext";

const PERM_OPTIONS = ["console", "start", "stop", "restart", "files", "backups", "users", "schedules"];

const roleConfig: Record<string, { icon: typeof Shield; color: string; label: string }> = {
  owner: { icon: ShieldAlert, color: "text-amber-500", label: "Owner" },
  admin: { icon: ShieldCheck, color: "text-primary", label: "Admin" },
  subuser: { icon: Shield, color: "text-muted-foreground", label: "Sub User" },
};

const formatDate = (s: string) => {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return s;
  }
};

const UsersPanel = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<PanelUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PanelUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PanelUser | null>(null);

  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "subuser">("subuser");
  const [addPerms, setAddPerms] = useState<string[]>([]);

  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<string>("subuser");
  const [editPerms, setEditPerms] = useState<string[]>([]);

  const fetchUsers = async () => {
    try {
      const list = await usersApi.list();
      setUsers(list);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = async () => {
    const username = addUsername.trim();
    if (!username) {
      toast.error("Username is required");
      return;
    }
    if (!addPassword) {
      toast.error("Password is required");
      return;
    }
    try {
      await usersApi.create({
        username,
        password: addPassword,
        role: addRole,
        permissions: addPerms.length > 0 ? addPerms : ["console"],
      });
      setAddOpen(false);
      setAddUsername("");
      setAddPassword("");
      setAddRole("subuser");
      setAddPerms([]);
      toast.success("User created");
      fetchUsers();
    } catch (e) {
      toast.error((e as Error).message || "Failed to create user");
    }
  };

  const openEdit = (u: PanelUser) => {
    setEditTarget(u);
    setEditUsername(u.username);
    setEditPassword("");
    setEditRole(u.role || "subuser");
    setEditPerms(Array.isArray(u.permissions) ? [...u.permissions] : []);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    try {
      const payload: { username?: string; password?: string; role?: string; permissions?: string[] } = {
        username: editUsername.trim() || undefined,
        role: editRole,
        permissions: editPerms,
      };
      if (editPassword) payload.password = editPassword;
      await usersApi.update(editTarget.id, payload);
      setEditTarget(null);
      toast.success("User updated");
      fetchUsers();
    } catch (e) {
      toast.error((e as Error).message || "Failed to update user");
    }
  };

  const handleDelete = async (user: PanelUser) => {
    try {
      await usersApi.remove(user.id);
      setDeleteTarget(null);
      toast.success("User removed");
      fetchUsers();
    } catch (e) {
      toast.error((e as Error).message || "Failed to remove user");
    }
  };

  const toggleAddPerm = (perm: string) => {
    setAddPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const toggleEditPerm = (perm: string) => {
    setEditPerms((prev) =>
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
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-1" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  placeholder="username"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={addRole} onValueChange={(v) => setAddRole(v as "admin" | "subuser")}>
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
                        checked={addPerms.includes(perm)}
                        onCheckedChange={() => toggleAddPerm(perm)}
                      />
                      {perm}
                    </label>
                  ))}
                </div>
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

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_1fr_90px_80px] gap-4 px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div>Username</div>
          <div>Role</div>
          <div>Permissions</div>
          <div>Created</div>
          <div />
        </div>

        {users.map((u) => {
          const role = roleConfig[u.role] || roleConfig.subuser;
          const RoleIcon = role.icon;
          const isSelf = currentUser != null && String(currentUser.id) === String(u.id);
          return (
            <div
              key={u.id}
              className="grid grid-cols-[1fr_100px_1fr_90px_80px] gap-4 px-4 py-3 border-b border-border text-sm items-center hover:bg-accent/50 transition-colors"
            >
              <div className="text-foreground font-mono text-xs">{u.username}</div>
              <div className="flex items-center gap-1.5">
                <RoleIcon className={`h-4 w-4 ${role.color}`} />
                <span className="text-foreground text-xs capitalize">{role.label}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(u.permissions || []).map((perm) => (
                  <Badge key={perm} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {perm}
                  </Badge>
                ))}
              </div>
              <div className="text-muted-foreground text-xs">{formatDate(u.createdAt)}</div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  onClick={() => openEdit(u)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(u)}
                  disabled={isSelf}
                  title={isSelf ? "Cannot remove yourself" : "Remove user"}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                placeholder="username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>New password (leave blank to keep)</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subuser">Sub User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="flex flex-wrap gap-3">
                {PERM_OPTIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={editPerms.includes(perm)}
                      onCheckedChange={() => toggleEditPerm(perm)}
                    />
                    {perm}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  User <strong>{deleteTarget.username}</strong> will be removed and will no longer
                  have access to the panel. This action cannot be undone.
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
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersPanel;
