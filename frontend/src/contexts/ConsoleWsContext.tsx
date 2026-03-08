import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getPanelWebSocketUrl } from "@/api/endpoints";
import type { ServerSummary } from "@/api/endpoints";

interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

type ResolveExec = (value: ExecResult) => void;

interface ConsoleWsValue {
  summary: ServerSummary | null;
  sendExec: (command: string) => Promise<ExecResult>;
  connected: boolean;
}

const ConsoleWsContext = createContext<ConsoleWsValue | null>(null);

export function useConsoleWs() {
  const ctx = useContext(ConsoleWsContext);
  if (!ctx) throw new Error("useConsoleWs must be used within ConsoleWsProvider");
  return ctx;
}

export function ConsoleWsProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<ServerSummary | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingExecRef = useRef<Map<string, ResolveExec>>(new Map());
  const idRef = useRef(0);

  useEffect(() => {
    const url = getPanelWebSocketUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === "summary") {
          setSummary(msg.data);
        }
        if (msg.type === "execResult" && msg.id != null) {
          const resolve = pendingExecRef.current.get(String(msg.id));
          if (resolve) {
            pendingExecRef.current.delete(String(msg.id));
            resolve({
              stdout: msg.stdout ?? "",
              stderr: msg.stderr ?? "",
              code: msg.code ?? 1,
            });
          }
        }
      } catch (_) {}
    };

    return () => {
      ws.close();
      wsRef.current = null;
      pendingExecRef.current.forEach((r) => r({ stdout: "", stderr: "Connection closed", code: 1 }));
      pendingExecRef.current.clear();
    };
  }, []);

  const sendExec = useCallback((command: string): Promise<ExecResult> => {
    return new Promise((resolve) => {
      const id = String(++idRef.current);
      pendingExecRef.current.set(id, resolve);
      try {
        if (wsRef.current?.readyState === 1) {
          wsRef.current.send(JSON.stringify({ type: "exec", id, command }));
        } else {
          pendingExecRef.current.delete(id);
          resolve({ stdout: "", stderr: "Not connected", code: 1 });
        }
      } catch (err) {
        pendingExecRef.current.delete(id);
        resolve({
          stdout: "",
          stderr: (err as Error).message || "Send failed",
          code: 1,
        });
      }
    });
  }, []);

  const value: ConsoleWsValue = { summary, sendExec, connected };

  return (
    <ConsoleWsContext.Provider value={value}>
      {children}
    </ConsoleWsContext.Provider>
  );
}
