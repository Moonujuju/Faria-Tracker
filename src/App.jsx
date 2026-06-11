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
  leadingModelRationale: [
    "One simple counter — minimal mental model for the user.",
    "Flexible: schools concentrate AI budget where they need it most each month.",
    "Pricing signal is honest — heavier features cost more credits.",
    "Per-user cap (18 credits) prevents one power user from draining the pool.",
  ],
};

/* ── Defaults for the new monetization sub-pages ───────── */
const DEFAULT_COMPETITIVE = {
  competitors: [
    // ── Education ──
    {
      id: "duolingo-max",
      name: "Duolingo (Duolingo Max)",
      aiModel: ["Tiered freemium"],
      pricing: "Max $29.99/month or $168/year",
      pricingDetails: "Max: $29.99/month or $168/year\nFamily plan: ~$240/year\nSuper tier (below Max): ~$84–96/year",
      essentialFeatures: "Super tier features + (since Jan 2026) Explain My Answer and Video Call moved into the free tier",
      proFeatures: "Max — premium AI features above Super",
      strengths: "",
      weaknesses: "Individual AI features commoditize fast — moving flagship features down to free hollowed out Max's differentiation",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "Premium consumer tier above an existing premium tier (Super). In January 2026 Duolingo moved its flagship AI features (Explain My Answer, Video Call) down into the free tier, hollowing out Max's differentiation. Cautionary case on how quickly individual AI features commoditize.",
    },
    {
      id: "khanmigo",
      name: "Khan Academy (Khanmigo)",
      aiModel: ["Per-student/institution", "Tiered freemium"],
      pricing: "$15/student/year (district)",
      pricingDetails: "District base partnership: $5/student/year (reporting) or $10/student/year (enterprise starter)\nKhanmigo for students (district): $15/student/year\nIndividual: $4/month ($44/year)",
      essentialFeatures: "Khan core platform — free",
      proFeatures: "Khanmigo for students (district + individual)",
      strengths: "Price fell from $60 → $35 → ~$15 over time, well below most peers",
      weaknesses: "",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "Free core platform + per-student institutional add-on; separate low-cost individual subscription. District Khanmigo price fell from $60 to $35 to ~$15 positioning over time. Bundled with College Board SAT Suite and NWEA MAP Growth.",
    },
    {
      id: "instructure-igniteai",
      name: "Instructure (IgniteAI, Canvas LMS)",
      aiModel: ["Bundled (no extra charge)", "Consumption/credits"],
      pricing: "Free through Jun 30, 2026 (US) / Sep 30, 2026 (global)",
      pricingDetails: "Free for US Canvas customers through Jun 30, 2026\nFree globally through Sep 30, 2026\nFuture structure: access/equity features remain free long-term; compute-heavy capabilities may carry additional cost, priced after observing real usage",
      essentialFeatures: "Access/equity features (free long-term)",
      proFeatures: "Compute-heavy capabilities (future paid tier) + agentic features",
      strengths: "Closest structural analog to an integrated education suite. Explicit three-bucket framing.",
      weaknesses: "",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "AI embedded in the LMS; free land-grab period, then tiered by compute cost. Three-bucket framing (free-forever access tier / paid compute-heavy tier / agentic). Built on AWS Bedrock.",
    },
    {
      id: "powerschool-powerbuddy",
      name: "PowerSchool (PowerBuddy)",
      aiModel: ["Bundled (no extra charge)", "Tiered freemium"],
      pricing: "Institutional / quote-based",
      pricingDetails: "Quote-based, sold inside existing product workflows (e.g. Schoology). A set of PowerBuddy features made available at no cost.",
      essentialFeatures: "Subset of PowerBuddy features included at no cost",
      proFeatures: "Premium AI assistants embedded in existing suite (quoted)",
      strengths: "Positions AI as suite differentiation and retention rather than a separate revenue line",
      weaknesses: "",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "Role-based AI assistants (students, teachers, families, administrators) embedded across the existing SIS/LMS suite. Mix of free and paid features. Sold inside existing product workflows rather than as standalone revenue.",
    },
    {
      id: "magicschool",
      name: "MagicSchool",
      aiModel: ["Per-seat", "Tiered freemium"],
      pricing: "Free / $8.33/user/mo / Enterprise",
      pricingDetails: "Free: $0 for individual teachers\nPlus: $8.33/user/month billed annually ($99.96/year), or $12.99 billed monthly\nEnterprise: custom, volume-based",
      essentialFeatures: "Free tier for individual teachers",
      proFeatures: "Plus / Enterprise (district)",
      strengths: "Strong individual-teacher adoption via free tier",
      weaknesses: "Buyer critique — the \"standalone AI tax\". Districts pay for AI on top of existing SIS/LMS/gradebook, disconnected from their core data.",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "Standalone per-seat freemium (teacher tool); enterprise tier for districts. Common buyer critique is the \"standalone AI tax\" — districts pay for AI on top of their existing SIS/LMS/gradebook, disconnected from their core data.",
    },
    {
      id: "coursera-coach",
      name: "Coursera (Coursera Coach)",
      aiModel: ["Bundled (no extra charge)", "Tiered freemium"],
      pricing: "Bundled into Coursera Plus (~$59/mo or $399/yr)",
      pricingDetails: "Coursera Coach included in Coursera Plus: $59/month or $399/year (frequently discounted to ~$199–299/year)\nAlso included in Coursera for Teams/Enterprise (B2B) — custom / per-seat pricing\nEnterprise tier adds AI-assisted course building",
      essentialFeatures: "Coursera Coach included in Coursera Plus — no separate AI charge",
      proFeatures: "Enterprise tier adds AI-assisted course building",
      strengths: "AI positioned as a value-add inside an existing subscription rather than a priced line item",
      weaknesses: "",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "AI tutor bundled into the existing content subscription (consumer) and into the B2B tiers; no separate AI charge. AI (conceptual Q&A, next-step suggestions, mock-interview role-play) is positioned as a value-add inside an existing subscription rather than a priced line item.",
    },
    {
      id: "quizlet",
      name: "Quizlet",
      aiModel: ["Tiered freemium"],
      pricing: "Quizlet Plus ~$7.99/mo or ~$36–45/yr",
      pricingDetails: "Quizlet Plus: ~$7.99/month or ~$36–45/year (figures vary by source and promotion)\nFree tier exists but with stricter limits than in prior years",
      essentialFeatures: "Free tier (stricter limits than prior years)",
      proFeatures: "Q-Chat tutor, Magic Notes auto-generation (Plus-only)",
      strengths: "AI features are explicitly the differentiator pushing more capability behind the paywall",
      weaknesses: "Free tier deliberately tightened to drive upgrades — could create friction with cost-sensitive learners",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "Consumer freemium; AI features gated behind the paid tier. AI features (Q-Chat tutor, Magic Notes auto-generation) are Plus-only. Free tier deliberately tightened to drive upgrades.",
    },
    {
      id: "google-for-education-gemini",
      name: "Google for Education (Gemini)",
      aiModel: ["Per-seat", "Per-student/institution", "Tiered freemium"],
      pricing: "~$24–36/user/month (educator add-on)",
      pricingDetails: "Gemini Education: ~$24/month or $192/year per user\nGemini Education Premium: ~$36/month or $288/year per user\nStudents over 18: free access without either plan\nSeparate Gemini Education add-on still required for Workspace for Education customers as of 2026\n(Figures date from May 2024 launch — re-verify before quoting)",
      essentialFeatures: "Free Gemini access for students over 18",
      proFeatures: "Gemini Education / Gemini Education Premium add-ons for educators / staff",
      strengths: "",
      weaknesses: "Notable contrast with Google's commercial Workspace, where standalone Gemini was retired and bundled into the base plan — education kept it as a paid add-on. Tension with the \"standalone AI tax\" critique on the education side.",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "Per-user add-on for institutions (unlike commercial Workspace, where Gemini was folded into the base price); free student access. Notable contrast: in education Google kept Gemini as a paid add-on while making student access free.",
    },

    // ── Broader B2B SaaS ──
    {
      id: "microsoft-copilot",
      name: "Microsoft (365 Copilot)",
      aiModel: ["Per-seat", "Tiered freemium"],
      pricing: "$30/user/month enterprise",
      pricingDetails: "Copilot Chat: free with eligible M365 subscriptions (public web data only, no org grounding)\nCopilot Business (SMB, up to 300 users): $18/user/month promo through Jun 30, 2026 → $21 after\nCopilot Enterprise: $30/user/month annual ($360/user/year), on top of E3/E5\nCopilot Studio (build custom agents): from ~$200/month per tenant",
      essentialFeatures: "Copilot Chat (free with M365, public web only, no org grounding)",
      proFeatures: "Copilot Business / Enterprise (org-grounded), Copilot Studio (agents)",
      strengths: "Canonical predictable per-seat model — easy to budget",
      weaknesses: "30–40% of enterprise licenses reported unused within 90 days when deployed to all users at once",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "Per-seat add-on (flat) on top of a required base license; free chat tier underneath. Canonical predictable per-seat model. Reported 30–40% of enterprise licenses unused within 90 days when deployed to all users at once.",
    },
    {
      id: "salesforce-agentforce",
      name: "Salesforce (Agentforce)",
      aiModel: ["Per-agent license", "Consumption/credits", "Action"],
      pricing: "3 models — buyer self-selects",
      pricingDetails: "Foundations: free entry tier ($0), modest included credits\nFlex Credits (consumption): standard action = 20 credits (~$0.10); voice action = 30 credits (~$0.15); credits at $500 per 100,000\nConversations: ~$2 per 24-hour interaction session (flat usage)\nPer-user add-ons: $125–150/user/month; Agentforce 1 Editions $550+/user/month",
      essentialFeatures: "Foundations (free entry tier with modest included credits)",
      proFeatures: "Flex Credits / Conversations / Per-user agent licenses",
      strengths: "Multiple pricing models simultaneously — buyers self-select by purchasing preference",
      weaknesses: "Pricing evolved through 3 models in ~18 months. The $2/conversation launch priced out SMBs (low conversion). Flex Credits and Conversations can't be used in the same org. Often requires Data Cloud, frequently a larger cost than Agentforce itself.",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "Runs three models simultaneously and lets customers self-select. Pricing evolved through three models in ~18 months ($2/conversation at launch → Flex Credits May 2025 → per-user licenses late 2025). Often requires Data Cloud, frequently a larger cost than Agentforce itself.",
    },
    {
      id: "intercom-fin",
      name: "Intercom (Fin AI Agent)",
      aiModel: ["Outcome-based", "Per-seat"],
      pricing: "$0.99 per outcome",
      pricingDetails: "Fin: $0.99 per outcome (resolution or procedure handoff); 50-outcome monthly minimum ($49.50) for standalone Fin with an existing helpdesk\nSeats (inside Intercom): $29–$132/seat/month annual\nCopilot for human agents: ~$35/seat/month add-on",
      essentialFeatures: "",
      proFeatures: "Fin (outcome-priced) + Copilot human-agent add-on",
      strengths: "\"You only pay when it works\" framing resonates with buyers",
      weaknesses: "Cost rises as the AI improves (more resolutions) — monthly spend hard to budget. Real-world resolution rates cited at 42–50%.",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "Outcome-based (per resolution), on top of seat plans. Marketed as \"you only pay when it works.\" Known criticism: cost rises as the AI improves (more resolutions), making monthly spend hard to budget. Real-world resolution rates cited at 42–50%.",
    },
    {
      id: "hubspot-breeze",
      name: "HubSpot (Breeze)",
      aiModel: ["Outcome-based", "Consumption/credits"],
      pricing: "$0.50 per resolved conversation (Customer Agent)",
      pricingDetails: "Credits: $10 per 1,000 (underlying unit)\nBreeze Customer Agent (from Apr 14, 2026): $0.50 per resolved conversation\nBreeze Prospecting Agent: $1 per recommended lead\nRequires Pro/Enterprise base subscription; included credits: 500 (Starter) / 3,000 (Pro) / 5,000 (Enterprise)",
      essentialFeatures: "Standard enrichment free with core seats; included monthly credits per tier",
      proFeatures: "Breeze Customer Agent (outcome-priced), Breeze Prospecting Agent",
      strengths: "Stated philosophy: \"AI should be priced on the value it delivers, not the compute it consumes.\" Credits moved a layer down so customer-facing price is per-outcome.",
      weaknesses: "No grandfathering on the April 2026 price change",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "Moved from credits toward outcome-based, with credits retained as an internal compute layer. Credits did not disappear; they moved \"down a layer\" so the customer-facing price is per-outcome while compute is metered underneath. Standard enrichment made free with core seats to drive adoption.",
    },
    {
      id: "github-copilot",
      name: "GitHub Copilot",
      aiModel: ["Per-seat", "Consumption/credits", "Tiered freemium"],
      pricing: "$10–$39/user/month + premium-request metering",
      pricingDetails: "Free: 50 premium requests/month, ~2,000 completions/month\nPro: $10/user/month (unlimited completions/chat; 300 premium requests)\nPro+: $39/user/month (1,500 premium requests; top-tier models)\nBusiness: $19/user/month (admin controls, audit logs, IP indemnity)\nEnterprise: $39/user/month, but requires GitHub Enterprise Cloud (+$21/user) — real cost ~$60/user/month\nOverage: $0.04 per premium request beyond the monthly allotment",
      essentialFeatures: "Free tier (50 premium requests, ~2,000 completions/month)",
      proFeatures: "Pro / Pro+ / Business / Enterprise with progressively higher premium-request allowances",
      strengths: "Hybrid model — predictable seat fee + metered premium for heavier model usage",
      weaknesses: "\"Premium requests\" are the real cost driver, not the sticker price. Heavier models (Claude, o-series) consume the allowance faster.",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "Per-seat plus a metered \"premium request\" allowance (hybrid), with a free tier. Illustrates the shift from flat-completion pricing to metered model usage layered onto a seat price.",
    },
    {
      id: "adobe-firefly",
      name: "Adobe (Firefly / Creative Cloud)",
      aiModel: ["Consumption/credits", "Bundled (no extra charge)"],
      pricing: "Credits bundled into Creative Cloud subscriptions",
      pricingDetails: "Free: 25 generative credits/month\nFirefly Standard: ~2,000 credits/month\nFirefly Pro: $19.99/month, 4,000 credits\nPremium tiers up to ~50,000 credits\nAdd-on credit packs available; API priced separately (~$0.02–0.10 per image, ~$1,000/month enterprise minimum)\nCredits consumed by feature, e.g. video at 20/50/100 credits per second for 540p/720p/1080p",
      essentialFeatures: "Standard generations effectively unlimited; credits spent only on premium workloads",
      proFeatures: "Premium features (video, etc.) consume credits at higher rates",
      strengths: "One credit type for both standard and premium features — standard effectively unlimited. Adobe raised base Creative Cloud plan prices ~10% to fund AI rather than charging a separate AI fee — no visible \"AI surcharge.\"",
      weaknesses: "",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "Generative credits (consumption), included with subscriptions; standard generations unlimited, premium features consume credits. Adobe funded AI partly by raising base Creative Cloud plan prices ~10% when Firefly launched, rather than charging a separate AI fee.",
    },
    {
      id: "zoom-ai-companion",
      name: "Zoom (AI Companion)",
      aiModel: ["Bundled (no extra charge)"],
      pricing: "Included free with all paid Zoom Workplace plans",
      pricingDetails: "AI Companion: included free with all paid Zoom Workplace plans (Pro ~$13.33/month, Business ~$18.33/month); not on the free Basic plan\nStandalone AI Companion (without a Zoom license): ~$10/user/month\nCustom AI add-on: +$12/user/month",
      essentialFeatures: "AI Companion bundled at no extra charge with all paid plans",
      proFeatures: "Standalone AI Companion (~$10/user/month); Custom AI add-on (+$12/user/month)",
      strengths: "Deliberately positioned as the anti-\"AI tax\" play. Bundling removes the biggest barrier to enterprise adoption.",
      weaknesses: "",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "Bundled at no extra charge into existing paid plans; standalone and premium add-on options exist separately. Stated rationale: \"we want all customers to use all our AI features, not just a selected few.\" Federated approach across own and third-party models.",
    },
    {
      id: "notion-ai",
      name: "Notion (Notion AI)",
      aiModel: ["Bundled (no extra charge)", "Consumption/credits", "Tiered freemium"],
      pricing: "Bundled into Business ($20/user/mo) + credits for agents",
      pricingDetails: "Free and Plus ($10/user/month annual): limited trial AI responses only — full AI not purchasable as a separate add-on anymore\nBusiness ($20/user/month, ~$15 annual depending on source): full Notion AI bundled in (AI Agents, Ask Notion)\nEnterprise: custom\nCustom Agents: bill via credits at $10 per 1,000 Notion credits (from May 4, 2026), on top of Business/Enterprise",
      essentialFeatures: "Free / Plus tiers — limited trial AI responses only",
      proFeatures: "Business tier bundles full AI Agents + Ask Notion; Custom Agents priced via credits",
      strengths: "Retired the standalone ~$8–10/user/mo AI add-on (May 2025) and moved full AI into the Business tier — clean line in the sand. Credits add a usage layer for advanced agents.",
      weaknesses: "Solo users who only wanted AI were pushed from ~$18/seat (Plus + add-on) up to the Business plan",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "Evolved from a flat per-user add-on to bundled-into-a-higher-tier, plus credits for advanced agents. The standalone ~$8–10/user/month AI add-on was retired in May 2025. Illustrates retiring a standalone AI line in favor of bundling into a higher-priced tier.",
    },
    {
      id: "google-workspace-gemini",
      name: "Google (Workspace / Gemini)",
      aiModel: ["Bundled (no extra charge)"],
      pricing: "Bundled into Workspace + ~16–22% base-plan price uplift",
      pricingDetails: "Since January 2025: Gemini bundled into paid Workspace plans at no separate charge\nBase prices raised ~16–22% (e.g. Business Standard $12 → $14/user/month)\nFormer standalone Gemini Business ($20) and Gemini Enterprise ($30) add-ons discontinued for new purchases\nSome advanced pieces remain separate (e.g. NotebookLM Enterprise; automation execution allowances vary by tier)",
      essentialFeatures: "Gemini bundled into all paid Workspace plans",
      proFeatures: "NotebookLM Enterprise + tiered automation execution allowances (separate)",
      strengths: "Same \"embed AI in the base price\" mechanic as Adobe and Zoom — avoids a visible AI surcharge. Existing add-on customers saw costs drop.",
      weaknesses: "Buyers who never wanted AI now pay more for a capability they may not use — one cited analysis found fewer than half of seats used AI measurably, yet all were charged",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "AI folded into the base subscription with a price uplift; standalone add-on discontinued. Same \"embed AI in the base price\" mechanic as Adobe and Zoom. Buyers who previously paid for the add-on saw costs drop; buyers who never wanted AI now pay more for a capability they may not use.",
    },
    {
      id: "zendesk",
      name: "Zendesk (for comparison)",
      aiModel: ["Outcome-based"],
      pricing: "~$1.50 per automated resolution",
      pricingDetails: "~$1.50 per resolution (per third-party comparisons)",
      essentialFeatures: "",
      proFeatures: "AI automated resolution",
      strengths: "",
      weaknesses: "Higher per-unit rate than Intercom Fin's $0.99",
      lastReviewed: "2026-06-01",
      sourceUrl: "",
      notes: "Same per-resolution category as Intercom Fin and HubSpot Customer Agent, at a higher per-unit rate than Fin's $0.99.",
    },
  ],
  feedSplitNotes: "Universal free adoption tier beneath the paid models — observed at Copilot Chat, Instructure access features, HubSpot enrichment, Salesforce Foundations, and Khan core platform. The \"standalone AI tax\" grievance: buyers resent paying for AI on top of core software they already license, which structurally favors integrated suites over point solutions (MagicSchool is the cautionary case; PowerSchool and Instructure benefit). Some vendors embed AI cost into the base rather than charging separately — Zoom bundles AI at no extra charge as an adoption lever; Adobe raised base plan prices ~10% to fund AI instead of adding a line item. Both avoid a visible \"AI surcharge.\"",
  benchmarkNotes: "No convergence — the market has not settled on one model. Salesforce deliberately offers three at once so buyers self-select. Strong pull toward outcome-based pricing in support and sales tooling (Intercom, HubSpot, Zendesk), framed around paying for value not compute. The outcome-pricing catch: bills rise as the AI improves and swing with usage, which finance teams dislike — keeps pulling vendors back toward per-seat / per-user wrappers that give a budgetable number. Credits as a hidden compute layer (HubSpot's current approach): customer-facing price is per-outcome, compute is metered underneath. For Faria's positioning as an integrated education suite, Instructure IgniteAI and PowerSchool PowerBuddy are the closest structural comparables — both bundle AI as suite differentiation rather than a separate revenue line, with future tiering on compute-heavy capabilities.",
};
const COMPETITOR_TEMPLATE = () => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  name: "",
  aiModel: [], // multi-select array
  pricing: "",
  pricingDetails: "",
  essentialFeatures: "",
  proFeatures: "",
  strengths: "",
  weaknesses: "",
  lastReviewed: "",
  sourceUrl: "",
  notes: "",
});
function mergeCompetitive(saved) {
  if (!saved) return DEFAULT_COMPETITIVE;
  // Normalise: older blobs had aiModel as a string and category/threatLevel fields.
  // Coerce aiModel to an array; drop category & threatLevel by ignoring them on render.
  // Also migrate the older "Per-conversation" label to "Action".
  const renameModel = m => (m === "Per-conversation" ? "Action" : m);
  const savedCompetitors = (saved.competitors || []).map(c => ({
    ...c,
    aiModel: (Array.isArray(c.aiModel) ? c.aiModel : (c.aiModel ? [c.aiModel] : [])).map(renameModel),
  }));
  // Append any DEFAULT competitor whose stable string id isn't in the saved list.
  // Preserves user-added entries (which use Date.now() numeric ids) and any edits to
  // existing default entries (saved blob takes precedence by id).
  const savedIds = new Set(savedCompetitors.map(c => c.id));
  const newDefaults = DEFAULT_COMPETITIVE.competitors.filter(d => !savedIds.has(d.id));
  return {
    ...DEFAULT_COMPETITIVE,
    ...saved,
    competitors: [...savedCompetitors, ...newDefaults],
  };
}

