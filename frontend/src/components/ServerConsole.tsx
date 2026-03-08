import { useState, useRef, useEffect, useCallback } from "react";
import { serverApi, getConsoleWebSocketUrl, type ServerSummary } from "@/api/endpoints";
import { useServerSettings } from "@/contexts/ServerSettingsContext";

function formatUptime(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const ServerConsole = () => {
  const { serverFolder } = useServerSettings();
  const [summary, setSummary] = useState<ServerSummary | null>(null);
  const [consoleText, setConsoleText] = useState("");
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadSummary = useCallback(async () => {
    try {
      const data = await serverApi.summary();
      setSummary(data);
    } catch {
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    const t = setInterval(loadSummary, 10000);
    return () => clearInterval(t);
  }, [loadSummary]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [consoleText]);

  useEffect(() => {
    const url = getConsoleWebSocketUrl();
    const ws = new WebSocket(url);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setError("WebSocket error");
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === "init") {
          setConsoleText(msg.data || "");
          setCurrentSession(msg.session || null);
        }
        if (msg.type === "append") setConsoleText((prev) => prev + (msg.data || ""));
        if (msg.type === "error") setError(msg.message || "Error");
      } catch (_) {}
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (!connected || error) return;
    setError(null);
  }, [connected, error]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">Address:</span>{" "}
          {summary?.address && summary?.port != null
            ? `${summary.address}:${summary.port}`
            : summary?.address || "—"}
        </span>
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">Uptime:</span>{" "}
          {summary?.uptimeSeconds != null ? formatUptime(summary.uptimeSeconds) : "—"}
        </span>
        {currentSession && (
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">Session:</span>{" "}
            <span className="font-mono text-xs">{currentSession}</span>
          </span>
        )}
        {summary?.sessionStartedAt && !currentSession && (
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">Started:</span>{" "}
            {new Date(summary.sessionStartedAt).toLocaleString()}
          </span>
        )}
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">Logs path:</span>{" "}
          {serverFolder ? `${serverFolder}/profiles/server/logs` : "—"}
        </span>
        {connected && <span className="text-primary text-xs font-medium">Live</span>}
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
      <div className="flex flex-col h-full rounded-lg border border-border bg-terminal overflow-hidden">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-xs whitespace-pre-wrap break-words text-foreground min-h-[400px] max-h-[60vh]"
        >
          {consoleText || (!connected && !error ? "Connecting to console stream…" : "")}
        </div>
      </div>
    </div>
  );
};

export default ServerConsole;
