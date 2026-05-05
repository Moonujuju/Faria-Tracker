import { useState, useEffect, useRef } from "react";
import { loadState, saveState, subscribeToChanges } from "./storage.js";
const STATUS_OPTIONS = [
  { value: "not-started", label: "Not Started", color: "#a78baf" },
  { value: "in-progress", label: "In Progress", color: "#d94f8a" },
  { value: "blocked", label: "Blocked", color: "#c0392b" },
  { value: "complete", label: "Complete", color: "#27ae60" },
];
function sC(s) { return STATUS_OPTIONS.find(o => o.value === s)?.color || "#a78baf"; }

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical", color: "#dc2626" },
  { value: "high", label: "High", color: "#f59e0b" },
  { value: "medium", label: "Medium", color: "#3b82f6" },
  { value: "low", label: "Low", color: "#6b7280" },
];
function pC(p) { return PRIORITY_OPTIONS.find(o => o.value === p)?.color || "#6b7280"; }

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
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.4s ease" }} />
    </svg>
  );
}

/* Mini progress bar for overview rows */
function MiniProgress({ pct, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 70 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: color, opacity: 0.8, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? "#27ae60" : "rgba(255,255,255,0.4)", minWidth: 28, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

const inp = { background: "rgba(0,0,0,0.3)", color: "#f5ede8", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "7px 11px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const bt = (bg) => ({ padding: "5px 12px", borderRadius: 6, border: "none", background: bg || "rgba(255,255,255,0.12)", color: "#f5ede8", fontSize: 12, fontWeight: 600, cursor: "pointer" });
const lb = { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 5 };

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "rgba(40,20,50,0.97)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "28px 32px", maxWidth: 540, width: "100%", maxHeight: "85vh", overflowY: "auto", backdropFilter: "blur(12px)" }}>
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
];

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
      <h3 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700, color: "#fff" }}>{isNew ? "New AI Initiative" : "Edit AI Initiative"}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><div style={lb}>Name</div><input value={name} onChange={e => setName(e.target.value)} style={{ ...inp, width: "100%" }} /></div>
        <div><div style={lb}>Description</div><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ ...inp, width: "100%", resize: "vertical" }} /></div>
        <div style={{ display: "flex", gap: 12 }}><div style={{ flex: 1 }}><div style={lb}>Owner</div><input value={owner} onChange={e => setOwner(e.target.value)} style={{ ...inp, width: "100%" }} /></div><div style={{ flex: 1 }}><div style={lb}>Product</div><input value={product} onChange={e => setProduct(e.target.value)} style={{ ...inp, width: "100%" }} /></div></div>
        <div style={{ display: "flex", gap: 12 }}><div style={{ flex: 1 }}><div style={lb}>Type</div><select value={type} onChange={e => setType(e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer" }}>{TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div><div style={{ flex: 1 }}><div style={lb}>Priority</div><select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer" }}>{PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div></div>
        <div style={{ display: "flex", gap: 12 }}><div style={{ flex: 1 }}><div style={lb}>Effort</div><select value={effort} onChange={e => setEffort(e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer" }}>{["low","medium","high"].map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}</select></div><div style={{ flex: 1 }}><div style={lb}>Impact</div><select value={impact} onChange={e => setImpact(e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer" }}>{["low","medium","high"].map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}</select></div></div>
        <div style={{ display: "flex", gap: 12 }}><div style={{ flex: 1 }}><div style={lb}>Deadline</div><input type="date" value={dl} onChange={e => setDl(e.target.value)} style={{ ...inp, width: "100%" }} /></div><div style={{ flex: 1 }}><div style={lb}>Status</div><select value={st} onChange={e => setSt(e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer" }}>{STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div></div>
        <div style={{ display: "flex", gap: 8, marginTop: 6, justifyContent: "space-between" }}>
          <div>{!isNew && !cfm && <button onClick={() => setCfm(true)} style={bt("rgba(192,57,43,0.5)")}>Delete</button>}{!isNew && cfm && <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 12, color: "#e74c3c" }}>Sure?</span><button onClick={() => { onDelete(); onClose(); }} style={bt("#c0392b")}>Yes</button><button onClick={() => setCfm(false)} style={bt()}>No</button></div>}</div>
          <div style={{ display: "flex", gap: 8 }}><button onClick={onClose} style={bt()}>Cancel</button><button onClick={() => { if (name.trim()) onSave({ name: name.trim(), description: desc.trim(), deadline: dl, status: st, owner: owner.trim(), product: product.trim(), type, priority, effort, impact }); }} style={bt("#d94f8a")}>{isNew ? "Create" : "Save"}</button></div>
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
      <h3 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700, color: "#fff" }}>{isNew ? "New Initiative" : "Edit Initiative"}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><div style={lb}>Name</div><input value={name} onChange={e => setName(e.target.value)} style={{ ...inp, width: "100%" }} /></div>
        <div><div style={lb}>Description</div><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ ...inp, width: "100%", resize: "vertical" }} /></div>
        <div><div style={lb}>Owner</div><input value={owner} onChange={e => setOwner(e.target.value)} style={{ ...inp, width: "100%" }} /></div>
        <div style={{ display: "flex", gap: 14 }}><div style={{ flex: 1 }}><div style={lb}>Deadline</div><input type="date" value={dl} onChange={e => setDl(e.target.value)} style={{ ...inp, width: "100%" }} /></div><div style={{ flex: 1 }}><div style={lb}>Status</div><select value={st} onChange={e => setSt(e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer" }}>{STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div></div>
        <div style={{ display: "flex", gap: 8, marginTop: 6, justifyContent: "space-between" }}>
          <div>{!isNew && !cfm && <button onClick={() => setCfm(true)} style={bt("rgba(192,57,43,0.5)")}>Delete</button>}{!isNew && cfm && <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 12, color: "#e74c3c" }}>Sure?</span><button onClick={() => { onDelete(); onClose(); }} style={bt("#c0392b")}>Yes</button><button onClick={() => setCfm(false)} style={bt()}>No</button></div>}</div>
          <div style={{ display: "flex", gap: 8 }}><button onClick={onClose} style={bt()}>Cancel</button><button onClick={() => { if (name.trim()) onSave({ name: name.trim(), description: desc.trim(), deadline: dl, status: st, owner: owner.trim() }); }} style={bt("#d94f8a")}>{isNew ? "Create" : "Save"}</button></div>
        </div>
      </div>
    </Modal>
  );
}

