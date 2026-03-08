import { Play, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { serverApi } from "@/api/endpoints";
import { useServerSettings } from "@/contexts/ServerSettingsContext";

const POLL_MS = 5000;

const ServerHeader = () => {
  const { panelName } = useServerSettings();
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState<"start" | "stop" | "restart" | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const summary = await serverApi.summary();
      setRunning(summary.running ?? false);
    } catch {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    const t = setInterval(refreshStatus, POLL_MS);
    return () => clearInterval(t);
  }, [refreshStatus]);

  const handleStart = async () => {
    setLoading("start");
    try {
      await serverApi.start();
      toast.success("Server started.");
      await refreshStatus();
    } catch (e) {
      toast.error((e as Error).message || "Failed to start server");
    } finally {
      setLoading(null);
    }
  };

  const handleRestart = async () => {
    setLoading("restart");
    try {
      await serverApi.restart();
      toast.success("Server restarted.");
      await refreshStatus();
    } catch (e) {
      toast.error((e as Error).message || "Failed to restart server");
    } finally {
      setLoading(null);
    }
  };

  const handleStop = async () => {
    setLoading("stop");
    try {
      await serverApi.stop();
      toast.success("Server stopped.");
      await refreshStatus();
    } catch (e) {
      toast.error((e as Error).message || "Failed to stop server");
    } finally {
      setLoading(null);
    }
  };

  const statusLabel = loading
    ? loading === "start"
      ? "Starting..."
      : loading === "stop"
        ? "Stopping..."
        : "Restarting..."
    : running
      ? "Online"
      : "Offline";
  const statusColor = loading ? "bg-warning" : running ? "bg-success" : "bg-destructive";

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`h-3 w-3 rounded-full ${statusColor} animate-pulse`} />
        <div>
          <h1 className="text-2xl font-bold text-foreground">{panelName || "Arma Reforger"}</h1>
          <p className="text-sm text-muted-foreground">{statusLabel}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleStart}
          disabled={running || !!loading}
          className="bg-success hover:bg-success/80 text-success-foreground"
        >
          <Play className="mr-1 h-4 w-4" /> {loading === "start" ? "Starting..." : "Start"}
        </Button>
        <Button
          onClick={handleRestart}
          disabled={!running || !!loading}
          variant="secondary"
        >
          <RotateCcw className="mr-1 h-4 w-4" /> {loading === "restart" ? "Restarting..." : "Restart"}
        </Button>
        <Button
          onClick={handleStop}
          disabled={!running || !!loading}
          className="bg-destructive hover:bg-destructive/80 text-destructive-foreground"
        >
          <Square className="mr-1 h-4 w-4" /> {loading === "stop" ? "Stopping..." : "Stop"}
        </Button>
      </div>
    </div>
  );
};

export default ServerHeader;
