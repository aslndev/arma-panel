import { Play, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { serverApi } from "@/api/endpoints";
import { useServerSettings } from "@/contexts/ServerSettingsContext";

const ServerHeader = () => {
  const { panelName } = useServerSettings();
  const [status, setStatus] = useState<"offline" | "starting" | "online" | "stopping">("offline");
  const [loading, setLoading] = useState<"start" | "stop" | "restart" | null>(null);

  const handleStart = async () => {
    setLoading("start");
    setStatus("starting");
    try {
      await serverApi.start();
      toast.success("Server start command sent.");
      setStatus("online");
    } catch (e) {
      toast.error((e as Error).message || "Failed to start server");
      setStatus("offline");
    } finally {
      setLoading(null);
    }
  };

  const handleRestart = async () => {
    setLoading("restart");
    setStatus("starting");
    try {
      await serverApi.restart();
      toast.success("Server restart command sent.");
      setStatus("online");
    } catch (e) {
      toast.error((e as Error).message || "Failed to restart server");
    } finally {
      setLoading(null);
    }
  };

  const handleStop = async () => {
    setLoading("stop");
    setStatus("stopping");
    try {
      await serverApi.stop();
      toast.success("Server stop command sent.");
      setStatus("offline");
    } catch (e) {
      toast.error((e as Error).message || "Failed to stop server");
      setStatus("online");
    } finally {
      setLoading(null);
    }
  };

  const statusColors = {
    offline: "bg-destructive",
    starting: "bg-warning",
    online: "bg-success",
    stopping: "bg-warning",
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`h-3 w-3 rounded-full ${statusColors[status]} animate-pulse`} />
        <div>
          <h1 className="text-2xl font-bold text-foreground">{panelName || "Arma Reforger"}</h1>
          <p className="text-sm text-muted-foreground capitalize">{status}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleStart}
          disabled={status === "online" || !!loading}
          className="bg-success hover:bg-success/80 text-success-foreground"
        >
          <Play className="mr-1 h-4 w-4" /> {loading === "start" ? "Starting..." : "Start"}
        </Button>
        <Button
          onClick={handleRestart}
          disabled={status === "offline" || !!loading}
          variant="secondary"
        >
          <RotateCcw className="mr-1 h-4 w-4" /> {loading === "restart" ? "Restarting..." : "Restart"}
        </Button>
        <Button
          onClick={handleStop}
          disabled={status === "offline" || !!loading}
          className="bg-destructive hover:bg-destructive/80 text-destructive-foreground"
        >
          <Square className="mr-1 h-4 w-4" /> {loading === "stop" ? "Stopping..." : "Stop"}
        </Button>
      </div>
    </div>
  );
};

export default ServerHeader;