const DEFAULT_MARKET = { validations: [] };
const VALIDATION_TEMPLATE = (product = "OpenApply") => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  product,
  schoolName: "",
  region: "",
  stage: "interested",
  contactedDate: "",
  pilotedDate: "",
  feedback: "",
  willingnessToPay: "",
  contactName: "",
  contactRole: "",
  contactEmail: "",
  wowOutcomesValidated: "",
  notes: "",
});
function mergeMarket(saved) {
  if (!saved) return DEFAULT_MARKET;
  return { ...DEFAULT_MARKET, ...saved, validations: saved.validations || [] };
}

const DEFAULT_FINANCE = {
  costInputs: {
    tokenCostPer1k: 0.01,
    monthlyInfraCost: 0,
    supportCostPerCustomer: 0,
  },
  usageInputs: Object.fromEntries(MONZ_PRODUCTS.map(p => [p, { essActionsPerSchoolMonth: 0, proActionsPerSchoolMonth: 0, tokensPerAction: 0 }])),
  uptakeScenarios: [],
  decisions: [],
  notes: "",
};
const SCENARIO_TEMPLATE = () => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  label: "",
  totalSchools: 0,
  ...Object.fromEntries(MONZ_PRODUCTS.map(p => [productPctKey(p), 0])),
});
const DECISION_TEMPLATE = () => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  date: new Date().toISOString().slice(0, 10),
  decidedBy: "",
  summary: "",
});
function productPctKey(p) { return p.replace(/[^a-zA-Z0-9]/g, "") + "Pct"; }
function mergeFinance(saved) {
  if (!saved) return DEFAULT_FINANCE;
  return {
    ...DEFAULT_FINANCE,
    ...saved,
    costInputs: { ...DEFAULT_FINANCE.costInputs, ...(saved.costInputs || {}) },
    usageInputs: { ...DEFAULT_FINANCE.usageInputs, ...(saved.usageInputs || {}) },
    uptakeScenarios: saved.uptakeScenarios || [],
    decisions: saved.decisions || [],
  };
}

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
    leadingModelRationale: saved.leadingModelRationale || DEFAULT_MONETIZATION.leadingModelRationale,
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
function AiMonetizationPage({ subRoute, setSubRoute }) {
  // view derived from URL sub-route. Valid: "plan" | "usage" | "competitive" | "market" | "finance".
  // Empty / unknown subRoute → default "plan".
  const VALID_VIEWS = ["plan", "usage", "competitive", "market", "finance"];
  const view = VALID_VIEWS.includes(subRoute) ? subRoute : "plan";
  const setView = (v) => setSubRoute(v);
  const [ai, setAi] = useState({ inits: [] });
  const [mz, setMz] = useState(DEFAULT_MONETIZATION);
  const [readyAi, setReadyAi] = useState(false);
  const [readyMz, setReadyMz] = useState(false);
  const [expanded, setExpanded] = useState(new Set(MONZ_PRODUCTS)); // all expanded by default
  const [editFeat, setEditFeat] = useState(null); // feature id whose rationale is being edited
  const [editLimits, setEditLimits] = useState(null); // feature id whose limits are being edited
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
  const setFilterBullet = (idx, val) => setMz(prev => ({ ...prev, framework: { ...prev.framework, proFilter: prev.framework.proFilter.map((b, i) => i === idx ? val : b) } }));
  const addFilterRule = () => setMz(prev => ({ ...prev, framework: { ...prev.framework, proFilter: [...prev.framework.proFilter, ""] } }));
  const removeFilterRule = (idx) => setMz(prev => ({ ...prev, framework: { ...prev.framework, proFilter: prev.framework.proFilter.filter((_, i) => i !== idx) } }));
  const toggleExpand = (p) => setExpanded(prev => { const n = new Set(prev); if (n.has(p)) n.delete(p); else n.add(p); return n; });

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
      {(() => {
        const titles = {
          plan:        { t: "Monetization Framework (open discussion)", s: "Working framework for AI Essential vs AI Pro across Faria products. Edit anything inline — this is a living document." },
          usage:       { t: "Usage", s: "Three candidate usage-limit models — Model B (shared credits) is the leading option. Below, a state-by-state deep dive across all three." },
          competitive: { t: "Competitive Analysis", s: "Track how competitors are pricing and packaging AI. Use this to calibrate our Pro tier and bundle pricing." },
          market:      { t: "Market Validation", s: "Per-product school validation — pilots, willingness to pay, and which Pro outcomes schools have confirmed." },
          finance:     { t: "Finance", s: "SKUs & pricing, cost model, breakeven analysis, uptake scenarios, and decision log for AI monetization." },
        };
        const cur = titles[view] || titles.plan;
        return (
          <div style={{ marginBottom: 14 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: F.plum, lineHeight: 1.15 }}>{cur.t}</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: F.muted }}>{cur.s}</p>
          </div>
        );
      })()}

      {/* Sub-tab strip: Framework · Usage · Competitive Analysis · Market Validation · Finance */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        {[
          { id: "plan",        label: "Framework" },
          { id: "usage",       label: "Usage" },
          { id: "competitive", label: "Competitive Analysis" },
          { id: "market",      label: "Market Validation" },
          { id: "finance",     label: "Finance" },
        ].map(t => {
          const active = view === t.id;
          return (
            <button key={t.id} onClick={() => setView(t.id)} style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              background: active ? F.plum : F.surface,
              color: active ? F.paper : F.plum,
              border: `1px solid ${active ? F.plum : F.borderStrong}`,
              transition: "all 0.15s",
              fontFamily: "inherit",
              letterSpacing: "0.01em",
            }}>{t.label}</button>
          );
        })}
      </div>

      {view === "usage"       && <FairUseExample monz={mz} setMonz={setMz} />}
      {view === "competitive" && <MonzCompetitivePage />}
      {view === "market"      && <MonzMarketPage />}
      {view === "finance"     && <MonzFinancePage monz={mz} setMonz={setMz} />}

      {view === "plan" && (<>
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
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button onClick={() => { const first = feats.find(f => !f.actionLimits); if (first) setEditLimits(first.id); }} style={{ ...bt(), fontSize: 12 }}>+ Add fair-use limit</button>
                  <button onClick={() => setView("fairuse")} style={{ ...bt("ghost"), fontSize: 12, color: F.pink, fontWeight: 700 }}>See live mockup →</button>
                </div>
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
      </>)}

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

/* ── Shared utilities for the new monetization sub-pages ── */
const COMP_AI_MODELS = [
  "Per-seat",
  "Per-student/institution",
  "Consumption/credits",
  "Outcome-based",
  "Action",
  "Per-agent license",
  "Bundled (no extra charge)",
  "Tiered freemium",
];
const VALIDATION_STAGES = ["interested", "piloting", "live", "committed", "declined"];
function stageColor(stage) {
  return stage === "interested" ? F.muted2 :
         stage === "piloting"   ? F.yellow :
         stage === "live"       ? F.green :
         stage === "committed"  ? F.green :
         stage === "declined"   ? F.pink  : F.muted2;
}

