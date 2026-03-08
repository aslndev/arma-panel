import { useState, useMemo, useCallback, useEffect, DragEvent } from "react";
import {
  Settings2, Network, Gamepad2, SlidersHorizontal, Package, ToggleLeft,
  Copy, Download, Upload, RotateCcw, ChevronRight, ChevronLeft, Lightbulb,
  Zap, Shield, AlertTriangle, FileText, HelpCircle, Terminal, ExternalLink,
  ChevronDown, ChevronUp, Plus, Trash2, Radio, ServerCog, Users, Save
} from "lucide-react";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { configApi } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Types ───────────────────────────────────────────────────────────────────

type ConfigTab = "base" | "game" | "admins" | "properties" | "a2s" | "rcon" | "operating" | "mods";

interface ModEntry {
  modId: string;
  name: string;
  version: string;
  required: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const configTabs: { id: ConfigTab; label: string; icon: React.ElementType }[] = [
  { id: "base", label: "Base", icon: Network },
  { id: "operating", label: "Operating", icon: ServerCog },
  { id: "a2s", label: "A2S", icon: Radio },
  { id: "rcon", label: "RCON", icon: Terminal },
  { id: "game", label: "Game", icon: Gamepad2 },
  { id: "admins", label: "Admins", icon: Users },
  { id: "properties", label: "Game Properties", icon: SlidersHorizontal },
  { id: "mods", label: "Mods", icon: Package },
];

const OFFICIAL_SCENARIOS = [
  { label: "Conflict - Everon", value: "{ECC61978EDCC2B5A}Missions/23_Campaign.conf" },
  { label: "Game Master - Everon", value: "{59AD59368755F41A}Missions/21_GM_Eden.conf" },
  { label: "Training", value: "{002AF7323E0129AF}Missions/Tutorial.conf" },
  { label: "Game Master - Arland", value: "{2BBBE828037C6F4B}Missions/22_GM_Arland.conf" },
  { label: "Conflict - Northern Everon", value: "{C700DB41F0C546E1}Missions/23_Campaign_NorthCentral.conf" },
  { label: "Conflict - Southern Everon", value: "{28802845ADA64D52}Missions/23_Campaign_SWCoast.conf" },
  { label: "Combat Ops - Arland", value: "{DAA03C6E6099D50F}Missions/24_CombatOps.conf" },
  { label: "Conflict - Arland", value: "{C41618FD18E9D714}Missions/23_Campaign_Arland.conf" },
  { label: "Combat Ops - Everon", value: "{DFAC5FABD11F2390}Missions/26_CombatOpsEveron.conf" },
  { label: "Capture & Hold - Briars Coast", value: "{3F2E005F43DBD2F8}Missions/CAH_Briars_Coast.conf" },
  { label: "Capture & Hold - Montfort Castle", value: "{F1A1BEA67132113E}Missions/CAH_Castle.conf" },
  { label: "Capture & Hold - Concrete Plant", value: "{589945FB9FA7B97D}Missions/CAH_Concrete_Plant.conf" },
  { label: "Capture & Hold - Almara Factory", value: "{9405201CBD22A30C}Missions/CAH_Factory.conf" },
  { label: "Capture & Hold - Simon's Wood", value: "{1CD06B409C6FAE56}Missions/CAH_Forest.conf" },
  { label: "Capture & Hold - Le Moule", value: "{7C491B1FCC0FF0E1}Missions/CAH_LeMoule.conf" },
  { label: "Capture & Hold - Camp Blake", value: "{6EA2E454519E5869}Missions/CAH_Military_Base.conf" },
  { label: "Capture & Hold - Morton", value: "{2B4183DF23E88249}Missions/CAH_Morton.conf" },
];

const WIKI_BASE = "https://community.bistudio.com/wiki/Arma_Reforger:Server_Config";

const HELP_LINKS: Record<string, string> = {
  bindAddress: WIKI_BASE,
  bindPort: WIKI_BASE,
  publicAddress: WIKI_BASE,
  publicPort: WIKI_BASE,
  a2s: WIKI_BASE + "#A2S",
  rcon: WIKI_BASE + "#RCON",
  name: WIKI_BASE + "#game",
  password: WIKI_BASE + "#game",
  passwordAdmin: WIKI_BASE + "#game",
  scenarioId: WIKI_BASE + "#game",
  maxPlayers: WIKI_BASE + "#game",
  visible: WIKI_BASE + "#game",
  crossPlatform: WIKI_BASE + "#game",
  supportedPlatforms: WIKI_BASE + "#game",
  modsRequiredByDefault: WIKI_BASE + "#game",
  admins: WIKI_BASE + "#game",
  serverMaxViewDistance: WIKI_BASE + "#gameProperties",
  serverMinGrassDistance: WIKI_BASE + "#gameProperties",
  networkViewDistance: WIKI_BASE + "#gameProperties",
  disableThirdPerson: WIKI_BASE + "#gameProperties",
  fastValidation: WIKI_BASE + "#gameProperties",
  battlEye: WIKI_BASE + "#gameProperties",
  vonDisableUI: WIKI_BASE + "#gameProperties",
  vonDisableDirectSpeechUI: WIKI_BASE + "#gameProperties",
  vonCanTransmitCrossFaction: WIKI_BASE + "#gameProperties",
  missionHeader: WIKI_BASE + "#gameProperties",
  lobbyPlayerSynchronise: WIKI_BASE + "#operating",
  disableServerShutdown: WIKI_BASE + "#operating",
  disableCrashReporter: WIKI_BASE + "#operating",
  disableAI: WIKI_BASE + "#operating",
  playerSaveTime: WIKI_BASE + "#operating",
  aiLimit: WIKI_BASE + "#operating",
  slotReservationTimeout: WIKI_BASE + "#operating",
  joinQueue: WIKI_BASE + "#operating",
  disableNavmeshStreaming: WIKI_BASE + "#operating",
};

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS = {
  bindAddress: "0.0.0.0",
  bindPort: 2001,
  publicAddress: "",
  publicPort: 2001,
  a2sAddress: "",
  a2sPort: 17777,
  rconAddress: "",
  rconPort: 19999,
  rconPassword: "",
  rconMaxClients: 16,
  rconPermission: "admin" as "admin" | "monitor",
  serverName: "Arma Reforger Server",
  password: "",
  passwordAdmin: "",
  scenarioId: "{ECC61978EDCC2B5A}Missions/23_Campaign.conf",
  maxPlayers: 64,
  visible: true,
  crossPlatform: false,
  supportedPlatforms: ["PLATFORM_PC"] as string[],
  modsRequired: true,
  serverMaxViewDistance: 1600,
  serverMinGrassDistance: 0,
  networkViewDistance: 1500,
  disableThirdPerson: false,
  fastValidation: true,
  battlEye: true,
  vonDisableUI: false,
  vonDisableDirectSpeechUI: false,
  vonCanTransmitCrossFaction: false,
  missionHeader: "",
  lobbyPlayerSynchronise: true,
  disableNavmeshStreaming: "",
  disableServerShutdown: false,
  disableCrashReporter: false,
  disableAI: false,
  playerSaveTime: 120,
  aiLimit: -1,
  slotReservationTimeout: 60,
  joinQueue: 30,
};

/** missionHeader must be an object (schema). Parse JSON string or wrap plain text in m_sDetails. */
function parseMissionHeader(value: string): { missionHeader?: Record<string, unknown> } {
  const s = (value || "").trim();
  if (!s) return {};
  try {
    const parsed = JSON.parse(s) as unknown;
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { missionHeader: parsed as Record<string, unknown> };
    }
  } catch {
    /* not JSON */
  }
  return { missionHeader: { m_sDetails: s } };
}

