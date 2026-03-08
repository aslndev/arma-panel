import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { FolderOpen, FileText, LayoutDashboard, Search, AlertTriangle } from "lucide-react";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { settingsApi } from "@/api/endpoints";

const SettingsPanel = () => {
  const { panelName, setPanelName, serverFolder, setServerFolder, configFile, setConfigFile, detectInstallMessage, refreshSettings } = useServerSettings();
  const [detecting, setDetecting] = useState(false);

  const handleSave = async () => {
    try {
      await settingsApi.update({
        panelName,
        serverFolder,
        configFile,
      });
      await refreshSettings();
      toast.success("Settings saved successfully!");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Server Configuration</h2>

      {detectInstallMessage && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200 [&>svg]:text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>LinuxGSM / Arma server install incomplete</AlertTitle>
          <AlertDescription className="mt-1 whitespace-pre-wrap">{detectInstallMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-foreground">
            <LayoutDashboard className="h-4 w-4 text-primary" /> Panel name
          </Label>
          <Input
            value={panelName}
            onChange={(e) => setPanelName(e.target.value)}
            placeholder="Arma Panel"
          />
          <p className="text-xs text-muted-foreground">Display name shown in the header</p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-foreground">
            <FolderOpen className="h-4 w-4 text-primary" /> Server Folder
          </Label>
          <div className="flex gap-2">
            <Input
              value={serverFolder}
              onChange={(e) => setServerFolder(e.target.value)}
              placeholder="/path/to/server"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Auto-detect server folder and config"
              disabled={detecting}
              onClick={async () => {
                setDetecting(true);
                try {
                  const d = await settingsApi.detect();
                  if (d?.installStatus === "incomplete" && d?.installMessage) {
                    toast.warning(d.installMessage, { duration: 10000 });
                    return;
                  }
                  if (d?.serverFolder) {
                    setServerFolder(d.serverFolder);
                    if (d.configFile) setConfigFile(d.configFile);
                    toast.success("Server path and config detected.");
                  } else {
                    toast.info(d?.installMessage ?? "No Arma Reforger server found in common paths.");
                  }
                } catch {
                  toast.error("Detection failed.");
                } finally {
                  setDetecting(false);
                }
              }}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Arma Reforger server installation folder path (auto-detected on load when empty)</p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-foreground">
            <FileText className="h-4 w-4 text-primary" /> Config File
          </Label>
          <Input
            value={configFile}
            onChange={(e) => setConfigFile(e.target.value)}
            placeholder="e.g. armarserver_config.json (relative to Server folder)"
          />
          <p className="text-xs text-muted-foreground">Relative to Server folder. Full path: {serverFolder ? `${serverFolder.replace(/\/$/, "")}/${configFile || "…"}` : "—"}</p>
        </div>

        <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/80">
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default SettingsPanel;
