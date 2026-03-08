import { useState, useEffect } from "react";
import { Activity, Server, User, FileText, Shield } from "lucide-react";
import { activityApi } from "@/api/endpoints";

interface ActivityItem {
  id: string;
  type: string;
  action: string;
  detail: string;
  user: string;
  timestamp: string;
}

const iconMap: Record<string, typeof Server> = {
  server: Server,
  user: User,
  file: FileText,
  security: Shield,
};

const colorMap: Record<string, string> = {
  server: "text-primary",
  user: "text-success",
  file: "text-warning",
  security: "text-destructive",
};

const ActivityPanel = () => {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    activityApi
      .list()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Activity Log</h2>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading...</div>
      ) : (
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = iconMap[item.type] || FileText;
          return (
            <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent/50 transition-colors">
              <div className={`mt-0.5 ${colorMap[item.type] ?? "text-muted-foreground"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{item.action}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{item.timestamp}</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
                <p className="text-xs text-muted-foreground mt-0.5">by {item.user}</p>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};

export default ActivityPanel;
