import { useState, useEffect, useRef } from "react";
import { loadState, saveState, subscribeToChanges } from "./storage.js";

const DEFAULT_INITIATIVES = [
  { id: 1, name: "AI Monetization", description: "Plan for AI monetization across Faria products.", deadline: "2026-06-30", owner: "Steven",
    milestones: [
      { label: "Competitive pricing analysis", target: "2026-05-09", done: false },
      { label: "Draft tiering and packaging model", target: "2026-05-23", done: false },
      { label: "Review with Daniel and stakeholders", target: "2026-06-06", done: false },
      { label: "Final monetization plan delivered", target: "2026-06-30", done: false },
    ], status: "in-progress" },
  { id: 2, name: "Faria Product Vision", description: 'Define what Faria is across our product suite so anyone can answer "What\'s Faria?"', deadline: "2026-06-30", owner: "Steven",
    milestones: [
      { label: "Audit current product positioning", target: "2026-05-09", done: false },
      { label: "Stakeholder interviews (Sales, CE, Marketing)", target: "2026-05-23", done: false },
      { label: "Draft vision narrative and PPT", target: "2026-06-13", done: false },
      { label: "Present and align with leadership", target: "2026-06-30", done: false },
    ], status: "in-progress" },
  { id: 3, name: "Prioritization Framework", description: "How we go about prioritizing features and initiatives across products.", deadline: "2026-05-31", owner: "Steven",
    milestones: [
      { label: "Research frameworks (RICE, WSJF, etc.)", target: "2026-05-05", done: false },
      { label: "Draft Faria-specific scoring model", target: "2026-05-16", done: false },
      { label: "Review with PMs", target: "2026-05-23", done: false },
      { label: "Pilot on one product backlog", target: "2026-05-31", done: false },
    ], status: "in-progress" },
  { id: 4, name: "Customer Discovery", description: "Establish a repeatable process for gathering and synthesizing customer insights across products.", deadline: "2026-06-30", owner: "Steven",
    milestones: [
      { label: "Audit current discovery practices per product", target: "2026-05-16", done: false },
      { label: "Define interview guides and templates", target: "2026-06-06", done: false },
      { label: "Run first cross-product discovery sprint", target: "2026-06-20", done: false },
      { label: "Document process and share playbook", target: "2026-06-30", done: false },
    ], status: "not-started" },
  { id: 5, name: "Feature Requests", description: "Unified intake and triage process for feature requests across the product suite.", deadline: "2026-06-30", owner: "Steven",
    milestones: [
      { label: "Map current intake channels per product", target: "2026-05-16", done: false },
      { label: "Design unified request form and triage flow", target: "2026-05-30", done: false },
      { label: "Tool setup and pilot rollout", target: "2026-06-13", done: false },
      { label: "Full rollout and team training", target: "2026-06-30", done: false },
    ], status: "not-started" },
  { id: 6, name: "Product Communication", description: "Consistent communication of what we do, why, and when, both internally and externally.", deadline: "2026-06-30", owner: "Steven",
    milestones: [
      { label: "Audit current comms channels and gaps", target: "2026-05-09", done: false },
      { label: "Design internal update cadence and template", target: "2026-05-23", done: false },
      { label: "Draft external-facing comms strategy", target: "2026-06-13", done: false },
      { label: "First full-cycle comms delivered", target: "2026-06-30", done: false },
    ], status: "not-started" },
  { id: 7, name: "Product Roadmap", description: "A visible roadmap both internally and externally that shows what's planned, in progress, and shipped.", deadline: "2026-06-30", owner: "Steven",
    milestones: [
      { label: "Evaluate roadmap tooling options", target: "2026-05-09", done: false },
      { label: "Define roadmap structure and taxonomy", target: "2026-05-23", done: false },
      { label: "Build first version with current plans", target: "2026-06-13", done: false },
      { label: "Publish internally and gather feedback", target: "2026-06-30", done: false },
    ], status: "not-started" },
];

