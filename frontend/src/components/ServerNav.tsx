import { Terminal, FolderOpen, Database, Clock, Users, Archive, Network, Settings, Activity, FileJson } from "lucide-react";

interface ServerNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "console", label: "Console", icon: Terminal },
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "databases", label: "Databases", icon: Database },
  { id: "schedules", label: "Schedules", icon: Clock },
  { id: "users", label: "Users", icon: Users },
  { id: "backups", label: "Backups", icon: Archive },
  { id: "network", label: "Network", icon: Network },
  { id: "config", label: "Config Editor", icon: FileJson },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "activity", label: "Activity", icon: Activity },
];

const ServerNav = ({ activeTab, onTabChange }: ServerNavProps) => {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px">
      {tabs.map((tab) => {
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
