import { useState, useEffect, useRef } from "react";
import { loadState, saveState, subscribeToChanges } from "./storage.js";

/* ── Faria design tokens ─────────────────────────────── */
const F = {
  plum: "#37023C",
  darkPlum: "#391E38",
  lightPlum: "#552859",
  paper: "#F0EBEB",
  orange: "#F78B43",
  pink: "#E837AC",
  yellow: "#F7D35F",
  lightOrange: "#FBC5A1",
  lightPink: "#F6AFDE",
  lightYellow: "#FAE59F",
  bg: "#FAF7F7",
  surface: "#FFFFFF",
  border: "#E6DFE0",
  borderStrong: "#D5CACB",
  muted: "#6B5C68",
  muted2: "#8E7F8C",
  green: "#1A7A3E",
  greenSoft: "#D4F0E0",
  gradient: "linear-gradient(135deg, #F7D35F 0%, #F78B43 45%, #E837AC 100%)",
  gradientIcon: "linear-gradient(-45deg, #F5D160 0%, #F0A67E 50%, #EC57AD 100%)",
  shadowSm: "0 1px 2px rgba(55, 2, 60, 0.04)",
  shadowMd: "0 2px 8px rgba(55, 2, 60, 0.06), 0 1px 2px rgba(55, 2, 60, 0.04)",
  shadowLg: "0 8px 24px rgba(55, 2, 60, 0.08)",
  font: "'Nunito Sans','Trebuchet MS',system-ui,sans-serif",
};

const STATUS_OPTIONS = [
  { value: "not-started", label: "Not Started", color: F.muted2 },
  { value: "in-progress", label: "In Progress", color: F.orange },
  { value: "blocked", label: "Blocked", color: F.pink },
  { value: "complete", label: "Complete", color: F.green },
];
function sC(s) { return STATUS_OPTIONS.find(o => o.value === s)?.color || F.muted2; }

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical", color: F.pink },
  { value: "high", label: "High", color: F.orange },
  { value: "medium", label: "Medium", color: F.yellow },
  { value: "low", label: "Low", color: F.muted2 },
];
function pC(p) { return PRIORITY_OPTIONS.find(o => o.value === p)?.color || F.muted2; }

const TYPE_OPTIONS = [
  { value: "feature", label: "Feature" },
  { value: "project", label: "Project" },
  { value: "integration", label: "Integration" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "research", label: "Research" },
];

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
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={F.border} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.4s ease" }} />
    </svg>
  );
}

/* Mini progress bar for overview rows */
function MiniProgress({ pct, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 70 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: F.bg, overflow: "hidden", border: `1px solid ${F.border}` }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: color, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? F.green : F.muted, minWidth: 28, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

const inp = { background: F.surface, color: F.plum, border: `1px solid ${F.borderStrong}`, borderRadius: 7, padding: "8px 11px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const bt = (variant) => {
  // variant: "primary" (plum filled), "danger" (pink), "success" (green), undefined → secondary white
  if (variant === "primary") return { padding: "7px 14px", borderRadius: 7, border: "none", background: F.plum, color: F.paper, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
  if (variant === "danger") return { padding: "7px 14px", borderRadius: 7, border: "none", background: F.pink, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
  if (variant === "success") return { padding: "7px 14px", borderRadius: 7, border: "none", background: F.green, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
  if (variant === "ghost") return { padding: "7px 14px", borderRadius: 7, border: "none", background: "transparent", color: F.plum, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
  return { padding: "7px 14px", borderRadius: 7, border: `1px solid ${F.borderStrong}`, background: F.surface, color: F.plum, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
};
const lb = { fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 };

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(55,2,60,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: F.surface, border: `1px solid ${F.border}`, borderRadius: 12, padding: "24px 28px", maxWidth: 560, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: F.shadowLg, color: F.plum }}>
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
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: `1px solid ${F.border}` }}>
          {eI === i ? (
            <>
              <input value={eL} onChange={e => setEL(e.target.value)} style={{ ...inp, flex: 1, fontSize: 12 }} />
              <input type="date" value={eD} onChange={e => setED(e.target.value)} style={{ ...inp, width: 130, fontSize: 12 }} />
              <button onClick={() => { if (eL.trim() && eD) { onChange(milestones.map((mm,j) => j === i ? { ...mm, label: eL.trim(), target: eD } : mm)); setEI(null); }}} style={bt("success")}>OK</button>
              <button onClick={() => setEI(null)} style={bt()}>X</button>
            </>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, flexShrink: 0 }}>
                <button onClick={e => { e.stopPropagation(); onChange(moveUp(milestones, i)); }} style={{ background: "none", border: "none", color: i === 0 ? F.border : F.muted2, cursor: i === 0 ? "default" : "pointer", fontSize: 9, padding: 0, lineHeight: 1 }}>&#9650;</button>
                <button onClick={e => { e.stopPropagation(); onChange(moveDn(milestones, i)); }} style={{ background: "none", border: "none", color: i === milestones.length-1 ? F.border : F.muted2, cursor: i === milestones.length-1 ? "default" : "pointer", fontSize: 9, padding: 0, lineHeight: 1 }}>&#9660;</button>
              </div>
              <div onClick={e => { e.stopPropagation(); onChange(milestones.map((mm,j) => j === i ? { ...mm, done: !mm.done } : mm)); }}
                style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: "pointer", border: `2px solid ${m.done ? color : F.borderStrong}`, background: m.done ? color : F.surface, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                {m.done && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{ fontSize: 13, color: m.done ? F.muted2 : F.plum, textDecoration: m.done ? "line-through" : "none", flex: 1 }}>{m.label}</span>
              <span style={{ fontSize: 11, color: F.muted, flexShrink: 0, fontWeight: 600 }}>{fmt(m.target)}</span>
              <button title="Edit" onClick={e => { e.stopPropagation(); setEI(i); setEL(m.label); setED(m.target); }} style={{ background: "transparent", border: "none", color: F.muted, cursor: "pointer", fontSize: 12, padding: "2px 6px", lineHeight: 1 }}>&#9998;</button>
              <button title="Delete" onClick={e => { e.stopPropagation(); onChange(milestones.filter((_,j) => j !== i)); }} style={{ background: "transparent", border: "none", color: F.muted, cursor: "pointer", fontSize: 14, padding: "2px 6px", lineHeight: 1 }}>&times;</button>
            </>
          )}
        </div>
      ))}
      {adding ? (
        <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
          <input placeholder="Milestone name" value={nL} onChange={e => setNL(e.target.value)} style={{ ...inp, flex: 1, fontSize: 12 }} />
          <input type="date" value={nD} onChange={e => setND(e.target.value)} style={{ ...inp, width: 130, fontSize: 12 }} />
          <button onClick={() => { if (nL.trim() && nD) { onChange([...milestones, { label: nL.trim(), target: nD, done: false }]); setNL(""); setND(""); setAdding(false); }}} style={bt("success")}>Add</button>
          <button onClick={() => setAdding(false)} style={bt()}>X</button>
        </div>
      ) : (
        <button onClick={e => { e.stopPropagation(); setAdding(true); }} style={{
          marginTop: 10, width: "100%", padding: "9px 12px",
          background: F.bg,
          border: `2px dashed ${F.borderStrong}`,
          borderRadius: 8, color: F.plum,
          fontSize: 12, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit", transition: "all 0.1s",
        }} onMouseEnter={e => { e.currentTarget.style.borderColor = F.pink; e.currentTarget.style.background = F.surface; }} onMouseLeave={e => { e.currentTarget.style.borderColor = F.borderStrong; e.currentTarget.style.background = F.bg; }}>+ Add Milestone</button>
      )}
    </div>
  );
}

const PHRASES = ["YOU ABSOLUTE LEGEND","SHIP IT AND FORGET IT","SOMEBODY GIVE THIS PERSON A RAISE","THAT'S ONE LESS THING IN YOUR STANDUP","JIRA TICKET? CLOSED. HOTEL? TRIVAGO.","PRODUCTIVITY LEVEL: OVER 9000","YOU JUST PM'D THE HECK OUT OF THAT","INITIATIVE? MORE LIKE FINISH-IATIVE","TIME TO UPDATE YOUR LINKEDIN","YOUR CALENDAR JUST SHED A TEAR OF JOY","EVEN YOUR BACKLOG IS IMPRESSED","STAKEHOLDERS EVERYWHERE JUST FELT A DISTURBANCE"];

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

/* ── Default Data ── */
const DEFAULT_PRODUCT = [
  { id: 1, name: "AI Monetization", description: "Plan for AI monetization across Faria products.", deadline: "2026-06-30", owner: "Steven", milestones: [
    { label: "Competitive pricing analysis", target: "2026-05-09", done: false },{ label: "Draft tiering and packaging model", target: "2026-05-23", done: false },{ label: "Review with Daniel and stakeholders", target: "2026-06-06", done: false },{ label: "Final monetization plan delivered", target: "2026-06-30", done: false },
  ], status: "in-progress" },
  { id: 2, name: "Faria Product Vision", description: 'Define what Faria is across our product suite.', deadline: "2026-06-30", owner: "Steven", milestones: [
    { label: "Audit current product positioning", target: "2026-05-09", done: false },{ label: "Stakeholder interviews (Sales, CE, Marketing)", target: "2026-05-23", done: false },{ label: "Draft vision narrative and PPT", target: "2026-06-13", done: false },{ label: "Present and align with leadership", target: "2026-06-30", done: false },
  ], status: "in-progress" },
  { id: 3, name: "Prioritization Framework", description: "How we prioritize features and initiatives across products.", deadline: "2026-05-31", owner: "Steven", milestones: [
    { label: "Research frameworks (RICE, WSJF, etc.)", target: "2026-05-05", done: false },{ label: "Draft Faria-specific scoring model", target: "2026-05-16", done: false },{ label: "Review with PMs", target: "2026-05-23", done: false },{ label: "Pilot on one product backlog", target: "2026-05-31", done: false },
  ], status: "in-progress" },
  { id: 4, name: "Customer Discovery", description: "Repeatable process for gathering customer insights.", deadline: "2026-06-30", owner: "Steven", milestones: [
    { label: "Audit current discovery practices", target: "2026-05-16", done: false },{ label: "Define interview guides and templates", target: "2026-06-06", done: false },{ label: "Run first cross-product discovery sprint", target: "2026-06-20", done: false },{ label: "Document process and share playbook", target: "2026-06-30", done: false },
  ], status: "not-started" },
  { id: 5, name: "Feature Requests", description: "Unified intake and triage process for feature requests.", deadline: "2026-06-30", owner: "Steven", milestones: [
    { label: "Map current intake channels", target: "2026-05-16", done: false },{ label: "Design unified triage flow", target: "2026-05-30", done: false },{ label: "Tool setup and pilot", target: "2026-06-13", done: false },{ label: "Full rollout and training", target: "2026-06-30", done: false },
  ], status: "not-started" },
  { id: 6, name: "Product Communication", description: "Consistent comms on what we do, why, and when.", deadline: "2026-06-30", owner: "Steven", milestones: [
    { label: "Audit comms channels and gaps", target: "2026-05-09", done: false },{ label: "Design internal update cadence", target: "2026-05-23", done: false },{ label: "Draft external comms strategy", target: "2026-06-13", done: false },{ label: "First full-cycle comms delivered", target: "2026-06-30", done: false },
  ], status: "not-started" },
  { id: 7, name: "Product Roadmap", description: "Visible roadmap showing planned, in progress, and shipped.", deadline: "2026-06-30", owner: "Steven", milestones: [
    { label: "Evaluate roadmap tooling", target: "2026-05-09", done: false },{ label: "Define structure and taxonomy", target: "2026-05-23", done: false },{ label: "Build first version", target: "2026-06-13", done: false },{ label: "Publish and gather feedback", target: "2026-06-30", done: false },
  ], status: "not-started" },
];