const STATUS_OPTIONS = [
  { value: "not-started", label: "Not Started", color: "#a78baf" },
  { value: "in-progress", label: "In Progress", color: "#d94f8a" },
  { value: "blocked", label: "Blocked", color: "#c0392b" },
  { value: "complete", label: "Complete", color: "#27ae60" },
];
function sC(s) { return STATUS_OPTIONS.find(o => o.value === s)?.color || "#a78baf"; }

const TL_S = new Date("2026-04-27"), TL_E = new Date("2026-12-31");
const TD = Math.ceil((TL_E - TL_S) / 864e5);
function dP(ds) { return Math.max(0, Math.min(100, (Math.ceil((new Date(ds) - TL_S) / 864e5) / TD) * 100)); }
function fmt(d) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

function moveUp(a, i) { if (i <= 0) return a; const b = [...a]; [b[i-1], b[i]] = [b[i], b[i-1]]; return b; }
function moveDn(a, i) { if (i >= a.length-1) return a; const b = [...a]; [b[i], b[i+1]] = [b[i+1], b[i]]; return b; }

function monthMarkers() {
  const ms = []; let d = new Date(TL_S); d.setDate(1); d.setMonth(d.getMonth() + 1);
  while (d <= TL_E) { ms.push({ label: d.toLocaleDateString("en-US", { month: "short" }), pct: dP(d.toISOString().slice(0, 10)) }); d.setMonth(d.getMonth() + 1); }
  return ms;
}

function Ring({ pct, size = 44, stroke = 4.5, color }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, dash = c * (pct / 100);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.4s ease" }} />
    </svg>
  );
}

const inp = { background: "rgba(0,0,0,0.3)", color: "#f5ede8", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "7px 11px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const bt = (bg) => ({ padding: "5px 12px", borderRadius: 6, border: "none", background: bg || "rgba(255,255,255,0.12)", color: "#f5ede8", fontSize: 12, fontWeight: 600, cursor: "pointer" });
const lb = { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 5 };

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "rgba(40,20,50,0.97)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "28px 32px", maxWidth: 500, width: "100%", maxHeight: "85vh", overflowY: "auto", backdropFilter: "blur(12px)" }}>
        {children}
      </div>
    </div>
  );
}

function MsEd({ milestones, onChange, color }) {
  const [eI, setEI] = useState(null);
  const [eL, setEL] = useState(""); const [eD, setED] = useState("");
  const [adding, setAdding] = useState(false);
  const [nL, setNL] = useState(""); const [nD, setND] = useState("");
  return (
    <div>
      {milestones.map((m, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {eI === i ? (
            <>
              <input value={eL} onChange={e => setEL(e.target.value)} style={{ ...inp, flex: 1, fontSize: 12 }} />
              <input type="date" value={eD} onChange={e => setED(e.target.value)} style={{ ...inp, width: 130, fontSize: 12 }} />
              <button onClick={() => { if (eL.trim() && eD) { onChange(milestones.map((mm,j) => j === i ? { ...mm, label: eL.trim(), target: eD } : mm)); setEI(null); }}} style={bt("#27ae60")}>OK</button>
              <button onClick={() => setEI(null)} style={bt()}>X</button>
            </>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, flexShrink: 0 }}>
                <button onClick={e => { e.stopPropagation(); onChange(moveUp(milestones, i)); }} style={{ background: "none", border: "none", color: i === 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.35)", cursor: i === 0 ? "default" : "pointer", fontSize: 9, padding: 0, lineHeight: 1 }}>&#9650;</button>
                <button onClick={e => { e.stopPropagation(); onChange(moveDn(milestones, i)); }} style={{ background: "none", border: "none", color: i === milestones.length-1 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.35)", cursor: i === milestones.length-1 ? "default" : "pointer", fontSize: 9, padding: 0, lineHeight: 1 }}>&#9660;</button>
              </div>
              <div onClick={e => { e.stopPropagation(); onChange(milestones.map((mm,j) => j === i ? { ...mm, done: !mm.done } : mm)); }}
                style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: "pointer", border: `2px solid ${m.done ? color : "rgba(255,255,255,0.25)"}`, background: m.done ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                {m.done && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{ fontSize: 13, color: m.done ? "rgba(255,255,255,0.3)" : "#f5ede8", textDecoration: m.done ? "line-through" : "none", flex: 1 }}>{m.label}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>{fmt(m.target)}</span>
              <button onClick={e => { e.stopPropagation(); setEI(i); setEL(m.label); setED(m.target); }} style={{ ...bt(), padding: "3px 7px", fontSize: 10 }}>Edit</button>
              <button onClick={e => { e.stopPropagation(); onChange(milestones.filter((_,j) => j !== i)); }} style={{ ...bt("rgba(192,57,43,0.4)"), padding: "3px 7px", fontSize: 10 }}>Del</button>
            </>
          )}
        </div>
      ))}
      {adding ? (
        <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
          <input placeholder="Milestone name" value={nL} onChange={e => setNL(e.target.value)} style={{ ...inp, flex: 1, fontSize: 12 }} />
          <input type="date" value={nD} onChange={e => setND(e.target.value)} style={{ ...inp, width: 130, fontSize: 12 }} />
          <button onClick={() => { if (nL.trim() && nD) { onChange([...milestones, { label: nL.trim(), target: nD, done: false }]); setNL(""); setND(""); setAdding(false); }}} style={bt("#27ae60")}>Add</button>
          <button onClick={() => setAdding(false)} style={bt()}>X</button>
        </div>
      ) : (
        <button onClick={e => { e.stopPropagation(); setAdding(true); }} style={{ ...bt("rgba(255,255,255,0.06)"), marginTop: 6, width: "100%", fontSize: 12 }}>+ Add Milestone</button>
      )}
    </div>
  );
}

