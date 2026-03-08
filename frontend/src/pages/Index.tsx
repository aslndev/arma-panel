import { useState, useEffect, useCallback } from "react";
import { Wifi, Clock, Cpu, MemoryStick, HardDrive, Download, Gamepad2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import ServerHeader from "@/components/ServerHeader";
import ServerNav from "@/components/ServerNav";
import ServerConsole from "@/components/ServerConsole";
import StatusCard from "@/components/StatusCard";
import SettingsPanel from "@/components/SettingsPanel";
import FilesPanel from "@/components/panels/FilesPanel";
import DatabasesPanel from "@/components/panels/DatabasesPanel";
import SchedulesPanel from "@/components/panels/SchedulesPanel";
import UsersPanel from "@/components/panels/UsersPanel";
import BackupsPanel from "@/components/panels/BackupsPanel";
import NetworkPanel from "@/components/panels/NetworkPanel";
import ActivityPanel from "@/components/panels/ActivityPanel";
import ConfigEditorPanel from "@/components/panels/ConfigEditorPanel";
import LogsPanel from "@/components/panels/LogsPanel";
import { serverApi, type ServerSummary } from "@/api/endpoints";

function formatUptime(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const Index = () => {
  const { panelName } = useServerSettings();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("console");
  const [summary, setSummary] = useState<ServerSummary | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const data = await serverApi.summary();
      setSummary(data);
    } catch {
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "console") loadSummary();
  }, [activeTab, loadSummary]);

  useEffect(() => {
    if (activeTab !== "console") return;
    const t = setInterval(loadSummary, 10000);
    return () => clearInterval(t);
  }, [activeTab, loadSummary]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "console":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            <ServerConsole />
            <div className="space-y-3">
              <StatusCard
                icon={Wifi}
                label="Address"
                value={
                  summary?.address != null && summary?.port != null
                    ? `${summary.address}:${summary.port}`
                    : summary?.address ?? "—"
                }
                iconColor="text-primary"
              />
              <StatusCard
                icon={Clock}
                label="Uptime"
                value={summary?.uptimeSeconds != null ? formatUptime(summary.uptimeSeconds) : "—"}
                iconColor={summary?.hasSession ? "text-primary" : "text-muted-foreground"}
              />
              <StatusCard icon={Cpu} label="CPU Load" value="—" iconColor="text-muted-foreground" />
              <StatusCard icon={MemoryStick} label="Memory" value="—" iconColor="text-muted-foreground" />
              <StatusCard icon={HardDrive} label="Disk" value="—" iconColor="text-muted-foreground" />
              <StatusCard icon={Download} label="Network" value="—" iconColor="text-muted-foreground" />
            </div>
          </div>
        );
      case "files":
        return <FilesPanel />;
      case "databases":
        return <DatabasesPanel />;
      case "schedules":
        return <SchedulesPanel />;
      case "users":
        return <UsersPanel />;
      case "backups":
        return <BackupsPanel />;
      case "network":
        return <NetworkPanel />;
      case "config":
        return <ConfigEditorPanel />;
      case "settings":
        return <SettingsPanel />;
      case "activity":
        return <ActivityPanel />;
      case "logs":
        return <LogsPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gamepad2 className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold text-foreground">{panelName}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

        <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        <ServerHeader />
        <ServerNav activeTab={activeTab} onTabChange={setActiveTab} />
        {renderContent()}
      </div>
    </div>
  );
};

export default Index;