const DEFAULT_AI = [
  { id: 201, name: "AI Writing Assistant", description: "Help admissions teams draft applicant communications and review notes.", deadline: "2026-06-30", owner: "", product: "OpenApply", type: "feature", priority: "high", effort: "medium", impact: "high", milestones: [
    { label: "Scope use cases and tone guidelines", target: "2026-05-15", done: false },{ label: "Design composer UX", target: "2026-05-30", done: false },{ label: "Build MVP with review flow", target: "2026-06-15", done: false },{ label: "Launch to early adopters", target: "2026-06-30", done: false },
  ], status: "not-started" },
  { id: 202, name: "AI Applicant Insights", description: "Surface AI-generated highlights and risk flags on each applicant profile.", deadline: "2026-06-30", owner: "", product: "OpenApply", type: "feature", priority: "medium", effort: "medium", impact: "high", milestones: [
    { label: "Define insight categories and signals", target: "2026-05-15", done: false },{ label: "Design insights panel", target: "2026-05-30", done: false },{ label: "Build extraction pipeline", target: "2026-06-15", done: false },{ label: "Launch to early adopters", target: "2026-06-30", done: false },
  ], status: "not-started" },
  { id: 203, name: "AI 2nd Language Translations", description: "On-the-fly translation of applicant content and outbound messages.", deadline: "2026-06-30", owner: "", product: "OpenApply", type: "feature", priority: "medium", effort: "medium", impact: "medium", milestones: [
    { label: "Pick target languages and provider", target: "2026-05-15", done: false },{ label: "Design translation UX", target: "2026-05-30", done: false },{ label: "Build inline translation flows", target: "2026-06-15", done: false },{ label: "Launch to early adopters", target: "2026-06-30", done: false },
  ], status: "not-started" },
  { id: 204, name: "Agentic Nurture Workflows", description: "Autonomous AI agents that nurture applicants through tailored follow-ups.", deadline: "2026-09-30", owner: "", product: "OpenApply", type: "feature", priority: "high", effort: "high", impact: "high", milestones: [
    { label: "Define agent goals and guardrails", target: "2026-07-15", done: false },{ label: "Design workflow builder", target: "2026-08-15", done: false },{ label: "Build orchestration + first agent", target: "2026-09-15", done: false },{ label: "Pilot with 3 schools", target: "2026-09-30", done: false },
  ], status: "not-started" },
  { id: 205, name: "AI Admissions Assistant for Parents", description: "Conversational AI assistant that answers parent questions during the application process.", deadline: "2026-09-30", owner: "", product: "OpenApply", type: "feature", priority: "high", effort: "medium", impact: "high", milestones: [
    { label: "Define FAQ knowledge base scope", target: "2026-07-15", done: false },{ label: "Build RAG pipeline with school data", target: "2026-08-15", done: false },{ label: "Widget integration and styling", target: "2026-09-15", done: false },{ label: "Launch to early adopters", target: "2026-09-30", done: false },
  ], status: "not-started" },
  { id: 206, name: "AI Lead Scoring", description: "Predictive scoring of applicant likelihood to enroll, with explanations.", deadline: "2026-09-30", owner: "", product: "OpenApply", type: "feature", priority: "high", effort: "high", impact: "high", milestones: [
    { label: "Research scoring models and bias mitigation", target: "2026-07-15", done: false },{ label: "Design score UX and override workflow", target: "2026-08-15", done: false },{ label: "Train model on anonymized data", target: "2026-09-15", done: false },{ label: "Pilot with 3 schools", target: "2026-09-30", done: false },
  ], status: "not-started" },
  { id: 207, name: "AI Configuration Dashboard", description: "Central place for admins to configure AI features, prompts, and guardrails.", deadline: "2026-09-30", owner: "", product: "OpenApply", type: "feature", priority: "medium", effort: "medium", impact: "medium", milestones: [
    { label: "Inventory AI settings across product", target: "2026-07-15", done: false },{ label: "Design unified config UX", target: "2026-08-15", done: false },{ label: "Build dashboard and persistence", target: "2026-09-15", done: false },{ label: "Launch to admins", target: "2026-09-30", done: false },
  ], status: "not-started" },
  { id: 208, name: "AI Form Creation", description: "Generate application forms from a school description and goals.", deadline: "2026-12-31", owner: "", product: "OpenApply", type: "feature", priority: "medium", effort: "medium", impact: "high", milestones: [
    { label: "Scope form templates and prompts", target: "2026-10-15", done: false },{ label: "Design generation UX", target: "2026-11-15", done: false },{ label: "Build generator + editor", target: "2026-12-15", done: false },{ label: "Launch to early adopters", target: "2026-12-31", done: false },
  ], status: "not-started" },
  { id: 209, name: "AI Custom Dashboard", description: "AI-assisted custom dashboards summarizing admissions metrics in plain language.", deadline: "2026-12-31", owner: "", product: "OpenApply", type: "feature", priority: "medium", effort: "medium", impact: "medium", milestones: [
    { label: "Pick chart primitives and metric set", target: "2026-10-15", done: false },{ label: "Design dashboard builder", target: "2026-11-15", done: false },{ label: "Build NL-to-dashboard pipeline", target: "2026-12-15", done: false },{ label: "Launch to early adopters", target: "2026-12-31", done: false },
  ], status: "not-started" },
  { id: 301, name: "AI Notification Summaries", description: "AI-generated digests of recent ManageBac+ notifications for teachers and parents.", deadline: "2026-06-30", owner: "", product: "ManageBac+", type: "feature", priority: "medium", effort: "medium", impact: "medium", milestones: [
    { label: "Define digest scope and frequency", target: "2026-05-15", done: false },{ label: "Design summary UX", target: "2026-05-30", done: false },{ label: "Build summarization pipeline", target: "2026-06-15", done: false },{ label: "Launch to early adopters", target: "2026-06-30", done: false },
  ], status: "not-started" },
  { id: 302, name: "Image Generation for Unit Planner Covers", description: "Generate cover artwork for unit plans from a short text prompt.", deadline: "2026-06-30", owner: "", product: "ManageBac+", type: "feature", priority: "medium", effort: "low", impact: "medium", milestones: [
    { label: "Pick image model and content guardrails", target: "2026-05-15", done: false },{ label: "Design prompt + preview UX", target: "2026-05-30", done: false },{ label: "Integrate into Unit Planner", target: "2026-06-15", done: false },{ label: "Launch to early adopters", target: "2026-06-30", done: false },
  ], status: "not-started" },
  { id: 303, name: "MYP AI Assistant", description: "AI assistant tailored to the IB Middle Years Programme curriculum and workflows.", deadline: "2026-06-30", owner: "", product: "ManageBac+", type: "feature", priority: "high", effort: "high", impact: "high", milestones: [
    { label: "Scope MYP-specific use cases", target: "2026-05-15", done: false },{ label: "Build MYP knowledge base", target: "2026-05-30", done: false },{ label: "Build assistant UX and tools", target: "2026-06-15", done: false },{ label: "Pilot with MYP schools", target: "2026-06-30", done: false },
  ], status: "not-started" },
  { id: 304, name: "Live Turkish Translations for Communications", description: "Real-time Turkish translation for teacher-parent and school-wide communications.", deadline: "2026-06-30", owner: "", product: "ManageBac+", type: "feature", priority: "medium", effort: "medium", impact: "medium", milestones: [
    { label: "Pick translation provider and quality bar", target: "2026-05-15", done: false },{ label: "Design inline translation UX", target: "2026-05-30", done: false },{ label: "Build translation pipeline", target: "2026-06-15", done: false },{ label: "Launch to Turkish-market schools", target: "2026-06-30", done: false },
  ], status: "not-started" },
  { id: 305, name: "Automated Tagging for Portfolio & Class Streams", description: "AI auto-tags portfolio entries and class stream posts for easier discovery.", deadline: "2026-09-30", owner: "", product: "ManageBac+", type: "feature", priority: "medium", effort: "medium", impact: "medium", milestones: [
    { label: "Define taxonomy and tag set", target: "2026-07-15", done: false },{ label: "Train/configure tagging model", target: "2026-08-15", done: false },{ label: "Surface tags in Portfolio + Streams UX", target: "2026-09-15", done: false },{ label: "Launch to early adopters", target: "2026-09-30", done: false },
  ], status: "not-started" },
  { id: 306, name: "Quiz Generation", description: "Generate quizzes from lesson content with answer keys and difficulty levels.", deadline: "2026-09-30", owner: "", product: "ManageBac+", type: "feature", priority: "high", effort: "medium", impact: "high", milestones: [
    { label: "Scope question types and rubric", target: "2026-07-15", done: false },{ label: "Design generation + edit UX", target: "2026-08-15", done: false },{ label: "Build generator with review flow", target: "2026-09-15", done: false },{ label: "Launch to teachers", target: "2026-09-30", done: false },
  ], status: "not-started" },
  { id: 307, name: "Task/Workload Scheduler", description: "AI-balanced student workload scheduler across classes and assessments.", deadline: "2026-09-30", owner: "", product: "ManageBac+", type: "feature", priority: "medium", effort: "medium", impact: "medium", milestones: [
    { label: "Define workload signals and constraints", target: "2026-07-15", done: false },{ label: "Design scheduler UX", target: "2026-08-15", done: false },{ label: "Build balancing engine", target: "2026-09-15", done: false },{ label: "Pilot with coordinators", target: "2026-09-30", done: false },
  ], status: "not-started" },
  { id: 308, name: "Ask AI Anything (Web)", description: "Free-form AI Q&A grounded in school content, available on the ManageBac+ web app.", deadline: "2026-09-30", owner: "", product: "ManageBac+", type: "feature", priority: "high", effort: "high", impact: "high", milestones: [
    { label: "Define grounding scope and guardrails", target: "2026-07-15", done: false },{ label: "Build RAG pipeline on school content", target: "2026-08-15", done: false },{ label: "Design and ship web UX", target: "2026-09-15", done: false },{ label: "Launch to early adopters", target: "2026-09-30", done: false },
  ], status: "not-started" },
  { id: 309, name: "eCoursework Assistant", description: "AI helper for IB eCoursework drafting, citations, and integrity checks.", deadline: "2026-09-30", owner: "", product: "ManageBac+", type: "feature", priority: "medium", effort: "medium", impact: "high", milestones: [
    { label: "Scope eCoursework workflows and policies", target: "2026-07-15", done: false },{ label: "Design assistant + integrity UX", target: "2026-08-15", done: false },{ label: "Build draft + citation tools", target: "2026-09-15", done: false },{ label: "Launch to DP schools", target: "2026-09-30", done: false },
  ], status: "not-started" },
  { id: 310, name: "AI Assistant for Portfolio & Class Stream Analytics", description: "AI-driven analytics and insights across student portfolios and class streams.", deadline: "2026-12-31", owner: "", product: "ManageBac+", type: "feature", priority: "medium", effort: "medium", impact: "high", milestones: [
    { label: "Define key analytics questions", target: "2026-10-15", done: false },{ label: "Design insights UX", target: "2026-11-15", done: false },{ label: "Build analytics + NL summaries", target: "2026-12-15", done: false },{ label: "Launch to early adopters", target: "2026-12-31", done: false },
  ], status: "not-started" },
  { id: 311, name: "Unit/Lesson Design Assistant", description: "AI co-designer for units and lessons aligned with curriculum standards.", deadline: "2026-12-31", owner: "", product: "ManageBac+", type: "feature", priority: "high", effort: "high", impact: "high", milestones: [
    { label: "Ingest curriculum frameworks", target: "2026-10-15", done: false },{ label: "Design co-design UX", target: "2026-11-15", done: false },{ label: "Build suggestion + alignment engine", target: "2026-12-15", done: false },{ label: "Beta launch", target: "2026-12-31", done: false },
  ], status: "not-started" },
  { id: 312, name: "Ask Anything (Mobile)", description: "Bring Ask AI Anything to the ManageBac+ mobile app with voice and quick actions.", deadline: "2026-12-31", owner: "", product: "ManageBac+", type: "feature", priority: "medium", effort: "medium", impact: "high", milestones: [
    { label: "Scope mobile-specific interactions", target: "2026-10-15", done: false },{ label: "Design mobile UX (voice + quick asks)", target: "2026-11-15", done: false },{ label: "Build mobile client + API", target: "2026-12-15", done: false },{ label: "Launch to early adopters", target: "2026-12-31", done: false },
  ], status: "not-started" },
  { id: 401, name: "Curriculum Insights Beta Testing", description: "Beta-test AI-powered curriculum insights with pilot Atlas schools.", deadline: "2026-06-30", owner: "", product: "Atlas", type: "research", priority: "high", effort: "medium", impact: "high", milestones: [
    { label: "Recruit pilot schools and define success metrics", target: "2026-05-15", done: false },{ label: "Onboard pilot cohort and capture baseline", target: "2026-05-30", done: false },{ label: "Run beta sessions and gather feedback", target: "2026-06-15", done: false },{ label: "Synthesize learnings for release", target: "2026-06-30", done: false },
  ], status: "not-started" },
  { id: 402, name: "Curriculum Insights Release", description: "General release of AI-driven curriculum insights inside Atlas.", deadline: "2026-06-30", owner: "", product: "Atlas", type: "feature", priority: "high", effort: "medium", impact: "high", milestones: [
    { label: "Finalize insight set and UX from beta", target: "2026-05-15", done: false },{ label: "Productize analytics pipeline", target: "2026-05-30", done: false },{ label: "Ship to general availability", target: "2026-06-15", done: false },{ label: "Post-launch monitoring and tuning", target: "2026-06-30", done: false },
  ], status: "not-started" },
  { id: 403, name: "Unit Planning Assistant", description: "AI co-designer for Atlas unit plans aligned to school curriculum standards.", deadline: "2026-09-30", owner: "", product: "Atlas", type: "feature", priority: "high", effort: "high", impact: "high", milestones: [
    { label: "Define unit-planning use cases and prompts", target: "2026-07-15", done: false },{ label: "Design assistant UX in Atlas", target: "2026-08-15", done: false },{ label: "Build suggestion + alignment engine", target: "2026-09-15", done: false },{ label: "Beta launch with Atlas schools", target: "2026-09-30", done: false },
  ], status: "not-started" },
  { id: 404, name: "Lesson Planning Assistant", description: "AI assistant that drafts lesson plans inside Atlas from unit context.", deadline: "2026-12-31", owner: "", product: "Atlas", type: "feature", priority: "high", effort: "high", impact: "high", milestones: [
    { label: "Scope lesson templates and learning objectives", target: "2026-10-15", done: false },{ label: "Design lesson-plan editor UX", target: "2026-11-15", done: false },{ label: "Build draft + refinement engine", target: "2026-12-15", done: false },{ label: "Beta launch", target: "2026-12-31", done: false },
  ], status: "not-started" },
];

