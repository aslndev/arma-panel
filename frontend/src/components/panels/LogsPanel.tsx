import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, AlertCircle, FileCode, Terminal } from "lucide-react";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { serverApi, getConsoleWebSocketUrl } from "@/api/endpoints";
import { Button } from "@/components/ui/button";

const LOG_FILES = [
  { id: "console.log", label: "Console", icon: Terminal },
  { id: "error.log", label: "Error", icon: AlertCircle },
  { id: "script.log", label: "Script", icon: FileCode },
] as const;

const TAIL_DEFAULT = 500;
const SESSIONS_POLL_MS = 6000;

const LogsPanel = () => {
  const { serverFolder } = useServerSettings();
  const [sessions, setSessions] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<(typeof LOG_FILES)[number]["id"]>("console.log");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const logsPath = serverFolder ? `${serverFolder}/profiles/server/logs` : "";

  const refreshSessions = useCallback(() => {
    serverApi.logs
      .sessions()
      .then((r) => {
        const list = r.sessions || [];
        setSessions(list);
        setSelectedSession((current) => (current == null && list.length ? list[0] : current));
      })
      .catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    refreshSessions();
    const t = setInterval(refreshSessions, SESSIONS_POLL_MS);
    return () => clearInterval(t);
  }, [refreshSessions]);

  useEffect(() => {
    if (!selectedSession) {
      setContent("");
      return;
    }
    if (live && selectedFile === "console.log" && sessions.length > 0 && selectedSession === sessions[0]) {
      return;
    }
    setLoading(true);
    serverApi.logs
      .getFile(selectedSession, selectedFile, TAIL_DEFAULT)
      .then(setContent)
      .catch(() => setContent("(Failed to load)"))
      .finally(() => setLoading(false));
  }, [selectedSession, selectedFile, live, sessions.length]);

  const isLatestSession = sessions.length > 0 && selectedSession === sessions[0];

  useEffect(() => {
    if (!live || !isLatestSession || selectedFile !== "console.log") {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }
    const url = getConsoleWebSocketUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === "init") {
          setContent(msg.data || "");
          if (msg.session) setSelectedSession(msg.session);
        }
        if (msg.type === "append") setContent((prev) => prev + (msg.data || ""));
      } catch (_) {}
    };
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [live, isLatestSession, selectedFile]);

  useEffect(() => {
    if (!live || sessions.length === 0) return;
    if (sessions[0] !== selectedSession) {
      setSelectedSession(sessions[0]);
    }
  }, [live, sessions, selectedSession]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Server Logs
        </h2>
        <p className="text-xs text-muted-foreground font-mono">{logsPath || "—"}</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground">Session:</span>
        <select
          value={selectedSession ?? ""}
          onChange={(e) => {
            setSelectedSession(e.target.value || null);
            setLive(false);
          }}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono"
        >
          {sessions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {isLatestSession && selectedFile === "console.log" && (
          <Button
            variant={live ? "default" : "outline"}
            size="sm"
            onClick={() => setLive(!live)}
          >
            {live ? "Live on" : "Live off"}
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border pb-px">
        {LOG_FILES.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.id}
              onClick={() => setSelectedFile(f.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md ${
                selectedFile === f.id
                  ? "bg-secondary text-foreground border border-border border-b-transparent -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-terminal overflow-hidden">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <pre className="p-4 font-mono text-xs whitespace-pre-wrap break-words overflow-x-auto max-h-[70vh] overflow-y-auto text-foreground">
            {content || "No content"}
          </pre>
        )}
      </div>
    </div>
  );
};

export default LogsPanel;
