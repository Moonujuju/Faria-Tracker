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
  ], status: "not-started", valueRationale: "Saves admissions teams 5+ hours/week of drafting communications and review notes — direct staff productivity gain that scales with applicant volume.", wowOutcomes: [
    "50% reduction in time spent drafting applicant communications",
    "Admissions staff handle 30% more applicants per week without adding headcount",
    "Consistent tone across the school's outbound communications, audited by admissions director",
  ] },
  { id: 202, name: "AI Applicant Insights", description: "Surface AI-generated highlights and risk flags on each applicant profile.", deadline: "2026-06-30", owner: "", product: "OpenApply", type: "feature", priority: "medium", effort: "medium", impact: "high", milestones: [
    { label: "Define insight categories and signals", target: "2026-05-15", done: false },{ label: "Design insights panel", target: "2026-05-30", done: false },{ label: "Build extraction pipeline", target: "2026-06-15", done: false },{ label: "Launch to early adopters", target: "2026-06-30", done: false },
  ], status: "not-started", valueRationale: "Unlocks a capability schools cannot do today — risk flags + highlights surfaced before review. Faster, higher-quality decisions on every applicant.", wowOutcomes: [
    "Application review time drops from 12 minutes to under 4 minutes per applicant",
    "85% of risk flags raised by AI are confirmed actionable by the admissions reviewer",
    "Director catches 3-5 high-priority applicants per week that would have otherwise been missed",
  ] },
  { id: 203, name: "AI 2nd Language Translations", description: "On-the-fly translation of applicant content and outbound messages.", deadline: "2026-06-30", owner: "", product: "OpenApply", type: "feature", priority: "medium", effort: "medium", impact: "medium", milestones: [
    { label: "Pick target languages and provider", target: "2026-05-15", done: false },{ label: "Design translation UX", target: "2026-05-30", done: false },{ label: "Build inline translation flows", target: "2026-06-15", done: false },{ label: "Launch to early adopters", target: "2026-06-30", done: false },
  ], status: "not-started", valueRationale: "Broad low-friction utility — non-English-speaking applicants and parents get an immediate translation. Universally useful, low inference cost per use; fits the AI Essential surface.", wowOutcomes: [
    "Schools with 20%+ non-English-speaking applicants report a 10-15% lift in application completion",
    "Admissions team no longer copy-pastes through Google Translate during review",
  ] },
  { id: 204, name: "Agentic Nurture Workflows", description: "Autonomous AI agents that nurture applicants through tailored follow-ups.", deadline: "2026-09-30", owner: "", product: "OpenApply", type: "feature", priority: "high", effort: "high", impact: "high", milestones: [
    { label: "Define agent goals and guardrails", target: "2026-07-15", done: false },{ label: "Design workflow builder", target: "2026-08-15", done: false },{ label: "Build orchestration + first agent", target: "2026-09-15", done: false },{ label: "Pilot with 3 schools", target: "2026-09-30", done: false },
  ], status: "not-started", valueRationale: "Unlocks something schools literally cannot do today — autonomous, tailored applicant follow-ups at scale. Direct measurable impact on yield.", wowOutcomes: [
    "10-15% lift in applicant-to-enrolled conversion at pilot schools",
    "Admissions team reclaims 8+ hours/week previously spent on manual follow-up emails",
    "Drop-off at the document-submission stage reduced by 40%",
  ] },
  { id: 205, name: "AI Admissions Assistant for Parents", description: "Conversational AI assistant that answers parent questions during the application process.", deadline: "2026-09-30", owner: "", product: "OpenApply", type: "feature", priority: "high", effort: "medium", impact: "high", milestones: [
    { label: "Define FAQ knowledge base scope", target: "2026-07-15", done: false },{ label: "Build RAG pipeline with school data", target: "2026-08-15", done: false },{ label: "Widget integration and styling", target: "2026-09-15", done: false },{ label: "Launch to early adopters", target: "2026-09-30", done: false },
  ], status: "not-started", valueRationale: "Saves admissions teams 5+ hours/week of repetitive parent Q&A and unlocks 24/7 self-service that schools cannot staff today.", wowOutcomes: [
    "60% of parent questions resolved without human admissions touch",
    "Parent satisfaction (NPS) up 15 points in pilot schools",
    "Admissions email volume to the team reduced by 40%",
  ] },
  { id: 206, name: "AI Lead Scoring", description: "Predictive scoring of applicant likelihood to enroll, with explanations.", deadline: "2026-09-30", owner: "", product: "OpenApply", type: "feature", priority: "high", effort: "high", impact: "high", milestones: [
    { label: "Research scoring models and bias mitigation", target: "2026-07-15", done: false },{ label: "Design score UX and override workflow", target: "2026-08-15", done: false },{ label: "Train model on anonymized data", target: "2026-09-15", done: false },{ label: "Pilot with 3 schools", target: "2026-09-30", done: false },
  ], status: "not-started", valueRationale: "Produces a measurable outcome (conversion lift, time-to-decision) and unlocks predictive enrolment likelihood schools currently approximate by hand. The headline Pro feature.", wowOutcomes: [
    "15% conversion lift in the top-scored applicant cohort vs the rest",
    "Director time-to-decision down from 8 days to under 3 days on top-scored applicants",
    "80% of yield comes from the top 40% of leads — admissions team prioritises follow-up correctly",
  ] },
  { id: 207, name: "AI Configuration Dashboard", description: "Central place for admins to configure AI features, prompts, and guardrails.", deadline: "2026-09-30", owner: "", product: "OpenApply", type: "feature", priority: "medium", effort: "medium", impact: "medium", milestones: [
    { label: "Inventory AI settings across product", target: "2026-07-15", done: false },{ label: "Design unified config UX", target: "2026-08-15", done: false },{ label: "Build dashboard and persistence", target: "2026-09-15", done: false },{ label: "Launch to admins", target: "2026-09-30", done: false },
  ], status: "not-started", valueRationale: "Operational admin tooling — important for adoption but not a standalone wow that justifies a paid SKU. Belongs free as a platform enabler.", wowOutcomes: [
    "School admins roll out AI features across their team in under 10 minutes — no IT involvement",
    "Support tickets about AI configuration reduced by 50% in pilot schools",
  ] },
  { id: 208, name: "AI Form Creation", description: "Generate application forms from a school description and goals.", deadline: "2026-12-31", owner: "", product: "OpenApply", type: "feature", priority: "medium", effort: "medium", impact: "high", milestones: [
    { label: "Scope form templates and prompts", target: "2026-10-15", done: false },{ label: "Design generation UX", target: "2026-11-15", done: false },{ label: "Build generator + editor", target: "2026-12-15", done: false },{ label: "Launch to early adopters", target: "2026-12-31", done: false },
  ], status: "not-started", valueRationale: "Saves 10+ hours per application cycle of form building and unlocks deep customisation that small schools without IT staff cannot otherwise reach.", wowOutcomes: [
    "Time to build a new application form drops from 4-6 hours to under 30 minutes",
    "60% of schools customise their forms in year 1 vs 20% on the legacy form builder",
    "Net new conversion lift from better-fit forms reported by 70% of pilot schools",
  ] },
  { id: 209, name: "AI Custom Dashboard", description: "AI-assisted custom dashboards summarizing admissions metrics in plain language.", deadline: "2026-12-31", owner: "", product: "OpenApply", type: "feature", priority: "medium", effort: "medium", impact: "medium", milestones: [
    { label: "Pick chart primitives and metric set", target: "2026-10-15", done: false },{ label: "Design dashboard builder", target: "2026-11-15", done: false },{ label: "Build NL-to-dashboard pipeline", target: "2026-12-15", done: false },{ label: "Launch to early adopters", target: "2026-12-31", done: false },
  ], status: "not-started", valueRationale: "Broad analytics utility — universally useful, low inference cost per query. Sits in Essential to differentiate the platform without gating insight from free-tier schools.", wowOutcomes: [
    "Director answers ad-hoc 'how many X' questions in plain English — replaces 30+ minutes of manual spreadsheet work per query",
    "Custom-dashboard usage doubles within 60 days of launch in pilot schools",
  ] },
  { id: 210, name: "AI Document Verification", description: "AI-assisted verification of uploaded documents — transcripts, IDs, recommendation letters — flagging forgeries, inconsistencies and missing items.", deadline: "2026-09-30", owner: "", product: "OpenApply", type: "feature", priority: "high", effort: "high", impact: "high", milestones: [
    { label: "Define document types and verification signals", target: "2026-07-15", done: false },{ label: "Design verification UX + override workflow", target: "2026-08-15", done: false },{ label: "Build OCR + integrity pipeline", target: "2026-09-15", done: false },{ label: "Pilot with 3 schools", target: "2026-09-30", done: false },
  ], status: "not-started", valueRationale: "Unlocks fraud detection schools cannot reliably do by eye today, and saves admissions teams hours of manual cross-referencing per applicant. Direct trust-and-throughput win — clean fit for Pro.", wowOutcomes: [
    "Admissions staff manual document review time drops by 80%",
    "Catches 95%+ of forged/altered documents before the admissions decision",
    "Applicant time-to-complete drops from 12 days to under 5 by surfacing missing or invalid docs immediately",
  ] },
  { id: 211, name: "MCP", description: "Model Context Protocol server — exposes OpenApply data securely to schools' own AI agents (Claude, ChatGPT, Cursor) so they can query and act on admissions data from external tools.", deadline: "2026-12-31", owner: "", product: "OpenApply", type: "integration", priority: "high", effort: "high", impact: "high", milestones: [
    { label: "Scope auth model + access scopes", target: "2026-10-15", done: false },{ label: "Design tool set (read + write actions)", target: "2026-11-15", done: false },{ label: "Build MCP server + auth flow", target: "2026-12-15", done: false },{ label: "Launch to early adopters", target: "2026-12-31", done: false },
  ], status: "not-started", valueRationale: "Unlocks something schools literally cannot do today — securely exposing their OpenApply data to their own AI assistants via the Model Context Protocol. Future-proofs OA against schools that increasingly build their own AI workflows.", wowOutcomes: [
    "Schools query their admissions pipeline from their own AI assistants (Claude, ChatGPT, Cursor) without copy/paste or CSV exports",
    "Director asks 'show me applicants from Singapore with English ≥ 7 who haven't responded in 5 days' in plain English and gets a live answer",
    "Ad-hoc reporting requests to OpenApply support team reduced by 50%",
  ] },
  { id: 212, name: "AI Analyst", description: "Always-on natural-language analyst over admissions data — answers ad-hoc questions, drafts board-ready reports, and surfaces trends the team would otherwise miss.", deadline: "2026-12-31", owner: "", product: "OpenApply", type: "feature", priority: "high", effort: "high", impact: "high", milestones: [
    { label: "Scope analyst use cases and question taxonomy", target: "2026-10-15", done: false },{ label: "Design conversational analyst UX", target: "2026-11-15", done: false },{ label: "Build NL → query → narrative pipeline", target: "2026-12-15", done: false },{ label: "Pilot with admissions directors at 5 schools", target: "2026-12-31", done: false },
  ], status: "not-started", valueRationale: "Saves admissions leadership 5+ hours/week of manual analysis and unlocks always-on intelligence over the pipeline. The decision-support headline of AI Pro — the feature directors will actually open the laptop for.", wowOutcomes: [
    "Director answers 80% of ad-hoc admissions questions in seconds without opening a spreadsheet",
    "Quarterly admissions board reports auto-drafted in under 30 minutes vs 8+ hours of manual data pull",
    "Surfaces 3+ actionable trend insights per month the team would otherwise have missed",
  ] },
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
// Per-model price table feeding all cost math (Usage cost lab + Finance cost/school).
// Prices are USD per 1M tokens — EDITABLE estimates; verify exact Bedrock rates with the engineer.
const MODEL_COSTS_SEED = [
  { id: "m-opus",     name: "Claude Opus 4.x",   tier: "frontier", provider: "Anthropic / Bedrock", inPer1M: 15,   outPer1M: 75,  region: "us · eu · ca", notes: "Top reasoning; licensing premium on Bedrock." },
  { id: "m-sonnet",   name: "Claude Sonnet 4.x", tier: "frontier", provider: "Anthropic / Bedrock", inPer1M: 3,    outPer1M: 15,  region: "us · eu · ca", notes: "Strong default for Pro features." },
  { id: "m-haiku",    name: "Claude Haiku 4.5",  tier: "mid",      provider: "Anthropic / Bedrock", inPer1M: 1,    outPer1M: 5,   region: "us · eu · ca", notes: "Fast & cheap for light tasks." },
  { id: "m-gpt5",     name: "GPT-5",             tier: "frontier", provider: "OpenAI",              inPer1M: 1.25, outPer1M: 10,  region: "us", notes: "Moving to Bedrock as AWS rolls out OpenAI." },
  { id: "m-gpt5mini", name: "GPT-5 mini",        tier: "mid",      provider: "OpenAI",              inPer1M: 0.25, outPer1M: 2,   region: "us", notes: "" },
  { id: "m-qwen",     name: "Qwen (open)",       tier: "open",     provider: "Alibaba / Bedrock",   inPer1M: 0.20, outPer1M: 0.60, region: "in & out of China", notes: "No frontier licensing cost — good free-tier default." },
  { id: "m-llama",    name: "Llama (open)",      tier: "open",     provider: "Meta / Bedrock",      inPer1M: 0.20, outPer1M: 0.60, region: "us · eu", notes: "Open-weight; ≈ last-year frontier." },
];
// One row per AI feature, per product — each prices independently (own tokens + free/pro model).
// [product, feature, inputTokens, outputTokens, runsPerAction, proModelId]; free model defaults to Qwen.
const COST_LAB_SEED = [
  ["OpenApply", "AI Writing Assistant", 1200, 500, 1, "m-sonnet"],
  ["OpenApply", "AI Applicant Insights", 4000, 500, 1, "m-sonnet"],
  ["OpenApply", "AI 2nd Language Translations", 800, 800, 1, "m-haiku"],
  ["OpenApply", "Agentic Nurture Workflows", 6000, 600, 4, "m-opus"],
  ["OpenApply", "AI Admissions Assistant for Parents", 2000, 500, 2, "m-sonnet"],
  ["OpenApply", "AI Lead Scoring", 3000, 200, 1, "m-sonnet"],
  ["OpenApply", "AI Configuration Dashboard", 1500, 400, 1, "m-haiku"],
  ["OpenApply", "AI Form Creation", 1500, 800, 1, "m-sonnet"],
  ["OpenApply", "AI Custom Dashboard", 2500, 600, 1, "m-sonnet"],
  ["OpenApply", "AI Document Verification", 9000, 400, 2, "m-opus"],
  ["OpenApply", "MCP", 2000, 600, 3, "m-sonnet"],
  ["OpenApply", "AI Analyst", 8000, 800, 3, "m-opus"],
  ["ManageBac+", "AI Notification Summaries", 1500, 300, 1, "m-haiku"],
  ["ManageBac+", "Image Generation for Unit Planner Covers", 200, 0, 1, "m-sonnet"],
  ["ManageBac+", "MYP AI Assistant", 2500, 600, 2, "m-sonnet"],
  ["ManageBac+", "Live Turkish Translations for Communications", 600, 600, 1, "m-haiku"],
  ["ManageBac+", "Automated Tagging for Portfolio & Class Streams", 1200, 200, 1, "m-haiku"],
  ["ManageBac+", "Quiz Generation", 2000, 900, 1, "m-sonnet"],
  ["ManageBac+", "Task/Workload Scheduler", 2000, 400, 1, "m-sonnet"],
  ["ManageBac+", "Ask AI Anything (Web)", 3000, 700, 2, "m-sonnet"],
  ["ManageBac+", "eCoursework Assistant", 4000, 800, 2, "m-sonnet"],
  ["ManageBac+", "AI Assistant for Portfolio & Class Stream Analytics", 4000, 700, 2, "m-sonnet"],
  ["ManageBac+", "Unit/Lesson Design Assistant", 3000, 1200, 2, "m-opus"],
  ["ManageBac+", "Ask Anything (Mobile)", 3000, 700, 2, "m-sonnet"],
  ["Atlas", "Curriculum Insights Beta Testing", 7000, 800, 2, "m-opus"],
  ["Atlas", "Curriculum Insights Release", 7000, 800, 2, "m-opus"],
  ["Atlas", "Unit Planning Assistant", 3000, 1200, 2, "m-sonnet"],
  ["Atlas", "Lesson Planning Assistant", 2500, 1000, 2, "m-sonnet"],
];
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
  modelCosts: MODEL_COSTS_SEED,
  costLab: COST_LAB_SEED.map((r, i) => ({ id: "cl-" + i, product: r[0], feature: r[1], inputTokens: r[2], outputTokens: r[3], runsPerAction: r[4], freeModelId: "m-qwen", proModelId: r[5], notes: "" })),
};