function InitModal({ init, onSave, onClose, onDelete }) {
  const [name, setName] = useState(init?.name || "");
  const [desc, setDesc] = useState(init?.description || "");
  const [dl, setDl] = useState(init?.deadline || "2026-06-30");
  const [st, setSt] = useState(init?.status || "not-started");
  const [owner, setOwner] = useState(init?.owner || "");
  const [cfm, setCfm] = useState(false);
  const isNew = !init;
  return (
    <Modal onClose={onClose}>
      <h3 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700, color: "#fff" }}>{isNew ? "New Initiative" : "Edit Initiative"}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><div style={lb}>Name</div><input value={name} onChange={e => setName(e.target.value)} style={{ ...inp, width: "100%" }} /></div>
        <div><div style={lb}>Description</div><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ ...inp, width: "100%", resize: "vertical" }} /></div>
        <div><div style={lb}>Owner</div><input value={owner} onChange={e => setOwner(e.target.value)} placeholder="e.g. Steven" style={{ ...inp, width: "100%" }} /></div>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ flex: 1 }}><div style={lb}>Deadline</div><input type="date" value={dl} onChange={e => setDl(e.target.value)} style={{ ...inp, width: "100%" }} /></div>
          <div style={{ flex: 1 }}><div style={lb}>Status</div><select value={st} onChange={e => setSt(e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer" }}>{STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6, justifyContent: "space-between" }}>
          <div>
            {!isNew && !cfm && <button onClick={() => setCfm(true)} style={bt("rgba(192,57,43,0.5)")}>Delete</button>}
            {!isNew && cfm && <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 12, color: "#e74c3c" }}>Sure?</span><button onClick={() => { onDelete(); onClose(); }} style={bt("#c0392b")}>Yes</button><button onClick={() => setCfm(false)} style={bt()}>No</button></div>}
          </div>
          <div style={{ display: "flex", gap: 8 }}><button onClick={onClose} style={bt()}>Cancel</button><button onClick={() => { if (name.trim()) onSave({ name: name.trim(), description: desc.trim(), deadline: dl, status: st, owner: owner.trim() }); }} style={bt("#d94f8a")}>{isNew ? "Create" : "Save"}</button></div>
        </div>
      </div>
    </Modal>
  );
}