/* ── Competitive Analysis sub-page ──────────────────────── */
function MonzCompetitivePage() {
  const [comp, setComp] = useState(DEFAULT_COMPETITIVE);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  const [confirmDel, setConfirmDel] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => { (async () => {
    const s = await loadState("faria-monz-competitive-v1");
    setComp(mergeCompetitive(s));
    setReady(true);
  })(); }, []);
  useEffect(() => { if (!ready) return; clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => saveState("faria-monz-competitive-v1", comp), 1000); return () => clearTimeout(saveTimer.current); }, [comp, ready]);

  const addCompetitor = () => {
    const next = COMPETITOR_TEMPLATE();
    setComp(prev => ({ ...prev, competitors: [next, ...prev.competitors] }));
    setExpanded(prev => new Set(prev).add(next.id));
  };
  const updateCompetitor = (id, patch) => setComp(prev => ({ ...prev, competitors: prev.competitors.map(c => c.id === id ? { ...c, ...patch } : c) }));
  const removeCompetitor = (id) => { setComp(prev => ({ ...prev, competitors: prev.competitors.filter(c => c.id !== id) })); setConfirmDel(null); };
  const toggle = (id) => setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const card = { background: F.surface, border: `1px solid ${F.border}`, borderRadius: 12, padding: "18px 22px", marginBottom: 18, boxShadow: F.shadowSm };
  const sectionTitle = { fontSize: 11, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 };
  const tile = { flex: 1, minWidth: 130, padding: "12px 16px", background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10 };

  // Stats
  const total = comp.competitors.length;
  const byModel = COMP_AI_MODELS
    .map(m => ({ m, n: comp.competitors.filter(c => (c.aiModel || []).includes(m)).length }))
    .filter(x => x.n > 0);

  const openAndScrollTo = (id) => {
    if (!expanded.has(id)) setExpanded(prev => new Set(prev).add(id));
    setTimeout(() => {
      const el = document.getElementById(`comp-card-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  return (
    <>
      <style>{`
        .comp-row { transition: background 0.12s ease; }
        .comp-row:hover { background: ${F.lightYellow}55 !important; }
      `}</style>

      <div style={card}>
        <div style={sectionTitle}>Snapshot</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={tile}>
            <div style={{ fontSize: 11, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Tracked</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: F.plum }}>{total}</div>
          </div>
          <div style={{ ...tile, flex: 2, minWidth: 220 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>By AI model</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {byModel.length === 0 ? <span style={{ fontSize: 12, color: F.muted, fontStyle: "italic" }}>No competitors tracked yet</span> :
                byModel.map(x => <span key={x.m} style={{ fontSize: 11, padding: "3px 8px", background: F.lightYellow, color: F.plum, borderRadius: 4, fontWeight: 700 }}>{x.m} · {x.n}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Comparative table — at-a-glance scan of all competitors. Click any row to expand its card below. */}
      {comp.competitors.length > 0 && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div style={sectionTitle}>Comparative table</div>
            <span style={{ fontSize: 11, color: F.muted2, fontStyle: "italic" }}>Click a row to jump to that competitor's details below</span>
          </div>
          <div style={{ overflowX: "auto", border: `1px solid ${F.border}`, borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: F.bg }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${F.border}`, width: "26%" }}>Name</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${F.border}`, width: "34%" }}>AI model(s)</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${F.border}` }}>Pricing</th>
                </tr>
              </thead>
              <tbody>
                {comp.competitors.map((c, i) => (
                  <tr
                    key={c.id}
                    className="comp-row"
                    onClick={() => openAndScrollTo(c.id)}
                    style={{
                      borderBottom: i === comp.competitors.length - 1 ? "none" : `1px solid ${F.border}`,
                      cursor: "pointer",
                      background: i % 2 === 0 ? F.surface : F.bg,
                    }}
                  >
                    <td style={{ padding: "12px 14px", color: F.plum, fontWeight: 700, verticalAlign: "top" }}>{c.name || <span style={{ color: F.muted2, fontStyle: "italic", fontWeight: 500 }}>(unnamed)</span>}</td>
                    <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                      {(c.aiModel || []).length === 0 ? (
                        <span style={{ color: F.muted2 }}>—</span>
                      ) : (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {(c.aiModel || []).map(m => (
                            <span key={m} style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: F.lightYellow, color: F.plum, whiteSpace: "nowrap" }}>{m}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px", color: F.muted, verticalAlign: "top", lineHeight: 1.45 }}>{c.pricing || <span style={{ color: F.muted2 }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: F.plum }}>Competitors ({total})</h2>
        <button onClick={addCompetitor} style={bt("primary")}>+ Add competitor</button>
      </div>

      {comp.competitors.length === 0 && (
        <div style={{ ...card, textAlign: "center", color: F.muted, fontStyle: "italic", fontSize: 13.5 }}>
          No competitors tracked yet. Click <strong style={{ color: F.plum, fontStyle: "normal" }}>+ Add competitor</strong> to start logging benchmark pricing, packaging, and AI monetization observations.
        </div>
      )}

      {comp.competitors.map(c => {
        const open = expanded.has(c.id);
        return (
          <div key={c.id} id={`comp-card-${c.id}`} style={card}>
            <div onClick={() => toggle(c.id)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none", flexWrap: "wrap" }}>
              <span style={{ color: F.plum, fontSize: 11, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
              <div style={{ flex: 1, minWidth: 160, fontSize: 15, fontWeight: 700, color: F.plum }}>{c.name || <span style={{ color: F.muted2, fontStyle: "italic", fontWeight: 500 }}>(unnamed competitor)</span>}</div>
              {(c.aiModel || []).map(m => (
                <span key={m} style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: F.lightYellow, color: F.plum, textTransform: "uppercase", letterSpacing: "0.05em" }}>{m}</span>
              ))}
            </div>

            {open && (
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                <div>
                  <div style={lb}>Name</div>
                  <input value={c.name} onChange={e => updateCompetitor(c.id, { name: e.target.value })} placeholder="e.g. Veracross" style={{ ...inp, width: "100%" }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={lb}>AI model · select one or more</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {COMP_AI_MODELS.map(m => {
                      const active = (c.aiModel || []).includes(m);
                      return (
                        <button
                          key={m}
                          onClick={() => updateCompetitor(c.id, {
                            aiModel: active
                              ? (c.aiModel || []).filter(x => x !== m)
                              : [...(c.aiModel || []), m]
                          })}
                          style={{
                            padding: "6px 13px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            background: active ? F.plum : F.surface,
                            color: active ? F.paper : F.plum,
                            border: `1px solid ${active ? F.plum : F.borderStrong}`,
                            fontFamily: "inherit",
                            transition: "all 0.15s",
                          }}
                        >{m}</button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={lb}>Pricing (headline)</div>
                  <input value={c.pricing} onChange={e => updateCompetitor(c.id, { pricing: e.target.value })} placeholder="e.g. $5,000/yr per school" style={{ ...inp, width: "100%" }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={lb}>Pricing details / packaging notes</div>
                  <textarea value={c.pricingDetails} onChange={e => updateCompetitor(c.id, { pricingDetails: e.target.value })} rows={2} placeholder="Tiers, add-ons, volume discounts, contract length…" style={{ ...inp, width: "100%", resize: "vertical" }} />
                </div>
                <div>
                  <div style={lb}>Free / Essential features</div>
                  <textarea value={c.essentialFeatures} onChange={e => updateCompetitor(c.id, { essentialFeatures: e.target.value })} rows={3} placeholder="What's included at no extra cost…" style={{ ...inp, width: "100%", resize: "vertical" }} />
                </div>
                <div>
                  <div style={lb}>Paid / Pro features</div>
                  <textarea value={c.proFeatures} onChange={e => updateCompetitor(c.id, { proFeatures: e.target.value })} rows={3} placeholder="What's behind the paid tier…" style={{ ...inp, width: "100%", resize: "vertical" }} />
                </div>
                <div>
                  <div style={lb}>Strengths</div>
                  <textarea value={c.strengths} onChange={e => updateCompetitor(c.id, { strengths: e.target.value })} rows={2} style={{ ...inp, width: "100%", resize: "vertical" }} />
                </div>
                <div>
                  <div style={lb}>Weaknesses</div>
                  <textarea value={c.weaknesses} onChange={e => updateCompetitor(c.id, { weaknesses: e.target.value })} rows={2} style={{ ...inp, width: "100%", resize: "vertical" }} />
                </div>
                <div>
                  <div style={lb}>Last reviewed</div>
                  <input type="date" value={c.lastReviewed} onChange={e => updateCompetitor(c.id, { lastReviewed: e.target.value })} style={{ ...inp, width: "100%" }} />
                </div>
                <div>
                  <div style={lb}>Source URL</div>
                  <input value={c.sourceUrl} onChange={e => updateCompetitor(c.id, { sourceUrl: e.target.value })} placeholder="https://…" style={{ ...inp, width: "100%" }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={lb}>Notes</div>
                  <textarea value={c.notes} onChange={e => updateCompetitor(c.id, { notes: e.target.value })} rows={2} style={{ ...inp, width: "100%", resize: "vertical" }} />
                </div>
                <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => setConfirmDel(c.id)} style={bt("danger")}>Delete competitor</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div style={card}>
        <div style={sectionTitle}>Benchmark pricing notes</div>
        <textarea value={comp.benchmarkNotes} onChange={e => setComp(prev => ({ ...prev, benchmarkNotes: e.target.value }))} rows={4} placeholder="Pricing benchmark observations across the competitor set — sweet spots, outliers, packaging trends…" style={{ ...inp, width: "100%", resize: "vertical" }} />
      </div>

      <div style={card}>
        <div style={sectionTitle}>Feeds split + pricing observations</div>
        <textarea value={comp.feedSplitNotes} onChange={e => setComp(prev => ({ ...prev, feedSplitNotes: e.target.value }))} rows={4} placeholder="How competitors split features between free and paid tiers, and how that informs our Pro line…" style={{ ...inp, width: "100%", resize: "vertical" }} />
      </div>

      {confirmDel != null && (
        <Modal onClose={() => setConfirmDel(null)}>
          <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700, color: F.plum }}>Delete this competitor?</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: F.muted }}>This cannot be undone.</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setConfirmDel(null)} style={bt()}>Cancel</button>
            <button onClick={() => removeCompetitor(confirmDel)} style={bt("danger")}>Delete</button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ── Market Validation sub-page ─────────────────────────── */
function MonzMarketPage() {
  const [mkt, setMkt] = useState(DEFAULT_MARKET);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  const [filter, setFilter] = useState("All");
  const [confirmDel, setConfirmDel] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => { (async () => {
    const s = await loadState("faria-monz-market-v1");
    setMkt(mergeMarket(s));
    setReady(true);
  })(); }, []);
  useEffect(() => { if (!ready) return; clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => saveState("faria-monz-market-v1", mkt), 1000); return () => clearTimeout(saveTimer.current); }, [mkt, ready]);

  const add = () => {
    const next = VALIDATION_TEMPLATE(filter !== "All" ? filter : "OpenApply");
    setMkt(prev => ({ ...prev, validations: [next, ...prev.validations] }));
    setExpanded(prev => new Set(prev).add(next.id));
  };
  const update = (id, patch) => setMkt(prev => ({ ...prev, validations: prev.validations.map(v => v.id === id ? { ...v, ...patch } : v) }));
  const remove = (id) => { setMkt(prev => ({ ...prev, validations: prev.validations.filter(v => v.id !== id) })); setConfirmDel(null); };
  const toggle = (id) => setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const card = { background: F.surface, border: `1px solid ${F.border}`, borderRadius: 12, padding: "18px 22px", marginBottom: 18, boxShadow: F.shadowSm };
  const sectionTitle = { fontSize: 11, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 };

  const counts = (prod) => {
    const list = mkt.validations.filter(v => v.product === prod);
    return { total: list.length, piloting: list.filter(v => v.stage === "piloting").length, committed: list.filter(v => v.stage === "committed" || v.stage === "live").length, declined: list.filter(v => v.stage === "declined").length };
  };

  const filtered = filter === "All" ? mkt.validations : mkt.validations.filter(v => v.product === filter);
  const sorted = [...filtered].sort((a, b) => (b.contactedDate || "").localeCompare(a.contactedDate || ""));

  return (
    <>
      <div style={card}>
        <div style={sectionTitle}>Summary by product</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {MONZ_PRODUCTS.map(p => {
            const c = counts(p);
            const active = filter === p;
            return (
              <div key={p} onClick={() => setFilter(active ? "All" : p)} style={{ padding: "12px 14px", background: active ? F.lightYellow : F.bg, border: `1px solid ${active ? F.yellow : F.border}`, borderRadius: 10, cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{p}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: F.plum, lineHeight: 1.1 }}>{c.total}</div>
                <div style={{ fontSize: 11, color: F.muted, marginTop: 4 }}>{c.piloting} piloting · {c.committed} committed · {c.declined} declined</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["All", ...MONZ_PRODUCTS].map(p => (
            <button key={p} onClick={() => setFilter(p)} style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", background: filter === p ? F.plum : F.surface, color: filter === p ? F.paper : F.plum, border: `1px solid ${filter === p ? F.plum : F.borderStrong}`, fontFamily: "inherit" }}>{p}</button>
          ))}
        </div>
        <button onClick={add} style={bt("primary")}>+ Add validation</button>
      </div>

      {sorted.length === 0 && (
        <div style={{ ...card, textAlign: "center", color: F.muted, fontStyle: "italic", fontSize: 13.5 }}>
          No validations {filter !== "All" ? `for ${filter} ` : ""}yet. Click <strong style={{ color: F.plum, fontStyle: "normal" }}>+ Add validation</strong> to log a school conversation, pilot, or commitment.
        </div>
      )}

      {sorted.map(v => {
        const open = expanded.has(v.id);
        return (
          <div key={v.id} style={card}>
            <div onClick={() => toggle(v.id)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none", flexWrap: "wrap" }}>
              <span style={{ color: F.plum, fontSize: 11, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
              <div style={{ flex: 1, minWidth: 200, fontSize: 15, fontWeight: 700, color: F.plum }}>{v.schoolName || <span style={{ color: F.muted2, fontStyle: "italic", fontWeight: 500 }}>(unnamed school)</span>}</div>
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: F.bg, color: F.muted, textTransform: "uppercase", letterSpacing: "0.05em", border: `1px solid ${F.border}` }}>{v.product}</span>
              {v.region && <span style={{ fontSize: 11, color: F.muted }}>{v.region}</span>}
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: stageColor(v.stage), color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>{v.stage}</span>
            </div>

            {open && (
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                <div>
                  <div style={lb}>School name</div>
                  <input value={v.schoolName} onChange={e => update(v.id, { schoolName: e.target.value })} placeholder="e.g. Singapore American School" style={{ ...inp, width: "100%" }} />
                </div>
                <div>
                  <div style={lb}>Product</div>
                  <select value={v.product} onChange={e => update(v.id, { product: e.target.value })} style={{ ...inp, width: "100%", cursor: "pointer" }}>
                    {MONZ_PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <div style={lb}>Region</div>
                  <input value={v.region} onChange={e => update(v.id, { region: e.target.value })} placeholder="e.g. Asia-Pacific" style={{ ...inp, width: "100%" }} />
                </div>
                <div>
                  <div style={lb}>Stage</div>
                  <select value={v.stage} onChange={e => update(v.id, { stage: e.target.value })} style={{ ...inp, width: "100%", cursor: "pointer" }}>
                    {VALIDATION_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <div style={lb}>Contacted date</div>
                  <input type="date" value={v.contactedDate} onChange={e => update(v.id, { contactedDate: e.target.value })} style={{ ...inp, width: "100%" }} />
                </div>
                <div>
                  <div style={lb}>Piloted date</div>
                  <input type="date" value={v.pilotedDate} onChange={e => update(v.id, { pilotedDate: e.target.value })} style={{ ...inp, width: "100%" }} />
                </div>
                <div>
                  <div style={lb}>Willingness to pay</div>
                  <input value={v.willingnessToPay} onChange={e => update(v.id, { willingnessToPay: e.target.value })} placeholder="e.g. $3–5k/yr per school" style={{ ...inp, width: "100%" }} />
                </div>
                <div>
                  <div style={lb}>Contact name</div>
                  <input value={v.contactName} onChange={e => update(v.id, { contactName: e.target.value })} style={{ ...inp, width: "100%" }} />
                </div>
                <div>
                  <div style={lb}>Contact role</div>
                  <input value={v.contactRole} onChange={e => update(v.id, { contactRole: e.target.value })} placeholder="e.g. Director of Admissions" style={{ ...inp, width: "100%" }} />
                </div>
                <div>
                  <div style={lb}>Contact email</div>
                  <input value={v.contactEmail} onChange={e => update(v.id, { contactEmail: e.target.value })} placeholder="name@school.edu" style={{ ...inp, width: "100%" }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={lb}>Feedback summary</div>
                  <textarea value={v.feedback} onChange={e => update(v.id, { feedback: e.target.value })} rows={3} placeholder="What did they say? Pain points, reactions, objections…" style={{ ...inp, width: "100%", resize: "vertical" }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={lb}>Pro "wow" outcomes validated</div>
                  <textarea value={v.wowOutcomesValidated} onChange={e => update(v.id, { wowOutcomesValidated: e.target.value })} rows={2} placeholder="Which Pro feature outcomes did this school confirm as valuable?" style={{ ...inp, width: "100%", resize: "vertical" }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={lb}>Notes</div>
                  <textarea value={v.notes} onChange={e => update(v.id, { notes: e.target.value })} rows={2} style={{ ...inp, width: "100%", resize: "vertical" }} />
                </div>
                <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => setConfirmDel(v.id)} style={bt("danger")}>Delete validation</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {confirmDel != null && (
        <Modal onClose={() => setConfirmDel(null)}>
          <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700, color: F.plum }}>Delete this validation?</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: F.muted }}>This cannot be undone.</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setConfirmDel(null)} style={bt()}>Cancel</button>
            <button onClick={() => remove(confirmDel)} style={bt("danger")}>Delete</button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ── Finance sub-page ───────────────────────────────────── */
function MonzFinancePage({ monz, setMonz }) {
  const [fin, setFin] = useState(DEFAULT_FINANCE);
  const [readyFin, setReadyFin] = useState(false);
  const [bundlePick, setBundlePick] = useState(new Set(MONZ_PRODUCTS));
  const saveTimer = useRef(null);

  useEffect(() => { (async () => {
    const s = await loadState("faria-monz-finance-v1");
    setFin(mergeFinance(s));
    setReadyFin(true);
  })(); }, []);
  useEffect(() => { if (!readyFin) return; clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => saveState("faria-monz-finance-v1", fin), 1000); return () => clearTimeout(saveTimer.current); }, [fin, readyFin]);

  const setCost = (k, v) => setFin(prev => ({ ...prev, costInputs: { ...prev.costInputs, [k]: v === "" ? 0 : (parseFloat(v) || 0) } }));
  const setUsage = (p, k, v) => setFin(prev => ({ ...prev, usageInputs: { ...prev.usageInputs, [p]: { ...prev.usageInputs[p], [k]: v === "" ? 0 : (parseFloat(v) || 0) } } }));
  const addScenario = () => setFin(prev => ({ ...prev, uptakeScenarios: [...prev.uptakeScenarios, SCENARIO_TEMPLATE()] }));
  const updScenario = (id, patch) => setFin(prev => ({ ...prev, uptakeScenarios: prev.uptakeScenarios.map(s => s.id === id ? { ...s, ...patch } : s) }));
  const delScenario = (id) => setFin(prev => ({ ...prev, uptakeScenarios: prev.uptakeScenarios.filter(s => s.id !== id) }));
  const addDecision = () => setFin(prev => ({ ...prev, decisions: [DECISION_TEMPLATE(), ...prev.decisions] }));
  const updDecision = (id, patch) => setFin(prev => ({ ...prev, decisions: prev.decisions.map(d => d.id === id ? { ...d, ...patch } : d) }));
  const delDecision = (id) => setFin(prev => ({ ...prev, decisions: prev.decisions.filter(d => d.id !== id) }));

  // SKU / pricing / bundle mutators (operate on the parent-owned monz)
  const setProductField = (prod, patch) => setMonz(prev => ({ ...prev, products: { ...prev.products, [prod]: { ...prev.products[prod], ...patch } } }));
  const setDiscount = (idx, patch) => setMonz(prev => ({ ...prev, bundleDiscounts: prev.bundleDiscounts.map((d, i) => i === idx ? { ...d, ...patch } : d) }));
  const toggleBundle = (p) => setBundlePick(prev => { const n = new Set(prev); if (n.has(p)) n.delete(p); else n.add(p); return n; });

  // Bundle calc (for the worked example)
  const bundleArr = [...bundlePick];
  const bundleSubtotal = bundleArr.reduce((s, p) => s + (Number(monz.products[p]?.price) || 0), 0);
  const bundleRule = monz.bundleDiscounts.find(d => d.products === bundleArr.length);
  const bundleDisc = bundleSubtotal * ((bundleRule?.pct || 0) / 100);
  const bundleTotal = bundleSubtotal - bundleDisc;

  const card = { background: F.surface, border: `1px solid ${F.border}`, borderRadius: 12, padding: "18px 22px", marginBottom: 18, boxShadow: F.shadowSm };
  const sectionTitle = { fontSize: 11, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 };
  const numInp = { ...inp, width: "100%", textAlign: "right" };

  // Computed: monthly cost per school
  const costPerSchool = (prod, tier) => {
    const u = fin.usageInputs[prod] || { essActionsPerSchoolMonth: 0, proActionsPerSchoolMonth: 0, tokensPerAction: 0 };
    const actions = tier === "pro" ? u.proActionsPerSchoolMonth : u.essActionsPerSchoolMonth;
    const tokenCost = (actions * u.tokensPerAction * fin.costInputs.tokenCostPer1k) / 1000;
    // Spread infra evenly across all products as a rough proxy; support is per-customer per-year, so /12 per month
    const infraShare = fin.costInputs.monthlyInfraCost / MONZ_PRODUCTS.length;
    const support = (fin.costInputs.supportCostPerCustomer || 0) / 12;
    return tokenCost + infraShare + support;
  };
  const fmtMoney = (n) => isFinite(n) ? `$${n.toFixed(2)}` : "—";
  const fmtPct = (n) => isFinite(n) ? `${n.toFixed(0)}%` : "—";

  return (
    <>
      {/* SKUs & pricing — moved from the Framework view; the source of truth for breakeven and uptake-scenario revenue */}
      <div style={card}>
        <div style={sectionTitle}>SKUs &amp; pricing</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {MONZ_PRODUCTS.map(p => {
            const pd = monz.products[p] || { sku: "", unit: "", price: 0 };
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
            {monz.bundleDiscounts.map((d, i) => (
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

      <div style={card}>
        <div style={sectionTitle}>Cost inputs</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <div>
            <div style={lb}>Token cost · per 1k tokens (USD)</div>
            <input type="number" min="0" step="0.001" value={fin.costInputs.tokenCostPer1k || ""} placeholder="0" onChange={e => setCost("tokenCostPer1k", e.target.value)} style={numInp} />
          </div>
          <div>
            <div style={lb}>Monthly infra cost (USD)</div>
            <input type="number" min="0" step="1" value={fin.costInputs.monthlyInfraCost || ""} placeholder="0" onChange={e => setCost("monthlyInfraCost", e.target.value)} style={numInp} />
          </div>
          <div>
            <div style={lb}>Support · per customer / year (USD)</div>
            <input type="number" min="0" step="1" value={fin.costInputs.supportCostPerCustomer || ""} placeholder="0" onChange={e => setCost("supportCostPerCustomer", e.target.value)} style={numInp} />
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={sectionTitle}>Usage inputs · per product, per school, per month</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: F.bg }}>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Product</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Essential actions / school / mo</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pro actions / school / mo</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Tokens / action</th>
              </tr>
            </thead>
            <tbody>
              {MONZ_PRODUCTS.map(p => {
                const u = fin.usageInputs[p] || {};
                return (
                  <tr key={p} style={{ borderBottom: `1px solid ${F.border}` }}>
                    <td style={{ padding: "8px 10px", color: F.plum, fontWeight: 600 }}>{p}</td>
                    <td style={{ padding: "6px 10px" }}><input type="number" min="0" value={u.essActionsPerSchoolMonth || ""} placeholder="0" onChange={e => setUsage(p, "essActionsPerSchoolMonth", e.target.value)} style={numInp} /></td>
                    <td style={{ padding: "6px 10px" }}><input type="number" min="0" value={u.proActionsPerSchoolMonth || ""} placeholder="0" onChange={e => setUsage(p, "proActionsPerSchoolMonth", e.target.value)} style={numInp} /></td>
                    <td style={{ padding: "6px 10px" }}><input type="number" min="0" value={u.tokensPerAction || ""} placeholder="0" onChange={e => setUsage(p, "tokensPerAction", e.target.value)} style={numInp} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={card}>
        <div style={sectionTitle}>Computed · monthly cost per school</div>
        <p style={{ margin: "0 0 12px", fontSize: 11.5, color: F.muted, fontStyle: "italic" }}>(actions/mo × tokens/action × token cost ÷ 1000) + infra share + support / 12.</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: F.bg }}>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Product</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Essential cost / school / mo</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pro cost / school / mo</th>
              </tr>
            </thead>
            <tbody>
              {MONZ_PRODUCTS.map(p => (
                <tr key={p} style={{ borderBottom: `1px solid ${F.border}` }}>
                  <td style={{ padding: "8px 10px", color: F.plum, fontWeight: 600 }}>{p}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: F.plum, fontWeight: 700 }}>{fmtMoney(costPerSchool(p, "essential"))}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: F.plum, fontWeight: 700 }}>{fmtMoney(costPerSchool(p, "pro"))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={card}>
        <div style={sectionTitle}>Breakeven analysis · Pro SKU vs cost</div>
        <p style={{ margin: "0 0 12px", fontSize: 11.5, color: F.muted, fontStyle: "italic" }}>Pulls Pro SKU price from the Plan view (per account / year ÷ 12). Margin % at current price.</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: F.bg }}>
                {["Product", "Pro SKU price / yr", "Cost / school / mo (Pro)", "Revenue / school / mo (Pro)", "Margin / school / mo", "Margin %"].map(h => (
                  <th key={h} style={{ textAlign: "right", padding: "8px 10px", fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MONZ_PRODUCTS.map(p => {
                const price = (monz.products[p]?.price || 0);
                const monthlyRev = price / 12;
                const monthlyCost = costPerSchool(p, "pro");
                const margin = monthlyRev - monthlyCost;
                const marginPct = monthlyRev > 0 ? (margin / monthlyRev) * 100 : NaN;
                return (
                  <tr key={p} style={{ borderBottom: `1px solid ${F.border}` }}>
                    <td style={{ padding: "8px 10px", color: F.plum, fontWeight: 600, textAlign: "left" }}>{p}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: F.muted }}>{fmtMoney(price)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: F.muted }}>{fmtMoney(monthlyCost)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: F.muted }}>{fmtMoney(monthlyRev)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: margin >= 0 ? F.green : F.pink, fontWeight: 700 }}>{fmtMoney(margin)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: marginPct >= 0 ? F.green : F.pink, fontWeight: 700 }}>{isFinite(marginPct) ? fmtPct(marginPct) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={sectionTitle}>Uptake scenarios</div>
          <button onClick={addScenario} style={bt("primary")}>+ Add scenario</button>
        </div>
        {fin.uptakeScenarios.length === 0 && (
          <p style={{ margin: 0, fontSize: 12.5, color: F.muted, fontStyle: "italic", textAlign: "center", padding: "12px 0" }}>No scenarios yet. Add one to model revenue at a given Pro-uptake assumption.</p>
        )}
        {fin.uptakeScenarios.map(s => {
          const totalSchools = parseFloat(s.totalSchools) || 0;
          let revenue = 0, cost = 0;
          MONZ_PRODUCTS.forEach(p => {
            const pct = parseFloat(s[productPctKey(p)]) || 0;
            const proSchools = (totalSchools * pct) / 100;
            const price = (monz.products[p]?.price || 0);
            revenue += proSchools * price;
            cost += proSchools * costPerSchool(p, "pro") * 12;
          });
          const profit = revenue - cost;
          return (
            <div key={s.id} style={{ marginTop: 12, padding: 12, background: F.bg, border: `1px solid ${F.border}`, borderRadius: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 32px", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <div>
                  <div style={lb}>Scenario</div>
                  <input value={s.label} onChange={e => updScenario(s.id, { label: e.target.value })} placeholder="e.g. Q3 2026" style={{ ...inp, width: "100%" }} />
                </div>
                <div>
                  <div style={lb}>Total schools</div>
                  <input type="number" min="0" value={s.totalSchools || ""} placeholder="0" onChange={e => updScenario(s.id, { totalSchools: e.target.value })} style={numInp} />
                </div>
                {MONZ_PRODUCTS.map(p => (
                  <div key={p}>
                    <div style={lb}>{p.slice(0, 8)} %</div>
                    <input type="number" min="0" max="100" value={s[productPctKey(p)] || ""} placeholder="0" onChange={e => updScenario(s.id, { [productPctKey(p)]: e.target.value })} style={numInp} />
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "flex-end", height: "100%" }}>
                  <button onClick={() => delScenario(s.id)} title="Remove" style={{ ...bt("ghost"), padding: "6px 8px", color: F.muted2 }}>×</button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12.5, paddingTop: 8, borderTop: `1px solid ${F.border}` }}>
                <div><span style={{ color: F.muted, fontWeight: 600 }}>Revenue / yr</span> <strong style={{ color: F.plum }}>{fmtMoney(revenue)}</strong></div>
                <div><span style={{ color: F.muted, fontWeight: 600 }}>Cost / yr</span> <strong style={{ color: F.pink }}>{fmtMoney(cost)}</strong></div>
                <div><span style={{ color: F.muted, fontWeight: 600 }}>Gross profit / yr</span> <strong style={{ color: profit >= 0 ? F.green : F.pink }}>{fmtMoney(profit)}</strong></div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={sectionTitle}>Decisions log</div>
          <button onClick={addDecision} style={bt("primary")}>+ Log decision</button>
        </div>
        {fin.decisions.length === 0 && (
          <p style={{ margin: 0, fontSize: 12.5, color: F.muted, fontStyle: "italic", textAlign: "center", padding: "12px 0" }}>No decisions logged yet.</p>
        )}
        {fin.decisions.map(d => (
          <div key={d.id} style={{ marginTop: 10, padding: 12, background: F.bg, border: `1px solid ${F.border}`, borderRadius: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 30px", gap: 10, marginBottom: 8 }}>
              <input type="date" value={d.date} onChange={e => updDecision(d.id, { date: e.target.value })} style={{ ...inp }} />
              <input value={d.decidedBy} onChange={e => updDecision(d.id, { decidedBy: e.target.value })} placeholder="Decided by (name / team)" style={{ ...inp }} />
              <button onClick={() => delDecision(d.id)} title="Remove" style={{ ...bt("ghost"), padding: "6px 8px", color: F.muted2 }}>×</button>
            </div>
            <textarea value={d.summary} onChange={e => updDecision(d.id, { summary: e.target.value })} rows={2} placeholder="Decision summary…" style={{ ...inp, width: "100%", resize: "vertical" }} />
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={sectionTitle}>General notes</div>
        <textarea value={fin.notes} onChange={e => setFin(prev => ({ ...prev, notes: e.target.value }))} rows={4} placeholder="Open questions, assumptions, caveats…" style={{ ...inp, width: "100%", resize: "vertical" }} />
      </div>
    </>
  );
}

/* ── Fair Use Example (sub-page of AI Monetization) ───────
   Static mockup deck — what hitting a fair-use limit looks like
   inside the actual product. Deliberately styled with OpenApply
   neutrals (Open Sans, grayscale text, plum brand, amber warnings)
   so the panels feel authentic to the in-product UX rather than the
   bright Faria tracker chrome. */
function FairUseExample({ monz, setMonz }) {
  const rationale = monz?.leadingModelRationale || DEFAULT_MONETIZATION.leadingModelRationale;
  const setRationale = (idx, val) => setMonz(prev => ({ ...prev, leadingModelRationale: (prev.leadingModelRationale || DEFAULT_MONETIZATION.leadingModelRationale).map((r, i) => i === idx ? val : r) }));
  const addRationale = () => setMonz(prev => ({ ...prev, leadingModelRationale: [...(prev.leadingModelRationale || DEFAULT_MONETIZATION.leadingModelRationale), ""] }));
  const removeRationale = (idx) => setMonz(prev => ({ ...prev, leadingModelRationale: (prev.leadingModelRationale || DEFAULT_MONETIZATION.leadingModelRationale).filter((_, i) => i !== idx) }));
  const styles = `
    .fue-deck { font-family: 'Open Sans', system-ui, sans-serif; color: #101828; font-size: 14px; line-height: 1.45; }
    .fue-intro { margin: 0 0 28px; padding: 18px 20px; background: #ECE9EF; border: 1px solid #E0DAE6; border-radius: 10px; }
    .fue-intro h2 { font-size: 16px; margin: 0 0 6px 0; color: ${F.plum}; font-weight: 700; }
    .fue-intro p { color: #667085; margin: 0; font-size: 13px; }

    .fue-variant { margin-bottom: 36px; }
    .fue-variant-name h3 { font-size: 16px; margin: 0 0 4px 0; color: ${F.plum}; font-weight: 700; }
    .fue-variant-name p { margin: 0 0 16px 0; color: #667085; font-size: 12.5px; }

    .fue-surface { margin-bottom: 12px; }
    .fue-surface-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.6px; color: #667085; font-weight: 700; margin-bottom: 8px; }

    .fue-plan-tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px 3px 7px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.4px; line-height: 1.4; background: #F6F4FA; color: #5D3460; border: 1px solid #EFE9F3; white-space: nowrap; }
    .fue-plan-tag .fue-spark { font-size: 10px; line-height: 1; }

    .fue-panel-row { display: flex; gap: 22px; align-items: flex-start; }
    .fue-panel { width: 380px; min-height: 540px; background: #fff; border: 1px solid #EAECF0; border-radius: 8px; box-shadow: 0 4px 12px rgba(16,24,40,0.08); display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; max-width: 100%; }

    .fue-panel-head { display: flex; align-items: center; padding: 14px 16px 10px; border-bottom: 1px solid #EAECF0; gap: 10px; }
    .fue-panel-head .fue-back, .fue-panel-head .fue-close { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #667085; font-size: 16px; flex-shrink: 0; }
    .fue-panel-head .fue-ph-stack { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; }
    .fue-panel-head .fue-ph-title { font-weight: 700; font-size: 14px; line-height: 1.2; }

    .fue-panel-sub { padding: 14px 18px 6px; font-size: 12px; color: #667085; }
    .fue-panel-sub strong { color: #101828; font-weight: 600; }

    .fue-summary { margin: 8px 18px 0; background: linear-gradient(180deg, #FBFAFD 0%, #F2EDF6 100%); border: 1px solid #EFE9F3; border-radius: 8px; padding: 14px 14px 12px; }
    .fue-summary p { margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #101828; }
    .fue-summary .fue-meta { display: inline-flex; align-items: center; gap: 5px; color: ${F.plum}; font-weight: 700; font-size: 12px; }
    .fue-summary .fue-meta .fue-spark { font-size: 13px; }

    .fue-meter { margin: 14px 18px 0; padding: 10px 12px; background: #fff; border: 1px solid #EAECF0; border-radius: 6px; display: flex; align-items: center; gap: 10px; }
    .fue-meter .fue-dots { display: inline-flex; gap: 3px; }
    .fue-meter .fue-dot { width: 10px; height: 10px; border-radius: 50%; background: #E4E7EC; }
    .fue-meter .fue-dot.fue-filled { background: #98a2b3; }
    .fue-meter .fue-dot.fue-amber { background: #F59D00; }
    .fue-meter .fue-mlabel { font-size: 12px; color: #344054; flex: 1; }
    .fue-meter .fue-mlabel .fue-resets { color: #667085; }
    .fue-meter.fue-amber-meter { background: #FFF8E6; border-color: #F1D58C; }
    .fue-meter.fue-amber-meter .fue-mlabel { color: #6b4500; font-weight: 600; }

    .fue-callout { margin: 12px 18px 0; padding: 10px 12px; background: #FFF8E6; border: 1px solid #F1D58C; border-radius: 6px; font-size: 12px; color: #6b4500; line-height: 1.6; }
    .fue-callout strong { color: #6b4500; font-weight: 700; }
    .fue-callout a { color: ${F.plum}; font-weight: 800; text-decoration: none; background: #fff; padding: 1px 7px; margin: 0 1px; border-radius: 4px; border: 1px solid #F1D58C; }

    /* Soft upgrade chip — subtle link tucked below the Review Profile button */
    .fue-soft-upgrade { margin: 8px 0 0; padding: 0; background: none; border: none; font-size: 11px; line-height: 1.4; text-align: center; }
    .fue-soft-upgrade a { color: #8E7F8C; font-weight: 600; text-decoration: underline; text-decoration-color: rgba(142,127,140,0.35); text-underline-offset: 2px; }
    .fue-soft-upgrade a:hover { color: ${F.plum}; text-decoration-color: ${F.plum}; }

    /* Collapsible "Total AI Usage" card — used in comparison columns and Plenty/Approaching deep-dive states */
    .fue-usage-card { background: #FAFAFB; border: 1px solid #EAECF0; border-radius: 6px; overflow: hidden; margin-top: 12px; }
    .fue-usage-card.fue-in-panel { margin: 12px 18px 0; }
    .fue-usage-card summary { cursor: pointer; padding: 9px 11px; font-size: 11.5px; font-weight: 700; color: #344054; list-style: none; display: flex; align-items: center; gap: 8px; user-select: none; }
    .fue-usage-card summary::-webkit-details-marker { display: none; }
    .fue-usage-chevron { font-size: 9px; color: #98a2b3; transition: transform 0.15s ease; display: inline-block; line-height: 1; }
    .fue-usage-card[open] .fue-usage-chevron { transform: rotate(90deg); }
    .fue-usage-title { flex: 1; }
    .fue-usage-header-val { font-size: 11px; font-weight: 600; color: #667085; white-space: nowrap; }
    .fue-usage-rows { padding: 2px 11px 10px; display: flex; flex-direction: column; gap: 4px; }
    .fue-usage-row { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: #344054; padding: 1px 0; }
    .fue-usage-swatch { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
    .fue-usage-name { flex: 1; }
    .fue-usage-val { font-weight: 700; color: #101828; white-space: nowrap; }

    .fue-blocked { margin: 12px 18px 0; padding: 16px; background: #FAFAFB; border: 1px solid #EAECF0; border-radius: 8px; }
    .fue-blocked .fue-bk-title { font-weight: 700; font-size: 14px; margin: 0 0 6px 0; color: #101828; }
    .fue-blocked p { font-size: 13px; color: #344054; margin: 0 0 8px 0; line-height: 1.5; }
    .fue-blocked .fue-reset-line { font-size: 12px; color: #667085; margin: 0 0 14px 0; }
    .fue-blocked .fue-cta-stack { display: flex; flex-direction: column; gap: 8px; }

    .fue-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 14px; border-radius: 6px; font-size: 13px; font-weight: 700; border: 1px solid transparent; text-decoration: none; line-height: 1; font-family: inherit; }
    .fue-btn-primary { background: ${F.plum}; color: #fff; }
    .fue-btn-secondary { background: #fff; color: #101828; border-color: #EAECF0; }
    .fue-btn-block { width: 100%; padding: 12px 14px; font-size: 14px; }

    .fue-panel-spacer { flex: 1; }
    .fue-panel-foot { padding: 12px 18px 16px; border-top: 1px solid #EAECF0; display: flex; flex-direction: column; gap: 8px; background: #fff; }
    .fue-panel-foot .fue-start-btn { width: 100%; background: ${F.plum}; color: #fff; border: none; padding: 14px 16px; border-radius: 6px; font-weight: 700; font-size: 14px; font-family: inherit; }
    .fue-panel-foot .fue-disclaimer { font-size: 11px; color: #98a2b3; line-height: 1.5; margin: 0; }

    .fue-postrun { background: #fff; border: 1px solid #EAECF0; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #667085; display: flex; align-items: center; gap: 10px; box-shadow: 0 1px 2px rgba(16,24,40,0.05); max-width: 380px; }
    .fue-postrun.fue-amber-post { background: #FFF8E6; border-color: #F1D58C; color: #6b4500; font-weight: 600; }
    .fue-postrun .fue-pr-dot { width: 6px; height: 6px; border-radius: 50%; background: #98a2b3; flex-shrink: 0; }
    .fue-postrun.fue-amber-post .fue-pr-dot { background: #F59D00; }
    .fue-postrun a { color: ${F.plum}; font-weight: 700; text-decoration: none; margin-left: auto; white-space: nowrap; }
    .fue-surface.fue-na .fue-postrun { background: transparent; border: 1px dashed #EAECF0; color: #98a2b3; font-style: italic; box-shadow: none; }

    /* ── Side-by-side comparison (Model A vs Model B) ─── */
    .fue-cmp-section { margin: 0 0 40px; }
    .fue-cmp-heading { font-size: 16px; font-weight: 700; color: ${F.plum}; margin: 0 0 4px 0; font-family: 'Nunito Sans','Trebuchet MS',system-ui,sans-serif; }
    .fue-cmp-sub { font-size: 12.5px; color: #667085; margin: 0 0 18px 0; }
    .fue-cmp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; align-items: stretch; }
    .fue-cmp-col { background: #fff; border: 1px solid #EAECF0; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 1px 2px rgba(16,24,40,0.05); }
    .fue-cmp-banner { padding: 14px 18px; border-bottom: 1px solid #EAECF0; }
    .fue-cmp-banner.fue-cmp-banner-a { background: #F6F4FA; }
    .fue-cmp-banner.fue-cmp-banner-b { background: #FFF8E6; }
    .fue-cmp-banner.fue-cmp-banner-c { background: #E8F5EE; }
    .fue-cmp-tag { display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: 0.8px; padding: 3px 9px; border-radius: 4px; margin-bottom: 6px; }
    .fue-cmp-banner-a .fue-cmp-tag { background: ${F.plum}; color: #fff; }
    .fue-cmp-banner-b .fue-cmp-tag { background: #6b4500; color: #FFF8E6; }
    .fue-cmp-banner-c .fue-cmp-tag { background: ${F.green}; color: #fff; }

    /* Leading-option highlight on Model B */
    .fue-cmp-col.fue-cmp-leading { border: 2px solid ${F.pink}; box-shadow: 0 6px 18px rgba(232, 55, 172, 0.18); }
    .fue-leading-row { margin-bottom: 8px; }
    .fue-leading-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.8px; padding: 3px 9px; border-radius: 4px; background: ${F.pink}; color: #fff; }

    /* "Why Model B?" rationale card */
    .fue-rationale-card { background: #fff; border: 2px solid ${F.pink}; border-radius: 12px; padding: 18px 22px; margin: 22px 0 8px; box-shadow: 0 4px 14px rgba(232, 55, 172, 0.10); display: grid; grid-template-columns: minmax(200px, 1fr) 2fr; gap: 22px; align-items: start; }
    .fue-rationale-card .rat-left { display: flex; flex-direction: column; gap: 6px; }
    .fue-rationale-card .rat-eyebrow { font-size: 10.5px; font-weight: 800; color: ${F.pink}; text-transform: uppercase; letter-spacing: 0.1em; }
    .fue-rationale-card .rat-title { font-size: 17px; font-weight: 700; color: ${F.plum}; line-height: 1.25; margin: 0; font-family: 'Nunito Sans','Trebuchet MS',system-ui,sans-serif; }
    .fue-rationale-card .rat-sub { font-size: 12.5px; color: #667085; margin: 0; line-height: 1.5; }
    .fue-rationale-card .rat-list { display: flex; flex-direction: column; gap: 8px; }
    .fue-rationale-card .rat-row { display: flex; align-items: center; gap: 8px; background: #FAFAFB; border: 1px solid #EAECF0; border-radius: 7px; padding: 7px 10px 7px 11px; }
    .fue-rationale-card .rat-bullet { width: 7px; height: 7px; border-radius: 50%; background: ${F.pink}; flex-shrink: 0; }
    .fue-rationale-card .rat-input { flex: 1; border: none; background: transparent; font-size: 13px; color: #344054; outline: none; font-family: inherit; min-width: 0; }
    .fue-rationale-card .rat-remove { width: 20px; height: 20px; border-radius: 10px; background: transparent; border: none; color: #98a2b3; cursor: pointer; font-size: 14px; line-height: 1; padding: 0; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; font-family: inherit; }
    .fue-rationale-card .rat-add { margin-top: 4px; padding: 6px 11px; border: 1px dashed ${F.borderStrong}; background: transparent; color: ${F.plum}; border-radius: 7px; font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit; align-self: flex-start; }
    @media (max-width: 720px) { .fue-rationale-card { grid-template-columns: 1fr; } }
    .fue-cmp-title { font-size: 15px; font-weight: 700; color: #101828; margin: 0 0 3px 0; line-height: 1.25; }
    .fue-cmp-tagline { font-size: 12px; color: #667085; margin: 0; line-height: 1.4; }
    .fue-cmp-body { padding: 16px 18px 0; display: flex; flex-direction: column; gap: 14px; flex: 1; }

    /* mock launcher (smaller, fits inside the comparison column) */
    .fue-cmp-mini-panel { background: #fff; border: 1px solid #EAECF0; border-radius: 8px; padding: 12px 12px 10px; box-shadow: 0 1px 2px rgba(16,24,40,0.04); }
    .fue-cmp-mp-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .fue-cmp-mp-title { font-size: 12.5px; font-weight: 700; color: #101828; flex: 1; }
    .fue-cmp-mp-sub { font-size: 11px; color: #667085; margin: 0 0 10px 0; }
    .fue-cmp-mp-sub strong { color: #101828; font-weight: 600; }

    /* per-feature meter (Model A) */
    .fue-cmp-pf-meter { display: flex; align-items: center; gap: 9px; padding: 8px 10px; background: #fff; border: 1px solid #EAECF0; border-radius: 6px; }
    .fue-cmp-pf-meter .fue-dots { display: inline-flex; gap: 3px; }
    .fue-cmp-pf-meter .fue-dot { width: 9px; height: 9px; border-radius: 50%; background: #E4E7EC; }
    .fue-cmp-pf-meter .fue-dot.fue-filled { background: #98a2b3; }
    .fue-cmp-pf-meter .fue-mlabel { font-size: 11.5px; color: #344054; flex: 1; }
    .fue-cmp-pf-meter .fue-mlabel strong { color: #101828; }
    .fue-cmp-pf-meter .fue-resets { color: #667085; }

    /* pooled-credit meter (Model B) */
    .fue-cmp-pool-meter { padding: 10px 12px; background: #fff; border: 1px solid #EAECF0; border-radius: 6px; }
    .fue-cmp-pool-label { display: flex; justify-content: space-between; align-items: baseline; font-size: 11.5px; color: #344054; margin-bottom: 7px; }
    .fue-cmp-pool-label strong { color: #101828; font-weight: 700; }
    .fue-cmp-pool-reset { font-size: 10.5px; color: #667085; font-weight: 500; }
    .fue-cmp-pool-track { height: 8px; background: #ECE9EF; border-radius: 4px; overflow: hidden; display: flex; }
    .fue-cmp-pool-fill-a { background: ${F.plum}; }
    .fue-cmp-pool-fill-b { background: ${F.pink}; }

    /* sibling card (Model A) — shows the other feature's independent counter */
    .fue-cmp-sibling { padding: 12px 14px; background: #FAFAFB; border: 1px solid #EAECF0; border-radius: 8px; }
    .fue-cmp-sibling-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #98a2b3; margin: 0 0 8px 0; }
    .fue-cmp-sibling-row { display: flex; align-items: center; gap: 9px; }
    .fue-cmp-sibling-name { font-size: 12.5px; font-weight: 600; color: #101828; flex: 1; }
    .fue-cmp-sibling-count { font-size: 11.5px; color: #667085; font-weight: 600; }

    /* breakdown card (Model B) — stacked bar + key */
    .fue-cmp-breakdown { padding: 12px 14px; background: #FAFAFB; border: 1px solid #EAECF0; border-radius: 8px; }
    .fue-cmp-bd-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #98a2b3; margin: 0 0 9px 0; }
    .fue-cmp-bd-total { font-size: 12px; color: #344054; margin-bottom: 8px; }
    .fue-cmp-bd-total strong { color: #101828; font-weight: 700; }
    .fue-cmp-bd-bar { height: 10px; background: #ECE9EF; border-radius: 5px; overflow: hidden; display: flex; margin-bottom: 10px; }
    .fue-cmp-bd-seg-a { background: ${F.plum}; }
    .fue-cmp-bd-seg-b { background: ${F.pink}; }
    .fue-cmp-bd-key { display: flex; flex-direction: column; gap: 5px; font-size: 11.5px; color: #344054; }
    .fue-cmp-bd-key-row { display: flex; align-items: center; gap: 7px; }
    .fue-cmp-bd-swatch { width: 9px; height: 9px; border-radius: 2px; flex-shrink: 0; }
    .fue-cmp-bd-key-name { flex: 1; }
    .fue-cmp-bd-key-val { font-weight: 700; color: #101828; }
    .fue-cmp-bd-cost { font-size: 10.5px; color: #667085; margin-top: 8px; font-style: italic; }

    /* verdict bullets */
    .fue-cmp-verdict { padding: 12px 18px 16px; border-top: 1px solid #EAECF0; background: #FAFAFB; }
    .fue-cmp-verdict-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #667085; margin: 0 0 8px 0; }
    .fue-cmp-verdict ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
    .fue-cmp-verdict li { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; line-height: 1.45; color: #344054; }
    .fue-cmp-verdict li .fue-mark { flex-shrink: 0; font-weight: 800; width: 14px; text-align: center; line-height: 1.45; }
    .fue-cmp-verdict li.fue-pro .fue-mark { color: ${F.pink}; }
    .fue-cmp-verdict li.fue-con .fue-mark { color: #98a2b3; }

    .fue-deep-heading { font-size: 16px; font-weight: 700; color: ${F.plum}; margin: 36px 0 4px 0; font-family: 'Nunito Sans','Trebuchet MS',system-ui,sans-serif; }
    .fue-deep-sub { font-size: 12.5px; color: #667085; margin: 0 0 22px 0; }

    /* Per-model state walkthrough headings */
    .fue-model-section { margin: 36px 0 0; padding-top: 24px; border-top: 1px solid #EAECF0; }
    .fue-model-section:first-of-type { border-top: none; padding-top: 0; margin-top: 36px; }
    .fue-model-section-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; flex-wrap: wrap; }
    .fue-model-section-head h3 { font-size: 16px; font-weight: 700; color: ${F.plum}; margin: 0; font-family: 'Nunito Sans','Trebuchet MS',system-ui,sans-serif; }
    .fue-model-section-sub { font-size: 12.5px; color: #667085; margin: 0 0 22px 0; }

    /* State-level model tag (small chip above each variant name) */
    .fue-state-tag { display: inline-block; font-size: 9.5px; font-weight: 800; letter-spacing: 0.7px; padding: 2px 8px; border-radius: 3px; margin-bottom: 6px; white-space: nowrap; }
    .fue-state-tag.fue-tag-a { background: ${F.plum}; color: #fff; }
    .fue-state-tag.fue-tag-b { background: #6b4500; color: #FFF8E6; }
    .fue-state-tag.fue-tag-c { background: ${F.green}; color: #fff; }

    /* Small caption under the Model C side-by-side mock (replaces breakdown card) */
    .fue-cmp-caption { padding: 10px 12px; background: #F4FAF6; border: 1px solid #D7EEDF; border-radius: 8px; font-size: 12px; color: #1f5232; line-height: 1.5; font-style: italic; text-align: center; }

    /* States grid — lays out a model's state mockups in columns (auto-fit) — deprecated, kept harmless */
    .fue-states-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; align-items: stretch; margin-top: 18px; }
    .fue-states-grid .fue-variant { margin-bottom: 0; display: flex; flex-direction: column; }
    .fue-states-grid .fue-variant-name { padding: 0 4px; }
    .fue-states-grid .fue-variant-name h3 { font-size: 14.5px; }
    .fue-states-grid .fue-variant-name p { font-size: 12px; min-height: 32px; }
    .fue-states-grid .fue-panel-row { width: 100%; }
    .fue-states-grid .fue-panel { width: 100%; min-height: 0; height: 100%; }

    /* By-state layout — each row is a state, cells are the three models side-by-side */
    .fue-by-state-section { margin-top: 36px; }
    .fue-by-state-heading { font-size: 16px; font-weight: 700; color: ${F.plum}; margin: 0 0 4px 0; font-family: 'Nunito Sans','Trebuchet MS',system-ui,sans-serif; }
    .fue-by-state-sub { font-size: 12.5px; color: #667085; margin: 0 0 6px 0; }
    .fue-by-state-hint { font-size: 11.5px; color: #98a2b3; font-style: italic; margin: 0 0 26px 0; }
    .fue-by-state-row { margin-bottom: 36px; padding-top: 22px; border-top: 1px solid #EAECF0; }
    .fue-by-state-row:first-of-type { border-top: none; padding-top: 0; }
    .fue-by-state-row:last-child { margin-bottom: 0; }
    .fue-by-state-row-header { margin-bottom: 14px; padding: 0 4px; }
    .fue-by-state-row-header h4 { font-size: 15px; font-weight: 700; color: ${F.plum}; margin: 0 0 4px 0; font-family: 'Nunito Sans','Trebuchet MS',system-ui,sans-serif; }
    .fue-by-state-row-header p { font-size: 12px; color: #667085; margin: 0; line-height: 1.5; }
    .fue-by-state-cells { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; align-items: stretch; }
    .fue-by-state-cell { display: flex; flex-direction: column; gap: 7px; position: relative; }
    .fue-by-state-cell > .fue-state-tag { align-self: flex-start; margin-bottom: 0; }
    .fue-by-state-cell .fue-panel { width: 100%; min-height: 0; height: 100%; transition: transform 0.22s cubic-bezier(0.2,0,0.2,1), box-shadow 0.22s ease; transform-origin: center center; }
    .fue-by-state-cell:hover .fue-panel { transform: scale(1.12); box-shadow: 0 16px 40px rgba(16,24,40,0.22); z-index: 20; position: relative; }
    .fue-by-state-cells:has(.fue-by-state-cell:hover) .fue-by-state-cell:not(:hover) .fue-panel { opacity: 0.45; filter: saturate(0.85); }
    .fue-by-state-cells:has(.fue-by-state-cell:hover) .fue-by-state-cell:not(:hover) .fue-na-card { opacity: 0.45; }

    /* NA card — for states that don't apply to a given model */
    .fue-na-card { flex: 1; border: 1px dashed #D5CACB; border-radius: 8px; padding: 22px 18px; font-size: 12px; color: #8E7F8C; font-style: italic; display: flex; align-items: center; justify-content: center; text-align: center; line-height: 1.55; min-height: 200px; background: #FAF7F7; transition: opacity 0.22s ease; }

    /* Per-state usage breakdown mini-card (Models B and C deep-dive states) */
    .fue-usage-mini { margin: 12px 18px 0; padding: 9px 11px; background: #FAFAFB; border: 1px solid #EAECF0; border-radius: 6px; }
    .fue-usage-mini-eyebrow { font-size: 9.5px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; color: #98a2b3; margin: 0 0 7px; }
    .fue-usage-mini-row { display: flex; align-items: center; gap: 7px; font-size: 11.5px; padding: 1px 0; color: #344054; }
    .fue-usage-mini-swatch { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
    .fue-usage-mini-name { flex: 1; }
    .fue-usage-mini-val { font-weight: 700; color: #101828; white-space: nowrap; }

    /* Bar-style meter for Model B and Model C states (used in deep-dive panels) */
    .fue-bar-meter { margin: 14px 18px 0; padding: 10px 12px; background: #fff; border: 1px solid #EAECF0; border-radius: 6px; }
    .fue-bar-meter .fue-bm-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; color: #344054; margin-bottom: 6px; }
    .fue-bar-meter .fue-bm-row strong { color: #101828; font-weight: 700; }
    .fue-bar-meter .fue-bm-reset { font-size: 11px; color: #667085; font-weight: 500; }
    .fue-bar-meter .fue-bm-track { height: 8px; background: #ECE9EF; border-radius: 4px; overflow: hidden; }
    .fue-bar-meter .fue-bm-fill { height: 100%; background: #98a2b3; transition: width 0.3s; }
    .fue-bar-meter.fue-bar-amber { background: #FFF8E6; border-color: #F1D58C; }
    .fue-bar-meter.fue-bar-amber .fue-bm-row { color: #6b4500; font-weight: 600; }
    .fue-bar-meter.fue-bar-amber .fue-bm-row strong { color: #6b4500; }
    .fue-bar-meter.fue-bar-amber .fue-bm-fill { background: #F59D00; }

    @media (max-width: 760px) {
      .fue-panel { width: 100%; }
    }
  `;

  // Reusable panel header (back / title / plan tag / close)
  const PanelHead = () => (
    <div className="fue-panel-head">
      <div className="fue-back">←</div>
      <div className="fue-ph-stack">
        <div className="fue-ph-title">AI Profile Review</div>
        <span className="fue-plan-tag"><span className="fue-spark">✦</span> AI Essential</span>
      </div>
      <div className="fue-close">✕</div>
    </div>
  );

  const PanelSub = () => (
    <div className="fue-panel-sub">Reviewing applicant profile · <strong>Olivia Zhang</strong></div>
  );

  const SummaryCard = () => (
    <div className="fue-summary">
      <p>Generate an AI summary for this profile.</p>
    </div>
  );

  const Disclaimer = ({ showStart, softUpgrade }) => (
    <div className="fue-panel-foot">
      {showStart && <button className="fue-start-btn">Review Profile</button>}
      {softUpgrade && <SoftUpgrade />}
      <p className="fue-disclaimer">AI-generated summaries may contain errors. Please verify against source documents.</p>
    </div>
  );

  // ── Reusable usage-mini breakdown card (Models B and C, expanded — used in UserCap/Exhausted states) ──
  const UsageMini = ({ eyebrow, rows }) => (
    <div className="fue-usage-mini">
      <p className="fue-usage-mini-eyebrow">{eyebrow}</p>
      {rows.map((r, i) => (
        <div key={i} className="fue-usage-mini-row">
          <span className="fue-usage-mini-swatch" style={{ background: r.color }}></span>
          <span className="fue-usage-mini-name">{r.name}</span>
          <span className="fue-usage-mini-val">{r.val}</span>
        </div>
      ))}
    </div>
  );

  // ── Collapsible "Total AI Usage" card (used in comparison columns + Plenty/Approaching deep-dive states) ──
  const TotalAIUsage = ({ headerVal, rows, inPanel = false }) => (
    <details className={"fue-usage-card" + (inPanel ? " fue-in-panel" : "")}>
      <summary>
        <span className="fue-usage-chevron">▸</span>
        <span className="fue-usage-title">Total AI Usage</span>
        <span className="fue-usage-header-val">{headerVal}</span>
      </summary>
      <div className="fue-usage-rows">
        {rows.map((r, i) => (
          <div key={i} className="fue-usage-row">
            <span className="fue-usage-swatch" style={{ background: r.color }}></span>
            <span className="fue-usage-name">{r.name}</span>
            <span className="fue-usage-val">{r.val}</span>
          </div>
        ))}
      </div>
    </details>
  );

  // ── Soft upgrade chip shown below the Review Profile button on non-blocked states ────────
  const SoftUpgrade = () => (
    <div className="fue-soft-upgrade">
      <a href="#" onClick={e => e.preventDefault()}>Upgrade to AI Pro to unlock more</a>
    </div>
  );

  // ── Model A panels ───────────────────────────────────────
  const APlenty = () => (
    <div className="fue-panel">
      <PanelHead />
      <PanelSub />
      <SummaryCard />
      <div className="fue-meter">
        <span className="fue-dots">
          <span className="fue-dot fue-filled"></span>
          <span className="fue-dot fue-filled"></span>
          <span className="fue-dot fue-filled"></span>
          <span className="fue-dot fue-filled"></span>
          <span className="fue-dot"></span>
        </span>
        <span className="fue-mlabel"><strong style={{ color: "#101828" }}>4 of 5</strong> reviews left <span className="fue-resets">· resets Jun 1</span></span>
      </div>
      <div className="fue-panel-spacer"></div>
      <Disclaimer showStart softUpgrade />
    </div>
  );
  const AOneLeft = () => (
    <div className="fue-panel">
      <PanelHead />
      <PanelSub />
      <SummaryCard />
      <div className="fue-meter fue-amber-meter">
        <span className="fue-dots">
          <span className="fue-dot fue-amber"></span>
          <span className="fue-dot"></span>
          <span className="fue-dot"></span>
          <span className="fue-dot"></span>
          <span className="fue-dot"></span>
        </span>
        <span className="fue-mlabel"><strong>Only 1 of 5</strong> reviews left · resets Jun 1</span>
      </div>
      <div className="fue-panel-spacer"></div>
      <Disclaimer showStart softUpgrade />
    </div>
  );
  const AReviewsUsedUp = () => (
    <div className="fue-panel">
      <PanelHead />
      <PanelSub />
      <div className="fue-blocked">
        <h4 className="fue-bk-title">You've used your 5 reviews this month</h4>
        <p>AI Essential gives each user 5 AI Profile Reviews per month. You'll be able to run reviews again on <strong>Jun 1</strong>.</p>
        <p className="fue-reset-line">Resets in 11 days · other users at your school may still have capacity.</p>
        <div className="fue-cta-stack">
          <a href="#" onClick={e => e.preventDefault()} className="fue-btn fue-btn-primary fue-btn-block">Upgrade to AI Pro to unlock more</a>
          <a href="#" onClick={e => e.preventDefault()} className="fue-btn fue-btn-secondary fue-btn-block">View AI plans</a>
        </div>
      </div>
      <div className="fue-panel-spacer"></div>
      <Disclaimer showStart={false} />
    </div>
  );
  const ASchoolCap = () => (
    <div className="fue-panel">
      <PanelHead />
      <PanelSub />
      <div className="fue-blocked">
        <h4 className="fue-bk-title">Your school has used all 15 reviews this month</h4>
        <p>AI Essential gives each school 15 AI Profile Reviews per month across all users. The shared monthly pool resets on <strong>Jun 1</strong>.</p>
        <p className="fue-reset-line">Resets in 11 days · you may have personal reviews remaining, but the school-wide pool is full.</p>
        <div className="fue-cta-stack">
          <a href="#" onClick={e => e.preventDefault()} className="fue-btn fue-btn-primary fue-btn-block">Upgrade to AI Pro to unlock more</a>
          <a href="#" onClick={e => e.preventDefault()} className="fue-btn fue-btn-secondary fue-btn-block">View AI plans</a>
        </div>
      </div>
      <div className="fue-panel-spacer"></div>
      <Disclaimer showStart={false} />
    </div>
  );

  // ── Model B panels (shared credit pool) ──────────────────
  const BarMeter = ({ amber, label, fillPct, fillColor }) => (
    <div className={"fue-bar-meter" + (amber ? " fue-bar-amber" : "")}>
      <div className="fue-bm-row">
        <span>{label}</span>
        <span className="fue-bm-reset">resets Jun 1</span>
      </div>
      <div className="fue-bm-track">
        <div className="fue-bm-fill" style={{ width: `${fillPct}%`, ...(fillColor ? { background: fillColor } : {}) }}></div>
      </div>
    </div>
  );
  const BlockedCard = ({ title, body, resetLine }) => (
    <div className="fue-blocked">
      <h4 className="fue-bk-title">{title}</h4>
      <p>{body}</p>
      <p className="fue-reset-line">{resetLine}</p>
      <div className="fue-cta-stack">
        <a href="#" onClick={e => e.preventDefault()} className="fue-btn fue-btn-primary fue-btn-block">Upgrade to AI Pro to unlock more</a>
        <a href="#" onClick={e => e.preventDefault()} className="fue-btn fue-btn-secondary fue-btn-block">View AI plans</a>
      </div>
    </div>
  );
  const BPlenty = () => (
    <div className="fue-panel">
      <PanelHead /><PanelSub /><SummaryCard />
      <BarMeter label={<><strong>30 of 50</strong> AI credits left</>} fillPct={40} />
      <TotalAIUsage inPanel headerVal="20 of 50 credits used" rows={[
        { color: F.plum, name: "AI Profile Review", val: "12 credits" },
        { color: F.pink, name: "AI Lead Scoring",  val: "8 credits" },
      ]} />
      <div className="fue-panel-spacer"></div>
      <Disclaimer showStart softUpgrade />
    </div>
  );
  const BApproaching = () => (
    <div className="fue-panel">
      <PanelHead /><PanelSub /><SummaryCard />
      <BarMeter amber label={<><strong>Only 4 of 50</strong> AI credits left</>} fillPct={8} />
      <TotalAIUsage inPanel headerVal="46 of 50 credits used" rows={[
        { color: F.plum, name: "AI Profile Review", val: "36 credits" },
        { color: F.pink, name: "AI Lead Scoring",  val: "10 credits" },
      ]} />
      <div className="fue-panel-spacer"></div>
      <Disclaimer showStart softUpgrade />
    </div>
  );
  const BUserCap = () => (
    <div className="fue-panel">
      <PanelHead /><PanelSub />
      <BlockedCard
        title="You've used your 18 AI credits this month"
        body={<>AI Essential gives each user 18 AI credits per month, within the school's 50-credit pool. You'll be able to use AI again on <strong>Jun 1</strong>.</>}
        resetLine="Resets in 11 days · your school still has credits remaining — other users may still be able to run AI."
      />
      <UsageMini eyebrow="Your 18 credits used · by feature" rows={[
        { color: F.plum, name: "AI Profile Review", val: "12 credits" },
        { color: F.pink, name: "AI Lead Scoring",  val: "6 credits" },
      ]} />
      <div className="fue-panel-spacer"></div>
      <Disclaimer showStart={false} />
    </div>
  );
  const BExhausted = () => (
    <div className="fue-panel">
      <PanelHead /><PanelSub />
      <BlockedCard
        title="Your school has used all 50 AI credits this month"
        body={<>AI Essential gives each school 50 AI credits per month, shared across all AI features. The pool resets on <strong>Jun 1</strong>.</>}
        resetLine="Resets in 11 days · this affects every AI feature for every user at your school."
      />
      <UsageMini eyebrow="50 credits used · by feature" rows={[
        { color: F.plum, name: "AI Profile Review", val: "42 credits" },
        { color: F.pink, name: "AI Lead Scoring",  val: "8 credits" },
      ]} />
      <div className="fue-panel-spacer"></div>
      <Disclaimer showStart={false} />
    </div>
  );

  // ── Model C panels (shared action pool, flat 1-per-run) ──
  const CPlenty = () => (
    <div className="fue-panel">
      <PanelHead /><PanelSub /><SummaryCard />
      <BarMeter label={<><strong>6 of 10</strong> AI actions left</>} fillPct={60} fillColor={F.green} />
      <TotalAIUsage inPanel headerVal="4 of 10 actions used" rows={[
        { color: F.plum, name: "AI Profile Review", val: "2 actions" },
        { color: F.pink, name: "AI Lead Scoring",  val: "2 actions" },
      ]} />
      <div className="fue-panel-spacer"></div>
      <Disclaimer showStart softUpgrade />
    </div>
  );
  const CApproaching = () => (
    <div className="fue-panel">
      <PanelHead /><PanelSub /><SummaryCard />
      <BarMeter amber label={<><strong>Only 1 of 10</strong> AI actions left</>} fillPct={10} />
      <TotalAIUsage inPanel headerVal="9 of 10 actions used" rows={[
        { color: F.plum, name: "AI Profile Review", val: "6 actions" },
        { color: F.pink, name: "AI Lead Scoring",  val: "3 actions" },
      ]} />
      <div className="fue-panel-spacer"></div>
      <Disclaimer showStart softUpgrade />
    </div>
  );
  const CUserCap = () => (
    <div className="fue-panel">
      <PanelHead /><PanelSub />
      <BlockedCard
        title="You've used your 4 AI actions this month"
        body={<>AI Essential gives each user 4 AI actions per month, within the school's 10-action pool. You'll be able to use AI again on <strong>Jun 1</strong>.</>}
        resetLine="Resets in 11 days · your school still has actions remaining — other users may still be able to run AI."
      />
      <UsageMini eyebrow="Your 4 actions used · by feature" rows={[
        { color: F.plum, name: "AI Profile Review", val: "2 actions" },
        { color: F.pink, name: "AI Lead Scoring",  val: "2 actions" },
      ]} />
      <div className="fue-panel-spacer"></div>
      <Disclaimer showStart={false} />
    </div>
  );
  const CExhausted = () => (
    <div className="fue-panel">
      <PanelHead /><PanelSub />
      <BlockedCard
        title="Your school has used all 10 AI actions this month"
        body={<>AI Essential gives each school 10 AI actions per month, shared across all AI features. Every AI run counts as 1. The pool resets on <strong>Jun 1</strong>.</>}
        resetLine="Resets in 11 days · this affects every AI feature for every user at your school."
      />
      <UsageMini eyebrow="10 actions used · by feature" rows={[
        { color: F.plum, name: "AI Profile Review", val: "6 actions" },
        { color: F.pink, name: "AI Lead Scoring",  val: "4 actions" },
      ]} />
      <div className="fue-panel-spacer"></div>
      <Disclaimer showStart={false} />
    </div>
  );

  // NA card — used when a state doesn't apply to a model
  const NACard = ({ children }) => (
    <div className="fue-na-card">{children}</div>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="fue-deck">
        <div className="fue-intro">
          <h2>AI Usage Limits — three candidate models</h2>
          <p>How school users on AI Essential experience usage limits across AI features. Three candidate models are shown side-by-side below — pick the one that gives the better user experience. Beneath that, a state-by-state deep dive lines up the four states a user can land in (Plenty left, Approaching the limit, User-level cap reached, School pool exhausted) across all three models.</p>
        </div>

        {/* ── Side-by-side comparison: Model A vs Model B vs Model C ─── */}
        <div className="fue-cmp-section">
          <h3 className="fue-cmp-heading">Compare &amp; contrast</h3>
          <p className="fue-cmp-sub">Three ways to rate-limit AI on AI Essential. Same school user, same two features — AI Profile Review and AI Lead Scoring. Different counter UX.</p>
          <div className="fue-cmp-grid">

            {/* ─── Model A: per-feature limits ─── */}
            <div className="fue-cmp-col">
              <div className="fue-cmp-banner fue-cmp-banner-a">
                <span className="fue-cmp-tag">MODEL A · PER-FEATURE</span>
                <h4 className="fue-cmp-title">Per-feature limits</h4>
                <p className="fue-cmp-tagline">Each AI feature has its own independent monthly counter.</p>
              </div>
              <div className="fue-cmp-body">
                <div className="fue-cmp-mini-panel">
                  <div className="fue-cmp-mp-head">
                    <span className="fue-cmp-mp-title">AI Profile Review</span>
                    <span className="fue-plan-tag"><span className="fue-spark">✦</span> AI Essential</span>
                  </div>
                  <p className="fue-cmp-mp-sub">Reviewing <strong>Olivia Zhang</strong></p>
                  <div className="fue-cmp-pf-meter">
                    <span className="fue-dots">
                      <span className="fue-dot fue-filled"></span>
                      <span className="fue-dot fue-filled"></span>
                      <span className="fue-dot fue-filled"></span>
                      <span className="fue-dot fue-filled"></span>
                      <span className="fue-dot"></span>
                    </span>
                    <span className="fue-mlabel"><strong>4 of 5</strong> reviews left <span className="fue-resets">· resets Jun 1</span></span>
                  </div>
                </div>

                <div className="fue-cmp-sibling">
                  <div className="fue-cmp-sibling-row">
                    <span className="fue-dots">
                      <span className="fue-dot fue-filled"></span>
                      <span className="fue-dot fue-filled"></span>
                      <span className="fue-dot fue-filled"></span>
                      <span className="fue-dot fue-filled"></span>
                      <span className="fue-dot fue-filled"></span>
                      <span className="fue-dot fue-filled"></span>
                      <span className="fue-dot fue-filled"></span>
                      <span className="fue-dot"></span>
                      <span className="fue-dot"></span>
                      <span className="fue-dot"></span>
                    </span>
                    <span className="fue-cmp-sibling-name">AI Lead Scoring</span>
                    <span className="fue-cmp-sibling-count"><strong style={{ color: "#101828" }}>7 of 10</strong> left</span>
                  </div>
                </div>
              </div>
              <div style={{ height: 18 }}></div>
            </div>

            {/* ─── Model B: shared credit pool (weighted) — LEADING OPTION ─── */}
            <div className="fue-cmp-col fue-cmp-leading">
              <div className="fue-cmp-banner fue-cmp-banner-b">
                <div className="fue-leading-row"><span className="fue-leading-badge">★ Leading option</span></div>
                <span className="fue-cmp-tag">MODEL B · CREDITS</span>
                <h4 className="fue-cmp-title">Shared credits across features</h4>
                <p className="fue-cmp-tagline">One monthly pool of AI credits, drawn from by every feature.</p>
              </div>
              <div className="fue-cmp-body">
                <div className="fue-cmp-mini-panel">
                  <div className="fue-cmp-mp-head">
                    <span className="fue-cmp-mp-title">AI Profile Review</span>
                    <span className="fue-plan-tag"><span className="fue-spark">✦</span> AI Essential</span>
                  </div>
                  <p className="fue-cmp-mp-sub">Reviewing <strong>Olivia Zhang</strong></p>
                  <div className="fue-cmp-pool-meter">
                    <div className="fue-cmp-pool-label">
                      <span><strong>30 of 50</strong> AI credits left</span>
                      <span className="fue-cmp-pool-reset">resets Jun 1</span>
                    </div>
                    <div className="fue-cmp-pool-track">
                      <div className="fue-cmp-pool-fill-a" style={{ width: "24%" }}></div>
                      <div className="fue-cmp-pool-fill-b" style={{ width: "16%" }}></div>
                    </div>
                  </div>
                </div>

                <TotalAIUsage headerVal="20 of 50 credits used" rows={[
                  { color: F.plum, name: "AI Profile Review", val: "12 credits" },
                  { color: F.pink, name: "AI Lead Scoring",  val: "8 credits" },
                ]} />
              </div>
              <div style={{ height: 18 }}></div>
            </div>

            {/* ─── Model C: pooled actions (flat, no credit weighting) ─── */}
            <div className="fue-cmp-col">
              <div className="fue-cmp-banner fue-cmp-banner-c">
                <span className="fue-cmp-tag">MODEL C · ACTIONS</span>
                <h4 className="fue-cmp-title">Shared actions across features</h4>
                <p className="fue-cmp-tagline">One monthly pool of AI actions. Every action = 1, no matter the feature.</p>
              </div>
              <div className="fue-cmp-body">
                <div className="fue-cmp-mini-panel">
                  <div className="fue-cmp-mp-head">
                    <span className="fue-cmp-mp-title">AI Profile Review</span>
                    <span className="fue-plan-tag"><span className="fue-spark">✦</span> AI Essential</span>
                  </div>
                  <p className="fue-cmp-mp-sub">Reviewing <strong>Olivia Zhang</strong></p>
                  <div className="fue-cmp-pool-meter">
                    <div className="fue-cmp-pool-label">
                      <span><strong>6 of 10</strong> AI actions left</span>
                      <span className="fue-cmp-pool-reset">resets Jun 1</span>
                    </div>
                    <div className="fue-cmp-pool-track">
                      <div style={{ width: "40%", height: "100%", background: F.green }}></div>
                    </div>
                  </div>
                </div>

                <TotalAIUsage headerVal="4 of 10 actions used" rows={[
                  { color: F.plum, name: "AI Profile Review", val: "2 actions" },
                  { color: F.pink, name: "AI Lead Scoring",  val: "2 actions" },
                ]} />
                <p style={{ margin: "8px 0 0", fontSize: 11, color: "#667085", fontStyle: "italic", textAlign: "center" }}>Every AI action = 1. No cost map to learn.</p>
              </div>
              <div style={{ height: 18 }}></div>
            </div>

          </div>
        </div>

        {/* ── Why Model B? — editable rationale strip ─── */}
        <div className="fue-rationale-card">
          <div className="rat-left">
            <span className="rat-eyebrow">★ Leading option</span>
            <h4 className="rat-title">Why Model B is our leading candidate</h4>
            <p className="rat-sub">Editable rationale — refine the bullets as the team aligns.</p>
          </div>
          <div className="rat-list">
            {rationale.map((r, i) => (
              <div key={i} className="rat-row">
                <span className="rat-bullet"></span>
                <input className="rat-input" value={r} onChange={e => setRationale(i, e.target.value)} placeholder="New rationale…" />
                <button className="rat-remove" onClick={() => removeRationale(i)} title="Remove">×</button>
              </div>
            ))}
            <button className="rat-add" onClick={addRationale}>+ Add reason</button>
          </div>
        </div>

        {/* ── By-state deep dive: one row per state, three model cells per row ─── */}
        <div className="fue-by-state-section">
          <h3 className="fue-by-state-heading">States — side by side across models</h3>
          <p className="fue-by-state-sub">Same school-user moment, rendered under each model. Hover any panel to magnify it.</p>
          <p className="fue-by-state-hint">Tip: hover over a panel to compare details up close.</p>

          {/* Row 1 — Plenty left */}
          <div className="fue-by-state-row">
            <div className="fue-by-state-row-header">
              <h4>Plenty left</h4>
              <p>Early in the month. Quiet meter. No upgrade pressure.</p>
            </div>
            <div className="fue-by-state-cells">
              <div className="fue-by-state-cell">
                <span className="fue-state-tag fue-tag-a">MODEL A · PER-FEATURE</span>
                <APlenty />
              </div>
              <div className="fue-by-state-cell">
                <span className="fue-state-tag fue-tag-b">MODEL B · CREDITS</span>
                <BPlenty />
              </div>
              <div className="fue-by-state-cell">
                <span className="fue-state-tag fue-tag-c">MODEL C · ACTIONS</span>
                <CPlenty />
              </div>
            </div>
          </div>

          {/* Row 2 — Approaching the limit */}
          <div className="fue-by-state-row">
            <div className="fue-by-state-row-header">
              <h4>Approaching the limit</h4>
              <p>Few resources remaining. Amber warning. First soft mention of AI Pro.</p>
            </div>
            <div className="fue-by-state-cells">
              <div className="fue-by-state-cell">
                <span className="fue-state-tag fue-tag-a">MODEL A · PER-FEATURE</span>
                <AOneLeft />
              </div>
              <div className="fue-by-state-cell">
                <span className="fue-state-tag fue-tag-b">MODEL B · CREDITS</span>
                <BApproaching />
              </div>
              <div className="fue-by-state-cell">
                <span className="fue-state-tag fue-tag-c">MODEL C · ACTIONS</span>
                <CApproaching />
              </div>
            </div>
          </div>

          {/* Row 3 — User-level cap reached (all three models — each has a per-user sub-cap inside the school pool) */}
          <div className="fue-by-state-row">
            <div className="fue-by-state-row-header">
              <h4>User-level cap reached</h4>
              <p>One specific user has hit their personal cap for the month. The school still has capacity, so other users may continue. Each model has its own per-user limit (5 reviews · 18 credits · 4 actions).</p>
            </div>
            <div className="fue-by-state-cells">
              <div className="fue-by-state-cell">
                <span className="fue-state-tag fue-tag-a">MODEL A · PER-FEATURE</span>
                <AReviewsUsedUp />
              </div>
              <div className="fue-by-state-cell">
                <span className="fue-state-tag fue-tag-b">MODEL B · CREDITS</span>
                <BUserCap />
              </div>
              <div className="fue-by-state-cell">
                <span className="fue-state-tag fue-tag-c">MODEL C · ACTIONS</span>
                <CUserCap />
              </div>
            </div>
          </div>

          {/* Row 4 — School pool exhausted */}
          <div className="fue-by-state-row">
            <div className="fue-by-state-row-header">
              <h4>School pool exhausted</h4>
              <p>Shared pool empty. Every user at the school is blocked from the affected feature(s) until the pool resets.</p>
            </div>
            <div className="fue-by-state-cells">
              <div className="fue-by-state-cell">
                <span className="fue-state-tag fue-tag-a">MODEL A · PER-FEATURE</span>
                <ASchoolCap />
              </div>
              <div className="fue-by-state-cell">
                <span className="fue-state-tag fue-tag-b">MODEL B · CREDITS</span>
                <BExhausted />
              </div>
              <div className="fue-by-state-cell">
                <span className="fue-state-tag fue-tag-c">MODEL C · ACTIONS</span>
                <CExhausted />
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

/* ── Prioritization (Product Lifecycle) Page ──────────────
   Mirrors the AI-First Product Lifecycle deck — one continuous loop
   with three phases (Prioritise → Build → Adopt) around Schools at
   the core. Click a phase node to expand a full panel with stages,
   activities, stakeholders, the old-way → AI-first shift, and the
   schools-engagement model.
   Source: ~/Desktop/faria-product-lifecycle2.html */
function PrioritizationPage({ subRoute, setSubRoute }) {
  // open phase derived from URL sub-route. Valid: prioritise | build | adopt. Empty = no phase open (cycle view).
  const VALID_PHASES = ["prioritise", "build", "adopt"];
  const open = VALID_PHASES.includes(subRoute) ? subRoute : null;
  const setOpen = (p) => setSubRoute(p || "");
  const panelRef = useRef(null);
  const cycleRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && open) setOpen(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open && panelRef.current) {
      setTimeout(() => panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } else if (!open && cycleRef.current) {
      cycleRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [open]);

  const DATA = {
    prioritise: {
      cls: "prioritise", accent: "#E2A800", soft: "rgba(247,211,95,0.28)",
      eyebrow: "Phase 01 · Set the direction", title: "Prioritise",
      lede: "Where leadership sets a revenue-driven vision. ExCo, SLT and Sales align on the few bets that will win the year, then sharpen them quarter by quarter from live signal.",
      horizon: "Horizon: annual vision, re-cut quarterly, tracked monthly",
      parallel: null,
      stages: [
        { n: "Vision & strategic themes", wk: "Annual · Quarterly · Monthly", p: "ExCo, SLT and Sales agree the 3–5 themes for the year, refine them each quarter, and check progress monthly. Big areas, not features yet.", tools: [] },
        { n: "Revenue & sales-signal review", wk: "Quarterly", p: "We pressure-test each theme against pipeline, churn risk and expansion. If a bet doesn't move revenue, it doesn't make the cut.", tools: ["Salesforce", "Planhat"] },
        { n: "AI-assisted opportunity scan", wk: "Always-on", p: "AI pulls from Salesforce (pipeline/win-loss), Pendo (product usage) and Planhat (health/expansion) and ranks opportunities — including by region — so the room starts from evidence, not opinion.", tools: ["Salesforce", "Pendo", "Planhat", "Regional growth"] },
        { n: "Quarter re-cut & commit", wk: "Per quarter", p: "Themes move up or down as the market shifts. We commit the next quarter's focus and hand a clear brief to the build pods.", tools: [] },
      ],
      activities: [
        { ic: "📊", nm: "Annual strategy offsite", cad: "Yearly", d: "ExCo + SLT set the year's themes and revenue targets." },
        { ic: "💼", nm: "Quarterly Business Review", cad: "Quarterly", d: "Re-cut themes against revenue signal; commit the next quarter." },
        { ic: "📞", nm: "Monthly product–revenue call", cad: "Monthly", d: "Product + Sales review pipeline and pull-through on committed bets." },
        { ic: "🤖", nm: "AI opportunity digest", cad: "Continuous", d: "Auto-generated ranked opportunities from Salesforce, Pendo, Planhat." },
        { ic: "🏫", nm: "School advisory panel", cad: "Quarterly", d: "Core user-group schools review the theme shortlist and rank what matters to them." },
        { ic: "🔔", nm: "Top-request review", cad: "Monthly", d: "We sort the biggest school feature requests by segment and revenue impact." },
      ],
      build_tools: "Tools to build: an automated prioritisation dashboard that unifies Salesforce + Pendo + Planhat into one ranked, region-aware view, refreshed monthly and quarterly.",
      stakeholders: [
        { n: "ExCo", ic: "♙", t: "lead" }, { n: "SLT", ic: "🧝", t: "lead" }, { n: "VP Sales", ic: "📈", t: "lead" },
        { n: "Product leadership", ic: "🧩", t: "" }, { n: "Finance / RevOps", ic: "💷", t: "" },
        { n: "Core user groups (schools)", ic: "🏫", t: "school" },
      ],
      shift: [
        { old: "Planning off gut feel and the loudest voice", new: "Evidence-ranked, region-aware opportunities before the room meets", ai: "AI SCAN" },
        { old: "Weeks pulling data together for the strategy deck", new: "Live Salesforce + Pendo + Planhat synthesis on demand", ai: "AI SYNTH" },
        { old: "Annual roadmap treated as fixed", new: "Rolling vision, re-cut every quarter against revenue signal", ai: "ROLLING" },
      ],
      school: "At Prioritise, schools tell us where to aim.",
      schoolHow: "How we engage: standing advisory panels across our core user groups (not just lighthouse schools), plus segment-level usage and request data. How it shapes priorities: their goals and pain points feed the opportunity scan, so the themes we commit to are the ones our schools are asking for.",
    },
    build: {
      cls: "build", accent: "#E06A2E", soft: "rgba(247,139,67,0.24)",
      eyebrow: "Phase 02 · Make it real", title: "Build",
      lede: "Our AI-first SDLC. Small pods turn a brief into shippable value, releasing something useful every week. Discovery, design and build run in parallel — not in sequence.",
      horizon: "Horizon: 1–2 week sprints, weekly releases",
      parallel: "These stages overlap and run continuously. While the pod is in a build sprint, the PM, design and research are already on next week's discovery. Each week several of these happen at once.",
      stages: [
        { n: "Discovery & user research", wk: "Wk 1 · ongoing", p: "The PM works with schools, support and design to validate the problem. AI clusters interviews and tickets so patterns surface in hours.", tools: ["School interviews", "Support tickets"] },
        { n: "Spec & design with AI", wk: "Overlapping", p: "AI accelerates specs, edge-case mapping and prototype UI. The pod reviews and decides — judgement stays human, drafting gets automated.", tools: ["AI spec drafts", "Prototype UI"] },
        { n: "Pod build sprint", wk: "1–2 wks", p: "A small cross-functional pod owns the slice end to end. AI in the SDLC handles boilerplate, tests and review assists. Two weeks only by exception.", tools: ["AI SDLC", "CI / tests"] },
        { n: "Weekly release", wk: "Every wk", p: "Ship a usable increment weekly, designed so schools can adopt it with little hand-holding. Smaller surface, tighter feedback, value lands sooner.", tools: ["Release notes", "In-app guides"] },
      ],
      activities: [
        { ic: "🔁", nm: "Pod stand-up", cad: "Daily", d: "Pod syncs on the slice; blockers cleared same day." },
        { ic: "🚢", nm: "Weekly release & demo", cad: "Weekly", d: "Ship the increment and demo it, including to pilot schools." },
        { ic: "🔬", nm: "Rolling discovery", cad: "Continuous", d: "PM + design + research run next week's discovery in parallel." },
        { ic: "🗣", nm: "Pilot-school check-in", cad: "Weekly", d: "Walk pilots through what shipped; capture friction live." },
        { ic: "📱", nm: "Prototype walkthrough", cad: "Per slice", d: "Show pilot schools the prototype before build and fold in their reactions." },
        { ic: "✅", nm: "Pilot acceptance", cad: "At each release", d: "Pilot schools confirm the weekly increment works for them before wider rollout." },
      ],
      build_tools: "Tools to build: an AI-in-the-SDLC toolchain (spec/test/scaffold assists) plus a research-clustering tool that turns interviews and tickets into ranked themes in hours.",
      stakeholders: [
        { n: "Product Manager (pod)", ic: "🧩", t: "lead" }, { n: "Pod engineers", ic: "💻", t: "lead" }, { n: "QA", ic: "✅", t: "" },
        { n: "Support team", ic: "🎧", t: "" }, { n: "Sales team", ic: "📈", t: "" }, { n: "Design & research", ic: "🎨", t: "" },
        { n: "Pilot schools", ic: "🏫", t: "school" },
      ],
      shift: [
        { old: "Large teams, big-bang releases every few months", new: "Small focused pods shipping a usable slice every week", ai: "PODS" },
        { old: "Hand-written specs, tests and boilerplate", new: "AI drafts specs, tests and scaffolding; humans decide", ai: "AI SDLC" },
        { old: "Research synthesised manually over weeks", new: "AI clusters school interviews & support tickets in hours", ai: "AI RESEARCH" },
        { old: "Features need heavy onboarding to land", new: "Built so schools adopt with little hand-holding", ai: "EASY ADOPT" },
      ],
      school: "At Build, schools steer the slice in real time.",
      schoolHow: "How we engage: a named set of pilot schools per pod, with weekly check-ins, shared prototypes and a direct feedback channel to the PM. How it shapes priorities: their reaction to each weekly increment decides what the pod builds next, so the backlog re-orders around real usage rather than assumptions.",
    },
    adopt: {
      cls: "adopt", accent: "#C42b94", soft: "rgba(232,55,172,0.2)",
      eyebrow: "Phase 03 · Land, expand, learn", title: "Adopt",
      lede: "Where shipped value becomes school success and revenue. Product produces automated enablement; marketing focuses only on AAA campaigns; adoption signal feeds straight back into Prioritise.",
      horizon: "Horizon: continuous, closes the loop",
      parallel: null,
      stages: [
        { n: "Automated sales enablement", wk: "At release", p: "Each release auto-generates enablement — what shipped, who it's for, the pitch, the collateral — so Sales and Support are ready day one without waiting on a hand-off.", tools: ["Auto collateral"] },
        { n: "Marketing — AAA campaigns only", wk: "Wk 1", p: "Marketing runs campaigns for the marquee AAA features. Everything else reaches Sales and Support directly through the automated collateral Product produces.", tools: ["AAA campaigns", "AI copy"] },
        { n: "Enablement certifications", wk: "Per AAA feature", p: "For AAA features, we plan and auto-generate certification paths so the enablement team can certify Sales and Support quickly and consistently.", tools: ["Cert paths", "AI assessments"] },
        { n: "Land & expand", wk: "Ongoing", p: "Schools onboard and adopt. We track activation and expansion and step in where adoption stalls.", tools: ["Pendo", "Salesforce"] },
        { n: "Adoption signal → Prioritise", wk: "Continuous", p: "Activation, feature usage and expansion (Pendo) plus pipeline and win-loss (Salesforce) flow back as the freshest input to the next prioritisation cut. The loop closes.", tools: ["Pendo", "Salesforce"] },
      ],
      activities: [
        { ic: "📦", nm: "Release enablement drop", cad: "At each release", d: "Auto-generated pitch + collateral pushed to Sales & Support." },
        { ic: "📣", nm: "AAA campaign launch", cad: "Per AAA feature", d: "Marketing amplifies the marquee features only." },
        { ic: "🎓", nm: "Enablement certification", cad: "Per AAA feature", d: "Sales/Support certified on AAA features via auto-built paths." },
        { ic: "📡", nm: "Adoption signal review", cad: "Continuous", d: "Pendo + Salesforce signal reviewed and fed into Prioritise." },
        { ic: "🏫", nm: "School onboarding & guidance", cad: "At each adoption", d: "In-product guidance and CS outreach walk schools into the new feature." },
        { ic: "⭐", nm: "Reference & expansion calls", cad: "Ongoing", d: "Most-engaged schools join reference stories and expansion conversations." },
      ],
      build_tools: "Tools to build: an enablement generator (collateral + certification paths per AAA feature) and an adoption-signal pipeline that routes Pendo + Salesforce data into the prioritisation dashboard.",
      stakeholders: [
        { n: "VP Sales", ic: "📈", t: "lead" }, { n: "Marketing", ic: "📣", t: "lead" }, { n: "Sales enablement", ic: "🎓", t: "" },
        { n: "Customer success", ic: "🤝", t: "" }, { n: "Support", ic: "🎧", t: "" }, { n: "Implementation", ic: "🔧", t: "" },
        { n: "Product (owns deliverables)", ic: "🧩", t: "" }, { n: "Adopting schools", ic: "🏫", t: "school" },
      ],
      shift: [
        { old: "Sales finds out about features after they ship", new: "Enablement auto-generated at release; Sales & Support ready day one", ai: "AUTO ENABLE" },
        { old: "Marketing writes copy from scratch for everything", new: "Marketing runs AAA campaigns only; rest is automated collateral", ai: "AAA FOCUS" },
        { old: "Certification is manual and inconsistent", new: "Auto-built certification paths per AAA feature", ai: "AUTO CERT" },
        { old: "Adoption data sits in a dashboard nobody reads", new: "Pendo + Salesforce signal feeds the next prioritisation", ai: "CLOSED LOOP" },
      ],
      school: "At Adopt, schools become the signal for the next cycle.",
      schoolHow: "How we engage: onboarding, in-product guidance and customer-success outreach, with the most engaged schools invited into reference and expansion conversations. How it shapes priorities: we read their activation and expansion behaviour in Pendo and Salesforce, and that evidence is the freshest input to the next Prioritise cut.",
    },
  };

  const styles = `
    .plc-stage { background: ${F.plum}; border-radius: 16px; position: relative; overflow: hidden; padding: 28px 24px 60px; color: ${F.paper}; font-family: 'Nunito Sans','Trebuchet MS',system-ui,sans-serif; }
    .plc-stage::before { content: ""; position: absolute; width: 120%; height: 80%; right: -25%; bottom: -25%; background: ${F.gradient}; filter: blur(40px); opacity: 0.16; border-radius: 50%; pointer-events: none; }
    .plc-stage::after { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 20% 15%, rgba(247,211,95,0.06), transparent 40%); pointer-events: none; }
    .plc-wrap { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; }
    .plc-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 14px; flex-wrap: wrap; }
    .plc-brand h1 { font-size: 23px; font-weight: 800; color: ${F.paper}; line-height: 1.1; margin: 0; }
    .plc-brand h1 b { color: ${F.yellow}; font-weight: 800; }
    .plc-legend { font-size: 12px; color: rgba(240,235,235,0.62); text-align: right; max-width: 300px; line-height: 1.45; }
    .plc-legend b { color: ${F.paper}; }

    .plc-cycle { position: relative; width: 100%; max-width: 720px; margin: 14px auto 4px; aspect-ratio: 1/0.96; }
    .plc-connector { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; z-index: 1; }
    .plc-node { position: absolute; width: 29%; aspect-ratio: 1/1; border-radius: 50%; cursor: pointer; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: ${F.plum}; padding: 14px; transition: transform 0.4s cubic-bezier(.2,.8,.2,1), box-shadow 0.4s; box-shadow: 0 16px 40px -12px rgba(0,0,0,0.55); border: 2.5px solid rgba(55,2,60,0.12); font-family: 'Nunito Sans','Trebuchet MS',system-ui,sans-serif; }
    .plc-node:hover { transform: translateY(-6px) scale(1.035); }
    .plc-node .ph { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 800; opacity: 0.62; }
    .plc-node .nm { font-size: clamp(19px, 3vw, 27px); font-weight: 800; line-height: 1.05; margin: 3px 0 5px; }
    .plc-node .sub { font-size: 11px; font-weight: 600; line-height: 1.25; opacity: 0.78; max-width: 90%; }
    .plc-node .tl { margin-top: 8px; font-size: 10px; font-weight: 700; background: rgba(55,2,60,0.14); padding: 3px 9px; border-radius: 20px; }
    .plc-n-prioritise { top: 0; left: 50%; transform: translateX(-50%); background: ${F.yellow}; }
    .plc-n-prioritise:hover { transform: translateX(-50%) translateY(-6px) scale(1.035); }
    .plc-n-build { bottom: 3%; left: 2%; background: ${F.orange}; }
    .plc-n-adopt { bottom: 3%; right: 2%; background: ${F.pink}; color: #fff; border-color: rgba(255,255,255,0.18); }
    .plc-n-adopt .ph, .plc-n-adopt .nm, .plc-n-adopt .sub { color: #fff; }
    .plc-n-adopt .tl { background: rgba(255,255,255,0.2); }

    .plc-core { position: absolute; top: 48%; left: 50%; transform: translate(-50%, -50%); width: 31%; aspect-ratio: 1/1; border-radius: 50%; background: ${F.paper}; z-index: 3; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 6%; box-shadow: 0 0 0 7px rgba(240,235,235,0.07), 0 0 0 15px rgba(240,235,235,0.035), 0 10px 30px rgba(0,0,0,0.4); }
    .plc-core .ico { width: 46%; aspect-ratio: 1/1; line-height: 0; }
    .plc-core .t { font-size: clamp(13px, 2vw, 18px); font-weight: 800; color: ${F.plum}; margin-top: 5px; }
    .plc-core .s { font-size: clamp(8px, 1.1vw, 11px); font-weight: 700; color: ${F.lightPlum}; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }

    .plc-cycle-cap { text-align: center; color: rgba(240,235,235,0.55); font-size: 12px; margin-top: 8px; font-weight: 600; }
    .plc-cycle-cap b { color: ${F.lightPink}; }
    .plc-hint { text-align: center; color: rgba(240,235,235,0.5); font-size: 12.5px; margin-top: 16px; font-weight: 600; }
    .plc-hint b { color: ${F.yellow}; }

    .plc-panel { margin-top: 28px; background: ${F.paper}; border-radius: 22px; overflow: hidden; box-shadow: 0 30px 70px -20px rgba(0,0,0,0.6); }
    .plc-panel-top { padding: 26px 30px 22px; color: #fff; position: relative; }
    .plc-panel-top.prioritise { background: linear-gradient(120deg, #F7D35F, #F7B53f); color: ${F.plum}; }
    .plc-panel-top.build { background: linear-gradient(120deg, #F78B43, #F26C5a); }
    .plc-panel-top.adopt { background: linear-gradient(120deg, ${F.pink}, #C42b94); }
    .plc-panel-top .eyebrow { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 800; opacity: 0.8; }
    .plc-panel-top h2 { font-size: 30px; font-weight: 800; line-height: 1.08; margin: 4px 0 8px; font-family: 'Nunito Sans','Trebuchet MS',system-ui,sans-serif; }
    .plc-lede { font-size: 14.5px; font-weight: 600; line-height: 1.45; max-width: 700px; opacity: 0.95; margin: 0; }
    .plc-horizon { display: inline-block; margin-top: 14px; font-size: 12px; font-weight: 800; background: rgba(255,255,255,0.22); padding: 6px 13px; border-radius: 30px; }
    .plc-panel-top.prioritise .plc-horizon { background: rgba(55,2,60,0.16); }
    .plc-closeb { position: absolute; top: 18px; right: 20px; width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(255,255,255,0.22); color: inherit; font-size: 18px; cursor: pointer; font-weight: 700; line-height: 1; font-family: inherit; }
    .plc-panel-top.prioritise .plc-closeb { background: rgba(55,2,60,0.14); }
    .plc-closeb:hover { background: rgba(255,255,255,0.36); }

    .plc-panel-body { padding: 24px 30px 32px; color: ${F.plum}; }
    .plc-sec-title { font-size: 12px; letter-spacing: 0.13em; text-transform: uppercase; font-weight: 800; color: ${F.lightPlum}; margin: 0 0 13px; display: flex; align-items: center; gap: 9px; }
    .plc-sec-title::after { content: ""; flex: 1; height: 1.5px; background: linear-gradient(90deg, rgba(85,40,89,0.3), transparent); }
    .plc-sec-block { margin-bottom: 30px; }
    .plc-parallel-note { background: rgba(247,139,67,0.12); border: 1.5px dashed var(--plc-accent); border-radius: 12px; padding: 11px 15px; font-size: 12.5px; font-weight: 700; color: ${F.plum}; margin-bottom: 16px; display: flex; gap: 9px; align-items: center; }
    .plc-parallel-note .ic { font-size: 17px; flex: none; }

    .plc-stages { display: grid; gap: 12px; }
    .plc-stage-row { display: grid; grid-template-columns: 30px 1fr; gap: 14px; align-items: start; }
    .plc-stage-row .dot { position: relative; display: flex; justify-content: center; padding-top: 4px; }
    .plc-stage-row .dot i { width: 13px; height: 13px; border-radius: 50%; background: var(--plc-accent); box-shadow: 0 0 0 4px var(--plc-accent-soft); z-index: 2; }
    .plc-stage-row .dot::before { content: ""; position: absolute; top: 10px; bottom: -16px; width: 2px; background: rgba(85,40,89,0.18); }
    .plc-stage-row:last-child .dot::before { display: none; }
    .plc-stage-row .card { background: #fff; border-radius: 13px; padding: 13px 16px; box-shadow: 0 3px 10px rgba(55,2,60,0.05); border-left: 3px solid var(--plc-accent); }
    .plc-stage-row .card h4 { font-size: 15px; font-weight: 800; color: ${F.plum}; display: flex; justify-content: space-between; gap: 10px; align-items: baseline; margin: 0; font-family: 'Nunito Sans','Trebuchet MS',system-ui,sans-serif; }
    .plc-stage-row .card h4 .wk { font-size: 10.5px; font-weight: 800; color: var(--plc-accent); background: var(--plc-accent-soft); padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
    .plc-stage-row .card p { font-size: 13px; color: #4a3a4c; line-height: 1.45; margin: 5px 0 0; font-weight: 500; }
    .plc-stage-row .card .tools { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
    .plc-stage-row .card .tools .t { font-size: 10.5px; font-weight: 800; padding: 3px 9px; border-radius: 7px; background: var(--plc-accent-soft); color: ${F.plum}; }

    .plc-acts { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
    @media (max-width: 680px) { .plc-acts { grid-template-columns: 1fr; } }
    .plc-act { background: #fff; border-radius: 12px; padding: 12px 15px; box-shadow: 0 2px 8px rgba(55,2,60,0.05); border-top: 3px solid var(--plc-accent); display: flex; flex-direction: column; gap: 4px; }
    .plc-act .h { display: flex; align-items: center; gap: 8px; }
    .plc-act .h .ic { width: 28px; height: 28px; border-radius: 8px; background: var(--plc-accent-soft); display: grid; place-items: center; font-size: 15px; flex: none; }
    .plc-act .h .nm { font-size: 13.5px; font-weight: 800; color: ${F.plum}; line-height: 1.15; }
    .plc-act .cad { font-size: 10.5px; font-weight: 800; color: var(--plc-accent); text-transform: uppercase; letter-spacing: 0.06em; }
    .plc-act .d { font-size: 12px; color: #5a4a5c; line-height: 1.4; font-weight: 500; }

    .plc-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; }
    @media (max-width: 760px) { .plc-cols { grid-template-columns: 1fr; } }
    .plc-personas { display: flex; flex-wrap: wrap; gap: 9px; }
    .plc-persona { display: flex; align-items: center; gap: 9px; background: #fff; border-radius: 30px; padding: 6px 14px 6px 7px; box-shadow: 0 2px 7px rgba(55,2,60,0.06); }
    .plc-persona .av { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-size: 15px; flex: none; background: var(--plc-accent-soft); }
    .plc-persona .nm { font-size: 12.5px; font-weight: 700; color: ${F.plum}; }
    .plc-persona.lead { background: ${F.plum}; }
    .plc-persona.lead .nm { color: ${F.paper}; }
    .plc-persona.lead .av { background: ${F.yellow}; }
    .plc-persona.school { background: var(--plc-accent-soft); border: 1.5px dashed var(--plc-accent); }
    .plc-persona.school .av { background: #fff; }
    .plc-persona-key { margin-top: 12px; font-size: 11px; color: #7a6a7c; font-weight: 700; }
    .plc-persona-key i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; vertical-align: middle; margin: 0 4px 0 8px; }

    .plc-shift { display: grid; gap: 11px; }
    .plc-shift .row { background: #fff; border-radius: 12px; padding: 13px 15px; box-shadow: 0 2px 8px rgba(55,2,60,0.05); }
    .plc-shift .row .old { font-size: 12px; color: #9a8a9c; font-weight: 600; text-decoration: line-through; text-decoration-color: rgba(154,138,156,0.5); }
    .plc-shift .row .new { font-size: 13px; color: ${F.plum}; font-weight: 700; margin-top: 3px; display: flex; gap: 8px; align-items: flex-start; }
    .plc-shift .row .new .ai { flex: none; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; background: var(--plc-accent); color: #fff; padding: 3px 7px; border-radius: 6px; margin-top: 1px; }
    .plc-prioritise-acc .plc-shift .row .new .ai { color: ${F.plum}; }

    .plc-school-banner { margin-top: 6px; background: ${F.plum}; color: ${F.paper}; border-radius: 14px; padding: 16px 20px; display: flex; gap: 14px; align-items: flex-start; }
    .plc-school-banner .ic { font-size: 24px; flex: none; }
    .plc-school-banner .tx h5 { font-size: 12px; font-weight: 800; color: ${F.yellow}; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }
    .plc-school-banner .tx p { font-size: 13.5px; font-weight: 600; line-height: 1.45; margin: 4px 0 0; color: rgba(240,235,235,0.92); }
    .plc-school-banner .tx .how { margin-top: 8px; font-size: 12px; font-weight: 700; color: ${F.lightPink}; }

    .plc-footer { text-align: center; margin-top: 40px; color: rgba(240,235,235,0.4); font-size: 11.5px; font-weight: 600; }
  `;

  const d = open ? DATA[open] : null;
  const personaCls = (p) => p.t === "lead" ? "plc-persona lead" : p.t === "school" ? "plc-persona school" : "plc-persona";

  return (
    <>
      <style>{styles}</style>
      <div className="plc-stage">
        <div className="plc-wrap">
          <header className="plc-header">
            <div className="plc-brand">
              <h1>The <b>AI-First</b> Product Lifecycle</h1>
            </div>
            <div className="plc-legend">One loop, three phases, <b>schools at the core</b>. Adoption feeds straight back into what we prioritise next. Tap any phase to go deep.</div>
          </header>

          <div className="plc-cycle" ref={cycleRef}>
            <svg className="plc-connector" viewBox="-6 -6 112 110" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <defs>
                <marker id="plc-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0.5,0.5 L5.5,3 L0.5,5.5 Z" fill="rgba(240,235,235,0.7)" />
                </marker>
              </defs>
              <path d="M 27 21 C 2 38, -2 64, 6 80" fill="none" stroke="rgba(240,235,235,0.55)" strokeWidth="1.1" strokeDasharray="2.6 2.4" markerEnd="url(#plc-arrow)" />
              <path d="M 26 92 C 44 100, 56 100, 74 92" fill="none" stroke="rgba(240,235,235,0.55)" strokeWidth="1.1" strokeDasharray="2.6 2.4" markerEnd="url(#plc-arrow)" />
              <path d="M 94 80 C 102 64, 98 38, 73 21" fill="none" stroke="rgba(240,235,235,0.55)" strokeWidth="1.1" strokeDasharray="2.6 2.4" markerEnd="url(#plc-arrow)" />
            </svg>

            <div className="plc-node plc-n-prioritise" tabIndex={0} role="button" aria-label="Open Prioritise phase" onClick={() => setOpen(open === "prioritise" ? null : "prioritise")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(open === "prioritise" ? null : "prioritise"); } }}>
              <div className="ph">Phase 01</div>
              <div className="nm">Prioritise</div>
              <div className="sub">High-level vision &amp; revenue-driven bets</div>
              <div className="tl">⌅ Annual · Quarterly · Monthly</div>
            </div>
            <div className="plc-node plc-n-build" tabIndex={0} role="button" aria-label="Open Build phase" onClick={() => setOpen(open === "build" ? null : "build")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(open === "build" ? null : "build"); } }}>
              <div className="ph">Phase 02</div>
              <div className="nm">Build</div>
              <div className="sub">AI-first SDLC, pods, weekly releases</div>
              <div className="tl">⌅ 1–2 week sprints</div>
            </div>
            <div className="plc-node plc-n-adopt" tabIndex={0} role="button" aria-label="Open Adopt phase" onClick={() => setOpen(open === "adopt" ? null : "adopt")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(open === "adopt" ? null : "adopt"); } }}>
              <div className="ph">Phase 03</div>
              <div className="nm">Adopt</div>
              <div className="sub">Enablement, marketing, land &amp; expand</div>
              <div className="tl">⌅ Continuous</div>
            </div>

            <div className="plc-core">
              <div className="ico" aria-hidden="true">
                <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" stroke="url(#plc-coreGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <defs>
                    <linearGradient id="plc-coreGrad" x1="0" y1="64" x2="64" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#F5D160" />
                      <stop offset=".5" stopColor="#F0A67E" />
                      <stop offset="1" stopColor="#EC57AD" />
                    </linearGradient>
                  </defs>
                  <path d="M32 8 L56 20 L8 20 Z" />
                  <path d="M12 20 V52" /><path d="M52 20 V52" />
                  <path d="M8 52 H56" />
                  <rect x="27" y="38" width="10" height="14" />
                  <path d="M19 28 h8 v8 h-8 Z" /><path d="M37 28 h8 v8 h-8 Z" />
                  <path d="M32 8 V3" /><path d="M32 3 h7 v4 h-7" />
                </svg>
              </div>
              <div className="t">Schools</div>
              <div className="s">Core users · every phase</div>
            </div>
          </div>

          <div className="plc-cycle-cap">A continuous loop: what schools <b>adopt</b> feeds straight back into what we <b>prioritise</b> next.</div>
          <div className="plc-hint">↑ Tap <b>Prioritise</b>, <b>Build</b> or <b>Adopt</b> for stages, activities &amp; cadence, who's involved, tooling and the old-way → AI-first shift.</div>

          {d && (
            <div ref={panelRef} className={`plc-panel plc-${d.cls}-acc`} style={{ ["--plc-accent"]: d.accent, ["--plc-accent-soft"]: d.soft }}>
              <div className={`plc-panel-top ${d.cls}`}>
                <button className="plc-closeb" aria-label="Close" onClick={() => setOpen(null)}>×</button>
                <div className="eyebrow">{d.eyebrow}</div>
                <h2>{d.title}</h2>
                <p className="plc-lede">{d.lede}</p>
                <div className="plc-horizon">{d.horizon}</div>
              </div>

              <div className="plc-panel-body">
                <div className="plc-sec-block">
                  <div className="plc-sec-title">Stages &amp; timeline</div>
                  {d.parallel && (
                    <div className="plc-parallel-note"><span className="ic">⚡</span>{d.parallel}</div>
                  )}
                  <div className="plc-stages">
                    {d.stages.map((s, i) => (
                      <div key={i} className="plc-stage-row">
                        <div className="dot"><i></i></div>
                        <div className="card">
                          <h4>{s.n}<span className="wk">{s.wk}</span></h4>
                          <p>{s.p}</p>
                          {s.tools && s.tools.length > 0 && (
                            <div className="tools">{s.tools.map((t, ti) => <span key={ti} className="t">{t}</span>)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="plc-sec-block">
                  <div className="plc-sec-title">Activities &amp; cadence</div>
                  <div className="plc-acts">
                    {d.activities.map((a, i) => (
                      <div key={i} className="plc-act">
                        <div className="h"><span className="ic">{a.ic}</span><span className="nm">{a.nm}</span></div>
                        <div className="cad">{a.cad}</div>
                        <div className="d">{a.d}</div>
                      </div>
                    ))}
                  </div>
                  <div className="plc-parallel-note" style={{ marginTop: 14, background: "rgba(55,2,60,0.05)", borderStyle: "solid", borderColor: d.accent }}>
                    <span className="ic">🔧</span>{d.build_tools}
                  </div>
                </div>

                <div className="plc-sec-block plc-cols">
                  <div>
                    <div className="plc-sec-title">Who's involved</div>
                    <div className="plc-personas">
                      {d.stakeholders.map((p, i) => (
                        <span key={i} className={personaCls(p)}>
                          <span className="av">{p.ic}</span>
                          <span className="nm">{p.n}</span>
                        </span>
                      ))}
                    </div>
                    <div className="plc-persona-key">
                      <i style={{ background: F.plum }}></i>Leads
                      <i style={{ background: d.accent }}></i>Schools
                    </div>
                  </div>
                  <div>
                    <div className="plc-sec-title">Old way → AI-first</div>
                    <div className="plc-shift">
                      {d.shift.map((r, i) => (
                        <div key={i} className="row">
                          <div className="old">{r.old}</div>
                          <div className="new"><span className="ai">{r.ai}</span>{r.new}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="plc-school-banner">
                  <div className="ic">🏫</div>
                  <div className="tx">
                    <h5>Schools at this phase</h5>
                    <p>{d.school}</p>
                    <div className="how">{d.schoolHow}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="plc-footer">Product Lifecycle framework · draft for SLT review</div>
        </div>
      </div>
    </>
  );
}

/* ── AI Pods Page (top-level) ─────────────────────────────
   Mirrors https://aipod-faria.netlify.app/ — Faria's transition
   from Scrum to AI Pods methodology. Static content with 6 sub-tabs.
   Source: ~/Downloads/faria-ai-pods_new.html */
function AiPodsPage({ subRoute, setSubRoute }) {
  // tab derived from URL sub-route. Valid: rhythm | pipeline | slicing | pods | compare | watch.
  const VALID_TABS = ["rhythm", "pipeline", "slicing", "pods", "compare", "watch"];
  const tab = VALID_TABS.includes(subRoute) ? subRoute : "rhythm";
  const setTab = (t) => setSubRoute(t);
  const styles = `
    .aip-wrap { font-family: 'Nunito Sans','Trebuchet MS',system-ui,sans-serif; color: ${F.plum}; line-height: 1.2; -webkit-font-smoothing: antialiased; }

    /* Header */
    .aip-header { background: ${F.gradient}; padding: 48px 32px 54px; position: relative; overflow: hidden; border-radius: 16px; margin-bottom: 0; }
    .aip-header .aip-track { position: absolute; height: 120px; width: 160%; left: -30%; bottom: -50px; background: ${F.lightYellow}; opacity: 0.5; border-radius: 80px; transform: rotate(-2deg); }
    .aip-header h1 { font-size: 42px; font-weight: 800; line-height: 1.15; max-width: 780px; position: relative; z-index: 2; margin: 0; color: ${F.plum}; font-family: 'Nunito Sans','Trebuchet MS',system-ui,sans-serif; }
    .aip-header p { font-size: 18px; font-weight: 500; margin: 14px 0 0; max-width: 620px; position: relative; z-index: 2; color: ${F.plum}; }
    .aip-eyebrow { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.7; margin-bottom: 12px; position: relative; z-index: 2; }

    /* Tabs */
    .aip-tabs { display: flex; gap: 8px; padding: 18px 0; position: relative; z-index: 10; flex-wrap: wrap; border-bottom: 1px solid rgba(55,2,60,0.08); margin-bottom: 28px; }
    .aip-tab { font-family: 'Nunito Sans','Trebuchet MS',system-ui,sans-serif; font-size: 15px; font-weight: 700; border: none; background: transparent; color: ${F.plum}; padding: 11px 20px; border-radius: 30px; cursor: pointer; opacity: 0.55; transition: 0.18s; }
    .aip-tab:hover { opacity: 0.85; }
    .aip-tab.active { background: ${F.plum}; color: ${F.paper}; opacity: 1; }

    .aip-panel { padding: 0 0 32px; animation: aipfade 0.3s ease; }
    @keyframes aipfade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .aip-panel h2 { font-size: 28px; font-weight: 800; margin: 0 0 6px; color: ${F.plum}; font-family: 'Nunito Sans','Trebuchet MS',system-ui,sans-serif; }
    .aip-lead { font-size: 16px; font-weight: 500; opacity: 0.75; margin: 0 0 24px; max-width: 680px; color: ${F.plum}; }

    /* Swim grid (weekly rhythm) */
    .aip-swim { background: #fff; border-radius: 16px; border: 1px solid rgba(55,2,60,0.08); overflow: hidden; margin-bottom: 16px; }
    .aip-swim-grid { display: grid; grid-template-columns: 120px repeat(5, 1fr); }
    .aip-swim-grid > div { padding: 12px; border-bottom: 1px solid rgba(55,2,60,0.07); border-right: 1px solid rgba(55,2,60,0.05); }
    .aip-swim-grid > div:nth-child(6n) { border-right: none; }
    .aip-sh { font-size: 13px; font-weight: 800; text-align: center; background: ${F.plum}; color: ${F.paper}; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: none !important; }
    .aip-sh.corner { background: ${F.lightPlum}; }
    .aip-rolelbl { font-weight: 800; font-size: 14px; display: flex; align-items: center; gap: 8px; background: ${F.paper}; }
    .aip-rolelbl .aip-ic { width: 10px; height: 10px; border-radius: 3px; }
    .aip-ic-own { background: ${F.pink}; } .aip-ic-dev { background: ${F.orange}; } .aip-ic-qa { background: ${F.yellow}; }
    .aip-cell { min-height: 84px; }
    .aip-chip { display: block; font-size: 12px; font-weight: 600; padding: 6px 8px; border-radius: 7px; margin-bottom: 5px; line-height: 1.3; }
    .aip-c-research { background: ${F.lightYellow}; }
    .aip-c-learn { background: ${F.plum}; color: ${F.paper}; }
    .aip-c-stake { background: ${F.lightPink}; }
    .aip-c-lock { background: ${F.lightOrange}; }
    .aip-c-work { background: rgba(55,2,60,0.06); }
    .aip-c-muted { font-size: 11px; font-weight: 600; opacity: 0.5; font-style: italic; }
    .aip-flow-note { background: #fff; border-left: 5px solid ${F.pink}; border-radius: 0 12px 12px 0; padding: 16px 20px; font-size: 14px; font-weight: 500; margin-top: 8px; color: ${F.plum}; }
    .aip-flow-note b { font-weight: 800; }

    /* Pipeline timeline */
    .aip-timeline { background: #fff; border-radius: 16px; border: 1px solid rgba(55,2,60,0.08); overflow: hidden; }
    .aip-tl-header { display: grid; grid-template-columns: 140px repeat(5, 1fr) 100px; gap: 1px; background: rgba(55,2,60,0.07); padding: 1px; }
    .aip-tl-header > div { background: ${F.plum}; color: ${F.paper}; font-size: 12px; font-weight: 800; text-align: center; padding: 12px 8px; text-transform: uppercase; letter-spacing: 0.04em; }
    .aip-tl-header .aip-tl-empty { background: ${F.lightPlum}; }
    .aip-tl-track { display: grid; grid-template-columns: 140px repeat(5, 1fr) 100px; gap: 1px; background: rgba(55,2,60,0.07); padding: 1px; margin-bottom: 1px; }
    .aip-tl-track .aip-lbl { background: ${F.paper}; font-size: 13px; font-weight: 800; padding: 16px 12px; display: flex; align-items: center; gap: 8px; }
    .aip-tl-cell { background: #fff; padding: 14px 10px; font-size: 13px; font-weight: 700; line-height: 1.25; text-align: center; color: ${F.plum}; border: none; }
    .aip-tl-cell.feature { background: rgba(232,55,172,0.08); }
    .aip-tl-cell.qa { background: rgba(247,139,67,0.08); }
    .aip-tl-cell.empty { background: #fff; }
    .aip-tl-release-marker { background: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: ${F.pink}; gap: 4px; }
    .aip-tl-release-marker .aip-dot { width: 8px; height: 8px; background: ${F.pink}; border-radius: 50%; }

    /* Slicing */
    .aip-slice-card { background: #fff; border-radius: 16px; border: 1px solid rgba(55,2,60,0.08); padding: 24px; margin-bottom: 16px; }
    .aip-slice-card h4 { font-size: 15px; font-weight: 800; color: ${F.plum}; margin: 0 0 16px; }
    .aip-slice-week-label { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .aip-slice-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .aip-slice { border-radius: 12px; padding: 14px; }
    .aip-slice .aip-slice-tag { font-size: 11px; font-weight: 800; margin-bottom: 6px; }
    .aip-slice .aip-slice-title { font-size: 13px; font-weight: 700; color: ${F.plum}; margin: 0 0 8px; }
    .aip-slice .aip-slice-body { font-size: 12px; font-weight: 500; color: ${F.plum}; opacity: 0.7; line-height: 1.5; margin: 0; }

    /* Pods */
    .aip-pods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .aip-pod { background: #fff; border-radius: 16px; padding: 22px; border: 1px solid rgba(55,2,60,0.08); position: relative; overflow: hidden; }
    .aip-pod::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 6px; }
    .aip-pod.p1::before { background: ${F.pink}; }
    .aip-pod.p2::before { background: ${F.orange}; }
    .aip-pod.p3::before { background: ${F.yellow}; }
    .aip-pod.p4::before { background: ${F.lightPlum}; }
    .aip-pod .aip-pod-owner { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.5; margin-bottom: 4px; }
    .aip-pod h4 { font-size: 19px; font-weight: 800; margin: 0 0 10px; color: ${F.plum}; }
    .aip-pod p { font-size: 13.5px; font-weight: 500; opacity: 0.8; margin: 0; color: ${F.plum}; }
    .aip-pod .aip-pod-role { display: inline-block; font-size: 11px; font-weight: 700; background: ${F.paper}; padding: 4px 10px; border-radius: 20px; margin-top: 12px; color: ${F.plum}; }
    .aip-pod.special { grid-column: span 3; background: ${F.plum}; color: ${F.paper}; }
    .aip-pod.special::before { display: none; }
    .aip-pod.special h4 { color: ${F.paper}; }
    .aip-pod.special p { color: ${F.paper}; opacity: 0.85; }
    .aip-pod.special .aip-pod-owner { color: ${F.paper}; opacity: 0.6; }
    .aip-pod.special .aip-pod-role { background: rgba(240,235,235,0.15); color: ${F.paper}; }

    /* Compare table */
    .aip-cmp { width: 100%; border-collapse: separate; border-spacing: 0; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid rgba(55,2,60,0.08); }
    .aip-cmp th { text-align: left; padding: 16px 20px; font-size: 14px; font-weight: 800; }
    .aip-cmp th.h-scrum { background: ${F.lightPlum}; color: ${F.paper}; }
    .aip-cmp th.h-pod { background: ${F.gradient}; }
    .aip-cmp th.h-dim { background: ${F.plum}; color: ${F.paper}; }
    .aip-cmp td { padding: 14px 20px; font-size: 14px; font-weight: 500; border-top: 1px solid rgba(55,2,60,0.07); vertical-align: top; color: ${F.plum}; }
    .aip-cmp td.dim { font-weight: 800; background: ${F.paper}; }
    .aip-cmp tr:hover td { background: rgba(232,55,172,0.04); }
    .aip-cmp tr:hover td.dim { background: ${F.paper}; }

    /* Risks */
    .aip-risks { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .aip-risk { background: #fff; border-radius: 14px; padding: 20px; border: 1px solid rgba(55,2,60,0.08); border-top: 4px solid ${F.orange}; }
    .aip-risk h4 { font-size: 16px; font-weight: 800; margin: 0 0 6px; color: ${F.plum}; }
    .aip-risk p { font-size: 13.5px; font-weight: 500; opacity: 0.8; margin: 0; color: ${F.plum}; }
    .aip-risk.high { border-top-color: ${F.pink}; }
    .aip-risk .aip-tag { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 9px; border-radius: 20px; background: ${F.lightOrange}; float: right; color: ${F.plum}; }
    .aip-risk.high .aip-tag { background: ${F.lightPink}; }

    @media (max-width: 860px) {
      .aip-swim { overflow-x: auto; }
      .aip-swim-grid { min-width: 760px; }
      .aip-pods { grid-template-columns: 1fr; }
      .aip-pod.special { grid-column: span 1; }
      .aip-risks { grid-template-columns: 1fr; }
      .aip-header h1 { font-size: 32px; }
      .aip-slice-grid { grid-template-columns: 1fr; }
      .aip-tl-header, .aip-tl-track { grid-template-columns: 110px repeat(5, 1fr) 80px; }
    }
  `;

  const tabs = [
    { id: "rhythm",   label: "Weekly rhythm" },
    { id: "pipeline", label: "Staggered pipeline" },
    { id: "slicing",  label: "Ticket slicing" },
    { id: "pods",     label: "The pods" },
    { id: "compare",  label: "Scrum vs Pods" },
    { id: "watch",    label: "Watch-list" },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="aip-wrap">

        {/* HEADER */}
        <header className="aip-header">
          <div className="aip-eyebrow">Faria · Product Development · Ways of Working</div>
          <h1>From Scrum to AI Pods</h1>
          <p>Smaller teams. Single ownership. A weekly rhythm built for speed, with schools and stakeholders in the loop before we build.</p>
          <div className="aip-track"></div>
        </header>

        {/* SUB-TAB STRIP */}
        <div className="aip-tabs">
          {tabs.map(t => (
            <button key={t.id} className={"aip-tab" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* WEEKLY RHYTHM */}
        {tab === "rhythm" && (
          <section className="aip-panel">
            <h2>One week, three roles</h2>
            <p className="aip-lead">While the pod owner shapes next week's build, the developer and QA are heads-down on the current cycle. Each lane shows what that role does, day by day.</p>
            <div className="aip-swim">
              <div className="aip-swim-grid">
                <div className="aip-sh corner">Role</div>
                <div className="aip-sh">Monday</div><div className="aip-sh">Tuesday</div><div className="aip-sh">Wednesday</div><div className="aip-sh">Thursday</div><div className="aip-sh">Friday</div>

                <div className="aip-rolelbl"><span className="aip-ic aip-ic-own"></span>Pod Owner</div>
                <div className="aip-cell">
                  <span className="aip-chip aip-c-learn">📈 Review previous release outcome</span>
                  <span className="aip-chip aip-c-research">🎯 Form hypothesis &amp; outcome plan</span>
                  <span className="aip-chip aip-c-research">📊 Quant: usage &amp; product data</span>
                </div>
                <div className="aip-cell">
                  <span className="aip-chip aip-c-research">☎️ Qual: school calls &amp; interviews</span>
                  <span className="aip-chip aip-c-research">Shape spec &amp; prototype with AI</span>
                </div>
                <div className="aip-cell">
                  <span className="aip-chip aip-c-stake">Share prototype — schools<br /><span style={{ fontSize: 10, opacity: 0.6 }}>🏫 WhatsApp + key contacts</span></span>
                  <span className="aip-chip aip-c-stake">Share prototype — internal<br /><span style={{ fontSize: 10, opacity: 0.6 }}>👥 sales, support, implementation</span></span>
                </div>
                <div className="aip-cell">
                  <span className="aip-chip aip-c-stake">Gather &amp; fold in feedback</span>
                  <span className="aip-chip aip-c-lock">👥 PMT review — align on scope</span>
                </div>
                <div className="aip-cell">
                  <span className="aip-chip aip-c-lock">Lock scope</span>
                  <span className="aip-chip aip-c-lock">👨‍💻 Hand off to dev</span>
                </div>

                <div className="aip-rolelbl"><span className="aip-ic aip-ic-dev"></span>Developers</div>
                <div className="aip-cell"><span className="aip-chip aip-c-work">Build current cycle's item</span></div>
                <div className="aip-cell"><span className="aip-chip aip-c-work">Build</span></div>
                <div className="aip-cell"><span className="aip-chip aip-c-work">Build</span></div>
                <div className="aip-cell"><span className="aip-chip aip-c-work">Build — toward branch / prod</span></div>
                <div className="aip-cell"><span className="aip-chip aip-c-work">Wrap &amp; review next item's handoff</span></div>

                <div className="aip-rolelbl"><span className="aip-ic aip-ic-qa"></span>QA</div>
                <div className="aip-cell"><span className="aip-chip aip-c-work">Test last week's build</span></div>
                <div className="aip-cell"><span className="aip-chip aip-c-work">Test &amp; code review</span></div>
                <div className="aip-cell"><span className="aip-chip aip-c-work">Code review (AI-assisted)</span></div>
                <div className="aip-cell"><span className="aip-chip aip-c-work">Sign off for Monday release</span></div>
                <div className="aip-cell"><span className="aip-chip aip-c-muted">Ready for next handoff</span></div>
              </div>
            </div>
            <div className="aip-flow-note">
              <b>Research drives the spec.</b> Monday–Tuesday blends quantitative signals (product usage, adoption data) with qualitative input (school calls, interviews) so requirements are grounded before anything is built.
            </div>
            <div className="aip-flow-note" style={{ borderLeftColor: F.pink }}>
              <b>Two audiences, one prototype.</b> Wednesday we share the same prototype with schools <i>and</i> internal teams — sales, support, implementation. Light touch: prototype plus high-level requirements, nothing too detailed.
            </div>
            <div className="aip-flow-note" style={{ borderLeftColor: F.yellow }}>
              <b>The handoff rule.</b> Wed feedback and Thursday's PMT review are pre-lock. Anything substantive after Friday's lock goes into the next cycle, not the current build.
            </div>
            <div className="aip-flow-note" style={{ borderLeftColor: F.plum }}>
              <b>Ship a hypothesis, not just a feature.</b> Each cycle starts by reviewing how the previous release performed and stating a clear belief with a success metric. We build it, ship it with tracking on, and the next cycle's hypothesis is grounded in what we actually learned, not what we guessed.
            </div>
          </section>
        )}

        {/* PIPELINE */}
        {tab === "pipeline" && (
          <section className="aip-panel">
            <h2>How the pipeline fills and flows</h2>
            <p className="aip-lead">Week by week: developers build, QA tests last week's work, and features land in production every Monday.</p>

            <div className="aip-timeline" style={{ marginBottom: 28 }}>
              <div className="aip-tl-header">
                <div className="aip-tl-empty" style={{ fontSize: 10 }}>Week</div>
                <div style={{ gridColumn: "span 5", fontSize: 12 }}>Mon – Fri</div>
                <div className="aip-tl-empty" style={{ fontSize: 10, textAlign: "center" }}>Release</div>
              </div>
              <div className="aip-tl-header">
                <div className="aip-tl-empty"></div>
                <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div>
                <div className="aip-tl-empty" style={{ textAlign: "center" }}>Next Mon</div>
              </div>

              {/* Week 2 */}
              <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "2px dashed rgba(55,2,60,0.1)" }}>
                <div className="aip-tl-track">
                  <div className="aip-lbl" style={{ fontSize: 12, fontWeight: 900, color: F.pink }}>Week 2 — Dev</div>
                  <div className="aip-tl-cell feature">Feature B</div>
                  <div className="aip-tl-cell feature">Feature B</div>
                  <div className="aip-tl-cell feature">Feature B</div>
                  <div className="aip-tl-cell feature">Feature B</div>
                  <div className="aip-tl-cell feature">Feature B → branch</div>
                  <div className="aip-tl-cell empty"></div>
                </div>
                <div className="aip-tl-track">
                  <div className="aip-lbl" style={{ fontSize: 12, fontWeight: 900, color: F.orange }}>Week 2 — QA</div>
                  <div className="aip-tl-cell qa">Feature A</div>
                  <div className="aip-tl-cell qa">Feature A</div>
                  <div className="aip-tl-cell qa">Feature A</div>
                  <div className="aip-tl-cell qa">Feature A</div>
                  <div className="aip-tl-cell qa">Feature A → sign-off</div>
                  <div className="aip-tl-release-marker"><span className="aip-dot"></span>A</div>
                </div>
              </div>

              {/* Week 3 */}
              <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "2px dashed rgba(55,2,60,0.1)" }}>
                <div className="aip-tl-track">
                  <div className="aip-lbl" style={{ fontSize: 12, fontWeight: 900, color: F.pink }}>Week 3 — Dev</div>
                  <div className="aip-tl-cell feature">Feature C</div>
                  <div className="aip-tl-cell feature">Feature C</div>
                  <div className="aip-tl-cell feature">Feature C</div>
                  <div className="aip-tl-cell feature">Feature C</div>
                  <div className="aip-tl-cell feature">Feature C → branch</div>
                  <div className="aip-tl-cell empty"></div>
                </div>
                <div className="aip-tl-track">
                  <div className="aip-lbl" style={{ fontSize: 12, fontWeight: 900, color: F.orange }}>Week 3 — QA</div>
                  <div className="aip-tl-cell qa">Feature B</div>
                  <div className="aip-tl-cell qa">Feature B</div>
                  <div className="aip-tl-cell qa">Feature B</div>
                  <div className="aip-tl-cell qa">Feature B</div>
                  <div className="aip-tl-cell qa">Feature B → sign-off</div>
                  <div className="aip-tl-release-marker"><span className="aip-dot"></span>B</div>
                </div>
              </div>

              {/* Week 4 */}
              <div>
                <div className="aip-tl-track">
                  <div className="aip-lbl" style={{ fontSize: 12, fontWeight: 900, color: F.pink }}>Week 4 — Dev</div>
                  <div className="aip-tl-cell feature">Feature D</div>
                  <div className="aip-tl-cell feature">Feature D</div>
                  <div className="aip-tl-cell feature">Feature D</div>
                  <div className="aip-tl-cell feature">Feature D</div>
                  <div className="aip-tl-cell feature">Feature D → branch</div>
                  <div className="aip-tl-cell empty"></div>
                </div>
                <div className="aip-tl-track">
                  <div className="aip-lbl" style={{ fontSize: 12, fontWeight: 900, color: F.orange }}>Week 4 — QA</div>
                  <div className="aip-tl-cell qa">Feature C</div>
                  <div className="aip-tl-cell qa">Feature C</div>
                  <div className="aip-tl-cell qa">Feature C</div>
                  <div className="aip-tl-cell qa">Feature C</div>
                  <div className="aip-tl-cell qa">Feature C → sign-off</div>
                  <div className="aip-tl-release-marker"><span className="aip-dot"></span>C</div>
                </div>
              </div>
            </div>

            <div className="aip-flow-note">
              <b>The rhythm once it's live.</b> Dev always works on this week's feature (Mon–Fri). QA tests last week's. On Monday morning, the week-before-last feature goes to production. Every single Monday: a new release.
            </div>
          </section>
        )}

        {/* TICKET SLICING */}
        {tab === "slicing" && (
          <section className="aip-panel">
            <h2>Slicing large features into shippable chunks</h2>
            <p className="aip-lead">A feature that feels like a 3–4 week effort doesn't live in development for 3–4 weeks. We slice it so we iterate multiple times per week and ship every few days. Schools see progress and feed back immediately.</p>

            <div className="aip-slice-card">
              <h4>Example: "Bulk operations" feature</h4>

              {/* Week 1 */}
              <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "2px dashed rgba(55,2,60,0.1)" }}>
                <div className="aip-slice-week-label" style={{ color: F.pink }}>Week 1</div>
                <div className="aip-slice-grid">
                  <div className="aip-slice" style={{ background: `linear-gradient(135deg, rgba(247,211,95,0.15), rgba(232,55,172,0.08))`, border: `1px solid rgba(232,55,172,0.2)` }}>
                    <div className="aip-slice-tag" style={{ color: F.pink }}>MVP (Mon–Tue)</div>
                    <p className="aip-slice-title">Select &amp; delete</p>
                    <p className="aip-slice-body">Users can select multiple items and delete them. Basic validation. ✓ Ships Wed</p>
                  </div>
                  <div className="aip-slice" style={{ background: `linear-gradient(135deg, rgba(247,139,67,0.15), rgba(232,55,172,0.08))`, border: `1px solid rgba(247,139,67,0.2)` }}>
                    <div className="aip-slice-tag" style={{ color: F.orange }}>v1.0 (Wed–Thu)</div>
                    <p className="aip-slice-title">+ bulk edit</p>
                    <p className="aip-slice-body">Users can select, delete, and edit status across items. Error handling. ✓ Ships Thu</p>
                  </div>
                  <div className="aip-slice" style={{ background: `linear-gradient(135deg, rgba(232,55,172,0.15), rgba(247,139,67,0.08))`, border: `1px solid rgba(232,55,172,0.2)` }}>
                    <div className="aip-slice-tag" style={{ color: F.pink }}>v1.1 (Fri)</div>
                    <p className="aip-slice-title">+ undo &amp; bulk assign</p>
                    <p className="aip-slice-body">Full feature: select, edit, assign, undo. Schools get the whole flow. ✓ Ships Friday</p>
                  </div>
                </div>
              </div>

              {/* Week 2 */}
              <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "2px dashed rgba(55,2,60,0.1)" }}>
                <div className="aip-slice-week-label" style={{ color: F.orange }}>Week 2</div>
                <p style={{ fontSize: 13, fontWeight: 500, color: F.plum, opacity: 0.75, marginBottom: 12 }}>Based on school feedback from Week 1, we iterate:</p>
                <div className="aip-slice-grid">
                  <div className="aip-slice" style={{ background: `linear-gradient(135deg, rgba(247,139,67,0.15), rgba(247,211,95,0.08))`, border: `1px solid rgba(247,139,67,0.2)` }}>
                    <div className="aip-slice-tag" style={{ color: F.orange }}>v1.2 (Mon–Tue)</div>
                    <p className="aip-slice-title">UX refinement</p>
                    <p className="aip-slice-body">Faster selection, better feedback. Schools asked for this. ✓ Ships Tue</p>
                  </div>
                  <div className="aip-slice" style={{ background: `linear-gradient(135deg, rgba(232,55,172,0.15), rgba(247,139,67,0.08))`, border: `1px solid rgba(232,55,172,0.2)` }}>
                    <div className="aip-slice-tag" style={{ color: F.pink }}>v1.3 (Wed–Thu)</div>
                    <p className="aip-slice-title">+ bulk import</p>
                    <p className="aip-slice-body">Schools can now bulk-import &amp; assign in one go. Powerful. ✓ Ships Thu</p>
                  </div>
                  <div className="aip-slice" style={{ background: `linear-gradient(135deg, rgba(232,55,172,0.15), rgba(247,211,95,0.08))`, border: `1px solid rgba(232,55,172,0.2)` }}>
                    <div className="aip-slice-tag" style={{ color: F.pink }}>v1.4 (Fri)</div>
                    <p className="aip-slice-title">Polish &amp; API</p>
                    <p className="aip-slice-body">Performance tuning, API for integrations ready. ✓ Ships Friday</p>
                  </div>
                </div>
              </div>

              <div className="aip-flow-note" style={{ marginTop: 0 }}>
                <b>Speed, not sprawl.</b> Each slice ships, schools use it immediately, we learn, and iterate the next day. No big development cycles. No waiting weeks to ship. Feedback is built into the rhythm.
              </div>
            </div>
          </section>
        )}

        {/* PODS */}
        {tab === "pods" && (
          <section className="aip-panel">
            <h2>Five pods, five owners</h2>
            <p className="aip-lead">Each pod is small, isolated, and works end to end. The owner has total ownership of everything that enters the pod — prioritise, spec, estimate, prototype.</p>
            <div className="aip-pods">
              <div className="aip-pod p1">
                <div className="aip-pod-owner">PM-owned</div>
                <h4>Pod 1</h4>
                <p>Feature &amp; product development, end to end. ~2 developers.</p>
                <span className="aip-pod-role">PM + Dev (×2) + QA</span>
              </div>
              <div className="aip-pod p2">
                <div className="aip-pod-owner">PM-owned</div>
                <h4>Pod 2</h4>
                <p>Feature &amp; product development, end to end. ~2 developers.</p>
                <span className="aip-pod-role">PM + Dev (×2) + QA</span>
              </div>
              <div className="aip-pod p3">
                <div className="aip-pod-owner">PM-owned</div>
                <h4>Pod 3</h4>
                <p>Feature &amp; product development, end to end. ~2 developers.</p>
                <span className="aip-pod-role">PM + Dev (×2) + QA</span>
              </div>
              <div className="aip-pod p4">
                <div className="aip-pod-owner">Designer-owned</div>
                <h4>Design Pod</h4>
                <p>Design-led work, owned end to end by our designer. ~2 developers.</p>
                <span className="aip-pod-role">Designer + Dev (×2) + QA</span>
              </div>
              <div className="aip-pod special">
                <div className="aip-pod-owner">Scrum Master-owned</div>
                <h4>The Shock Absorber</h4>
                <p>Catches bugs, tasks, and incoming distractions so the other pods keep their focus. The buffer that protects everyone else's week. ~2 developers.</p>
                <span className="aip-pod-role">Owner + Dev (×2) + QA</span>
              </div>
            </div>
            <div className="aip-flow-note" style={{ marginTop: 18 }}>
              <b>Rotation guards against burnout.</b> Developers can rotate across pods depending on the work, so no one stays on the same load or the distractions pod indefinitely.
            </div>
          </section>
        )}

        {/* COMPARE */}
        {tab === "compare" && (
          <section className="aip-panel">
            <h2>What actually changes</h2>
            <p className="aip-lead">Scrum optimised for predictability across a big team. AI Pods optimise for speed through small, autonomous units. Here's the trade.</p>
            <table className="aip-cmp">
              <thead>
                <tr>
                  <th className="h-dim">Dimension</th>
                  <th className="h-scrum">Scrum (before)</th>
                  <th className="h-pod">AI Pods (now)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Team size", "Large and bulky", "Small and independent"],
                  ["Ownership", "Shared and unclear", "One owner, total ownership"],
                  ["Cadence", "Two-week sprints", "One-week dev cycles, one-week QA cycles, weekly releases"],
                  ["Planning", "Backlog and ceremonies", "Owner prioritises, specs, estimates, prototypes with AI alongside stakeholders"],
                  ["Carryover", "Tickets roll sprint to sprint", "None — fresh work each week, tickets sliced to fit"],
                  ["QA", "Squeezed at sprint end", "Full clean week, one week behind dev"],
                  ["Schools & stakeholders", "Brought in late, if at all", "In the loop Tuesday–Thursday before build, via prototype"],
                  ["Distractions", "Hit the whole team", "Absorbed by a dedicated pod"],
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="dim">{row[0]}</td>
                    <td>{row[1]}</td>
                    <td>{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* WATCH-LIST */}
        {tab === "watch" && (
          <section className="aip-panel">
            <h2>What to watch for</h2>
            <p className="aip-lead">The model works when a few disciplines hold. These are the failure modes to keep an eye on as we settle in.</p>
            <div className="aip-risks">
              <div className="aip-risk high">
                <span className="aip-tag">High</span>
                <h4>Breakdown debt</h4>
                <p>If owners can't reliably slice tickets to under a week, carryover returns — just weekly instead of fortnightly. The single biggest risk.</p>
              </div>
              <div className="aip-risk">
                <span className="aip-tag">Watch</span>
                <h4>Handoff quality</h4>
                <p>If specs and branches aren't truly QA-ready on Friday, QA's clean week gets eaten by back-and-forth. Hold a firm definition of done at handoff.</p>
              </div>
              <div className="aip-risk">
                <span className="aip-tag">Watch</span>
                <h4>Bug bounce-back</h4>
                <p>When QA finds issues, the fix competes with the dev's new work. Decide explicitly: does it go to the original dev or the distractions pod?</p>
              </div>
              <div className="aip-risk">
                <span className="aip-tag">Watch</span>
                <h4>Cross-pod collision</h4>
                <p>Independent pods touching the same codebase will clash. Need a story for shared dependencies and merge conflicts.</p>
              </div>
              <div className="aip-risk">
                <span className="aip-tag">Watch</span>
                <h4>Late school feedback</h4>
                <p>Schools are now a week ahead of dev. Keep Wed–Thu feedback pre-lock; substantive changes after Friday go to the next cycle.</p>
              </div>
              <div className="aip-risk">
                <span className="aip-tag">Watch</span>
                <h4>Owner overload</h4>
                <p>Prioritise, spec, estimate, prototype and manage is a lot for one person, even with AI. Watch for owner-as-single-point-of-failure.</p>
              </div>
            </div>
          </section>
        )}

      </div>
    </>
  );
}

/* ── URL routing (hash-based) ─────────────────────────────
   Each page + sub-page gets a unique URL via window.location.hash.
   Internal ids stay short ("monz", "handoff", "plan") to minimise
   code churn; the URL exposes friendly slugs ("monetization",
   "prioritization", "framework"). Browser back/forward Just Works
   because we listen for the hashchange event. */
const PAGE_SLUG = {
  product:  "product",
  ai:       "ai",
  monz:     "monetization",
  handoff:  "prioritization",
  pods:     "pods",
};
const SLUG_PAGE = Object.fromEntries(Object.entries(PAGE_SLUG).map(([k, v]) => [v, k]));
// Sub-route id ↔ URL slug map (per page). Pages not listed here use 1:1 id-as-slug.
const SUB_SLUG = {
  monz: { plan: "framework", usage: "usage", competitive: "competitive", market: "market", finance: "finance" },
};
const SLUG_SUB = Object.fromEntries(
  Object.entries(SUB_SLUG).map(([p, m]) => [p, Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]))])
);
function parseHash() {
  const h = (typeof window === "undefined" ? "" : window.location.hash).replace(/^#\/?/, "");
  const [pageSlug = "", subSlug = ""] = h.split("/").map(s => s.trim());
  const page = SLUG_PAGE[pageSlug] || "product";
  let sub = subSlug;
  if (SLUG_SUB[page]) sub = SLUG_SUB[page][subSlug] || "";
  return { page, sub };
}
function buildHash(page, sub) {
  const pageSlug = PAGE_SLUG[page] || "product";
  let subSlug = sub || "";
  if (subSlug && SUB_SLUG[page]) subSlug = SUB_SLUG[page][sub] || sub;
  return subSlug ? `#/${pageSlug}/${subSlug}` : `#/${pageSlug}`;
}
function useHashRoute() {
  const [route, setRouteState] = useState(parseHash);
  useEffect(() => {
    const onHash = () => setRouteState(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = (page, sub = "") => {
    const target = buildHash(page, sub);
    if (window.location.hash !== target) {
      window.history.pushState(null, "", target);
    }
    setRouteState({ page, sub });
  };
  return [route, navigate];
}

/* ── Main App ── */
export default function App() {
  const [route, navigate] = useHashRoute();
  const { page, sub } = route;
  const setPage = (p) => navigate(p);
  const setSub = (s) => navigate(page, s);
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
      <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700;6..12,800&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
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
          {navBtn("handoff", <><span className="lbl-full">Prioritization</span><span className="lbl-short">Prioritize</span></>)}
          {navBtn("pods", <><span className="lbl-full">AI Pods</span><span className="lbl-short">Pods</span></>)}
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 28px" }}>
        {page === "product" && <TrackerPage title="Product Transformation Tracker" subtitle="Cross-product strategic initiatives" storageKey="faria-product-v10" defaults={DEFAULT_PRODUCT} ModalComponent={ProdModal} onCelebrate={setCelName} />}
        {page === "ai" && <TrackerPage title="AI Powered Features" subtitle="AI features, projects, and integrations across Faria products" storageKey="faria-ai-v12" sortField="product" defaults={DEFAULT_AI} ModalComponent={AIModal} onCelebrate={setCelName} addLabel="+ AI Feature"
          extraRowInfo={(init) => (<>{init.product && chip(init.product)}{init.priority && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: pC(init.priority), color: "#fff", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{init.priority}</span>}</>)}
          extraDetailFields={(init, setField) => (<><div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>{init.product && chip(init.product)}{init.type && chip(init.type)}{init.priority && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: pC(init.priority), color: "#fff", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{init.priority}</span>}</div><div style={{ display: "flex", gap: 12, marginBottom: 12 }}><div style={{ flex: 1 }}><div style={lb}>Effort</div><div style={{ fontSize: 13, color: F.plum, fontWeight: 700 }}>{(init.effort||"medium").charAt(0).toUpperCase()+(init.effort||"medium").slice(1)}</div></div><div style={{ flex: 1 }}><div style={lb}>Impact</div><div style={{ fontSize: 13, color: F.plum, fontWeight: 700 }}>{(init.impact||"medium").charAt(0).toUpperCase()+(init.impact||"medium").slice(1)}</div></div></div></>)}
        />}
        {page === "monz" && <AiMonetizationPage subRoute={sub} setSubRoute={setSub} />}
        {page === "handoff" && <PrioritizationPage subRoute={sub} setSubRoute={setSub} />}
        {page === "pods" && <AiPodsPage subRoute={sub} setSubRoute={setSub} />}
      </div>
    </div>
  );
}