/* ── Defaults for the new monetization sub-pages ───────── */
const DEFAULT_COMPETITIVE = {
  competitors: [
    // ── Education ──
    {
      id: "duolingo-max",
      name: "Duolingo (Duolingo Max)",
      aiModel: ["Tiered freemium"],
      pricing: "Max $29.99/month or $168/year (US)",
      pricingDetails: "Max (US): $29.99/month or $168/year\nUK: £19.99/month or £119.99/year · EU: €14.99/month\nFamily plan: ~$240/year\nSuper tier (below Max): ~$84–96/year",
      essentialFeatures: "Super tier features + (since Jan 2026) the Explain My Answer feature moved into the free tier",
      proFeatures: "Max — Video Call & Roleplay AI features (above Super)",
      strengths: "",
      weaknesses: "Individual AI features commoditize fast — moving a flagship feature down to free erodes Max's differentiation",
      lastReviewed: "2026-06-17",
      sourceUrl: "",
      notes: "Premium consumer tier above an existing premium tier (Super). In January 2026 Duolingo moved its flagship Explain My Answer feature down into the free tier (Video Call and Roleplay remain Max-only), eroding Max's differentiation. Cautionary case on how quickly individual AI features commoditize.",
    },
    {
      id: "khanmigo",
      name: "Khan Academy (Khanmigo)",
      aiModel: ["Per-student/institution", "Tiered freemium"],
      pricing: "$10–15/student/year (district)",
      pricingDetails: "District: $10/student/year (base partnership) or $15/student/year (with Khanmigo for Students) — min 250 licenses, US-only, Clever/ClassLink rostering\n$10/student/year for districts using the College Board SAT Suite in 2026–27\nIndividual (parents/learners): $4/month (~$44/year)",
      essentialFeatures: "Khan core platform — free",
      proFeatures: "Khanmigo for students (district + individual)",
      strengths: "Price fell from $60 → $35 → ~$15 over time, well below most peers",
      weaknesses: "",
      lastReviewed: "2026-06-17",
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
      pricing: "Free / Plus $99.96/yr ($12.99/mo) / Enterprise (custom)",
      pricingDetails: "Free: $0 forever — individual teachers (80+ teacher tools, 50+ student tools, unlimited student rooms)\nPlus: $99.96/year (≈$8.33/mo annualized) or $12.99/month — individual teachers; unlimited generations, output history & Studio Mode editing\nEnterprise: custom quote — full staff access, SSO, SIS/LMS integration, admin & tool controls, analytics, white-glove onboarding\nNote: Quizzes & Class Writing Feedback unlimited through 06/30/2026",
      essentialFeatures: "Free tier for individual teachers — 80+ teacher tools, 50+ student tools, unlimited rooms",
      proFeatures: "Plus ($99.96/yr) for individuals; Enterprise (district) adds SSO, SIS/LMS integration, admin controls & analytics",
      strengths: "Strong individual-teacher adoption via a genuinely useful free tier; clean Free → ~$100/yr Plus → district Enterprise ladder",
      weaknesses: "Buyer critique — the \"standalone AI tax\". Districts pay for AI on top of existing SIS/LMS/gradebook, disconnected from their core data.",
      lastReviewed: "2026-06-17",
      sourceUrl: "https://www.magicschool.ai/pricing",
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
      pricing: "Quizlet Plus $7.99/mo or $35.99/yr · Plus Unlimited $9.99/mo",
      pricingDetails: "Quizlet Plus: $7.99/month or $35.99/year (~$3/month annualized)\nQuizlet Plus Unlimited: $9.99/month ($44.99/year)\nFree tier exists but with stricter limits than in prior years\n7-day free trial on annual plans",
      essentialFeatures: "Free tier (stricter limits than prior years)",
      proFeatures: "Q-Chat tutor, Magic Notes auto-generation (Plus-only)",
      strengths: "AI features are explicitly the differentiator pushing more capability behind the paywall",
      weaknesses: "Free tier deliberately tightened to drive upgrades — could create friction with cost-sensitive learners",
      lastReviewed: "2026-06-17",
      sourceUrl: "",
      notes: "Consumer freemium; AI features gated behind the paid tier. AI features (Q-Chat tutor, Magic Notes auto-generation) are Plus-only. Free tier deliberately tightened to drive upgrades.",
    },
    {
      id: "google-for-education-gemini",
      name: "Google for Education (Gemini)",
      aiModel: ["Per-seat", "Per-student/institution", "Tiered freemium"],
      pricing: "~$24–36/user/month (educator add-on)",
      pricingDetails: "Gemini Education: $24/month or $192/year per user\nGemini Education Premium: $36/month or $288/year per user\nStudents over 18: free access without either plan\nSeparate Gemini Education add-on still required for Workspace for Education customers\nEd institutions often qualify for 60–90% discounts off Business/Enterprise list pricing",
      essentialFeatures: "Free Gemini access for students over 18",
      proFeatures: "Gemini Education / Gemini Education Premium add-ons for educators / staff",
      strengths: "",
      weaknesses: "Notable contrast with Google's commercial Workspace, where standalone Gemini was retired and bundled into the base plan — education kept it as a paid add-on. Tension with the \"standalone AI tax\" critique on the education side.",
      lastReviewed: "2026-06-17",
      sourceUrl: "",
      notes: "Per-user add-on for institutions (unlike commercial Workspace, where Gemini was folded into the base price); free student access. Notable contrast: in education Google kept Gemini as a paid add-on while making student access free.",
    },

    {
      id: "chatgpt-edu",
      name: "OpenAI (ChatGPT Edu)",
      aiModel: ["Per-seat"],
      pricing: "Per-seat institutional (custom / contact sales)",
      pricingDetails: "ChatGPT Edu: enterprise-grade ChatGPT at academic pricing — per-seat, annual, custom-quoted for universities & schools (no public list price)\nReference points: ChatGPT Business ~$25–30/user/month; ChatGPT Enterprise ~$60/seat/month (annual, seat minimums)\nChatGPT for Teachers: free tier for verified K-12 educators",
      essentialFeatures: "ChatGPT for Teachers — free for verified K-12 educators",
      proFeatures: "ChatGPT Edu — institution-wide deployment with admin, security & privacy controls",
      strengths: "The per-seat institutional benchmark for general-purpose AI in education; strong brand pull plus SSO/admin governance. Free educator tier seeds adoption.",
      weaknesses: "General-purpose — not grounded in a school's own SIS/admissions data, so the \"standalone AI tax\" critique applies; heavy privacy/governance scrutiny in K-12.",
      lastReviewed: "2026-06-17",
      sourceUrl: "https://openai.com/business/chatgpt-pricing/",
      notes: "General-purpose AI deployed per-seat to institutions at custom academic pricing, with a free educator tier underneath. The reference point for per-seat institutional AI in education and for governance/SSO as the enterprise lever.",
    },
    {
      id: "brisk-teaching",
      name: "Brisk Teaching",
      aiModel: ["Per-seat", "Tiered freemium"],
      pricing: "Free / Pro $99.99/yr / School & District (custom)",
      pricingDetails: "Free (Brisk Educator): $0 forever — 20+ core AI tools (lesson planning, presentations, leveling, basic feedback); 14-day premium trial for new accounts\nPro (Brisk Educator Pro): $99.99/year — unlimited usage + advanced tools (state/ACT/SAT practice, syllabus & UDL plans, standards alignment, podcast generator)\nSchool & District: custom quote — full 30+ tools, Turbo AI, batch feedback, student insights, admin dashboards, PD & priority support",
      essentialFeatures: "Free Educator tier — 20+ core tools; Chrome extension over Google Classroom, Docs & Canvas",
      proFeatures: "Educator Pro ($99.99/yr); School/District adds admin dashboards, student insights, Turbo AI",
      strengths: "Same individual-teacher freemium wedge as MagicSchool at ~$100/yr; lives inside existing tools (Chrome extension over Docs/Classroom/Canvas) rather than a new platform.",
      weaknesses: "Standalone teacher AI — the \"AI tax\" critique; thin moat versus suite-bundled AI.",
      lastReviewed: "2026-06-17",
      sourceUrl: "https://www.briskteaching.com/pricing",
      notes: "Teacher-tool freemium (Chrome extension): Free / $99.99-yr Pro / district custom. Near-identical packaging to MagicSchool — free individual wedge, low-cost pro, district upsell with admin + analytics. Reinforces ~$100/yr as the going rate for individual-teacher AI.",
    },
    {
      id: "element451",
      name: "Element451 (Bolt AI)",
      aiModel: ["Per-student/institution", "Bundled (no extra charge)"],
      pricing: "Institutional annual — Bolt from ~$13k/yr; suites $20–40k+/yr",
      pricingDetails: "AI-first enrollment & engagement CRM (higher ed). Annual institutional license priced by institution size & support tier:\nElement Bolt (AI chatbot + semantic knowledge base + contacts): from ~$13,000/year\nBroader packages (Admissions / Engagement / Marketing / Success): ~$20,000–$40,000+/year\nSpecial pricing for community colleges",
      essentialFeatures: "",
      proFeatures: "Bolt AI agents (24/7 conversational AI, semantic knowledge base) bundled into the platform packages",
      strengths: "AI woven into the platform license rather than a separate AI line — 'Bolt' AI agents are bundled into annual packages. Direct analog for selling AI as suite differentiation in admissions/enrollment.",
      weaknesses: "Higher-ed focused; price points ($13k+/yr) sit above most K-12 independent-school budgets.",
      lastReviewed: "2026-06-17",
      sourceUrl: "https://element451.com/pricing",
      notes: "AI-first admissions/engagement CRM for higher ed — the clearest competitor analog for bundling AI into an admissions platform. Bolt AI agents are packaged into annual institutional licenses (from ~$13k/yr) rather than charged as a separate AI SKU.",
    },
    {
      id: "ravenna",
      name: "Ravenna (VenturEd Solutions)",
      aiModel: ["Bundled (no extra charge)"],
      pricing: "Institutional / quote-based",
      pricingDetails: "Admissions & enrollment-management SaaS for private K-12 schools. Quote-based annual institutional pricing (not public). Serves 5,000+ independent/private schools and ~300k+ applications/year. AI features only beginning to appear in K-12 admissions.",
      essentialFeatures: "",
      proFeatures: "Admissions & enrollment management; emerging AI features bundled into the platform",
      strengths: "Scale in the exact OpenApply segment — private K-12 admissions. Whatever AI it adds will be bundled into the platform subscription, the model schools already accept.",
      weaknesses: "AI maturity still early in K-12 admissions; no separately priced AI line yet — leaving whitespace for a differentiated AI tier.",
      lastReviewed: "2026-06-17",
      sourceUrl: "https://www.ravennasolutions.com/",
      notes: "OpenApply's most direct competitor — private K-12 admissions/enrollment SaaS (5,000+ schools, 300k+ apps/yr). Pricing is quote-based; AI is only starting to appear in K-12 admissions, so there's whitespace for a clearly differentiated, school-data-grounded AI tier.",
    },

    // ── Broader B2B SaaS ──
    {
      id: "microsoft-copilot",
      name: "Microsoft (365 Copilot)",
      aiModel: ["Per-seat", "Tiered freemium"],
      pricing: "$30/user/month enterprise",
      pricingDetails: "Copilot Chat: free with eligible M365 subscriptions (public web data only, no org grounding)\nCopilot Business (SMB, up to 300 users): $18/user/month promo through Dec 31, 2026 → $21 after\nCopilot Enterprise: $30/user/month annual ($360/user/year), on top of E3/E5\nCopilot Studio (build custom agents): from ~$200/month per tenant",
      essentialFeatures: "Copilot Chat (free with M365, public web only, no org grounding)",
      proFeatures: "Copilot Business / Enterprise (org-grounded), Copilot Studio (agents)",
      strengths: "Canonical predictable per-seat model — easy to budget",
      weaknesses: "30–40% of enterprise licenses reported unused within 90 days when deployed to all users at once",
      lastReviewed: "2026-06-17",
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
      pricing: "Pro $10 / Business $19 / Enterprise $39 per user/mo + usage-based AI Credits",
      pricingDetails: "As of Jun 1, 2026, moved from premium-request billing to usage-based GitHub AI Credits (token-based; AI Credits replaced Premium Request Units):\nFree: limited\nPro: $10/user/month\nBusiness: $19/user/month (includes $19 of monthly AI Credits)\nEnterprise: $39/user/month\nInline code completions & next-edit suggestions: free on all paid plans (no credits)\nChat, agent mode, code review & Copilot CLI draw from the AI Credit pool\n2× promotional AI Credits for Business/Enterprise through Aug 2026",
      essentialFeatures: "Free tier; inline completions free on all paid plans",
      proFeatures: "Pro / Business / Enterprise + metered AI Credits for chat, agents & code review",
      strengths: "Hybrid — predictable seat fee + usage-based AI Credits; completions stay free so only heavy chat/agent usage meters",
      weaknesses: "Switched billing models (premium requests → token-based AI Credits) mid-2026; token metering makes spend harder to predict for heavy agent users.",
      lastReviewed: "2026-06-17",
      sourceUrl: "https://github.com/features/copilot/plans",
      notes: "Per-seat plus usage-based AI Credits (hybrid), with a free tier. On Jun 1, 2026 GitHub replaced Premium Request Units with token-based AI Credits — inline completions stay free; chat/agents/code-review/CLI meter against credits. Illustrates the move from request-counting to token-based metering layered onto a seat price.",
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
      id: "granola",
      name: "Granola",
      aiModel: ["Per-seat", "Tiered freemium"],
      pricing: "Free / $14/user/mo (Business) / $35/user/mo (Enterprise)",
      pricingDetails: "Basic: $0 — unlimited meeting notes, AI chat, 30-day meeting history, limited MCP access, Slack integration\nBusiness: $14/user/month — everything in Basic + unlimited history, advanced AI models, API access, full MCP access, full integrations (Zapier, Affinity, HubSpot, Notion, Slack, etc.)\nEnterprise: $35/user/month — everything in Business + SSO (for teams 50+ users), org-wide auto-deletion, admin controls",
      essentialFeatures: "Free Basic: unlimited meeting notes, AI chat, 30-day history, limited MCP, one integration (Slack)",
      proFeatures: "Business ($14): unlimited history, advanced AI models, API access, full MCP, full integrations. Enterprise ($35): SSO (50+ users), org-wide auto-deletion, admin controls",
      strengths: "Textbook three-tier per-seat AI SaaS ladder: the free tier is genuinely useful (unlimited notes + AI chat), while the paid levers are model quality (advanced models), extensibility (API + full MCP), and governance (SSO, auto-deletion, admin) reserved for Enterprise.",
      weaknesses: "Standalone per-seat AI-notes tool — same \"AI tax\" exposure as MagicSchool for buyers who already pay for meeting/CRM tooling; little moat if suites bundle equivalent note-taking.",
      lastReviewed: "2026-06-17",
      sourceUrl: "",
      notes: "AI meeting-notes app. Three-tier per-seat freemium — Basic $0, Business $14/user/mo, Enterprise $35/user/mo. Gating ladder worth copying: advanced AI models, API access and full MCP unlock at Business; SSO (50+ users), org-wide auto-deletion and admin controls are the Enterprise levers. Governance-as-enterprise-upsell and MCP-as-a-paid-feature are the notable moves.",
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
  summary: {
    headline: "Bundle AI into per-account/year SKUs. Credits operate underneath — not as the headline price. AI Essential stays genuinely useful; the multi-product bundle discount is the commercial weapon.",
    patterns: [
      "Education buyers reject a standalone \"AI tax\" — MagicSchool's documented critique. PowerSchool, Coursera and Instructure bundle AI into the existing suite subscription.",
      "Pricing falls fast in education — Khanmigo went from $60 → $35 → $15 per student/year in under two years. Plan to defend the number down.",
      "Outcome-based pricing creates budget swings that school finance teams reject — Intercom Fin's explicit critique is \"cost rises as the AI improves.\"",
      "Bundling-without-a-separate-line is the late-cycle move — Adobe, Zoom, Notion and Google Workspace all retired standalone AI add-ons in 2024–25.",
    ],
    implications: [
      "Keep per-account / year as the SKU unit. Per-student is under heavy downward pressure; per-seat is for productivity tools.",
      "Credits live under the SKU, not as the headline. Mirror HubSpot — customer-facing price is per-SKU; credits govern inference spend.",
      "AI Essential must be genuinely useful, not a trial. Every successful benchmark runs a real free tier alongside paid.",
      "Lean into the multi-product bundle discount — that's how integrated-suite vendors (PowerSchool, Instructure) actually sell against MagicSchool-style point solutions.",
    ],
    watchout: "The next-cycle move the data suggests is dropping the AI Pro SKU entirely and rolling AI into the base product subscription (Adobe / Zoom / Notion / Google Workspace pattern). Faria isn't there yet — schools are still evaluating AI as a differentiated feature — but the 18–36 month trajectory points that way as features commoditize.",
  },
};
const COMPETITOR_TEMPLATE = () => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  name: "",
  sector: "",
  audience: "", // B2B | B2C | Both
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
  // Code-seeded competitors (stable string ids) are reference research data maintained in
  // code — refresh them from DEFAULT by id so corrected pricing/notes reach existing saved
  // blobs. User-added competitors (Date.now() numeric ids, not in DEFAULT) are preserved.
  const defById = new Map(DEFAULT_COMPETITIVE.competitors.map(d => [d.id, d]));
  const refreshed = savedCompetitors.map(c => defById.get(c.id) || c);
  const savedIds = new Set(savedCompetitors.map(c => c.id));
  const newDefaults = DEFAULT_COMPETITIVE.competitors.filter(d => !savedIds.has(d.id));
  return {
    ...DEFAULT_COMPETITIVE,
    ...saved,
    competitors: [...refreshed, ...newDefaults],
    // Deep-merge the executive summary so old blobs without it inherit the seed,
    // and saved field-level edits win.
    summary: {
      ...DEFAULT_COMPETITIVE.summary,
      ...(saved.summary || {}),
      patterns: (saved.summary && Array.isArray(saved.summary.patterns)) ? saved.summary.patterns : DEFAULT_COMPETITIVE.summary.patterns,
      implications: (saved.summary && Array.isArray(saved.summary.implications)) ? saved.summary.implications : DEFAULT_COMPETITIVE.summary.implications,
    },
  };
}

const DEFAULT_MARKET = {
  validations: [
    {
      id: "mkt-oa-aisurvey-2026-06",
      product: "OpenApply",
      schoolName: "AI in Admissions Survey — 75 responses (global)",
      region: "Global",
      stage: "interested",
      contactedDate: "2026-06-17",
      pilotedDate: "",
      feedback: "Larger, multi-region read (75 responses across Europe, MEA, APAC, UK, the Americas) and the earlier UK pattern holds. Demand maps directly onto pain: chasing missing documents is the #1 time-sink (31 ranked it first) and document checking is the #1 wanted feature (59/75); responding to family inquiries (#2 pain) lines up with draft replies (#2 want, 54/75). Sentiment is ~95% positive (37 \"open but cautious\", 34 \"excited\"). Sellable — only 2 of 74 said \"unlikely to be approved\" — but \"worth it with proof of time saved\" (48) dominates, so ROI evidence remains the lever. Trust hesitations cluster on accuracy (22 of 48), then data privacy / security and GDPR, with a recurring ask to keep a human in the loop.",
      willingnessToPay: "Sellable: 88% (65/74) say \"easy, clear value\" or \"worth it with proof of time saved\"; only 2 said \"unlikely to be approved\". \"Worth it with proof of time saved\" (48) dominates — proof of time saved is the unlock.",
      contactName: "",
      contactRole: "Survey respondents — admissions teams (global)",
      contactEmail: "",
      wowOutcomesValidated: "Top requested features validate OA AI Pro priorities: Document checking missing/mismatched/expired (59/75) → AI Document Verification; Draft replies to family inquiries (54) → AI Admissions Assistant; Applicant profile summarizer (45) → AI Applicant Insights; Auto-tagging & sorting (42) → screening/sorting; AI search across applicant data (32) → AI Search / Analyst; Lead scoring (26) → AI Lead Scoring.",
      notes: "Source: OpenApply \"AI in Admissions\" survey, 15–17 Jun 2026, 75 responses across Europe excl. UK&I (26), Middle East & Africa (18), Asia-Pacific (16), UK & Ireland (11), Latin America (2), North America (1). 1 response flagged low-quality. Broadens the earlier UK user-group read to a global cohort — same pattern holds.",
      survey: {
        event: "AI in Admissions Survey",
        date: "2026-06-17",
        location: "Global · 6 regions",
        participants: 75,
        invited: null,
        unit: "responses",
        keyFindings: [
          { k: "Top time-sink", v: "Chasing missing documents (31)" },
          { k: "Top ask", v: "Document checking (59/75)" },
          { k: "Sentiment", v: "~95% positive" },
          { k: "Sell", v: "Only 2 \"unlikely to be approved\"" },
          { k: "Top barrier", v: "Accuracy · data privacy" },
        ],
        charts: [
          {
            q: "Which region is your school in?",
            sub: "74 responses",
            type: "bars",
            data: [
              { label: "Europe (excl. UK & Ireland)", value: 26 },
              { label: "Middle East & Africa", value: 18 },
              { label: "Asia-Pacific", value: 16 },
              { label: "UK & Ireland", value: 11 },
              { label: "Latin America", value: 2 },
              { label: "North America", value: 1 },
            ],
          },
          {
            q: "Where do you lose the most time in your admissions cycle?",
            sub: "Ranked #1 most time-consuming · 73 responses",
            type: "bars",
            data: [
              { label: "Chasing missing documents", value: 31 },
              { label: "Responding to family inquiries", value: 14 },
              { label: "Scheduling (interviews, tours, tests)", value: 9 },
              { label: "Reviewing & screening applications", value: 8 },
              { label: "Following up with unconverted leads", value: 4 },
              { label: "Verifying document accuracy", value: 4 },
              { label: "Generating reports", value: 2 },
              { label: "Manual data entry", value: 1 },
              { label: "Coordinating internally across staff", value: 0 },
            ],
          },
          {
            q: "Which AI feature would help your team most?",
            sub: "Multi-select · 75 responses",
            type: "bars",
            data: [
              { label: "Document checking (missing, mismatched, expired)", value: 59 },
              { label: "Draft replies to family inquiries", value: 54 },
              { label: "Applicant profile summarizer", value: 45 },
              { label: "Auto-tagging & sorting of applications", value: 42 },
              { label: "AI search across applicant data", value: 32 },
              { label: "Lead scoring / likelihood to enroll", value: 26 },
              { label: "Translation of family communication", value: 20 },
              { label: "Interview note summarization", value: 17 },
              { label: "Natural-language reporting", value: 15 },
            ],
          },
          {
            q: "How do you feel about AI helping with admissions tasks today?",
            sub: "75 responses",
            type: "bars",
            data: [
              { label: "Open but cautious", value: 37 },
              { label: "Excited, want it now", value: 34 },
              { label: "Neutral", value: 2 },
              { label: "Uncomfortable", value: 2 },
              { label: "Skeptical", value: 0 },
            ],
          },
          {
            q: "Would an AI add-on be an easy or hard sell at your school?",
            sub: "74 responses",
            type: "bars",
            data: [
              { label: "Worth it with proof of time saved", value: 48 },
              { label: "Easy, clear value", value: 17 },
              { label: "Hard sell internally", value: 7 },
              { label: "Unlikely to be approved", value: 2 },
            ],
          },
          {
            q: "One AI capability you want most in the next 12 months",
            sub: "Open text · 56 responses · grouped into themes",
            type: "themes",
            data: [
              { label: "Document checking & chasing", value: 17 },
              { label: "Reporting & analytics", value: 15 },
              { label: "Drafting replies & comms", value: 12 },
              { label: "Applicant summaries", value: 9 },
              { label: "Reviewing applications", value: 8 },
              { label: "Translation & language help", value: 3 },
            ],
            quotes: [
              "Detection of incomplete checklist items and chasing families for them.",
              "Applicant profile summary that highlights next steps",
              "Generate the data and reports we need — most of ours is still done manually",
              "Auto reply emails and proof-reading for staff whose second language is English",
              "Better search / filter and year-on-year reporting",
              "Document checking (missing, mismatched, expired)",
              "Summary of full applicant details",
              "Translation and evaluation of transcripts",
            ],
            tail: "Grouped from 56 open responses (some touch more than one). Document checking / chasing and reporting & analytics lead — mirroring the top time-sinks.",
          },
          {
            q: "What would make you hesitate to trust an AI feature?",
            sub: "Open responses · 48 responses · grouped",
            type: "tags",
            data: [
              { term: "accuracy", count: 22 },
              { term: "data privacy", count: 14 },
              { term: "security", count: 6 },
              { term: "gdpr / compliance", count: 6 },
              { term: "human in the loop", count: 5 },
              { term: "cost", count: 3 },
            ],
            tail: "Accuracy dominates (22 of 48), then data privacy, security & GDPR; several ask explicitly to keep a human in the loop.",
          },
        ],
      },
    },
    {
      id: "mkt-oa-ukug-2026-06",
      product: "OpenApply",
      schoolName: "UK User Group Conference — 45 schools",
      region: "UK",
      stage: "interested",
      contactedDate: "2026-06-12",
      pilotedDate: "",
      feedback: "Demand maps directly onto pain: the admissions tasks schools say cost them the most time (responding to family inquiries, chasing missing documents, scheduling, reviewing applications) are exactly the AI features they most want. Sentiment is ~90% positive (35 of 49 \"open but cautious\", 9 \"excited\"), and the add-on is sellable — 0 of 48 said \"unlikely to be approved\" — but \"worth it with proof of time saved\" (31) is the dominant frame, so ROI evidence is the lever. Trust hesitations cluster on security, impersonality / loss of personalisation, and data protection / GDPR.",
      willingnessToPay: "Sellable: 79% (38/48) say \"easy, clear value\" or \"worth it with proof of time saved\"; 0 said \"unlikely to be approved\". Proof of time saved is the unlock.",
      contactName: "",
      contactRole: "User-group attendees (admissions leaders)",
      contactEmail: "",
      wowOutcomesValidated: "Top requested features validate OA AI Pro priorities: Draft replies to family inquiries (33/49) → AI Admissions Assistant; Document checking missing/mismatched/expired (32) → AI Document Verification; Auto-tagging & sorting (32) + Applicant profile summarizer (23) → AI Applicant Insights / screening; Lead scoring (17) → AI Lead Scoring.",
      notes: "Source: OpenApply UK User Group Conference, 2026-06-12. 50 attendees from different UK schools; 45–49 responded per question. Caveat: single region (UK) — re-run with APAC / Americas cohorts before generalising.",
      survey: {
        event: "UK User Group Conference",
        date: "2026-06-12",
        location: "United Kingdom",
        participants: 45,
        invited: 50,
        charts: [
          {
            q: "Which region is your school in?",
            sub: "45 responses",
            type: "bars",
            data: [
              { label: "UK & Ireland", value: 45 },
            ],
          },
          {
            q: "Where do you lose the most time in your admissions cycle?",
            sub: "Ranked #1 most time-consuming · 45 responses",
            type: "bars",
            data: [
              { label: "Chasing missing documents", value: 9 },
              { label: "Responding to family inquiries", value: 9 },
              { label: "Scheduling (interviews, tours, tests)", value: 8 },
              { label: "Reviewing & screening applications", value: 8 },
              { label: "Manual data entry", value: 5 },
              { label: "Coordinating internally across staff", value: 4 },
              { label: "Following up with unconverted leads", value: 2 },
              { label: "Generating reports", value: 0 },
              { label: "Verifying document accuracy", value: 0 },
            ],
          },
          {
            q: "Which AI feature would help your team most?",
            sub: "Multi-select · 49 responses",
            type: "bars",
            data: [
              { label: "Draft replies to family inquiries", value: 33 },
              { label: "Document checking (missing, mismatched, expired)", value: 32 },
              { label: "Auto-tagging & sorting of applications", value: 32 },
              { label: "Applicant profile summarizer", value: 23 },
              { label: "AI search across applicant data", value: 19 },
              { label: "Lead scoring / likelihood to enroll", value: 17 },
              { label: "Interview note summarization", value: 15 },
              { label: "Translation of family communication", value: 7 },
              { label: "Natural-language reporting", value: 6 },
            ],
          },
          {
            q: "How do you feel about AI helping with admissions tasks today?",
            sub: "49 responses",
            type: "bars",
            data: [
              { label: "Open but cautious", value: 35 },
              { label: "Excited, want it now", value: 9 },
              { label: "Skeptical", value: 4 },
              { label: "Neutral", value: 1 },
              { label: "Uncomfortable", value: 0 },
            ],
          },
          {
            q: "Would an AI add-on be an easy or hard sell at your school?",
            sub: "48 responses",
            type: "bars",
            data: [
              { label: "Worth it with proof of time saved", value: 31 },
              { label: "Hard sell internally", value: 10 },
              { label: "Easy, clear value", value: 7 },
              { label: "Unlikely to be approved", value: 0 },
            ],
          },
          {
            q: "One AI capability you want most in the next 12 months",
            sub: "Open text · 65 responses · grouped into themes",
            type: "themes",
            data: [
              { label: "Chasing, reminders & follow-up", value: 12 },
              { label: "Analytics & reporting", value: 11 },
              { label: "Helping parents use OpenApply", value: 7 },
              { label: "Document & data accuracy checks", value: 6 },
              { label: "Workflow, priorities & daily focus", value: 6 },
              { label: "Enquiry management & conversion", value: 6 },
              { label: "Drafting & communications", value: 5 },
              { label: "Forms builder", value: 5 },
              { label: "Scheduling & events", value: 4 },
              { label: "Integrations & bulk export", value: 3 },
            ],
            quotes: [
              "Automated chasing of outstanding documentation — references, reports etc",
              "Smart reminders about missing documents, forms and information",
              "Summary profile of each candidate",
              "Draft responses to enquiries",
              "Dashboard for tours & events booked by day/time with spaces available",
              "Save offer emails as PDFs and auto-transfer to iSAMS",
              "Help parents with their Open Apply technical issues",
              "A daily 'to-do' list by team role, or lead scoring, or CRM support",
            ],
            tail: "Themes are a grouping of 65 open responses; some touch more than one. The clear leader — chasing, reminders & follow-up — echoes the top time-sinks.",
          },
          {
            q: "What would make you hesitate to trust an AI feature?",
            sub: "Open word response · 110 mentions · 49 responses",
            type: "tags",
            data: [
              { term: "security", count: 9 },
              { term: "impersonal", count: 8 },
              { term: "personalisation", count: 7 },
              { term: "accuracy", count: 5 },
              { term: "data protection", count: 5 },
              { term: "gdpr", count: 5 },
              { term: "confidentiality", count: 4 },
              { term: "data breach", count: 3 },
              { term: "bespoke", count: 2 },
              { term: "generic", count: 2 },
              { term: "incorrect information", count: 2 },
              { term: "reliability", count: 2 },
              { term: "not bespoke", count: 2 },
            ],
            tail: "+ ~30 single mentions: loss of personalisation, ai errors, too robotic, privacy concerns, human touch, inauthentic, brand voice, mistakes, sensitive data…",
          },
        ],
      },
    },
  ],
};
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
  survey: null,
});
function mergeMarket(saved) {
  if (!saved) return DEFAULT_MARKET;
  // id-merge: keep every saved validation (and edits), append any default
  // validation whose stable id isn't already saved. Mirrors mergeCompetitive.
  // For code-seeded entries (stable string id matching a default), keep the
  // read-only `survey` chart data authoritative from code — users can't edit it,
  // and it must stay in sync as we add/adjust charts. User-entered text fields
  // (feedback, notes, stage, willingnessToPay, …) on that entry are preserved.
  const defById = new Map(DEFAULT_MARKET.validations.map(d => [d.id, d]));
  const savedV = (saved.validations || []).map(v => {
    const def = defById.get(v.id);
    return def && def.survey ? { ...v, survey: def.survey } : v;
  });
  const savedIds = new Set(savedV.map(v => v.id));
  const newDefaults = DEFAULT_MARKET.validations.filter(d => !savedIds.has(d.id));
  return { ...DEFAULT_MARKET, ...saved, validations: [...savedV, ...newDefaults] };
}

const DEFAULT_FINANCE = {
  costInputs: {
    tokenCostPer1k: 0.01,
    monthlyInfraCost: 0,
    supportCostPerCustomer: 0,
  },
  usageInputs: Object.fromEntries(MONZ_PRODUCTS.map(p => [p, { essActionsPerSchoolMonth: 0, proActionsPerSchoolMonth: 0, tokensPerAction: 0, freeModelId: "m-qwen", proModelId: "m-sonnet" }])),
  freeTierBudget: { annualSpendUSD: 10000, schools: 1000 },
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
    // Per-product deep-merge so existing saved products gain freeModelId/proModelId.
    usageInputs: Object.fromEntries(MONZ_PRODUCTS.map(p => [p, { ...DEFAULT_FINANCE.usageInputs[p], ...((saved.usageInputs || {})[p] || {}) }])),
    freeTierBudget: { ...DEFAULT_FINANCE.freeTierBudget, ...(saved.freeTierBudget || {}) },
    uptakeScenarios: saved.uptakeScenarios || [],
    decisions: saved.decisions || [],
  };
}

/* ── Product Vision (per-product 12-section framework) ─────────
   Each product owns its OWN vision record. Stored in faria-vision-v1. */
const visionRowId = () => "vr-" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
const PROFILE_TEMPLATE = () => ({ id: visionRowId(), name: "", role: "", jtbd: "" });
const BASELINE_TEMPLATE = () => ({ id: visionRowId(), metric: "", value: "" });
const BET_TEMPLATE = () => ({ id: visionRowId(), choice: "", tradeoff: "", dependency: "" });
const GOAL_TEMPLATE = () => ({ id: visionRowId(), kind: "product", metric: "", baseline: "", target: "", window: "now" });
const INITIATIVE_TEMPLATE = () => ({ id: visionRowId(), program: "", deliversBet: "", team: "", budget: "", buildBuy: "build" });
function BLANK_VISION() {
  return {
    who: { segment: "", buyer: "", payer: "", profiles: [] },
    current: { position: "", baselines: [], working: [], notWorking: [] },
    vision: { now: "", next: "", outer: "" },
    northStar: { value: "", commercial: "" },
    why: { whyNow: "", whyUs: "" },
    whatTrue: { assumptions: [], risks: [], watching: [], doubleDown: "", pivot: "", kill: "" },
    bets: [],
    model: { packaging: "", pricing: "", expansion: "" },
    goals: [],
    horizon: { now: [], next: [], outer: [] },
    initiatives: [],
    alive: { owner: "", cadence: "" },
    updatedAt: "",
  };
}
const DEFAULT_VISION = { products: Object.fromEntries(MONZ_PRODUCTS.map(p => [p, BLANK_VISION()])) };
// Deep-merge a saved product over a blank template so new fields forward-fill without losing edits.
function mergeVisionProduct(saved) {
  const b = BLANK_VISION();
  if (!saved) return b;
  return {
    who: { ...b.who, ...(saved.who || {}), profiles: saved.who?.profiles || [] },
    current: { ...b.current, ...(saved.current || {}), baselines: saved.current?.baselines || [], working: saved.current?.working || [], notWorking: saved.current?.notWorking || [] },
    vision: { ...b.vision, ...(saved.vision || {}) },
    northStar: { ...b.northStar, ...(saved.northStar || {}) },
    why: { ...b.why, ...(saved.why || {}) },
    whatTrue: { ...b.whatTrue, ...(saved.whatTrue || {}), assumptions: saved.whatTrue?.assumptions || [], risks: saved.whatTrue?.risks || [], watching: saved.whatTrue?.watching || [] },
    bets: saved.bets || [],
    model: { ...b.model, ...(saved.model || {}) },
    goals: saved.goals || [],
    horizon: { now: saved.horizon?.now || [], next: saved.horizon?.next || [], outer: saved.horizon?.outer || [] },
    initiatives: saved.initiatives || [],
    alive: { ...b.alive, ...(saved.alive || {}) },
    updatedAt: saved.updatedAt || "",
  };
}
function mergeVision(saved) {
  if (!saved) return DEFAULT_VISION;
  return { ...DEFAULT_VISION, ...saved, products: Object.fromEntries(MONZ_PRODUCTS.map(p => [p, mergeVisionProduct(saved.products?.[p])])) };
}
// % of the 32 "slots" filled, for the progress bars.
function visionCompletion(v) {
  if (!v) return 0;
  const t = (s) => (s || "").trim().length > 0 ? 1 : 0;
  const l = (a) => (a && a.length > 0) ? 1 : 0;
  const slots = [
    t(v.who.segment), t(v.who.buyer), t(v.who.payer), l(v.who.profiles),
    t(v.current.position), l(v.current.baselines), l(v.current.working), l(v.current.notWorking),
    t(v.vision.now), t(v.vision.next), t(v.vision.outer),
    t(v.northStar.value), t(v.northStar.commercial),
    t(v.why.whyNow), t(v.why.whyUs),
    l(v.whatTrue.assumptions), l(v.whatTrue.risks), l(v.whatTrue.watching), t(v.whatTrue.doubleDown), t(v.whatTrue.pivot), t(v.whatTrue.kill),
    l(v.bets),
    t(v.model.packaging), t(v.model.pricing), t(v.model.expansion),
    l(v.goals),
    l(v.horizon.now), l(v.horizon.next), l(v.horizon.outer),
    l(v.initiatives),
    t(v.alive.owner), t(v.alive.cadence),
  ];
  return Math.round(slots.reduce((s, x) => s + x, 0) / slots.length * 100);
}
// Section metadata — drives the index chips, framework grid, group headers and guidance.
const VISION_SECTIONS = [
  { n: 1, key: "who", group: "A", title: "Who", guide: "Target segment, buyer, and who actually pays if different; one or two named profiles." },
  { n: 2, key: "current", group: "A", title: "Current state", guide: "Today's position and traction, key metrics as baselines, an honest read on what's working and what isn't." },
  { n: 3, key: "vision", group: "B", title: "Vision (rolling)", guide: "The future picture across three windows, resolution dropping with distance." },
  { n: 4, key: "northStar", group: "B", title: "North star", guide: "The single enduring measure — a value + commercial pair — that proves we're moving toward the vision." },
  { n: 5, key: "why", group: "B", title: "Why", guide: "The shift that makes this the moment (why now) and our right to win (why us)." },
  { n: 6, key: "whatTrue", group: "C", title: "What has to be true", guide: "Core assumptions, top risks, what we're watching, and the triggers to double down, pivot, or kill a bet." },
  { n: 7, key: "bets", group: "C", title: "Strategic bets", guide: "The 2–4 big choices, each with its explicit tradeoff and any dependency we don't own." },
  { n: 8, key: "model", group: "D", title: "Business model / value capture", guide: "Packaging, pricing, and the expansion path; how the bets turn into revenue." },
  { n: 9, key: "goals", group: "D", title: "Goals / outcomes", guide: "Product and commercial targets, baseline to target, phased to the windows." },
  { n: 10, key: "horizon", group: "E", title: "Horizon", guide: "Bets and initiatives mapped onto the same Now / Next / Outer windows." },
  { n: 11, key: "initiatives", group: "E", title: "Initiatives", guide: "The concrete programs that deliver each bet and what they require (team, budget, build vs. buy)." },
  { n: 12, key: "alive", group: "F", title: "Keeping it alive", guide: "Owner and re-baseline cadence; Now is firm, Next and Outer refreshed quarterly." },
];
const VISION_GROUPS = { A: "Where we stand", B: "Where we're going", C: "What must hold", D: "How it pays", E: "How we execute", F: "How we sustain it" };

// Returns user-assigned tier if set, otherwise infers a candidate tier
// from impact. User overrides always win. "" = explicitly Unassigned.
function effectiveTier(f) {
  if (f.tier === "essential" || f.tier === "pro" || f.tier === "unassigned") return f.tier;
  // Inferred default: high impact → Pro candidate, else Essential candidate
  return f.impact === "high" ? "pro" : "essential";
}

