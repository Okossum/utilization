import React, { useEffect, useState } from "react";
import { subscribe, getBuffer, logger, setLogLevel, LogLevel } from "../lib/logger";

export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState(getBuffer());
  const [lvl, setLvl] = useState<LogLevel>(
    (localStorage.getItem("log-level") as LogLevel) || "info"
  );

  useEffect(()=>{
    const unsubscribe = subscribe(e => setEntries(prev => [...prev, e].slice(-500)));
    return unsubscribe;
  }, []);

  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "l") {
        const next = lvl === "debug" ? "info" : "debug";
        setLvl(next); setLogLevel(next);
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lvl]);

  return (
    <>
      {/* ✅ Sichtbarer Test-Button */}
      <button 
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          right: 12,
          top: 12,
          zIndex: 99999,
          padding: "8px 16px",
          background: "blue",
          color: "white",
          border: "none",
          borderRadius: "8px"
        }}
      >
        Debug Panel {open ? "ON" : "OFF"}
      </button>

      {/* Debug Panel */}
      <div style={{
        position: "fixed", right: 12, bottom: 12, width: 420,
        background: "white", border: "1px solid #ddd", borderRadius: 12,
        boxShadow: "0 6px 24px rgba(0,0,0,.15)", fontFamily: "ui-monospace, monospace",
        display: open ? "block" : "none", zIndex: 99999, maxHeight: "40vh", overflow: "auto"
      }}>
        <div style={{display:"flex", alignItems:"center", padding:"8px 12px", borderBottom:"1px solid #eee"}}>
          <strong style={{flex:1}}>Debug Panel</strong>
          <label style={{marginRight:8}}>Level:</label>
          <select value={lvl} onChange={e=>{ const v = e.target.value as LogLevel; setLvl(v); setLogLevel(v); }}>
            {["error","warn","info","debug","trace"].map(l=><option key={l} value={l}>{l}</option>)}
          </select>
          <button onClick={()=>setOpen(false)} style={{marginLeft:8}}>×</button>
        </div>
        <div style={{padding:12}}>
          {entries.slice(-200).map((e,i)=>(
            <div key={i} style={{fontSize:12, marginBottom:6, whiteSpace:"pre-wrap"}}>
              <span style={{color:"#999"}}>{e.ts.replace("T"," ").replace("Z","")}</span>{" "}
              <span>[{e.level.toUpperCase()}]</span>{" "}
              <span style={{color:"#555"}}>{e.scope}</span> — {e.msg}
              {e.data ? <pre style={{margin:0, background:"#fafafa", padding:"6px 8px", border:"1px solid #eee", borderRadius:6}}>{JSON.stringify(e.data, null, 2)}</pre> : null}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