/* ── AI Monetization defaults ─────────────────────────────
   Per-product SKU / pricing / wow-outcomes config + bundle
   discounts + framework copy. Stored in faria-ai-monetization-v1
   (separate from faria-ai-v12). Feature-level tier + rationale +
   action limits live ON the AI feature objects in faria-ai-v12
   (added additively — not in DEFAULT_AI literals). */
const MONZ_PRODUCTS = ["OpenApply", "ManageBac+", "Atlas", "SchoolsBuddy", "Vectare"];
const DEFAULT_MONETIZATION = {
  products: {
    "OpenApply":    { sku: "OpenApply AI Pro",    unit: "per account / year", price: 0 },
    "ManageBac+":   { sku: "ManageBac+ AI Pro",   unit: "per account / year", price: 0 },
    "Atlas":        { sku: "Atlas AI Pro",        unit: "per account / year", price: 0 },
    "SchoolsBuddy": { sku: "SchoolsBuddy AI Pro", unit: "per account / year", price: 0 },
    "Vectare":      { sku: "Vectare AI Pro",      unit: "per account / year", price: 0 },
  },
  bundleDiscounts: [
    { products: 2, pct: 10 },
    { products: 3, pct: 20 },
    { products: 4, pct: 25 },
    { products: 5, pct: 30 },
  ],
  framework: {
    proFilter: [
      "Saves a school 5+ hours/week of manual work",
      "Unlocks something they literally cannot do today",
      "Produces a measurable outcome (conversion lift, time-to-decision, retention)",
    ],
  },
};

// Returns user-assigned tier if set, otherwise infers a candidate tier
// from impact. User overrides always win. "" = explicitly Unassigned.
function effectiveTier(f) {
  if (f.tier === "essential" || f.tier === "pro" || f.tier === "unassigned") return f.tier;
  // Inferred default: high impact → Pro candidate, else Essential candidate
  return f.impact === "high" ? "pro" : "essential";
}

// Merge a fresh monetization config with saved one (deep-merge products
// so adding a new product later doesn't wipe existing pricing).
function mergeMonz(saved) {
  if (!saved) return DEFAULT_MONETIZATION;
  return {
    ...DEFAULT_MONETIZATION,
    ...saved,
    products: { ...DEFAULT_MONETIZATION.products, ...(saved.products || {}) },
    bundleDiscounts: saved.bundleDiscounts || DEFAULT_MONETIZATION.bundleDiscounts,
    framework: { ...DEFAULT_MONETIZATION.framework, ...(saved.framework || {}) },
  };
}

/* ── Modals ── */
function AIModal({ init, onSave, onClose, onDelete }) {
  const [name, setName] = useState(init?.name || ""); const [desc, setDesc] = useState(init?.description || "");
  const [dl, setDl] = useState(init?.deadline || "2026-09-30"); const [st, setSt] = useState(init?.status || "not-started");
  const [owner, setOwner] = useState(init?.owner || ""); const [product, setProduct] = useState(init?.product || "");
  const [type, setType] = useState(init?.type || "feature"); const [priority, setPriority] = useState(init?.priority || "medium");
  const [effort, setEffort] = useState(init?.effort || "medium"); const [impact, setImpact] = useState(init?.impact || "medium");
  const [cfm, setCfm] = useState(false); const isNew = !init;
  return (
    <Modal onClose={onClose}>
      <h3 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700, color: F.plum }}>{isNew ? "New AI Feature" : "Edit AI Feature"}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><div style={lb}>Name</div><input value={name} onChange={e => setName(e.target.value)} style={{ ...inp, width: "100%" }} /></div>
        <div><div style={lb}>Description</div><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ ...inp, width: "100%", resize: "vertical" }} /></div>
        <div style={{ display: "flex", gap: 12 }}><div style={{ flex: 1 }}><div style={lb}>Owner</div><input value={owner} onChange={e => setOwner(e.target.value)} style={{ ...inp, width: "100%" }} /></div><div style={{ flex: 1 }}><div style={lb}>Product</div><input value={product} onChange={e => setProduct(e.target.value)} style={{ ...inp, width: "100%" }} /></div></div>
        <div style={{ display: "flex", gap: 12 }}><div style={{ flex: 1 }}><div style={lb}>Type</div><select value={type} onChange={e => setType(e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer" }}>{TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div><div style={{ flex: 1 }}><div style={lb}>Priority</div><select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer" }}>{PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div></div>
        <div style={{ display: "flex", gap: 12 }}><div style={{ flex: 1 }}><div style={lb}>Effort</div><select value={effort} onChange={e => setEffort(e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer" }}>{["low","medium","high"].map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}</select></div><div style={{ flex: 1 }}><div style={lb}>Impact</div><select value={impact} onChange={e => setImpact(e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer" }}>{["low","medium","high"].map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}</select></div></div>
        <div style={{ display: "flex", gap: 12 }}><div style={{ flex: 1 }}><div style={lb}>Deadline</div><input type="date" value={dl} onChange={e => setDl(e.target.value)} style={{ ...inp, width: "100%" }} /></div><div style={{ flex: 1 }}><div style={lb}>Status</div><select value={st} onChange={e => setSt(e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer" }}>{STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div></div>
        <div style={{ display: "flex", gap: 8, marginTop: 6, justifyContent: "space-between" }}>
          <div>{!isNew && !cfm && <button onClick={() => setCfm(true)} style={bt("danger")}>Delete</button>}{!isNew && cfm && <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 12, fontWeight: 700, color: F.pink }}>Sure?</span><button onClick={() => { onDelete(); onClose(); }} style={bt("danger")}>Yes</button><button onClick={() => setCfm(false)} style={bt()}>No</button></div>}</div>
          <div style={{ display: "flex", gap: 8 }}><button onClick={onClose} style={bt()}>Cancel</button><button onClick={() => { if (name.trim()) onSave({ name: name.trim(), description: desc.trim(), deadline: dl, status: st, owner: owner.trim(), product: product.trim(), type, priority, effort, impact }); }} style={bt("primary")}>{isNew ? "Create" : "Save"}</button></div>
        </div>
      </div>
    </Modal>
  );
}