// Enrich a saved initiative list with default fields (wowOutcomes,
// valueRationale) — preserving every user edit. Match each saved entry to a
// default by id first, then by name+product (so features added via the UI,
// which have random timestamp ids, still attach to seeded defaults).
// Also dedupes appended new defaults by name+product so seeding a default
// that the user already added in the UI doesn't create a duplicate row.
// Migration: coerces legacy singular wowOutcome (string) to wowOutcomes ([]).
function enrichInitsWithDefaults(savedInits, defaults) {
  if (!Array.isArray(savedInits)) return savedInits;
  const norm = (s) => String(s || "").trim().toLowerCase();
  const matchDefault = (saved) => {
    const byId = defaults.find(d => d.id === saved.id);
    if (byId) return byId;
    if (!saved.name) return null;
    const nm = norm(saved.name);
    const pr = saved.product || "";
    return defaults.find(d => norm(d.name) === nm && (d.product || "") === pr);
  };
  const enriched = savedInits.map(saved => {
    const def = matchDefault(saved);
    const filled = { ...saved };
    if (filled.wowOutcome && (!filled.wowOutcomes || filled.wowOutcomes.length === 0)) {
      filled.wowOutcomes = [filled.wowOutcome];
    }
    delete filled.wowOutcome;
    if (def?.wowOutcomes && (!filled.wowOutcomes || filled.wowOutcomes.length === 0)) {
      filled.wowOutcomes = [...def.wowOutcomes];
    }
    if (def?.valueRationale && !filled.valueRationale) {
      filled.valueRationale = def.valueRationale;
    }
    return filled;
  });
  // Append only defaults that aren't already present (id miss AND name+product miss)
  const savedIds = new Set(savedInits.map(i => i.id));
  const savedKeys = new Set(savedInits.map(i => `${i.product || ""}::${norm(i.name)}`));
  const newOnes = defaults.filter(d => {
    if (savedIds.has(d.id)) return false;
    return !savedKeys.has(`${d.product || ""}::${norm(d.name)}`);
  });
  return [...enriched, ...newOnes];
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
    modelCosts: saved.modelCosts || DEFAULT_MONETIZATION.modelCosts,
    // id-merge cost lab: keep saved/edited rows, append any new default features by id.
    costLab: (() => {
      if (!saved.costLab) return DEFAULT_MONETIZATION.costLab;
      const ids = new Set(saved.costLab.map(r => r.id));
      return [...saved.costLab, ...DEFAULT_MONETIZATION.costLab.filter(d => !ids.has(d.id))];
    })(),
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

  // Load saved state and merge in defaults (preserves user edits, forward-fills
  // missing wowOutcomes/valueRationale, dedupes new defaults that match by
  // name+product so the same feature doesn't appear twice).
  useEffect(() => { (async () => {
    const s = await loadState(storageKey);
    if (s?.inits) {
      setInits(enrichInitsWithDefaults(s.inits, defaults));
    }
    setReady(true);
  })(); }, []);
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
// Product → URL slug map (used by the Framework sub-page for per-product deep URLs).
const PRODUCT_SLUG = {
  "OpenApply":    "openapply",
  "ManageBac+":   "managebac",
  "Atlas":        "atlas",
  "SchoolsBuddy": "schoolsbuddy",
  "Vectare":      "vectare",
};
const SLUG_PRODUCT = Object.fromEntries(Object.entries(PRODUCT_SLUG).map(([k, v]) => [v, k]));

function AiMonetizationPage({ subRoute, setSubRoute, deepRoute, setDeepRoute }) {
  // view derived from URL sub-route. Valid: "plan" | "usage" | "competitive" | "market" | "finance".
  // Empty / unknown subRoute → default "plan".
  const VALID_VIEWS = ["plan", "usage", "competitive", "market", "finance"];
  const view = VALID_VIEWS.includes(subRoute) ? subRoute : "plan";
  const setView = (v) => setSubRoute(v);
  // For the Framework view, the third URL segment selects a single product.
  // Empty string = "Overview" (summary cards for all 5 products).
  const focusedProduct = view === "plan" && SLUG_PRODUCT[deepRoute] ? SLUG_PRODUCT[deepRoute] : null;
  const setFocusedProduct = (prod) => setDeepRoute(prod ? PRODUCT_SLUG[prod] || "" : "");
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
    if (s?.inits) setAi({ inits: enrichInitsWithDefaults(s.inits, DEFAULT_AI) });
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
          plan:        { t: "Monetization Framework", s: "Working framework for AI Essential vs AI Pro across Faria products. Edit anything inline — this is a living document." },
          usage:       { t: "Usage & cost", s: "Model cost table + cap strategy. Pick a product to price each AI feature across models (free vs Pro) and see what a free-tier allowance buys." },
          competitive: { t: "Competitive Analysis", s: "Track how competitors are pricing and packaging AI. Use this to calibrate our Pro tier and bundle pricing." },
          market:      { t: "Market Validation", s: "Per-product school validation — pilots, willingness to pay, and which Pro outcomes schools have confirmed." },
          finance:     { t: "Finance", s: "Free-tier budget, SKUs & pricing, and per-product economics — net per school after AI cost (pulled from Usage) — plus uptake scenarios and a decision log." },
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

      {view === "usage"       && <FairUseExample monz={mz} setMonz={setMz} deepRoute={deepRoute} setDeepRoute={setDeepRoute} />}
      {view === "competitive" && <MonzCompetitivePage />}
      {view === "market"      && <MonzMarketPage />}
      {view === "finance"     && <MonzFinancePage monz={mz} setMonz={setMz} />}

      {view === "plan" && (<>
      {/* Framework card — Essential vs Pro two-up, demarcation criteria as a full-width band below */}
      <div style={card}>
        <div style={sectionTitle}>Framework</div>
        <p style={{ margin: "-2px 0 14px", fontSize: 12.5, color: F.muted, lineHeight: 1.5, maxWidth: 760 }}>Two tiers of AI across every Faria product. A feature only earns its way into the paid tier if it clears the demarcation line below.</p>

        {/* Essential vs Pro — balanced two-up */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {/* AI Essential */}
          <div style={{ background: F.lightYellow + "55", border: `1px solid ${F.border}`, borderTop: `3px solid ${F.yellow}`, borderRadius: 10, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: F.plum, textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Essential</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: F.plum, background: F.yellow, padding: "2px 8px", borderRadius: 4 }}>FREE</span>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 12.5, color: F.plum, fontWeight: 700 }}>Default-on for every school</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: F.muted, lineHeight: 1.65 }}>
              <li>Broad, low-friction AI conveniences shipped to every customer</li>
              <li>The everyday "table-stakes" surface for AI inside Faria products</li>
              <li>Lower fair-use caps to keep inference cost bounded on the free tier</li>
            </ul>
          </div>
          {/* AI Pro */}
          <div style={{ background: F.plum, border: `1px solid ${F.plum}`, borderTop: `3px solid ${F.yellow}`, borderRadius: 10, padding: "18px 20px", color: F.paper }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: F.paper, textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Pro</span>
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

        {/* Demarcation line — full-width band of the three crossover rules */}
        <div style={{ marginTop: 14, background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>The demarcation line</div>
            <div style={{ fontSize: 14, color: F.plum, fontWeight: 800 }}>A feature crosses into AI Pro when it passes <span style={{ color: F.pink }}>any one</span> of these</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            {[
              {
                rule: "Saves a school 5+ hours/week of manual work",
                examples: [
                  "AI Writing Assistant — drafts applicant communications staff currently type by hand",
                  "AI Document Verification — auto-cross-references transcripts against the school's checklist",
                ],
              },
              {
                rule: "Unlocks something they literally cannot do today",
                examples: [
                  "MCP — schools query their OpenApply data from Claude / ChatGPT / Cursor",
                  "Agentic Nurture Workflows — autonomous, tailored applicant follow-ups at scale",
                ],
              },
              {
                rule: "Produces a measurable outcome (conversion lift, time-to-decision, retention)",
                examples: [
                  "AI Lead Scoring — 15% conversion lift in the top-scored applicant cohort",
                  "AI Analyst — quarterly board reports auto-drafted in under 30 min (vs 8+ hrs)",
                ],
              },
            ].map((r, i) => (
              <div key={i} style={{ background: F.surface, border: `1px solid ${F.border}`, borderTop: `3px solid ${F.pink}`, borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 9, background: F.pink, color: "#fff", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                  <div style={{ fontSize: 12.5, color: F.plum, fontWeight: 700, lineHeight: 1.4 }}>{r.rule}</div>
                </div>
                <div style={{ paddingLeft: 4, borderLeft: `2px solid ${F.lightYellow}` }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.08em", marginLeft: 8, marginBottom: 3 }}>Examples</div>
                  {r.examples.map((ex, ei) => (
                    <div key={ei} style={{ fontSize: 11.5, color: F.muted, lineHeight: 1.45, fontStyle: "italic", marginLeft: 8, marginBottom: 3 }}>· {ex}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 11.5, color: F.muted, fontStyle: "italic", textAlign: "center" }}>Pass <strong style={{ color: F.plum }}>any one</strong> rule → Pro. Else → Essential. <span style={{ color: F.muted2 }}>(Examples illustrative — actual tier assignment per feature lives in each product block.)</span></div>
        </div>
      </div>

      {/* Product chip nav — Framework's third URL level. "Overview" shows every product. Selecting a chip filters to one product's deep block. */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4 }}>Product:</span>
        <button onClick={() => setFocusedProduct(null)} style={{
          padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
          background: !focusedProduct ? F.plum : F.surface,
          color: !focusedProduct ? F.paper : F.plum,
          border: `1px solid ${!focusedProduct ? F.plum : F.borderStrong}`,
          fontFamily: "inherit",
        }}>Overview</button>
        {MONZ_PRODUCTS.map(p => {
          const active = focusedProduct === p;
          return (
            <button key={p} onClick={() => setFocusedProduct(p)} style={{
              padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: active ? F.plum : F.surface,
              color: active ? F.paper : F.plum,
              border: `1px solid ${active ? F.plum : F.borderStrong}`,
              fontFamily: "inherit",
            }}>{p}</button>
          );
        })}
      </div>

      {/* Overview mode: small per-product summary cards (linking to each product's deep view) */}
      {!focusedProduct && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 18 }}>
          {MONZ_PRODUCTS.map(prod => {
            const feats = featuresByProduct(prod);
            const proCount = feats.filter(f => effectiveTier(f) === "pro").length;
            const essCount = feats.filter(f => effectiveTier(f) === "essential").length;
            const unCount = feats.filter(f => effectiveTier(f) === "unassigned").length;
            const ready = proReadyDate(prod);
            return (
              <button key={prod} onClick={() => setFocusedProduct(prod)} style={{
                background: F.surface, border: `1px solid ${F.border}`, borderRadius: 12, padding: "16px 18px", boxShadow: F.shadowSm,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: F.plum, display: "block",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: F.plum, marginBottom: 6 }}>{prod}</div>
                <div style={{ fontSize: 11, color: F.muted, marginBottom: 10 }}>{proCount} Pro · {essCount} Essential{unCount > 0 ? ` · ${unCount} unassigned` : ""}</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: ready.complete ? F.green : (ready.muted ? F.muted2 : F.plum), background: ready.complete ? F.greenSoft : F.bg, padding: "3px 9px", borderRadius: 999, display: "inline-block", border: `1px solid ${ready.complete ? F.green : F.border}` }}>{ready.label}</div>
                <div style={{ marginTop: 12, fontSize: 11, fontWeight: 700, color: F.pink }}>View details →</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Per-product breakdown — only render the focused product (or all if there's no focus AND user explicitly wants the long view) */}
      {focusedProduct && MONZ_PRODUCTS.filter(p => p === focusedProduct).map(prod => {
        const pd = mz.products[prod] || { wowOutcomes: ["", "", ""] };
        const isOpen = expanded.has(prod);
        const feats = featuresByProduct(prod);
        // Sort each tier list chronologically by deadline (earliest first; undated → last)
        const byDeadline = (a, b) => (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31");
        const pro = feats.filter(f => effectiveTier(f) === "pro").sort(byDeadline);
        const ess = feats.filter(f => effectiveTier(f) === "essential").sort(byDeadline);
        const un  = feats.filter(f => effectiveTier(f) === "unassigned").sort(byDeadline);
        const ship = proShipped(prod);
        const ready = proReadyDate(prod);
        // Pro features that also have an Essential foothold (preview or available)
        const proWithEssAccess = pro.filter(f => f.essentialAccess && f.essentialAccess !== "locked");

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
                      {pro.map(f => {
                        const outs = (f.wowOutcomes || []).filter(Boolean);
                        return (
                          <div key={f.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px", background: F.bg, border: `1px solid ${F.border}`, borderRadius: 8 }}>
                            <span style={{ color: F.pink, fontSize: 14, lineHeight: 1.2, paddingTop: 1 }}>★</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 700, color: F.plum }}>{f.name}</div>
                              {outs.length > 0 ? (
                                <ul style={{ margin: "3px 0 0", padding: "0 0 0 16px", listStyle: "disc", color: F.plum }}>
                                  {outs.map((o, oi) => (
                                    <li key={oi} style={{ fontSize: 12, marginBottom: 2, lineHeight: 1.5 }}>{o}</li>
                                  ))}
                                </ul>
                              ) : (
                                <div style={{ fontSize: 11.5, color: F.muted2, marginTop: 3, fontStyle: "italic" }}>No wow outcomes set yet.</div>
                              )}
                            </div>
                            <button onClick={() => setEditFeat(f.id)} style={{ ...bt("ghost"), padding: "3px 8px", fontSize: 10.5 }}>edit</button>
                          </div>
                        );
                      })}
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
                        {b.list.map(f => {
                          const statusOpt = STATUS_OPTIONS.find(o => o.value === f.status);
                          return (
                          <div key={f.id} style={{ background: F.surface, border: `1px solid ${F.border}`, borderRadius: 8, padding: "8px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 3, background: sC(f.status), color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{statusOpt?.label || f.status}</span>
                              <span style={{ flex: 1, minWidth: 100, fontSize: 12.5, fontWeight: 600, color: F.plum }}>{f.name}</span>
                              <span style={{ fontSize: 10, color: F.muted2, fontWeight: 600 }}>{fmt(f.deadline)}</span>
                            </div>
                            {b.key === "pro" && (f.wowOutcomes || []).filter(Boolean).map((o, oi) => (
                              <div key={oi} style={{ fontSize: 11.5, color: F.pink, marginLeft: 12, marginBottom: 4, lineHeight: 1.45, fontWeight: 600 }}>★ {o}</div>
                            ))}
                            {f.valueRationale && <div style={{ fontSize: 11.5, color: F.muted, marginLeft: 12, marginBottom: 6, lineHeight: 1.4 }}><span style={{ fontWeight: 700, color: F.muted2 }}>Why {b.title}:</span> {f.valueRationale}</div>}
                            <div style={{ display: "flex", gap: 4, marginLeft: 12, flexWrap: "wrap" }}>
                              <button onClick={() => setEditFeat(f.id)} style={{ ...bt("ghost"), padding: "3px 8px", fontSize: 10.5 }}>edit</button>
                              {b.key !== "pro" && <button onClick={() => setFeatField(f.id, { tier: "pro" })} style={{ ...bt(), padding: "3px 8px", fontSize: 10.5 }}>→ Pro</button>}
                              {b.key !== "essential" && <button onClick={() => setFeatField(f.id, { tier: "essential" })} style={{ ...bt(), padding: "3px 8px", fontSize: 10.5 }}>→ Essential</button>}
                              <button onClick={() => setFeatField(f.id, { tier: "unassigned" })} style={{ ...bt("ghost"), padding: "3px 8px", fontSize: 10.5, color: F.muted }}>→ Unassigned</button>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {un.length > 0 && (
                  <div style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
                    <div style={{ background: F.surface, color: F.muted, padding: "8px 12px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${F.border}` }}>Unassigned · {un.length}</div>
                    <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      {un.map(f => {
                        const statusOpt = STATUS_OPTIONS.find(o => o.value === f.status);
                        return (
                        <div key={f.id} style={{ background: F.surface, border: `1px solid ${F.border}`, borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 3, background: sC(f.status), color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{statusOpt?.label || f.status}</span>
                          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: F.plum, minWidth: 200 }}>{f.name}</span>
                          <span style={{ fontSize: 10, color: F.muted2, fontWeight: 600 }}>{fmt(f.deadline)}</span>
                          <button onClick={() => setFeatField(f.id, { tier: "pro" })} style={{ ...bt(), padding: "3px 8px", fontSize: 10.5 }}>→ Pro</button>
                          <button onClick={() => setFeatField(f.id, { tier: "essential" })} style={{ ...bt(), padding: "3px 8px", fontSize: 10.5 }}>→ Essential</button>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Fair use limits */}
                <div style={sectionTitle}>Essential access for Pro features</div>
                <p style={{ margin: "-4px 0 10px", fontSize: 12, color: F.muted, lineHeight: 1.5 }}>
                  Under <strong style={{ color: F.plum }}>Model B</strong> (shared credits), Pro features can still have an Essential foothold — a smaller-scope preview, or full access that just consumes the smaller free credit pool. Use this to track which Pro features pull double-duty as Essential teasers.
                </p>
                <div style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.6fr 170px 1fr 70px", background: F.surface, padding: "8px 12px", fontSize: 10.5, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${F.border}` }}>
                    <div>Pro feature</div>
                    <div>Essential access</div>
                    <div>What Essential users see</div>
                    <div></div>
                  </div>
                  {pro.length === 0 && <div style={{ padding: 14, fontSize: 12.5, color: F.muted, fontStyle: "italic", textAlign: "center" }}>No Pro features for {prod} yet. Once features are assigned to Pro they'll appear here so you can map their Essential access.</div>}
                  {pro.map(f => {
                    // Older saved data may have "available" — treat as preview (limited credits in Essential).
                    const raw = f.essentialAccess || "locked";
                    const access = raw === "preview" || raw === "available" ? "preview" : "locked";
                    const badge = access === "preview"
                      ? { bg: F.orange, fg: F.plum, label: "Preview · limited credits" }
                      : { bg: F.muted2, fg: "#fff", label: "Locked · Pro only" };
                    return (
                      <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 170px 1fr 70px", padding: "10px 12px", borderBottom: `1px solid ${F.border}`, alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: F.plum, minWidth: 0 }}>{f.name}</div>
                        <div>
                          <span style={{ fontSize: 9.5, fontWeight: 800, padding: "3px 9px", borderRadius: 4, background: badge.bg, color: badge.fg, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{badge.label}</span>
                        </div>
                        <div style={{ fontSize: 12, color: f.essentialNote ? F.muted : F.muted2, lineHeight: 1.45, fontStyle: f.essentialNote ? "normal" : "italic" }}>{f.essentialNote || (access === "preview" ? "Smaller scope or capped use — credits apply" : "—")}</div>
                        <button onClick={() => setEditFeat(f.id)} style={{ ...bt(), padding: "3px 8px", fontSize: 10.5 }}>edit</button>
                      </div>
                    );
                  })}
                </div>
                {proWithEssAccess.length > 0 && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: F.bg, border: `1px solid ${F.border}`, borderRadius: 8, fontSize: 12, color: F.plum, lineHeight: 1.5 }}>
                    <strong>{proWithEssAccess.length} of {pro.length}</strong> Pro {prod} feature{pro.length === 1 ? "" : "s"} also reachable from Essential — every one of these is an upgrade hook (school taps the ceiling on the smaller credit pool and is nudged to Pro).
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
                  <button onClick={() => setView("usage")} style={{ ...bt("ghost"), fontSize: 12, color: F.pink, fontWeight: 700 }}>See Model B mockup →</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Launch timeline — overview only (full picture across all 5 products) */}
      {!focusedProduct && (
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
      )}
      </>)}

      {/* Feature details editor modal — wow outcomes (multi) + rationale + status + deadline */}
      {editFeatObj && (() => {
        const outs = editFeatObj.wowOutcomes || [];
        const setOutAt = (idx, val) => setFeatField(editFeatObj.id, { wowOutcomes: outs.map((o, i) => i === idx ? val : o) });
        const addOut = () => setFeatField(editFeatObj.id, { wowOutcomes: [...outs, ""] });
        const removeOut = (idx) => setFeatField(editFeatObj.id, { wowOutcomes: outs.filter((_, i) => i !== idx) });
        return (
          <Modal onClose={() => setEditFeat(null)}>
            <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: F.plum }}>Feature details</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: F.muted }}>{editFeatObj.name} · {editFeatObj.product} · <strong style={{ color: F.plum }}>{effectiveTier(editFeatObj) === "pro" ? "AI Pro" : effectiveTier(editFeatObj) === "essential" ? "AI Essential" : "Unassigned"}</strong></p>

            <div style={lb}>"Wow" outcomes <span style={{ color: F.pink, marginLeft: 4 }}>★</span></div>
            {outs.length === 0 && (
              <p style={{ margin: "2px 0 8px", fontSize: 11.5, color: F.muted2, fontStyle: "italic" }}>None yet. Add 1–3 measurable outcomes we'll validate before this feature goes live.</p>
            )}
            {outs.map((o, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                <input value={o} onChange={e => setOutAt(i, e.target.value)} placeholder='e.g. 15% conversion lift in admissions pipeline' style={{ ...inp, flex: 1 }} />
                <button onClick={() => removeOut(i)} title="Remove outcome" style={{ width: 26, height: 26, borderRadius: 13, border: "none", background: "transparent", color: F.muted2, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0, fontFamily: "inherit" }}>×</button>
              </div>
            ))}
            <button onClick={addOut} style={{ padding: "5px 11px", borderRadius: 7, border: `1px dashed ${F.borderStrong}`, background: "transparent", color: F.plum, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 2, marginBottom: 12 }}>+ Add wow outcome</button>
            <p style={{ margin: "0 0 14px", fontSize: 11.5, color: F.muted, fontStyle: "italic" }}>Measurable wins we'll validate before {editFeatObj.product} AI Pro goes live. Surfaced at the top of the {editFeatObj.product} block.</p>

            <div style={lb}>Value rationale</div>
            <textarea value={editFeatObj.valueRationale || ""} onChange={e => setFeatField(editFeatObj.id, { valueRationale: e.target.value })} rows={3} placeholder="Why is this Pro (or Essential)? e.g. saves 5+ hrs/wk of manual review; unlocks predictive enrolment likelihood" style={{ ...inp, width: "100%", resize: "vertical", marginBottom: 14 }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={lb}>Status</div>
                <select value={editFeatObj.status} onChange={e => setFeatField(editFeatObj.id, { status: e.target.value })} style={{ ...inp, width: "100%", cursor: "pointer" }}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <div style={lb}>Deadline</div>
                <input type="date" value={editFeatObj.deadline || ""} onChange={e => setFeatField(editFeatObj.id, { deadline: e.target.value })} style={{ ...inp, width: "100%" }} />
              </div>
            </div>

            {effectiveTier(editFeatObj) === "pro" && (
              <>
                <div style={lb}>Essential access</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {[
                    { v: "locked",  label: "Locked",  sub: "Pro-only — Essential users cannot run this feature" },
                    { v: "preview", label: "Preview", sub: "Essential users can try it, but get a small allotment of credits" },
                  ].map(opt => {
                    // Coerce legacy "available" → "preview" for the active check
                    const raw = editFeatObj.essentialAccess || "locked";
                    const current = raw === "preview" || raw === "available" ? "preview" : "locked";
                    const active = current === opt.v;
                    return (
                      <button key={opt.v} onClick={() => setFeatField(editFeatObj.id, { essentialAccess: opt.v })} style={{
                        flex: 1,
                        minWidth: 200,
                        padding: "8px 12px",
                        borderRadius: 7,
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: active ? F.plum : F.surface,
                        color: active ? F.paper : F.plum,
                        border: `1px solid ${active ? F.plum : F.borderStrong}`,
                        fontFamily: "inherit",
                        textAlign: "left",
                      }}>
                        <div>{opt.label}</div>
                        <div style={{ fontSize: 10.5, fontWeight: 600, opacity: active ? 0.85 : 0.6, marginTop: 2, lineHeight: 1.35 }}>{opt.sub}</div>
                      </button>
                    );
                  })}
                </div>
                <input value={editFeatObj.essentialNote || ""} onChange={e => setFeatField(editFeatObj.id, { essentialNote: e.target.value })} placeholder='e.g. "1 free preview per applicant; full mode requires Pro credits"' style={{ ...inp, width: "100%", marginBottom: 4 }} />
                <p style={{ margin: "4px 0 16px", fontSize: 11.5, color: F.muted, fontStyle: "italic" }}>What does an Essential user actually see when they try this Pro feature? Surfaced in the "Essential access" table below the buckets.</p>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setEditFeat(null)} style={bt("primary")}>Done</button>
            </div>
          </Modal>
        );
      })()}

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
// Sector taxonomy for the competitive set — "what kind of system school users touch".
// Keyed by competitor id; user-added competitors carry their own `sector` field instead.
const COMP_SECTORS = {
  "duolingo-max": "Teaching & learning",
  "khanmigo": "Teaching & learning",
  "magicschool": "Teaching & learning",
  "coursera-coach": "Teaching & learning",
  "quizlet": "Teaching & learning",
  "brisk-teaching": "Teaching & learning",
  "instructure-igniteai": "LMS / SIS",
  "powerschool-powerbuddy": "LMS / SIS",
  "element451": "Admissions & enrollment",
  "ravenna": "Admissions & enrollment",
  "google-for-education-gemini": "Productivity & general AI",
  "chatgpt-edu": "Productivity & general AI",
  "microsoft-copilot": "Productivity & general AI",
  "github-copilot": "Productivity & general AI",
  "adobe-firefly": "Productivity & general AI",
  "zoom-ai-companion": "Productivity & general AI",
  "notion-ai": "Productivity & general AI",
  "granola": "Productivity & general AI",
  "google-workspace-gemini": "Productivity & general AI",
  "salesforce-agentforce": "CRM, sales & support",
  "intercom-fin": "CRM, sales & support",
  "hubspot-breeze": "CRM, sales & support",
  "zendesk": "CRM, sales & support",
};
// Sectors where the buyer is a school (used for the "Education-focused" headline stat).
const COMP_EDU_SECTORS = ["Teaching & learning", "LMS / SIS", "Admissions & enrollment"];
// Go-to-market audience — B2B (institution/business buyer), B2C (individual consumer), or Both.
// Keyed by competitor id; user-added competitors carry their own `audience` field.
const COMP_AUDIENCE = {
  "duolingo-max": "B2C", "quizlet": "B2C",
  "khanmigo": "Both", "magicschool": "Both", "coursera-coach": "Both",
  "brisk-teaching": "Both", "adobe-firefly": "Both", "notion-ai": "Both",
  "instructure-igniteai": "B2B", "powerschool-powerbuddy": "B2B",
  "google-for-education-gemini": "B2B", "chatgpt-edu": "B2B", "element451": "B2B",
  "ravenna": "B2B", "microsoft-copilot": "B2B", "salesforce-agentforce": "B2B",
  "intercom-fin": "B2B", "hubspot-breeze": "B2B", "github-copilot": "B2B",
  "zoom-ai-companion": "B2B", "google-workspace-gemini": "B2B", "zendesk": "B2B", "granola": "B2B",
};
const VALIDATION_STAGES = ["interested", "piloting", "live", "committed", "declined"];
function stageColor(stage) {
  return stage === "interested" ? F.muted2 :
         stage === "piloting"   ? F.yellow :
         stage === "live"       ? F.green :
         stage === "committed"  ? F.green :
         stage === "declined"   ? F.pink  : F.muted2;
}

/* ── Reusable data-viz primitives (Market Insights) ───────────────
   Small inline-SVG / flexbox chart tools driven by validation data.
   Shared by the Market Insights dashboard and reused anywhere a
   {label,value} or {term,count} series needs visualising. */

// Ranked horizontal bars. data: [{label, value}], scaled to the max value.
function VizBars({ data, accent = F.plum, highlightTop = false, valueSuffix = "" }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map((d, i) => {
        const pct = Math.round((d.value / max) * 100);
        const top = highlightTop && i === 0;
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 44%) 1fr auto", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 12, color: F.plum, fontWeight: top ? 800 : 600, lineHeight: 1.25 }}>{d.label}</div>
            <div style={{ background: F.bg, borderRadius: 999, height: 16, overflow: "hidden", border: `1px solid ${F.border}` }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: top ? F.gradient : accent, transition: "width 0.4s ease" }} />
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: top ? F.pink : F.plum, minWidth: 22, textAlign: "right" }}>{d.value}{valueSuffix}</div>
          </div>
        );
      })}
    </div>
  );
}

// SVG donut + legend. segments: [{label, value, color}].
function VizDonut({ segments, centerLabel, centerSub }) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
      <svg viewBox="0 0 140 140" style={{ width: 130, height: 130, flexShrink: 0 }}>
        <circle cx="70" cy="70" r={R} fill="none" stroke={F.bg} strokeWidth="16" />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * C;
          const el = (
            <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth="16"
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset}
              transform="rotate(-90 70 70)" strokeLinecap="butt" />
          );
          offset += dash;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" fontSize="22" fontWeight="800" fill={F.plum}>{centerLabel}</text>
        {centerSub && <text x="70" y="84" textAnchor="middle" fontSize="9" fontWeight="700" fill={F.muted2}>{centerSub}</text>}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 150 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ color: F.plum, fontWeight: 600, flex: 1 }}>{s.label}</span>
            <span style={{ color: F.muted, fontWeight: 800 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 100%-stacked single bar + legend. segments: [{label, value, color}].
function VizMeter({ segments }) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  return (
    <div>
      <div style={{ display: "flex", height: 26, borderRadius: 8, overflow: "hidden", border: `1px solid ${F.border}` }}>
        {segments.filter(s => s.value > 0).map((s, i) => (
          <div key={i} title={`${s.label}: ${s.value}`} style={{ width: `${(s.value / total) * 100}%`, background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>
            {s.value / total > 0.12 ? s.value : ""}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ color: F.plum, fontWeight: 600 }}>{s.label}</span>
            <span style={{ color: F.muted2, fontWeight: 800 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Weighted tag cloud. data: [{term, count}] sorted desc; font + tint scale with count.
function VizTags({ data, tail }) {
  const max = Math.max(1, ...data.map(d => d.count));
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {data.map((d, i) => {
          const w = d.count / max; // 0..1
          const fs = 11 + Math.round(w * 9);     // 11–20px
          const alpha = 0.12 + w * 0.4;          // background intensity
          return (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, background: `rgba(232,55,172,${alpha.toFixed(2)})`, color: F.plum, fontWeight: w > 0.55 ? 800 : 700, fontSize: fs, lineHeight: 1.1 }}>
              {d.term}<span style={{ fontSize: 10, fontWeight: 800, color: F.muted, background: F.surface, borderRadius: 999, padding: "1px 6px" }}>{d.count}</span>
            </span>
          );
        })}
      </div>
      {tail && <div style={{ marginTop: 10, fontSize: 11.5, color: F.muted2, fontStyle: "italic", lineHeight: 1.5 }}>{tail}</div>}
    </div>
  );
}

// Pain ↔ Demand alignment: two ranked columns side by side with a center spine.
function VizAlignment({ leftTitle, left, rightTitle, right }) {
  const col = (title, items, accent, align) => (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, textAlign: align }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", flexDirection: align === "right" ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: accent, color: F.plum, fontSize: 10.5, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: F.plum, lineHeight: 1.25, textAlign: align }}>{it.label}{it.value != null ? <span style={{ color: F.muted2, fontWeight: 800 }}> · {it.value}</span> : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
      {col(leftTitle, left, F.lightYellow, "left")}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: F.pink, fontWeight: 800, fontSize: 16 }}>→</div>
      {col(rightTitle, right, F.lightPink, "right")}
    </div>
  );
}

/* ── Competitive Analysis sub-page ──────────────────────── */
function MonzCompetitivePage() {
  const [comp, setComp] = useState(DEFAULT_COMPETITIVE);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  const [confirmDel, setConfirmDel] = useState(null);
  const [aud, setAud] = useState("all"); // audience filter: "all" | "B2B" | "B2C"
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

  // Executive summary mutators ("What this tells us" card at the top)
  const setSummary = (patch) => setComp(prev => ({ ...prev, summary: { ...prev.summary, ...patch } }));
  const setSummaryRow = (key, idx, val) => setComp(prev => ({ ...prev, summary: { ...prev.summary, [key]: (prev.summary[key] || []).map((r, i) => i === idx ? val : r) } }));
  const addSummaryRow = (key) => setComp(prev => ({ ...prev, summary: { ...prev.summary, [key]: [...(prev.summary[key] || []), ""] } }));
  const removeSummaryRow = (key, idx) => setComp(prev => ({ ...prev, summary: { ...prev.summary, [key]: (prev.summary[key] || []).filter((_, i) => i !== idx) } }));
  const summary = comp.summary || DEFAULT_COMPETITIVE.summary;

  const card = { background: F.surface, border: `1px solid ${F.border}`, borderRadius: 12, padding: "18px 22px", marginBottom: 18, boxShadow: F.shadowSm };
  const sectionTitle = { fontSize: 11, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 };
  const tile = { flex: 1, minWidth: 130, padding: "12px 16px", background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10 };

  // ── Audience (B2B / B2C) — the analytics split into "almost two different kinds" ──
  const audienceOf = (c) => c.audience || COMP_AUDIENCE[c.id] || "B2B";
  // "Both" counts inside either filtered view.
  const inAudience = (c) => aud === "all" || audienceOf(c) === aud || audienceOf(c) === "Both";
  const allComp = comp.competitors;
  const audCounts = { B2B: allComp.filter(c => audienceOf(c) === "B2B").length, Both: allComp.filter(c => audienceOf(c) === "Both").length, B2C: allComp.filter(c => audienceOf(c) === "B2C").length };
  // Scope every analytic + the table by the selected audience.
  const scoped = allComp.filter(inAudience);

  // Stats (scoped to the audience filter)
  const total = scoped.length;
  const byModel = COMP_AI_MODELS
    .map(m => ({ m, n: scoped.filter(c => (c.aiModel || []).includes(m)).length }))
    .filter(x => x.n > 0);
  const modelBars = [...byModel].sort((a, b) => b.n - a.n).map(x => ({ label: x.m, value: x.n }));
  const cntModel = (m) => scoped.filter(c => (c.aiModel || []).includes(m)).length;
  const freemiumN = cntModel("Tiered freemium");
  const bundledN = cntModel("Bundled (no extra charge)");
  const usageOutcomeN = scoped.filter(c => { const a = c.aiModel || []; return a.includes("Consumption/credits") || a.includes("Outcome-based"); }).length;
  const pctOf = (n) => total ? `${Math.round((n / total) * 100)}%` : "0%";
  // By sector — what kind of system school users are touching.
  const sectorOf = (c) => c.sector || COMP_SECTORS[c.id] || "Other";
  const sectorBars = Object.entries(scoped.reduce((m, c) => { const s = sectorOf(c); m[s] = (m[s] || 0) + 1; return m; }, {}))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const eduN = scoped.filter(c => COMP_EDU_SECTORS.includes(sectorOf(c))).length;

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
        .ws-col-card { background: ${F.surface}; border: 1px solid ${F.border}; border-radius: 10px; padding: 14px 16px; }
        .ws-bullet-row { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; border-bottom: 1px solid ${F.border}; }
        .ws-bullet-row:last-of-type { border-bottom: none; }
        @media (max-width: 720px) { .ws-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* ── Trends at a glance — quick visual analytics across all tracked tools, pinned to the very top ── */}
      <div style={{ ...card, padding: "20px 24px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.12em", padding: "3px 10px", borderRadius: 4, background: F.plum, color: F.paper, textTransform: "uppercase" }}>📊 Trends at a glance</span>
          <span style={{ fontSize: 11, color: F.muted2, fontStyle: "italic" }}>Quick read across the {total} {aud === "all" ? "tools tracked" : `${aud} tools`}</span>
        </div>
        {/* B2B / B2C — almost two different kinds. Toggle re-scopes every analytic + the table below. */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 0, border: `1px solid ${F.borderStrong}`, borderRadius: 999, overflow: "hidden" }}>
            {[["all", "All"], ["B2B", "B2B"], ["B2C", "B2C"]].map(([v, lbl]) => (
              <button key={v} onClick={() => setAud(v)} style={{ padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", background: aud === v ? F.plum : F.surface, color: aud === v ? F.paper : F.plum, fontFamily: "inherit" }}>{lbl}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["B2B", audCounts.B2B, F.plum], ["Both", audCounts.Both, F.orange], ["B2C", audCounts.B2C, F.pink]].map(([lbl, n, c]) => (
              <span key={lbl} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: F.plum, background: F.bg, border: `1px solid ${F.border}`, borderRadius: 999, padding: "3px 11px" }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />{lbl} · {n}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 18 }}>
          {[
            { n: `${total}`, l: "Tools tracked", c: F.plum },
            { n: `${eduN}`, sub: pctOf(eduN), l: "Education-sector", c: F.yellow },
            { n: `${freemiumN}`, sub: pctOf(freemiumN), l: "Run a free tier", c: F.green },
            { n: `${bundledN}`, sub: pctOf(bundledN), l: "Bundle AI · no surcharge", c: F.orange },
            { n: `${usageOutcomeN}`, sub: pctOf(usageOutcomeN), l: "Usage / outcome priced", c: F.pink },
          ].map((s, i) => (
            <div key={i} style={{ background: F.bg, border: `1px solid ${F.border}`, borderTop: `3px solid ${s.c}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: F.plum, lineHeight: 1 }}>{s.n}{s.sub ? <span style={{ fontSize: 12, fontWeight: 700, color: F.muted2 }}> · {s.sub}</span> : null}</div>
              <div style={{ fontSize: 11, color: F.muted, marginTop: 5, fontWeight: 600 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }} className="ws-grid">
          <div>
            <div style={{ ...sectionTitle, marginBottom: 10 }}>By sector <span style={{ color: F.muted2, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>· what kind of system schools touch</span></div>
            {sectorBars.length > 0
              ? <VizBars data={sectorBars} accent={F.pink} highlightTop />
              : <div style={{ fontSize: 12.5, color: F.muted, fontStyle: "italic" }}>No competitors tracked yet.</div>}
          </div>
          <div>
            <div style={{ ...sectionTitle, marginBottom: 10 }}>How they charge for AI <span style={{ color: F.muted2, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>· tools per model (some use more than one)</span></div>
            {modelBars.length > 0
              ? <VizBars data={modelBars} accent={F.lightPlum} highlightTop />
              : <div style={{ fontSize: 12.5, color: F.muted, fontStyle: "italic" }}>No competitors tracked yet.</div>}
          </div>
        </div>
      </div>

      {/* ── Executive summary: "What this tells us" — landing card pinned to the top ── */}
      <div style={{ ...card, borderLeft: `4px solid ${F.pink}`, padding: "20px 24px", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.12em", padding: "3px 10px", borderRadius: 4, background: F.yellow, color: F.plum, textTransform: "uppercase" }}>★ What this tells us</span>
          <span style={{ fontSize: 11, color: F.muted2, fontStyle: "italic" }}>Synthesis of the {total} competitors below — editable</span>
        </div>
        <textarea
          value={summary.headline || ""}
          onChange={e => setSummary({ headline: e.target.value })}
          rows={2}
          placeholder="One-line takeaway…"
          style={{ width: "100%", border: "none", background: "transparent", color: F.plum, fontSize: 17, fontWeight: 700, lineHeight: 1.4, fontFamily: "inherit", outline: "none", resize: "vertical", padding: "0 0 14px", borderBottom: `1px solid ${F.border}`, marginBottom: 16 }}
        />

        <div className="ws-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { key: "patterns", title: "What the data shows", placeholder: "Pattern observed across the competitors below…" },
            { key: "implications", title: "What we should do", placeholder: "Implication for Faria's monetization model…" },
          ].map(col => (
            <div key={col.key} className="ws-col-card">
              <div style={{ ...sectionTitle, marginBottom: 8 }}>{col.title}</div>
              {(summary[col.key] || []).map((row, i) => (
                <div key={i} className="ws-bullet-row">
                  <span style={{ color: F.pink, fontSize: 13, lineHeight: 1.5, paddingTop: 2, flexShrink: 0 }}>◆</span>
                  <textarea
                    value={row}
                    onChange={e => setSummaryRow(col.key, i, e.target.value)}
                    placeholder={col.placeholder}
                    rows={2}
                    style={{ flex: 1, border: "none", background: "transparent", color: F.plum, fontSize: 12.5, lineHeight: 1.5, fontFamily: "inherit", outline: "none", resize: "vertical", padding: "2px 0", minWidth: 0 }}
                  />
                  <button onClick={() => removeSummaryRow(col.key, i)} title="Remove" style={{ width: 20, height: 20, borderRadius: 10, border: "none", background: "transparent", color: F.muted2, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0, fontFamily: "inherit" }}>×</button>
                </div>
              ))}
              <button onClick={() => addSummaryRow(col.key)} style={{ marginTop: 8, padding: "5px 11px", borderRadius: 7, border: `1px dashed ${F.borderStrong}`, background: "transparent", color: F.plum, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Add row</button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, background: `${F.lightYellow}66`, border: `1px solid ${F.lightYellow}`, borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>⚠</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: F.plum, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Watch out</div>
            <textarea
              value={summary.watchout || ""}
              onChange={e => setSummary({ watchout: e.target.value })}
              rows={2}
              placeholder="Counter-trend, blind spot, or the next-cycle move worth flagging…"
              style={{ width: "100%", border: "none", background: "transparent", color: F.plum, fontSize: 12.5, lineHeight: 1.55, fontFamily: "inherit", outline: "none", resize: "vertical", padding: 0 }}
            />
          </div>
        </div>
      </div>

      {/* Comparative table — at-a-glance scan of all competitors. Click any row to expand its card below. */}
      {comp.competitors.length > 0 && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div style={sectionTitle}>Comparative table{aud !== "all" ? ` · ${aud}` : ""}</div>
            <span style={{ fontSize: 11, color: F.muted2, fontStyle: "italic" }}>Grouped B2B → Both → B2C · click a row for details below</span>
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
                {[...scoped].sort((a, b) => ({ B2B: 0, Both: 1, B2C: 2 }[audienceOf(a)] - { B2B: 0, Both: 1, B2C: 2 }[audienceOf(b)])).map((c, i, arr) => {
                  const ac = audienceOf(c);
                  const acColor = ac === "B2C" ? F.pink : ac === "Both" ? F.orange : F.plum;
                  return (
                  <tr
                    key={c.id}
                    className="comp-row"
                    onClick={() => openAndScrollTo(c.id)}
                    style={{
                      borderBottom: i === arr.length - 1 ? "none" : `1px solid ${F.border}`,
                      cursor: "pointer",
                      background: i % 2 === 0 ? F.surface : F.bg,
                    }}
                  >
                    <td style={{ padding: "12px 14px", color: F.plum, fontWeight: 700, verticalAlign: "top" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        {c.name || <span style={{ color: F.muted2, fontStyle: "italic", fontWeight: 500 }}>(unnamed)</span>}
                        <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: acColor, color: F.paper, letterSpacing: "0.03em" }}>{ac}</span>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: F.muted2, marginTop: 3, textTransform: "none", letterSpacing: 0 }}>{sectorOf(c)}</div>
                    </td>
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
                ); })}
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

      {scoped.map(c => {
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
                <div>
                  <div style={lb}>Sector</div>
                  <select value={c.sector || COMP_SECTORS[c.id] || ""} onChange={e => updateCompetitor(c.id, { sector: e.target.value })} style={{ ...inp, width: "100%", cursor: "pointer" }}>
                    <option value="">— Select sector —</option>
                    {["Admissions & enrollment", "LMS / SIS", "Teaching & learning", "Productivity & general AI", "CRM, sales & support", "Other"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <div style={lb}>Audience</div>
                  <select value={c.audience || COMP_AUDIENCE[c.id] || ""} onChange={e => updateCompetitor(c.id, { audience: e.target.value })} style={{ ...inp, width: "100%", cursor: "pointer" }}>
                    <option value="">— Select audience —</option>
                    {["B2B", "B2C", "Both"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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
    const merged = mergeMarket(s);
    setMkt(merged);
    // Auto-expand any survey-backed entry so its key findings are visible.
    const surveyIds = merged.validations.filter(v => v.survey).map(v => v.id);
    if (surveyIds.length) setExpanded(prev => { const n = new Set(prev); surveyIds.forEach(id => n.add(id)); return n; });
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

  // ── Market Insights derivations (scoped to the active filter) ──
  // Pipeline donut: count filtered validations by stage.
  const stageMeta = [
    { key: "interested", label: "Interested", color: F.muted2 },
    { key: "piloting",   label: "Piloting",   color: F.yellow },
    { key: "live",       label: "Live",        color: F.green },
    { key: "committed",  label: "Committed",   color: F.lightPlum },
    { key: "declined",   label: "Declined",    color: F.pink },
  ];
  const pipelineSegs = stageMeta
    .map(s => ({ label: s.label, color: s.color, value: filtered.filter(v => v.stage === s.key).length }))
    .filter(s => s.value > 0);
  // Survey to feature in the dashboard: the most recent survey-backed validation in the filtered set.
  const surveyV = filtered.filter(v => v.survey).sort((a, b) => (b.survey.date || "").localeCompare(a.survey.date || ""))[0];
  const survey = surveyV?.survey;
  const fmtSurveyDate = (iso) => { if (!iso) return ""; const [y, m, d] = iso.split("-"); const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; return `${+d} ${M[+m - 1]} ${y}`; };
  const chartByKeyword = (kw) => survey?.charts.find(c => c.q.toLowerCase().includes(kw));
  const sentimentChart = chartByKeyword("how do you feel");
  const sellChart = chartByKeyword("easy or hard sell");
  const featuresChart = chartByKeyword("which ai feature");
  const painsChart = chartByKeyword("lose the most time");
  const wishChart = chartByKeyword("capability you want most");
  const trustChart = chartByKeyword("hesitate");
  const SENTIMENT_COLORS = { "Open but cautious": F.yellow, "Excited, want it now": F.green, "Skeptical": F.orange, "Neutral": F.muted2, "Uncomfortable": F.pink };
  const SELL_COLORS = { "Worth it with proof of time saved": F.yellow, "Hard sell internally": F.orange, "Easy, clear value": F.green, "Unlikely to be approved": F.pink };
  const withColors = (chart, map) => (chart ? chart.data.map(d => ({ label: d.label, value: d.value, color: map[d.label] || F.muted2 })) : []);
  const positivePct = sentimentChart ? Math.round(((sentimentChart.data.find(d => d.label.startsWith("Open"))?.value || 0) + (sentimentChart.data.find(d => d.label.startsWith("Excited"))?.value || 0)) / sentimentChart.data.reduce((s, d) => s + d.value, 0) * 100) : 0;
  // By-region donut: aggregate the region breakdown across EVERY survey-backed validation in scope
  // (each survey carries its own "region" chart), so multiple surveys roll up together. Fall back to
  // counting validations by their region field when no survey reports region.
  const REGION_PALETTE = [F.plum, F.pink, F.orange, F.yellow, F.green, F.lightPlum, F.muted2];
  const regionAcc = {};
  let regionFromSurvey = false;
  filtered.forEach(v => {
    const rc = v.survey?.charts?.find(c => c.q.toLowerCase().includes("region"));
    if (rc) { regionFromSurvey = true; rc.data.forEach(d => { regionAcc[d.label] = (regionAcc[d.label] || 0) + d.value; }); }
  });
  if (!regionFromSurvey) filtered.forEach(v => { if (v.region) regionAcc[v.region] = (regionAcc[v.region] || 0) + 1; });
  const regionData = Object.entries(regionAcc).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const regionTotal = regionData.reduce((s, d) => s + d.value, 0);
  const regionSegs = regionData.filter(d => d.value > 0).map((d, i) => ({ label: d.label, value: d.value, color: REGION_PALETTE[i % REGION_PALETTE.length] }));

  return (
    <>
      <style>{`@media (max-width: 720px) { .mkt-viz-grid { grid-template-columns: 1fr !important; } }`}</style>

      {/* ── Market Insights — data-viz dashboard over the entered validation data ── */}
      <div style={{ ...card, borderLeft: `4px solid ${F.pink}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", padding: "3px 10px", borderRadius: 4, background: F.yellow, color: F.plum, textTransform: "uppercase" }}>📊 Market Insights</span>
          <span style={{ fontSize: 11.5, color: F.muted2, fontStyle: "italic" }}>Live visualizations from the validation data{filter !== "All" ? ` · ${filter}` : ""}</span>
        </div>

        {filtered.length === 0 && (
          <div style={{ fontSize: 13, color: F.muted, fontStyle: "italic" }}>No validations {filter !== "All" ? `for ${filter} ` : ""}yet — add one below and insights will appear here.</div>
        )}

        {filtered.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: survey ? "minmax(0,1fr) minmax(0,1fr)" : "1fr", gap: 18, alignItems: "start" }} className="mkt-viz-grid">
            {/* By region (always available) */}
            <div style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ ...sectionTitle, marginBottom: 12 }}>By region{regionSegs.length ? <span style={{ color: F.muted2, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}> · {regionTotal} {regionFromSurvey ? "responses" : "logged"}</span> : ""}</div>
              {regionSegs.length > 0
                ? <VizDonut segments={regionSegs} centerLabel={regionSegs.length} centerSub="REGIONS" />
                : <div style={{ fontSize: 12.5, color: F.muted, fontStyle: "italic" }}>No region data yet.</div>}
            </div>

            {survey && sentimentChart && (
              <div style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ ...sectionTitle, marginBottom: 12 }}>Sentiment toward AI <span style={{ color: F.green }}>· {positivePct}% positive</span></div>
                <VizDonut segments={withColors(sentimentChart, SENTIMENT_COLORS)} centerLabel={`${positivePct}%`} centerSub="POSITIVE" />
              </div>
            )}
          </div>
        )}

        {survey && (
          <>
            {/* Headline strip */}
            <div style={{ marginTop: 18, marginBottom: 4, display: "flex", flexWrap: "wrap", gap: "6px 10px", alignItems: "center", fontSize: 12, color: F.muted }}>
              <span style={{ fontWeight: 800, color: F.plum }}>{survey.event}</span>
              {[`${survey.participants} ${survey.unit || "schools"}`, survey.location, fmtSurveyDate(survey.date), `${positivePct}% positive`, `${sellChart?.data.find(d => d.label.startsWith("Unlikely"))?.value ?? 0} "unlikely to be approved"`].map((s, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ color: F.borderStrong }}>·</span>{s}</span>
              ))}
            </div>

            {/* Pain → Demand alignment */}
            {painsChart && featuresChart && (
              <div style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, padding: "14px 16px", marginTop: 14 }}>
                <div style={{ ...sectionTitle, marginBottom: 4 }}>Pain → demand alignment</div>
                <p style={{ margin: "0 0 12px", fontSize: 11.5, color: F.muted, fontStyle: "italic" }}>What costs the most time lines up with what schools most want AI to do.</p>
                <VizAlignment
                  leftTitle="Biggest time-sinks"
                  left={[...painsChart.data].filter(d => d.value > 0).slice(0, 4).map(d => ({ label: d.label, value: d.value }))}
                  rightTitle="Most-wanted AI"
                  right={featuresChart.data.slice(0, 4).map(d => ({ label: d.label, value: d.value }))}
                />
              </div>
            )}

            {/* Most-wanted capability (open text → themes + verbatims) */}
            {wishChart && (
              <div style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, padding: "14px 16px", marginTop: 14 }}>
                <div style={{ ...sectionTitle, marginBottom: 4 }}>What they asked for, unprompted <span style={{ color: F.muted2, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>· {wishChart.sub}</span></div>
                <p style={{ margin: "0 0 12px", fontSize: 11.5, color: F.muted, fontStyle: "italic" }}>"One AI capability you want most in the next 12 months" — open responses, grouped.</p>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,0.9fr)", gap: 18, alignItems: "start" }} className="mkt-viz-grid">
                  <VizBars data={wishChart.data} accent={F.lightPlum} highlightTop />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>In their words</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {wishChart.quotes.map((q, i) => (
                        <div key={i} style={{ fontSize: 12, color: F.plum, fontStyle: "italic", lineHeight: 1.4, paddingLeft: 11, borderLeft: `3px solid ${F.lightPink}` }}>"{q}"</div>
                      ))}
                    </div>
                  </div>
                </div>
                {wishChart.tail && <div style={{ marginTop: 12, fontSize: 11, color: F.muted2, fontStyle: "italic", lineHeight: 1.5 }}>{wishChart.tail}</div>}
              </div>
            )}

            {/* Feature demand + sell-readiness */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 14 }} className="mkt-viz-grid">
              {featuresChart && (
                <div style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ ...sectionTitle, marginBottom: 12 }}>Most-wanted AI features <span style={{ color: F.muted2, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>· {featuresChart.sub}</span></div>
                  <VizBars data={featuresChart.data} accent={F.lightPlum} highlightTop />
                </div>
              )}
              {sellChart && (
                <div style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ ...sectionTitle, marginBottom: 12 }}>Easy or hard sell?</div>
                  <VizMeter segments={withColors(sellChart, SELL_COLORS)} />
                  {painsChart && (
                    <>
                      <div style={{ ...sectionTitle, margin: "18px 0 12px" }}>Where teams lose the most time <span style={{ color: F.muted2, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>· ranked #1</span></div>
                      <VizBars data={painsChart.data.filter(d => d.value > 0)} accent={F.orange} highlightTop />
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Trust barriers */}
            {trustChart && (
              <div style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, padding: "14px 16px", marginTop: 14 }}>
                <div style={{ ...sectionTitle, marginBottom: 12 }}>Trust barriers to design around <span style={{ color: F.muted2, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>· {trustChart.sub}</span></div>
                <VizTags data={trustChart.data} tail={trustChart.tail} />
              </div>
            )}
          </>
        )}
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
              {v.survey && <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 4, background: F.yellow, color: F.plum, textTransform: "uppercase", letterSpacing: "0.05em" }}>📊 Survey · {v.survey.participants} {v.survey.unit || "schools"}</span>}
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: F.bg, color: F.muted, textTransform: "uppercase", letterSpacing: "0.05em", border: `1px solid ${F.border}` }}>{v.product}</span>
              {v.region && <span style={{ fontSize: 11, color: F.muted }}>{v.region}</span>}
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: stageColor(v.stage), color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>{v.stage}</span>
            </div>

            {open && v.survey && (
              <div style={{ marginTop: 16, background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ ...sectionTitle, marginBottom: 10 }}>Key findings</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  {(v.survey.keyFindings || [
                    { k: "Top time-sinks", v: "Chasing docs · family inquiries" },
                    { k: "Top ask", v: "Draft family replies (33/49)" },
                    { k: "Sentiment", v: "~90% positive" },
                    { k: "Sell", v: "0 \"unlikely to be approved\"" },
                    { k: "Top barrier", v: "Security · impersonality" },
                  ]).map((s, i) => (
                    <div key={i} style={{ background: F.surface, border: `1px solid ${F.border}`, borderRadius: 8, padding: "9px 11px" }}>
                      <div style={{ fontSize: 9.5, fontWeight: 800, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{s.k}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: F.plum, lineHeight: 1.3 }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 11.5, color: F.muted, fontStyle: "italic" }}>Full charts in <strong style={{ color: F.pink, fontStyle: "normal" }}>📊 Market Insights ↑</strong></div>
              </div>
            )}

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
  const setUsageModel = (p, k, v) => setFin(prev => ({ ...prev, usageInputs: { ...prev.usageInputs, [p]: { ...prev.usageInputs[p], [k]: v } } }));
  const setFTB = (k, v) => setFin(prev => ({ ...prev, freeTierBudget: { ...prev.freeTierBudget, [k]: v === "" ? 0 : (parseFloat(v) || 0) } }));
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

  // ── AI cost pulled from the Usage cost lab (monz.costLab + monz.modelCosts) ──
  const fModelById = Object.fromEntries((monz.modelCosts || []).map(m => [m.id, m]));
  const runCost = (row, modelId) => { const m = fModelById[modelId]; if (!m || !row) return 0; return (row.inputTokens || 0) / 1e6 * m.inPer1M + (row.outputTokens || 0) / 1e6 * m.outPer1M; };
  const labRows = (prod) => (monz.costLab || []).filter(r => r.product === prod);
  // Avg cost per action across a product's features (run cost × runs/action), free or pro model.
  const avgCostPerAction = (prod, tier) => {
    const rows = labRows(prod); if (!rows.length) return 0;
    const sum = rows.reduce((s, r) => s + runCost(r, tier === "pro" ? r.proModelId : r.freeModelId) * (r.runsPerAction || 1), 0);
    return sum / rows.length;
  };
  // Shared infra/support spread per school per month (infra split across products; support /12).
  const overheadPerSchoolMo = (fin.costInputs.monthlyInfraCost / MONZ_PRODUCTS.length) + ((fin.costInputs.supportCostPerCustomer || 0) / 12);
  const aiCostPerSchool = (prod, tier) => ((fin.usageInputs[prod] || {})[tier === "pro" ? "proActionsPerSchoolMonth" : "essActionsPerSchoolMonth"] || 0) * avgCostPerAction(prod, tier === "pro" ? "pro" : "free");
  // Full monthly cost per school (AI + shared overhead) — used by uptake scenarios.
  const costPerSchool = (prod, tier) => aiCostPerSchool(prod, tier) + overheadPerSchoolMo;
  const fmtMoney = (n) => isFinite(n) ? `$${n.toFixed(2)}` : "—";
  const fmtPct = (n) => isFinite(n) ? `${n.toFixed(0)}%` : "—";
  // Free-tier budget → per-school/month allowance (engineer's "comfortable spend ÷ schools" method).
  const ftb = fin.freeTierBudget || { annualSpendUSD: 0, schools: 0 };
  const ftbMonthlyPot = (ftb.annualSpendUSD || 0) / 12;
  const ftbPerSchoolMo = ftb.schools > 0 ? ftbMonthlyPot / ftb.schools : 0;
  const ftbPerSchoolYr = ftb.schools > 0 ? (ftb.annualSpendUSD || 0) / ftb.schools : 0;

  return (
    <>
      {/* Free-tier budget calculator — comfortable annual spend ÷ schools → per-school/month allowance */}
      <div style={{ ...card, borderLeft: `4px solid ${F.yellow}` }}>
        <div style={sectionTitle}>Free-tier budget · what we're comfortable giving away</div>
        <p style={{ margin: "-2px 0 14px", fontSize: 12.5, color: F.muted, lineHeight: 1.5, maxWidth: 820 }}>Start from a number that wouldn't bother finance, then divide by schools to get the per-school allowance. Run it as a <strong>shared pot</strong> — power users draw more, light users less — so the per-school figure is an average, not a hard cap.</p>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={lb}>Comfortable annual spend (USD)</div>
            <input type="number" min="0" value={ftb.annualSpendUSD || ""} placeholder="10000" onChange={e => setFTB("annualSpendUSD", e.target.value)} style={{ ...inp, width: 140 }} />
          </div>
          <div>
            <div style={lb}>Schools on free tier</div>
            <input type="number" min="0" value={ftb.schools || ""} placeholder="1000" onChange={e => setFTB("schools", e.target.value)} style={{ ...inp, width: 120 }} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { l: "Monthly pot", v: fmtMoney(ftbMonthlyPot), c: F.plum },
              { l: "Per school / yr", v: fmtMoney(ftbPerSchoolYr), c: F.plum },
              { l: "Per school / mo", v: fmtMoney(ftbPerSchoolMo), c: F.green },
            ].map((s, i) => (
              <div key={i} style={{ background: F.bg, border: `1px solid ${F.border}`, borderTop: `3px solid ${s.c}`, borderRadius: 10, padding: "10px 14px", minWidth: 110 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: F.plum, lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 10.5, color: F.muted, marginTop: 4, fontWeight: 600 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 11.5, color: F.muted2, fontStyle: "italic" }}>Size this against the <strong style={{ color: F.pink }}>Usage → cost lab</strong>: at the per-school/mo allowance, how many runs of each feature does the free model buy?</p>
      </div>

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
        <div style={sectionTitle}>Shared costs · spread per school</div>
        <p style={{ margin: "-2px 0 12px", fontSize: 11.5, color: F.muted, fontStyle: "italic" }}>Non-AI overheads. Per-model AI cost is set on the <strong style={{ color: F.pink }}>Usage</strong> page now — this is just infra + support.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <div>
            <div style={lb}>Monthly infra cost (USD)</div>
            <input type="number" min="0" step="1" value={fin.costInputs.monthlyInfraCost || ""} placeholder="0" onChange={e => setCost("monthlyInfraCost", e.target.value)} style={numInp} />
          </div>
          <div>
            <div style={lb}>Support · per customer / year (USD)</div>
            <input type="number" min="0" step="1" value={fin.costInputs.supportCostPerCustomer || ""} placeholder="0" onChange={e => setCost("supportCostPerCustomer", e.target.value)} style={numInp} />
          </div>
          <div style={{ alignSelf: "end" }}>
            <div style={lb}>= Shared cost / school / mo</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: F.plum }}>{fmtMoney(overheadPerSchoolMo)}</div>
          </div>
        </div>
      </div>

      {/* Per-product economics — the headline P&L: revenue vs AI cost (pulled from Usage) */}
      <div style={{ ...card, borderLeft: `4px solid ${F.green}` }}>
        <div style={sectionTitle}>Per-product economics · net per school after AI cost</div>
        <p style={{ margin: "-2px 0 12px", fontSize: 12.5, color: F.muted, lineHeight: 1.5, maxWidth: 860 }}>What we net (or lose) per school at the current Pro price. <strong>AI cost is pulled live from Usage → cost lab</strong> — the avg cost/action across each product's features. Edit feature tokens & models on the Usage page; set the price in SKUs above; set expected actions/school/mo here.</p>
        <div style={{ overflowX: "auto", border: `1px solid ${F.border}`, borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 820 }}>
            <thead>
              <tr style={{ background: F.bg }}>
                {[["Product", "left"], ["Revenue / school / mo", "right"], ["Pro actions / school / mo", "right"], ["Cost / action (Usage)", "right"], ["AI cost / school / mo", "right"], ["Net / school / mo", "right"], ["Margin %", "right"]].map(([h, a]) => (
                  <th key={h} style={{ textAlign: a, padding: "8px 10px", fontSize: 10, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${F.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MONZ_PRODUCTS.map(p => {
                const u = fin.usageInputs[p] || {};
                const hasFeatures = labRows(p).length > 0;
                const price = monz.products[p]?.price || 0;
                const rev = price / 12;
                const cpa = avgCostPerAction(p, "pro");
                const aiCost = aiCostPerSchool(p, "pro");
                const net = rev - aiCost - overheadPerSchoolMo;
                const marginPct = rev > 0 ? (net / rev) * 100 : NaN;
                return (
                  <tr key={p} style={{ borderBottom: `1px solid ${F.border}` }}>
                    <td style={{ padding: "7px 10px", color: F.plum, fontWeight: 700, whiteSpace: "nowrap" }}>{p}{!hasFeatures && <span style={{ fontSize: 10, color: F.muted2, fontWeight: 500 }}> · no features</span>}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: F.muted }}>{fmtMoney(rev)}</td>
                    <td style={{ padding: "5px 10px", textAlign: "right" }}><input type="number" min="0" value={u.proActionsPerSchoolMonth || ""} placeholder="0" onChange={e => setUsage(p, "proActionsPerSchoolMonth", e.target.value)} style={{ ...inp, width: 80, textAlign: "right", padding: "5px 7px", fontSize: 12 }} /></td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: F.muted }}>{hasFeatures ? fmtMoney(cpa) : "—"}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: F.plum, fontWeight: 700 }}>{fmtMoney(aiCost)}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: net >= 0 ? F.green : F.pink, fontWeight: 800 }}>{fmtMoney(net)}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: marginPct >= 0 ? F.green : F.pink, fontWeight: 800 }}>{isFinite(marginPct) ? fmtPct(marginPct) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 11.5, color: F.muted2, fontStyle: "italic" }}>Net also subtracts the shared cost of {fmtMoney(overheadPerSchoolMo)}/school/mo (above). Green = profit, pink = loss at this price.</p>

        {/* Free-tier giveaway cost */}
        <div style={{ marginTop: 16, background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, padding: "13px 15px" }}>
          <div style={{ ...sectionTitle, marginBottom: 8 }}>Free-tier giveaway · AI cost / school / mo</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MONZ_PRODUCTS.filter(p => labRows(p).length > 0).map(p => {
              const u = fin.usageInputs[p] || {};
              const freeCost = aiCostPerSchool(p, "free");
              const over = freeCost > ftbPerSchoolMo && ftbPerSchoolMo > 0;
              return (
                <div key={p} style={{ background: F.surface, border: `1px solid ${over ? F.pink : F.border}`, borderRadius: 9, padding: "9px 12px", minWidth: 150 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: F.plum, marginBottom: 4 }}>{p}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="number" min="0" value={u.essActionsPerSchoolMonth || ""} placeholder="0" onChange={e => setUsage(p, "essActionsPerSchoolMonth", e.target.value)} style={{ ...inp, width: 56, textAlign: "right", padding: "4px 6px", fontSize: 12 }} />
                    <span style={{ fontSize: 10.5, color: F.muted2 }}>free acts/mo</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: over ? F.pink : F.green, marginTop: 5 }}>{fmtMoney(freeCost)}<span style={{ fontSize: 10, color: F.muted2, fontWeight: 600 }}> /school/mo</span></div>
                </div>
              );
            })}
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 11.5, color: F.muted2, fontStyle: "italic" }}>Compare against the free-tier allowance of {fmtMoney(ftbPerSchoolMo)}/school/mo (top). <span style={{ color: F.pink }}>Pink</span> = the giveaway exceeds the allowance — push those features to cheaper models or smaller caps.</p>
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
function FairUseExample({ monz, setMonz, deepRoute, setDeepRoute }) {
  const card = { background: F.surface, border: `1px solid ${F.border}`, borderRadius: 12, padding: "18px 22px", marginBottom: 18, boxShadow: F.shadowSm };
  const sectionTitle = { fontSize: 11, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 };
  const th = { textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${F.border}`, whiteSpace: "nowrap" };
  const td = { padding: "7px 10px", fontSize: 12.5, color: F.plum, verticalAlign: "middle", borderBottom: `1px solid ${F.border}` };
  const numInp = { ...inp, width: 78, padding: "5px 7px", fontSize: 12 };
  const selInp = { ...inp, padding: "5px 7px", fontSize: 12, cursor: "pointer", maxWidth: 150 };

  const models = monz.modelCosts || [];
  const modelById = Object.fromEntries(models.map(m => [m.id, m]));
  const lab = monz.costLab || [];

  const [selFeat, setSelFeat] = useState(null);    // costLab row id whose model comparison is shown
  const [allowance, setAllowance] = useState(0.85); // $/school/month free-tier allowance to test

  const focusedProduct = SLUG_PRODUCT[deepRoute] || null; // null = Overview
  const setFocusedProduct = (prod) => { setSelFeat(null); setDeepRoute(prod ? (PRODUCT_SLUG[prod] || "") : ""); };

  const costPerRun = (row, modelId) => {
    const m = modelById[modelId]; if (!m || !row) return 0;
    return (row.inputTokens || 0) / 1e6 * m.inPer1M + (row.outputTokens || 0) / 1e6 * m.outPer1M;
  };
  const fmtUSD = (n) => n >= 1 ? `$${n.toFixed(2)}` : n >= 0.01 ? `${(n * 100).toFixed(1)}¢` : `${(n * 100).toFixed(3)}¢`;
  const tierColor = (t) => t === "frontier" ? F.plum : t === "mid" ? F.orange : F.green;

  const setModelCost = (id, patch) => setMonz(prev => ({ ...prev, modelCosts: (prev.modelCosts || []).map(m => m.id === id ? { ...m, ...patch } : m) }));
  const setLabRow = (id, patch) => setMonz(prev => ({ ...prev, costLab: (prev.costLab || []).map(r => r.id === id ? { ...r, ...patch } : r) }));
  const setRationale = (i, val) => setMonz(prev => ({ ...prev, leadingModelRationale: prev.leadingModelRationale.map((r, ix) => ix === i ? val : r) }));
  const addRationale = () => setMonz(prev => ({ ...prev, leadingModelRationale: [...(prev.leadingModelRationale || []), ""] }));
  const removeRationale = (i) => setMonz(prev => ({ ...prev, leadingModelRationale: prev.leadingModelRationale.filter((_, ix) => ix !== i) }));

  const modelOptions = models.map(m => <option key={m.id} value={m.id}>{m.name}</option>);
  const labProducts = MONZ_PRODUCTS.filter(p => lab.some(r => r.product === p));

  // ── product chip nav (Overview + products that have AI features) ──
  const chip = (label, prod, active) => (
    <button key={label} onClick={() => setFocusedProduct(prod)} style={{ padding: "5px 13px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", background: active ? F.plum : F.surface, color: active ? F.paper : F.plum, border: `1px solid ${active ? F.plum : F.borderStrong}`, fontFamily: "inherit" }}>{label}</button>
  );
  const chipNav = (
    <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
      {chip("Overview", null, !focusedProduct)}
      {labProducts.map(p => chip(p, p, focusedProduct === p))}
      <span style={{ fontSize: 11, color: F.muted2, marginLeft: 4 }}>· pick a product to price each AI feature across models</span>
    </div>
  );

  // ── PER-PRODUCT: AI feature cost lab ──
  const renderProduct = () => {
    const rows = lab.filter(r => r.product === focusedProduct);
    const withCost = rows.map(r => ({ r, free: costPerRun(r, r.freeModelId), pro: costPerRun(r, r.proModelId) }));
    const sortedByPro = [...withCost].filter(x => x.pro > 0).sort((a, b) => b.pro - a.pro);
    const priciest = sortedByPro[0];
    const cheapest = sortedByPro[sortedByPro.length - 1];
    const sel = rows.find(r => r.id === selFeat);

    return (
      <>
        {/* header strip */}
        <div style={{ ...card, borderLeft: `4px solid ${F.pink}` }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: F.plum }}>{focusedProduct}</span>
            <span style={{ fontSize: 12, color: F.muted2 }}>AI feature cost lab · {rows.length} features</span>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 12.5, color: F.muted, lineHeight: 1.5, maxWidth: 820 }}>Each feature prices independently — set its token estimates and pick a <strong style={{ color: F.green }}>free</strong> (cheap/open) and <strong style={{ color: F.plum }}>Pro</strong> (frontier) model. Calibrate token counts from the FAIF playground; cost = in·$/M + out·$/M, per run.</p>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...lb, marginBottom: 0 }}>Free-tier allowance to test</span>
              <span style={{ fontSize: 13, color: F.muted }}>$</span>
              <input type="number" step="0.05" value={allowance} onChange={e => setAllowance(Math.max(0, +e.target.value))} style={{ ...numInp, width: 70 }} />
              <span style={{ fontSize: 12, color: F.muted2 }}>/school/mo</span>
            </div>
            <span style={{ fontSize: 11, color: F.muted2, fontStyle: "italic" }}>Set the real budget in Finance → free-tier calculator.</span>
          </div>
          {priciest && cheapest && (
            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: F.plum, background: F.bg, border: `1px solid ${F.border}`, borderRadius: 8, padding: "5px 10px" }}>Priciest (Pro): {priciest.r.feature} · {fmtUSD(priciest.pro)}/run</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: F.plum, background: F.bg, border: `1px solid ${F.border}`, borderRadius: 8, padding: "5px 10px" }}>Cheapest (Pro): {cheapest.r.feature} · {fmtUSD(cheapest.pro)}/run</span>
            </div>
          )}
        </div>

        {/* feature cost-lab table */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, flexWrap: "wrap" }}>
            <div style={sectionTitle}>Cost per feature</div>
            <span style={{ fontSize: 11, color: F.muted2, fontStyle: "italic" }}>Click a row to compare it across all models ↓</span>
          </div>
          <div style={{ overflowX: "auto", border: `1px solid ${F.border}`, borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
              <thead><tr style={{ background: F.bg }}>
                <th style={th}>Feature</th>
                <th style={th}>In tok</th>
                <th style={th}>Out tok</th>
                <th style={th}>Runs/action</th>
                <th style={th}>Free model</th>
                <th style={th}>Pro model</th>
                <th style={{ ...th, textAlign: "right" }}>Cost/run (free)</th>
                <th style={{ ...th, textAlign: "right" }}>Cost/run (pro)</th>
                <th style={{ ...th, textAlign: "right" }}>Cost/action (pro)</th>
                <th style={{ ...th, textAlign: "right" }}>Runs/mo on free</th>
              </tr></thead>
              <tbody>
                {withCost.map(({ r, free, pro }) => {
                  const active = selFeat === r.id;
                  const runsMo = free > 0 ? Math.floor(allowance / free) : 0;
                  return (
                    <tr key={r.id} onClick={() => setSelFeat(active ? null : r.id)} style={{ cursor: "pointer", background: active ? F.lightYellow + "55" : "transparent" }}>
                      <td style={{ ...td, fontWeight: 700, whiteSpace: "nowrap" }}>{r.feature}</td>
                      <td style={td}><input type="number" value={r.inputTokens} onClick={e => e.stopPropagation()} onChange={e => setLabRow(r.id, { inputTokens: +e.target.value })} style={numInp} /></td>
                      <td style={td}><input type="number" value={r.outputTokens} onClick={e => e.stopPropagation()} onChange={e => setLabRow(r.id, { outputTokens: +e.target.value })} style={numInp} /></td>
                      <td style={td}><input type="number" value={r.runsPerAction} onClick={e => e.stopPropagation()} onChange={e => setLabRow(r.id, { runsPerAction: Math.max(1, +e.target.value) })} style={{ ...numInp, width: 58 }} /></td>
                      <td style={td}><select value={r.freeModelId} onClick={e => e.stopPropagation()} onChange={e => setLabRow(r.id, { freeModelId: e.target.value })} style={selInp}>{modelOptions}</select></td>
                      <td style={td}><select value={r.proModelId} onClick={e => e.stopPropagation()} onChange={e => setLabRow(r.id, { proModelId: e.target.value })} style={selInp}>{modelOptions}</select></td>
                      <td style={{ ...td, textAlign: "right", color: F.green, fontWeight: 700 }}>{fmtUSD(free)}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{fmtUSD(pro)}</td>
                      <td style={{ ...td, textAlign: "right" }}>{fmtUSD(pro * (r.runsPerAction || 1))}</td>
                      <td style={{ ...td, textAlign: "right", color: runsMo < 5 ? F.pink : F.muted }}>{runsMo.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: F.muted2, fontStyle: "italic" }}>"Runs/mo on free" = the ${allowance.toFixed(2)}/school/mo allowance ÷ the free-model cost/run. Features in <span style={{ color: F.pink }}>pink</span> burn the allowance fastest — gate those behind Pro.</div>
        </div>

        {/* selected feature: per-model comparison */}
        {sel && (
          <div style={card}>
            <div style={sectionTitle}>{sel.feature} — cost per run across all models</div>
            <VizBars
              data={[...models].map(m => ({ label: m.name, value: +(costPerRun(sel, m.id) * 100).toFixed(2) })).sort((a, b) => b.value - a.value)}
              accent={F.lightPlum}
              highlightTop
              valueSuffix="¢"
            />
            <div style={{ marginTop: 10, fontSize: 11.5, color: F.muted, lineHeight: 1.5 }}>Same prompt ({sel.inputTokens.toLocaleString()} in / {sel.outputTokens.toLocaleString()} out tokens), {models.length} models. The frontier ↔ open-source gap is the lever: run it free on the cheapest model, reserve the frontier model for Pro.</div>
          </div>
        )}
      </>
    );
  };

  // ── OVERVIEW: model table + cap strategy + requirements ──
  const capDims = [
    { t: "By tokens", sub: "crude", body: "Hard token budget per period. Precise to cost but opaque to users — they don't think in tokens.", who: "Engineering backstop" },
    { t: "By cost (USD)", sub: "finance-friendly", body: "A dollar budget per user/school/month. Maps straight to the bill — easiest to reason about for finance.", who: "Finance & caps" },
    { t: "By usage-based actions", sub: "user-friendly", body: "\"50 actions/month\" — one action may fan out to several model calls. Simplest mental model for schools.", who: "What users see" },
  ];
  const reqGroups = [
    { g: "Foundation — FAIF provides", chip: "✓ Ready", color: F.green, items: [
      "Uniform history API returns cost + tokens + region per request",
      "Session / chat ID ties every request back to the user that made it",
      "One-string model swap (frontier ↔ open-source); same request body",
      "Playground to test any prompt × model for real token + $ cost",
    ] },
    { g: "Product build — OpenApply / ManageBac", chip: "▢ To build", color: F.orange, items: [
      "Store a usage record per request: sessionID → userID → school → school group, model, in/out tokens, USD, operation, region, timestamp",
      "Pre-flight capacity check before each run (any allowance left?)",
      "Entitlement → model selection: free school → cheap model, Pro school → frontier",
      "Cap business rules per user / per school / per school group + shared pot",
      "Buy-more UI when an allowance runs low",
      "Hourly retro-build from the history API for front-end-only integrations (Atlas PHP / ManageBac JS)",
    ] },
    { g: "Cap controls", chip: "▢ To build", color: F.orange, items: [
      "Breaker — real-time rate limit (e.g. 100 requests/hour) that stops abuse",
      "Observability — alert when a user/school crosses a threshold, before the bill lands",
    ] },
    { g: "Analytics", chip: "▢ To build", color: F.orange, items: [
      "Spend per operation, by region / deployment; which AI features are hot vs cold",
    ] },
    { g: "Pricing inputs — this tracker", chip: "◐ In progress", color: F.pink, items: [
      "Model cost table, per-feature cost lab, and the free-tier budget calculator feed the caps & SKU pricing",
    ] },
  ];

  const renderOverview = () => (
    <>
      {/* model cost table */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, flexWrap: "wrap" }}>
          <div style={sectionTitle}>Model cost table</div>
          <span style={{ fontSize: 11, color: F.muted2, fontStyle: "italic" }}>USD per 1M tokens · editable estimates — verify exact Bedrock rates with the engineer</span>
        </div>
        <div style={{ overflowX: "auto", border: `1px solid ${F.border}`, borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead><tr style={{ background: F.bg }}>
              <th style={th}>Model</th><th style={th}>Tier</th>
              <th style={{ ...th, textAlign: "right" }}>$/M in</th>
              <th style={{ ...th, textAlign: "right" }}>$/M out</th>
              <th style={th}>Region</th><th style={th}>Notes</th>
            </tr></thead>
            <tbody>
              {models.map(m => (
                <tr key={m.id}>
                  <td style={{ ...td, fontWeight: 700, whiteSpace: "nowrap" }}>{m.name}</td>
                  <td style={td}>
                    <select value={m.tier} onChange={e => setModelCost(m.id, { tier: e.target.value })} style={{ ...selInp, color: tierColor(m.tier), fontWeight: 700 }}>
                      <option value="frontier">frontier</option><option value="mid">mid</option><option value="open">open</option>
                    </select>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}><input type="number" step="0.05" value={m.inPer1M} onChange={e => setModelCost(m.id, { inPer1M: +e.target.value })} style={{ ...numInp, width: 64, textAlign: "right" }} /></td>
                  <td style={{ ...td, textAlign: "right" }}><input type="number" step="0.05" value={m.outPer1M} onChange={e => setModelCost(m.id, { outPer1M: +e.target.value })} style={{ ...numInp, width: 64, textAlign: "right" }} /></td>
                  <td style={{ ...td, color: F.muted, whiteSpace: "nowrap" }}>{m.region}</td>
                  <td style={{ ...td, color: F.muted }}><input value={m.notes} onChange={e => setModelCost(m.id, { notes: e.target.value })} placeholder="—" style={{ ...inp, width: "100%", minWidth: 160, padding: "5px 7px", fontSize: 12 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* cap strategy */}
      <div style={card}>
        <div style={sectionTitle}>How to express the cap</div>
        <p style={{ margin: "-2px 0 12px", fontSize: 12.5, color: F.muted, lineHeight: 1.5, maxWidth: 820 }}>The same usage data can be capped three ways. Pick the dimension per audience — schools see <strong>actions</strong>, finance budgets in <strong>dollars</strong>, engineering enforces in <strong>tokens</strong>.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {capDims.map((c, i) => (
            <div key={i} style={{ background: F.bg, border: `1px solid ${F.border}`, borderTop: `3px solid ${F.plum}`, borderRadius: 10, padding: "13px 15px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: F.plum }}>{c.t}</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.sub}</span>
              </div>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: F.muted, lineHeight: 1.5 }}>{c.body}</p>
              <div style={{ fontSize: 11, fontWeight: 700, color: F.plum }}><span style={{ color: F.green }}>→</span> {c.who}</div>
            </div>
          ))}
        </div>

        {/* rationale (kept, retitled) */}
        <div style={{ marginTop: 16, background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ ...sectionTitle, marginBottom: 8 }}>Why a shared, action-based allowance</div>
          {(monz.leadingModelRationale || []).map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "5px 0" }}>
              <span style={{ color: F.pink, fontSize: 13, paddingTop: 3, flexShrink: 0 }}>◆</span>
              <textarea value={r} onChange={e => setRationale(i, e.target.value)} rows={1} style={{ flex: 1, border: "none", background: "transparent", color: F.plum, fontSize: 12.5, lineHeight: 1.5, fontFamily: "inherit", outline: "none", resize: "vertical", padding: "2px 0", minWidth: 0 }} />
              <button onClick={() => removeRationale(i)} title="Remove" style={{ width: 20, height: 20, borderRadius: 10, border: "none", background: "transparent", color: F.muted2, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0, fontFamily: "inherit" }}>×</button>
            </div>
          ))}
          <button onClick={addRationale} style={{ marginTop: 8, padding: "5px 11px", borderRadius: 7, border: `1px dashed ${F.borderStrong}`, background: "transparent", color: F.plum, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Add reason</button>
        </div>

        {/* breaker vs observability */}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <div style={{ background: F.bg, border: `1px solid ${F.border}`, borderLeft: `3px solid ${F.pink}`, borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: F.plum, marginBottom: 4 }}>🛑 Breaker</div>
            <p style={{ margin: 0, fontSize: 12, color: F.muted, lineHeight: 1.5 }}>Stops abuse in real time — e.g. "100 requests in an hour, chill out." The hard backstop against a runaway bill.</p>
          </div>
          <div style={{ background: F.bg, border: `1px solid ${F.border}`, borderLeft: `3px solid ${F.orange}`, borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: F.plum, marginBottom: 4 }}>📡 Observability</div>
            <p style={{ margin: 0, fontSize: 12, color: F.muted, lineHeight: 1.5 }}>Monitors and alerts when a user/school crosses a threshold — so we find out before the bill comes in, not after.</p>
          </div>
        </div>
      </div>

      {/* requirements & status */}
      <div style={card}>
        <div style={sectionTitle}>Usage-tracking system — requirements &amp; status</div>
        <p style={{ margin: "-2px 0 14px", fontSize: 12.5, color: F.muted, lineHeight: 1.5, maxWidth: 820 }}>What the FAIF proxy already gives us, and what the product teams need to build on top to ship caps + charging. Handoff checklist for the engineer + product devs.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reqGroups.map((grp, gi) => (
            <div key={gi} style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, padding: "13px 15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: F.plum }}>{grp.g}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: F.surface, background: grp.color, padding: "2px 9px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.04em" }}>{grp.chip}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {grp.items.map((it, ii) => (
                  <div key={ii} style={{ display: "flex", gap: 8, fontSize: 12, color: F.plum, lineHeight: 1.45 }}>
                    <span style={{ color: grp.color, flexShrink: 0, fontWeight: 800 }}>{grp.chip.startsWith("✓") ? "✓" : grp.chip.startsWith("◐") ? "◐" : "▢"}</span>{it}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <>
      <div style={{ ...card, borderLeft: `4px solid ${F.plum}` }}>
        <p style={{ margin: 0, fontSize: 13, color: F.muted, lineHeight: 1.55 }}>Price our AI features against real model costs so the free tier and Pro caps are grounded in numbers, not guesses. The model table below is the reference; pick a product to price each feature, and read the engineer-handoff checklist for the live usage-tracking system.</p>
      </div>
      {chipNav}
      {focusedProduct ? renderProduct() : renderOverview()}
    </>
  );
}

/* ── Product Lifecycle Page (top-level) ───────────────────
   The AI-first product-development loop: Prioritise → Build → Adopt,
   with schools at the core feeding adoption signal back into
   prioritisation. Overview shows a flow strip + 3 phase cards;
   selecting a phase via the URL slug (#/lifecycle/prioritise etc.)
   drops into that phase's full content (stages, activities,
   stakeholders, old-way → AI-first shift, schools-engagement model).
   Source content: ~/Desktop/faria-product-lifecycle2.html */
function PrioritizationPage({ subRoute, setSubRoute }) {
  const VALID_PHASES = ["prioritise", "build", "adopt"];
  const open = VALID_PHASES.includes(subRoute) ? subRoute : null;
  const setOpen = (p) => setSubRoute(p || "");
  // Hovered-phase drives the dynamic info panel below the cycle (and the spoke highlight in the SVG).
  const [hover, setHover] = useState(null);
  // Which cadence beat is expanded in the stages plotline (reset to 0 per phase).
  const [stageSel, setStageSel] = useState(0);
  // Which activity tile is hovered (drives the who/what/when/how/why panel). Reset per phase.
  const [actDetail, setActDetail] = useState(null);
  // Which "From signal to roadmap" step is selected (capture → activities, synthesise → tool, distill → steps).
  const [signalStep, setSignalStep] = useState("capture");
  // Which Distill & Decide step is focused (interactive stepper). Reset per phase.
  const [decideSel, setDecideSel] = useState(0);
  const topRef = useRef(null);
  const didMount = useRef(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && open) setOpen(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Smooth scroll to the top of the page when switching between the cycle and a phase
  // (skip the very first render so a deep-linked phase doesn't yank the page).
  useEffect(() => {
    setStageSel(0);
    setActDetail(null);
    setSignalStep("capture");
    setDecideSel(0);
    if (!didMount.current) { didMount.current = true; return; }
    // Jump to the very top of the page (the topbar is sticky, so nothing is hidden
    // behind it). Instant, not smooth — a slow animated scroll read as a "refresh".
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [open]);

  // Phase data — content faithful to the source HTML, no diagram math.
  const DATA = {
    prioritise: {
      accent: F.yellow, accentDark: "#E2A800", accentSoft: "rgba(247,211,95,0.28)",
      eyebrow: "Phase 01 · Set the revenue-driven direction", title: "Prioritise",
      lede: "Where Product leadership turns live revenue signal into the few bets that will win the year — ranked by ARR impact, expansion and retention, then sharpened quarter by quarter with Sales, Client Experience and our schools in the room.",
      horizon: "",
      parallel: null,
      stages: [
        { n: "Revenue-driven vision & themes", wk: "Annual → Monthly", p: "Product leadership, Sales and Client Experience agree the 3–5 themes that move ARR — new business, expansion and retention — then sharpen them each quarter and track monthly. Big revenue areas, not features yet.", tools: ["ARR targets", "Net revenue retention"] },
        { n: "Revenue & sales-signal review", wk: "Quarterly", p: "Pressure-test each theme against pipeline value, win/loss reasons, churn risk and expansion. If a bet doesn't move revenue, it doesn't make the cut.", tools: ["Salesforce", "Planhat"] },
        { n: "AI opportunity digest", wk: "Monthly", p: "A monthly AI digest unifies Salesforce (pipeline / win-loss), Pendo (product usage) and Planhat (health / expansion), scores opportunities by revenue impact × adoption gap, and ranks them by region — so the room starts from evidence, not opinion.", tools: ["Salesforce", "Pendo", "Planhat"] },
        { n: "Quarter re-cut & commit", wk: "Quarterly", p: "Themes move up or down by expected revenue impact. Commit the next quarter's focus and hand a clear, revenue-anchored brief to the build pods.", tools: ["Revenue-ranked roadmap"] },
      ],
      activities: [
        { ic: "📊", nm: "Annual strategy offsite", cad: "Yearly", d: "ExCo + Product leadership set the year's revenue targets and 3–5 themes.",
          detail: { who: "ExCo, Product leadership, VP Sales", what: "Set the annual ARR target and the 3–5 strategic themes to hit it.", when: "Once a year, at the start of the financial year.", how: "Workshop off trailing-year revenue, win/loss and the AI opportunity digest.", why: "Anchor every downstream bet to a revenue number." } },
        { ic: "📋", nm: "User-base survey", cad: "Annual / Semi-annual", d: "Structured survey across the user base, twice a year.",
          detail: { who: "Product + the wider school user base.", what: "A structured annual and semi-annual survey — quantified demand, sentiment and willingness-to-pay across the whole base, not just user-group schools.", when: "Annually, with a semi-annual pulse.", how: "SurveyMonkey survey sent to the user base (e.g. the UK user-group survey), results fed into the synthesis tool.", why: "Statistically meaningful demand signal to balance the always-on qualitative feedback." } },
        { ic: "💼", nm: "Quarterly Business Review", cad: "Quarterly", d: "Re-rank themes against revenue signal; commit the next quarter.",
          detail: { who: "Product leadership, Sales, Client Experience, Finance / RevOps", what: "Re-rank themes by revenue impact and commit the next quarter's focus.", when: "Each quarter.", how: "Review the AI digest + QBR deck; weight by pipeline, expansion and churn risk.", why: "Kill bets that aren't moving revenue before they consume a pod." } },
        { ic: "🏫", nm: "School advisory panel", cad: "Quarterly", d: "Core user-group schools review and rank the theme shortlist.",
          detail: { who: "Core user-group schools — school leaders and day-to-day users.", what: "Review the theme shortlist and rank what matters to them.", when: "Quarterly, plus always-on WhatsApp user-group chats.", how: "Panel sessions, the user-group conference, and WhatsApp groups.", why: "Commit to what schools will actually adopt and pay for." } },
        { ic: "📣", nm: "Monthly product day", cad: "Monthly", d: "Product shows what's shipping and gathers feedback from Sales, Support & CX.",
          detail: { who: "VP Product, Sales, Support, Client Experience.", what: "Product demos what's shipping and in-flight; the revenue teams feed back from the front line.", when: "Monthly.", how: "Live product walkthrough plus structured feedback captured straight into the prioritisation backlog.", why: "Two-way: keep the revenue teams current on the product, and pull their field signal into priorities." } },
        { ic: "📈", nm: "Salesforce", cad: "Continuous", d: "Pipeline, win/loss & revenue signal — always on.",
          detail: { who: "Auto-fed for Product leadership & RevOps.", what: "Open pipeline by stage / region / deal size, win-loss reasons, sales-cycle length, lost-deal feature gaps.", when: "Continuous.", how: "Piped into the AI synthesis tool (see From signal to roadmap).", why: "Rank opportunities by revenue at stake and see why deals are won or lost." } },
        { ic: "📊", nm: "Pendo", cad: "Continuous", d: "Product usage & adoption signal — always on.",
          detail: { who: "Auto-fed for Product leadership.", what: "Feature adoption & frequency, drop-off points, unused features, time-in-app by role, in-app feedback & NPS.", when: "Continuous.", how: "Piped into the AI synthesis tool.", why: "See what's actually used vs ignored, and where users get stuck." } },
        { ic: "💗", nm: "Planhat", cad: "Continuous", d: "Customer health & expansion signal — always on.",
          detail: { who: "Auto-fed for Product leadership & CS.", what: "Account health scores, renewal risk, expansion signals, engagement trends, CSM notes.", when: "Continuous.", how: "Piped into the AI synthesis tool.", why: "Tie themes to retention & expansion revenue and flag churn risk early." } },
        { ic: "💬", nm: "WhatsApp user-group feedback", cad: "Continuous", d: "Quick, on-the-fly feedback from schools on design choices and what we're building.",
          detail: { who: "Product + core user-group schools.", what: "Fast reactions to design choices, prototypes and ideas — in the flow of work.", when: "Continuous / on the fly.", how: "Always-on WhatsApp user-group chats with school users.", why: "Cheap, instant signal to course-correct before committing build effort." } },
        { ic: "📋", nm: "Feature request board", cad: "Continuous", d: "A custom board every stakeholder — internal and schools — uses to log and upvote requests.",
          detail: { who: "All stakeholders — internal teams and schools (external).", what: "A custom-built feature-request board where anyone logs, upvotes and comments on requests.", when: "Continuous / always open.", how: "One shared board, open internally and to schools; feeds the signal pool and the AI digest.", why: "One front door for demand — nothing gets lost in inboxes or chats." } },
        { ic: "🎙️", nm: "Discovery interviews", cad: "Monthly", d: "Standing cadence of 1:1 discovery calls with school teams.",
          detail: { who: "Product (PMs) + school teams across the user base.", what: "Regular problem-discovery interviews — how schools actually work, where they struggle.", when: "A few every month, on a rolling roster.", how: "Scheduled calls; notes auto-clustered into the signal pool.", why: "The backbone of continuous discovery — talk to users regularly, not just at events." } },
        { ic: "🖥️", nm: "Usability testing", cad: "Monthly", d: "Test prototypes and shipped flows with real school users.",
          detail: { who: "Product, design + school users.", what: "Watch schools use prototypes and live features; capture friction.", when: "Weekly, per design / slice in flight.", how: "Moderated sessions or async recordings; findings fed back to the pod.", why: "See what people do, not just what they say — before and after we build." } },
        { ic: "🔁", nm: "Win/loss & churn calls", cad: "Monthly", d: "Talk to schools we just won, lost or that churned.",
          detail: { who: "Product + Sales / Client Experience.", what: "Short interviews with recently won, lost and churned schools.", when: "Monthly, reviewing the recent won / lost / churned deals.", how: "Calls tied to Salesforce stage changes; themes into the signal pool.", why: "The sharpest signal on why we win, lose and lose-again." } },
        { ic: "🎧", nm: "Support & CX signal", cad: "Monthly", d: "Mine support tickets and CX themes for product signal.",
          detail: { who: "Product + Support / Client Experience.", what: "Recurring review of top support themes, bugs and CX escalations.", when: "Monthly review of the top support & CX themes.", how: "Tagged tickets + CX notes routed into the signal pool.", why: "The friction users hit every day is free, honest discovery." } },
      ],
      build_tools: "These activities are the inputs. How that signal becomes the roadmap — and the AI synthesis tool we need to build — is in \"From signal to roadmap\" below.",
      synthesis: {
        intro: "The activities above are how we capture signal. This is how that signal becomes the plan — and the AI synthesis tool is the big thing we need to build to make it work.",
        steps: [
          { n: "1", ic: "📥", stage: "Capture", cadence: "Continuous", build: false,
            what: "Everything on the activities timeline above feeds one signal pool — across every cadence, structured and unstructured.",
            inputs: ["Strategy offsite", "Quarterly Business Review", "Monthly product day", "Advisory panels", "WhatsApp groups", "Feature request board", "Salesforce", "Pendo", "Planhat", "Surveys"],
            artifacts: [
              { ic: "🔌", t: "Source connectors", note: "Read-only feeds from Salesforce, Pendo & Planhat into one store." },
              { ic: "📋", t: "Feature request board", note: "Custom board — internal teams + schools log and upvote requests." },
              { ic: "📨", t: "Survey program", note: "Annual & semi-annual user-base surveys (SurveyMonkey)." },
              { ic: "💬", t: "WhatsApp feedback channels", note: "Always-on user-group chats wired into the signal pool." },
            ] },
          { n: "2", ic: "🧠", stage: "Synthesise", cadence: "Continuous → Monthly", build: true,
            what: "A custom AI synthesis tool ingests every input — structured signal (Salesforce, Pendo, Planhat) and unstructured signal (WhatsApp, feature-request board, call notes, surveys) — then clusters, de-duplicates and scores candidate themes by revenue impact × adoption gap × strategic fit, with a plain-language rationale.",
            how: [
              "Connectors pull every source into one normalised store.",
              "AI clusters & de-duplicates raw signal into candidate themes.",
              "Each theme scored: revenue impact × adoption gap × strategic fit.",
              "Outputs a ranked, region-aware digest with a rationale per theme.",
            ],
            artifacts: [
              { ic: "🧠", t: "AI synthesis tool", note: "Ingests all signal and produces ranked, scored themes with a rationale.", big: true },
              { ic: "🗂", t: "Normalised signal store", note: "One common schema — account, region, segment, feature, revenue." },
              { ic: "🤖", t: "Theme scoring model", note: "Scores revenue impact × adoption gap × strategic fit." },
            ] },
          { n: "3", ic: "🎯", stage: "Distill & Decide", cadence: "Monthly → Quarterly", build: false,
            what: "Leadership turns the ranked themes into committed, revenue-anchored bets.",
            decide: [
              { short: "AI shortlist", who: "AI synthesis tool", text: "The AI tool surfaces a ranked, revenue-scored shortlist of candidate themes — the evidence-backed starting point, not the decision.", artifact: "Ranked opportunity shortlist — each theme scored by revenue impact × adoption gap, with its evidence." },
              { short: "Product review", who: "Product team", text: "The product team reviews and shapes the shortlist — sharpening scope, merging duplicates and pressure-testing feasibility before it goes wider.", artifact: "Shaped shortlist — scoped, de-duplicated, with a feasibility rating per theme." },
              { short: "Product day", who: "Product · Sales · Support · CX", text: "Monthly product day: Product walks the revenue teams through the shortlist and gathers front-line feedback.", artifact: "Annotated shortlist + product-day feedback log from the revenue teams." },
              { short: "Schools sign-off", who: "Schools · user groups", text: "Validate the distilled quarter with our schools — they sign off on the shortlist we've prioritised. (Discovery feedback runs continuously in Capture; this is the explicit check on what we've decided to build.)", artifact: "Schools-validated shortlist — advisory-panel sign-off notes per theme." },
              { short: "SLT & ExCo", who: "SLT & ExCo", text: "Leadership reviews and ratifies the revenue-ranked priorities before they're presented at the QBR.", artifact: "Ratified priority list — a one-page decision memo." },
              { short: "QBR commit", who: "Product · Sales", text: "Present the signed-off, revenue-ranked plan at the Quarterly Business Review and commit the quarter's focus.", artifact: "QBR deck + committed revenue-ranked quarter roadmap." },
              { short: "Into Build", who: "Product → pods", text: "Product breaks the committed bets down into weekly-sized slices that feed the build cycle — the Build phase, next.", artifact: "Sliced backlog — weekly-sized build briefs handed to the pods." },
            ],
            artifacts: [
              { ic: "📊", t: "Prioritisation dashboard", note: "Revenue-ranked, region-aware view of the shortlist.", big: true },
              { ic: "🗺", t: "Rolling roadmap", note: "Committed Now / Next / Later plan, re-cut quarterly." },
              { ic: "📑", t: "QBR / board deck", note: "Auto-generated revenue-ranked plan for sign-off & the QBR." },
              { ic: "📦", t: "Pod-ready brief", note: "The sliced, revenue-anchored brief handed to the build pods." },
            ] },
        ],
      },
      stakeholders: [
        { n: "Product leadership", t: "lead", ic: "🧩" }, { n: "ExCo / SLT", t: "lead", ic: "👔" }, { n: "Finance", t: "lead", ic: "💰" },
        { n: "Sales", t: "", ic: "📈" }, { n: "Client Experience", t: "", ic: "💬" }, { n: "Product Marketing", t: "", ic: "📣" },
        { n: "Heads / Principals", t: "school", ic: "🎓" }, { n: "Department leads", t: "school", ic: "🏫" },
        { n: "Coordinators & admins", t: "school", ic: "🗂" }, { n: "Day-to-day users", t: "school", ic: "🧑‍💼" },
        { n: "School marketing", t: "school", ic: "📢" },
      ],
      problems: [
        { ic: "🗂", t: "Signal is scattered and lost", p: "Demand lives in inboxes, calls and spreadsheets, so the patterns never surface and good ideas die in someone's notes.", fix: "One signal pool, captured continuously" },
        { ic: "⚖️", t: "The loudest voice sets the roadmap", p: "No consistent revenue lens; weeks lost hand-pulling data for a deck; we plan off gut feel.", fix: "AI synthesis ranked by revenue impact × adoption gap" },
        { ic: "🏫", t: "Schools aren't in the decision", p: "We commit to bets without the people who'll use them, then find out we backed the wrong things.", fix: "Schools sign off the plan before we commit" },
        { ic: "🐢", t: "The roadmap is fixed and opaque", p: "Annual plans treated as set in stone; priorities decided in a black box no one can trace.", fix: "A rolling roadmap with a traceable path from signal to commit" },
      ],
      shift: [
        { old: "Signal scattered across inboxes, calls and spreadsheets", new: "One signal pool — Salesforce, Pendo, Planhat, WhatsApp, the feature board & surveys", ai: "CAPTURED" },
        { old: "Weeks hand-synthesising data for a strategy deck", new: "A custom AI tool clusters & scores it into ranked themes, continuously", ai: "AI SYNTH" },
        { old: "Planning off gut feel and the loudest voice", new: "Themes ranked by revenue impact × adoption gap before the room meets", ai: "EVIDENCE" },
        { old: "Schools consulted late, if at all", new: "Schools feed the loop continuously and shape what we commit to", ai: "SCHOOLS" },
        { old: "Priorities decided in a black box", new: "A clear path: AI shortlist → product → SLT/ExCo sign-off → QBR commit", ai: "TRACEABLE" },
        { old: "Annual roadmap treated as fixed", new: "Rolling vision — re-cut quarterly, tuned monthly against revenue", ai: "ROLLING" },
      ],
      school: "Every school touchpoint becomes signal — captured continuously, synthesised by AI, and distilled into the roadmap.",
      schoolChips: [
        { ic: "💬", t: "WhatsApp user-group chats" },
        { ic: "🗂", t: "Advisory panels" },
        { ic: "🎤", t: "User-group conferences" },
        { ic: "📊", t: "In-app feedback (Pendo)" },
        { ic: "📋", t: "Surveys" },
      ],
      schoolOutcome: "shape the revenue-ranked themes we commit to",
      schoolHow: "How we engage: standing advisory panels and always-on WhatsApp user-group chats across our core user groups, quarterly user-group conferences, in-app feedback (Pendo) and surveys. How it shapes priorities: their goals and pain points feed the opportunity digest, so the themes we commit to are the ones our schools are asking for — and willing to pay for.",
    },
    build: {
      accent: F.orange, accentDark: "#E06A2E", accentSoft: "rgba(247,139,67,0.24)",
      eyebrow: "Phase 02 · Make it real", title: "Build",
      lede: "Our AI Pods model. Small, single-owner pods run a staggered weekly rhythm — the owner shapes next week's slice while dev and QA stay heads-down on the current one. A release every Monday.",
      horizon: "1-week dev cycles · 1 week of QA behind · release every Monday",
      parallel: "The rhythm is staggered, not sequential. While devs build this week's slice and QA tests last week's, the pod owner is already researching and shaping next week's. Three cycles run at once — and a feature that looks like 3–4 weeks of work is sliced so something ships every few days, not at the end.",
      stages: [
        { n: "Mon–Tue · Research & shape (owner)", wk: "Pre-build", p: "The owner reviews how the last release performed, forms a hypothesis with a success metric, then grounds it in quant (usage / adoption data) and qual (school calls & interviews). Spec and prototype are drafted with AI alongside.", tools: ["Usage data", "School calls", "AI spec + prototype"] },
        { n: "Wed · Prototype to two audiences", wk: "Pre-build", p: "Same prototype shared with schools (WhatsApp + key contacts) and internal teams (sales, support, implementation). Light touch — prototype plus high-level requirements, nothing too detailed.", tools: ["🏫 Schools", "Sales / Support / Impl."] },
        { n: "Thu–Fri · Fold in, review, lock", wk: "Pre-build", p: "Feedback folded in; PMT review aligns on scope Thursday; scope locks Friday and hands off to dev. Anything substantive raised after the lock goes to the next cycle, not this build.", tools: ["PMT review", "Scope lock", "Dev handoff"] },
        { n: "Build week (dev) · QA week (behind)", wk: "Each week", p: "Devs build this week's slice Mon–Fri toward a branch. QA spends a full clean week testing last week's slice — AI-assisted code review — and signs off for the Monday release.", tools: ["AI SDLC", "AI code review"] },
        { n: "Every Monday · Release", wk: "Weekly", p: "The week-before-last's signed-off slice ships to production. Sliced small (MVP → v1.0 → v1.1) so schools see progress and feed back within days, not weeks.", tools: ["Ticket slicing", "Monday release"] },
      ],
      activities: [
        { ic: "🚢", nm: "Monday release", cad: "Weekly", d: "Every single Monday a signed-off slice goes to production.",
          detail: { who: "Pod dev + QA.", what: "Ship the week-before-last's QA-signed slice to production.", when: "Every Monday.", how: "Release the signed branch; publish release notes + in-app guides.", why: "A predictable weekly heartbeat schools can rely on." } },
        { ic: "🎯", nm: "Hypothesis review", cad: "Per cycle", d: "Owner reviews the last release's outcome and states the next belief + success metric.",
          detail: { who: "Pod owner (PM or Designer).", what: "Review how the last release performed and state the next belief + success metric.", when: "Start of each cycle (Monday).", how: "Read usage/adoption data; write a one-line hypothesis with a metric.", why: "Ship a hypothesis, not just a feature." } },
        { ic: "📱", nm: "Prototype share (two audiences)", cad: "Wed", d: "Schools + internal teams react to the same prototype before build.",
          detail: { who: "Pod owner, schools, Sales / Support / Implementation.", what: "Share the same prototype with schools and internal teams before any code.", when: "Wednesday — a week ahead of dev.", how: "Prototype + high-level requirements via WhatsApp and internal channels.", why: "Catch problems on a prototype, not on a shipped feature." } },
        { ic: "👥", nm: "PMT review & scope lock", cad: "Thu–Fri", d: "Align scope, lock Friday, hand off a QA-ready spec to dev.",
          detail: { who: "Product + pod owner.", what: "Align on scope, lock it Friday, hand a QA-ready spec to dev.", when: "Thursday–Friday.", how: "PMT review of folded-in feedback; freeze scope at the lock.", why: "A clean handoff protects QA's clean week." } },
        { ic: "✂️", nm: "Ticket slicing", cad: "Continuous", d: "Large features cut into <1-week slices so something ships every few days.",
          detail: { who: "Pod owner + dev.", what: "Cut large features into sub-one-week, independently shippable slices.", when: "Continuous (during shaping).", how: "MVP → v1.0 → v1.1 increments.", why: "Ship every few days; no carryover between cycles." } },
        { ic: "🛟", nm: "Shock-absorber triage", cad: "Continuous", d: "A dedicated pod catches bugs & interruptions so the others keep focus.",
          detail: { who: "Shock-absorber pod.", what: "Absorb incoming bugs, ad-hoc tasks and interruptions.", when: "Continuous.", how: "A dedicated pod takes the unplanned work off the others.", why: "Protect the other pods' focus and weekly commitments." } },
      ],
      build_tools: "Tools to build: an AI-in-the-SDLC toolchain (spec / prototype / test / code-review assists) so a single owner can prioritise, spec, estimate and prototype; plus a research-clustering tool that turns school calls and usage data into a grounded spec in hours.",
      stakeholders: [
        { n: "Pod owner (PM or Designer)", t: "lead", ic: "🎯" }, { n: "Pod devs (×2)", t: "lead", ic: "👩‍💻" }, { n: "Pod QA", t: "", ic: "🔍" },
        { n: "Shock-absorber pod", t: "", ic: "🛟" }, { n: "Sales / Support / Implementation", t: "", ic: "🤝" },
        { n: "Schools (prototype loop)", t: "school", ic: "🏫" },
      ],
      shift: [
        { old: "Large, bulky teams with shared, unclear ownership", new: "Small independent pods — one owner prioritises, specs, estimates & prototypes", ai: "PODS" },
        { old: "Two-week sprints with QA squeezed at the end", new: "1-week dev cycles, a full QA week behind, a release every Monday", ai: "WEEKLY" },
        { old: "Hand-written specs, tests and boilerplate", new: "AI drafts the spec, prototype, tests and code review; humans decide", ai: "AI SDLC" },
        { old: "Tickets roll sprint to sprint as carryover", new: "Work sliced under a week — fresh slice each cycle, ships in days", ai: "SLICED" },
        { old: "Schools & stakeholders brought in late, if at all", new: "In the loop Tue–Thu via prototype, before a line is built", ai: "EARLY" },
        { old: "Distractions hit and derail the whole team", new: "A dedicated shock-absorber pod soaks up bugs & interruptions", ai: "BUFFER" },
      ],
      school: "Schools shape the slice before a line is written.",
      schoolChips: [
        { ic: "📱", t: "Wed prototype share" },
        { ic: "💬", t: "WhatsApp + key contacts" },
        { ic: "🔄", t: "Feedback folded in by Thu" },
      ],
      schoolOutcome: "steer what the pod builds next",
      schoolHow: "How we engage: every Wednesday the owner shares the working prototype with schools (WhatsApp + key contacts) a full week ahead of dev. Feedback is folded in Thursday, pre-lock. How it shapes priorities: schools react to a real prototype rather than a shipped feature, so we course-correct cheaply — substantive changes after Friday's lock simply ride the next weekly cycle.",
    },
    adopt: {
      accent: F.pink, accentDark: "#C42B94", accentSoft: "rgba(232,55,172,0.2)",
      eyebrow: "Phase 03 · Land, expand, learn", title: "Adopt",
      lede: "Where shipped value becomes school success and revenue. Product produces automated enablement; marketing focuses only on AAA campaigns; adoption signal feeds straight back into Prioritise.",
      horizon: "Continuous · closes the loop",
      parallel: null,
      stages: [
        { n: "Automated sales enablement", wk: "At release", p: "Each release auto-generates enablement — what shipped, who it's for, the pitch, the collateral — so Sales and Support are ready day one without waiting on a hand-off.", tools: ["Auto collateral"] },
        { n: "Marketing — AAA campaigns only", wk: "Wk 1", p: "Marketing runs campaigns for the marquee AAA features. Everything else reaches Sales and Support directly through the automated collateral Product produces.", tools: ["AAA campaigns", "AI copy"] },
        { n: "Enablement certifications", wk: "Per AAA feature", p: "For AAA features, plan and auto-generate certification paths so the enablement team can certify Sales and Support quickly and consistently.", tools: ["Cert paths", "AI assessments"] },
        { n: "Land & expand", wk: "Ongoing", p: "Schools onboard and adopt. Track activation and expansion and step in where adoption stalls.", tools: ["Pendo", "Salesforce"] },
        { n: "Adoption signal → Prioritise", wk: "Continuous", p: "Activation, feature usage and expansion (Pendo) plus pipeline and win-loss (Salesforce) flow back as the freshest input to the next prioritisation cut. The loop closes.", tools: ["Pendo", "Salesforce"] },
      ],
      activities: [
        { ic: "📦", nm: "Release enablement drop", cad: "At each release", d: "Auto-generated pitch + collateral pushed to Sales & Support.",
          detail: { who: "Product (auto) → Sales & Support.", what: "An auto-generated pitch + collateral for what shipped, pushed out at release.", when: "At each release.", how: "The release pipeline generates the what / who / pitch / collateral.", why: "Sales & Support ready day one, with no hand-off lag." } },
        { ic: "📣", nm: "AAA campaign launch", cad: "Per AAA feature", d: "Marketing amplifies the marquee features only.",
          detail: { who: "Marketing.", what: "Run a campaign for a marquee AAA feature.", when: "Per AAA feature.", how: "AI-assisted copy + campaign; everything else rides the automated collateral.", why: "Focus marketing effort only where it moves the needle." } },
        { ic: "🎓", nm: "Enablement certification", cad: "Per AAA feature", d: "Sales/Support certified on AAA features via auto-built paths.",
          detail: { who: "Sales enablement, Sales, Support.", what: "Certify Sales & Support on each AAA feature.", when: "Per AAA feature.", how: "Auto-built certification paths + assessments.", why: "Consistent, fast readiness across the team." } },
        { ic: "📡", nm: "Adoption signal review", cad: "Continuous", d: "Pendo + Salesforce signal reviewed and fed into Prioritise.",
          detail: { who: "Product + Client Experience.", what: "Review adoption signal and feed it back into Prioritise.", when: "Continuous.", how: "Pendo + Salesforce signal piped into the prioritisation digest.", why: "Close the loop — adoption drives the next cycle." } },
        { ic: "🏫", nm: "School onboarding & guidance", cad: "At each adoption", d: "In-product guidance and CS outreach walk schools into the new feature.",
          detail: { who: "Customer success, Implementation.", what: "Walk schools into each new feature so they actually adopt it.", when: "At each adoption.", how: "In-product guidance + CS outreach.", why: "Adoption, not just access — value has to land." } },
        { ic: "⭐", nm: "Reference & expansion calls", cad: "Ongoing", d: "Most-engaged schools join reference stories and expansion conversations.",
          detail: { who: "Sales, Customer success.", what: "Turn the most-engaged schools into references and expansion.", when: "Ongoing.", how: "Reference stories + expansion conversations.", why: "Convert adoption into revenue and proof." } },
      ],
      build_tools: "Tools to build: an enablement generator (collateral + certification paths per AAA feature) and an adoption-signal pipeline that routes Pendo + Salesforce data into the prioritisation dashboard.",
      stakeholders: [
        { n: "VP Sales", t: "lead", ic: "📈" }, { n: "Marketing", t: "lead", ic: "📣" }, { n: "Sales enablement", t: "", ic: "🎓" },
        { n: "Customer success", t: "", ic: "💬" }, { n: "Support", t: "", ic: "🛠" }, { n: "Implementation", t: "", ic: "⚙️" },
        { n: "Product (owns deliverables)", t: "", ic: "🧩" }, { n: "Adopting schools", t: "school", ic: "🏫" },
      ],
      shift: [
        { old: "Sales finds out about features after they ship", new: "Enablement auto-generated at release; Sales & Support ready day one", ai: "AUTO ENABLE" },
        { old: "Marketing writes copy from scratch for everything", new: "Marketing runs AAA campaigns only; rest is automated collateral", ai: "AAA FOCUS" },
        { old: "Certification is manual and inconsistent", new: "Auto-built certification paths per AAA feature", ai: "AUTO CERT" },
        { old: "Adoption data sits in a dashboard nobody reads", new: "Pendo + Salesforce signal feeds the next prioritisation", ai: "CLOSED LOOP" },
      ],
      school: "Schools become the signal for the next cycle.",
      schoolChips: [
        { ic: "🚀", t: "Onboarding & guidance" },
        { ic: "📈", t: "Pendo + Salesforce signal" },
        { ic: "⭐", t: "Reference & expansion" },
      ],
      schoolOutcome: "feed the next Prioritise cut",
      schoolHow: "How we engage: onboarding, in-product guidance and customer-success outreach, with the most engaged schools invited into reference and expansion conversations. How it shapes priorities: we read their activation and expansion behaviour in Pendo and Salesforce, and that evidence is the freshest input to the next Prioritise cut.",
    },
  };

  // Shared styles
  const card = { background: F.surface, border: `1px solid ${F.border}`, borderRadius: 12, padding: "18px 22px", marginBottom: 18, boxShadow: F.shadowSm };
  const sectionTitle = { fontSize: 11, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 };

  // ── Overview view ──────────────────────────────────────
  // ── Cycle node positions (SVG user-space, viewBox 0 0 600 600) ──
  // Three phases equally spaced around a 190-radius circle centered at (300, 300).
  // Clockwise visual order: Prioritise (top) → Build (bottom-right) → Adopt (bottom-left) → loop back.
  const PHASES = [
    { id: "prioritise", cx: 300, cy: 110, num: "01", short: "Prioritise" },
    { id: "build",      cx: 465, cy: 395, num: "02", short: "Build"      },
    { id: "adopt",      cx: 135, cy: 395, num: "03", short: "Adopt"      },
  ];
  // Active phase = hovered OR (if nothing hovered) defaults to a rotating walkthrough mode (just Prioritise).
  const active = hover || "prioritise";
  const activeData = DATA[active];

  const Overview = () => (
    <>
      {/* Scoped styles for the interactive cycle */}
      <style>{`
        @keyframes plc-rot   { to { stroke-dashoffset: -240; } }
        @keyframes plc-pulse { 0%,100% { opacity: 0.9; transform: scale(1); } 50% { opacity: 1; transform: scale(1.03); } }
        @keyframes plc-orbit { to { transform: rotate(360deg); } }
        @keyframes plc-fade  { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .plc-loop          { animation: plc-rot 32s linear infinite; }
        .plc-phase         { cursor: pointer; transform-box: fill-box; transform-origin: center; transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .plc-phase:hover   { transform: scale(1.09); }
        .plc-phase:hover .plc-phase-circle { filter: drop-shadow(0 0 18px var(--phase-color)); }
        .plc-phase-circle  { transition: filter 0.25s ease; }
        .plc-core          { transform-box: fill-box; transform-origin: center; animation: plc-pulse 4.5s ease-in-out infinite; }
        .plc-core-ring     { transform-box: fill-box; transform-origin: center; animation: plc-orbit 30s linear infinite; }
        .plc-spoke         { stroke: ${F.paper}; stroke-width: 1.5; stroke-dasharray: 3 5; opacity: 0; transition: opacity 0.3s ease; }
        .plc-spoke-active  { opacity: 0.55; }
        .plc-chevron       { transition: opacity 0.2s ease; }
        .plc-info          { animation: plc-fade 0.35s ease; }
      `}</style>

      {/* Header band */}
      <div style={{
        background: F.gradient, borderRadius: 14, padding: "28px 28px 32px", position: "relative", overflow: "hidden", marginBottom: 22,
      }}>
        <div style={{ position: "absolute", height: 14, width: "60%", left: "30%", bottom: -7, background: F.lightYellow, opacity: 0.55, borderRadius: 9999, transform: "rotate(-1deg)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 2 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: F.plum, margin: 0, lineHeight: 1.15, maxWidth: 720 }}>The AI-First Product Lifecycle</h1>
          <p style={{ fontSize: 15, fontWeight: 500, color: F.plum, opacity: 0.85, margin: "10px 0 0", maxWidth: 680 }}>A continuous loop from strategy to shipped value: leadership sets the revenue-driven direction, small AI-augmented pods build and release weekly, and what schools adopt feeds straight back into what we prioritise next.</p>
        </div>
      </div>

      {/* THE CYCLE — main interactive visual */}
      <div style={{ background: F.plum, borderRadius: 14, padding: "28px 24px 30px", marginBottom: 22, position: "relative", overflow: "hidden" }}>
        {/* Subtle radial glow behind the cycle */}
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 45%, ${F.lightPlum}66, transparent 60%)`, pointerEvents: "none" }} />

        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 380px)", gap: 24, alignItems: "center" }} className="plc-cycle-grid">
          {/* SVG cycle */}
          <div style={{ position: "relative" }}>
            <svg viewBox="0 0 600 600" style={{ width: "100%", maxWidth: 560, height: "auto", display: "block", margin: "0 auto" }} role="img" aria-label="Product Lifecycle cycle — three phases around schools at the core">
              {/* Spokes from each phase toward Schools core (lit when that phase is active/hovered) */}
              {PHASES.map(p => (
                <line key={`spoke-${p.id}`}
                  x1={p.cx} y1={p.cy} x2="300" y2="300"
                  className={`plc-spoke ${active === p.id ? "plc-spoke-active" : ""}`}
                />
              ))}

              {/* Outer animated dashed loop */}
              <circle cx="300" cy="300" r="190" fill="none" stroke={F.paper} strokeWidth="1.5" strokeDasharray="6 10" strokeOpacity="0.35" className="plc-loop" />

              {/* Direction chevrons indicating CW flow (between phases on the loop) */}
              {[
                { x: 490, y: 300, rot: 90  }, // right side: Prioritise → Build
                { x: 300, y: 490, rot: 180 }, // bottom:     Build → Adopt
                { x: 110, y: 300, rot: 270 }, // left side:  Adopt → Prioritise
              ].map((a, i) => (
                <g key={`chev-${i}`} transform={`translate(${a.x} ${a.y}) rotate(${a.rot})`} className="plc-chevron">
                  <path d="M -7 -7 L 7 0 L -7 7 Z" fill={F.yellow} opacity="0.8" />
                </g>
              ))}

              {/* Schools core */}
              <g className="plc-core">
                {/* Outer rotating ring */}
                <g className="plc-core-ring">
                  <circle cx="300" cy="300" r="86" fill="none" stroke={F.yellow} strokeWidth="1" strokeDasharray="2 6" opacity="0.6" />
                </g>
                <circle cx="300" cy="300" r="76" fill={F.paper} stroke={F.yellow} strokeWidth="3" />
                <text x="300" y="288" textAnchor="middle" fontSize="26" style={{ userSelect: "none" }}>🏫</text>
                <text x="300" y="312" textAnchor="middle" fontSize="13" fontWeight="800" fill={F.plum} letterSpacing="0.8" style={{ userSelect: "none" }}>SCHOOLS</text>
                <text x="300" y="326" textAnchor="middle" fontSize="8.5" fontWeight="700" fill={F.muted} letterSpacing="1.2" style={{ userSelect: "none" }}>AT THE CORE</text>
              </g>

              {/* Phase nodes (clickable) — rendered LAST so they layer above the loop */}
              {PHASES.map(p => {
                const d = DATA[p.id];
                const isActive = active === p.id;
                return (
                  <g key={p.id}
                     className="plc-phase"
                     style={{ "--phase-color": d.accent }}
                     onClick={() => setOpen(p.id)}
                     onMouseEnter={() => setHover(p.id)}
                     onMouseLeave={() => setHover(null)}
                     onFocus={() => setHover(p.id)}
                     onBlur={() => setHover(null)}
                     tabIndex={0}
                     role="button"
                     aria-label={`Open ${p.short} phase`}>
                    <circle className="plc-phase-circle" cx={p.cx} cy={p.cy} r="62" fill={d.accent} stroke={F.paper} strokeWidth={isActive ? "4" : "2.5"} />
                    <text x={p.cx} y={p.cy - 16} textAnchor="middle" fontSize="11" fontWeight="800" fill={F.plum} opacity="0.7" letterSpacing="1.4" style={{ userSelect: "none" }}>{p.num}</text>
                    <text x={p.cx} y={p.cy + 8} textAnchor="middle" fontSize="18" fontWeight="800" fill={F.plum} letterSpacing="0.5" style={{ userSelect: "none" }}>{p.short.toUpperCase()}</text>
                    <text x={p.cx} y={p.cy + 28} textAnchor="middle" fontSize="9" fontWeight="700" fill={F.plum} opacity="0.65" style={{ userSelect: "none" }}>CLICK →</text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Dynamic info panel — updates as you hover phases */}
          <div className="plc-info" key={active} style={{ background: "rgba(250, 246, 246, 0.08)", border: `1px solid rgba(250, 246, 246, 0.16)`, borderLeft: `4px solid ${activeData.accent}`, borderRadius: 12, padding: "20px 22px", color: F.paper }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: activeData.accent, marginBottom: 6 }}>{activeData.eyebrow}</div>
            <h3 style={{ fontSize: 26, fontWeight: 800, color: F.paper, margin: "0 0 10px", lineHeight: 1.1 }}>{activeData.title}</h3>
            <p style={{ fontSize: 13.5, color: F.paper, opacity: 0.85, lineHeight: 1.55, margin: "0 0 14px" }}>{activeData.lede}</p>
            <div style={{ display: "inline-block", fontSize: 10.5, fontWeight: 800, padding: "5px 11px", borderRadius: 999, background: "rgba(255,255,255,0.1)", color: F.paper, marginBottom: 16, letterSpacing: "0.04em" }}>⏱ {activeData.horizon}</div>
            <button onClick={() => setOpen(active)} style={{
              display: "block", width: "100%", padding: "10px 16px", borderRadius: 8, border: "none",
              background: activeData.accent, color: F.plum, fontSize: 13, fontWeight: 800, cursor: "pointer",
              fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.08em",
            }}>Explore {activeData.title} →</button>
            <div style={{ marginTop: 12, fontSize: 11, color: F.paper, opacity: 0.55, fontStyle: "italic", textAlign: "center" }}>{hover ? "Click a phase, or…" : "Hover any phase to preview"}</div>
          </div>
        </div>

        {/* Caption beneath the cycle */}
        <p style={{ textAlign: "center", color: F.paper, opacity: 0.7, fontSize: 12.5, margin: "24px auto 0", maxWidth: 560, lineHeight: 1.55 }}>
          One continuous loop. What schools <strong style={{ color: F.lightPink }}>adopt</strong> feeds straight back into what we <strong style={{ color: F.yellow }}>prioritise</strong> next — not a one-way pipeline, a working rhythm.
        </p>
      </div>

      {/* ── Rolling this out — a 90-day staged rollout; all three phases advance in parallel, easy wins first ── */}
      {(() => {
        const PHASE_C = { Prioritise: "#B07A0E", Build: "#E06A2E", Adopt: "#C42B94" };
        const stages = [
          { when: "By Day 30", name: "Foundations", note: "the easy wins", tone: F.muted2, groups: [
            { ph: "Prioritise", tasks: ["Open one signal pool (shared board or doc).", "Stand up a user-group channel (e.g. WhatsApp).", "Hold the first monthly product + revenue check-in."] },
            { ph: "Build", tasks: ["Pilot one single-owner pod.", "Slice the next feature into sub-week chunks.", "Ship one small release to prove the rhythm."] },
            { ph: "Adopt", tasks: ["Turn on Pendo adoption tracking for what you ship.", "Auto-generate a basic enablement note at release."] },
          ] },
          { when: "By Day 60", name: "Find the rhythm", note: "operating cadence", tone: F.plum, groups: [
            { ph: "Prioritise", tasks: ["Run a monthly AI opportunity digest (Salesforce / Pendo / Planhat).", "Hold a monthly product day with Sales, Support & CX.", "Start monthly discovery interviews with schools."] },
            { ph: "Build", tasks: ["Move pods to the staggered weekly rhythm (dev + QA week).", "Release every Monday.", "Add AI across the SDLC — spec, prototype, test, review."] },
            { ph: "Adopt", tasks: ["Auto-generate enablement at each release.", "Run in-product onboarding for each shipped feature."] },
          ] },
          { when: "By Day 90", name: "Full model", note: "the loop, running", tone: F.green, groups: [
            { ph: "Prioritise", tasks: ["AI synthesis ranks themes automatically.", "Schools sign off; QBR commits the quarter.", "Rolling Now / Next / Later roadmap, tuned monthly."] },
            { ph: "Build", tasks: ["All pods on weekly releases with AI in the SDLC.", "Shock-absorber pod live to protect focus.", "Every feature sliced to ship in days, not weeks."] },
            { ph: "Adopt", tasks: ["AAA campaigns + auto-built certifications.", "Always-on adoption signal (Pendo + Salesforce).", "That signal feeds the next Prioritise — loop closed."] },
          ] },
        ];
        return (
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={sectionTitle}>Rolling this out</div>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: F.plum, background: F.lightYellow, border: `1px solid ${F.yellow}`, borderRadius: 999, padding: "4px 11px", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Target · full model in 90 days</span>
        </div>
        <p style={{ margin: "-2px 0 12px", fontSize: 12.5, color: F.muted, lineHeight: 1.5, maxWidth: 800 }}>We don't roll out one phase at a time — all three advance together in chunks. Start with the easy wins, then build up. Here's what good looks like at 30, 60 and 90 days.</p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
          {Object.entries(PHASE_C).map(([name, c]) => (
            <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 700, color: F.muted }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: c, flexShrink: 0 }} />{name}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "stretch", gap: 0 }} className="plc-timeline">
          {stages.map((M, i, arr) => (
            <div key={i} style={{ flex: "1 1 0", display: "flex", flexDirection: "column", minWidth: 0 }} className="plc-tl-col">
              {/* rail: node + connector to next milestone */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: 11 }}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", background: M.tone, border: `3px solid ${F.surface}`, boxShadow: `0 0 0 2px ${M.tone}`, flexShrink: 0 }} />
                {i < arr.length - 1 && <span style={{ flex: 1, height: 3, background: `linear-gradient(90deg, ${M.tone}, ${arr[i + 1].tone})` }} />}
              </div>
              <div style={{ marginRight: i < arr.length - 1 ? 12 : 0, background: F.bg, border: `1px solid ${F.border}`, borderTop: `3px solid ${M.tone}`, borderRadius: 11, padding: "14px 15px", flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: M.tone === F.muted2 ? F.muted : M.tone, textTransform: "uppercase", letterSpacing: "0.07em" }}>{M.when}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: F.plum, lineHeight: 1.15, margin: "2px 0 1px" }}>{M.name}</div>
                <div style={{ fontSize: 10.5, color: F.muted2, fontWeight: 600, marginBottom: 12 }}>{M.note}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {M.groups.map((g, gi) => (
                    <div key={gi}>
                      <div style={{ fontSize: 8.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: PHASE_C[g.ph], marginBottom: 5 }}>{g.ph}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {g.tasks.map((t, ti) => (
                          <div key={ti} style={{ display: "flex", gap: 7, fontSize: 11.5, lineHeight: 1.4 }}>
                            <span style={{ color: PHASE_C[g.ph], fontWeight: 800, flexShrink: 0 }}>·</span>
                            <span style={{ color: F.plum }}>{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ margin: "14px 0 0", fontSize: 11.5, color: F.muted2, fontStyle: "italic" }}>Pick up the easy wins first — by day 90 all three phases are running together as one loop.</p>
      </div>
        );
      })()}

      <div style={{ marginTop: 22, textAlign: "center", fontSize: 11, color: F.muted2, fontStyle: "italic" }}>
        Product Lifecycle framework · draft for SLT review
      </div>

      {/* Stack the cycle grid + rollout timeline on narrow viewports */}
      <style>{`
        @media (max-width: 880px) {
          .plc-cycle-grid { grid-template-columns: 1fr !important; }
          .plc-timeline { flex-direction: column !important; gap: 14px !important; }
          .plc-timeline .plc-tl-col > div:last-child { margin-right: 0 !important; }
        }
      `}</style>
    </>
  );

  // ── Phase deep-view ────────────────────────────────────
  const PhaseView = ({ phase }) => {
    const d = DATA[phase];
    const order = ["prioritise", "build", "adopt"];
    const idx = order.indexOf(phase);
    const nextP = order[(idx + 1) % 3];   // adopt loops back to prioritise
    const prevP = order[(idx + 2) % 3];
    const wrapNext = idx === 2, wrapPrev = idx === 0;
    // (Per-block stagger removed — the single soft crossfade on the view wrapper is calmer.)
    const stg = () => ({});
    const sel = Math.min(stageSel, d.stages.length - 1);
    const selStage = d.stages[sel];
    // Group stakeholders into role lanes for the "Who's involved" map.
    const lanes = [
      { key: "lead",   label: "Leads",        sub: "own the outcome", dot: F.plum },
      { key: "",       label: "Contributors", sub: "in the loop",     dot: F.muted2 },
      { key: "school", label: "Schools",      sub: "the core",        dot: d.accent },
    ].map(l => ({ ...l, items: d.stakeholders.filter(s => s.t === l.key) })).filter(l => l.items.length);

    // Map activities onto a frequency timeline (most frequent → least frequent).
    const RANK_LABEL = ["Continuous", "Daily", "Weekly", "Event-driven", "Monthly", "Quarterly", "Yearly"];
    const cadRank = (c) => {
      const s = (c || "").toLowerCase();
      if (s.includes("continuous") || s.includes("always") || s.includes("ongoing")) return 0;
      // Check monthly/quarterly/yearly BEFORE the weekly check — "monthly" contains "mon".
      if (s.includes("monthly")) return 4;
      if (s.includes("quarterly")) return 5;
      if (s.includes("yearly") || s.includes("annual")) return 6;
      if (s.includes("daily")) return 1;
      if (s.includes("week") || s === "wed" || s.includes("thu") || s.includes("mon")) return 2;
      return 3; // per-release / per-slice / per-AAA / at each … → event-driven
    };
    const cadColMap = {};
    d.activities.forEach(a => { const r = cadRank(a.cad); (cadColMap[r] = cadColMap[r] || []).push(a); });
    const cadCols = Object.keys(cadColMap).map(Number).sort((x, y) => y - x).map(r => ({ rank: r, label: RANK_LABEL[r], items: cadColMap[r] }));

    return (
      <>
        {/* ── Phase switcher: prominent segmented control + clear exit ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <button onClick={() => setOpen(null)} style={{
            display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 15px", borderRadius: 11,
            border: `1px solid ${F.borderStrong}`, background: F.surface, color: F.plum,
            fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
          }}>⊙ Full cycle</button>
          <div style={{ display: "flex", gap: 4, background: F.bg, border: `1px solid ${F.border}`, borderRadius: 13, padding: 4, flex: 1, minWidth: 240 }}>
            {order.map((p, i) => {
              const pd = DATA[p];
              const on = phase === p;
              return (
                <button key={p} onClick={() => setOpen(p)} title={pd.title} style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  padding: "9px 8px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: on ? pd.accent : "transparent", color: F.plum,
                  fontSize: 12.5, fontWeight: on ? 800 : 600, boxShadow: on ? F.shadowSm : "none", transition: "background 0.2s",
                }}>
                  <span style={{ width: 19, height: 19, borderRadius: "50%", flexShrink: 0, background: on ? "rgba(55,2,60,0.18)" : pd.accent, color: F.plum, fontSize: 9.5, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                  <span className="plc-tab-label">{pd.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Phase header */}
        <div style={{ background: d.accent, borderRadius: 14, padding: "22px 28px 20px", marginBottom: 18, position: "relative" }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: F.plum, opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 }}>{d.eyebrow}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: F.plum, lineHeight: 1.1 }}>{d.title}</h1>
            {d.horizon && <div style={{ fontSize: 11.5, fontWeight: 800, background: "rgba(55,2,60,0.16)", color: F.plum, padding: "5px 12px", borderRadius: 999 }}>⏱ {d.horizon}</div>}
          </div>
        </div>

        {/* ── Schools at this phase — elevated, the core of the loop · show-not-tell ── */}
        <div style={{ ...stg(0), position: "relative", overflow: "hidden", background: `linear-gradient(135deg, ${F.plum}, ${F.lightPlum})`, border: `1px solid ${F.lightPlum}`, borderRadius: 14, padding: "18px 22px", marginBottom: 18, display: "flex", gap: 18, alignItems: "center", boxShadow: F.shadowMd, flexWrap: "wrap" }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 10% 50%, ${F.yellow}26, transparent 46%)`, pointerEvents: "none" }} />
          <div style={{ position: "relative", flexShrink: 0, width: 58, height: 58, borderRadius: "50%", background: F.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: `0 0 0 4px ${F.yellow}66` }}>🏫</div>
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: F.yellow, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>★ Schools at this phase · the core of the loop</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: F.paper, margin: 0, lineHeight: 1.25 }}>{d.school}</h3>
          </div>
        </div>

        {/* From signal to roadmap — horizontal step selector (Prioritise only) */}
        {d.synthesis && (() => {
          const tabs = d.synthesis.steps;
          return (
            <div style={{ ...card, ...stg(1) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <div style={{ ...sectionTitle, marginBottom: 0 }}>From signal to roadmap</div>
                <div style={{ fontSize: 10.5, color: F.muted2, fontWeight: 700 }}>Pick a step to see how it works ↓</div>
              </div>
              <div style={{ display: "flex", alignItems: "stretch", gap: 8, flexWrap: "wrap" }}>
                {tabs.map((s, i) => {
                  const key = i === 0 ? "capture" : i === 1 ? "synthesise" : "distill";
                  const on = signalStep === key;
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "stretch", gap: 8, flex: "1 1 210px" }}>
                      {i > 0 && <span style={{ color: F.borderStrong, fontSize: 18, fontWeight: 800, alignSelf: "center" }}>→</span>}
                      <button onClick={() => setSignalStep(key)} className="plc-act" style={{
                        flex: 1, textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                        background: on ? d.accent : F.bg, border: `1px solid ${on ? d.accent : F.border}`,
                        borderRadius: 11, padding: "12px 14px", boxShadow: on ? F.shadowSm : "none",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ width: 26, height: 26, borderRadius: "50%", background: on ? F.surface : d.accentSoft, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{s.ic}</span>
                          <span style={{ fontSize: 13.5, fontWeight: 800, color: F.plum }}>{s.stage}</span>
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: d.accentDark, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.cadence}</div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Capture → the activities cadence timeline (always shown on phases without a synthesis selector) */}
        {(!d.synthesis || signalStep === "capture") && (
        <>
        {/* Activities — mapped onto a frequency timeline (full width) */}
        {(() => {
        const hasDetail = d.activities.some(a => a.detail);
        // Match by name, not object ref — DATA is rebuilt every render so refs never match.
        const shownAct = d.activities.find(a => a.detail && a.nm === actDetail) || (hasDetail ? d.activities.find(a => a.detail) : null);
        return (
        <div style={{ ...card, ...stg(2) }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
            <div style={{ ...sectionTitle, marginBottom: 0 }}>Activities on a cadence timeline</div>
            <div style={{ fontSize: 10.5, color: F.muted2, fontWeight: 700 }}>{hasDetail ? "Hover a tile for who · what · when · how · why" : "← more frequent · less frequent →"}</div>
          </div>
          <div style={{ overflowX: "auto", padding: "14px 2px 4px" }}>
            <div style={{ position: "relative", minWidth: cadCols.length > 2 ? 640 : 420 }}>
              {/* axis line connecting the cadence markers */}
              <div style={{ position: "absolute", top: 8, left: `${50 / cadCols.length}%`, right: `${50 / cadCols.length}%`, height: 2, background: F.border, zIndex: 0 }} />
              {/* cadence markers */}
              <div style={{ display: "flex", position: "relative", zIndex: 1, marginBottom: 14 }}>
                {cadCols.map(col => (
                  <div key={col.rank} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 16, height: 16, borderRadius: "50%", background: d.accent, border: `3px solid ${F.surface}`, boxShadow: `0 0 0 1px ${d.accent}` }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: F.plum, background: d.accentSoft, padding: "3px 11px", borderRadius: 999, whiteSpace: "nowrap" }}>{col.label}</span>
                  </div>
                ))}
              </div>
              {/* activity cards under each cadence */}
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                {cadCols.map(col => (
                  <div key={col.rank} style={{ flex: 1, padding: "0 6px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {col.items.map((a, i) => {
                      const on = a.detail && shownAct === a;
                      return (
                      <div key={i} className="plc-act"
                        onMouseEnter={() => a.detail && setActDetail(a.nm)}
                        style={{ background: on ? d.accentSoft : F.surface, border: `1px solid ${on ? d.accent : F.border}`, borderTop: `3px solid ${d.accent}`, borderRadius: 10, padding: "9px 11px", cursor: a.detail ? "pointer" : "default", boxShadow: on ? F.shadowSm : "none", display: "flex", alignItems: "center", gap: 9 }}>
                        <span style={{ width: 28, height: 28, borderRadius: 8, background: d.accentSoft, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{a.ic}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 800, color: F.plum, lineHeight: 1.25 }}>{a.nm}</div>
                          {a.cad !== col.label && <div style={{ fontSize: 9, fontWeight: 800, color: d.accentDark, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{a.cad}</div>}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hover detail — who / what / when / how / why for the focused activity */}
          {shownAct && shownAct.detail && (
            <div key={shownAct.nm} className="plc-detailfade" style={{ background: F.bg, border: `1px solid ${F.border}`, borderLeft: `4px solid ${d.accent}`, borderRadius: 11, padding: "14px 16px", marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: d.accentSoft, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{shownAct.ic}</span>
                <span style={{ fontSize: 14.5, fontWeight: 800, color: F.plum }}>{shownAct.nm}</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: d.accentDark, background: d.accentSoft, padding: "3px 9px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.04em" }}>{shownAct.cad}</span>
              </div>
              {shownAct.d && <p style={{ fontSize: 12, color: F.muted, lineHeight: 1.5, margin: "0 0 12px" }}>{shownAct.d}</p>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                {[["Who", shownAct.detail.who], ["What", shownAct.detail.what], ["When", shownAct.detail.when], ["How", shownAct.detail.how], ["Why", shownAct.detail.why]].map(([k, v], i) => (
                  <div key={i} style={{ background: F.surface, border: `1px solid ${F.border}`, borderRadius: 8, padding: "9px 11px" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: d.accentDark, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{k}</div>
                    <div style={{ fontSize: 12, color: F.plum, lineHeight: 1.45 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        );
        })()}
        </>
        )}

        {/* Synthesise → the AI synthesis tool we need to build */}
        {d.synthesis && signalStep === "synthesise" && (() => { const s = d.synthesis.steps[1]; return (
          <div className="plc-detailfade" style={{ ...card, borderTop: `4px solid ${F.plum}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 19 }}>{s.ic}</span>
              <div style={{ ...sectionTitle, marginBottom: 0 }}>Synthesise</div>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: d.accentDark, background: d.accentSoft, padding: "2px 9px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.cadence}</span>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: F.muted, lineHeight: 1.6, maxWidth: 840 }}>{s.what}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
              {s.how.map((h, hi) => (
                <div key={hi} style={{ display: "flex", gap: 10, fontSize: 12.5, color: F.plum, lineHeight: 1.5 }}>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: d.accentSoft, color: F.plum, fontSize: 9.5, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{hi + 1}</span>{h}
                </div>
              ))}
            </div>
          </div>
        ); })()}

        {/* Distill & Decide → interactive stepper (hover/tap a step for detail) */}
        {d.synthesis && signalStep === "distill" && (() => {
          const s = d.synthesis.steps[2];
          const sel = Math.min(decideSel, s.decide.length - 1);
          const step = s.decide[sel];
          return (
          <div className="plc-detailfade" style={{ ...card, borderTop: `4px solid ${F.plum}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 19 }}>{s.ic}</span>
              <div style={{ ...sectionTitle, marginBottom: 0 }}>Distill &amp; Decide</div>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: d.accentDark, background: d.accentSoft, padding: "2px 9px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.cadence}</span>
              <span style={{ marginLeft: "auto", fontSize: 10.5, color: F.muted2, fontWeight: 700 }}>Hover a step for detail →</span>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 12.5, color: F.muted, lineHeight: 1.55, maxWidth: 840 }}>{s.what}</p>

            {/* Horizontal stepper */}
            <div style={{ overflowX: "auto", padding: "2px 2px 10px" }}>
              <div style={{ display: "flex", alignItems: "stretch", minWidth: "min-content" }}>
                {s.decide.map((st, i) => {
                  const on = sel === i;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center" }}>
                      {i > 0 && <span style={{ color: F.borderStrong, fontSize: 15, fontWeight: 800, padding: "0 3px", alignSelf: "center" }}>→</span>}
                      <button className="plc-beat" onMouseEnter={() => setDecideSel(i)} onClick={() => setDecideSel(i)} style={{
                        width: 116, cursor: "pointer", fontFamily: "inherit", textAlign: "center",
                        background: on ? d.accent : F.bg, border: `1px solid ${on ? d.accent : F.border}`,
                        borderRadius: 10, padding: "9px 8px", boxShadow: on ? F.shadowSm : "none",
                      }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", margin: "0 auto 5px", background: on ? F.plum : F.surface, color: on ? F.paper : F.plum, border: `1.5px solid ${F.plum}`, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
                        <div style={{ fontSize: 10.5, fontWeight: 800, color: F.plum, lineHeight: 1.2 }}>{st.short}</div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detail for the focused step — updates in place (no keyed remount) so hovering is smooth */}
            <div style={{ background: F.bg, border: `1px solid ${F.border}`, borderLeft: `4px solid ${d.accent}`, borderRadius: 11, padding: "14px 16px", transition: "border-color 0.15s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: d.accent, color: F.plum, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{sel + 1}</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: F.paper, background: F.plum, padding: "3px 10px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.05em" }}>{step.who}</span>
              </div>
              <div style={{ fontSize: 13.5, color: F.plum, lineHeight: 1.6 }}>{step.text}</div>
              {step.artifact && (
                <div style={{ marginTop: 12, display: "flex", gap: 9, alignItems: "flex-start", background: F.surface, border: `1px solid ${F.border}`, borderLeft: `3px solid ${d.accent}`, borderRadius: 8, padding: "9px 12px" }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: d.accentDark, textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: 2, flexShrink: 0 }}>📄 Artifact</span>
                  <span style={{ fontSize: 12.5, color: F.plum, lineHeight: 1.5, fontWeight: 600 }}>{step.artifact}</span>
                </div>
              )}
            </div>
          </div>
        ); })()}

        {/* The problems we're fixing in this phase — keeps the change focused, not change for its own sake */}
        {d.problems && (
          <div style={{ ...card, ...stg(4), borderLeft: `4px solid ${d.accent}` }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ ...sectionTitle, marginBottom: 0 }}>The problems we're fixing</div>
              <span style={{ fontSize: 10.5, color: F.muted2, fontStyle: "italic" }}>Hover any card for the detail ↓</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
              {d.problems.map((x, i) => (
                <div key={i} className="plc-prob" tabIndex={0} style={{ position: "relative", background: F.bg, border: `1px solid ${F.border}`, borderTop: `3px solid ${d.accent}`, borderRadius: 10, padding: "12px 14px", cursor: "help", outline: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                    <span style={{ fontSize: 18 }}>{x.ic}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: F.plum, lineHeight: 1.2 }}>{x.t}</span>
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: F.plum, display: "flex", gap: 6, alignItems: "flex-start" }}><span style={{ color: F.green, flexShrink: 0 }}>→</span><span style={{ lineHeight: 1.35 }}>{x.fix}</span></div>
                  <div className="plc-prob-pop" style={{ position: "absolute", left: -1, right: -1, top: "calc(100% + 6px)", zIndex: 30, background: F.surface, border: `1px solid ${d.accent}`, borderRadius: 10, padding: "11px 13px", boxShadow: F.shadowMd, fontSize: 12, color: F.muted, lineHeight: 1.5 }}>{x.p}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Old way → AI-first */}
        <div style={{ ...card, ...stg(4) }}>
          <div style={sectionTitle}>Old way → AI-first</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 10 }}>
            {d.shift.map((r, i) => (
              <div key={i} style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, padding: "11px 13px" }}>
                <div style={{ fontSize: 11.5, color: F.muted2, textDecoration: "line-through", fontWeight: 600, lineHeight: 1.4 }}>{r.old}</div>
                <div style={{ marginTop: 5, fontSize: 12.5, color: F.plum, fontWeight: 700, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", background: d.accent, color: F.plum, padding: "3px 7px", borderRadius: 5, marginTop: 1 }}>{r.ai}</span>
                  <span style={{ lineHeight: 1.45 }}>{r.new}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer: loop nav between phases */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap", ...stg(5) }}>
          <button onClick={() => setOpen(prevP)} style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 15px", borderRadius: 11, cursor: "pointer", fontFamily: "inherit",
            background: F.surface, border: `1px solid ${F.borderStrong}`, color: F.plum, fontSize: 12.5, fontWeight: 700,
          }}>
            <span style={{ fontSize: 14 }}>←</span>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1, textAlign: "left" }}>
              <span style={{ fontSize: 9, color: F.muted2, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{wrapPrev ? "Loop back to" : "Previous"}</span>
              <span>{wrapPrev ? "↻ " : ""}{DATA[prevP].title}</span>
            </span>
          </button>
          <button onClick={() => setOpen(null)} style={{ ...bt("ghost"), padding: "8px 14px", fontSize: 12, fontWeight: 700, color: F.muted }}>⊙ Full cycle</button>
          <button onClick={() => setOpen(nextP)} style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 15px", borderRadius: 11, cursor: "pointer", fontFamily: "inherit",
            background: DATA[nextP].accent, border: "none", color: F.plum, fontSize: 12.5, fontWeight: 800,
          }}>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1, textAlign: "right" }}>
              <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{wrapNext ? "Loop back to" : "Next"}</span>
              <span>{DATA[nextP].title}{wrapNext ? " ↻" : ""}</span>
            </span>
            <span style={{ fontSize: 14 }}>→</span>
          </button>
        </div>
      </>
    );
  };

  return (
    <div ref={topRef}>
      {/* Gentle opacity-only crossfade — no motion/scale that would read as a page reload */}
      <style>{`
        @keyframes plc-soft-in { from { opacity: 0; } to { opacity: 1; } }
        .plc-act  { transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; }
        .plc-act:hover  { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(55,2,60,0.10); }
        .plc-beat { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .plc-beat:hover { transform: translateY(-2px); }
        .plc-detailfade { animation: plc-soft-in 0.2s ease both; }
        .plc-prob { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .plc-prob:hover, .plc-prob:focus-visible { box-shadow: 0 6px 18px rgba(55,2,60,0.10); }
        .plc-prob-pop { opacity: 0; visibility: hidden; transform: translateY(-4px); transition: opacity 0.16s ease, transform 0.16s ease, visibility 0.16s ease; }
        .plc-prob:hover .plc-prob-pop, .plc-prob:focus-within .plc-prob-pop { opacity: 1; visibility: visible; transform: none; }
        @media (max-width: 620px) { .plc-tab-label { display: none; } }
        @media (max-width: 560px) { .plc-lane { grid-template-columns: 1fr !important; gap: 6px !important; } }
        @media (max-width: 900px) { .plc-prio-grid { grid-template-columns: 1fr !important; } }
      `}</style>
      {/* Call as functions (not <PhaseView/>) so hovering doesn't remount the subtree and replay animations.
         The keyed wrapper still replays the soft-in once per phase switch. */}
      {open
        ? <div key={"phase-" + open} style={{ animation: "plc-soft-in 0.22s ease both" }}>{PhaseView({ phase: open })}</div>
        : <div key="overview" style={{ animation: "plc-soft-in 0.22s ease both" }}>{Overview()}</div>}
    </div>
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
/* ── Product Vision page ── */
const VISION_WINDOWS = [
  { key: "now", label: "Now", sub: "0–6 mo · committed", color: F.plum, bg: F.lightYellow + "55", dash: false },
  { key: "next", label: "Next", sub: "6–18 mo · shaped", color: F.orange, bg: "rgba(247,139,67,0.08)", dash: false },
  { key: "outer", label: "Outer", sub: "2–3 yr · directional", color: F.muted2, bg: F.bg, dash: true },
];
function VisionPage({ subRoute, setSubRoute }) {
  const [vision, setVision] = useState(DEFAULT_VISION);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef(null);
  useEffect(() => { (async () => { const s = await loadState("faria-vision-v1"); setVision(mergeVision(s)); setReady(true); })(); }, []);
  useEffect(() => { if (!ready) return; clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => saveState("faria-vision-v1", vision), 1000); return () => clearTimeout(saveTimer.current); }, [vision, ready]);

  // Product lives in the 2nd URL segment (Vision has no sub-view): #/vision/openapply
  const focusedProduct = SLUG_PRODUCT[subRoute] || null; // null = Overview
  const setFocusedProduct = (prod) => setSubRoute(prod ? (PRODUCT_SLUG[prod] || "") : "");

  const card = { background: F.surface, border: `1px solid ${F.border}`, borderRadius: 12, padding: "18px 22px", marginBottom: 18, boxShadow: F.shadowSm };
  const sectionTitle = { fontSize: 11, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 };
  const removeBtn = { width: 22, height: 22, borderRadius: 11, border: "none", background: "transparent", color: F.muted2, cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0, flexShrink: 0, fontFamily: "inherit" };
  const addBtn = { marginTop: 8, padding: "5px 11px", borderRadius: 7, border: `1px dashed ${F.borderStrong}`, background: "transparent", color: F.plum, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
  const ta = { ...inp, width: "100%", resize: "vertical", lineHeight: 1.5 };

  const v = focusedProduct ? vision.products[focusedProduct] : null;
  const stamp = () => new Date().toISOString().slice(0, 10);
  const patchP = (updater) => setVision(prev => ({ ...prev, products: { ...prev.products, [focusedProduct]: { ...updater(prev.products[focusedProduct]), updatedAt: stamp() } } }));
  // object-field + nested string-list + nested-array + top-level-array mutators
  const objField = (s, k, val) => patchP(c => ({ ...c, [s]: { ...c[s], [k]: val } }));
  const listAdd = (s, k) => patchP(c => ({ ...c, [s]: { ...c[s], [k]: [...(c[s][k] || []), ""] } }));
  const listSet = (s, k, i, val) => patchP(c => ({ ...c, [s]: { ...c[s], [k]: c[s][k].map((x, ix) => ix === i ? val : x) } }));
  const listDel = (s, k, i) => patchP(c => ({ ...c, [s]: { ...c[s], [k]: c[s][k].filter((_, ix) => ix !== i) } }));
  const nestAdd = (s, k, tmpl) => patchP(c => ({ ...c, [s]: { ...c[s], [k]: [...(c[s][k] || []), tmpl()] } }));
  const nestSet = (s, k, id, patch) => patchP(c => ({ ...c, [s]: { ...c[s], [k]: c[s][k].map(x => x.id === id ? { ...x, ...patch } : x) } }));
  const nestDel = (s, k, id) => patchP(c => ({ ...c, [s]: { ...c[s], [k]: c[s][k].filter(x => x.id !== id) } }));
  const arrAdd = (k, tmpl) => patchP(c => ({ ...c, [k]: [...(c[k] || []), tmpl()] }));
  const arrSet = (k, id, patch) => patchP(c => ({ ...c, [k]: c[k].map(x => x.id === id ? { ...x, ...patch } : x) }));
  const arrDel = (k, id) => patchP(c => ({ ...c, [k]: c[k].filter(x => x.id !== id) }));

  // ── small render helpers ──
  const Labeled = (label, node, hint) => (
    <div style={{ marginBottom: 12 }}>
      <div style={lb}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: F.muted2, fontStyle: "italic", margin: "-2px 0 5px" }}>{hint}</div>}
      {node}
    </div>
  );
  const Field = (s, k, ph, rows = 2) => (
    <textarea value={v[s][k]} onChange={e => objField(s, k, e.target.value)} placeholder={ph} rows={rows} style={ta} />
  );
  const StrList = (s, k, ph, accent = F.pink) => (
    <div>
      {(v[s][k] || []).length === 0 && <div style={{ fontSize: 11.5, color: F.muted2, fontStyle: "italic", marginBottom: 4 }}>None yet.</div>}
      {(v[s][k] || []).map((row, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 0", borderBottom: `1px solid ${F.border}` }}>
          <span style={{ color: accent, fontSize: 11, paddingTop: 7, flexShrink: 0 }}>◆</span>
          <textarea value={row} onChange={e => listSet(s, k, i, e.target.value)} placeholder={ph} rows={1} style={{ flex: 1, ...inp, border: "none", background: "transparent", resize: "vertical", padding: "5px 0", minWidth: 0 }} />
          <button onClick={() => listDel(s, k, i)} title="Remove" style={removeBtn}>×</button>
        </div>
      ))}
      <button onClick={() => listAdd(s, k)} style={addBtn}>+ Add</button>
    </div>
  );
  const numWrapStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };

  // ── 12 section bodies (per-product) ──
  const sectionBody = (key) => {
    if (key === "who") return (<>
      <div style={numWrapStyle}>
        {Labeled("Target segment", Field("who", "segment", "Who is this for?", 2))}
        {Labeled("Buyer", Field("who", "buyer", "Who decides to buy?", 2))}
        {Labeled("Payer (if different)", Field("who", "payer", "Who actually pays?", 2))}
      </div>
      <div style={lb}>Named profiles · one or two</div>
      {v.who.profiles.length === 0 && <div style={{ fontSize: 11.5, color: F.muted2, fontStyle: "italic", marginBottom: 6 }}>No profiles yet.</div>}
      {v.who.profiles.map(p => (
        <div key={p.id} style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={p.name} onChange={e => nestSet("who", "profiles", p.id, { name: e.target.value })} placeholder="Name / persona" style={{ ...inp, flex: 1 }} />
            <input value={p.role} onChange={e => nestSet("who", "profiles", p.id, { role: e.target.value })} placeholder="Role" style={{ ...inp, flex: 1 }} />
            <button onClick={() => nestDel("who", "profiles", p.id)} style={removeBtn}>×</button>
          </div>
          <textarea value={p.jtbd} onChange={e => nestSet("who", "profiles", p.id, { jtbd: e.target.value })} placeholder="Job to be done" rows={1} style={{ ...ta, marginTop: 8 }} />
        </div>
      ))}
      <button onClick={() => nestAdd("who", "profiles", PROFILE_TEMPLATE)} style={addBtn}>+ Add profile</button>
    </>);
    if (key === "current") return (<>
      {Labeled("Today's position & traction", Field("current", "position", "Where the product sits today — honest read.", 3))}
      <div style={lb}>Baseline metrics</div>
      {v.current.baselines.map(b => (
        <div key={b.id} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <input value={b.metric} onChange={e => nestSet("current", "baselines", b.id, { metric: e.target.value })} placeholder="Metric" style={{ ...inp, flex: 2 }} />
          <input value={b.value} onChange={e => nestSet("current", "baselines", b.id, { value: e.target.value })} placeholder="Value today" style={{ ...inp, flex: 1 }} />
          <button onClick={() => nestDel("current", "baselines", b.id)} style={removeBtn}>×</button>
        </div>
      ))}
      <button onClick={() => nestAdd("current", "baselines", BASELINE_TEMPLATE)} style={addBtn}>+ Add metric</button>
      <div style={{ ...numWrapStyle, marginTop: 14 }}>
        <div>{Labeled("What's working", StrList("current", "working", "A strength / what's landing", F.green))}</div>
        <div>{Labeled("What isn't", StrList("current", "notWorking", "A gap / what's not landing", F.pink))}</div>
      </div>
    </>);
    if (key === "vision") return WindowsTriptych("text");
    if (key === "northStar") return (<div style={numWrapStyle}>
      {Labeled("Value measure", Field("northStar", "value", "The enduring value signal (e.g. time saved, outcomes).", 2))}
      {Labeled("Commercial measure", Field("northStar", "commercial", "The paired commercial signal (e.g. ARR, expansion).", 2))}
    </div>);
    if (key === "why") return (<div style={numWrapStyle}>
      {Labeled("Why now", Field("why", "whyNow", "The shift that makes this the moment.", 3))}
      {Labeled("Why us", Field("why", "whyUs", "Our right to win.", 3))}
    </div>);
    if (key === "whatTrue") return (<>
      <div style={numWrapStyle}>
        <div>{Labeled("Core assumptions", StrList("whatTrue", "assumptions", "Something that must hold", F.plum))}</div>
        <div>{Labeled("Top risks", StrList("whatTrue", "risks", "A risk to the bet", F.pink))}</div>
        <div>{Labeled("Watching (outer-weighted)", StrList("whatTrue", "watching", "Signal we're tracking", F.orange))}</div>
      </div>
      <div style={{ ...sectionTitle, marginTop: 8 }}>Triggers</div>
      <div style={numWrapStyle}>
        {Labeled("Double down if…", Field("whatTrue", "doubleDown", "Trigger to invest more.", 2))}
        {Labeled("Pivot if…", Field("whatTrue", "pivot", "Trigger to change course.", 2))}
        {Labeled("Kill if…", Field("whatTrue", "kill", "Trigger to stop the bet.", 2))}
      </div>
    </>);
    if (key === "bets") return (<>
      {v.bets.length === 0 && <div style={{ fontSize: 11.5, color: F.muted2, fontStyle: "italic", marginBottom: 6 }}>No bets yet — aim for 2–4.</div>}
      {v.bets.map((b, i) => (
        <div key={b.id} style={{ background: F.bg, border: `1px solid ${F.border}`, borderTop: `3px solid ${F.pink}`, borderRadius: 8, padding: "11px 13px", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 18, height: 18, borderRadius: 9, background: F.pink, color: "#fff", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
            <input value={b.choice} onChange={e => arrSet("bets", b.id, { choice: e.target.value })} placeholder="The big choice" style={{ ...inp, flex: 1, fontWeight: 700 }} />
            <button onClick={() => arrDel("bets", b.id)} style={removeBtn}>×</button>
          </div>
          <div style={numWrapStyle}>
            <textarea value={b.tradeoff} onChange={e => arrSet("bets", b.id, { tradeoff: e.target.value })} placeholder="Explicit tradeoff (what we're NOT doing)" rows={2} style={ta} />
            <textarea value={b.dependency} onChange={e => arrSet("bets", b.id, { dependency: e.target.value })} placeholder="Dependency we don't own (platform, shared AI, other teams)" rows={2} style={ta} />
          </div>
        </div>
      ))}
      <button onClick={() => arrAdd("bets", BET_TEMPLATE)} style={addBtn}>+ Add bet</button>
    </>);
    if (key === "model") return (<div style={numWrapStyle}>
      {Labeled("Packaging", Field("model", "packaging", "How it's packaged (tiers, bundles).", 3))}
      {Labeled("Pricing", Field("model", "pricing", "How it's priced.", 3))}
      {Labeled("Expansion path", Field("model", "expansion", "How revenue grows over time.", 3))}
    </div>);
    if (key === "goals") return (<>
      {v.goals.length === 0 && <div style={{ fontSize: 11.5, color: F.muted2, fontStyle: "italic", marginBottom: 6 }}>No goals yet.</div>}
      {v.goals.map(g => (
        <div key={g.id} style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
          <select value={g.kind} onChange={e => arrSet("goals", g.id, { kind: e.target.value })} style={{ ...inp, width: 110, cursor: "pointer" }}>
            <option value="product">Product</option><option value="commercial">Commercial</option>
          </select>
          <input value={g.metric} onChange={e => arrSet("goals", g.id, { metric: e.target.value })} placeholder="Metric" style={{ ...inp, flex: 2, minWidth: 140 }} />
          <input value={g.baseline} onChange={e => arrSet("goals", g.id, { baseline: e.target.value })} placeholder="Baseline" style={{ ...inp, width: 100 }} />
          <span style={{ color: F.muted2 }}>→</span>
          <input value={g.target} onChange={e => arrSet("goals", g.id, { target: e.target.value })} placeholder="Target" style={{ ...inp, width: 100 }} />
          <select value={g.window} onChange={e => arrSet("goals", g.id, { window: e.target.value })} style={{ ...inp, width: 90, cursor: "pointer" }}>
            <option value="now">Now</option><option value="next">Next</option><option value="outer">Outer</option>
          </select>
          <button onClick={() => arrDel("goals", g.id)} style={removeBtn}>×</button>
        </div>
      ))}
      <button onClick={() => arrAdd("goals", GOAL_TEMPLATE)} style={addBtn}>+ Add goal</button>
    </>);
    if (key === "horizon") return WindowsTriptych("list");
    if (key === "initiatives") return (<>
      {v.initiatives.length === 0 && <div style={{ fontSize: 11.5, color: F.muted2, fontStyle: "italic", marginBottom: 6 }}>No initiatives yet.</div>}
      {v.initiatives.map(it => (
        <div key={it.id} style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 8, padding: "11px 13px", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={it.program} onChange={e => arrSet("initiatives", it.id, { program: e.target.value })} placeholder="Program / initiative" style={{ ...inp, flex: 2, fontWeight: 700 }} />
            <input value={it.deliversBet} onChange={e => arrSet("initiatives", it.id, { deliversBet: e.target.value })} placeholder="Delivers which bet?" style={{ ...inp, flex: 1 }} />
            <button onClick={() => arrDel("initiatives", it.id)} style={removeBtn}>×</button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={it.team} onChange={e => arrSet("initiatives", it.id, { team: e.target.value })} placeholder="Team" style={{ ...inp, flex: 1, minWidth: 120 }} />
            <input value={it.budget} onChange={e => arrSet("initiatives", it.id, { budget: e.target.value })} placeholder="Budget" style={{ ...inp, flex: 1, minWidth: 120 }} />
            <select value={it.buildBuy} onChange={e => arrSet("initiatives", it.id, { buildBuy: e.target.value })} style={{ ...inp, width: 110, cursor: "pointer" }}>
              <option value="build">Build</option><option value="buy">Buy</option><option value="partner">Partner</option>
            </select>
          </div>
        </div>
      ))}
      <button onClick={() => arrAdd("initiatives", INITIATIVE_TEMPLATE)} style={addBtn}>+ Add initiative</button>
    </>);
    if (key === "alive") return (<div style={numWrapStyle}>
      {Labeled("Owner", Field("alive", "owner", "Who keeps this vision alive?", 1))}
      {Labeled("Re-baseline cadence", Field("alive", "cadence", "Now firm; Next & Outer refreshed quarterly. How it plugs into planning.", 2))}
    </div>);
    return null;
  };

  function WindowsTriptych(mode) {
    return (
      <div style={numWrapStyle} className="vis-tript">
        {VISION_WINDOWS.map(w => (
          <div key={w.key} style={{ background: w.bg, border: `1px ${w.dash ? "dashed" : "solid"} ${F.border}`, borderTop: `3px solid ${w.color}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: F.plum }}>{w.label}</span>
              <span style={{ fontSize: 10, color: F.muted2, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{w.sub}</span>
            </div>
            {mode === "text"
              ? <textarea value={v.vision[w.key]} onChange={e => objField("vision", w.key, e.target.value)} placeholder={w.key === "now" ? "Committed, high resolution — the product state we're building toward." : w.key === "next" ? "Shaped — direction set, specifics flexible." : "Directional hypothesis, held loosely."} rows={4} style={ta} />
              : StrList("horizon", w.key, "A bet or initiative in this window", w.color)}
          </div>
        ))}
      </div>
    );
  }

  // ── chip nav ──
  const chip = (label, prod, active) => (
    <button key={label} onClick={() => setFocusedProduct(prod)} style={{ padding: "5px 13px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", background: active ? F.plum : F.surface, color: active ? F.paper : F.plum, border: `1px solid ${active ? F.plum : F.borderStrong}`, fontFamily: "inherit" }}>{label}</button>
  );

  // ── Overview ──
  const overview = () => {
    const trunc = (s) => (s || "").trim() || <span style={{ color: F.muted2, fontStyle: "italic" }}>—</span>;
    return (
      <>
        <div style={{ ...card, position: "relative", overflow: "hidden", background: `linear-gradient(135deg, ${F.plum}, ${F.lightPlum})`, border: "none", color: F.paper, padding: "22px 26px" }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: F.yellow, marginBottom: 8 }}>Product Vision Framework</div>
          <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.55, maxWidth: 820, color: F.paper, opacity: 0.95 }}>Give each Faria product a decision-forcing definition of where it's going, why, how we'll get there, and how it pays for itself — so leadership and teams make aligned, accountable calls and can tell whether we're winning.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {VISION_WINDOWS.map(w => (
              <span key={w.key} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 700, color: F.paper, background: "rgba(255,255,255,0.1)", border: `1px solid rgba(255,255,255,0.18)`, borderRadius: 999, padding: "4px 12px" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: w.color === F.muted2 ? "#C9B9C7" : w.color }} />{w.label} · {w.sub.split(" · ")[0]}
              </span>
            ))}
          </div>
        </div>

        {/* The framework — 12 sections grouped */}
        <div style={card}>
          <div style={sectionTitle}>The framework · 12 sections each product works through</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {Object.entries(VISION_GROUPS).map(([g, gname]) => (
              <div key={g} style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: F.pink, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{gname}</div>
                {VISION_SECTIONS.filter(s => s.group === g).map(s => (
                  <div key={s.n} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: F.plum }}><span style={{ color: F.muted2 }}>{s.n}.</span> {s.title}</div>
                    <div style={{ fontSize: 11, color: F.muted, lineHeight: 1.4 }}>{s.guide}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Per-product progress grid */}
        <div style={card}>
          <div style={sectionTitle}>Each product's vision · pick one to open</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {MONZ_PRODUCTS.map(p => {
              const pv = vision.products[p];
              const pct = visionCompletion(pv);
              return (
                <div key={p} onClick={() => setFocusedProduct(p)} style={{ background: F.bg, border: `1px solid ${F.border}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: F.plum }}>{p}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: pct > 0 ? F.green : F.muted2 }}>{pct}%</div>
                  </div>
                  <div style={{ height: 6, background: F.border, borderRadius: 999, overflow: "hidden", marginBottom: 10 }}><div style={{ width: `${pct}%`, height: "100%", background: F.gradient }} /></div>
                  <div style={{ fontSize: 11.5, color: F.muted, lineHeight: 1.5 }}><strong style={{ color: F.plum }}>Owner:</strong> {pv.alive.owner || "—"}</div>
                  <div style={{ fontSize: 11.5, color: F.muted, lineHeight: 1.5 }}><strong style={{ color: F.plum }}>North star:</strong> {pv.northStar.value || "—"}</div>
                  <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: F.pink }}>Open →</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cross-product comparison */}
        <div style={card}>
          <div style={sectionTitle}>At a glance · north star &amp; rolling windows across products</div>
          <div style={{ overflowX: "auto", border: `1px solid ${F.border}`, borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 760 }}>
              <thead><tr style={{ background: F.bg }}>
                {["Product", "North star", "Now", "Next", "Outer"].map((h, i) => (
                  <th key={h} style={{ textAlign: "left", padding: "9px 12px", fontSize: 10, fontWeight: 700, color: F.muted2, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${F.border}`, width: i === 0 ? "14%" : i === 1 ? "22%" : "21%" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {MONZ_PRODUCTS.map((p, ri) => {
                  const pv = vision.products[p];
                  const cellTxt = (s) => <span style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>{s}</span>;
                  return (
                    <tr key={p} style={{ background: ri % 2 ? F.bg : F.surface, cursor: "pointer" }} onClick={() => setFocusedProduct(p)}>
                      <td style={{ padding: "10px 12px", fontWeight: 800, color: F.plum, verticalAlign: "top" }}>{p}</td>
                      <td style={{ padding: "10px 12px", color: F.plum, verticalAlign: "top" }}>{cellTxt(trunc(pv.northStar.value))}</td>
                      <td style={{ padding: "10px 12px", color: F.muted, verticalAlign: "top", borderLeft: `2px solid ${F.plum}` }}>{cellTxt(trunc(pv.vision.now))}</td>
                      <td style={{ padding: "10px 12px", color: F.muted, verticalAlign: "top", borderLeft: `2px solid ${F.orange}` }}>{cellTxt(trunc(pv.vision.next))}</td>
                      <td style={{ padding: "10px 12px", color: F.muted, verticalAlign: "top", borderLeft: `2px dashed ${F.muted2}` }}>{cellTxt(trunc(pv.vision.outer))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  // ── Per-product page ──
  const productPage = () => {
    const pct = visionCompletion(v);
    return (
      <>
        {/* sticky-ish header */}
        <div style={{ ...card, borderLeft: `4px solid ${F.pink}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: F.plum }}>{focusedProduct} <span style={{ fontSize: 12, fontWeight: 700, color: F.muted2 }}>· Product Vision</span></div>
            <div style={{ fontSize: 11.5, color: F.muted }}>Owner: <strong style={{ color: F.plum }}>{v.alive.owner || "—"}</strong> · Cadence: <strong style={{ color: F.plum }}>{v.alive.cadence || "—"}</strong>{v.updatedAt && <> · Updated {v.updatedAt}</>}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <div style={{ flex: 1, height: 7, background: F.border, borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: F.gradient }} /></div>
            <div style={{ fontSize: 12, fontWeight: 800, color: pct > 0 ? F.green : F.muted2 }}>{pct}% complete</div>
          </div>
          {/* section index */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 12 }}>
            {VISION_SECTIONS.map(s => (
              <button key={s.n} onClick={() => { const el = document.getElementById("vis-sec-" + s.n); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                title={s.title} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${F.borderStrong}`, background: F.surface, color: F.plum, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{s.n}</button>
            ))}
          </div>
        </div>

        {Object.entries(VISION_GROUPS).map(([g, gname]) => (
          <div key={g}>
            <div style={{ fontSize: 11, fontWeight: 800, color: F.pink, textTransform: "uppercase", letterSpacing: "0.08em", margin: "4px 2px 10px" }}>{gname}</div>
            {VISION_SECTIONS.filter(s => s.group === g).map(s => (
              <div key={s.n} id={"vis-sec-" + s.n} style={{ ...card, scrollMarginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: F.plum, color: F.paper, fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.n}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: F.plum, lineHeight: 1.2 }}>{s.title}</div>
                    <div style={{ fontSize: 11.5, color: F.muted, lineHeight: 1.4, fontStyle: "italic" }}>{s.guide}</div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>{sectionBody(s.key)}</div>
              </div>
            ))}
          </div>
        ))}
      </>
    );
  };

  return (
    <>
      <style>{`@media (max-width: 640px){ .vis-tript { grid-template-columns: 1fr !important; } }`}</style>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: F.plum, lineHeight: 1.15 }}>Product Vision</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13.5, color: F.muted }}>Each product records its own vision — where it's going, why, how it gets there, and how it pays for itself.</p>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        {chip("Overview", null, !focusedProduct)}
        {MONZ_PRODUCTS.map(p => chip(p, p, focusedProduct === p))}
      </div>
      {focusedProduct ? productPage() : overview()}
    </>
  );
}

const PAGE_SLUG = {
  product:  "product",
  ai:       "ai",
  monz:     "monetization",
  handoff:  "lifecycle",
  pods:     "pods",
  vision:   "vision",
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
  const parts = h.split("/").map(s => s.trim());
  const [pageSlug = "", subSlug = "", deepSlug = ""] = parts;
  const page = SLUG_PAGE[pageSlug] || "product";
  let sub = subSlug;
  if (SLUG_SUB[page]) sub = SLUG_SUB[page][subSlug] || "";
  return { page, sub, deep: deepSlug };
}
function buildHash(page, sub, deep) {
  const pageSlug = PAGE_SLUG[page] || "product";
  let subSlug = sub || "";
  if (subSlug && SUB_SLUG[page]) subSlug = SUB_SLUG[page][sub] || sub;
  if (deep && subSlug) return `#/${pageSlug}/${subSlug}/${deep}`;
  return subSlug ? `#/${pageSlug}/${subSlug}` : `#/${pageSlug}`;
}
function useHashRoute() {
  const [route, setRouteState] = useState(parseHash);
  useEffect(() => {
    const onHash = () => setRouteState(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = (page, sub = "", deep = "") => {
    const target = buildHash(page, sub, deep);
    if (window.location.hash !== target) {
      window.history.pushState(null, "", target);
    }
    setRouteState({ page, sub, deep });
  };
  return [route, navigate];
}

/* ── Main App ── */
export default function App() {
  const [route, navigate] = useHashRoute();
  const { page, sub, deep } = route;
  const setPage = (p) => navigate(p);
  const setSub = (s) => navigate(page, s);
  const setDeep = (d) => navigate(page, sub, d);
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
        <div onClick={() => setPage("product")} onMouseEnter={() => setHovNav("product")} onMouseLeave={() => setHovNav(null)} title="Product Transformation" style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
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
            <span style={{ fontSize: 11, fontWeight: 700, color: (page === "product" || hovNav === "product") ? F.paper : F.yellow, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: `1.5px solid ${page === "product" ? F.paper : "transparent"}`, paddingBottom: 1, transition: "all 0.15s" }}>Product Trackers</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {navBtn("ai", <><span className="lbl-full">AI Powered Features</span><span className="lbl-short">AI Features</span></>)}
          {navBtn("monz", "AI Monetization")}
          {navBtn("handoff", <><span className="lbl-full">Product Lifecycle</span><span className="lbl-short">Lifecycle</span></>)}
          {navBtn("pods", <><span className="lbl-full">AI Pods</span><span className="lbl-short">Pods</span></>)}
          {navBtn("vision", <><span className="lbl-full">Product Vision</span><span className="lbl-short">Vision</span></>)}
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 28px" }}>
        {page === "product" && <TrackerPage title="Product Transformation Tracker" subtitle="Cross-product strategic initiatives" storageKey="faria-product-v10" defaults={DEFAULT_PRODUCT} ModalComponent={ProdModal} onCelebrate={setCelName} />}
        {page === "ai" && <TrackerPage title="AI Powered Features" subtitle="AI features, projects, and integrations across Faria products" storageKey="faria-ai-v12" sortField="product" defaults={DEFAULT_AI} ModalComponent={AIModal} onCelebrate={setCelName} addLabel="+ AI Feature"
          extraRowInfo={(init) => (<>{init.product && chip(init.product)}{init.priority && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: pC(init.priority), color: "#fff", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{init.priority}</span>}</>)}
          extraDetailFields={(init, setField) => (<><div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>{init.product && chip(init.product)}{init.type && chip(init.type)}{init.priority && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: pC(init.priority), color: "#fff", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{init.priority}</span>}</div><div style={{ display: "flex", gap: 12, marginBottom: 12 }}><div style={{ flex: 1 }}><div style={lb}>Effort</div><div style={{ fontSize: 13, color: F.plum, fontWeight: 700 }}>{(init.effort||"medium").charAt(0).toUpperCase()+(init.effort||"medium").slice(1)}</div></div><div style={{ flex: 1 }}><div style={lb}>Impact</div><div style={{ fontSize: 13, color: F.plum, fontWeight: 700 }}>{(init.impact||"medium").charAt(0).toUpperCase()+(init.impact||"medium").slice(1)}</div></div></div></>)}
        />}
        {page === "monz" && <AiMonetizationPage subRoute={sub} setSubRoute={setSub} deepRoute={deep} setDeepRoute={setDeep} />}
        {page === "handoff" && <PrioritizationPage subRoute={sub} setSubRoute={setSub} />}
        {page === "pods" && <AiPodsPage subRoute={sub} setSubRoute={setSub} />}
        {page === "vision" && <VisionPage subRoute={sub} setSubRoute={setSub} />}
      </div>
    </div>
  );
}