/* ── Analytics Timeline (interactive overview) ── */
const ANALYTICS_PALETTE = ["#d94f8a", "#f39c12", "#27ae60", "#3498db", "#9b59b6", "#1abc9c", "#e67e22", "#e74c3c", "#16a085", "#8e44ad"];

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
      fontSize: 11, padding: "4px 10px", borderRadius: 999, fontWeight: 600,
      border: `1px solid ${active ? (color || "rgba(255,255,255,0.4)") : "rgba(255,255,255,0.12)"}`,
      background: active ? (color || "rgba(255,255,255,0.1)") : "transparent",
      color: active ? "#fff" : (color || "rgba(255,255,255,0.7)"),
      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
      transition: "all 0.15s",
    }}>
      {color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />}
      {label} <span style={{ opacity: 0.7 }}>({count})</span>
    </button>
  );

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 16, marginBottom: 28 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {chip("All", inits.length, null, selGroup === null, () => setSelGroup(null))}
        {groups.map((g) => chip(g, groupCount(g), colorFor(g), selGroup === g, () => setSelGroup(selGroup === g ? null : g)))}
      </div>

      <div style={{ position: "relative", height: 16, marginBottom: 4 }}>
        {months.map((m) => <div key={m.label + m.pct} style={{ position: "absolute", left: `${m.pct}%`, fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600, transform: "translateX(-50%)" }}>{m.label}</div>)}
      </div>

      <div style={{ position: "relative", height: chartH, background: "rgba(0,0,0,0.18)", borderRadius: 6, overflow: "hidden" }}>
        {months.map((m) => <div key={"g" + m.label + m.pct} style={{ position: "absolute", left: `${m.pct}%`, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.04)" }} />)}
        {packed.map((b) => {
          const isDim = dim(b.group);
          return (
            <div key={b.init.id} title={`${b.init.name} — ${b.group} — ${fmt(b.init.deadline)}`} onClick={() => setSelGroup(b.group)}
              style={{
                position: "absolute", top: PAD + b.row * ROW_H, left: `${b.startPct}%`, width: `${b.w}%`, height: ROW_H - 4,
                background: b.color, borderRadius: 4, cursor: "pointer",
                opacity: isDim ? 0.15 : 0.9, transition: "opacity 0.2s",
              }}>
              {b.milestones.map((m, idx) => {
                const mPct = dP(m.target);
                if (mPct < b.startPct - 0.05 || mPct > b.startPct + b.w + 0.05) return null;
                const off = b.w > 0 ? ((mPct - b.startPct) / b.w) * 100 : 50;
                return (
                  <div key={idx} title={`${m.label} — ${fmt(m.target)}${m.done ? " ✓" : ""}`} style={{
                    position: "absolute", left: `${off}%`, top: "50%", transform: "translate(-50%, -50%)",
                    width: 5, height: 5, borderRadius: "50%",
                    background: m.done ? "#27ae60" : "#fff",
                    boxShadow: m.done ? "0 0 0 1px #27ae60" : "0 0 0 1px rgba(0,0,0,0.4)",
                  }} />
                );
              })}
            </div>
          );
        })}
      </div>

      {selGroup && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colorFor(selGroup), marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: colorFor(selGroup) }} />
            {selGroup} — {selectedInits.length} initiative{selectedInits.length !== 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[...selectedInits].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).map((i) => {
              const done = (i.milestones || []).filter((m) => m.done).length;
              const total = (i.milestones || []).length;
              return (
                <div key={i.id} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: sC(i.status), flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.name}</span>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{done}/{total}</span>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, minWidth: 56, textAlign: "right" }}>{fmt(i.deadline)}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", minWidth: 72, textAlign: "right" }}>{STATUS_OPTIONS.find((o) => o.value === i.status)?.label || i.status}</span>
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

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 18, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#fff" }}>{title}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{subtitle}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ring pct={allPct} size={54} stroke={5} color="#d94f8a" />
            <span style={{ position: "absolute", fontSize: 13, fontWeight: 700, color: "#d94f8a" }}>{allPct}%</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}><div>{allDone} of {allTotal}</div><div>milestones done</div></div>
          <button onClick={() => setModal("new")} style={{ ...bt("#d94f8a"), padding: "8px 16px", fontSize: 13 }}>{addLabel}</button>
        </div>
      </div>

      <AnalyticsTimeline inits={inits} groupField={sortField || "owner"} selGroup={selGroup} setSelGroup={setSelGroup} />

      <div style={{ position: "relative" }}>
        <div style={{ position: "relative", height: 28, marginBottom: 8, marginLeft: LABEL_W + 24 }}>
          {months.map(m => <div key={m.label + m.pct} style={{ position: "absolute", left: `${m.pct}%`, fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600, transform: "translateX(-50%)" }}>{m.label}</div>)}
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
                    padding: "14px 18px", marginTop: 16, marginBottom: 8,
                    display: "flex", alignItems: "center", gap: 12,
                    borderRadius: 10,
                    background: hoverGroup === groupName
                      ? "rgba(255,255,255,0.10)"
                      : expanded ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${hoverGroup === groupName ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)"}`,
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{
                    width: 26, height: 26, borderRadius: 7,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: expanded ? "rgba(217,79,138,0.25)" : "rgba(255,255,255,0.08)",
                    border: `1px solid ${expanded ? "rgba(217,79,138,0.5)" : "rgba(255,255,255,0.12)"}`,
                    fontSize: 11, color: expanded ? "#f5b7d3" : "rgba(255,255,255,0.85)",
                    transform: expanded ? "rotate(90deg)" : "none",
                    transition: "all 0.15s",
                    flexShrink: 0,
                  }}>▶</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "1px" }}>{groupName}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.65)", padding: "2px 9px", borderRadius: 999, background: "rgba(255,255,255,0.08)" }}>{items.length}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: gPct === 100 ? "#27ae60" : "rgba(255,255,255,0.6)" }}>{gDone}/{gTotal} · {gPct}%</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: expanded ? "#f5b7d3" : "rgba(255,255,255,0.55)",
                    padding: "4px 10px", borderRadius: 6,
                    background: expanded ? "rgba(217,79,138,0.15)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${expanded ? "rgba(217,79,138,0.35)" : "rgba(255,255,255,0.1)"}`,
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
                    <div style={{ width: LABEL_W, minWidth: LABEL_W, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#f5ede8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", textDecoration: done ? "line-through" : "none" }} title={init.name}>{init.name}</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{init.owner || "No owner"}</span>
                          {extraRowInfo?.(init)}
                        </div>
                        {/* Per-initiative progress bar */}
                        <MiniProgress pct={pctDone} color={color} />
                      </div>
                      {done && <span style={{ fontSize: 16, flexShrink: 0 }}>🏆</span>}
                    </div>
                    <div style={{ flex: 1, position: "relative", padding: "14px 16px 14px 0" }}>
                      {barW > 0 && <div style={{ position: "absolute", left: `${startPct}%`, width: `${barW}%`, top: "50%", transform: "translateY(-50%)", height: 5, borderRadius: 3, background: color, opacity: 0.2 }} />}
                      {barW > 0 && <div style={{ position: "absolute", left: `${startPct}%`, width: `${barW * (pctDone / 100)}%`, top: "50%", transform: "translateY(-50%)", height: 5, borderRadius: 3, background: color, opacity: 0.7, transition: "width 0.3s" }} />}
                      {ms.map((m, mi) => (
                        <div key={mi} style={{ position: "absolute", left: `${dP(m.target)}%`, top: "50%", transform: "translate(-50%,-50%)", zIndex: 2, width: m.done ? 14 : 10, height: m.done ? 14 : 10, borderRadius: "50%", background: m.done ? color : "rgba(0,0,0,0.3)", border: `2.5px solid ${color}`, transition: "all 0.2s" }} title={`${m.label} - ${fmt(m.target)}`} />
                      ))}
                      <div style={{ position: "absolute", left: `${dlPct}%`, top: "50%", transform: "translate(-50%,-50%)", zIndex: 2, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `9px solid ${isPast ? "#c0392b" : "rgba(255,255,255,0.5)"}` }} title={`Deadline: ${fmt(init.deadline)}`} />
                    </div>
                  </div>
                </div>

                {active && (
                  <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "0 0 12px 12px", border: "1px solid rgba(255,255,255,0.12)", borderTop: "none", padding: "20px 22px", marginTop: -5, marginBottom: 5, marginLeft: 23, backdropFilter: "blur(8px)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.5, flex: 1 }}>{init.description}</p>
                      <button onClick={e => { e.stopPropagation(); setModal(init.id); }} style={{ ...bt("rgba(255,255,255,0.1)"), marginLeft: 14, flexShrink: 0 }}>Edit</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 22 }}>
                      <div>
                        <div style={lb}>Milestones</div>
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
                })}
              </div>
            );
          });
        })()}
      </div>

      <div style={{ display: "flex", gap: 20, marginTop: 26, flexWrap: "wrap", alignItems: "center" }}>
        {[{ el: <div style={{ width: 8, height: 8, borderRadius: "50%", border: "2px solid #d94f8a" }} />, t: "Open" },{ el: <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d94f8a" }} />, t: "Done" },{ el: <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "7px solid rgba(255,255,255,0.5)" }} />, t: "Deadline" }].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>{item.el}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{item.t}</span></div>
        ))}
      </div>
      {modal && <ModalComponent init={modal === "new" ? null : editInit} onSave={saveInit} onClose={() => setModal(null)} onDelete={delInit} />}
    </>
  );
}

