import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, FolderOpen, FileText, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useServerSettings } from "@/contexts/ServerSettingsContext";

const Setup = () => {
  const {
    panelName,
    setPanelName,
    serverFolder,
    setServerFolder,
    configFile,
    setConfigFile,
    completeSetup,
  } = useServerSettings();
  const [name, setName] = useState(panelName);
  const [folder, setFolder] = useState(serverFolder);
  const [config, setConfig] = useState(configFile);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Panel name is required");
      return;
    }
    if (!folder.trim()) {
      setError("Server folder is required");
      return;
    }
    if (!config.trim()) {
      setError("Config file path is required");
      return;
    }
    setLoading(true);
    try {
      await completeSetup({
        panelName: name.trim(),
        serverFolder: folder.trim(),
        configFile: config.trim(),
      });
      navigate("/", { replace: true });
    } catch {
      setError("Failed to save setup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Gamepad2 className="h-10 w-10 text-primary" />
          <span className="text-xl font-bold text-foreground">Initial Setup</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Panel setup
            </CardTitle>
            <CardDescription>
              Configure your panel name and server paths. You can change these later in Settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="panelName" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  Panel name
                </Label>
                <Input
                  id="panelName"
                  type="text"
                  placeholder="Arma Panel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Display name shown in the header</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serverFolder" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  Server folder
                </Label>
                <Input
                  id="serverFolder"
                  type="text"
                  placeholder="/home/arma/server"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Arma Reforger server installation folder path</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="configFile" className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Config file
                </Label>
                <Input
                  id="configFile"
                  type="text"
                  placeholder="/home/arma/server/config.json"
                  value={config}
                  onChange={(e) => setConfig(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Path to server config file — used by Config Editor</p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Complete setup"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Setup;