const PHRASES = [
  "YOU ABSOLUTE LEGEND","SHIP IT AND FORGET IT","SOMEBODY GIVE THIS PERSON A RAISE",
  "THAT'S ONE LESS THING IN YOUR STANDUP","JIRA TICKET? CLOSED. HOTEL? TRIVAGO.",
  "PRODUCTIVITY LEVEL: OVER 9000","YOU JUST PM'D THE HECK OUT OF THAT",
  "INITIATIVE? MORE LIKE FINISH-IATIVE","TIME TO UPDATE YOUR LINKEDIN",
  "YOUR CALENDAR JUST SHED A TEAR OF JOY","EVEN YOUR BACKLOG IS IMPRESSED",
  "STAKEHOLDERS EVERYWHERE JUST FELT A DISTURBANCE",
];

function Celebration({ name, onDone }) {
  const canvasRef = useRef(null);
  const phrase = useRef(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width = window.innerWidth, H = canvas.height = window.innerHeight;
    const particles = [], dancingEmojis = [], risers = [];
    const colors = ["#d94f8a","#a13670","#e8cce0","#27ae60","#f5c542","#6366f1","#f97316","#ec4899","#14b8a6","#8b5cf6"];
    for (let b = 0; b < 5; b++) { const bx = W*(0.15+b*0.175), by = H*0.3; for (let i = 0; i < 60; i++) { const a = Math.random()*Math.PI*2, s = 3+Math.random()*10; particles.push({ x:bx,y:by,w:5+Math.random()*8,h:3+Math.random()*5,vx:Math.cos(a)*s,vy:Math.sin(a)*s-4,rot:Math.random()*360,vr:(Math.random()-0.5)*15,color:colors[Math.floor(Math.random()*colors.length)] }); }}
    const dE = ["🕺","💃","🎉","🥳","🍾","🏆","🎊","🔥","💪","👑","🌟","🤩","😎","🫡","🙌","✅"];
    for (let i = 0; i < 20; i++) dancingEmojis.push({ x:W*(i/20)+Math.random()*(W/20),baseY:H-60-Math.random()*40,emoji:dE[Math.floor(Math.random()*dE.length)],size:28+Math.random()*20,phase:Math.random()*Math.PI*2,speed:2+Math.random()*3,amplitude:15+Math.random()*25 });
    for (let i = 0; i < 25; i++) risers.push({ x:Math.random()*W,y:H+50+Math.random()*300,vy:-(1.5+Math.random()*3),vx:(Math.random()-0.5)*1.5,emoji:dE[Math.floor(Math.random()*dE.length)],size:22+Math.random()*24,rot:0,vr:(Math.random()-0.5)*4,opacity:1,wobble:Math.random()*Math.PI*2 });
    let frame = 0;
    const loop = () => {
      frame++; ctx.clearRect(0,0,W,H);
      if (frame%20<3&&frame<180) { ctx.fillStyle=`rgba(${200+Math.random()*55},${Math.random()*50},${100+Math.random()*100},0.06)`; ctx.fillRect(0,0,W,H); }
      for (const p of particles) { p.x+=p.vx;p.y+=p.vy;p.vy+=0.12;p.rot+=p.vr;p.vx*=0.99;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);ctx.fillStyle=p.color;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore(); }
      for (const d of dancingEmojis) { const yO=Math.sin(frame*0.08*d.speed+d.phase)*d.amplitude,xO=Math.sin(frame*0.04*d.speed+d.phase)*8,tilt=Math.sin(frame*0.06*d.speed+d.phase)*0.3;ctx.save();ctx.translate(d.x+xO,d.baseY+yO);ctx.rotate(tilt);ctx.font=`${d.size}px serif`;ctx.textAlign="center";ctx.fillText(d.emoji,0,0);ctx.restore(); }
      for (const r of risers) { r.y+=r.vy;r.x+=r.vx+Math.sin(frame*0.03+r.wobble)*0.5;r.rot+=r.vr;r.opacity=Math.max(0,r.opacity-0.002);ctx.save();ctx.globalAlpha=r.opacity;ctx.translate(r.x,r.y);ctx.rotate(r.rot*Math.PI/180);ctx.font=`${r.size}px serif`;ctx.textAlign="center";ctx.fillText(r.emoji,0,0);ctx.restore(); }
      const ta=frame<20?frame/20:frame>220?Math.max(0,1-(frame-220)/30):1,bounce=frame<40?Math.sin(frame*0.3)*(40-frame)*0.5:Math.sin(frame*0.05)*3,scale=frame<15?0.3+(frame/15)*0.7:1+Math.sin(frame*0.08)*0.03;
      ctx.save();ctx.globalAlpha=ta;ctx.translate(W/2,H*0.32+bounce);ctx.scale(scale,scale);
      ctx.font=`${Math.min(W*0.12,100)}px serif`;ctx.textAlign="center";ctx.fillText("🏆",0,-40);
      ctx.font=`bold ${Math.min(W*0.035,28)}px 'DM Sans',sans-serif`;ctx.fillStyle="#e8cce0";ctx.fillText(`"${name}"`,0,10);
      ctx.font=`bold ${Math.min(W*0.05,42)}px 'DM Sans',sans-serif`;ctx.fillStyle="#fff";ctx.fillText(phrase.current,0,70);
      ctx.font=`${Math.min(W*0.02,16)}px 'DM Sans',sans-serif`;ctx.fillStyle="rgba(255,255,255,0.5)";ctx.fillText("click anywhere to stop flexing",0,110);
      ctx.restore();
      if (frame<260) requestAnimationFrame(loop); else onDone();
    };
    loop();
  }, [onDone, name]);
  return (<div style={{ position:"fixed",inset:0,zIndex:200,cursor:"pointer",background:"rgba(15,5,25,0.85)" }} onClick={onDone}><canvas ref={canvasRef} style={{ width:"100%",height:"100%" }} /></div>);
}

