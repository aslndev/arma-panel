import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, FolderOpen, FileText, LayoutDashboard, User, Lock, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setupApi } from "@/api/endpoints";

const STEPS = [
  { id: 1, title: "Admin account", description: "Create the account you will use to sign in." },
  { id: 2, title: "Panel settings", description: "Configure panel name and server paths." },
];

const Installer = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("Arma Panel");
  const [folder, setFolder] = useState("/home/arma/server");
  const [config, setConfig] = useState("/home/arma/server/config.json");
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const step2DetectDone = useRef(false);

  useEffect(() => {
    setupApi
      .getStatus()
      .then((res) => {
        if (res.setupComplete) {
          navigate("/login", { replace: true });
          return;
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [navigate]);

  useEffect(() => {
    if (step !== 2 || step2DetectDone.current) return;
    step2DetectDone.current = true;
    setupApi
      .detect()
      .then((d) => {
        if (d?.serverFolder) {
          setFolder(d.serverFolder);
          if (d.configFile) setConfig(d.configFile);
        }
      })
      .catch(() => {});
  }, [step]);

  const validateStep1 = (): boolean => {
    setError("");
    if (!adminUsername.trim()) {
      setError("Admin username is required");
      return false;
    }
    if (!adminPassword) {
      setError("Admin password is required");
      return false;
    }
    if (adminPassword.length < 4) {
      setError("Admin password must be at least 4 characters");
      return false;
    }
    if (adminPassword !== adminPasswordConfirm) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    setError("");
    if (!name.trim()) {
      setError("Panel name is required");
      return false;
    }
    if (!folder.trim()) {
      setError("Server folder is required");
      return false;
    }
    if (!config.trim()) {
      setError("Config file path is required");
      return false;
    }
    return true;
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleBack = () => {
    setError("");
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 2) return;
    if (!validateStep2()) return;
    setLoading(true);
    setError("");
    try {
      await setupApi.complete({
        panelName: name.trim(),
        serverFolder: folder.trim(),
        configFile: config.trim(),
        adminUsername: adminUsername.trim(),
        adminPassword,
      });
      navigate("/login", { replace: true });
    } catch (e) {
      setError((e as Error).message || "Installation failed");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  const currentStepInfo = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Gamepad2 className="h-10 w-10 text-primary" />
          <span className="text-xl font-bold text-foreground">Arma Panel Installer</span>
        </div>

        <div className="flex gap-2 mb-6">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                s.id <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm font-normal">Step {step} of {STEPS.length}</span>
              <span className="text-primary">—</span>
              {currentStepInfo.title}
            </CardTitle>
            <CardDescription>{currentStepInfo.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="adminUsername" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Admin username
                    </Label>
                    <Input
                      id="adminUsername"
                      type="text"
                      placeholder="admin"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      autoComplete="username"
                    />
                    <p className="text-xs text-muted-foreground">Use this to sign in after installation</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminPassword" className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-primary" />
                      Admin password
                    </Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-muted-foreground">At least 4 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminPasswordConfirm" className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-primary" />
                      Confirm password
                    </Label>
                    <Input
                      id="adminPasswordConfirm"
                      type="password"
                      placeholder="••••••••"
                      value={adminPasswordConfirm}
                      onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <Button type="button" onClick={handleNext} className="flex-1">
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            ) : (
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
                      placeholder="e.g. armarserver_config.json (relative to Server folder)"
                      value={config}
                      onChange={(e) => setConfig(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Relative to Server folder. Full path: {folder ? `${folder.replace(/\/$/, "")}/${config || "…"}` : "—"}</p>
                  </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? "Installing..." : "Complete installation"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Installer;