/* ── Main App ── */
export default function App() {
  const [page, setPage] = useState("product");
  const [celName, setCelName] = useState(null);
  const navBtn = (id, label) => (
    <button onClick={() => setPage(id)} style={{
      padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
      background: page === id ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
      border: `1px solid ${page === id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
      color: page === id ? "#fff" : "rgba(255,255,255,0.5)", transition: "all 0.15s",
    }}>{label}</button>
  );
  return (
    <div style={{
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      background: "linear-gradient(135deg, #2d1038 0%, #4a1d50 20%, #7b2d6b 40%, #a13670 55%, #c4619a 70%, #c487b0 85%, #a06b95 100%)",
      minHeight: "100vh", color: "#f5ede8", padding: "28px 24px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {celName && <Celebration name={celName} onDone={() => setCelName(null)} />}
      <div style={{ maxWidth: 1020, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {navBtn("product", "Product Transformation")}
          {navBtn("ai", "AI Initiatives")}
        </div>
        {page === "product" && <TrackerPage title="Product Transformation Tracker" subtitle="Faria Education Group" storageKey="faria-product-v10" defaults={DEFAULT_PRODUCT} ModalComponent={ProdModal} onCelebrate={setCelName} />}
        {page === "ai" && <TrackerPage title="AI Initiatives" subtitle="Features, projects, and integrations across Faria products" storageKey="faria-ai-v12" sortField="product" defaults={DEFAULT_AI} ModalComponent={AIModal} onCelebrate={setCelName} addLabel="+ AI Initiative"
          extraRowInfo={(init) => (<>{init.product && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>{init.product}</span>}{init.priority && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: pC(init.priority), color: "#fff", fontWeight: 700 }}>{init.priority.charAt(0).toUpperCase() + init.priority.slice(1)}</span>}</>)}
          extraDetailFields={(init, setField) => (<><div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>{init.product && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>{init.product}</span>}{init.type && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>{init.type}</span>}{init.priority && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: pC(init.priority), color: "#fff", fontWeight: 600 }}>{init.priority}</span>}</div><div style={{ display: "flex", gap: 8, marginBottom: 12 }}><div style={{ flex: 1 }}><div style={lb}>Effort</div><div style={{ fontSize: 13, color: "#f5ede8", fontWeight: 600 }}>{(init.effort||"medium").charAt(0).toUpperCase()+(init.effort||"medium").slice(1)}</div></div><div style={{ flex: 1 }}><div style={lb}>Impact</div><div style={{ fontSize: 13, color: "#f5ede8", fontWeight: 600 }}>{(init.impact||"medium").charAt(0).toUpperCase()+(init.impact||"medium").slice(1)}</div></div></div></>)}
        />}
      </div>
    </div>
  );
}