function ProdModal({ init, onSave, onClose, onDelete }) {
  const [name, setName] = useState(init?.name || ""); const [desc, setDesc] = useState(init?.description || "");
  const [dl, setDl] = useState(init?.deadline || "2026-06-30"); const [st, setSt] = useState(init?.status || "not-started");
  const [owner, setOwner] = useState(init?.owner || ""); const [cfm, setCfm] = useState(false); const isNew = !init;
  return (
    <Modal onClose={onClose}>
      <h3 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700, color: F.plum }}>{isNew ? "New Initiative" : "Edit Initiative"}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><div style={lb}>Name</div><input value={name} onChange={e => setName(e.target.value)} style={{ ...inp, width: "100%" }} /></div>
        <div><div style={lb}>Description</div><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ ...inp, width: "100%", resize: "vertical" }} /></div>
        <div><div style={lb}>Owner</div><input value={owner} onChange={e => setOwner(e.target.value)} style={{ ...inp, width: "100%" }} /></div>
        <div style={{ display: "flex", gap: 14 }}><div style={{ flex: 1 }}><div style={lb}>Deadline</div><input type="date" value={dl} onChange={e => setDl(e.target.value)} style={{ ...inp, width: "100%" }} /></div><div style={{ flex: 1 }}><div style={lb}>Status</div><select value={st} onChange={e => setSt(e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer" }}>{STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div></div>
        <div style={{ display: "flex", gap: 8, marginTop: 6, justifyContent: "space-between" }}>
          <div>{!isNew && !cfm && <button onClick={() => setCfm(true)} style={bt("danger")}>Delete</button>}{!isNew && cfm && <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 12, fontWeight: 700, color: F.pink }}>Sure?</span><button onClick={() => { onDelete(); onClose(); }} style={bt("danger")}>Yes</button><button onClick={() => setCfm(false)} style={bt()}>No</button></div>}</div>
          <div style={{ display: "flex", gap: 8 }}><button onClick={onClose} style={bt()}>Cancel</button><button onClick={() => { if (name.trim()) onSave({ name: name.trim(), description: desc.trim(), deadline: dl, status: st, owner: owner.trim() }); }} style={bt("primary")}>{isNew ? "Create" : "Save"}</button></div>
        </div>
      </div>
    </Modal>
  );
}

/* ── Analytics Timeline (interactive overview) ── */
// Faria brand-tight palette: pink, orange, yellow, plum tones. Used for group color-coding.
const ANALYTICS_PALETTE = ["#E837AC", "#F78B43", "#F7D35F", "#552859", "#F6AFDE", "#FBC5A1", "#FAE59F", "#37023C"];

