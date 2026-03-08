import { useState, useRef, useEffect } from "react";

interface ConsoleLine {
  timestamp: string;
  text: string;
  type: "info" | "error" | "success" | "system";
}

const ServerConsole = () => {
  const [lines, setLines] = useState<ConsoleLine[]>([
    { timestamp: "12:00:01", text: "container@pterodactyl~ Server marked as offline...", type: "system" },
    { timestamp: "12:00:02", text: "[INFO] Arma Reforger Dedicated Server", type: "info" },
    { timestamp: "12:00:03", text: "[INFO] Waiting for start command...", type: "info" },
  ]);
  const [command, setCommand] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [lines]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    setLines((prev) => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), text: `> ${command}`, type: "info" },
    ]);
    setCommand("");
  };

  const colorMap = {
    info: "text-foreground",
    error: "text-destructive",
    success: "text-terminal-text",
    system: "text-terminal-text",
  };

  return (
    <div className="flex flex-col h-full rounded-lg border border-border bg-terminal overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1 min-h-[400px]"
      >
        {lines.map((line, i) => (
          <div key={i} className={colorMap[line.type]}>
            <span className="text-muted-foreground mr-2">[{line.timestamp}]</span>
            {line.text}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <span className="text-terminal-text font-mono text-sm">$</span>
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-foreground font-mono text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </form>
    </div>
  );
};

export default ServerConsole;
