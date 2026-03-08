import { useState, useRef, useEffect, useCallback } from "react";
import { serverApi, type ServerSummary } from "@/api/endpoints";

function formatUptime(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface TerminalLine {
  type: "command" | "output";
  text: string;
}

const ServerConsole = () => {
  const [summary, setSummary] = useState<ServerSummary | null>(null);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [command, setCommand] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
  }, [lines]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd) return;
    setCommand("");
    setLines((prev) => [...prev, { type: "command", text: cmd }]);
    setLines((prev) => [
      ...prev,
      {
        type: "output",
        text: "Command sent. For live server log output, use the Logs tab.",
      },
    ]);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">Address:</span>{" "}
          {summary?.address != null && summary?.port != null
            ? `${summary.address}:${summary.port}`
            : summary?.address ?? "—"}
        </span>
        <span>
          <span className="font-medium text-foreground">Uptime:</span>{" "}
          {summary?.uptimeSeconds != null ? formatUptime(summary.uptimeSeconds) : "—"}
        </span>
      </div>
      <div className="rounded-lg border border-border bg-terminal overflow-hidden flex flex-col">
        <div
          ref={scrollRef}
          className="overflow-y-auto p-3 font-mono text-xs text-foreground min-h-[200px] max-h-[320px]"
        >
          {lines.length === 0 && (
            <div className="text-muted-foreground">
              Type a command and press Enter. For server log stream, use the Logs tab.
            </div>
          )}
          {lines.map((line, i) => (
            <div key={i} className={line.type === "command" ? "text-primary mt-1" : "text-muted-foreground mt-0.5"}>
              {line.type === "command" ? `$ ${line.text}` : line.text}
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="border-t border-border p-2 flex items-center gap-2">
          <span className="text-primary font-mono text-sm">$</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Command..."
            className="flex-1 bg-transparent text-foreground font-mono text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </form>
      </div>
    </div>
  );
};

export default ServerConsole;
