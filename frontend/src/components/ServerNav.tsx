import { Terminal, FolderOpen, Clock, Users, Archive, Settings, Activity, FileJson, FileText, Gamepad2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ServerNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs: { id: string; label: string; icon: typeof Terminal; permission: string }[] = [
  { id: "console", label: "Console", icon: Terminal, permission: "console" },
  { id: "logs", label: "Logs", icon: FileText, permission: "console" },
  { id: "players", label: "Players", icon: Gamepad2, permission: "players" },
  { id: "files", label: "Files", icon: FolderOpen, permission: "files" },
  { id: "schedules", label: "Schedules", icon: Clock, permission: "schedules" },
  { id: "users", label: "Users", icon: Users, permission: "users" },
  { id: "backups", label: "Backups", icon: Archive, permission: "backups" },
  { id: "config", label: "Config Editor", icon: FileJson, permission: "config" },
  { id: "settings", label: "Settings", icon: Settings, permission: "settings" },
  { id: "activity", label: "Activity", icon: Activity, permission: "activity" },
];

export function canSeeTab(role: string | undefined, permissions: string[] | undefined, permission: string): boolean {
  const r = (role || "").toLowerCase();
  if (r === "owner" || r === "admin") return true;
  return Array.isArray(permissions) && permissions.includes(permission);
}

export function getVisibleTabIds(role: string | undefined, permissions: string[] | undefined): string[] {
  return tabs.filter((tab) => canSeeTab(role, permissions, tab.permission)).map((tab) => tab.id);
}

const ServerNav = ({ activeTab, onTabChange }: ServerNavProps) => {
  const { user } = useAuth();
  const role = user?.role;
  const permissions = user?.permissions ?? [];
  const visibleTabs = tabs.filter((tab) => canSeeTab(role, permissions, tab.permission));

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors rounded-t-md ${
              isActive
                ? "text-primary border-b-2 border-primary bg-secondary/50"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
};

export default ServerNav;