export default function App() {
  const [inits, setInits] = useState(DEFAULT_INITIATIVES);
  const [sel, setSel] = useState(null);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState(null);
  const [celName, setCelName] = useState(null);
  const saveTimeout = useRef(null);

  useEffect(() => {
    (async () => {
      const stored = await loadState();
      if (stored?.inits) setInits(stored.inits);
      setReady(true);
    })();
    const unsub = subscribeToChanges();
    return unsub;
  }, []);

  useEffect(() => {
    if (!ready) return;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveState({ inits }), 1000);
    return () => clearTimeout(saveTimeout.current);
  }, [inits, ready]);

  const prev = useRef({});
  const upd = (ni) => {
    for (const n of ni) { if (n.status === "complete" && prev.current[n.id] !== "complete") setCelName(n.name); }
    const m = {}; ni.forEach(i => m[i.id] = i.status); prev.current = m; setInits(ni);
  };
  useEffect(() => { const m = {}; inits.forEach(i => m[i.id] = i.status); prev.current = m; }, [ready]);

  const updateMs = (id, ms) => upd(inits.map(i => i.id === id ? { ...i, milestones: ms } : i));
  const setSt = (id, s) => upd(inits.map(i => i.id === id ? { ...i, status: s } : i));
  const setDl = (id, d) => upd(inits.map(i => i.id === id ? { ...i, deadline: d } : i));
  const setOwner = (id, o) => upd(inits.map(i => i.id === id ? { ...i, owner: o } : i));
  const saveInit = (data) => {
    if (modal === "new") { const nid = Math.max(0, ...inits.map(i => i.id)) + 1; upd([...inits, { id: nid, ...data, milestones: [] }]); }
    else { upd(inits.map(i => i.id === modal ? { ...i, ...data } : i)); }
    setModal(null);
  };
  const delInit = () => { upd(inits.filter(i => i.id !== modal)); if (sel === modal) setSel(null); setModal(null); };
  const reorder = (i, dir) => upd(dir === "up" ? moveUp(inits, i) : moveDn(inits, i));

  // Sort by owner
  const sorted = [...inits].sort((a, b) => (a.owner || "").localeCompare(b.owner || ""));

  const allDone = inits.reduce((a, i) => a + (i.milestones || []).filter(m => m.done).length, 0);
  const allTotal = inits.reduce((a, i) => a + (i.milestones || []).length, 0);
  const allPct = allTotal ? Math.round((allDone / allTotal) * 100) : 0;
  const months = monthMarkers();
  const now = new Date();
  const editInit = modal && modal !== "new" ? inits.find(i => i.id === modal) : null;

  const LABEL_W = 280;

  return (
    <div style={{
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      background: "linear-gradient(135deg, #2d1038 0%, #4a1d50 20%, #7b2d6b 40%, #a13670 55%, #c4619a 70%, #d4a0c0 85%, #c9a3cb 100%)",
      minHeight: "100vh", color: "#f5ede8", padding: "36px 24px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {celName && <Celebration name={celName} onDone={() => setCelName(null)} />}
      <div style={{ maxWidth: 1020, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 18, marginBottom: 36 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.3px", color: "#fff" }}>Product Transformation Tracker</h1>
            <p style={{ margin: "5px 0 0", fontSize: 14, color: "rgba(255,255,255,0.5)" }}>Faria Education Group</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ring pct={allPct} size={58} stroke={5.5} color="#d94f8a" />
              <span style={{ position: "absolute", fontSize: 14, fontWeight: 700, color: "#d94f8a" }}>{allPct}%</span>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}><div>{allDone} of {allTotal}</div><div>milestones done</div></div>
            <button onClick={() => setModal("new")} style={{ ...bt("#d94f8a"), padding: "8px 18px", fontSize: 13 }}>+ Initiative</button>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          {/* Month labels */}
          <div style={{ position: "relative", height: 28, marginBottom: 8, marginLeft: LABEL_W + 24 }}>
            {months.map(m => <div key={m.label + m.pct} style={{ position: "absolute", left: `${m.pct}%`, top: 0, fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600, transform: "translateX(-50%)" }}>{m.label}</div>)}
          </div>

          {/* Rows grouped by owner */}
          {(() => {
            let lastOwner = null;
            return sorted.map((init) => {
              const idx = inits.findIndex(i => i.id === init.id);
              const active = sel === init.id;
              const ms = init.milestones || [];
              const dlPct = dP(init.deadline);
              const isPast = new Date(init.deadline + "T23:59:59") < now && init.status !== "complete";
              const firstMs = ms[0]; const startPct = firstMs ? dP(firstMs.target) : dlPct;
              const barW = Math.max(0, dlPct - startPct);
              const doneCt = ms.filter(m => m.done).length;
              const pctDone = ms.length ? Math.round((doneCt / ms.length) * 100) : 0;
              const color = sC(init.status);
              const done = init.status === "complete";

              const showOwnerHeader = init.owner !== lastOwner;
              lastOwner = init.owner;

              return (
                <div key={init.id}>
                  {showOwnerHeader && (
                    <div style={{ padding: "12px 0 6px 24px", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", borderTop: lastOwner !== null ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                      {init.owner || "Unassigned"}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 0, width: 18, flexShrink: 0 }}>
                      <button onClick={() => reorder(idx, "up")} style={{ background: "none", border: "none", color: idx === 0 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.3)", cursor: idx === 0 ? "default" : "pointer", fontSize: 10, padding: 0, lineHeight: 1 }}>&#9650;</button>
                      <button onClick={() => reorder(idx, "down")} style={{ background: "none", border: "none", color: idx === inits.length-1 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.3)", cursor: idx === inits.length-1 ? "default" : "pointer", fontSize: 10, padding: 0, lineHeight: 1 }}>&#9660;</button>
                    </div>
                    <div onClick={() => setSel(active ? null : init.id)} style={{
                      display: "flex", alignItems: "stretch", cursor: "pointer", flex: 1, borderRadius: 12, overflow: "hidden",
                      background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)"}`,
                      backdropFilter: "blur(8px)", transition: "all 0.15s", opacity: done ? 0.55 : 1, minHeight: 54,
                    }}>
                      <div style={{ width: LABEL_W, minWidth: LABEL_W, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#f5ede8", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", textDecoration: done ? "line-through" : "none" }} title={init.name}>{init.name}</span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{init.owner || "No owner"}</span>
                        </div>
                        {done && <span style={{ fontSize: 16, flexShrink: 0 }}>🏆</span>}
                      </div>
                      <div style={{ flex: 1, position: "relative", padding: "14px 16px 14px 0" }}>
                        {barW > 0 && <div style={{ position: "absolute", left: `${startPct}%`, width: `${barW}%`, top: "50%", transform: "translateY(-50%)", height: 5, borderRadius: 3, background: color, opacity: 0.2 }} />}
                        {barW > 0 && <div style={{ position: "absolute", left: `${startPct}%`, width: `${barW * (pctDone / 100)}%`, top: "50%", transform: "translateY(-50%)", height: 5, borderRadius: 3, background: color, opacity: 0.7, transition: "width 0.3s" }} />}
                        {ms.map((m, mi) => (
                          <div key={mi} style={{
                            position: "absolute", left: `${dP(m.target)}%`, top: "50%", transform: "translate(-50%,-50%)", zIndex: 2,
                            width: m.done ? 14 : 10, height: m.done ? 14 : 10, borderRadius: "50%",
                            background: m.done ? color : "rgba(0,0,0,0.3)", border: `2.5px solid ${color}`, transition: "all 0.2s",
                          }} title={`${m.label} - ${fmt(m.target)}`} />
                        ))}
                        <div style={{
                          position: "absolute", left: `${dlPct}%`, top: "50%", transform: "translate(-50%,-50%)", zIndex: 2,
                          width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
                          borderTop: `9px solid ${isPast ? "#c0392b" : "rgba(255,255,255,0.5)"}`,
                        }} title={`Deadline: ${fmt(init.deadline)}`} />
                      </div>
                    </div>
                  </div>

                  {active && (
                    <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "0 0 12px 12px", border: "1px solid rgba(255,255,255,0.12)", borderTop: "none", padding: "20px 22px", marginTop: -5, marginBottom: 5, marginLeft: 23, backdropFilter: "blur(8px)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.5, flex: 1 }}>{init.description}</p>
                        <button onClick={e => { e.stopPropagation(); setModal(init.id); }} style={{ ...bt("rgba(255,255,255,0.1)"), marginLeft: 14, flexShrink: 0 }}>Edit Initiative</button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 22 }}>
                        <div>
                          <div style={lb}>Milestones</div>
                          <MsEd milestones={ms} onChange={newMs => updateMs(init.id, newMs)} color={color} />
                        </div>
                        <div>
                          <div style={lb}>Owner</div>
                          <input value={init.owner || ""} onChange={e => { e.stopPropagation(); setOwner(init.id, e.target.value); }} onClick={e => e.stopPropagation()} placeholder="e.g. Steven" style={{ ...inp, width: "100%", marginBottom: 12 }} />

                          <div style={lb}>Status</div>
                          <select value={init.status} onChange={e => { e.stopPropagation(); setSt(init.id, e.target.value); }} onClick={e => e.stopPropagation()}
                            style={{ ...inp, width: "100%", cursor: "pointer" }}>
                            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
                            <Ring pct={pctDone} size={42} stroke={4.5} color={color} />
                            <div><div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{pctDone}%</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{doneCt}/{ms.length} milestones</div></div>
                          </div>
                          <div style={{ ...lb, marginTop: 16 }}>Deadline</div>
                          <input type="date" value={init.deadline} onChange={e => { e.stopPropagation(); setDl(init.id, e.target.value); }} onClick={e => e.stopPropagation()} style={{ ...inp, width: "100%" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 20, marginTop: 26, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { el: <div style={{ width: 8, height: 8, borderRadius: "50%", border: "2px solid #d94f8a" }} />, t: "Open" },
            { el: <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d94f8a" }} />, t: "Done" },
            { el: <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "7px solid rgba(255,255,255,0.5)" }} />, t: "Deadline" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>{item.el}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{item.t}</span></div>
          ))}
        </div>
      </div>

      {modal && <InitModal init={modal === "new" ? null : editInit} onSave={saveInit} onClose={() => setModal(null)} onDelete={delInit} />}
    </div>
  );
}
