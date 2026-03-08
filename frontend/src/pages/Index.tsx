import { useState } from "react";
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

const Index = () => {
  const { panelName } = useServerSettings();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("console");

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
              <StatusCard icon={Wifi} label="Address" value="104.194.10.9:2486" iconColor="text-primary" />
              <StatusCard icon={Clock} label="Uptime" value="Offline" iconColor="text-destructive" />
              <StatusCard icon={Cpu} label="CPU Load" value="Offline" iconColor="text-primary" />
              <StatusCard icon={MemoryStick} label="Memory" value="Offline" iconColor="text-primary" />
              <StatusCard icon={HardDrive} label="Disk" value="14.35 GiB" subValue="/ 48.83 GiB" iconColor="text-warning" />
              <StatusCard icon={Download} label="Network (Inbound)" value="Offline" iconColor="text-primary" />
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
