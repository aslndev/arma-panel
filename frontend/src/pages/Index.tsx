import { useState, useEffect } from "react";
import { Wifi, Clock, Cpu, MemoryStick, HardDrive, Download, Gamepad2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import ServerHeader from "@/components/ServerHeader";
import ServerNav, { getVisibleTabIds } from "@/components/ServerNav";
import ServerConsole from "@/components/ServerConsole";
import StatusCard from "@/components/StatusCard";
import SettingsPanel from "@/components/SettingsPanel";
import FilesPanel from "@/components/panels/FilesPanel";
import SchedulesPanel from "@/components/panels/SchedulesPanel";
import UsersPanel from "@/components/panels/UsersPanel";
import BackupsPanel from "@/components/panels/BackupsPanel";
import ActivityPanel from "@/components/panels/ActivityPanel";
import ConfigEditorPanel from "@/components/panels/ConfigEditorPanel";
import LogsPanel from "@/components/panels/LogsPanel";
import PlayersPanel from "@/components/panels/PlayersPanel";
import { ConsoleWsProvider, useConsoleWs } from "@/contexts/ConsoleWsContext";

function formatUptime(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function ConsoleTabContent() {
  const { summary } = useConsoleWs();
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
        <StatusCard
          icon={Cpu}
          label="CPU Load"
          value={summary?.cpuLoad != null ? summary.cpuLoad.toFixed(2) : "—"}
          iconColor={summary?.cpuLoad != null ? "text-primary" : "text-muted-foreground"}
        />
        <StatusCard
          icon={MemoryStick}
          label="Memory"
          value={
            summary?.memoryUsed != null && summary?.memoryTotalMb != null
              ? `${summary.memoryUsed}% (${Math.round((summary.memoryUsed / 100) * summary.memoryTotalMb)} / ${summary.memoryTotalMb} MB)`
              : summary?.memoryUsed != null
                ? `${summary.memoryUsed}%`
                : "—"
          }
          iconColor={summary?.memoryUsed != null ? "text-primary" : "text-muted-foreground"}
        />
        <StatusCard
          icon={HardDrive}
          label="Disk"
          value={
            summary?.diskUsedMb != null && summary?.diskTotalMb != null
              ? `${summary.diskUsedMb} / ${summary.diskTotalMb} MB`
              : summary?.diskUsedMb != null
                ? `${summary.diskUsedMb} MB`
                : "—"
          }
          iconColor={summary?.diskUsedMb != null ? "text-primary" : "text-muted-foreground"}
        />
        <StatusCard
          icon={Download}
          label="Network"
          value={
            summary?.networkRx != null && summary?.networkTx != null
              ? `↓ ${formatBytes(summary.networkRx)} ↑ ${formatBytes(summary.networkTx)}`
              : "—"
          }
          iconColor={summary?.networkRx != null ? "text-primary" : "text-muted-foreground"}
        />
      </div>
    </div>
  );
}

const Index = () => {
  const { panelName } = useServerSettings();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("console");

  const visibleIds = getVisibleTabIds(user?.role, user?.permissions);
  useEffect(() => {
    if (visibleIds.length > 0 && !visibleIds.includes(activeTab)) {
      setActiveTab(visibleIds[0]);
    }
  }, [visibleIds.join(","), activeTab]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "console":
        return <ConsoleTabContent />;
      case "files":
        return <FilesPanel />;
      case "schedules":
        return <SchedulesPanel />;
      case "users":
        return <UsersPanel />;
      case "backups":
        return <BackupsPanel />;
      case "config":
        return <ConfigEditorPanel />;
      case "settings":
        return <SettingsPanel />;
      case "activity":
        return <ActivityPanel />;
      case "logs":
        return <LogsPanel />;
      case "players":
        return <PlayersPanel />;
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
        <ConsoleWsProvider>
          <ServerHeader />
          <ServerNav activeTab={activeTab} onTabChange={setActiveTab} />
          {renderContent()}
        </ConsoleWsProvider>
      </div>
    </div>
  );
};

export default Index;