// ─── UI Helpers ──────────────────────────────────────────────────────────────

const FieldLabel = ({ children, tooltip, helpKey }: { children: React.ReactNode; tooltip?: string; helpKey?: string }) => (
  <div className="flex items-center gap-1.5">
    <Label className="text-foreground text-xs">{children}</Label>
    {tooltip && (
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">{tooltip}</TooltipContent>
      </Tooltip>
    )}
    {helpKey && HELP_LINKS[helpKey] && (
      <a href={HELP_LINKS[helpKey]} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
        <ExternalLink className="h-3 w-3" />
      </a>
    )}
  </div>
);

const ResetBtn = ({ onClick }: { onClick: () => void }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button onClick={onClick} className="text-muted-foreground hover:text-warning transition-colors p-1 rounded hover:bg-muted">
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" className="text-xs">Reset to default</TooltipContent>
  </Tooltip>
);

const FieldRow = ({ children, label, tooltip, helpKey, onReset }: {
  children: React.ReactNode;
  label: string;
  tooltip?: string;
  helpKey?: string;
  onReset?: () => void;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <FieldLabel tooltip={tooltip} helpKey={helpKey}>{label}</FieldLabel>
      {onReset && <ResetBtn onClick={onReset} />}
    </div>
    {children}
  </div>
);

const SwitchRow = ({ label, tooltip, helpKey, checked, onCheckedChange, onReset }: {
  label: string;
  tooltip?: string;
  helpKey?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  onReset?: () => void;
}) => (
  <div className="flex items-center justify-between rounded-md border border-border p-3 bg-muted/30">
    <div className="flex items-center gap-1.5">
      <FieldLabel tooltip={tooltip} helpKey={helpKey}>{label}</FieldLabel>
    </div>
    <div className="flex items-center gap-2">
      {onReset && <ResetBtn onClick={onReset} />}
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  </div>
);

// ─── Suggestion type ─────────────────────────────────────────────────────────

interface Suggestion {
  title: string;
  severity: "low" | "medium" | "high";
  description: string;
  impact: string;
  fixLabel: string;
  apply: () => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

const ConfigEditorPanel = () => {
  const { configFile } = useServerSettings();
  const [activeTab, setActiveTab] = useState<ConfigTab>("base");
  const [isDragOver, setIsDragOver] = useState(false);
  const [showStartupParams, setShowStartupParams] = useState(false);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [saving, setSaving] = useState(false);

  // Base / Network
  const [bindAddress, setBindAddress] = useState(DEFAULTS.bindAddress);
  const [bindPort, setBindPort] = useState(DEFAULTS.bindPort);
  const [publicAddress, setPublicAddress] = useState(DEFAULTS.publicAddress);
  const [publicPort, setPublicPort] = useState(DEFAULTS.publicPort);

  // A2S
  const [a2sAddress, setA2sAddress] = useState(DEFAULTS.a2sAddress);
  const [a2sPort, setA2sPort] = useState(DEFAULTS.a2sPort);

  // RCON
  const [rconAddress, setRconAddress] = useState(DEFAULTS.rconAddress);
  const [rconPort, setRconPort] = useState(DEFAULTS.rconPort);
  const [rconPassword, setRconPassword] = useState(DEFAULTS.rconPassword);
  const [rconMaxClients, setRconMaxClients] = useState(DEFAULTS.rconMaxClients);
  const [rconPermission, setRconPermission] = useState<"admin" | "monitor">(DEFAULTS.rconPermission);
  const [rconWhitelist, setRconWhitelist] = useState<string[]>([]);
  const [rconBlacklist, setRconBlacklist] = useState<string[]>([]);
  const [newWhitelist, setNewWhitelist] = useState("");
  const [newBlacklist, setNewBlacklist] = useState("");

  // Game
  const [serverName, setServerName] = useState(DEFAULTS.serverName);
  const [password, setPassword] = useState(DEFAULTS.password);
  const [passwordAdmin, setPasswordAdmin] = useState(DEFAULTS.passwordAdmin);
  const [scenarioId, setScenarioId] = useState(DEFAULTS.scenarioId);
  const [maxPlayers, setMaxPlayers] = useState(DEFAULTS.maxPlayers);
  const [visible, setVisible] = useState(DEFAULTS.visible);
  const [crossPlatform, setCrossPlatform] = useState(DEFAULTS.crossPlatform);
  const [supportedPlatforms, setSupportedPlatforms] = useState<string[]>([...DEFAULTS.supportedPlatforms]);
  const [modsRequired, setModsRequired] = useState(DEFAULTS.modsRequired);

  // Admins
  const [admins, setAdmins] = useState<string[]>([]);
  const [newAdmin, setNewAdmin] = useState("");

  // Game Properties
  const [serverMaxViewDistance, setServerMaxViewDistance] = useState(DEFAULTS.serverMaxViewDistance);
  const [serverMinGrassDistance, setServerMinGrassDistance] = useState(DEFAULTS.serverMinGrassDistance);
  const [networkViewDistance, setNetworkViewDistance] = useState(DEFAULTS.networkViewDistance);
  const [disableThirdPerson, setDisableThirdPerson] = useState(DEFAULTS.disableThirdPerson);
  const [fastValidation, setFastValidation] = useState(DEFAULTS.fastValidation);
  const [battlEye, setBattlEye] = useState(DEFAULTS.battlEye);
  const [vonDisableUI, setVonDisableUI] = useState(DEFAULTS.vonDisableUI);
  const [vonDisableDirectSpeechUI, setVonDisableDirectSpeechUI] = useState(DEFAULTS.vonDisableDirectSpeechUI);
  const [vonCanTransmitCrossFaction, setVonCanTransmitCrossFaction] = useState(DEFAULTS.vonCanTransmitCrossFaction);
  const [missionHeader, setMissionHeader] = useState(DEFAULTS.missionHeader);

  // Operating
  const [lobbyPlayerSynchronise, setLobbyPlayerSynchronise] = useState(DEFAULTS.lobbyPlayerSynchronise);
  const [disableNavmeshStreaming, setDisableNavmeshStreaming] = useState(DEFAULTS.disableNavmeshStreaming);
  const [disableServerShutdown, setDisableServerShutdown] = useState(DEFAULTS.disableServerShutdown);
  const [disableCrashReporter, setDisableCrashReporter] = useState(DEFAULTS.disableCrashReporter);
  const [disableAI, setDisableAI] = useState(DEFAULTS.disableAI);
  const [playerSaveTime, setPlayerSaveTime] = useState(DEFAULTS.playerSaveTime);
  const [aiLimit, setAiLimit] = useState(DEFAULTS.aiLimit);
  const [slotReservationTimeout, setSlotReservationTimeout] = useState(DEFAULTS.slotReservationTimeout);
  const [joinQueue, setJoinQueue] = useState(DEFAULTS.joinQueue);

  // Mods
  const [mods, setMods] = useState<ModEntry[]>([]);

  // ─── JSON Output ─────────────────────────────────────────────────────────

  const configJson = useMemo(() => {
    const config: Record<string, unknown> = {
      bindAddress,
      bindPort,
      publicAddress,
      publicPort,
      a2s: { address: a2sAddress, port: a2sPort },
      rcon: {
        address: rconAddress,
        port: rconPort,
        password: rconPassword,
        maxClients: rconMaxClients,
        permission: rconPermission,
        ...(rconBlacklist.length > 0 ? { blacklist: rconBlacklist } : {}),
        ...(rconWhitelist.length > 0 ? { whitelist: rconWhitelist } : {}),
      },
      game: {
        name: serverName,
        password,
        passwordAdmin,
        admins,
        scenarioId,
        maxPlayers,
        visible,
        crossPlatform,
        supportedPlatforms,
        modsRequiredByDefault: modsRequired,
        gameProperties: {
          serverMaxViewDistance,
          serverMinGrassDistance,
          networkViewDistance,
          disableThirdPerson,
          fastValidation,
          battlEye,
          VONDisableUI: vonDisableUI,
          VONDisableDirectSpeechUI: vonDisableDirectSpeechUI,
          VONCanTransmitCrossFaction: vonCanTransmitCrossFaction,
          ...(parseMissionHeader(missionHeader) ?? {}),
        },
        ...(mods.length > 0 ? { mods: mods.map(m => ({ modId: m.modId, name: m.name, ...(m.version ? { version: m.version } : {}), required: m.required })) } : {}),
      },
      operating: {
        lobbyPlayerSynchronise,
        disableServerShutdown,
        disableCrashReporter,
        disableAI,
        playerSaveTime,
        aiLimit,
        slotReservationTimeout,
        joinQueue: { maxSize: joinQueue },
        ...(disableNavmeshStreaming ? { disableNavmeshStreaming: disableNavmeshStreaming.split("\n").filter(Boolean) } : {}),
      },
    };
    return JSON.stringify(config, null, 2);
  }, [
    bindAddress, bindPort, publicAddress, publicPort,
    a2sAddress, a2sPort,
    rconAddress, rconPort, rconPassword, rconMaxClients, rconPermission, rconBlacklist, rconWhitelist,
    serverName, password, passwordAdmin, admins, scenarioId, maxPlayers, visible, crossPlatform,
    supportedPlatforms, modsRequired,
    serverMaxViewDistance, serverMinGrassDistance, networkViewDistance, disableThirdPerson,
    fastValidation, battlEye, vonDisableUI, vonDisableDirectSpeechUI, vonCanTransmitCrossFaction, missionHeader,
    mods,
    lobbyPlayerSynchronise, disableNavmeshStreaming, disableServerShutdown, disableCrashReporter,
    disableAI, playerSaveTime, aiLimit, slotReservationTimeout, joinQueue,
  ]);

  const startupParams = useMemo(() => {
    const params: string[] = [];
    params.push(`-config "${configFile}"`);
    params.push(`-profile ArmaReforgerServer`);
    if (bindAddress !== DEFAULTS.bindAddress) params.push(`-bindAddress ${bindAddress}`);
    if (bindPort !== DEFAULTS.bindPort) params.push(`-bindPort ${bindPort}`);
    if (disableCrashReporter) params.push(`-disableCrashReporter`);
    return `./ArmaReforgerServer ${params.join(" ")}`;
  }, [configFile, bindAddress, bindPort, disableCrashReporter]);

  // ─── Suggestions ─────────────────────────────────────────────────────────

  const suggestions: Suggestion[] = useMemo(() => {
    const s: Suggestion[] = [];
    if (!disableCrashReporter) {
      s.push({
        title: "Disable Crash Reporter", severity: "medium",
        description: "Crash reporter can impact server performance. Consider disabling for production servers.",
        impact: "Reduces CPU overhead and improves server stability",
        fixLabel: "Set disableCrashReporter to true",
        apply: () => setDisableCrashReporter(true),
      });
    }
    if (bindPort === 2001) {
      s.push({
        title: "Consider Changing Default Port", severity: "low",
        description: "Using the default port (2001) makes your server easier to target for attacks.",
        impact: "Slightly improves security through obscurity",
        fixLabel: "Use a random port between 10000-65535",
        apply: () => { const p = Math.floor(Math.random() * 55535) + 10000; setBindPort(p); setPublicPort(p); },
      });
    }
    if (serverName === DEFAULTS.serverName) {
      s.push({
        title: "Missing Mission Name", severity: "medium",
        description: "Your server doesn't have a custom name set.",
        impact: "Improves server browser visibility and player experience",
        fixLabel: "Set a unique server name",
        apply: () => setServerName("My Arma Reforger Server"),
      });
    }
    if (!crossPlatform) {
      s.push({
        title: "Enable Cross-Platform Play", severity: "low",
        description: "Consider enabling Xbox and PlayStation support to increase player base.",
        impact: "Larger player pool and better server population",
        fixLabel: "Enable cross-platform + Add console platforms",
        apply: () => { setCrossPlatform(true); setSupportedPlatforms(["PLATFORM_PC", "PLATFORM_XBL", "PLATFORM_PSN"]); },
      });
    }
    if (!rconPassword && rconAddress) {
      s.push({
        title: "RCON Password Missing", severity: "high",
        description: "RCON is configured but has no password set. This is a major security risk.",
        impact: "Prevents unauthorized remote control access",
        fixLabel: "Set a strong RCON password",
        apply: () => setRconPassword("ChangeMe!123"),
      });
    }
    return s;
  }, [disableCrashReporter, bindPort, serverName, crossPlatform, rconPassword, rconAddress]);

  // ─── Import / Export ─────────────────────────────────────────────────────

  const importConfigData = useCallback((data: Record<string, unknown>) => {
    try {
      if (data.bindAddress !== undefined) setBindAddress(data.bindAddress as string);
      if (data.bindPort !== undefined) setBindPort(data.bindPort as number);
      if (data.publicAddress !== undefined) setPublicAddress(data.publicAddress as string);
      if (data.publicPort !== undefined) setPublicPort(data.publicPort as number);

      const a = data.a2s as Record<string, unknown> | undefined;
      if (a) {
        if (a.address !== undefined) setA2sAddress(a.address as string);
        if (a.port !== undefined) setA2sPort(a.port as number);
      }

      const r = data.rcon as Record<string, unknown> | undefined;
      if (r) {
        if (r.address !== undefined) setRconAddress(r.address as string);
        if (r.port !== undefined) setRconPort(r.port as number);
        if (r.password !== undefined) setRconPassword(r.password as string);
        if (r.maxClients !== undefined) setRconMaxClients(r.maxClients as number);
        if (r.permission !== undefined) setRconPermission(r.permission as "admin" | "monitor");
        if (r.whitelist) setRconWhitelist(r.whitelist as string[]);
        if (r.blacklist) setRconBlacklist(r.blacklist as string[]);
      }

      const op = data.operating as Record<string, unknown> | undefined;
      if (op) {
        if (op.lobbyPlayerSynchronise !== undefined) setLobbyPlayerSynchronise(op.lobbyPlayerSynchronise as boolean);
        if (op.disableServerShutdown !== undefined) setDisableServerShutdown(op.disableServerShutdown as boolean);
        if (op.disableCrashReporter !== undefined) setDisableCrashReporter(op.disableCrashReporter as boolean);
        if (op.disableAI !== undefined) setDisableAI(op.disableAI as boolean);
        if (op.playerSaveTime !== undefined) setPlayerSaveTime(op.playerSaveTime as number);
        if (op.aiLimit !== undefined) setAiLimit(op.aiLimit as number);
        if (op.slotReservationTimeout !== undefined) setSlotReservationTimeout(op.slotReservationTimeout as number);
        if (op.joinQueue !== undefined) {
          const jq = op.joinQueue;
          if (typeof jq === "object" && jq !== null && "maxSize" in jq) setJoinQueue(Number((jq as { maxSize?: number }).maxSize) || 0);
          else if (typeof jq === "number") setJoinQueue(jq);
        }
        if (op.disableNavmeshStreaming) setDisableNavmeshStreaming((op.disableNavmeshStreaming as string[]).join("\n"));
      }
      // Also check top-level for backward compat
      if (data.disableCrashReporter !== undefined && !op) setDisableCrashReporter(data.disableCrashReporter as boolean);

      const g = data.game as Record<string, unknown> | undefined;
      if (g) {
        if (g.name !== undefined) setServerName(g.name as string);
        if (g.password !== undefined) setPassword(g.password as string);
        if (g.passwordAdmin !== undefined) setPasswordAdmin(g.passwordAdmin as string);
        if (g.admins) setAdmins(g.admins as string[]);
        if (g.scenarioId !== undefined) setScenarioId(g.scenarioId as string);
        if (g.maxPlayers !== undefined) setMaxPlayers(g.maxPlayers as number);
        if (g.visible !== undefined) setVisible(g.visible as boolean);
        if (g.crossPlatform !== undefined) setCrossPlatform(g.crossPlatform as boolean);
        if (g.supportedPlatforms) setSupportedPlatforms(g.supportedPlatforms as string[]);
        if (g.modsRequiredByDefault !== undefined) setModsRequired(g.modsRequiredByDefault as boolean);
        if (g.mods && Array.isArray(g.mods)) {
          setMods((g.mods as { modId?: string; name?: string; version?: string; required?: boolean }[]).map(m => ({
            modId: m.modId || "", name: m.name || "", version: m.version || "", required: m.required || false,
          })));
        }
        const gp = g.gameProperties as Record<string, unknown> | undefined;
        if (gp) {
          if (gp.serverMaxViewDistance !== undefined) setServerMaxViewDistance(gp.serverMaxViewDistance as number);
          if (gp.serverMinGrassDistance !== undefined) setServerMinGrassDistance(gp.serverMinGrassDistance as number);
          if (gp.networkViewDistance !== undefined) setNetworkViewDistance(gp.networkViewDistance as number);
          if (gp.disableThirdPerson !== undefined) setDisableThirdPerson(gp.disableThirdPerson as boolean);
          if (gp.fastValidation !== undefined) setFastValidation(gp.fastValidation as boolean);
          if (gp.battlEye !== undefined) setBattlEye(gp.battlEye as boolean);
          if (gp.VONDisableUI !== undefined) setVonDisableUI(gp.VONDisableUI as boolean);
          if (gp.VONDisableDirectSpeechUI !== undefined) setVonDisableDirectSpeechUI(gp.VONDisableDirectSpeechUI as boolean);
          if (gp.VONCanTransmitCrossFaction !== undefined) setVonCanTransmitCrossFaction(gp.VONCanTransmitCrossFaction as boolean);
          if (gp.missionHeader !== undefined) {
            const mh = gp.missionHeader;
            setMissionHeader(typeof mh === "string" ? mh : JSON.stringify(mh, null, 2));
          }
        }
      }
      toast.success("Config imported successfully!");
    } catch {
      toast.error("Failed to parse config data");
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: DragEvent) => { e.preventDefault(); setIsDragOver(false); }, []);
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.name.endsWith(".json")) { toast.error("Please drop a .json file"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { try { importConfigData(JSON.parse(ev.target?.result as string)); } catch { toast.error("Invalid JSON file"); } };
    reader.readAsText(file);
  }, [importConfigData]);

  const handleCopy = () => { navigator.clipboard.writeText(configJson); toast.success("Copied!"); };
  const handleExport = () => {
    const blob = new Blob([configJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "config.json"; a.click();
    URL.revokeObjectURL(url); toast.success("config.json exported!");
  };
  const handleImport = () => {
    const input = document.createElement("input"); input.type = "file"; input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { try { importConfigData(JSON.parse(ev.target?.result as string)); } catch { toast.error("Invalid JSON file"); } };
      reader.readAsText(file);
    };
    input.click();
  };

  // Load config file from server (path from Settings) on mount / when configFile changes
  useEffect(() => {
    if (!configFile?.trim()) {
      setLoadStatus("idle");
      return;
    }
    let cancelled = false;
    setLoadStatus("loading");
    configApi
      .getContent()
      .then(({ content }) => {
        if (cancelled || !content?.trim()) return;
        try {
          const data = JSON.parse(content) as Record<string, unknown>;
          importConfigData(data);
          setLoadStatus("loaded");
        } catch {
          setLoadStatus("error");
          toast.error("Config file is not valid JSON");
        }
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setLoadStatus("error");
        if ((e?.message || "").includes("not found") || (e?.message || "").includes("404")) {
          toast.info("Config file not found on server. Edit and save to create it.");
        } else {
          toast.error(e?.message || "Failed to load config file");
        }
      });
    return () => { cancelled = true; };
  }, [configFile, importConfigData]);

  const handleSave = useCallback(async () => {
    if (!configFile?.trim()) {
      toast.error("Config file path is not set in Settings.");
      return;
    }
    setSaving(true);
    try {
      await configApi.saveContent(configJson);
      toast.success("Config saved to " + configFile);
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Failed to save config");
    } finally {
      setSaving(false);
    }
  }, [configFile, configJson]);

  const handleReset = () => {
    setBindAddress(DEFAULTS.bindAddress); setBindPort(DEFAULTS.bindPort);
    setPublicAddress(DEFAULTS.publicAddress); setPublicPort(DEFAULTS.publicPort);
    setA2sAddress(DEFAULTS.a2sAddress); setA2sPort(DEFAULTS.a2sPort);
    setRconAddress(DEFAULTS.rconAddress); setRconPort(DEFAULTS.rconPort);
    setRconPassword(DEFAULTS.rconPassword); setRconMaxClients(DEFAULTS.rconMaxClients);
    setRconPermission(DEFAULTS.rconPermission); setRconWhitelist([]); setRconBlacklist([]);
    setServerName(DEFAULTS.serverName); setPassword(DEFAULTS.password);
    setPasswordAdmin(DEFAULTS.passwordAdmin); setAdmins([]);
    setScenarioId(DEFAULTS.scenarioId); setMaxPlayers(DEFAULTS.maxPlayers);
    setVisible(DEFAULTS.visible); setCrossPlatform(DEFAULTS.crossPlatform);
    setSupportedPlatforms([...DEFAULTS.supportedPlatforms]); setModsRequired(DEFAULTS.modsRequired);
    setServerMaxViewDistance(DEFAULTS.serverMaxViewDistance); setServerMinGrassDistance(DEFAULTS.serverMinGrassDistance);
    setNetworkViewDistance(DEFAULTS.networkViewDistance); setDisableThirdPerson(DEFAULTS.disableThirdPerson);
    setFastValidation(DEFAULTS.fastValidation); setBattlEye(DEFAULTS.battlEye);
    setVonDisableUI(DEFAULTS.vonDisableUI); setVonDisableDirectSpeechUI(DEFAULTS.vonDisableDirectSpeechUI);
    setVonCanTransmitCrossFaction(DEFAULTS.vonCanTransmitCrossFaction); setMissionHeader(DEFAULTS.missionHeader);
    setLobbyPlayerSynchronise(DEFAULTS.lobbyPlayerSynchronise); setDisableNavmeshStreaming(DEFAULTS.disableNavmeshStreaming);
    setDisableServerShutdown(DEFAULTS.disableServerShutdown); setDisableCrashReporter(DEFAULTS.disableCrashReporter);
    setDisableAI(DEFAULTS.disableAI); setPlayerSaveTime(DEFAULTS.playerSaveTime);
    setAiLimit(DEFAULTS.aiLimit); setSlotReservationTimeout(DEFAULTS.slotReservationTimeout);
    setJoinQueue(DEFAULTS.joinQueue);
    setMods([]);
    toast.info("Config reset to defaults");
  };

  // ─── Tab navigation ──────────────────────────────────────────────────────

  const tabIndex = configTabs.findIndex((t) => t.id === activeTab);
  const canPrev = tabIndex > 0;
  const canNext = tabIndex < configTabs.length - 1;

  const severityColor = (s: string) => {
    if (s === "high") return "bg-destructive/20 text-destructive border-destructive/30";
    if (s === "medium") return "bg-warning/20 text-warning border-warning/30";
    return "bg-primary/20 text-primary border-primary/30";
  };

  // ─── Tab Content ─────────────────────────────────────────────────────────

  const renderTabContent = () => {
    switch (activeTab) {
      case "base":
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Network className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Base Configuration</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldRow label="Bind Address" tooltip="IP address the server will listen on. Use 0.0.0.0 for all interfaces." helpKey="bindAddress" onReset={() => setBindAddress(DEFAULTS.bindAddress)}>
                <Input value={bindAddress} onChange={(e) => setBindAddress(e.target.value)} className="font-mono text-sm" placeholder="0.0.0.0" />
              </FieldRow>
              <FieldRow label="Bind Port" tooltip="UDP port for game traffic." helpKey="bindPort" onReset={() => setBindPort(DEFAULTS.bindPort)}>
                <Input type="number" min={1} max={65535} value={bindPort} onChange={(e) => setBindPort(Number(e.target.value))} className="font-mono text-sm" />
              </FieldRow>
              <FieldRow label="Public Address" tooltip="Public IP shown in server browser. Leave empty for auto-detection." helpKey="publicAddress" onReset={() => setPublicAddress(DEFAULTS.publicAddress)}>
                <Input value={publicAddress} onChange={(e) => setPublicAddress(e.target.value)} placeholder="Auto-detected if empty" className="font-mono text-sm" />
              </FieldRow>
              <FieldRow label="Public Port" tooltip="Public port shown in server browser." helpKey="publicPort" onReset={() => setPublicPort(DEFAULTS.publicPort)}>
                <Input type="number" min={1} max={65535} value={publicPort} onChange={(e) => setPublicPort(Number(e.target.value))} className="font-mono text-sm" />
              </FieldRow>
            </div>
          </div>
        );

      case "a2s":
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">A2S Query Configuration</h3>
            </div>
            <p className="text-xs text-muted-foreground">Steam A2S query protocol settings for server browser integration.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldRow label="A2S Address" tooltip="Address for Steam A2S queries. Leave empty for bind address." helpKey="a2s" onReset={() => setA2sAddress(DEFAULTS.a2sAddress)}>
                <Input value={a2sAddress} onChange={(e) => setA2sAddress(e.target.value)} placeholder="Same as bind address" className="font-mono text-sm" />
              </FieldRow>
              <FieldRow label="A2S Port" tooltip="Port for Steam A2S queries. Default: 17777." helpKey="a2s" onReset={() => setA2sPort(DEFAULTS.a2sPort)}>
                <Input type="number" min={1} max={65535} value={a2sPort} onChange={(e) => setA2sPort(Number(e.target.value))} className="font-mono text-sm" />
              </FieldRow>
            </div>
          </div>
        );

      case "rcon":
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">RCON Configuration</h3>
            </div>
            <p className="text-xs text-muted-foreground">Remote console access for server management.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldRow label="RCON Address" tooltip="Address for RCON connections." helpKey="rcon" onReset={() => setRconAddress(DEFAULTS.rconAddress)}>
                <Input value={rconAddress} onChange={(e) => setRconAddress(e.target.value)} placeholder="xxx.xxx.xxx.xxx" className="font-mono text-sm" />
              </FieldRow>
              <FieldRow label="RCON Port" tooltip="Port for RCON connections. Default: 19999." helpKey="rcon" onReset={() => setRconPort(DEFAULTS.rconPort)}>
                <Input type="number" min={1} max={65535} value={rconPort} onChange={(e) => setRconPort(Number(e.target.value))} className="font-mono text-sm" />
              </FieldRow>
              <FieldRow label="RCON Password" tooltip="Password required for RCON access." helpKey="rcon" onReset={() => setRconPassword(DEFAULTS.rconPassword)}>
                <Input type="password" value={rconPassword} onChange={(e) => setRconPassword(e.target.value)} placeholder="Set a strong password" />
              </FieldRow>
              <FieldRow label="Max Clients" tooltip="Maximum concurrent RCON connections." helpKey="rcon" onReset={() => setRconMaxClients(DEFAULTS.rconMaxClients)}>
                <Input type="number" min={1} max={64} value={rconMaxClients} onChange={(e) => setRconMaxClients(Number(e.target.value))} />
              </FieldRow>
            </div>
            <FieldRow label="Permission" tooltip="RCON permission level: admin (full) or monitor (read-only)." helpKey="rcon" onReset={() => setRconPermission(DEFAULTS.rconPermission)}>
              <Select value={rconPermission} onValueChange={(v) => setRconPermission(v as "admin" | "monitor")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (Full Access)</SelectItem>
                  <SelectItem value="monitor">Monitor (Read Only)</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            {/* Whitelist */}
            <div className="space-y-2">
              <FieldLabel tooltip="IP addresses allowed to connect via RCON." helpKey="rcon">Whitelist</FieldLabel>
              <div className="flex gap-2">
                <Input value={newWhitelist} onChange={(e) => setNewWhitelist(e.target.value)} placeholder="IP address" className="font-mono text-sm" />
                <Button size="sm" variant="outline" onClick={() => { if (newWhitelist.trim()) { setRconWhitelist([...rconWhitelist, newWhitelist.trim()]); setNewWhitelist(""); } }}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {rconWhitelist.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {rconWhitelist.map((ip, i) => (
                    <Badge key={i} variant="secondary" className="font-mono text-xs gap-1">
                      {ip}
                      <button onClick={() => setRconWhitelist(rconWhitelist.filter((_, j) => j !== i))} className="hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Blacklist */}
            <div className="space-y-2">
              <FieldLabel tooltip="IP addresses blocked from RCON access." helpKey="rcon">Blacklist</FieldLabel>
              <div className="flex gap-2">
                <Input value={newBlacklist} onChange={(e) => setNewBlacklist(e.target.value)} placeholder="IP address" className="font-mono text-sm" />
                <Button size="sm" variant="outline" onClick={() => { if (newBlacklist.trim()) { setRconBlacklist([...rconBlacklist, newBlacklist.trim()]); setNewBlacklist(""); } }}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {rconBlacklist.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {rconBlacklist.map((ip, i) => (
                    <Badge key={i} variant="destructive" className="font-mono text-xs gap-1">
                      {ip}
                      <button onClick={() => setRconBlacklist(rconBlacklist.filter((_, j) => j !== i))} className="hover:text-foreground">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "game":
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Gamepad2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Game Configuration</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldRow label="Server Name" tooltip="Name displayed in the server browser." helpKey="name" onReset={() => setServerName(DEFAULTS.serverName)}>
                <Input value={serverName} onChange={(e) => setServerName(e.target.value)} />
              </FieldRow>
              <FieldRow label="Max Players" tooltip="Maximum number of players." helpKey="maxPlayers" onReset={() => setMaxPlayers(DEFAULTS.maxPlayers)}>
                <Input type="number" min={1} max={256} value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} />
              </FieldRow>
              <FieldRow label="Password" tooltip="Password required to join." helpKey="password" onReset={() => setPassword(DEFAULTS.password)}>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave empty for no password" />
              </FieldRow>
              <FieldRow label="Admin Password" tooltip="Password for admin access." helpKey="passwordAdmin" onReset={() => setPasswordAdmin(DEFAULTS.passwordAdmin)}>
                <Input type="password" value={passwordAdmin} onChange={(e) => setPasswordAdmin(e.target.value)} placeholder="Admin password" />
              </FieldRow>
            </div>

            <FieldRow label="Scenario ID" tooltip="Resource path to the scenario/mission." helpKey="scenarioId" onReset={() => setScenarioId(DEFAULTS.scenarioId)}>
              <Select value={scenarioId} onValueChange={setScenarioId}>
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue placeholder="Select a scenario" />
                </SelectTrigger>
                <SelectContent>
                  {OFFICIAL_SCENARIOS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} className="font-mono text-xs mt-1.5" placeholder="Or type a custom scenario ID" />
            </FieldRow>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <SwitchRow label="Visible" tooltip="Show in public server browser." helpKey="visible" checked={visible} onCheckedChange={setVisible} onReset={() => setVisible(DEFAULTS.visible)} />
              <SwitchRow label="Cross-Platform" tooltip="Allow Xbox and PlayStation players." helpKey="crossPlatform" checked={crossPlatform} onCheckedChange={setCrossPlatform} onReset={() => setCrossPlatform(DEFAULTS.crossPlatform)} />
              <SwitchRow label="Mods Required" tooltip="Require clients to have all mods." helpKey="modsRequiredByDefault" checked={modsRequired} onCheckedChange={setModsRequired} onReset={() => setModsRequired(DEFAULTS.modsRequired)} />
            </div>

            <div className="space-y-2">
              <FieldLabel tooltip="Platforms that can connect." helpKey="supportedPlatforms">Supported Platforms</FieldLabel>
              <div className="flex gap-2 flex-wrap">
                {["PLATFORM_PC", "PLATFORM_XBL", "PLATFORM_PSN"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setSupportedPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${
                      supportedPlatforms.includes(p)
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case "admins":
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Admin Management</h3>
            </div>
            <p className="text-xs text-muted-foreground">Add admin player UIDs. Admins have elevated in-game privileges.</p>
            <div className="flex gap-2">
              <Input
                value={newAdmin}
                onChange={(e) => setNewAdmin(e.target.value)}
                placeholder="Player UID (e.g. 76561198012345678)"
                className="font-mono text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newAdmin.trim()) {
                    setAdmins([...admins, newAdmin.trim()]);
                    setNewAdmin("");
                  }
                }}
              />
              <Button variant="outline" onClick={() => { if (newAdmin.trim()) { setAdmins([...admins, newAdmin.trim()]); setNewAdmin(""); } }}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {admins.length > 0 ? (
              <div className="space-y-1.5">
                {admins.map((uid, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border border-border p-2.5 bg-muted/30">
                    <span className="font-mono text-xs text-foreground">{uid}</span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setAdmins(admins.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">No admins configured</p>
                <p className="text-xs text-muted-foreground mt-1">Add player UIDs above to grant admin privileges</p>
              </div>
            )}
          </div>
        );

      case "properties":
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Game Properties</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldRow label="Server Max View Distance" tooltip="Maximum view distance in meters." helpKey="serverMaxViewDistance" onReset={() => setServerMaxViewDistance(DEFAULTS.serverMaxViewDistance)}>
                <Input type="number" value={serverMaxViewDistance} onChange={(e) => setServerMaxViewDistance(Number(e.target.value))} />
              </FieldRow>
              <FieldRow label="Server Min Grass Distance" tooltip="Minimum grass render distance." helpKey="serverMinGrassDistance" onReset={() => setServerMinGrassDistance(DEFAULTS.serverMinGrassDistance)}>
                <Input type="number" value={serverMinGrassDistance} onChange={(e) => setServerMinGrassDistance(Number(e.target.value))} />
              </FieldRow>
              <FieldRow label="Network View Distance" tooltip="Network replication view distance." helpKey="networkViewDistance" onReset={() => setNetworkViewDistance(DEFAULTS.networkViewDistance)}>
                <Input type="number" value={networkViewDistance} onChange={(e) => setNetworkViewDistance(Number(e.target.value))} />
              </FieldRow>
              <FieldRow label="Mission Header" tooltip="JSON object (e.g. m_sName, m_iStartingHours) or plain text (stored as m_sDetails)." helpKey="missionHeader" onReset={() => setMissionHeader(DEFAULTS.missionHeader)}>
                <Textarea value={missionHeader} onChange={(e) => setMissionHeader(e.target.value)} placeholder='{"m_sName": "My Server", "m_iStartingHours": 7}' className="font-mono text-xs min-h-[80px]" />
              </FieldRow>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <SwitchRow label="Disable Third Person" helpKey="disableThirdPerson" tooltip="Force first-person view only." checked={disableThirdPerson} onCheckedChange={setDisableThirdPerson} onReset={() => setDisableThirdPerson(DEFAULTS.disableThirdPerson)} />
              <SwitchRow label="Fast Validation" helpKey="fastValidation" tooltip="Fast addon validation on start." checked={fastValidation} onCheckedChange={setFastValidation} onReset={() => setFastValidation(DEFAULTS.fastValidation)} />
              <SwitchRow label="BattlEye" helpKey="battlEye" tooltip="Enable BattlEye anti-cheat." checked={battlEye} onCheckedChange={setBattlEye} onReset={() => setBattlEye(DEFAULTS.battlEye)} />
              <SwitchRow label="VON Disable UI" helpKey="vonDisableUI" tooltip="Hide VON UI indicator." checked={vonDisableUI} onCheckedChange={setVonDisableUI} onReset={() => setVonDisableUI(DEFAULTS.vonDisableUI)} />
              <SwitchRow label="VON Disable Direct Speech UI" helpKey="vonDisableDirectSpeechUI" tooltip="Hide direct speech UI." checked={vonDisableDirectSpeechUI} onCheckedChange={setVonDisableDirectSpeechUI} onReset={() => setVonDisableDirectSpeechUI(DEFAULTS.vonDisableDirectSpeechUI)} />
              <SwitchRow label="VON Cross-Faction" helpKey="vonCanTransmitCrossFaction" tooltip="Allow voice between factions." checked={vonCanTransmitCrossFaction} onCheckedChange={setVonCanTransmitCrossFaction} onReset={() => setVonCanTransmitCrossFaction(DEFAULTS.vonCanTransmitCrossFaction)} />
            </div>
          </div>
        );

      case "operating":
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <ServerCog className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Operating Configuration</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <SwitchRow label="Lobby Player Sync" helpKey="lobbyPlayerSynchronise" tooltip="Sync player list in lobby." checked={lobbyPlayerSynchronise} onCheckedChange={setLobbyPlayerSynchronise} onReset={() => setLobbyPlayerSynchronise(DEFAULTS.lobbyPlayerSynchronise)} />
              <SwitchRow label="Disable Server Shutdown" helpKey="disableServerShutdown" tooltip="Prevent empty-server auto-shutdown." checked={disableServerShutdown} onCheckedChange={setDisableServerShutdown} onReset={() => setDisableServerShutdown(DEFAULTS.disableServerShutdown)} />
              <SwitchRow label="Disable Crash Reporter" helpKey="disableCrashReporter" tooltip="Disable crash reporting for perf." checked={disableCrashReporter} onCheckedChange={setDisableCrashReporter} onReset={() => setDisableCrashReporter(DEFAULTS.disableCrashReporter)} />
              <SwitchRow label="Disable AI" helpKey="disableAI" tooltip="Disable all server-side AI." checked={disableAI} onCheckedChange={setDisableAI} onReset={() => setDisableAI(DEFAULTS.disableAI)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldRow label="Player Save Time" tooltip="Interval in seconds for saving player data." helpKey="playerSaveTime" onReset={() => setPlayerSaveTime(DEFAULTS.playerSaveTime)}>
                <Input type="number" value={playerSaveTime} onChange={(e) => setPlayerSaveTime(Number(e.target.value))} />
              </FieldRow>
              <FieldRow label="AI Limit" tooltip="Maximum number of AI entities. -1 for unlimited." helpKey="aiLimit" onReset={() => setAiLimit(DEFAULTS.aiLimit)}>
                <Input type="number" value={aiLimit} onChange={(e) => setAiLimit(Number(e.target.value))} />
              </FieldRow>
              <FieldRow label="Slot Reservation Timeout" tooltip="Seconds to hold a slot for reconnection." helpKey="slotReservationTimeout" onReset={() => setSlotReservationTimeout(DEFAULTS.slotReservationTimeout)}>
                <Input type="number" value={slotReservationTimeout} onChange={(e) => setSlotReservationTimeout(Number(e.target.value))} />
              </FieldRow>
              <FieldRow label="Join Queue (maxSize)" tooltip="Max players in join queue (0 = disabled, max 50)." helpKey="joinQueue" onReset={() => setJoinQueue(DEFAULTS.joinQueue)}>
                <Input type="number" min={0} max={50} value={joinQueue} onChange={(e) => setJoinQueue(Number(e.target.value))} />
              </FieldRow>
            </div>
            <FieldRow label="Disable Navmesh Streaming" tooltip="List of worlds to disable navmesh streaming (one per line)." helpKey="disableNavmeshStreaming" onReset={() => setDisableNavmeshStreaming(DEFAULTS.disableNavmeshStreaming)}>
              <Textarea
                value={disableNavmeshStreaming}
                onChange={(e) => setDisableNavmeshStreaming(e.target.value)}
                placeholder="World names, one per line"
                className="font-mono text-xs min-h-[80px]"
              />
            </FieldRow>
          </div>
        );

      case "mods":
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Mod Management</h3>
            </div>
            <p className="text-xs text-muted-foreground">Add Workshop mods with their ID, name, version, and required status.</p>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMods([...mods, { modId: "", name: "", version: "", required: false }])}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Mod
            </Button>

            {mods.length > 0 ? (
              <div className="space-y-3">
                {mods.map((mod, i) => (
                  <div key={i} className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Mod #{i + 1}</span>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setMods(mods.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-foreground">Mod ID</Label>
                        <Input
                          value={mod.modId}
                          onChange={(e) => { const n = [...mods]; n[i] = { ...n[i], modId: e.target.value }; setMods(n); }}
                          placeholder="591AF5BDA9F7CE8B"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-foreground">Name</Label>
                        <Input
                          value={mod.name}
                          onChange={(e) => { const n = [...mods]; n[i] = { ...n[i], name: e.target.value }; setMods(n); }}
                          placeholder="Mod name"
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-foreground">Version</Label>
                        <Input
                          value={mod.version}
                          onChange={(e) => { const n = [...mods]; n[i] = { ...n[i], version: e.target.value }; setMods(n); }}
                          placeholder="Optional"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-md border border-border p-2.5 bg-muted/30">
                        <Label className="text-xs text-foreground">Required</Label>
                        <Switch
                          checked={mod.required}
                          onCheckedChange={(v) => { const n = [...mods]; n[i] = { ...n[i], required: v }; setMods(n); }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border p-6 text-center">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No mods configured</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Add Mod" to add Workshop mods</p>
              </div>
            )}

            {mods.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {mods.length} mod(s) configured
              </div>
            )}
          </div>
        );
    }
  };

  const jsonLines = configJson.split("\n");

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={200}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative"
      >
        {isDragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg">
            <div className="text-center space-y-2">
              <Upload className="h-10 w-10 text-primary mx-auto animate-bounce" />
              <p className="text-lg font-semibold text-foreground">Drop config.json here</p>
              <p className="text-sm text-muted-foreground">Release to import your configuration</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4">
          {/* Left: Editor */}
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">Config Editor</h2>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-mono">{configFile}</p>
                  {loadStatus === "loading" && (
                    <span className="text-xs text-muted-foreground">Loading…</span>
                  )}
                  {loadStatus === "loaded" && (
                    <span className="text-xs text-primary">Loaded from file</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !configFile?.trim()}
                  className="h-8 text-xs"
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowStartupParams(!showStartupParams)} className="h-8 text-xs">
                  <Terminal className="h-3.5 w-3.5 mr-1" /> Startup Params
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground hover:text-foreground h-8">
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset
                </Button>
              </div>
            </div>

            {/* Startup Parameters */}
            {showStartupParams && (
              <div className="rounded-lg border border-primary/30 bg-sidebar p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">Startup Parameters</h3>
                </div>
                <div className="bg-background rounded-md p-3 border border-border">
                  <code className="text-xs font-mono text-primary break-all">{startupParams}</code>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { navigator.clipboard.writeText(startupParams); toast.success("Startup parameters copied!"); }}>
                  <Copy className="h-3 w-3 mr-1" /> Copy Command
                </Button>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
              {configTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors rounded-t-md ${
                      isActive
                        ? "text-primary border-b-2 border-primary bg-secondary/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="rounded-lg border border-border bg-card p-5">
              {renderTabContent()}
              <div className="flex justify-between mt-6 pt-4 border-t border-border">
                <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => setActiveTab(configTabs[tabIndex - 1].id)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={!canNext} onClick={() => setActiveTab(configTabs[tabIndex + 1].id)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* AI Suggestions */}
            {suggestions.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                <button onClick={() => setSuggestionsExpanded(!suggestionsExpanded)} className="flex items-center gap-2 w-full">
                  <Lightbulb className="h-4 w-4 text-warning" />
                  <h3 className="font-semibold text-foreground text-sm">AI Configuration Insights</h3>
                  <Badge variant="secondary" className="text-xs">{suggestions.length} suggestions</Badge>
                  <span className="ml-auto">
                    {suggestionsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </span>
                </button>
                {suggestionsExpanded && (
                  <div className="space-y-3">
                    {suggestions.map((s, i) => (
                      <div key={i} className="rounded-md border border-border bg-muted/20 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          {s.severity === "high" ? <AlertTriangle className="h-4 w-4 text-destructive" /> : s.severity === "medium" ? <Shield className="h-4 w-4 text-warning" /> : <Zap className="h-4 w-4 text-primary" />}
                          <span className="font-medium text-foreground text-sm">{s.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${severityColor(s.severity)}`}>{s.severity}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                        <p className="text-xs text-muted-foreground"><span className="text-foreground font-medium">Impact:</span> {s.impact}</p>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10" onClick={() => { s.apply(); toast.success(`Applied: ${s.fixLabel}`); }}>
                          <Zap className="h-3 w-3 mr-1" /> Apply Fix
                          <span className="ml-1 text-muted-foreground">{s.fixLabel}</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: JSON Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">config.json Preview</h3>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={handleImport} className="h-7 text-xs">
                  <Upload className="h-3 w-3 mr-1" /> Import
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 text-xs">
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
                <Button size="sm" onClick={handleExport} className="h-7 text-xs">
                  <Download className="h-3 w-3 mr-1" /> Export
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-sidebar overflow-auto max-h-[600px] xl:max-h-[calc(100vh-200px)]">
              <pre className="p-4 text-xs font-mono leading-relaxed">
                {jsonLines.map((line, i) => (
                  <div key={i} className="flex">
                    <span className="inline-block w-8 text-right mr-4 text-muted-foreground select-none">{i + 1}</span>
                    <span>{colorizeJson(line)}</span>
                  </div>
                ))}
              </pre>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Drag and drop a <span className="text-primary font-medium">config.json</span> file anywhere to import
            </p>
            <div className="flex items-center justify-center gap-4 text-xs">
              <button onClick={() => setShowStartupParams(!showStartupParams)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                <Terminal className="h-3.5 w-3.5" /> Show Startup Parameters
              </button>
              <a href={WIKI_BASE} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                <ExternalLink className="h-3.5 w-3.5" /> Documentation
              </a>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

function colorizeJson(line: string) {
  return line
    .replace(/"([^"]+)":/g, '<key>"$1"</key>:')
    .split(/(<key>"[^"]*"<\/key>)/)
    .map((part, i) => {
      if (part.startsWith("<key>")) {
        const key = part.replace(/<\/?key>/g, "");
        return <span key={i} className="text-primary">{key}</span>;
      }
      return part.split(/(true|false|null|\d+)/).map((sub, j) => {
        if (sub === "true" || sub === "false" || sub === "null") return <span key={`${i}-${j}`} className="text-warning">{sub}</span>;
        if (/^\d+$/.test(sub)) return <span key={`${i}-${j}`} className="text-accent-foreground">{sub}</span>;
        return <span key={`${i}-${j}`} className="text-muted-foreground">{sub}</span>;
      });
    });
}

export default ConfigEditorPanel;