function AnalyticsTimeline({ inits, groupField, selGroup, setSelGroup }) {
  const months = monthMarkers();

  const groupOf = (i) => (i[groupField] || "Unassigned");
  const groups = [...new Set(inits.map(groupOf))].sort((a, b) => a.localeCompare(b));
  const colorFor = (g) => ANALYTICS_PALETTE[groups.indexOf(g) % ANALYTICS_PALETTE.length];

  // Build bars with positions
  const rawBars = inits.map((init) => {
    const ms = init.milestones || [];
    const dlPct = dP(init.deadline);
    const startPct = ms[0] ? Math.min(dlPct, dP(ms[0].target)) : Math.max(0, dlPct - 5);
    const w = Math.max(1.2, dlPct - startPct);
    const g = groupOf(init);
    return { init, startPct, w, group: g, color: colorFor(g), milestones: ms };
  });

  // Greedy row packing so bars don't overlap (1.5% gap)
  const packed = [...rawBars].sort((a, b) => a.startPct - b.startPct);
  const rowEnds = [];
  packed.forEach((b) => {
    let row = rowEnds.findIndex((e) => b.startPct >= e + 1.5);
    if (row === -1) { row = rowEnds.length; rowEnds.push(b.startPct + b.w); }
    else { rowEnds[row] = b.startPct + b.w; }
    b.row = row;
  });
  const rowCount = Math.max(1, rowEnds.length);

  const ROW_H = 14, PAD = 10;
  const chartH = rowCount * ROW_H + PAD * 2;

  const dim = (g) => selGroup && g !== selGroup;
  const groupCount = (g) => inits.filter((i) => groupOf(i) === g).length;
  const selectedInits = selGroup ? inits.filter((i) => groupOf(i) === selGroup) : [];

  const chip = (label, count, color, active, onClick) => (
    <button onClick={onClick} style={{
      fontSize: 11.5, padding: "4px 10px", borderRadius: 999, fontWeight: 600,
      border: `1px solid ${active ? F.plum : F.border}`,
      background: active ? F.plum : F.bg,
      color: active ? F.paper : F.plum,
      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
      transition: "all 0.1s", fontFamily: "inherit",
    }}>
      {color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />}
      {label} <span style={{ opacity: 0.65 }}>({count})</span>
    </button>
  );

  return (
    <div style={{ background: F.surface, border: `1px solid ${F.border}`, borderRadius: 12, padding: 16, marginBottom: 22, boxShadow: F.shadowSm }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {chip("All", inits.length, null, selGroup === null, () => setSelGroup(null))}
        {groups.map((g) => chip(g, groupCount(g), colorFor(g), selGroup === g, () => setSelGroup(selGroup === g ? null : g)))}
      </div>

      <div style={{ position: "relative", height: 16, marginBottom: 4 }}>
        {months.map((m) => <div key={m.label + m.pct} style={{ position: "absolute", left: `${m.pct}%`, fontSize: 10, color: F.muted2, fontWeight: 700, transform: "translateX(-50%)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{m.label}</div>)}
      </div>

      <div style={{ position: "relative", height: chartH, background: F.bg, border: `1px solid ${F.border}`, borderRadius: 8, overflow: "hidden" }}>
        {months.map((m) => <div key={"g" + m.label + m.pct} style={{ position: "absolute", left: `${m.pct}%`, top: 0, bottom: 0, width: 1, background: F.border }} />)}
        {packed.map((b) => {
          const isDim = dim(b.group);
          return (
            <div key={b.init.id} title={`${b.init.name} — ${b.group} — ${fmt(b.init.deadline)}`} onClick={() => setSelGroup(b.group)}
              style={{
                position: "absolute", top: PAD + b.row * ROW_H, left: `${b.startPct}%`, width: `${b.w}%`, height: ROW_H - 4,
                background: b.color, borderRadius: 4, cursor: "pointer",
                opacity: isDim ? 0.2 : 0.95, transition: "opacity 0.2s",
                boxShadow: isDim ? "none" : F.shadowSm,
              }}>
              {b.milestones.map((m, idx) => {
                const mPct = dP(m.target);
                if (mPct < b.startPct - 0.05 || mPct > b.startPct + b.w + 0.05) return null;
                const off = b.w > 0 ? ((mPct - b.startPct) / b.w) * 100 : 50;
                return (
                  <div key={idx} title={`${m.label} — ${fmt(m.target)}${m.done ? " ✓" : ""}`} style={{
                    position: "absolute", left: `${off}%`, top: "50%", transform: "translate(-50%, -50%)",
                    width: 5, height: 5, borderRadius: "50%",
                    background: m.done ? F.plum : F.surface,
                    boxShadow: `0 0 0 1px ${F.plum}`,
                  }} />
                );
              })}
            </div>
          );
        })}
      </div>

      {selGroup && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${F.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: F.plum, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: colorFor(selGroup) }} />
            {selGroup} — {selectedInits.length} initiative{selectedInits.length !== 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[...selectedInits].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).map((i) => {
              const done = (i.milestones || []).filter((m) => m.done).length;
              const total = (i.milestones || []).length;
              return (
                <div key={i.id} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12.5, color: F.plum, padding: "4px 6px", borderRadius: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: sC(i.status), flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{i.name}</span>
                  <span style={{ color: F.muted, fontSize: 11, fontWeight: 600 }}>{done}/{total}</span>
                  <span style={{ color: F.muted, fontSize: 11, minWidth: 56, textAlign: "right", fontWeight: 600 }}>{fmt(i.deadline)}</span>
                  <span style={{ fontSize: 10, color: F.muted2, minWidth: 78, textAlign: "right", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{STATUS_OPTIONS.find((o) => o.value === i.status)?.label || i.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Generic Tracker Page ── */
function TrackerPage({ title, subtitle, storageKey, defaults, ModalComponent, extraRowInfo, extraDetailFields, onCelebrate, sortField, addLabel = "+ Initiative" }) {
  const [inits, setInits] = useState(defaults);
  const [sel, setSel] = useState(null);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set()); // collapsed by default
  const [selGroup, setSelGroup] = useState(null); // analytics chart filter; lifted so it can drive group expansion below
  const [hoverGroup, setHoverGroup] = useState(null);
  const saveTimeout = useRef(null);
  const toggleGroup = (g) => setExpandedGroups(prev => { const n = new Set(prev); if (n.has(g)) n.delete(g); else n.add(g); return n; });
  // Selecting a group in the analytics chip auto-expands that group's row in the list below
  useEffect(() => { if (selGroup) setExpandedGroups(prev => prev.has(selGroup) ? prev : new Set(prev).add(selGroup)); }, [selGroup]);

  // Load saved state and merge in any new default initiatives (preserves user edits — never overwrites saved milestones/status/etc.)
  useEffect(() => { (async () => { const s = await loadState(storageKey); if (s?.inits) { const savedIds = new Set(s.inits.map(i => i.id)); const newOnes = defaults.filter(d => !savedIds.has(d.id)); setInits(newOnes.length ? [...s.inits, ...newOnes] : s.inits); } setReady(true); })(); }, []);
  useEffect(() => { if (!ready) return; clearTimeout(saveTimeout.current); saveTimeout.current = setTimeout(() => saveState(storageKey, { inits }), 1000); return () => clearTimeout(saveTimeout.current); }, [inits, ready]);

  const prev = useRef({});
  const upd = (ni) => { for (const n of ni) { if (n.status === "complete" && prev.current[n.id] !== "complete") onCelebrate?.(n.name); } const m = {}; ni.forEach(i => m[i.id] = i.status); prev.current = m; setInits(ni); };
  useEffect(() => { const m = {}; inits.forEach(i => m[i.id] = i.status); prev.current = m; }, [ready]);

  const updateMs = (id, ms) => upd(inits.map(i => i.id === id ? { ...i, milestones: ms } : i));
  const setSt = (id, s) => upd(inits.map(i => i.id === id ? { ...i, status: s } : i));
  const setDl = (id, d) => upd(inits.map(i => i.id === id ? { ...i, deadline: d } : i));
  const setOwner = (id, o) => upd(inits.map(i => i.id === id ? { ...i, owner: o } : i));
  const setField = (id, field, val) => upd(inits.map(i => i.id === id ? { ...i, [field]: val } : i));
  const saveInit = (data) => { if (modal === "new") { const nid = Math.max(0, ...inits.map(i => i.id)) + 1; upd([...inits, { id: nid, ...data, milestones: [] }]); } else { upd(inits.map(i => i.id === modal ? { ...i, ...data } : i)); } setModal(null); };
  const delInit = () => { upd(inits.filter(i => i.id !== modal)); if (sel === modal) setSel(null); setModal(null); };
  const reorder = (i, dir) => upd(dir === "up" ? moveUp(inits, i) : moveDn(inits, i));

  const sorted = [...inits].sort((a, b) => (a[sortField || "owner"] || "zzz").localeCompare(b[sortField || "owner"] || "zzz"));
  const allDone = inits.reduce((a, i) => a + (i.milestones || []).filter(m => m.done).length, 0);
  const allTotal = inits.reduce((a, i) => a + (i.milestones || []).length, 0);
  const allPct = allTotal ? Math.round((allDone / allTotal) * 100) : 0;
  const months = monthMarkers();
  const now = new Date();
  const editInit = modal && modal !== "new" ? inits.find(i => i.id === modal) : null;
  const LABEL_W = 310;

  // Next upcoming open milestone across all initiatives (used in stat card footer)
  const upcoming = inits
    .flatMap(i => (i.milestones || []).filter(m => !m.done).map(m => ({ ...m, init: i })))
    .filter(m => new Date(m.target + "T23:59:59") >= now)
    .sort((a, b) => new Date(a.target) - new Date(b.target))[0];

  const statTile = (label, value, sub) => (
    <div style={{ flex: 1, padding: "0 22px", borderRight: `1px solid ${F.border}`, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 110 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: F.plum, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: F.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: F.plum, lineHeight: 1.15 }}>{title}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: F.muted }}>{subtitle}</p>
        </div>
      </div>

      <div style={{
        background: F.surface,
        border: `1px solid ${F.border}`,
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 20,
        boxShadow: F.shadowSm,
        display: "flex",
        flexDirection: "column",
        gap: upcoming ? 12 : 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
          <div style={{ flex: 1, padding: "0 22px 0 4px", borderRight: `1px solid ${F.border}`, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 110 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Initiatives</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: F.plum, lineHeight: 1.1 }}>{inits.length}</div>
          </div>
          {statTile("Milestones", `${allDone}/${allTotal}`, "complete")}
          <div style={{ flex: 1, padding: "0 22px", borderRight: `1px solid ${F.border}`, display: "flex", alignItems: "center", gap: 14, minWidth: 150 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Progress</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: F.plum, lineHeight: 1.1 }}>{allPct}%</div>
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ring pct={allPct} size={46} stroke={4.5} color={F.pink} />
            </div>
          </div>
          <div style={{ paddingLeft: 22, display: "flex", alignItems: "center" }}>
            <button onClick={() => setModal("new")} style={{ ...bt("primary"), padding: "9px 18px", fontSize: 13 }}>{addLabel}</button>
          </div>
        </div>
        {upcoming && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12, borderTop: `1px solid ${F.border}`, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Next up</span>
            <span style={{ fontSize: 13, color: F.plum, fontWeight: 600 }}>{upcoming.label}</span>
            <span style={{ fontSize: 11.5, color: F.muted }}>· {upcoming.init.name}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: F.pink, padding: "2px 8px", borderRadius: 999, background: F.lightPink + "55" }}>{fmt(upcoming.target)}</span>
          </div>
        )}
      </div>

      <AnalyticsTimeline inits={inits} groupField={sortField || "owner"} selGroup={selGroup} setSelGroup={setSelGroup} />

      <div style={{ position: "relative" }}>
        <div style={{ position: "relative", height: 24, marginBottom: 8, marginLeft: LABEL_W + 24 }}>
          {months.map(m => <div key={m.label + m.pct} style={{ position: "absolute", left: `${m.pct}%`, fontSize: 10.5, color: F.muted2, fontWeight: 700, transform: "translateX(-50%)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{m.label}</div>)}
        </div>

        {(() => {
          const gkey = sortField || "owner";
          const grouped = [];
          const seenIdx = new Map();
          sorted.forEach((init) => {
            const g = init[gkey] || "Unassigned";
            if (!seenIdx.has(g)) { seenIdx.set(g, grouped.length); grouped.push([g, []]); }
            grouped[seenIdx.get(g)][1].push(init);
          });

          return grouped.map(([groupName, items]) => {
            const expanded = expandedGroups.has(groupName);
            const gDone = items.reduce((a, i) => a + (i.milestones || []).filter(m => m.done).length, 0);
            const gTotal = items.reduce((a, i) => a + (i.milestones || []).length, 0);
            const gPct = gTotal ? Math.round((gDone / gTotal) * 100) : 0;

            return (
              <div key={groupName}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleGroup(groupName)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleGroup(groupName); } }}
                  onMouseEnter={() => setHoverGroup(groupName)}
                  onMouseLeave={() => setHoverGroup(null)}
                  style={{
                    cursor: "pointer", userSelect: "none",
                    padding: "12px 16px", marginTop: 14, marginBottom: 6,
                    display: "flex", alignItems: "center", gap: 12,
                    borderRadius: 10,
                    background: hoverGroup === groupName
                      ? F.surface
                      : expanded ? F.lightYellow : F.bg,
                    border: `1px solid ${expanded ? F.yellow : (hoverGroup === groupName ? F.borderStrong : F.border)}`,
                    transition: "all 0.1s",
                    boxShadow: expanded || hoverGroup === groupName ? F.shadowSm : "none",
                  }}
                >
                  <span style={{
                    width: 24, height: 24, borderRadius: 6,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: expanded ? F.plum : F.surface,
                    border: `1px solid ${expanded ? F.plum : F.borderStrong}`,
                    fontSize: 10, color: expanded ? F.paper : F.plum,
                    transform: expanded ? "rotate(90deg)" : "none",
                    transition: "all 0.1s",
                    flexShrink: 0,
                  }}>▶</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: F.plum, textTransform: "uppercase", letterSpacing: "0.06em" }}>{groupName}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: F.muted, padding: "2px 8px", borderRadius: 999, background: F.surface, border: `1px solid ${F.border}` }}>{items.length}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: gPct === 100 ? F.green : F.plum }}>{gDone}/{gTotal} · {gPct}%</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: expanded ? F.paper : F.plum,
                    padding: "4px 10px", borderRadius: 6,
                    background: expanded ? F.plum : F.surface,
                    border: `1px solid ${expanded ? F.plum : F.borderStrong}`,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>{expanded ? "Hide" : "Show"}</span>
                </div>

                {expanded && items.map((init) => {
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

                  return (
                    <div key={init.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0, width: 18, flexShrink: 0 }}>
                    <button onClick={() => reorder(idx, "up")} style={{ background: "none", border: "none", color: idx === 0 ? F.border : F.muted2, cursor: idx === 0 ? "default" : "pointer", fontSize: 10, padding: 0, lineHeight: 1 }}>&#9650;</button>
                    <button onClick={() => reorder(idx, "down")} style={{ background: "none", border: "none", color: idx === inits.length-1 ? F.border : F.muted2, cursor: idx === inits.length-1 ? "default" : "pointer", fontSize: 10, padding: 0, lineHeight: 1 }}>&#9660;</button>
                  </div>
                  <div onClick={() => setSel(active ? null : init.id)} style={{
                    display: "flex", alignItems: "stretch", cursor: "pointer", flex: 1, borderRadius: 10, overflow: "hidden",
                    background: F.surface,
                    border: `1px solid ${active ? F.borderStrong : F.border}`,
                    boxShadow: active ? F.shadowMd : F.shadowSm,
                    transition: "all 0.1s", opacity: done ? 0.65 : 1, minHeight: 56,
                  }}>
                    <div style={{ width: LABEL_W, minWidth: LABEL_W, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderRight: `1px solid ${F.border}` }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: F.plum, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", textDecoration: done ? "line-through" : "none" }} title={init.name}>{init.name}</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: F.muted, fontWeight: 500 }}>{init.owner || "No owner"}</span>
                          {extraRowInfo?.(init)}
                        </div>
                        {/* Per-initiative progress bar */}
                        <MiniProgress pct={pctDone} color={color} />
                      </div>
                      {done && <span style={{ fontSize: 16, flexShrink: 0 }}>🏆</span>}
                    </div>
                    <div style={{ flex: 1, position: "relative", padding: "14px 16px 14px 0", background: F.bg }}>
                      {barW > 0 && <div style={{ position: "absolute", left: `${startPct}%`, width: `${barW}%`, top: "50%", transform: "translateY(-50%)", height: 6, borderRadius: 3, background: color, opacity: 0.18 }} />}
                      {barW > 0 && <div style={{ position: "absolute", left: `${startPct}%`, width: `${barW * (pctDone / 100)}%`, top: "50%", transform: "translateY(-50%)", height: 6, borderRadius: 3, background: color, transition: "width 0.3s" }} />}
                      {ms.map((m, mi) => (
                        <div key={mi} style={{ position: "absolute", left: `${dP(m.target)}%`, top: "50%", transform: "translate(-50%,-50%) rotate(45deg)", zIndex: 2, width: m.done ? 12 : 10, height: m.done ? 12 : 10, background: m.done ? color : F.surface, border: `2px solid ${color}`, transition: "all 0.2s" }} title={`${m.label} - ${fmt(m.target)}`} />
                      ))}
                      <div style={{ position: "absolute", left: `${dlPct}%`, top: "50%", transform: "translate(-50%,-50%)", zIndex: 2, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `9px solid ${isPast ? F.pink : F.plum}` }} title={`Deadline: ${fmt(init.deadline)}`} />
                    </div>
                  </div>
                </div>

                {active && (
                  <div style={{ background: F.surface, borderRadius: "0 0 10px 10px", border: `1px solid ${F.border}`, borderTop: "none", padding: "20px 22px", marginTop: -8, marginBottom: 8, marginLeft: 23, boxShadow: F.shadowSm }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <p style={{ fontSize: 13, color: F.muted, margin: 0, lineHeight: 1.5, flex: 1 }}>{init.description}</p>
                      <button onClick={e => { e.stopPropagation(); setModal(init.id); }} style={{ ...bt(), marginLeft: 14, flexShrink: 0 }}>Edit</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 22 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={lb}>Milestones</div>
                          <div style={{ fontSize: 11, color: F.muted, fontWeight: 700 }}>{doneCt} of {ms.length} · {pctDone}%</div>
                        </div>
                        <div style={{ height: 4, background: F.bg, border: `1px solid ${F.border}`, borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
                          <div style={{ width: `${pctDone}%`, height: "100%", background: color, transition: "width 0.3s" }} />
                        </div>
                        <MsEd milestones={ms} onChange={newMs => updateMs(init.id, newMs)} color={color} />
                      </div>
                      <div>
                        {extraDetailFields?.(init, setField)}
                        <div style={lb}>Owner</div>
                        <input value={init.owner || ""} onChange={e => { e.stopPropagation(); setOwner(init.id, e.target.value); }} onClick={e => e.stopPropagation()} style={{ ...inp, width: "100%", marginBottom: 12 }} />
                        <div style={lb}>Status</div>
                        <select value={init.status} onChange={e => { e.stopPropagation(); setSt(init.id, e.target.value); }} onClick={e => e.stopPropagation()} style={{ ...inp, width: "100%", cursor: "pointer" }}>
                          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
                          <Ring pct={pctDone} size={42} stroke={4.5} color={color} />
                          <div><div style={{ fontSize: 20, fontWeight: 700, color: F.plum }}>{pctDone}%</div><div style={{ fontSize: 11, color: F.muted }}>{doneCt}/{ms.length} milestones</div></div>
                        </div>
                        <div style={{ ...lb, marginTop: 16 }}>Deadline</div>
                        <input type="date" value={init.deadline} onChange={e => { e.stopPropagation(); setDl(init.id, e.target.value); }} onClick={e => e.stopPropagation()} style={{ ...inp, width: "100%" }} />
                      </div>
                    </div>
                  </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          });
        })()}
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 26, flexWrap: "wrap", alignItems: "center", padding: "14px 18px", background: F.surface, border: `1px solid ${F.border}`, borderRadius: 10, boxShadow: F.shadowSm }}>
        {[
          { el: <div style={{ width: 9, height: 9, transform: "rotate(45deg)", background: F.surface, border: `2px solid ${F.plum}` }} />, t: "Open" },
          { el: <div style={{ width: 9, height: 9, transform: "rotate(45deg)", background: F.plum, border: `2px solid ${F.plum}` }} />, t: "Done" },
          { el: <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `7px solid ${F.muted}` }} />, t: "Deadline" },
          { el: <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `7px solid ${F.pink}` }} />, t: "Late" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>{item.el}<span style={{ fontSize: 11, fontWeight: 600, color: F.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.t}</span></div>
        ))}
      </div>
      {modal && <ModalComponent init={modal === "new" ? null : editInit} onSave={saveInit} onClose={() => setModal(null)} onDelete={delInit} />}
    </>
  );
}

/* ── AI Monetization Page ─────────────────────────────────
   Editable "open discussion" working doc. Reads AI features
   from faria-ai-v12 (same store as the AI Powered Features page)
   and writes them back; reads/writes monetization config to
   faria-ai-monetization-v1. */
function AiMonetizationPage() {
  const [ai, setAi] = useState({ inits: [] });
  const [mz, setMz] = useState(DEFAULT_MONETIZATION);
  const [readyAi, setReadyAi] = useState(false);
  const [readyMz, setReadyMz] = useState(false);
  const [expanded, setExpanded] = useState(new Set(MONZ_PRODUCTS)); // all expanded by default
  const [editFeat, setEditFeat] = useState(null); // feature id whose rationale is being edited
  const [editLimits, setEditLimits] = useState(null); // feature id whose limits are being edited
  const [bundlePick, setBundlePick] = useState(new Set(MONZ_PRODUCTS));
  const aiSaveTimer = useRef(null);
  const mzSaveTimer = useRef(null);

  // Load both stores
  useEffect(() => { (async () => {
    const s = await loadState("faria-ai-v12");
    if (s?.inits) setAi({ inits: s.inits });
    setReadyAi(true);
  })(); }, []);
  useEffect(() => { (async () => {
    const s = await loadState("faria-ai-monetization-v1");
    setMz(mergeMonz(s));
    setReadyMz(true);
  })(); }, []);

  // Debounced saves
  useEffect(() => { if (!readyAi) return; clearTimeout(aiSaveTimer.current); aiSaveTimer.current = setTimeout(() => saveState("faria-ai-v12", ai), 1000); return () => clearTimeout(aiSaveTimer.current); }, [ai, readyAi]);
  useEffect(() => { if (!readyMz) return; clearTimeout(mzSaveTimer.current); mzSaveTimer.current = setTimeout(() => saveState("faria-ai-monetization-v1", mz), 1000); return () => clearTimeout(mzSaveTimer.current); }, [mz, readyMz]);

  // Mutators
  const setFeatField = (id, patch) => setAi(prev => ({ ...prev, inits: prev.inits.map(f => f.id === id ? { ...f, ...patch } : f) }));
  const setProductField = (prod, patch) => setMz(prev => ({ ...prev, products: { ...prev.products, [prod]: { ...prev.products[prod], ...patch } } }));
  const setDiscount = (idx, patch) => setMz(prev => ({ ...prev, bundleDiscounts: prev.bundleDiscounts.map((d, i) => i === idx ? { ...d, ...patch } : d) }));
  const setFilterBullet = (idx, val) => setMz(prev => ({ ...prev, framework: { ...prev.framework, proFilter: prev.framework.proFilter.map((b, i) => i === idx ? val : b) } }));
  const addFilterRule = () => setMz(prev => ({ ...prev, framework: { ...prev.framework, proFilter: [...prev.framework.proFilter, ""] } }));
  const removeFilterRule = (idx) => setMz(prev => ({ ...prev, framework: { ...prev.framework, proFilter: prev.framework.proFilter.filter((_, i) => i !== idx) } }));
  const toggleExpand = (p) => setExpanded(prev => { const n = new Set(prev); if (n.has(p)) n.delete(p); else n.add(p); return n; });
  const toggleBundle = (p) => setBundlePick(prev => { const n = new Set(prev); if (n.has(p)) n.delete(p); else n.add(p); return n; });

  // Computed
  const featuresByProduct = (prod) => ai.inits.filter(f => f.product === prod);
  const proReadyDate = (prod) => {
    const pros = featuresByProduct(prod).filter(f => effectiveTier(f) === "pro");
    if (pros.length === 0) return { label: "No Pro candidates yet", muted: true };
    const openPros = pros.filter(f => f.status !== "complete");
    if (openPros.length === 0) {
      const last = pros.map(f => f.deadline).sort().slice(-1)[0];
      return { label: `Live since ${fmt(last)}`, muted: false, complete: true };
    }
    const earliest = openPros.map(f => f.deadline).sort()[0];
    return { label: `Ready ${fmt(earliest)} (${pros.length - openPros.length}/${pros.length} shipped)`, muted: false };
  };
  const proShipped = (prod) => {
    const pros = featuresByProduct(prod).filter(f => effectiveTier(f) === "pro");
    return { done: pros.filter(f => f.status === "complete").length, total: pros.length };
  };

  // Bundle calc
  const bundleArr = [...bundlePick];
  const bundleSubtotal = bundleArr.reduce((s, p) => s + (Number(mz.products[p]?.price) || 0), 0);
  const bundleRule = mz.bundleDiscounts.find(d => d.products === bundleArr.length);
  const bundleDisc = bundleSubtotal * ((bundleRule?.pct || 0) / 100);
  const bundleTotal = bundleSubtotal - bundleDisc;

  // Tier badge
  const tierBadge = (tier) => {
    const map = {
      pro:        { bg: F.plum,        fg: F.paper, label: "AI Pro" },
      essential:  { bg: F.lightYellow, fg: F.plum,  label: "AI Essential" },
      unassigned: { bg: F.bg,          fg: F.muted2, label: "Unassigned" },
    };
    const m = map[tier] || map.unassigned;
    return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: m.bg, color: m.fg, textTransform: "uppercase", letterSpacing: "0.05em", border: tier === "unassigned" ? `1px solid ${F.border}` : "none" }}>{m.label}</span>;
  };

  const card = { background: F.surface, border: `1px solid ${F.border}`, borderRadius: 12, padding: "18px 22px", marginBottom: 18, boxShadow: F.shadowSm };
  const sectionTitle = { fontSize: 11, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 };

  const editFeatObj = editFeat != null ? ai.inits.find(f => f.id === editFeat) : null;
  const editLimitsObj = editLimits != null ? ai.inits.find(f => f.id === editLimits) : null;

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: F.plum, lineHeight: 1.15 }}>Current Monetization Plan (open discussion)</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13.5, color: F.muted }}>Working framework for AI Essential vs AI Pro across Faria products. Edit anything inline — this is a living document.</p>
      </div>

      {/* Framework card — visual side-by-side with demarcation rules in the middle */}
      <div style={card}>
        <div style={sectionTitle}>Framework</div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.15fr 1fr",
          gap: 0,
          borderRadius: 10,
          overflow: "hidden",
          border: `1px solid ${F.border}`,
        }}>
          {/* AI Essential */}
          <div style={{ background: F.lightYellow + "55", padding: "20px 22px", borderRight: `1px solid ${F.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: F.plum, textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Essential</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: F.plum, background: F.yellow, padding: "2px 8px", borderRadius: 4 }}>FREE</span>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 12.5, color: F.plum, fontWeight: 700 }}>Default-on for every school</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: F.muted, lineHeight: 1.65 }}>
              <li>Broad, low-friction AI conveniences shipped to every customer</li>
              <li>The everyday "table-stakes" surface for AI inside Faria products</li>
              <li>Lower fair-use caps to keep inference cost bounded on the free tier</li>
            </ul>
          </div>

          {/* Demarcation rules */}
          <div style={{ background: F.bg, padding: "20px 22px", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, textAlign: "center" }}>Demarcation line</div>
            <p style={{ margin: "0 0 12px", fontSize: 12.5, color: F.plum, fontWeight: 700, textAlign: "center" }}>A feature crosses into AI Pro when it…</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
              {mz.framework.proFilter.map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: F.surface, border: `1px solid ${F.border}`, borderRadius: 7, padding: "6px 8px 6px 10px" }}>
                  <span style={{ width: 18, height: 18, borderRadius: 9, background: F.pink, color: "#fff", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                  <input value={b} onChange={e => setFilterBullet(i, e.target.value)} placeholder="New rule…" style={{ flex: 1, fontSize: 12.5, padding: "2px 4px", border: "none", background: "transparent", color: F.plum, outline: "none", fontFamily: "inherit", fontWeight: 500, minWidth: 0 }} />
                  <button onClick={() => removeFilterRule(i)} title="Remove rule" style={{ width: 20, height: 20, borderRadius: 10, border: "none", background: "transparent", color: F.muted2, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }} onMouseEnter={e => { e.currentTarget.style.background = F.bg; e.currentTarget.style.color = F.pink; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = F.muted2; }}>×</button>
                </div>
              ))}
              <button onClick={addFilterRule} style={{ marginTop: 2, padding: "6px 10px", borderRadius: 7, border: `1px dashed ${F.borderStrong}`, background: "transparent", color: F.plum, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Add rule</button>
            </div>
            <div style={{ marginTop: 12, fontSize: 11.5, color: F.muted, fontStyle: "italic", textAlign: "center" }}>Pass <strong style={{ color: F.plum }}>any one</strong> rule → Pro. Else → Essential.</div>
          </div>

          {/* AI Pro */}
          <div style={{ background: F.plum, padding: "20px 22px", color: F.paper, borderLeft: `1px solid ${F.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: F.paper, textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Pro</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: F.plum, background: F.yellow, padding: "2px 8px", borderRadius: 4 }}>PAID SKU</span>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 12.5, color: F.paper, fontWeight: 700, opacity: 0.95 }}>Separate SKU per product · bundle discount stacks</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: F.paper, opacity: 0.88, lineHeight: 1.65 }}>
              <li>Workflow-class wins that are worth paying for</li>
              <li>Higher fair-use caps for real production workloads</li>
              <li>Each product validates 2–3 "wow" outcomes before paid go-live</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SKUs & pricing */}
      <div style={card}>
        <div style={sectionTitle}>SKUs &amp; pricing</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {MONZ_PRODUCTS.map(p => {
            const pd = mz.products[p] || { sku: "", unit: "", price: 0 };
            return (
              <div key={p} style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{p}</div>
                <input value={pd.sku} onChange={e => setProductField(p, { sku: e.target.value })} style={{ ...inp, width: "100%", marginTop: 6, fontWeight: 700 }} />
                <div style={{ display: "flex", gap: 4, marginTop: 10, alignItems: "center", minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: F.plum }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pd.price ? pd.price : ""}
                    placeholder="0"
                    onChange={e => {
                      const v = e.target.value;
                      setProductField(p, { price: v === "" ? null : (parseFloat(v) || 0) });
                    }}
                    style={{ ...inp, flex: 1, minWidth: 0, width: "100%", fontWeight: 700, fontSize: 15, padding: "7px 9px" }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ ...sectionTitle, marginBottom: 8 }}>Bundle discounts (stacked)</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            {mz.bundleDiscounts.map((d, i) => (
              <div key={i} style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <input type="number" min="2" max="10" value={d.products} onChange={e => setDiscount(i, { products: parseInt(e.target.value) || 2 })} style={{ ...inp, width: 52, padding: "4px 8px", textAlign: "center" }} />
                <span style={{ fontSize: 12, color: F.muted, fontWeight: 600 }}>products →</span>
                <input type="number" min="0" max="100" value={d.pct} onChange={e => setDiscount(i, { pct: parseFloat(e.target.value) || 0 })} style={{ ...inp, width: 60, padding: "4px 8px", textAlign: "center" }} />
                <span style={{ fontSize: 12, color: F.muted, fontWeight: 600 }}>% off</span>
              </div>
            ))}
          </div>

          <div style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Worked example</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
              {MONZ_PRODUCTS.map(p => (
                <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: F.plum }}>
                  <input type="checkbox" checked={bundlePick.has(p)} onChange={() => toggleBundle(p)} style={{ cursor: "pointer" }} />
                  {p}
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, alignItems: "baseline" }}>
              <div><span style={{ color: F.muted, fontWeight: 600 }}>Subtotal</span> <strong style={{ color: F.plum }}>${bundleSubtotal.toFixed(2)}</strong></div>
              <div><span style={{ color: F.muted, fontWeight: 600 }}>Bundle disc.</span> <strong style={{ color: F.pink }}>-${bundleDisc.toFixed(2)}</strong>{bundleRule && <span style={{ fontSize: 11, color: F.muted, marginLeft: 4 }}>({bundleRule.pct}% off, {bundleRule.products} products)</span>}</div>
              <div style={{ marginLeft: "auto", fontSize: 16 }}><span style={{ color: F.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 11 }}>Total</span> <strong style={{ color: F.plum, fontSize: 18 }}>${bundleTotal.toFixed(2)}</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Per-product breakdown */}
      {MONZ_PRODUCTS.map(prod => {
        const pd = mz.products[prod] || { wowOutcomes: ["", "", ""] };
        const isOpen = expanded.has(prod);
        const feats = featuresByProduct(prod);
        const pro = feats.filter(f => effectiveTier(f) === "pro");
        const ess = feats.filter(f => effectiveTier(f) === "essential");
        const un  = feats.filter(f => effectiveTier(f) === "unassigned");
        const ship = proShipped(prod);
        const ready = proReadyDate(prod);
        const limited = feats.filter(f => f.actionLimits);

        return (
          <div key={prod} style={card}>
            <div onClick={() => toggleExpand(prod)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", userSelect: "none" }}>
              <span style={{ color: F.plum, fontSize: 12, transition: "transform 0.15s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: F.plum, flex: 1 }}>{prod}</h2>
              <span style={{ fontSize: 11, fontWeight: 700, color: ready.complete ? F.green : (ready.muted ? F.muted2 : F.plum), background: ready.complete ? F.greenSoft : F.bg, padding: "3px 10px", borderRadius: 999, border: `1px solid ${ready.complete ? F.green : F.border}` }}>{ready.label}</span>
              <span style={{ fontSize: 11, color: F.muted, fontWeight: 600 }}>{ship.done}/{ship.total} Pro shipped</span>
            </div>

            {isOpen && (
              <div style={{ marginTop: 16 }}>
                {/* "Wow" outcomes — surfaced from Pro features. Edit each feature's outcome inline. */}
                <div style={{ marginBottom: 18 }}>
                  <div style={sectionTitle}>"Wow" outcomes — carried from Pro features</div>
                  {pro.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 12.5, color: F.muted, fontStyle: "italic" }}>No Pro features yet. Move features into Pro and set their "wow" outcome to track 2–3 validation targets before paid go-live.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {pro.map(f => (
                        <div key={f.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px", background: F.bg, border: `1px solid ${F.border}`, borderRadius: 8 }}>
                          <span style={{ color: F.pink, fontSize: 14, lineHeight: 1.2, paddingTop: 1 }}>★</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: F.plum }}>{f.name}</div>
                            {f.wowOutcome ? (
                              <div style={{ fontSize: 12, color: F.plum, marginTop: 3, lineHeight: 1.5 }}>{f.wowOutcome}</div>
                            ) : (
                              <div style={{ fontSize: 11.5, color: F.muted2, marginTop: 3, fontStyle: "italic" }}>No wow outcome set yet.</div>
                            )}
                          </div>
                          <button onClick={() => setEditFeat(f.id)} style={{ ...bt("ghost"), padding: "3px 8px", fontSize: 10.5 }}>edit</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p style={{ margin: "10px 0 0", fontSize: 11.5, color: F.muted, fontStyle: "italic" }}>Validate 2–3 of these before {prod} AI Pro goes live.</p>
                </div>

                {/* Feature buckets */}
                <div style={sectionTitle}>Features by tier</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  {[
                    { key: "pro", title: "AI Pro", list: pro, bg: F.plum, fg: F.paper, bd: F.plum },
                    { key: "essential", title: "AI Essential", list: ess, bg: F.lightYellow, fg: F.plum, bd: F.yellow },
                  ].map(b => (
                    <div key={b.key} style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ background: b.bg, color: b.fg, padding: "8px 12px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>{b.title}</span>
                        <span style={{ fontSize: 11, opacity: 0.85 }}>{b.list.length}</span>
                      </div>
                      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
                        {b.list.length === 0 && <div style={{ fontSize: 12, color: F.muted2, fontStyle: "italic", textAlign: "center", padding: 12 }}>No features yet</div>}
                        {b.list.map(f => (
                          <div key={f.id} style={{ background: F.surface, border: `1px solid ${F.border}`, borderRadius: 8, padding: "8px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: sC(f.status), flexShrink: 0 }} />
                              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: F.plum }}>{f.name}</span>
                              <span style={{ fontSize: 10, color: F.muted2, fontWeight: 600 }}>{fmt(f.deadline)}</span>
                            </div>
                            {f.wowOutcome && b.key === "pro" && <div style={{ fontSize: 11.5, color: F.pink, marginLeft: 12, marginBottom: 4, lineHeight: 1.45, fontWeight: 600 }}>★ {f.wowOutcome}</div>}
                            {f.valueRationale && <div style={{ fontSize: 11.5, color: F.muted, marginLeft: 12, marginBottom: 6, lineHeight: 1.4 }}><span style={{ fontWeight: 700, color: F.muted2 }}>Why {b.title}:</span> {f.valueRationale}</div>}
                            <div style={{ display: "flex", gap: 4, marginLeft: 12, flexWrap: "wrap" }}>
                              <button onClick={() => setEditFeat(f.id)} style={{ ...bt("ghost"), padding: "3px 8px", fontSize: 10.5 }}>edit</button>
                              {b.key !== "pro" && <button onClick={() => setFeatField(f.id, { tier: "pro" })} style={{ ...bt(), padding: "3px 8px", fontSize: 10.5 }}>→ Pro</button>}
                              {b.key !== "essential" && <button onClick={() => setFeatField(f.id, { tier: "essential" })} style={{ ...bt(), padding: "3px 8px", fontSize: 10.5 }}>→ Essential</button>}
                              <button onClick={() => setFeatField(f.id, { tier: "unassigned" })} style={{ ...bt("ghost"), padding: "3px 8px", fontSize: 10.5, color: F.muted }}>→ Unassigned</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {un.length > 0 && (
                  <div style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
                    <div style={{ background: F.surface, color: F.muted, padding: "8px 12px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${F.border}` }}>Unassigned · {un.length}</div>
                    <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      {un.map(f => (
                        <div key={f.id} style={{ background: F.surface, border: `1px solid ${F.border}`, borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: sC(f.status), flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: F.plum, minWidth: 200 }}>{f.name}</span>
                          <span style={{ fontSize: 10, color: F.muted2, fontWeight: 600 }}>{fmt(f.deadline)}</span>
                          <button onClick={() => setFeatField(f.id, { tier: "pro" })} style={{ ...bt(), padding: "3px 8px", fontSize: 10.5 }}>→ Pro</button>
                          <button onClick={() => setFeatField(f.id, { tier: "essential" })} style={{ ...bt(), padding: "3px 8px", fontSize: 10.5 }}>→ Essential</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fair use limits */}
                <div style={sectionTitle}>Fair use limits (per AI action, per tier)</div>
                <div style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 70px", background: F.surface, padding: "8px 12px", fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${F.border}` }}>
                    <div>Action</div>
                    <div>AI Essential</div>
                    <div>AI Pro</div>
                    <div></div>
                  </div>
                  {limited.length === 0 && <div style={{ padding: 14, fontSize: 12.5, color: F.muted, fontStyle: "italic", textAlign: "center" }}>No fair-use limits set. Add limits to any AI action that consumes inference cost.</div>}
                  {limited.map(f => {
                    const al = f.actionLimits;
                    const tierCell = (t) => (
                      <div style={{ fontSize: 12, color: F.plum, lineHeight: 1.5 }}>
                        <div>{al.perUser?.[t] != null ? `${al.perUser[t]} / user / ${al.unit}` : "—"}</div>
                        <div style={{ color: F.muted, fontSize: 11.5 }}>{al.perAccount?.[t] != null ? `${al.perAccount[t]} / account / ${al.unit}` : "—"}</div>
                      </div>
                    );
                    return (
                      <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 70px", padding: "10px 12px", borderBottom: `1px solid ${F.border}`, alignItems: "center" }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: F.plum }}>{f.name} <span style={{ fontSize: 10, fontWeight: 700, color: F.muted2 }}>· {effectiveTier(f).toUpperCase()}</span></div>
                        {tierCell("essential")}
                        {tierCell("pro")}
                        <button onClick={() => setEditLimits(f.id)} style={{ ...bt(), padding: "3px 8px", fontSize: 10.5 }}>edit</button>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => { const first = feats.find(f => !f.actionLimits); if (first) setEditLimits(first.id); }} style={{ ...bt(), fontSize: 12 }}>+ Add fair-use limit</button>
                <p style={{ margin: "10px 0 0", fontSize: 11.5, color: F.muted, fontStyle: "italic" }}>Essential = generous-but-bounded so most schools never hit it. Pro = high cap to safeguard our inference investment.</p>
              </div>
            )}
          </div>
        );
      })}

      {/* Launch timeline */}
      <div style={card}>
        <div style={sectionTitle}>Launch timeline</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MONZ_PRODUCTS.map(prod => {
            const ready = proReadyDate(prod);
            const ship = proShipped(prod);
            const pct = ship.total > 0 ? Math.round((ship.done / ship.total) * 100) : 0;
            return (
              <div key={prod} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ minWidth: 110, fontSize: 13, fontWeight: 700, color: F.plum }}>{prod} Pro</div>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: F.bg, border: `1px solid ${F.border}`, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: ready.complete ? F.green : F.plum, transition: "width 0.3s" }} />
                </div>
                <div style={{ minWidth: 170, fontSize: 12, color: F.muted, fontWeight: 600, textAlign: "right" }}>{ready.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature details editor modal — wow outcome + value rationale */}
      {editFeatObj && (
        <Modal onClose={() => setEditFeat(null)}>
          <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: F.plum }}>Feature details</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: F.muted }}>{editFeatObj.name} · {editFeatObj.product} · <strong style={{ color: F.plum }}>{effectiveTier(editFeatObj) === "pro" ? "AI Pro" : effectiveTier(editFeatObj) === "essential" ? "AI Essential" : "Unassigned"}</strong></p>

          <div style={lb}>"Wow" outcome <span style={{ color: F.pink, marginLeft: 4 }}>★</span></div>
          <input value={editFeatObj.wowOutcome || ""} onChange={e => setFeatField(editFeatObj.id, { wowOutcome: e.target.value })} placeholder='e.g. 15% conversion lift in admissions pipeline' style={{ ...inp, width: "100%", marginBottom: 4 }} />
          <p style={{ margin: "4px 0 14px", fontSize: 11.5, color: F.muted, fontStyle: "italic" }}>The single measurable "wow" we'll validate before {editFeatObj.product} AI Pro goes live. Surfaced at the top of the {editFeatObj.product} block.</p>

          <div style={lb}>Value rationale</div>
          <textarea value={editFeatObj.valueRationale || ""} onChange={e => setFeatField(editFeatObj.id, { valueRationale: e.target.value })} rows={4} placeholder="Why is this Pro (or Essential)? e.g. saves 5+ hrs/wk of manual review; unlocks predictive enrolment likelihood" style={{ ...inp, width: "100%", resize: "vertical" }} />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button onClick={() => setEditFeat(null)} style={bt("primary")}>Done</button>
          </div>
        </Modal>
      )}

      {/* Limits editor modal */}
      {editLimitsObj && (
        <LimitsModal feat={editLimitsObj} feats={featuresByProduct(editLimitsObj.product)} onPick={(id) => setEditLimits(id)} onChange={(patch) => setFeatField(editLimitsObj.id, patch)} onClose={() => setEditLimits(null)} />
      )}
    </>
  );
}

function LimitsModal({ feat, feats, onPick, onChange, onClose }) {
  const al = feat.actionLimits || { perUser: { essential: null, pro: null }, perAccount: { essential: null, pro: null }, unit: "day" };
  const setField = (path, val) => {
    const next = { ...al };
    if (path === "unit") next.unit = val;
    else { const [scope, tier] = path.split("."); next[scope] = { ...next[scope], [tier]: val === "" ? null : Number(val) }; }
    onChange({ actionLimits: next });
  };
  return (
    <Modal onClose={onClose}>
      <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: F.plum }}>Fair use limits</h3>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: F.muted }}>Set per-user and per-account caps for this AI action. Leave blank to mean "unlimited" or "not applicable".</p>
      <div style={lb}>Action</div>
      <select value={feat.id} onChange={e => onPick(parseInt(e.target.value))} style={{ ...inp, width: "100%", cursor: "pointer", marginBottom: 14 }}>
        {feats.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      <div style={lb}>Reset window</div>
      <select value={al.unit} onChange={e => setField("unit", e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer", marginBottom: 14 }}>
        <option value="day">per day</option>
        <option value="week">per week</option>
        <option value="month">per month</option>
      </select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={lb}>Per user · Essential</div>
          <input type="number" min="0" value={al.perUser?.essential ?? ""} onChange={e => setField("perUser.essential", e.target.value)} placeholder="—" style={{ ...inp, width: "100%" }} />
        </div>
        <div>
          <div style={lb}>Per user · Pro</div>
          <input type="number" min="0" value={al.perUser?.pro ?? ""} onChange={e => setField("perUser.pro", e.target.value)} placeholder="—" style={{ ...inp, width: "100%" }} />
        </div>
        <div>
          <div style={lb}>Per account · Essential</div>
          <input type="number" min="0" value={al.perAccount?.essential ?? ""} onChange={e => setField("perAccount.essential", e.target.value)} placeholder="—" style={{ ...inp, width: "100%" }} />
        </div>
        <div>
          <div style={lb}>Per account · Pro</div>
          <input type="number" min="0" value={al.perAccount?.pro ?? ""} onChange={e => setField("perAccount.pro", e.target.value)} placeholder="—" style={{ ...inp, width: "100%" }} />
        </div>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 11.5, color: F.muted, fontStyle: "italic" }}>Essential's lower limits both shape the value gap and keep our inference spend bounded for free users. Pro's higher caps still protect against runaway power-user costs.</p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <button onClick={() => { onChange({ actionLimits: null }); onClose(); }} style={bt("ghost")}>Remove limits</button>
        <button onClick={onClose} style={bt("primary")}>Done</button>
      </div>
    </Modal>
  );
}

/* ── Main App ── */
export default function App() {
  const [page, setPage] = useState("product");
  const [celName, setCelName] = useState(null);
  const [hovNav, setHovNav] = useState(null);
  const navBtn = (id, label) => {
    const active = page === id;
    const hov = hovNav === id;
    return (
      <button onClick={() => setPage(id)} onMouseEnter={() => setHovNav(id)} onMouseLeave={() => setHovNav(null)} style={{
        padding: "7px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer",
        background: active ? F.paper : (hov ? "rgba(255,255,255,0.10)" : "transparent"),
        border: `1px solid ${active ? F.paper : "rgba(255,255,255,0.14)"}`,
        color: active ? F.plum : (hov ? "#fff" : "rgba(255,255,255,0.78)"),
        transition: "all 0.15s",
        fontFamily: "inherit",
        letterSpacing: "0.01em",
      }}>{label}</button>
    );
  };
  const chip = (text) => (
    <span style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 4, background: F.bg, color: F.muted, fontWeight: 700, border: `1px solid ${F.border}`, textTransform: "uppercase", letterSpacing: "0.04em" }}>{text}</span>
  );
  return (
    <div style={{
      fontFamily: F.font,
      background: F.bg,
      minHeight: "100vh",
      color: F.plum,
      padding: "0 0 48px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700;6..12,800&display=swap" rel="stylesheet" />
      <style>{`
        .lbl-full { display: inline; }
        .lbl-short { display: none; }
        @media (max-width: 880px) {
          .lbl-full { display: none; }
          .lbl-short { display: inline; }
        }
      `}</style>
      {celName && <Celebration name={celName} onDone={() => setCelName(null)} />}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
        padding: "0 28px",
        height: 56,
        marginBottom: 28,
        background: F.plum,
        backgroundImage: `linear-gradient(${F.plum}, ${F.plum}), ${F.gradient}`,
        backgroundClip: "padding-box, border-box",
        backgroundOrigin: "padding-box, border-box",
        borderBottom: "2px solid transparent",
        boxShadow: "0 2px 12px rgba(55, 2, 60, 0.18)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: F.gradientIcon,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, fontStyle: "italic", color: F.plum,
            boxShadow: "0 1px 3px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35)",
            fontFamily: F.font,
          }}>F</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: F.paper, letterSpacing: "0.01em" }}>Faria</span>
            <span style={{ fontSize: 11, color: "rgba(240,235,235,0.4)" }}>·</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: F.yellow, letterSpacing: "0.08em", textTransform: "uppercase" }}>Product Trackers</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {navBtn("product", <><span className="lbl-full">Product Transformation</span><span className="lbl-short">Product</span></>)}
          {navBtn("ai", <><span className="lbl-full">AI Powered Features</span><span className="lbl-short">AI Features</span></>)}
          {navBtn("monz", "AI Monetization")}
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 28px" }}>
        {page === "product" && <TrackerPage title="Product Transformation Tracker" subtitle="Cross-product strategic initiatives" storageKey="faria-product-v10" defaults={DEFAULT_PRODUCT} ModalComponent={ProdModal} onCelebrate={setCelName} />}
        {page === "ai" && <TrackerPage title="AI Powered Features" subtitle="AI features, projects, and integrations across Faria products" storageKey="faria-ai-v12" sortField="product" defaults={DEFAULT_AI} ModalComponent={AIModal} onCelebrate={setCelName} addLabel="+ AI Feature"
          extraRowInfo={(init) => (<>{init.product && chip(init.product)}{init.priority && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: pC(init.priority), color: "#fff", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{init.priority}</span>}</>)}
          extraDetailFields={(init, setField) => (<><div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>{init.product && chip(init.product)}{init.type && chip(init.type)}{init.priority && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: pC(init.priority), color: "#fff", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{init.priority}</span>}</div><div style={{ display: "flex", gap: 12, marginBottom: 12 }}><div style={{ flex: 1 }}><div style={lb}>Effort</div><div style={{ fontSize: 13, color: F.plum, fontWeight: 700 }}>{(init.effort||"medium").charAt(0).toUpperCase()+(init.effort||"medium").slice(1)}</div></div><div style={{ flex: 1 }}><div style={lb}>Impact</div><div style={{ fontSize: 13, color: F.plum, fontWeight: 700 }}>{(init.impact||"medium").charAt(0).toUpperCase()+(init.impact||"medium").slice(1)}</div></div></div></>)}
        />}
        {page === "monz" && <AiMonetizationPage />}
      </div>
    </div>
  );
}
