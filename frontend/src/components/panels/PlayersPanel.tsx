import { useState, useEffect, useCallback } from "react";
import { RefreshCw, UserX, Ban, ShieldOff } from "lucide-react";
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
import { playersApi, type ServerPlayer } from "@/api/endpoints";
import { useConsoleWs } from "@/contexts/ConsoleWsContext";

type TabId = "online" | "bans";

const PlayersPanel = () => {
  const { players: wsPlayers, playersError, subscribePlayers, unsubscribePlayers, connected } = useConsoleWs();
  const [tab, setTab] = useState<TabId>("online");
  const [bans, setBans] = useState<{ identityId: string; detail: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [kickTarget, setKickTarget] = useState<ServerPlayer | null>(null);
  const [kickReason, setKickReason] = useState("");
  const [banTarget, setBanTarget] = useState<ServerPlayer | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("0");
  const [unbanTarget, setUnbanTarget] = useState<{ identityId: string; detail: string } | null>(null);

  const players = tab === "online" ? (wsPlayers ?? []) : [];

  const fetchBans = useCallback(async () => {
    try {
      const res = await playersApi.banList(1);
      setBans(res.bans ?? []);
    } catch (e) {
      toast.error((e as Error).message || "Failed to load ban list.");
      setBans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "online") {
      subscribePlayers();
      setLoading(false);
    } else {
      unsubscribePlayers();
      setLoading(true);
      fetchBans();
    }
  }, [tab, subscribePlayers, unsubscribePlayers, fetchBans]);

  useEffect(() => {
    return () => unsubscribePlayers();
  }, [unsubscribePlayers]);

  const handleRefresh = () => {
    if (tab === "bans") {
      setLoading(true);
      fetchBans();
    }
  };

  const handleKick = async () => {
    if (!kickTarget) return;
    try {
      await playersApi.kick(kickTarget.identityId, kickReason.trim() || undefined);
      toast.success(`Kicked ${kickTarget.name || kickTarget.identityId}`);
      setKickTarget(null);
      setKickReason("");
    } catch (e) {
      toast.error((e as Error).message || "Kick failed");
    }
  };

  const handleBan = async () => {
    if (!banTarget) return;
    const duration = Math.max(0, parseInt(banDuration, 10) || 0);
    try {
      await playersApi.ban(banTarget.identityId, banReason.trim() || undefined, duration);
      toast.success(`Banned ${banTarget.name || banTarget.identityId}`);
      setBanTarget(null);
      setBanReason("");
      setBanDuration("0");
      fetchBans();
    } catch (e) {
      toast.error((e as Error).message || "Ban failed");
    }
  };

  const handleUnban = async () => {
    if (!unbanTarget) return;
    try {
      await playersApi.unban(unbanTarget.identityId);
      toast.success(`Unbanned ${unbanTarget.identityId}`);
      setUnbanTarget(null);
      fetchBans();
    } catch (e) {
      toast.error((e as Error).message || "Unban failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 border border-border rounded-md p-0.5 bg-muted/30">
          <button
            onClick={() => setTab("online")}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              tab === "online"
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Online
          </button>
          <button
            onClick={() => setTab("bans")}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              tab === "bans"
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Bans
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {tab === "online" && (
        <div className="rounded-lg border border-border overflow-hidden">
          {!connected ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Connecting…</div>
          ) : wsPlayers === null ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading players…</div>
          ) : playersError ? (
            <div className="p-8 space-y-2">
              <p className="text-center text-destructive font-medium text-sm">RCON error</p>
              <p className="text-center text-muted-foreground text-sm break-all px-4">{playersError}</p>
              <p className="text-center text-muted-foreground text-xs mt-4">
                Check Config Editor → RCON: address (use 127.0.0.1 if panel and server are on the same machine), port (e.g. 19999), and password. Panel uses BattleEye RCON (UDP).
              </p>
            </div>
          ) : players.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No players online. Server is reachable via RCON; list is empty.
            </div>
          ) : (
            <div className="divide-y divide-border">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-4 py-2.5 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div>Player / ID</div>
                <div>Name</div>
                <div className="text-right">Actions</div>
              </div>
              {players.map((p) => (
                <div
                  key={p.identityId}
                  className="grid grid-cols-[1fr_1fr_auto] gap-4 px-4 py-3 items-center text-sm hover:bg-accent/30 transition-colors"
                >
                  <span className="font-mono text-foreground">{p.identityId}</span>
                  <span className="text-foreground truncate">{p.name || "—"}</span>
                  <div className="flex gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-destructive border-destructive/50 hover:bg-destructive/10"
                      onClick={() => setKickTarget(p)}
                    >
                      <UserX className="h-3.5 w-3.5 mr-1" />
                      Kick
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-amber-600 border-amber-600/50 hover:bg-amber-600/10"
                      onClick={() => setBanTarget(p)}
                    >
                      <Ban className="h-3.5 w-3.5 mr-1" />
                      Ban
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "bans" && (
        <div className="rounded-lg border border-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading ban list…</div>
          ) : bans.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No bans in list.</div>
          ) : (
            <div className="divide-y divide-border">
              <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2.5 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div>Identity / Detail</div>
                <div className="text-right">Actions</div>
              </div>
              {bans.map((b) => (
                <div
                  key={b.identityId}
                  className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 items-center text-sm hover:bg-accent/30 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-foreground">{b.identityId}</span>
                    {b.detail !== b.identityId && (
                      <span className="text-muted-foreground text-xs ml-2 truncate block">{b.detail}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => setUnbanTarget(b)}
                  >
                    <ShieldOff className="h-3.5 w-3.5 mr-1" />
                    Unban
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!kickTarget} onOpenChange={(o) => !o && setKickTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kick player</DialogTitle>
          </DialogHeader>
          {kickTarget && (
            <p className="text-sm text-muted-foreground">
              {kickTarget.name || kickTarget.identityId} ({kickTarget.identityId})
            </p>
            )}
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Input
              value={kickReason}
              onChange={(e) => setKickReason(e.target.value)}
              placeholder="e.g. AFK"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKickTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleKick}>Kick</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!banTarget} onOpenChange={(o) => !o && setBanTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ban player</DialogTitle>
          </DialogHeader>
          {banTarget && (
            <p className="text-sm text-muted-foreground">
              {banTarget.name || banTarget.identityId} ({banTarget.identityId})
            </p>
            )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="e.g. Griefing"
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (seconds). 0 = permanent</Label>
              <Input
                type="number"
                min={0}
                value={banDuration}
                onChange={(e) => setBanDuration(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBan}>Ban</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!unbanTarget} onOpenChange={(o) => !o && setUnbanTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unban player</AlertDialogTitle>
            <AlertDialogDescription>
              {unbanTarget && (
                <>Remove ban for <strong>{unbanTarget.identityId}</strong>?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnban}>Unban</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlayersPanel;
