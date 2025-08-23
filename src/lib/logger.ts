// superleichter Logger mit Level, Puffer & Subscriber (UI-Panel)
export type LogLevel = "error" | "warn" | "info" | "debug" | "trace";
const ORDER: Record<LogLevel, number> = { error:0, warn:1, info:2, debug:3, trace:4 };

let level: LogLevel =
  (import.meta as any)?.env?.VITE_LOG_LEVEL ||
  (typeof process !== "undefined" && (process as any)?.env?.NEXT_PUBLIC_LOG_LEVEL) ||
  (localStorage.getItem("log-level") as LogLevel) ||
  "warn";

export function setLogLevel(l: LogLevel) {
  level = l; localStorage.setItem("log-level", l);
  log("info", "logger", `log level set to ${l}`);
}

type Entry = { ts: string; level: LogLevel; scope: string; msg: string; data?: any };
const buffer: Entry[] = [];
const subscribers = new Set<(e: Entry)=>void>();
export function subscribe(fn:(e:Entry)=>void){ subscribers.add(fn); return ()=>subscribers.delete(fn); }
export function getBuffer(){ return buffer.slice(-500); } // Ringpuffer (letzte 500)

function enabled(l: LogLevel){ return ORDER[l] <= ORDER[level]; }
function emit(e: Entry){
  buffer.push(e); if (buffer.length>1000) buffer.shift();
  subscribers.forEach(s=>s(e));
}

export function log(l: LogLevel, scope: string, msg: string, data?: any){
  if (!enabled(l)) return;
  const e: Entry = { ts: new Date().toISOString(), level: l, scope, msg, data };
  // Wichtige Logs auch als info ausgeben, damit sie nicht an "Verbose" scheitern
  const line = `%c[${e.level.toUpperCase()}] ${scope} – ${msg}`;
  const css = "color:#888";
  switch (l) {
    case "error": break;
    case "warn":  break;
    case "info":  break;
    case "debug": break;
    default:      break;
  }
  emit(e);
}

// Bequeme Shortcuts
export const logger = {
  setLevel: setLogLevel,
  error: (s:string,m:string,d?:any)=>log("error",s,m,d),
  warn:  (s:string,m:string,d?:any)=>log("warn", s,m,d),
  info:  (s:string,m:string,d?:any)=>log("info", s,m,d),
  debug: (s:string,m:string,d?:any)=>log("debug",s,m,d),
  trace: (s:string,m:string,d?:any)=>log("trace",s,m,d),
};

// Global Logger entfernt
