import { useState, useRef, useEffect } from "react";
import { useConsoleWs } from "@/contexts/ConsoleWsContext";
import { toast } from "sonner";

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
  const { summary, sendExec, connected } = useConsoleWs();
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [command, setCommand] = useState("");
  const [running, setRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [lines]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd || running) return;
    setCommand("");
    setLines((prev) => [...prev, { type: "command", text: cmd }]);
    setRunning(true);
    try {
      const result = await sendExec(cmd);
      const out = [result.stdout, result.stderr].filter(Boolean).join(result.stdout && result.stderr ? "\n" : "") || "(no output)";
      setLines((prev) => [...prev, { type: "output", text: out }]);
      if (result.code !== 0) {
        setLines((prev) => [...prev, { type: "output", text: `[exit code ${result.code}]` }]);
      }
    } catch (err) {
      setLines((prev) => [...prev, { type: "output", text: (err as Error).message }]);
      toast.error("Command failed");
    } finally {
      setRunning(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {!connected && <span className="text-amber-500">Disconnected</span>}
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
          className="overflow-y-auto p-3 font-mono text-xs text-foreground min-h-[200px] max-h-[320px] whitespace-pre-wrap break-words"
        >
          {lines.length === 0 && (
            <div className="text-muted-foreground">
              Bash terminal — commands run in the server folder. Use the Logs tab to view server log files.
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
            placeholder={running ? "Running..." : "Enter command..."}
            disabled={running}
            className="flex-1 bg-transparent text-foreground font-mono text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            autoFocus
          />
        </form>
      </div>
    </div>
  );
};

export default ServerConsole;
