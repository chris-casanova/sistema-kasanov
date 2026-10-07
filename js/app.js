/* Sistema KASANOV · aplicación (sin frameworks ni build).
   Requiere js/runtime.js, que provee window.claude.use("db"|"sample"). */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const ds=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parse=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return ds(d)};
const today=()=>ds(new Date());
const monday=s=>{const d=parse(s);const w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return ds(d)};
const DOW=["lun","mar","mié","jue","vie","sáb","dom"];
const MON=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const pretty=s=>{const d=parse(s);return DOW[(d.getDay()+6)%7]+" "+d.getDate()+" "+MON[d.getMonth()]};
const short=(s,n)=>{s=String(s||"").replace(/\s+/g," ").trim();return s.length>n?s.slice(0,n-1)+"…":s};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const nowISO=()=>new Date().toISOString();
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
function isoWeek(s){const d=parse(s);const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const dn=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-dn);const y=new Date(Date.UTC(t.getUTCFullYear(),0,1));return t.getUTCFullYear()+"-W"+pad(Math.ceil(((t-y)/864e5+1)/7))}
function slug(s){return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"h"}
let toastT;function toast(m){const t=$("toast");t.textContent=mm(m);t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3400)}
const PALETTE=["#5AD1E8","#FF9E6B","#7EE0A1","#C69CFF","#FFD86B","#FF7AA8"];
const GOLD="#FFB547";

const S={config:null,days:{},projects:[],cards:[],reviews:[],requests:[],changelog:[],missions:[],quests:{},skills:[],fin:null,decisions:[],forced:null,live:null};
let db=null,sample=null,sampleOff=false,mcp=null;let cur=today();

/* ---------- ocultar cifras de dinero ---------- */
let HIDE=false;try{HIDE=localStorage.getItem("hide$")==="1"}catch(e){}
const MASK="•••";
function mxn(n){return HIDE?"$"+MASK:"$"+Math.round(+n||0).toLocaleString("es-MX")}
const CURW="(MXN|USD|pesos|d[oó]lares)";
const RE1=new RegExp("\\$\\s?\\d[\\d.,]*(?:\\s?(?:k|mil|millones?)\\b)?(?:\\s?"+CURW+")?","gi");
const RE2=new RegExp("\\b\\d[\\d.,]*\\s?(?:(?:k|mil|millones?)\\s?)?"+CURW+"\\b","gi");
const RE3=/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g;
function mm(s){s=String(s??"");if(!HIDE)return s;return s.replace(RE1,()=>"$"+MASK).replace(RE2,(m,c)=>MASK+" "+c).replace(RE3,MASK)}
const T=s=>esc(mm(s));
const EYE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYEOFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
function paintHide(){const b=$("money-toggle");b.innerHTML=(HIDE?EYEOFF:EYE)+'<span class="lbl">'+(HIDE?"Mostrar $":"Ocultar $")+"</span>";b.setAttribute("aria-pressed",HIDE);b.setAttribute("aria-label",HIDE?"Mostrar cifras de dinero":"Ocultar cifras de dinero");$("money-toggle2").textContent=HIDE?"Mostrar cifras":"Ocultar cifras"}
function setHide(v){HIDE=v;try{localStorage.setItem("hide$",v?"1":"0")}catch(e){}paintHide();fDirty=false;renderAll()}
$("money-toggle").onclick=()=>setHide(!HIDE);$("money-toggle2").onclick=()=>setHide(!HIDE);

/* ---------- navegación por áreas ---------- */
const GROUPS={nexo:["nexo"],personal:["hoy","semana","habitos"],trabajo:["proyectos","habilidades","repaso"],finanzas:["finanzas"],sistema:["revisiones","mejoras","escuadron","ajustes"]};
const ALLV=Object.values(GROUPS).flat();
const groupOf=v=>Object.keys(GROUPS).find(g=>GROUPS[g].includes(v))||"nexo";
const tabs=[...document.querySelectorAll("nav.tabs button")];
let VIEW="nexo";const lastSub={personal:"hoy",trabajo:"proyectos",finanzas:"finanzas",sistema:"revisiones"};
function show(v){
  if(!ALLV.includes(v))v="nexo";const g=groupOf(v);VIEW=v;if(g!=="nexo")lastSub[g]=v;
  tabs.forEach(b=>b.setAttribute("aria-selected",b.dataset.group===g));
  $("gear").setAttribute("aria-pressed",g==="sistema");
  $("p-nexo").hidden=g!=="nexo";["personal","trabajo","finanzas","sistema"].forEach(x=>$("g-"+x).hidden=g!==x);
  ALLV.forEach(x=>{if(x!=="nexo")$("p-"+x).hidden=x!==v});
  document.querySelectorAll(".subnav button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.view===v));
  try{localStorage.setItem("view",v);localStorage.setItem("subs",JSON.stringify(lastSub))}catch(e){}
  renderAll();
}
tabs.forEach(b=>b.onclick=()=>{const g=b.dataset.group;show(g==="nexo"?"nexo":lastSub[g])});
document.querySelectorAll(".subnav button").forEach(b=>b.onclick=()=>show(b.dataset.view));
$("gear").onclick=()=>show(groupOf(VIEW)==="sistema"?"nexo":lastSub.sistema);
let start="nexo";try{start=localStorage.getItem("view")||"nexo";const ls=JSON.parse(localStorage.getItem("subs")||"{}");Object.keys(lastSub).forEach(k=>{if(ALLV.includes(ls[k])&&groupOf(ls[k])===k)lastSub[k]=ls[k]})}catch(e){}
if(ALLV.includes(location.hash.slice(1)))start=location.hash.slice(1);

/* ---------- escrituras ---------- */
const chains={};
function save(path,data){
  if(!db){toast("Sin conexión con la base de datos: los cambios no se guardan.");return Promise.resolve()}
  chains[path]=(chains[path]||Promise.resolve()).then(()=>db.doc(path).set(data)).catch(e=>{
    toast(e&&e.code==="quota_exceeded"?"Base de datos llena: borra tarjetas o proyectos viejos.":"No se pudo guardar ("+(e&&e.code||"error")+"). Revisa tu conexión.")});
  return chains[path];
}
function del(path){if(!db)return;chains[path]=(chains[path]||Promise.resolve()).then(()=>db.doc(path).delete()).catch(()=>toast("No se pudo borrar."))}

/* ---------- puntuación ---------- */
function cfg(){return S.config||{habits:[],bonus:[],bonusPerPoint:3,weekMins:[3],studyTargetMin:[120],start:today(),departments:[]}}
function depts(){return (cfg().departments||[]).map((d,i)=>Object.assign({color:PALETTE[i%PALETTE.length],idx:i},d))}
function weekIndex(s){const w=Math.floor((parse(monday(s))-parse(monday(cfg().start||today())))/(7*864e5));return Math.max(0,w)}
function pick(arr,i){return arr&&arr.length?arr[Math.min(i,arr.length-1)]:0}
function minFor(s){return pick(cfg().weekMins,weekIndex(s))||3}
function studyTarget(s){return pick(cfg().studyTargetMin,weekIndex(s))||0}
function dayData(s){return S.days[s]||{date:s,habits:{},bonus:{},studyMin:0}}
function score(s){
  const c=cfg(),d=dayData(s);
  const core=c.habits.filter(h=>d.habits&&d.habits[h.id]).length;
  const b=c.bonus.filter(h=>d.bonus&&d.bonus[h.id]).length;
  const per=c.bonusPerPoint||3;const pts=core+Math.floor(b/per);
  const pri=c.habits.filter(h=>h.priority);const priOk=!pri.length||pri.some(h=>d.habits&&d.habits[h.id]);
  const min=minFor(s);return {pts,core,b,per,min,priOk,met:pts>=min&&priOk,any:core+b>0};
}
function streak(){let s=today();if(!score(s).met)s=addDays(s,-1);let n=0;while(score(s).met&&n<1000){n++;s=addDays(s,-1)}return n}

/* ---------- XP / rango ---------- */
const RANKS=[[1,"Recluta"],[3,"Aprendiz"],[5,"Explorador"],[8,"Constructor"],[11,"Creador"],[15,"Estratega"],[20,"Leyenda"]];
function xpTotal(){
  let xp=0;
  Object.keys(S.days).forEach(s=>{if(s<=today()){if(score(s).met)xp+=20;xp+=Math.floor((S.days[s].studyMin||0)/10)}});
  S.cards.forEach(c=>xp+=2*(c.reviews||0));
  S.projects.forEach(p=>xp+={doing:15,review:30,done:60}[p.status]||0);
  S.skills.forEach(s=>{if(s.level==="probada")xp+=5});
  Object.values(S.quests).forEach(q=>{if(q.done)xp+=15});
  S.missions.forEach(m=>{if(m.status==="done")xp+=5});
  return xp;
}
const lvlOf=xp=>Math.floor(Math.sqrt(xp/25))+1;
function rankOf(l){let r=RANKS[0][1];RANKS.forEach(([n,t])=>{if(l>=n)r=t});return r}
function agentXP(id){let n=0;S.missions.forEach(m=>(m.steps||[]).forEach(st=>{if(st.who===id&&st.kind==="report")n++}));return n*10}

/* =================== ESCENA =================== */
const cv=$("scene"),mainG=cv.getContext("2d");mainG.imageSmoothingEnabled=false;let G=mainG;
const W=320,H=180,NEXO={x:160,y:80};
const SLOTS=[{x:8,y:6,w:100,h:58,top:1,side:"L"},{x:212,y:6,w:100,h:58,top:1,side:"R"},{x:8,y:116,w:100,h:58,top:0,side:"L"},{x:212,y:116,w:100,h:58,top:0,side:"R"},{x:124,y:4,w:72,h:44,top:1,side:"N"},{x:124,y:132,w:72,h:44,top:0,side:"S"}];
const KINDS={aprendizaje:"lib",carrera:"map",habitos:"gym",sistema:"ctrl",finanzas:"bank"};
const KLIST=["lib","map","gym","ctrl","bank","studio"];
const LOOK={lib:{skin:"#EDC09A",hair:"#5A3426",acc:"glasses"},map:{skin:"#C68A5E",hair:"#22180F",acc:"hat"},gym:{skin:"#8E5B3C",hair:"#141010",acc:"band"},ctrl:{skin:"#F2CDA8",hair:"#B0562A",acc:"hardhat"},bank:{skin:"#DCA67A",hair:"#B9B9C4",acc:"tophat"},studio:{skin:"#E3B48C",hair:"#2C2C3A",acc:"antenna"}};
const TRAITS={aprendizaje:"Curiosa y paciente. Insiste en que repases y lo expliques simple.",carrera:"Escéptico de las modas. Solo cree en evidencia y en lo que disfrutas construir.",habitos:"Exigente pero nunca regaña. Celebra el mínimo cumplido.",sistema:"Detallista. Odia la fricción y todo lo que estorbe.",finanzas:"Frío con los números, cálido con las buenas ideas. No aprueba gastos innecesarios."};
const HALL="#29234A",HALLE="#3E3774",HALLD="#352E60";
const MEET=["PW","PE","PNW","PNE","PSW","PSE","PN"];
const SC={rooms:{},agents:{},pulses:[],bubbles:[],t:0,think:0,trail:{},token:0,
  cmd:{id:"cmd",x:160,y:110,isCmd:true,color:GOLD,look:{skin:"#E0AE85",hair:"#2A1A12",acc:"none"},kind:"cmd",dir:1,ph:0,blink:3,blinkT:0,state:"idle",path:[],seed:.3,emote:null}};
const NEXO_T={x:160,y:84,isNexo:true,color:GOLD};
let NODES={},ADJ={},EDGES=[],BG=null;
function P(x,y,w,h,c){G.fillStyle=c;G.fillRect(Math.round(x),Math.round(y),w,h)}
function mix(c1,c2,k){const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));const a=p(c1),b=p(c2);return "#"+a.map((v,i)=>Math.round(v*k+b[i]*(1-k)).toString(16).padStart(2,"0")).join("")}
function addN(id,x,y,type,room){NODES[id]={id,x,y,type,room};ADJ[id]=ADJ[id]||[]}
function link(a,b,type){if(!NODES[a]||!NODES[b])return;ADJ[a].push(b);ADJ[b].push(a);EDGES.push({a,b,type})}
function route(from,to){
  if(from===to)return[];if(!NODES[from]||!NODES[to])return NODES[to]?[to]:[];
  const dist={},prev={},seen={};Object.keys(NODES).forEach(k=>dist[k]=Infinity);dist[from]=0;
  for(;;){let u=null,best=Infinity;for(const k in dist)if(!seen[k]&&dist[k]<best){best=dist[k];u=k}
    if(u===null||u===to)break;seen[u]=1;
    for(const v of ADJ[u]){const d=best+Math.abs(NODES[u].x-NODES[v].x)+Math.abs(NODES[u].y-NODES[v].y);if(d<dist[v]){dist[v]=d;prev[v]=u}}}
  if(!(to in prev))return[to];
  const out=[];let c=to;while(c!==from){out.unshift(c);c=prev[c]}return out;
}
function layout(){
  NODES={};ADJ={};EDGES=[];
  const L=130,R=190,T=60,B=120,M=90;
  addN("PNW",L,T,"hall");addN("PN",160,T,"hall");addN("PNE",R,T,"hall");addN("PE",R,M,"hall");addN("PSE",R,B,"hall");addN("PS",160,B,"hall");addN("PSW",L,B,"hall");addN("PW",L,M,"hall");
  [["PNW","PN"],["PN","PNE"],["PNE","PE"],["PE","PSE"],["PSE","PS"],["PS","PSW"],["PSW","PW"],["PW","PNW"]].forEach(([a,b])=>link(a,b,"ring"));
  const list=depts().slice(0,6);const ov=$("overlay");ov.querySelectorAll(".roomlabel").forEach(e=>e.remove());
  const keep={};
  list.forEach((d,i)=>{
    const s=SLOTS[i];const id=d.id;const cxr=s.x+s.w/2;const kind=KINDS[id]||KLIST[i];
    const doorY=s.top?s.y+s.h:s.y;const hy=s.top?(s.h>50?s.y+32:s.y+26):(s.y+s.h-12);const cy=s.top?hy+12:hy-12;
    addN("D:"+id,cxr,doorY,"door",id);addN("C:"+id,cxr,cy,"carpet",id);addN("H:"+id,cxr,hy,"carpet",id);addN("G:"+id,cxr+15,cy,"carpet",id);
    link("D:"+id,"C:"+id,"carpet");link("C:"+id,"H:"+id,"carpet");link("C:"+id,"G:"+id,"carpet");
    if(s.side==="L"){addN("JL",58,M,"hall");link("D:"+id,"JL","hall")}
    if(s.side==="R"){addN("JR",262,M,"hall");link("D:"+id,"JR","hall")}
    if(s.side==="N")link("D:"+id,"PN","hall");
    if(s.side==="S")link("D:"+id,"PS","hall");
    const r={x:s.x,y:s.y,w:s.w,h:s.h,top:!!s.top,cx:cxr,color:d.color,carpet:mix(d.color,"#1B1733",.3),kind,dept:d,entry:{L:"PW",R:"PE",N:"PN",S:"PS"}[s.side],desk:{x:cxr-20,y:hy-6}};
    SC.rooms[id]=r;keep[id]=1;
    let a=SC.agents[id];
    if(!a)a=SC.agents[id]={id,x:cxr,y:hy,node:"H:"+id,path:[],waiters:[],state:"idle",dir:1,ph:Math.random()*6,blink:1+Math.random()*4,blinkT:0,emote:null,speed:46,seed:Math.random()*5};
    if(!a.path.length){a.node="H:"+id;a.x=cxr;a.y=hy}
    Object.assign(a,{name:d.name,color:d.color,kind,look:LOOK[kind]||LOOK.studio,room:r,home:"H:"+id});
    const lb=document.createElement("div");lb.className="roomlabel";lb.style.left=(s.x+3)/W*100+"%";lb.style.top=(s.top?s.y+1:s.y+s.h-11)/H*100+"%";lb.style.color=d.color;lb.textContent=d.name;ov.appendChild(lb);
  });
  if(NODES.JL)link("JL","PW","hall");if(NODES.JR)link("JR","PE","hall");
  Object.keys(SC.rooms).forEach(k=>{if(!keep[k])delete SC.rooms[k]});
  Object.keys(SC.agents).forEach(k=>{if(!keep[k])delete SC.agents[k]});
  buildBG();
}
function strip(e,hw,col){const a=NODES[e.a],b=NODES[e.b];if(!a||!b)return;if(a.y===b.y){const x0=Math.min(a.x,b.x)-hw,x1=Math.max(a.x,b.x)+hw;P(x0,a.y-hw,x1-x0,hw*2,col)}else{const y0=Math.min(a.y,b.y)-hw,y1=Math.max(a.y,b.y)+hw;P(a.x-hw,y0,hw*2,y1-y0,col)}}
function buildBG(){
  const c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");g.imageSmoothingEnabled=false;const prev=G;G=g;
  P(0,0,W,H,"#0E0C1D");
  for(let y=0;y<H;y+=8)for(let x=0;x<W;x+=8)if(((x+y)>>3)%2)P(x,y,8,8,"#121027");
  for(let i=0;i<46;i++)P((i*73+11)%W,(i*41+17)%H,1,1,"#2A2550");
  const halls=EDGES.filter(e=>e.type!=="carpet");
  halls.forEach(e=>strip(e,6,HALLE));halls.forEach(e=>strip(e,5,HALL));
  halls.forEach(e=>{const a=NODES[e.a],b=NODES[e.b];if(a.y===b.y){const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x);for(let x=x0+3;x<x1-3;x+=6)P(x,a.y,3,1,HALLD)}else{const y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y);for(let y=y0+3;y<y1-3;y+=6)P(a.x,y,1,3,HALLD)}});
  halls.forEach(e=>{[NODES[e.a],NODES[e.b]].forEach(n=>{if(n.type==="hall"){P(n.x-6,n.y-6,1,1,"#5A52A0");P(n.x+5,n.y-6,1,1,"#5A52A0");P(n.x-6,n.y+5,1,1,"#5A52A0");P(n.x+5,n.y+5,1,1,"#5A52A0")}})});
  G.fillStyle="#1A1636";G.beginPath();G.ellipse(160,88,23,20,0,0,Math.PI*2);G.fill();
  G.strokeStyle=GOLD+"55";G.lineWidth=1;G.beginPath();G.ellipse(160,88,23,20,0,0,Math.PI*2);G.stroke();
  G.strokeStyle=GOLD+"22";G.beginPath();G.ellipse(160,88,15,12,0,0,Math.PI*2);G.stroke();
  G=prev;BG=c;
}
function plant(x,base,t,leaf){P(x+1,base-4,5,4,"#8A4B2A");P(x,base-5,7,1,"#A35C36");const sw=reduced?0:Math.round(Math.sin(t*1.3)*0.6);P(x+1+sw,base-9,5,4,"#3FA66B");P(x+2+sw,base-11,3,2,"#57C285");if(leaf){P(x+1+sw,base-8,1,1,leaf);P(x+5+sw,base-7,1,1,leaf);P(x+3+sw,base-10,1,1,leaf)}}
function gearIcon(x,y,an,c){const pts=[[0,-3],[2,-2],[3,0],[2,2],[0,3],[-2,2],[-3,0],[-2,-2]];const o=(an|0)%2;pts.forEach((p,i)=>{if((i+o)%2===0)P(x+p[0],y+p[1],1,1,c)});P(x-1,y-1,3,3,c);P(x,y,1,1,"#1B1733")}
function decor(r,t,working){
  const ZR={x:r.cx+22,y:r.y+10,w:r.x+r.w-4-(r.cx+22),h:r.h-15};
  const ZF=r.top?{x:r.x+4,y:r.desk.y+10,w:(r.cx-9)-(r.x+4),h:(r.y+r.h-3)-(r.desk.y+10)}:{x:r.x+4,y:r.y+10,w:(r.cx-9)-(r.x+4),h:(r.desk.y-9)-(r.y+10)};
  const k=r.kind,c=r.color;
  if(k==="lib"){
    const bw=Math.min(22,ZR.w),bh=Math.min(28,ZR.h);
    if(bw>8){P(ZR.x,ZR.y,bw,bh,"#3A2A22");for(let s=0;s<3;s++){const sy=ZR.y+1+s*9;if(sy+9>ZR.y+bh)break;let i=0;for(let bx=ZR.x+2;bx<ZR.x+bw-2;bx+=3,i++){const tall=(i+s)%3?6:7;P(bx,sy+8-tall,2,tall,PALETTE[(i*2+s)%6])}P(ZR.x+1,sy+8,bw-2,1,"#5A4030")}}
    plant(ZF.x+1,ZF.y+ZF.h,t);
    if(ZF.w>26){P(ZF.x+12,ZF.y+ZF.h-6,14,4,c+"40");P(ZF.x+16,ZF.y+ZF.h-8,6,2,"#F4F1FF");P(ZF.x+19,ZF.y+ZF.h-8,1,2,"#B8B0E0")}
  }
  if(k==="map"){
    const mw=Math.min(22,ZR.w),mh=Math.min(14,ZR.h);
    if(mw>10){P(ZR.x,ZR.y,mw,mh,"#1E4A6E");P(ZR.x,ZR.y,mw,1,"#8A6A40");P(ZR.x,ZR.y+mh-1,mw,1,"#8A6A40");P(ZR.x+2,ZR.y+3,6,4,"#3E8E5A");P(ZR.x+10,ZR.y+2,5,6,"#3E8E5A");if(mw>18)P(ZR.x+15,ZR.y+7,4,4,"#3E8E5A");
      for(let i=0;i<4;i++)P(ZR.x+4+i*3,ZR.y+9-(i%2)*2,2,1,"#FF6B6B");P(ZR.x+mw-5,ZR.y+2,1,5,"#F4F1FF");P(ZR.x+mw-4,ZR.y+2,3,2,(t*2|0)%2?"#FF6B6B":"#FFD86B")}
    if(ZR.h>mh+18){const gx=ZR.x+Math.floor(mw/2),gy=ZR.y+mh+8;G.fillStyle="#2D6FA8";G.beginPath();G.arc(gx+.5,gy+.5,5,0,Math.PI*2);G.fill();const o=reduced?3:(t*4|0)%10;G.save();G.beginPath();G.arc(gx+.5,gy+.5,5,0,Math.PI*2);G.clip();P(gx-6+o,gy-3,4,3,"#4FB477");P(gx-10+o,gy+1,3,2,"#4FB477");P(gx-1+o,gy+1,2,3,"#4FB477");G.restore();P(gx,gy+6,1,3,"#8A6A40");P(gx-3,gy+9,7,1,"#8A6A40")}
    const fx=ZF.x+7,fy=ZF.y+Math.floor(ZF.h/2);P(fx-4,fy,9,1,c+"90");P(fx,fy-4,1,9,c+"90");P(fx,fy-4,1,2,"#FF6B6B");
    if(ZF.w>26){P(ZF.x+20,ZF.y+ZF.h-8,6,7,"#7A5230");P(ZF.x+21,ZF.y+ZF.h-9,4,1,"#5A3A20");P(ZF.x+21,ZF.y+ZF.h-5,4,1,"#5A3A20")}
  }
  if(k==="gym"){
    const mon=monday(today());
    if(ZR.w>=18){P(ZR.x,ZR.y,18,12,"#E8E6FF");P(ZR.x,ZR.y,18,2,"#FF5A6E");for(let i=0;i<7;i++){const s=addDays(mon,i);const sc=score(s);P(ZR.x+1+(i%4)*4,ZR.y+3+(i>3?4:0),3,3,s>today()?"#D0CCE8":sc.met?"#3FA66B":s===today()?"#FFD86B":"#B8B4D0")}}
    if(ZR.h>30){const ry=ZR.y+26;P(ZR.x,ry,20,2,"#5B4A7A");for(let i=0;i<2;i++){const bx=ZR.x+1+i*10;P(bx,ry-3,2,3,"#3A3550");P(bx+2,ry-2,4,1,"#AFAFC4");P(bx+6,ry-3,2,3,"#3A3550")}}
    if(ZF.w>22){P(ZF.x+2,ZF.y+ZF.h-6,20,4,"#2E7D4F");P(ZF.x+2,ZF.y+ZF.h-5,20,1,"#3FA66B")}
    P(ZF.x+ZF.w-4,ZF.y+ZF.h-8,3,6,"#5AD1E8");P(ZF.x+ZF.w-4,ZF.y+ZF.h-9,3,1,"#F4F1FF");
  }
  if(k==="ctrl"){
    const rh=Math.min(26,ZR.h);if(ZR.w>=14){P(ZR.x,ZR.y,14,rh,"#232038");for(let u=0;u*5+6<rh;u++){P(ZR.x+1,ZR.y+2+u*5,12,4,"#2F2A4A");const on=((t*3+u*1.7)|0)%3;P(ZR.x+2,ZR.y+3+u*5,1,1,on?"#7EE0A1":"#2F2A4A");P(ZR.x+4,ZR.y+3+u*5,1,1,on===2?"#FF9E6B":"#2F2A4A");P(ZR.x+8,ZR.y+4+u*5,4,1,"#1A1730")}}
    if(ZR.w>=22)gearIcon(ZR.x+19,ZR.y+5,reduced?0:t*(working?4:1),c);
    P(ZF.x+2,ZF.y+ZF.h-6,10,5,"#C0392B");P(ZF.x+5,ZF.y+ZF.h-8,4,2,"#7A2318");P(ZF.x+2,ZF.y+ZF.h-4,10,1,"#7A2318");
  }
  if(k==="bank"){
    const fc=finCalc(S.fin);const rw=isFinite(fc.runway)?fc.runway:24;
    if(ZR.w>=8){const vx=ZR.x+Math.floor(ZR.w/2),vy=ZR.y+7,rr=Math.min(6,Math.floor(ZR.w/2));G.fillStyle="#4A4560";G.beginPath();G.arc(vx+.5,vy+.5,rr,0,Math.PI*2);G.fill();G.strokeStyle="#9C97BC";G.lineWidth=1;G.beginPath();G.arc(vx+.5,vy+.5,rr,0,Math.PI*2);G.stroke();const an=reduced?0:t*(working?3:.6);for(let i=0;i<3;i++){const a2=an+i*2.094;P(vx+Math.round(Math.cos(a2)*(rr-2)),vy+Math.round(Math.sin(a2)*(rr-2)),1,1,"#FFD86B")}P(vx,vy,1,1,"#FFD86B")}
    const hmax=Math.max(3,ZF.h-1),base=ZF.y+ZF.h;[Math.min(hmax,2+Math.round(rw/2)),Math.min(hmax,Math.round(rw/3)+1),Math.min(hmax,Math.round(rw/4)+1)].forEach((hh,i)=>{for(let j=0;j<hh;j++)P(ZF.x+2+i*6,base-1-j,4,1,j%2?"#D9B13F":"#FFD86B")});
    if(ZR.h>20)plant(ZR.x+1,ZR.y+ZR.h,t,"#FFD86B");
  }
  if(k==="studio"){plant(ZF.x+2,ZF.y+ZF.h,t);if(ZR.w>12){P(ZR.x,ZR.y,Math.min(20,ZR.w),12,"#E8E6FF");P(ZR.x+2,ZR.y+3,8,1,c);P(ZR.x+2,ZR.y+6,12,1,"#B8B4D0")}}
}
function drawDesk(r,t,working){const dx=r.desk.x,dy=r.desk.y;
  P(dx-10,dy,20,5,"#5B4A7A");P(dx-10,dy,20,1,"#7A68A0");P(dx-9,dy+5,1,3,"#3E3260");P(dx+8,dy+5,1,3,"#3E3260");
  P(dx-5,dy-7,10,6,"#0E0B1C");P(dx-4,dy-6,8,4,working?r.carpet:"#241F40");
  if(working){for(let i=0;i<3;i++)P(dx-4,dy-6+i,(((t*9)+i*3)|0)%7+1,1,r.color)}else if((t*1.5|0)%2)P(dx-3,dy-4,1,1,r.color);
  P(dx,dy-1,1,1,"#3E3260");P(dx+6,dy-2,2,2,"#E8E6FF");P(dx+6,dy-3,2,1,"#B8B0E0");
}
function drawRoom(r,t){
  const {x,y,w,h,color}=r;const a=SC.agents[r.dept.id];const working=!!(a&&a.state==="working");
  P(x,y,w,h,"#1B1733");P(x,y,w,h,color+"10");
  for(let yy=y+10;yy<y+h-1;yy+=6)P(x+1,yy,w-2,1,"#ffffff05");
  P(x,y,w,7,"#2A2450");P(x,y+6,w,1,color+"70");
  for(let wx=x+6;wx<x+w-10;wx+=14)if(r.top||Math.abs(wx+3-r.cx)>9)P(wx,y+2,6,2,working?color+"66":"#3A3366");
  const ce=EDGES.filter(e=>e.type==="carpet"&&NODES[e.a].room===r.dept.id);
  ce.forEach(e=>strip(e,4,color+"55"));ce.forEach(e=>strip(e,3,r.carpet));
  G.strokeStyle=color+"B0";G.lineWidth=1;G.strokeRect(x+.5,y+.5,w-1,h-1);
  if(r.top){P(r.cx-4,y+h-1,8,1,r.carpet);P(r.cx-5,y+h-3,1,3,color);P(r.cx+4,y+h-3,1,3,color)}
  else{P(r.cx-4,y,8,7,r.carpet);P(r.cx-5,y,1,7,color);P(r.cx+4,y,1,7,color)}
  decor(r,t,working);drawDesk(r,t,working);
}
function drawNexo(t){
  const th=SC.think;const pa=(Math.sin(t*2)+1)/2;
  G.strokeStyle=GOLD+(th?"99":"33");G.lineWidth=1;G.setLineDash([2,3]);G.lineDashOffset=reduced?0:-(t*(th?24:6));
  [[160,60],[190,90],[160,120],[130,90]].forEach(([sx,sy])=>{G.beginPath();G.moveTo(160.5,88.5);G.lineTo(sx+.5,sy+.5);G.stroke()});G.setLineDash([]);
  const gl=G.createRadialGradient(160,76,1,160,76,18+(th?8:0)+pa*2);gl.addColorStop(0,GOLD+(th?"AA":"55"));gl.addColorStop(1,GOLD+"00");G.fillStyle=gl;G.fillRect(132,52,56,52);
  G.fillStyle="rgba(0,0,0,.35)";G.beginPath();G.ellipse(160,89,7,2,0,0,Math.PI*2);G.fill();
  const bob=reduced?0:Math.round(Math.sin(t*(th?6:2))*1.5);const top=68+bob;
  const rows=[1,3,5,7,9,7,5,3,1];const hi=reduced?-1:(t*(th?14:5)|0)%rows.length;
  rows.forEach((wd,i)=>{P(160-(wd>>1),top+i*2,wd,2,i===hi?"#FFF3D6":i<3?"#FFE2A8":i<5?GOLD:"#C7802A")});P(159,top+2,1,4,"#FFF6E0");
  if(th&&!reduced)for(let i=0;i<3;i++){const an=t*3+i*2.09;P(160+Math.round(Math.cos(an)*13),top+8+Math.round(Math.sin(an)*5),2,2,"#FFE2A8")}
}
const ICONS={"!":["..#..","..#..","..#..",".....","..#.."],"?":[".###.","...#.","..##.",".....","..#.."],"z":["####.","..#..",".#...","####.","....."],"$":[".###.","#.#..",".###.","..#.#",".###."],"♪":["..###","..#.#","..#..","###..","##..."],"♥":[".#.#.","#####","#####",".###.","..#.."]};
const ICOL={"!":"#E5484D","?":"#3A8FD9","z":"#8A6FE0","$":"#2E9E5B","♪":"#C2410C","♥":"#E5487D"};
function drawEmote(a,x,y,t){
  let k=null;if(a.state==="working")k="…";else if(a.emote&&performance.now()<a.emote.until)k=a.emote.k;if(!k)return;
  const top=y-31;P(x-4,top,9,7,"#F7F3FF");P(x-3,top-1,7,1,"#F7F3FF");P(x-3,top+7,7,1,"#F7F3FF");P(x-1,top+8,2,1,"#F7F3FF");
  if(k==="…"){const n=reduced?3:(t*3|0)%4;for(let i=0;i<3;i++)P(x-3+i*3,top+3,1,1,i<n?"#16122B":"#C9C4E6");return}
  const bm=ICONS[k];if(!bm)return;bm.forEach((row,ry)=>{for(let rx=0;rx<5;rx++)if(row[rx]==="#")P(x-2+rx,top+1+ry,1,1,ICOL[k])});
}
function drawAgent(a,t,opt){
  opt=opt||{};const L=a.look||LOOK.studio;const x=Math.round(a.x);const walking=!opt.still&&a.path&&a.path.length>0;
  let hop=0;if(!opt.still&&!walking&&!reduced&&a.kind==="gym"&&a.state==="idle"){const k=(t+a.seed)%6;if(k<0.9)hop=-Math.round(Math.abs(Math.sin(k*Math.PI*3.3))*2)}
  const y=Math.round(a.y)+hop;const step=walking?((a.ph|0)%2):0;const dir=a.dir||1;
  if(!opt.still)P(x-3,Math.round(a.y),7,1,"rgba(0,0,0,.45)");
  if(a.isCmd){P(x-4,y-11,9,9,"#7A1E3A");P(x-4,y-3,9,1,"#5A1430")}
  P(x-2,y-3,2,3-step,"#2A2540");P(x+1,y-3,2,walking?2+step:3,"#2A2540");
  P(x-3,y-10,7,7,a.color);P(x-3,y-4,7,1,"rgba(0,0,0,.28)");P(x-3,y-10,7,1,"rgba(255,255,255,.18)");
  const sw=walking?(step?1:-1):0;const typing=a.state==="working"&&!walking&&!reduced?((t*10|0)%2):0;
  P(x-4,y-9+sw,1,4,a.color);P(x+4,y-9-sw,1,4,a.color);P(x-4,y-5+sw-typing,1,1,L.skin);P(x+4,y-5-sw,1,1,L.skin);
  P(x-3,y-16,7,6,L.skin);P(x-3,y-17,7,2,L.hair);P(x-3,y-15,1,2,L.hair);P(x+3,y-15,1,2,L.hair);
  if(a.kind==="lib")P(x+2,y-19,3,2,L.hair);
  const ex=dir>0?0:-1;
  if(L.acc==="glasses")P(x-3,y-13,7,1,"#CFC9F2");
  if(!(a.blinkT>0)){P(x-1+ex,y-13,1,1,"#16122B");P(x+2+ex,y-13,1,1,"#16122B")}
  const talking=!opt.still&&performance.now()<(a.talkUntil||0);const happy=a.emote&&a.emote.k==="♥"&&performance.now()<a.emote.until;
  if(talking&&((t*8|0)%2))P(x+ex,y-11,2,1,"#7A3B3B");else if(happy||opt.still)P(x-1+ex,y-11,3,1,"#9A4B4B");
  if(L.acc==="hat"){P(x-5,y-17,11,1,"#6E4A2A");P(x-3,y-20,7,3,"#9A6A3C");P(x-3,y-18,7,1,"#3A2416")}
  if(L.acc==="band"){P(x-3,y-15,7,1,"#FF5A6E");P(x+4,y-15,1,2,"#FF5A6E")}
  if(L.acc==="hardhat"){P(x-4,y-17,9,1,"#E8B92E");P(x-3,y-19,7,2,"#FFD24A");P(x,y-20,1,1,"#FFD24A")}
  if(L.acc==="tophat"){P(x-4,y-17,9,1,"#141018");P(x-3,y-22,7,5,"#1C1724");P(x-3,y-18,7,1,GOLD);P(x-1,y-10,3,1,"#C0392B")}
  if(L.acc==="antenna"){P(x,y-20,1,3,a.color);P(x,y-21,1,1,"#FFFFFF")}
  if(a.isCmd){P(x-3,y-19,7,2,GOLD);P(x-3,y-20,1,1,GOLD);P(x,y-21,1,2,GOLD);P(x+3,y-20,1,1,GOLD);P(x,y-19,1,1,"#FF5A6E")}
  if(!opt.still&&!walking&&a.state==="idle"&&!a.isCmd&&!reduced){
    const tt=t+a.seed;
    if(a.kind==="lib"){P(x-2,y-8,5,3,"#F4F1FF");P(x,y-8,1,3,"#B8B0E0");if((tt*0.7|0)%4===0)P(x+1,y-9,2,1,"#F4F1FF")}
    if(a.kind==="map"){P(x+5,y-9,1,5,"#E9D9A6");P(x+5,y-9,1,1,"#C9B57A");if((tt*0.5|0)%3===0)a.dir=-1;else if((tt*0.5|0)%3===1)a.dir=1}
    if(a.kind==="ctrl"){const f=(tt*2|0)%2;P(x+5,y-9,1,4,"#AFAFC4");P(x+5-f,y-10,2,1,"#AFAFC4")}
    if(a.kind==="bank"){const ph=tt%2.4;const up=ph<1?Math.round(Math.sin(ph*Math.PI)*6):0;P(x+5,y-7-up,2,2,"#FFD86B");if(up>2)P(x+5,y-7-up,1,2,"#D9B13F")}
  }
  if(!opt.still)drawEmote(a,x,y,t);
}
function blinkStep(a,dt){if(a.blinkT>0)a.blinkT-=dt;else{a.blink-=dt;if(a.blink<=0){a.blinkT=0.13;a.blink=2.5+Math.random()*4}}}
function trailMark(a,b,c){if(!a||!b||a===b)return;const k=a<b?a+"|"+b:b+"|"+a;SC.trail[k]={c,t:SC.t}}
function drawTrails(){for(const k in SC.trail){const tr=SC.trail[k];const age=SC.t-tr.t;if(age>1.6){delete SC.trail[k];continue}const [a,b]=k.split("|");if(!NODES[a]||!NODES[b])continue;const carpet=NODES[a].type==="carpet"||NODES[b].type==="carpet";G.globalAlpha=(1-age/1.6)*0.35;strip({a,b},carpet?3:5,tr.c);G.globalAlpha=1}}
function stepAgent(a,dt){
  blinkStep(a,dt);
  if(!a.path.length){a.ph+=dt*2;return}
  const n=NODES[a.path[0]];if(!n){a.path=[];return}
  const dx=n.x-a.x,dy=n.y-a.y,dd=Math.hypot(dx,dy),sp=a.speed*dt;
  if(Math.abs(dx)>.3)a.dir=dx>0?1:-1;
  trailMark(a.node,a.path[0],a.color);
  if(dd<=sp){a.x=n.x;a.y=n.y;a.node=a.path.shift();if(!a.path.length){const w=a.waiters;a.waiters=[];w.forEach(f=>f(true))}}
  else{a.x+=dx/dd*sp;a.y+=dy/dd*sp}
  a.ph+=dt*9;
}
function go(a,target,speed){
  if(!a||!NODES[target])return Promise.resolve(false);
  const old=a.waiters;a.waiters=[];old.forEach(f=>f(false));
  const startN=a.path.length?a.path[0]:a.node;const rest=route(startN,target);
  a.path=a.path.length?[a.path[0]].concat(rest):rest;a.speed=speed||46;
  if(!a.path.length)return Promise.resolve(true);
  return new Promise(res=>a.waiters.push(res));
}
function atHome(a){return a.node===a.home&&!a.path.length}
function recallAll(fast){return Promise.all(Object.values(SC.agents).map(a=>atHome(a)?true:go(a,a.home,fast?84:46)))}
function pulse(a,color){return new Promise(res=>{const r=a.room;const ids=[r.entry].concat(route(r.entry,a.home));const pts=[{x:160,y:84}].concat(ids.map(id=>NODES[id]));let len=0;for(let i=1;i<pts.length;i++)len+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);SC.pulses.push({pts,ids,color,d:0,len,speed:reduced?4000:150,res})})}
function posAt(p,d){let acc=0;for(let i=1;i<p.pts.length;i++){const a=p.pts[i-1],b=p.pts[i];const s=Math.hypot(b.x-a.x,b.y-a.y);if(acc+s>=d){const k=s?(d-acc)/s:0;return{x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k,i}}acc+=s}const L=p.pts[p.pts.length-1];return{x:L.x,y:L.y,i:p.pts.length-1}}
function stepPulses(dt){SC.pulses=SC.pulses.filter(p=>{p.d+=p.speed*dt;const q=posAt(p,Math.min(p.d,p.len));if(q.i>=2)trailMark(p.ids[q.i-2],p.ids[q.i-1],p.color);if(p.d>=p.len){p.res();return false}return true})}
function drawPulses(){SC.pulses.forEach(p=>{for(let k=3;k>=1;k--){const q=posAt(p,Math.max(0,Math.min(p.d,p.len)-k*4));G.globalAlpha=0.22*(4-k);P(q.x-1,q.y-1,2,2,p.color)}G.globalAlpha=1;const q=posAt(p,Math.min(p.d,p.len));P(q.x-2,q.y-2,4,4,p.color);P(q.x-1,q.y-1,2,2,"#FFFFFF")})}
function bubble(target,text,ms,color){
  const el=document.createElement("div");el.className="bubble";el.style.color=color||(target&&target.color)||GOLD;
  const sp=document.createElement("span");sp.textContent=text;el.appendChild(sp);$("overlay").appendChild(el);
  SC.bubbles=SC.bubbles.filter(b=>{if(b.target===target){b.el.remove();return false}return true});
  const b={el,target,until:performance.now()+ms};SC.bubbles.push(b);placeBubble(b);target.talkUntil=performance.now()+Math.min(ms,2600);
}
function placeBubble(b){const t=b.target;const y=t.y-(t.isNexo?20:32);b.el.style.left=Math.min(90,Math.max(10,t.x/W*100))+"%";b.el.style.top=Math.max(14,y/H*100)+"%"}
function linesFor(id){
  const s=score(today());const due=dueCards().length;const fc=finCalc(S.fin);const st=streak();
  const L={
    aprendizaje:[due?"Tienes "+due+" tarjeta"+(due>1?"s":"")+" por repasar hoy.":"Repaso al día. Así se hace.","Lo que no se repasa, se olvida.","¿Qué construiste hoy? Anótalo en la bitácora.","Si lo puedes explicar simple, lo dominas."],
    carrera:["Evidencia, no fantasía.","Lo que no has probado es hipótesis.","¿Qué disfrutaste construir esta semana?","Un proyecto terminado vale más que diez ideas."],
    habitos:["Hoy llevas "+s.pts+" de "+s.min+" puntos.","¿Ya te moviste hoy?",st?"Racha de "+st+" días. Sigue.":"Hoy puede empezar la racha.","El mínimo también cuenta."],
    sistema:["Si algo estorba, dímelo en el engranaje.","Base en orden. Sin fallas.","Cada domingo reviso que el sistema te sirva."],
    finanzas:[S.fin&&isFinite(fc.runway)?"Colchón: "+fc.runway.toFixed(1)+" meses.":"Primero proteger el colchón.","¿Ese gasto suma o resta?","El dinero quieto también pierde.","Primero no perder; después multiplicar."]};
  return L[id]||[short((depts().find(d=>d.id===id)||{}).mission||"A tus órdenes.",70)];
}
const pickOne=a=>a[Math.random()*a.length|0];
function isNight(){const h=new Date().getHours();return h>=23||h<6}
let idleNext=performance.now()+4000;
async function idleTick(now){
  if(running||document.hidden||now<idleNext)return;
  idleNext=now+6500+Math.random()*8000;
  const home=Object.values(SC.agents).filter(a=>atHome(a)&&!a.busy);if(!home.length)return;
  const a=pickOne(home);
  if(isNight()){a.emote={k:"z",until:now+6000};return}
  const r=Math.random();const tok=SC.token;
  if(reduced||r<0.45){bubble(a,mm(pickOne(linesFor(a.id))),4200);a.emote={k:a.kind==="bank"?"$":"♪",until:now+2500};return}
  if(r<0.72){a.busy=1;try{const spot=pickOne(MEET);if(await go(a,spot,34)&&tok===SC.token){a.emote={k:Math.random()<.5?"?":"♪",until:performance.now()+2200};await sleep(2400);if(tok===SC.token)await go(a,a.home,34)}}finally{a.busy=0}return}
  const others=home.filter(b=>b!==a);if(!others.length)return;const b=pickOne(others);
  a.busy=1;b.busy=1;
  try{
    if(!(await go(a,"G:"+b.id,40))||tok!==SC.token)return;
    a.dir=-1;b.dir=1;bubble(a,pickOne(["¿Cómo vamos, "+b.name+"?","Oye "+b.name+", ¿qué hay de nuevo?","Vengo por noticias, "+b.name+"."]),2600);await sleep(2800);if(tok!==SC.token)return;
    bubble(b,mm(pickOne(linesFor(b.id))),3000);await sleep(3200);if(tok!==SC.token)return;
    a.emote={k:"♥",until:performance.now()+1500};await go(a,a.home,40);
  }finally{a.busy=0;b.busy=0}
}
const PORT={};
function portrait(id){
  let key=id,a=null;
  if(id==="cmd")a=SC.cmd;else if(id!=="nexo"){a=SC.agents[id];if(!a)return"";key=id+a.kind+a.color}
  if(PORT[key])return PORT[key];
  const c=document.createElement("canvas");c.width=16;c.height=16;const g=c.getContext("2d");g.imageSmoothingEnabled=false;const prev=G;G=g;
  try{P(0,0,16,16,"#221E3E");
    if(id==="nexo"){[1,3,5,7,9,7,5,3,1].forEach((wd,i)=>P(8-(wd>>1),3+i*1.2,wd,2,i<3?"#FFE2A8":i<5?GOLD:"#C7802A"))}
    else drawAgent(Object.assign({},a,{x:8,y:25,dir:1,blinkT:0,state:"idle",path:[],talkUntil:0,emote:null}),0,{still:true});
  }finally{G=prev}
  return PORT[key]=c.toDataURL();
}
let last=performance.now();
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;SC.t+=dt;const t=SC.t;
  Object.values(SC.agents).forEach(a=>stepAgent(a,dt));blinkStep(SC.cmd,dt);stepPulses(dt);
  G=mainG;if(BG)G.drawImage(BG,0,0);else P(0,0,W,H,"#0E0C1D");
  Object.values(SC.rooms).forEach(r=>drawRoom(r,t));
  drawTrails();drawNexo(t);
  const cm=SC.cmd;P(cm.x+7,cm.y-9,9,6,"#3A2E55");P(cm.x+8,cm.y-8,7,4,running?GOLD:"#5B4A7A");P(cm.x+11,cm.y-3,1,3,"#3A2E55");
  Object.values(SC.agents).concat([cm]).sort((p,q)=>p.y-q.y).forEach(a=>drawAgent(a,t));
  drawPulses();
  SC.bubbles=SC.bubbles.filter(b=>{if(now>b.until){b.el.remove();return false}placeBubble(b);return true});
  idleTick(now);
  requestAnimationFrame(frame);
}
cv.addEventListener("click",e=>{const rc=cv.getBoundingClientRect();const x=(e.clientX-rc.left)/rc.width*W,y=(e.clientY-rc.top)/rc.height*H;
  let hit=null;Object.values(SC.agents).forEach(a=>{if(Math.abs(a.x-x)<6&&y>a.y-22&&y<a.y+2)hit=a.id});
  if(!hit)Object.values(SC.rooms).forEach(rm=>{if(x>=rm.x&&x<=rm.x+rm.w&&y>=rm.y&&y<=rm.y+rm.h)hit=rm.dept.id});
  if(hit)selectAgent(hit);
  else if(Math.abs(SC.cmd.x-x)<6&&y>SC.cmd.y-22&&y<SC.cmd.y+2){if(!running)bubble(SC.cmd,pickOne(["A tus órdenes.","¿Qué sigue, equipo?","Hoy se construye."]),2200,GOLD)}
  else if(Math.hypot(x-160,y-80)<22)selectAgent("")});
function selectAgent(id){$("c-target").value=id;$("c-text").focus();const a=SC.agents[id];
  if(a&&!running){bubble(a,mm(pickOne(linesFor(id)))+" ¿Qué necesitas?",3200);a.emote={k:"!",until:performance.now()+1200}}
  if(!id&&!running)bubble(NEXO_T,"Nexo a la escucha.",1800)}

/* =================== ORQUESTACIÓN =================== */
let running=false,ctl=null,stopFlag=false,PHASE="";
function skillsLine(lv){return S.skills.filter(s=>(s.level||"sinprobar")===lv).map(s=>s.name+(s.evidence?" ("+short(s.evidence,90)+")":"")).join("; ")}
function buildContext(){
  const c=cfg();const t=today();const lines=[];
  lines.push("Hoy: "+t+" ("+pretty(t)+"). Semana "+(weekIndex(t)+1)+" del sistema. Mínimo diario: "+minFor(t)+" puntos. Meta de estudio: "+studyTarget(t)+" min/día. Racha: "+streak()+" días.");
  lines.push("Hábitos: "+c.habits.map(h=>h.name+(h.priority?" (prioridad)":"")).join(", ")+". Bonus: "+c.bonus.map(h=>h.name).join(", ")+".");
  lines.push("Habilidades PROBADAS (con evidencia): "+(skillsLine("probada")||"ninguna registrada")+".");
  lines.push("Habilidades EN PRÁCTICA: "+(skillsLine("practica")||"ninguna registrada")+".");
  lines.push("SIN PROBAR (hipótesis, no son habilidades): "+(skillsLine("sinprobar")||"ninguna")+".");
  lines.push("Últimos 14 días:");
  for(let i=13;i>=0;i--){const s=addDays(t,-i);const d=S.days[s];if(!d)continue;const sc=score(s);
    const hb=c.habits.filter(h=>d.habits&&d.habits[h.id]).map(h=>h.name).join("/");
    lines.push("- "+s+": "+sc.pts+"/"+sc.min+" pts"+(sc.met?" cumplido":"")+", estudio "+(d.studyMin||0)+" min, energía "+(d.energy||"-")+(hb?", hizo: "+hb:"")+(d.learned?" | hizo o aprendió: "+short(d.learned,220):"")+(d.blocked?" | trabado: "+short(d.blocked,180):"")+(d.win?" | victoria: "+short(d.win,120):"")+(d.notes?" | notas: "+short(d.notes,120):""))}
  lines.push("Proyectos: "+(S.projects.length?S.projects.map(p=>p.title+" ["+areaOf(p)+", "+(COLN[p.status]||"Ideas")+(p.stack?", "+short(p.stack,50):"")+(p.next?", siguiente: "+short(p.next,60):"")+"]").join("; "):"ninguno aún")+".");
  const due=S.cards.filter(x=>(x.due||t)<=t).length;
  lines.push("Repaso: "+S.cards.length+" tarjetas, "+due+" pendientes hoy. Preguntas existentes: "+S.cards.slice(0,25).map(x=>short(x.front,60)).join(" | "));
  const fs=finSummary();if(fs)lines.push(fs);
  const dcs=S.decisions.filter(d=>d.verdict).slice(0,4);if(dcs.length)lines.push("Decisiones recientes: "+dcs.map(d=>short(d.text,80)+" → "+d.verdict).join(" | "));
  const rq=S.requests.filter(r=>r.status!=="atendido");if(rq.length)lines.push("Solicitudes abiertas al sistema: "+rq.map(r=>short(r.text,120)).join(" | "));
  if(S.reviews[0])lines.push("Última revisión semanal: "+short(S.reviews[0].summary,500));
  const q=S.quests[t];if(q)lines.push("Misión del día actual: "+q.text+(q.done?" (completada)":""));
  return lines.join("\n");
}
const BASE_=()=>{const c=cfg();return "Trabajas para "+(c.owner||"el comandante, la persona que usa este sistema")+". Su meta: "+(c.goal||"todavía no la define; ayúdale a aclararla")+"."+(c.context?" Contexto que él mismo escribió: "+c.context:"")+" No lo encasilles en ningún rol: su camino profesional se descubre con evidencia. Cuenta como habilidad solo lo PROBADO o EN PRÁCTICA según su inventario; lo SIN PROBAR es hipótesis y nunca lo presentes como habilidad ni como el camino obvio. Escribe en español, directo, concreto y amable; nunca culpabilizante. No inventes datos que no estén en el contexto."};
const WHO=()=>cfg().owner||"el comandante";
function plannerPrompt(text,ctx,dl,all,opts){
  return BASE_()+"\n\nEres NEXO, el orquestador del centro de mando. Departamentos disponibles:\n"+dl.map(d=>"- "+d.id+": "+d.name+". "+d.mission).join("\n")+
  "\n\nOrden de "+WHO()+": \""+text+"\"\n\nCONTEXTO\n"+ctx+
  (dl.some(d=>d.id==="finanzas")?"\n\nRegla: si la orden implica dinero, compras, ingresos, tiempo de trabajo o una decisión personal, incluye al departamento finanzas.":"")+(opts&&opts.lead?"\nEsta orden es una DECISIÓN que "+WHO()+" quiere tomar. El primer departamento debe ser "+opts.lead+"; agrega 1 o 2 más solo si aportan otra perspectiva.":"")+
  "\n\nDecide qué departamentos intervienen"+(all?" (en esta orden participan TODOS)":" (1 a 3, solo los necesarios)")+" y en qué orden, para que cada uno use lo que reportó el anterior. Responde solo con JSON: {\"title\":\"título de la misión, máx 6 palabras\",\"why\":\"una frase sobre el plan\",\"plan\":[{\"dept\":\"id\",\"task\":\"instrucción concreta, máx 25 palabras\"}]}";
}
function agentPrompt(d,task,text,outs,ctx,proposed){
  return BASE_()+"\nRol de Claude en sus proyectos de código: "+(cfg().aiRole||"copiloto con explicación")+
  "\n\nEres el agente del departamento "+d.name+". Tu misión permanente: "+d.mission+(TRAITS[d.id]?"\nTu carácter: "+TRAITS[d.id]+" Que se note un poco en el tono, sin perder claridad.":"")+
  "\nOrden original de "+WHO()+": \""+text+"\"\nTu tarea asignada por NEXO: "+task+
  (outs.length?"\n\nLo que reportaron tus compañeros antes que tú (úsalo y complementa, no repitas):\n"+outs.map(o=>"- "+o.dept+": "+o.report+(o.handoff?" | Nota para ti: "+o.handoff:"")+"\n  "+short(o.detail,600)).join("\n"):"")+
  (proposed&&proposed.length?"\n\nYa se propuso en esta misión (NO repitas ni reformules estas propuestas; si no tienes algo distinto, deja proposals vacío):\n"+proposed.map(s=>"- "+s).join("\n"):"")+
  "\n\nCONTEXTO\n"+ctx+
  "\n\nResponde solo con JSON: {\"report\":\"resumen para "+WHO()+", máx 200 caracteres\",\"detail\":\"desarrollo útil y accionable, máx 900 caracteres, viñetas con '- '\",\"handoff\":\"nota corta para el siguiente agente (máx 110 caracteres) o cadena vacía\",\"proposals\":[...]}. Propuestas opcionales (máx 4, solo si aportan), cada una de un tipo: {\"type\":\"card\",\"front\":\"pregunta\",\"back\":\"respuesta\",\"topic\":\"tema\"} | {\"type\":\"project\",\"title\":\"...\",\"area\":\"Portafolio|Negocio|Aprendizaje|Creativo\",\"stack\":\"herramientas que de verdad usa o practica\",\"goal\":\"qué demuestra o para qué sirve\"} | {\"type\":\"quest\",\"text\":\"misión del día concreta y medible, máx 90 caracteres\"} | {\"type\":\"skill\",\"name\":\"habilidad\",\"level\":\"probada|practica|sinprobar\",\"evidence\":\"evidencia concreta tomada del contexto\"} (skill solo si el contexto muestra evidencia nueva). No dupliques tarjetas, proyectos ni habilidades existentes.";
}
function synthPrompt(text,outs,opts){
  return BASE_()+"\n\nEres NEXO. Integra los reportes de tu escuadrón para la orden de "+WHO()+": \""+text+"\"\n\n"+outs.map(o=>"- "+o.dept+": "+o.report+"\n  "+short(o.detail,500)).join("\n")+
  (opts&&opts.decision?"\n\nEs una DECISIÓN. Da un veredicto explícito con base en los números. Responde solo con JSON: {\"verdict\":\"Sí\"|\"No\"|\"Depende\"|\"Esperar\",\"summary\":\"por qué, con números, máx 380 caracteres\",\"next\":\"qué hacer ahora, máx 100 caracteres\",\"condition\":\"si es Depende o Esperar: la condición concreta; si no, cadena vacía\"}":"\n\nResponde solo con JSON: {\"summary\":\"síntesis para "+WHO()+", máx 380 caracteres\",\"next\":\"la siguiente acción concreta que debe hacer, máx 100 caracteres\"}");
}
function errCopy(e){const c=e&&e.code;return {cancelled:"Misión detenida por el comandante.",not_granted:"El tablero no tiene permiso para usar Claude. Recarga la página y acepta el permiso para desplegar misiones.",sampling_disabled:"Claude no está disponible para esta cuenta desde el tablero.",rate_limited:"Llegaste al límite de uso por ahora. Intenta de nuevo más tarde.",invalid_json:"Un agente respondió en un formato que no pude leer. Despliega la misión otra vez.",session_expired:"Tu sesión expiró. Vuelve a iniciar sesión.",refused:"Claude no aceptó esta orden. Reformúlala.",prompt_too_large:"Hay demasiados datos para enviar. Intenta una orden más específica.",no_key:"Agrega tu API key de Anthropic en el engranaje → Ajustes para activar a los agentes.",bad_key:"Tu API key de Anthropic no es válida. Revísala en el engranaje → Ajustes.",billing:"Tu cuenta de la API de Anthropic no tiene saldo. Recarga créditos en console.anthropic.com.",bad_model:"El modelo configurado no existe o no está disponible para tu cuenta. Cámbialo en el engranaje → Ajustes.",overloaded:"Los servidores de Claude están saturados. Intenta de nuevo en un momento.",network:"No hubo conexión con la API de Anthropic. Revisa tu internet.",invalid_request:"La API rechazó la petición. Revisa los modelos en el engranaje → Ajustes."}[c]||"Se perdió la conexión con Claude. Despliega la misión otra vez."}
async function callJson(p,tier){ctl=new AbortController();return sample.json(p,{modelTier:tier,signal:ctl.signal,cache:false})}
const LVKEYS=["probada","practica","sinprobar"];
const LVNAME={probada:"Probada",practica:"En práctica",sinprobar:"Sin probar"};
function normProp(pr,d){if(!pr||typeof pr!=="object")return null;const id="x"+Math.random().toString(36).slice(2,9);const base={id,dept:d.id,state:"pending"};
  if(pr.type==="card"&&pr.front&&pr.back)return Object.assign(base,{type:"card",front:short(pr.front,240),back:String(pr.back).slice(0,600),topic:short(pr.topic||"",40)});
  if(pr.type==="project"&&pr.title)return Object.assign(base,{type:"project",title:short(pr.title,90),area:AREAS.includes(pr.area)?pr.area:"Portafolio",stack:short(pr.stack||pr.skill||"",80),goal:short(pr.goal||"",160)});
  if(pr.type==="quest"&&pr.text)return Object.assign(base,{type:"quest",text:short(pr.text,110)});
  if(pr.type==="skill"&&pr.name&&LVKEYS.includes(pr.level))return Object.assign(base,{type:"skill",name:short(pr.name,60),level:pr.level,evidence:short(pr.evidence||"",200)});
  return null}
const normT=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(w=>w.length>3);
function overlap(a,b){const A=new Set(normT(a)),B=normT(b);if(!A.size||!B.length)return 0;const hit=B.filter(w=>A.has(w)).length;return hit/Math.min(A.size,new Set(B).size)}
function isDup(n,list){
  if(n.type==="quest")return list.some(x=>x.type==="quest");
  if(n.type==="skill")return S.skills.some(s=>overlap(s.name,n.name)>=.6&&s.level===n.level)||list.some(x=>x.type==="skill"&&overlap(x.name,n.name)>=.6);
  const key=n.type==="card"?n.front:n.title;
  if(n.type==="card"&&S.cards.some(c=>overlap(c.front,key)>=.6))return true;
  if(n.type==="project"&&S.projects.some(p=>overlap(p.title,key)>=.6))return true;
  return list.some(x=>x.type===n.type&&overlap(x.type==="card"?x.front:x.title,key)>=.6)}
function setBusy(on,label){running=on;$("c-run").disabled=on||sampleOff;$("c-stop").hidden=!on;document.querySelectorAll("#quick button").forEach(b=>b.disabled=on||sampleOff);
  const st=$("c-state");st.className="chip "+(on?"ok":"");st.textContent=on?(label||"En misión"):"En espera";PHASE=on?(label||""):"";
  $("c-msg").innerHTML=on?`<div class="thinking"><i></i><i></i><i></i><span>${esc(label||"Trabajando")}</span></div>`:$("c-msg").innerHTML;renderRoster()}
function setPhase(t){if(!running)return;PHASE=t;$("c-state").textContent=t;$("c-msg").innerHTML=`<div class="thinking"><i></i><i></i><i></i><span>${esc(t)}</span></div>`;renderSummary()}

async function runMission(text,target,all,opts){
  opts=opts||{};
  if(running)return;
  if(!sample||sampleOff){toast(errCopy({code:"no_key"}));show("ajustes");return}
  const dl=depts();if(!dl.length){toast("Aún no cargan los departamentos.");return}
  stopFlag=false;SC.token++;setBusy(true,"Nexo analizando la orden");
  const recall=recallAll(true);
  const mid="m"+Date.now().toString(36);
  const M={title:short(text,60),text,status:"running",origin:"nexo",steps:[],proposals:[],created:nowISO()};
  const push=(who,kind,msg,extra)=>{M.steps.push(Object.assign({who,kind,text:msg,at:nowISO()},extra||{}));S.live=Object.assign({id:mid},M);selMission=mid;renderComms();renderRoster()};
  const persist=()=>save("missions/"+mid,JSON.parse(JSON.stringify(M)));
  const ctx=buildContext();
  try{
    push("cmd","order",text);bubble(SC.cmd,mm(short(text,80)),2600,GOLD);persist();
    let plan;
    if(target){const d=dl.find(x=>x.id===target);plan=[{dept:d.id,task:text}];push("nexo","plan","Orden directa a "+d.name+".",{plan})}
    else{SC.think=1;bubble(NEXO_T,"Analizando la orden…",4000);setPhase("Nexo planeando la misión");
      const r=await callJson(plannerPrompt(text,ctx,dl,all,opts),"quick");
      plan=(Array.isArray(r.plan)?r.plan:[]).filter(p=>p&&dl.some(d=>d.id===p.dept)).slice(0,all?6:3);
      if(!plan.length)plan=[{dept:dl[0].id,task:text}];
      if(opts.lead&&dl.some(d=>d.id===opts.lead)){plan=plan.filter(p=>p.dept!==opts.lead);plan.unshift({dept:opts.lead,task:"Evalúa esta decisión con números: costo, efecto en el colchón y en la meta, y alternativas."});plan=plan.slice(0,3)}
      if(r.title)M.title=short(r.title,60);push("nexo","plan",short(r.why||"Plan listo.",220),{plan});SC.think=0}
    persist();
    await recall;
    const outs=[];
    for(let i=0;i<plan.length;i++){
      if(stopFlag)throw{code:"cancelled"};
      const p=plan[i];const d=dl.find(x=>x.id===p.dept);const a=SC.agents[d.id];
      setPhase(d.name+" recibe la orden");
      if(a){if(!atHome(a))await go(a,a.home,84);await pulse(a,d.color);a.emote={k:"!",until:performance.now()+1300};bubble(a,"Recibido: "+mm(short(p.task,70)),2600);a.state="working";a.dir=-1;renderRoster()}
      setPhase(d.name+" trabajando");
      const proposed=M.proposals.map(x=>x.type==="card"?"Tarjeta: "+x.front:x.type==="project"?"Proyecto: "+x.title:x.type==="skill"?"Habilidad: "+x.name:"Misión del día: "+x.text);
      let r;try{r=await callJson(agentPrompt(d,p.task,text,outs,ctx,proposed),"default")}finally{if(a){a.state="idle";a.dir=1}}
      const report=short(r.report||"Sin reporte.",240);const detail=String(r.detail||"").slice(0,1200);const handoff=short(r.handoff||"",140);
      outs.push({dept:d.name,report,detail,handoff});
      (Array.isArray(r.proposals)?r.proposals:[]).slice(0,4).forEach(pr=>{const n=normProp(pr,d);if(n&&!isDup(n,M.proposals))M.proposals.push(n)});
      push(d.id,"report",report,{detail,task:p.task});persist();
      if(a){bubble(a,mm(short(report,110)),5200);a.emote={k:"♪",until:performance.now()+1800}}
      const nx=plan[i+1];
      if(nx&&handoff&&a&&SC.agents[nx.dept]&&nx.dept!==d.id){const b=SC.agents[nx.dept];await sleep(1100);setPhase(d.name+" lleva información a "+b.name);
        await go(a,"G:"+b.id,62);a.dir=-1;b.dir=1;bubble(a,mm(short(handoff,90)),3200);b.emote={k:"!",until:performance.now()+1500};push(d.id,"handoff",handoff,{to:nx.dept});await sleep(1500);go(a,a.home,62)}
    }
    if(stopFlag)throw{code:"cancelled"};
    setPhase("Reunión en el Nexo");
    const inv=[...new Set(plan.map(p=>p.dept))].map(id=>SC.agents[id]).filter(Boolean);
    await Promise.all(inv.map((a,i)=>go(a,MEET[i%MEET.length],62)));
    inv.forEach(a=>a.dir=a.x<160?1:-1);
    SC.think=1;bubble(NEXO_T,"Integrando reportes…",5000);setPhase("Nexo integra los reportes");
    const syn=await callJson(synthPrompt(text,outs,opts),"quick");SC.think=0;
    M.summary=short(syn.summary,500);M.next=short(syn.next,140);
    if(opts.decision){const vv=["Sí","No","Depende","Esperar"].includes(syn.verdict)?syn.verdict:"Depende";M.verdict=vv;M.condition=short(syn.condition||"",200);
      save("decisions/"+opts.decision.id,Object.assign({},opts.decision,{verdict:vv,summary:M.summary,next:M.next,condition:M.condition,missionId:mid,status:"evaluada",evaluated:nowISO()}))}
    M.status="done";push("nexo","summary",M.summary,{next:M.next});persist();
    if(opts.review){const wk=isoWeek(today());save("reviews/"+wk+"-"+Date.now().toString(36),{week:wk+" · "+today(),created:nowISO(),summary:M.summary,departments:outs.map(o=>({name:o.dept,findings:String(o.detail||o.report).split(/\n/).map(x=>x.replace(/^[-•*]\s*/,"").trim()).filter(Boolean).slice(0,6)})),actions:M.next?[{text:M.next}]:[],systemChanges:[]})}
    bubble(NEXO_T,mm((M.verdict?M.verdict+". ":"")+short(M.summary,110)),6500);
    inv.forEach(a=>a.emote={k:"♥",until:performance.now()+2600});
    toast(M.proposals.length?"Misión cumplida: "+M.proposals.length+" propuestas esperan tu decisión":"Misión cumplida");
    setTimeout(()=>inv.forEach(a=>{if(!running)go(a,a.home)}),2800);
  }catch(e){SC.think=0;SC.token++;
    if(e&&["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(e.code))sampleOff=true;
    M.status=e&&e.code==="cancelled"?"stopped":"error";push("nexo","error",errCopy(e));persist();
    if(opts.decision)save("decisions/"+opts.decision.id,Object.assign({},opts.decision,{status:"sin evaluar",missionId:mid}));
    Object.values(SC.agents).forEach(a=>{a.state="idle";go(a,a.home)})}
  finally{setBusy(false);$("c-msg").textContent=sampleOff?errCopy({code:"not_granted"}):"";renderAll()}
}
$("cf").addEventListener("submit",e=>{e.preventDefault();const t=$("c-text").value.trim();if(!t)return;runMission(t,$("c-target").value||"");$("c-text").value=""});
$("quick").addEventListener("click",e=>{const b=e.target.closest("button[data-q]");if(!b)return;runMission(b.dataset.q,"",!!b.dataset.all)});
$("c-stop").onclick=()=>{stopFlag=true;if(ctl)ctl.abort()};

/* ---------- comunicaciones ---------- */
let selMission="";
function missionsAll(){const list=S.missions.slice();if(S.live&&!list.some(m=>m.id===S.live.id))list.unshift(S.live);return list.map(m=>S.live&&m.id===S.live.id&&running?S.live:m)}
function whoInfo(w){if(w==="cmd")return{name:"Tú",color:GOLD};if(w==="nexo")return{name:"Nexo",color:"#FFE2A8"};const d=depts().find(x=>x.id===w);return d?{name:d.name,color:d.color}:{name:w,color:"#A39BCB"}}
const VCLS={"Sí":"v-si","No":"v-no","Depende":"v-dep","Esperar":"v-esp"};
const hhmm=iso=>{if(!iso)return"";const d=new Date(iso);return pad(d.getHours())+":"+pad(d.getMinutes())};
function curMission(){const ms=missionsAll();if(!selMission||!ms.some(m=>m.id===selMission))selMission=ms[0]?ms[0].id:"";return ms.find(x=>x.id===selMission)}
function renderComms(){
  const ms=missionsAll();const sel=$("l-pick");curMission();
  sel.innerHTML=ms.map(m=>`<option value="${esc(m.id)}">${esc((m.origin==="semanal"?"Revisión · ":"")+(m.title||"Misión"))} · ${esc(pretty(ds(new Date(m.created||Date.now()))))}</option>`).join("");sel.value=selMission;sel.hidden=!ms.length;
  renderSummary();renderLog();
}
function renderSummary(){
  const el=$("l-summary");const m=curMission();
  if(!m){el.hidden=true;el.innerHTML="";return}
  const steps=m.steps||[];const reported=[...new Set(steps.filter(s=>s.kind==="report").map(s=>s.who))];
  const people=reported.map(id=>{const w=whoInfo(id);const src=portrait(id);return `<span class="ppl">${src?`<img src="${src}" alt="">`:`<span class="dot" style="background:${w.color}"></span>`}<span style="color:${w.color}">${esc(w.name)}</span></span>`}).join("");
  const pend=(m.proposals||[]).filter(p=>p.state==="pending").length;
  el.hidden=false;
  if(m.status==="running"&&running&&S.live&&m.id===S.live.id){
    const plan=((steps.find(s=>s.kind==="plan")||{}).plan)||[];const hasPlan=steps.some(s=>s.kind==="plan");
    const items=[["Plan",hasPlan]].concat(plan.map(p=>[whoInfo(p.dept).name,reported.includes(p.dept)])).concat([["Síntesis",!!m.summary]]);
    const onIdx=items.findIndex(x=>!x[1]);
    el.innerHTML=`<div class="sum run"><div class="row between"><span class="eyebrow">Misión en curso</span><span class="chip ok">${esc(PHASE||"Trabajando")}</span></div><div class="prog">${items.map((x,i)=>`<span class="${x[1]?"done":i===onIdx?"on":""}">${x[1]?"✓ ":""}${esc(x[0])}</span>`).join("")}</div><p class="hint">${esc(m.title||"")}</p></div>`;
    return}
  if(m.summary){
    el.innerHTML=`<div class="sum"><div class="row between"><span class="eyebrow">Resumen de la misión</span>${m.verdict?`<span class="verdict ${VCLS[m.verdict]||""}">${esc(m.verdict)}</span>`:""}</div>
      <p class="sumtext">${T(m.summary)}</p>
      ${m.next?`<div class="nextbox"><span>Siguiente paso</span><strong>${T(m.next)}</strong></div>`:""}
      ${m.condition?`<div class="nextbox cond"><span>Condición</span><strong>${T(m.condition)}</strong></div>`:""}
      <div class="row between"><div class="ppls">${people?"Participaron: "+people:""}</div>${pend?`<button class="btn ghost" type="button" id="go-props">${pend} propuesta${pend>1?"s":""} por decidir</button>`:""}</div></div>`;
    const gp=$("go-props");if(gp)gp.onclick=()=>$("props-card").scrollIntoView({behavior:reduced?"auto":"smooth",block:"start"});
    return}
  const errStep=steps.slice().reverse().find(s=>s.kind==="error");
  if(m.status==="error"||m.status==="stopped"||errStep){el.innerHTML=`<div class="sum off"><span class="eyebrow">${m.status==="stopped"?"Misión detenida":"La misión no terminó"}</span><p class="sumtext">${T(errStep?errStep.text:"Sin resumen.")}</p></div>`;return}
  el.hidden=true;el.innerHTML="";
}
function fmtDetail(s){const lines=String(s).split(/\n/).map(x=>x.trim()).filter(Boolean);if(!lines.length)return"";
  const bul=lines.filter(l=>/^[-•*]\s/.test(l)).length;
  if(bul>=lines.length*0.5)return `<ul>${lines.map(l=>`<li>${T(l.replace(/^[-•*]\s*/,""))}</li>`).join("")}</ul>`;
  return lines.map(l=>`<p>${T(l)}</p>`).join("")}
function renderLog(){
  const L=$("log");const m=curMission();
  if(!m){L.innerHTML=`<div class="empty">Aquí verás la conversación de cada misión: tu orden, el plan del Nexo, el reporte de cada agente y lo que se pasan entre ellos. Prueba con "Planear mi día".</div>`;return}
  const atBottom=L.scrollHeight-L.scrollTop-L.clientHeight<30;
  L.innerHTML=(m.steps||[]).map(st=>{const w=whoInfo(st.who);const hh=hhmm(st.at);
    if(st.kind==="order")return `<div class="msg me"><div class="bub"><div class="mh"><strong style="color:${GOLD}">Tu orden</strong><span class="tm">${hh}</span></div><div class="lead">${T(st.text)}</div></div><img class="av" src="${portrait("cmd")}" alt=""></div>`;
    if(st.kind==="plan")return `<div class="sys"><span class="sysl">Nexo armó el plan</span><div class="route">${(st.plan||[]).map((p,i)=>`<span class="rchip" style="--ac:${whoInfo(p.dept).color}" title="${esc(p.task)}">${i+1}. ${esc(whoInfo(p.dept).name)}</span>`).join('<span class="arr">→</span>')}<span class="arr">→</span><span class="rchip" style="--ac:${GOLD}">Síntesis</span></div>${st.text?`<div>${T(st.text)}</div>`:""}</div>`;
    if(st.kind==="report"){const src=portrait(st.who);return `<div class="msg" style="--ac:${w.color}">${src?`<img class="av" src="${src}" alt="">`:`<span class="av" style="background:${w.color}"></span>`}<div class="bub"><div class="mh"><strong style="color:${w.color}">${esc(w.name)}</strong><span class="tm">${hh}</span></div>${st.task?`<div class="task">Tarea: ${T(st.task)}</div>`:""}<div class="lead">${T(st.text)}</div>${st.detail?`<details><summary>Ver informe completo</summary>${fmtDetail(st.detail)}</details>`:""}</div></div>`}
    if(st.kind==="handoff"){const to=whoInfo(st.to);return `<div class="hand"><span style="color:${w.color}">${esc(w.name)}</span> <span class="arr">lleva una nota a</span> <span style="color:${to.color}">${esc(to.name)}</span><span class="hq">“${T(st.text)}”</span></div>`}
    if(st.kind==="summary")return `<div class="sys"><span class="sysl">Nexo integró los reportes · resumen arriba</span></div>`;
    if(st.kind==="error")return `<div class="sys err">${T(st.text)}</div>`;
    return `<div class="sys">${T(st.text)}</div>`}).join("")||`<div class="empty">Misión sin registros.</div>`;
  if(running||atBottom)L.scrollTop=L.scrollHeight;
}
$("l-pick").onchange=e=>{selMission=e.target.value;renderComms()};

/* ---------- propuestas ---------- */
function pendingProps(){const out=[];missionsAll().slice(0,15).forEach(m=>{const seen=[];(m.proposals||[]).forEach(p=>{if(p.state!=="pending")return;
  if(p.type==="quest"){if(S.quests[today()]||seen.some(x=>x.type==="quest"))return}else if(isDup(p,seen))return;seen.push(p);out.push({m,p})})});return out}
function renderProps(){
  const ps=pendingProps();$("p-count").textContent=ps.length;$("p-count").className="chip "+(ps.length?"warn":"");
  $("props").innerHTML=ps.length?ps.slice(0,12).map(({m,p})=>{const w=whoInfo(p.dept);let body="";
    if(p.type==="card")body=`<span class="chip">Tarjeta${p.topic?" · "+esc(p.topic):""}</span><div class="t"><strong>${T(p.front)}</strong></div><div class="muted t" style="font-size:.86rem">${T(p.back)}</div>`;
    if(p.type==="project")body=`<span class="chip">Proyecto · ${esc(p.area||"Portafolio")}</span><div class="t"><strong>${T(p.title)}</strong></div>${p.stack||p.skill?`<div class="muted" style="font-size:.8rem">${T(p.stack||p.skill)}</div>`:""}${p.goal?`<div class="muted t" style="font-size:.86rem">${T(p.goal)}</div>`:""}`;
    if(p.type==="quest")body=`<span class="chip ok">Misión del día</span><div class="t"><strong>${T(p.text)}</strong></div>`;
    if(p.type==="skill")body=`<span class="chip">Habilidad · ${esc(LVNAME[p.level]||p.level)}</span><div class="t"><strong>${T(p.name)}</strong></div>${p.evidence?`<div class="muted t" style="font-size:.86rem">Evidencia: ${T(p.evidence)}</div>`:""}`;
    const src=portrait(p.dept);
    return `<div class="prop" data-m="${esc(m.id)}" data-p="${esc(p.id)}"><div class="row" style="gap:6px">${src?`<img src="${src}" alt="" style="width:20px;height:20px;image-rendering:pixelated;border-radius:3px">`:""}<span style="font:500 .82rem var(--f-display);color:${w.color}">${esc(w.name)}</span></div>${body}<div class="row"><button class="btn primary" data-act="apply">Aplicar</button><button class="btn ghost" data-act="dismiss">Descartar</button></div></div>`}).join(""):`<div class="empty">Sin propuestas pendientes.</div>`;
}
$("props").addEventListener("click",e=>{const b=e.target.closest("button[data-act]");if(!b)return;const box=b.closest(".prop");const m=missionsAll().find(x=>x.id===box.dataset.m);if(!m)return;
  const pr=(m.proposals||[]).find(x=>x.id===box.dataset.p);if(!pr)return;const t=today();
  if(b.dataset.act==="apply"){
    if(pr.type==="card")save("cards/c"+Date.now().toString(36),{front:pr.front,back:pr.back,topic:pr.topic||"",due:t,interval:0,ease:2.5,reps:0,reviews:0,source:"agente:"+pr.dept,created:nowISO()});
    if(pr.type==="project")save("projects/p"+Date.now().toString(36),{title:pr.title,area:pr.area||"Portafolio",stack:pr.stack||pr.skill||"",goal:pr.goal||"",next:"",repo:"",status:"idea",learned:"",source:"agente:"+pr.dept,created:nowISO(),updated:nowISO()});
    if(pr.type==="quest")save("quests/"+t,{date:t,text:pr.text,dept:pr.dept,done:false,created:nowISO()});
    if(pr.type==="skill"){const ex=S.skills.find(s=>overlap(s.name,pr.name)>=.6);if(ex){const ns=Object.assign({},ex,{level:pr.level,evidence:pr.evidence||ex.evidence,updated:nowISO()});delete ns.id;save("skills/"+ex.id,ns)}else save("skills/s"+Date.now().toString(36),{name:pr.name,level:pr.level,evidence:pr.evidence||"",category:"Otra",source:"agente:"+pr.dept,updated:nowISO()})}
    toast({card:"Tarjeta creada",project:"Proyecto agregado a ideas",quest:"Misión del día fijada",skill:"Habilidad actualizada"}[pr.type]||"Aplicado")}
  const nm=JSON.parse(JSON.stringify(m));delete nm.id;nm.proposals.forEach(x=>{if(x.id===pr.id)x.state=b.dataset.act==="apply"?"applied":"dismissed"});
  pr.state=b.dataset.act==="apply"?"applied":"dismissed";if(S.live&&S.live.id===m.id)S.live.proposals=nm.proposals;
  save("missions/"+m.id,nm);renderProps();renderSummary()});

/* ---------- escuadrón y HUD ---------- */
function agentCard(d,clickable){const a=SC.agents[d.id];const xp=agentXP(d.id);const lv=Math.floor(xp/30)+1;
  let lastR="";missionsAll().some(m=>(m.steps||[]).slice().reverse().some(st=>{if(st.who===d.id&&st.kind==="report"){lastR=st.text;return true}return false}));
  const st=a&&a.state==="working"?"Trabajando":a&&a.path&&a.path.length?"En movimiento":isNight()?"Descansando":"En su sala";const src=portrait(d.id);
  return `<${clickable?"button type=\"button\"":"div"} class="agent" style="--ac:${d.color}${clickable?"":";cursor:default"}" data-id="${esc(d.id)}"><span class="ah">${src?`<img src="${src}" alt="">`:""}<span class="an"><span class="n" style="color:${d.color}">${esc(d.name)}</span><span class="s">${st} · Nv ${lv} · ${xp} XP</span></span></span>${TRAITS[d.id]?`<span class="tr">${esc(TRAITS[d.id])}</span>`:""}<span class="r">${T(clickable?(lastR||d.mission):d.mission)}</span></${clickable?"button":"div"}>`}
function renderRoster(){$("roster").innerHTML=depts().map(d=>agentCard(d,true)).join("")}
$("roster").addEventListener("click",e=>{const b=e.target.closest(".agent");if(b)selectAgent(b.dataset.id)});
function renderHud(){
  const xp=xpTotal(),lv=lvlOf(xp),lo=25*(lv-1)**2,hi=25*lv**2;
  $("h-level").textContent="Nv "+lv;$("h-rank").textContent=rankOf(lv);$("h-xpbar").style.width=Math.round(100*(xp-lo)/(hi-lo))+"%";$("h-xp").textContent=xp+" XP · faltan "+(hi-xp)+" para Nv "+(lv+1);
  const sc=score(today());$("h-pts").textContent=sc.pts+"/"+sc.min;$("h-pts-s").textContent=sc.met?"día cumplido":"puntos de hoy";$("h-pts").style.color=sc.met?"var(--accent)":"";
  $("h-streak").textContent=streak();
  const q=S.quests[today()];const hq=$("h-quest");
  if(q){if(hq.dataset.t!==q.text+q.done){hq.dataset.t=q.text+q.done;hq.innerHTML=`<input type="checkbox" id="q-done" ${q.done?"checked":""} aria-label="Marcar misión del día"><label for="q-done" style="font-size:.88rem;${q.done?"text-decoration:line-through;color:var(--muted)":""}">${T(q.text)}</label>`}}
  else{hq.dataset.t="";hq.innerHTML=`<span class="muted" style="font-size:.85rem">Pide "Planear mi día" en la consola y aplica la misión que proponga.</span>`}
  const sel=$("c-target");const cv_=sel.value;sel.innerHTML=`<option value="">Nexo decide y coordina</option>`+depts().map(d=>`<option value="${esc(d.id)}">${esc(d.name)}</option>`).join("");sel.value=cv_;
}
$("h-quest").addEventListener("change",e=>{if(e.target.id!=="q-done")return;const q=S.quests[today()];if(!q)return;const nq=Object.assign({},q,{done:e.target.checked,doneAt:nowISO()});delete nq.id;S.quests[today()]=Object.assign({},nq);save("quests/"+today(),nq);if(e.target.checked){toast("+15 XP · misión del día cumplida");bubble(SC.cmd,"¡Misión cumplida!",2500,GOLD);Object.values(SC.agents).forEach(a=>a.emote={k:"♥",until:performance.now()+2000})}renderHud()});
let lastLayoutKey="";
function ensureLayout(){const key=JSON.stringify(depts().map(d=>d.id+d.name+d.color));if(key!==lastLayoutKey){lastLayoutKey=key;layout()}}
function renderNexo(){ensureLayout();renderHud();renderComms();renderProps();renderRoster()}

/* =================== PERSONAL: HOY =================== */
function setDay(patch){const d=Object.assign({},dayData(cur),patch,{date:cur,updated:nowISO()});d.habits=Object.assign({},d.habits);d.bonus=Object.assign({},d.bonus);S.days[cur]=d;$("d-save").textContent="Guardando…";save("days/"+cur,d).then(()=>{if($("d-save").textContent==="Guardando…")$("d-save").textContent="Guardado"});renderHoy()}
function renderHoy(){
  const c=cfg(),d=dayData(cur),sc=score(cur);
  $("d-label").textContent=cur===today()?"Hoy · "+pretty(cur):pretty(cur);$("d-next").disabled=cur>=today();
  $("d-points").textContent=sc.pts;$("d-min").textContent="/ "+sc.min+" mínimo · semana "+(weekIndex(cur)+1);
  const st=$("d-status");st.className="chip "+(sc.met?"ok":sc.any?"warn":"");st.textContent=sc.met?"Día cumplido":sc.pts>=sc.min&&!sc.priOk?"Falta un prioritario":sc.any?"En progreso":"Sin empezar";
  $("d-streak").textContent="Racha: "+streak()+" días";$("d-bonus").textContent="Bonus: "+sc.b+" ("+Math.floor(sc.b/sc.per)+" pt)";$("d-bonus-rule").textContent="· "+sc.per+" bonus = 1 punto";
  const tgt=studyTarget(cur);$("d-study-target").textContent=tgt?("Meta de estudio esta semana: "+tgt+" min/día · llevas "+(d.studyMin||0)):"";
  $("d-habits").innerHTML=c.habits.length?c.habits.map(h=>`<label class="chk ${d.habits&&d.habits[h.id]?"on":""}"><input type="checkbox" data-h="${esc(h.id)}" ${d.habits&&d.habits[h.id]?"checked":""}><span>${esc(h.name)}</span>${h.priority?'<span class="tag">Prioridad</span>':""}</label>`).join(""):`<div class="empty">Tus hábitos aparecen aquí en cuanto cargue la configuración.</div>`;
  $("d-bonuses").innerHTML=c.bonus.map(h=>`<label class="chk bonus ${d.bonus&&d.bonus[h.id]?"on":""}"><input type="checkbox" data-b="${esc(h.id)}" ${d.bonus&&d.bonus[h.id]?"checked":""}><span>${esc(h.name)}</span></label>`).join("");
  $("d-energy").innerHTML=[1,2,3,4,5].map(n=>`<button type="button" data-e="${n}" aria-pressed="${d.energy===n}">${n}</button>`).join("");
  const map={"d-learned":"learned","d-blocked":"blocked","d-win":"win","d-notes":"notes"};
  for(const id in map){const el=$(id);if(document.activeElement!==el&&!el.dataset.dirty)el.value=d[map[id]]||""}
  const mi=$("d-min-input");if(document.activeElement!==mi)mi.value=d.studyMin||"";
}
$("d-habits").addEventListener("change",e=>{const id=e.target.dataset.h;if(!id)return;const h=Object.assign({},dayData(cur).habits);if(e.target.checked)h[id]=true;else delete h[id];setDay({habits:h})});
$("d-bonuses").addEventListener("change",e=>{const id=e.target.dataset.b;if(!id)return;const h=Object.assign({},dayData(cur).bonus);if(e.target.checked)h[id]=true;else delete h[id];setDay({bonus:h})});
$("d-energy").addEventListener("click",e=>{const n=+e.target.dataset.e;if(n)setDay({energy:dayData(cur).energy===n?null:n})});
let txtT;
["d-learned","d-blocked","d-win","d-notes"].forEach(id=>$(id).addEventListener("input",e=>{e.target.dataset.dirty="1";$("d-save").textContent="Escribiendo…";clearTimeout(txtT);txtT=setTimeout(flushText,900)}));
function flushText(){const p={};const map={"d-learned":"learned","d-blocked":"blocked","d-win":"win","d-notes":"notes"};let ch=false;for(const id in map){const el=$(id);if(el.dataset.dirty){p[map[id]]=el.value;delete el.dataset.dirty;ch=true}}if(ch)setDay(p)}
$("d-min-input").addEventListener("change",e=>setDay({studyMin:Math.max(0,parseInt(e.target.value||"0",10)||0)}));
$("pomo-add").onclick=()=>setDay({studyMin:(dayData(cur).studyMin||0)+25});
$("pomo-add50").onclick=()=>setDay({studyMin:(dayData(cur).studyMin||0)+50});
function go2(n){flushText();cur=n;renderHoy()}
$("d-prev").onclick=()=>go2(addDays(cur,-1));$("d-next").onclick=()=>{if(cur<today())go2(addDays(cur,1))};$("d-today").onclick=()=>go2(today());

/* =================== PERSONAL: SEMANA =================== */
function renderSemana(){
  const mon=monday(today());const days=[...Array(7)].map((_,i)=>addDays(mon,i));const scs=days.map(score);
  const met=scs.filter((s,i)=>s.met&&days[i]<=today()).length;$("w-days").textContent=met+"/7 días cumplidos";$("w-days").className="chip "+(met>=5?"ok":met>=3?"warn":"");
  const mins=days.reduce((a,s)=>a+(dayData(s).studyMin||0),0);$("w-study").textContent=(mins/60).toFixed(1)+" h estudio";
  const en=days.map(s=>dayData(s).energy).filter(Boolean);$("w-energy").textContent="Energía media "+(en.length?(en.reduce((a,b)=>a+b,0)/en.length).toFixed(1):"—");
  const Wd=560,Hd=200,L=28,B=26,Tp=12;const maxY=Math.max(6,...scs.map(s=>s.pts),...scs.map(s=>s.min));const y=v=>Tp+(Hd-Tp-B)*(1-v/maxY);const bw=(Wd-L-8)/7;
  let g=`<svg viewBox="0 0 ${Wd} ${Hd}" role="img" aria-label="Puntos por día de esta semana">`;
  for(let v=0;v<=maxY;v+=2)g+=`<line x1="${L}" x2="${Wd-4}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Sans,sans-serif">${v}</text>`;
  days.forEach((s,i)=>{const sc=scs[i];const x=L+4+i*bw;const h=(Hd-Tp-B)*(sc.pts/maxY);const fut=s>today();
    g+=`<rect x="${x+bw*.18}" y="${y(sc.pts)}" width="${bw*.64}" height="${Math.max(0,h)}" rx="2" fill="${sc.met?"var(--accent)":fut?"var(--sunk)":"var(--amber)"}"/><line x1="${x+bw*.08}" x2="${x+bw*.92}" y1="${y(sc.min)}" y2="${y(sc.min)}" stroke="var(--fg)" stroke-dasharray="3 3" stroke-width="1.2"/><text x="${x+bw/2}" y="${Hd-8}" text-anchor="middle" font-size="12" fill="${s===today()?"var(--fg)":"var(--muted)"}" font-weight="${s===today()?600:400}" font-family="IBM Plex Sans,sans-serif">${DOW[i]}</text>`});
  $("w-chart").innerHTML=g+`</svg>`;
  const c=cfg();const past=days.filter(s=>s<=today());
  $("w-bars").innerHTML=c.habits.length?c.habits.map(h=>{const n=past.filter(s=>dayData(s).habits&&dayData(s).habits[h.id]).length;const p=past.length?Math.round(100*n/past.length):0;return `<div class="bar"><span style="overflow-wrap:anywhere">${esc(h.name)}</span><span class="t"><i style="width:${p}%"></i></span><span class="muted" style="font-variant-numeric:tabular-nums">${n}/${past.length}</span></div>`}).join(""):`<div class="empty">Sin hábitos configurados.</div>`;
  const st=addDays(mon,-21);let hh="";for(let i=0;i<28;i++){const s=addDays(st,i);const sc=score(s);const lv=s>today()?"":sc.met?(sc.pts>sc.min?"l3":"l2"):sc.any?"l1":"";hh+=`<div class="${lv} ${s===today()?"today":""}" title="${pretty(s)}: ${sc.pts} pts"></div>`}$("w-heat").innerHTML=hh;
  const wi=weekIndex(today());const m2=c.weekMins||[];
  $("w-prog").innerHTML=m2.map((m,i)=>`<div class="bar"><span>Semana ${i+1}${i===wi?" · actual":""}</span><span class="t"><i style="width:${Math.round(100*m/Math.max(...m2,1))}%;${i===wi?"":"opacity:.45"}"></i></span><span class="muted" style="font-variant-numeric:tabular-nums">${m} pts</span></div>`).join("")+(c.studyTargetMin?`<p class="hint" style="margin-top:6px">Estudio esta semana: ${studyTarget(today())} min/día.</p>`:"");
}

/* =================== PERSONAL: HÁBITOS =================== */
function renderHabitos(){const c=cfg();const ch=$("cf-habits"),cb=$("cf-bonus");
  if(document.activeElement!==ch&&!ch.dataset.dirty)ch.value=c.habits.map(h=>(h.priority?"*":"")+h.name).join("\n");
  if(document.activeElement!==cb&&!cb.dataset.dirty)cb.value=c.bonus.map(h=>h.name).join("\n")}
["cf-habits","cf-bonus"].forEach(id=>$(id).addEventListener("input",e=>e.target.dataset.dirty="1"));
$("cf-save").onclick=()=>{if(!S.config){toast("La configuración aún no carga.");return}
  const old=S.config;const byName=l=>Object.fromEntries(l.map(h=>[h.name.toLowerCase(),h.id]));const oh=byName(old.habits),ob=byName(old.bonus);const used=new Set();
  const mk=(line,map)=>{const pri=line.startsWith("*");const name=line.replace(/^\*\s*/,"").trim();let id=map[name.toLowerCase()]||slug(name);while(used.has(id))id+="-2";used.add(id);return pri?{id,name,priority:true}:{id,name}};
  const habits=$("cf-habits").value.split("\n").map(s=>s.trim()).filter(Boolean).map(l=>mk(l,oh));
  const bonus=$("cf-bonus").value.split("\n").map(s=>s.trim()).filter(Boolean).map(l=>{const h=mk(l.replace(/^\*/,""),ob);delete h.priority;return h});
  if(!habits.length){toast("Deja al menos un hábito.");return}
  const nc=Object.assign({},old,{habits,bonus,updated:nowISO()});delete $("cf-habits").dataset.dirty;delete $("cf-bonus").dataset.dirty;$("cf-state").textContent="Guardando…";
  save("config/main",nc).then(()=>{$("cf-state").textContent="Guardado";save("changelog/l"+Date.now().toString(36),{date:today(),text:"Hábitos editados desde el tablero ("+habits.length+" hábitos, "+bonus.length+" bonus)."})});
};

/* =================== TRABAJO: PROYECTOS =================== */
const AREAS=["Portafolio","Negocio","Aprendizaje","Creativo","Otro"];
const ACOL={"Portafolio":"var(--c1)","Negocio":"var(--c2)","Aprendizaje":"var(--c3)","Creativo":"var(--c6)","Otro":"var(--muted)"};
const COLS=[["idea","Ideas"],["doing","En curso"],["review","Por publicar"],["done","Terminado"]];
const COLN=Object.fromEntries(COLS);
const areaOf=p=>{const a=p.area||"Otro";return a==="Portafolio QA"?"Portafolio":(AREAS.includes(a)?a:"Otro")};
let pArea="",pEdit="";
function renderProyectos(){
  const ae=document.activeElement;if(pEdit&&ae&&$("kanban").contains(ae)&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))return;
  const counts={};S.projects.forEach(p=>{const a=areaOf(p);counts[a]=(counts[a]||0)+1});
  $("pfilters").innerHTML=[["","Todos ("+S.projects.length+")"]].concat(AREAS.filter(a=>counts[a]).map(a=>[a,a+" ("+counts[a]+")"])).map(([k,n])=>`<button type="button" data-a="${esc(k)}" aria-pressed="${pArea===k}">${esc(n)}</button>`).join("");
  const list=S.projects.filter(p=>!pArea||areaOf(p)===pArea);
  $("kanban").innerHTML=COLS.map(([k,n],ci)=>{const items=list.filter(p=>(p.status||"idea")===k);
    return `<div class="col"><h3><span>${n}</span><span>${items.length}</span></h3>${items.length?items.map(p=>pEdit===p.id?editCard(p):viewCard(p,ci)).join(""):`<div class="empty">${ci===0?"Sin ideas por ahora.":"Vacío"}</div>`}</div>`}).join("");
}
function viewCard(p,ci){const a=areaOf(p);return `<div class="pcard" data-id="${esc(p.id)}">
  <div class="row between" style="gap:6px"><span class="chip" style="color:${ACOL[a]}">${esc(a)}</span>${p.source?`<span class="chip">propuesto</span>`:""}</div>
  <div class="t">${esc(p.title)}</div>
  ${p.stack||p.skill?`<div class="muted" style="font-size:.8rem">${esc(p.stack||p.skill)}</div>`:""}
  ${p.goal?`<div style="font-size:.85rem;overflow-wrap:anywhere">${T(p.goal)}</div>`:""}
  ${p.next?`<div class="pnext"><strong>Siguiente:</strong> ${T(p.next)}</div>`:""}
  ${p.repo?`<a href="${esc(p.repo)}" target="_blank" rel="noopener">${esc(p.repo.replace(/^https?:\/\//,""))}</a>`:""}
  ${p.learned?`<details><summary>Qué aprendí</summary><div style="white-space:pre-wrap;font-size:.85rem;padding-top:4px">${T(p.learned)}</div></details>`:""}
  <div class="row between"><div class="row" style="gap:4px"><button class="btn icon" data-mv="-1" ${ci===0?"disabled":""} aria-label="Mover a la izquierda">←</button><button class="btn icon" data-mv="1" ${ci===3?"disabled":""} aria-label="Mover a la derecha">→</button></div><button class="btn ghost" data-edit>Editar</button></div></div>`}
function fieldsHTML(p,pre){return `
  <label class="field">Nombre<input type="text" id="${pre}-title" value="${esc(p.title||"")}" required></label>
  <label class="field">Área<select id="${pre}-area">${AREAS.map(a=>`<option ${areaOf(p)===a?"selected":""}>${a}</option>`).join("")}</select></label>
  <label class="field">Estado<select id="${pre}-status">${COLS.map(([k,n])=>`<option value="${k}" ${(p.status||"idea")===k?"selected":""}>${n}</option>`).join("")}</select></label>
  <label class="field">Stack o herramientas<input type="text" id="${pre}-stack" value="${esc(p.stack||p.skill||"")}" placeholder="Ej. Claude Code · Python · PostgreSQL"></label>
  <label class="field">De qué trata<textarea id="${pre}-goal">${esc(p.goal||"")}</textarea></label>
  <label class="field">Siguiente paso<input type="text" id="${pre}-next" value="${esc(p.next||"")}"></label>
  <label class="field">Repositorio<input type="url" id="${pre}-repo" value="${esc(p.repo||"")}" placeholder="https://github.com/…"></label>
  <label class="field">Qué aprendí<textarea id="${pre}-learned">${esc(p.learned||"")}</textarea></label>`}
function editCard(p){return `<div class="pcard pedit" data-id="${esc(p.id)}">${fieldsHTML(p,"pe")}<div class="row between"><div class="row" style="gap:6px"><button class="btn primary" data-save>Guardar</button><button class="btn ghost" data-cancel>Cancelar</button></div><button class="btn danger" data-delp>Quitar</button></div></div>`}
function readFields(pre){const g=k=>$(pre+"-"+k).value.trim();return{title:g("title"),area:$(pre+"-area").value,status:$(pre+"-status").value,stack:g("stack"),goal:g("goal"),next:g("next"),repo:g("repo"),learned:$(pre+"-learned").value}}
$("pfilters").addEventListener("click",e=>{const b=e.target.closest("button[data-a]");if(!b)return;pArea=b.dataset.a;renderProyectos()});
$("pnew-btn").onclick=()=>{const box=$("pnew");if(box.hidden){$("pnew-fields").innerHTML=fieldsHTML({status:"doing",area:pArea||"Portafolio"},"pn");box.hidden=false;$("pn-title").focus()}else box.hidden=true};
$("pnew-cancel").onclick=()=>{$("pnew").hidden=true};
$("pf").addEventListener("submit",e=>{e.preventDefault();const f=readFields("pn");if(!f.title)return;save("projects/p"+Date.now().toString(36),Object.assign(f,{created:nowISO(),updated:nowISO()})).then(()=>toast("Proyecto guardado"));$("pnew").hidden=true});
$("kanban").addEventListener("click",e=>{const card=e.target.closest(".pcard");if(!card)return;const p=S.projects.find(x=>x.id===card.dataset.id);if(!p)return;const t=e.target.closest("button");if(!t)return;
  if(t.dataset.mv){const i=COLS.findIndex(c=>c[0]===(p.status||"idea"));const ni=Math.min(3,Math.max(0,i+ +t.dataset.mv));const np=Object.assign({},p,{status:COLS[ni][0],updated:nowISO()});delete np.id;save("projects/"+p.id,np);if(ni>i)toast("+XP · "+p.title+" pasó a "+COLS[ni][1])}
  if(t.hasAttribute("data-edit")){pEdit=p.id;renderProyectos();const el=$("pe-title");if(el)el.focus()}
  if(t.hasAttribute("data-cancel")){pEdit="";renderProyectos()}
  if(t.hasAttribute("data-save")){const f=readFields("pe");if(!f.title){toast("El proyecto necesita nombre.");return}const np=Object.assign({},p,f,{updated:nowISO()});delete np.id;pEdit="";save("projects/"+p.id,np).then(()=>toast("Proyecto actualizado"));renderProyectos()}
  if(t.hasAttribute("data-delp")){if(t.dataset.confirm){pEdit="";del("projects/"+p.id)}else{t.dataset.confirm="1";t.textContent="¿Quitar de verdad?";setTimeout(()=>{t.textContent="Quitar";delete t.dataset.confirm},3500)}}});

/* =================== TRABAJO: HABILIDADES =================== */
const LEVELS=[["probada","Probadas","Con evidencia que puedes mostrar."],["practica","En práctica","Las trabajas de verdad, aún sin dominarlas."],["sinprobar","Sin probar","Hipótesis: no cuentan como habilidad."]];
const SKCAT=["Desarrollo","Datos","Herramientas","Calidad","Negocio","Creativo","Idiomas","Otra"];
$("sk-cat").innerHTML=SKCAT.map(c=>`<option>${c}</option>`).join("");
let skEdit="";
function renderHabilidades(){
  const by=lv=>S.skills.filter(s=>(s.level||"sinprobar")===lv).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
  $("sk-cols").innerHTML=LEVELS.map(([k,n,d],i)=>`<div class="col sk-${k}"><h3><span>${n}</span><span>${by(k).length}</span></h3><p class="hint">${d}</p>${by(k).map(s=>`<div class="pcard" data-id="${esc(s.id)}"><div class="row between" style="gap:6px;align-items:flex-start"><span class="t">${esc(s.name)}</span>${s.category?`<span class="chip">${esc(s.category)}</span>`:""}</div>${s.evidence?`<div class="ev">${T(s.evidence)}</div>`:`<div class="ev muted">Sin evidencia registrada.</div>`}<div class="row between"><div class="row" style="gap:4px"><button class="btn icon" data-lv="-1" ${i===0?"disabled":""} aria-label="Mover a ${i>0?LEVELS[i-1][1]:""}">←</button><button class="btn icon" data-lv="1" ${i===2?"disabled":""} aria-label="Mover a ${i<2?LEVELS[i+1][1]:""}">→</button></div><button class="btn ghost" data-ed>Editar</button></div></div>`).join("")||`<div class="empty">Nada aquí todavía.</div>`}</div>`).join("");
}
function openSkill(s,msg){skEdit=s?s.id:"";$("skf").hidden=false;$("sk-name").value=s?s.name:"";$("sk-level").value=s?(s.level||"sinprobar"):"practica";$("sk-cat").value=s&&SKCAT.includes(s.category)?s.category:"Desarrollo";$("sk-ev").value=s?(s.evidence||""):"";$("sk-del").hidden=!s;$("sk-msg").textContent=msg||"";$("sk-name").focus()}
$("sk-new-btn").onclick=()=>openSkill(null);
$("sk-cancel").onclick=()=>{$("skf").hidden=true;skEdit=""};
$("skf").addEventListener("submit",e=>{e.preventDefault();const name=$("sk-name").value.trim();if(!name)return;const level=$("sk-level").value,ev=$("sk-ev").value.trim();
  if(level==="probada"&&!ev){$("sk-msg").textContent="Para marcarla como probada escribe la evidencia: qué hiciste que lo demuestra.";$("sk-ev").focus();return}
  const data={name,level,category:$("sk-cat").value,evidence:ev,updated:nowISO()};
  if(skEdit){const ns=Object.assign({},S.skills.find(x=>x.id===skEdit)||{},data);delete ns.id;save("skills/"+skEdit,ns)}else save("skills/s"+Date.now().toString(36),data);
  toast("Habilidad guardada");$("skf").hidden=true;skEdit=""});
$("sk-del").onclick=e=>{const b=e.currentTarget;if(!skEdit)return;if(b.dataset.confirm){del("skills/"+skEdit);$("skf").hidden=true;skEdit="";delete b.dataset.confirm;b.textContent="Quitar"}else{b.dataset.confirm="1";b.textContent="¿Quitar de verdad?";setTimeout(()=>{b.textContent="Quitar";delete b.dataset.confirm},3500)}};
$("sk-cols").addEventListener("click",e=>{const t=e.target.closest("button");const card=e.target.closest(".pcard");if(!t||!card)return;const s=S.skills.find(x=>x.id===card.dataset.id);if(!s)return;
  if(t.hasAttribute("data-ed")){openSkill(s);$("skf").scrollIntoView({behavior:reduced?"auto":"smooth",block:"center"});return}
  if(t.dataset.lv){const i=LVKEYS.indexOf(s.level||"sinprobar");const ni=Math.min(2,Math.max(0,i+ +t.dataset.lv));const nl=LVKEYS[ni];
    if(nl==="probada"&&!s.evidence){openSkill(Object.assign({},s,{level:"probada"}),"Para marcarla como probada escribe la evidencia: qué hiciste que lo demuestra.");$("sk-level").value="probada";$("sk-ev").focus();return}
    const ns=Object.assign({},s,{level:nl,updated:nowISO()});delete ns.id;save("skills/"+s.id,ns);if(nl==="probada")toast("+5 XP · "+s.name+" ahora es habilidad probada")}});

/* =================== TRABAJO: REPASO =================== */
function dueCards(){const t=today();return S.cards.filter(c=>(c.due||t)<=t).sort((a,b)=>(a.due||"").localeCompare(b.due||"")||(a.seenAt||0)-(b.seenAt||0))}
function nextInterval(c,q){let iv=c.interval||0,ease=c.ease||2.5,reps=c.reps||0;
  if(q===0)return{interval:0,ease:Math.max(1.3,ease-.2),reps:0};
  if(q===1){iv=Math.max(1,Math.round(iv*1.2));ease-=.15}else if(q===2){iv=reps===0?1:reps===1?3:Math.round(iv*ease)}else{iv=reps===0?3:Math.round(Math.max(iv,1)*ease*1.3);ease+=.15}
  return{interval:iv,ease:Math.min(3,Math.max(1.3,ease)),reps:reps+1}}
let rv={id:"",step:"ask",ans:"",fb:null,ahead:false,key:""},rfEdit="";
const GRADES=[["No la sabía",0],["Con dudas",1],["Bien",2],["Perfecto",3]];
function practiceQueue(){const d=dueCards();if(d.length||!rv.ahead)return d;return S.cards.slice().sort((a,b)=>(a.due||"").localeCompare(b.due||"")||(a.seenAt||0)-(b.seenAt||0))}
function renderRepaso(){
  const due=dueCards();$("r-due").textContent=due.length+" por repasar hoy";$("r-due").className="chip "+(due.length?"warn":"ok");
  $("r-done").textContent=S.cards.filter(c=>c.lastDay===today()).length+" repasadas hoy";$("r-total").textContent=S.cards.length+" tarjetas";
  renderPractice();renderDeck();
  $("rf-topics").innerHTML=[...new Set(S.cards.map(c=>c.topic).filter(Boolean))].map(t=>`<option value="${esc(t)}">`).join("");
}
function renderPractice(force){
  const q=practiceQueue();let c=q.find(x=>x.id===rv.id);
  if(!c){c=q[0];rv=Object.assign(rv,{id:c?c.id:"",step:"ask",ans:"",fb:null})}
  const key=(c?c.id:"none:"+S.cards.length)+"|"+rv.step+"|"+(rv.fb?rv.fb.score:"")+"|"+(sample&&!sampleOff?1:0)+"|"+HIDE;
  if(!force&&key===rv.key&&$("r-practice").childElementCount)return;rv.key=key;
  const Pp=$("r-practice");
  if(!c){$("r-steps").innerHTML="";
    if(S.cards.length){const nx=S.cards.map(x=>x.due).filter(Boolean).sort()[0];Pp.innerHTML=`<div class="qbox">Repaso de hoy terminado.</div><p class="hint">La próxima tarjeta vuelve el ${esc(pretty(nx||today()))}. Puedes adelantar práctica si quieres.</p><div class="row"><button class="btn" id="rv-ahead">Practicar por adelantado</button></div>`}
    else Pp.innerHTML=`<div class="qbox">Aún no tienes tarjetas.</div><p class="hint">Crea la primera abajo o pide al Nexo que convierta tu bitácora en tarjetas.</p>`;
    return}
  const cls=rv.step==="ask"?["done","on","",""]:["done","done","done","on"];
  $("r-steps").innerHTML=["Lee la pregunta","Escribe tu respuesta","Compara","Califícate"].map((s,i)=>`<span class="${cls[i]}">${i+1}. ${s}</span>`).join("");
  const pos=q.findIndex(x=>x.id===c.id)+1;
  const head=`<div class="row" style="gap:8px">${c.topic?`<span class="chip">${esc(c.topic)}</span>`:""}<span class="muted" style="font-size:.8rem">Tarjeta ${pos} de ${q.length}${!dueCards().length&&rv.ahead?" · por adelantado":""}</span></div><div class="qbox">${T(c.front)}</div>`;
  if(rv.step==="ask"){Pp.innerHTML=head+`<label class="field">Tu respuesta, de memoria<textarea id="rv-ans" placeholder="Escribe lo que dirías. No tiene que salir perfecta.">${esc(rv.ans)}</textarea></label><div class="row"><button class="btn primary" type="button" id="rv-check">Comprobar</button><button class="btn ghost" type="button" id="rv-skip">No me acuerdo</button></div>`;return}
  const sug=rv.fb?rv.fb.score:(rv.ans?-1:0);const canEval=sample&&!sampleOff&&rv.ans;
  Pp.innerHTML=head+`<div class="compare"><div><h3>Tu respuesta</h3>${rv.ans?esc(rv.ans):'<span class="muted">No respondiste.</span>'}</div><div class="ok"><h3>Respuesta correcta</h3>${T(c.back)}</div></div>
    ${rv.fb?`<div class="feedback"><strong>Claude: ${esc(GRADES[rv.fb.score][0])}.</strong> ${T(rv.fb.comment)}</div>`:canEval?`<div><button class="btn" type="button" id="rv-eval">Que Claude evalúe mi respuesta</button></div>`:""}
    <h3>¿Qué tan bien te salió? Elige con honestidad: de eso depende cuándo vuelve.</h3>
    <div class="grade">${GRADES.map(([n,qv])=>{const r=nextInterval(c,qv);return `<button type="button" data-q="${qv}" class="${sug===qv?"sug":""}">${n}<small>${r.interval?"Vuelve en "+r.interval+(r.interval===1?" día":" días"):"Vuelve hoy mismo"}</small></button>`}).join("")}</div>`;
}
$("r-practice").addEventListener("input",e=>{if(e.target.id==="rv-ans")rv.ans=e.target.value});
$("r-practice").addEventListener("click",e=>{const t=e.target.closest("button");if(!t)return;const c=S.cards.find(x=>x.id===rv.id);
  if(t.id==="rv-ahead"){rv.ahead=true;rv.key="";renderPractice(true);return}
  if(!c)return;
  if(t.id==="rv-check"){rv.ans=($("rv-ans").value||"").trim();rv.step="check";renderPractice(true)}
  if(t.id==="rv-skip"){rv.ans="";rv.step="check";renderPractice(true)}
  if(t.id==="rv-eval")evalAnswer(c,t);
  if(t.dataset.q!==undefined)rateCard(c,+t.dataset.q)});
async function evalAnswer(c,b){b.disabled=true;b.textContent="Claude está evaluando…";
  try{const r=await sample.json(BASE_()+"\n\nEres un entrenador técnico paciente. Compara la respuesta de "+WHO()+" con la respuesta esperada. Cuenta como correctas las ideas clave aunque use otras palabras.\nPregunta: "+c.front+"\nRespuesta esperada: "+c.back+"\nRespuesta de "+WHO()+": "+rv.ans+"\n\nResponde solo con JSON: {\"score\":0,\"comment\":\"máx 220 caracteres: qué estuvo bien y qué faltó\"}, donde score es 0 = no la sabía, 1 = con dudas o incompleta, 2 = bien, 3 = perfecta.",{modelTier:"quick",cache:false});
    rv.fb={score:Math.max(0,Math.min(3,parseInt(r.score,10)||0)),comment:short(r.comment,260)};renderPractice(true)}
  catch(e){b.disabled=false;b.textContent="Que Claude evalúe mi respuesta";if(e&&["not_granted","sampling_disabled"].includes(e.code))sampleOff=true;toast(errCopy(e))}}
function rateCard(c,q){const r=nextInterval(c,q);const nc=Object.assign({},c,r,{due:addDays(today(),r.interval),seenAt:Date.now(),lastQ:q,reviews:(c.reviews||0)+1,lastDay:today()});delete nc.id;
  const i=S.cards.findIndex(x=>x.id===c.id);S.cards[i]=Object.assign({id:c.id},nc);save("cards/"+c.id,nc);
  toast((r.interval?"Vuelve el "+pretty(nc.due):"Vuelve más tarde hoy")+" · +2 XP");
  rv=Object.assign(rv,{id:"",step:"ask",ans:"",fb:null,key:""});renderRepaso()}
function renderDeck(){
  if(!S.cards.length){$("r-deck").innerHTML=`<div class="empty">Tu mazo está vacío.</div>`;return}
  const by={};S.cards.forEach(c=>{const t=c.topic||"Sin tema";(by[t]=by[t]||[]).push(c)});
  $("r-deck").innerHTML=Object.keys(by).sort().map(t=>`<h3 style="margin-top:6px">${esc(t)} · ${by[t].length}</h3>`+by[t].sort((a,b)=>(a.due||"").localeCompare(b.due||"")).map(c=>`<div class="deckrow" data-id="${esc(c.id)}"><div style="min-width:0"><div class="f">${T(c.front)}</div><div class="m">${(c.due||today())<=today()?"Toca hoy":"Vuelve el "+esc(pretty(c.due))}${(c.interval||0)>=21?" · consolidada":""}${c.reviews?" · "+c.reviews+" repasos":""}</div></div><div class="row" style="gap:4px"><button class="btn ghost" type="button" data-ed>Editar</button><button class="btn ghost" type="button" data-del>Borrar</button></div></div>`).join("")).join("");
}
$("r-deck").addEventListener("click",e=>{const t=e.target.closest("button");const row=e.target.closest(".deckrow");if(!t||!row)return;const c=S.cards.find(x=>x.id===row.dataset.id);if(!c)return;
  if(t.hasAttribute("data-ed")){rfEdit=c.id;$("rf-front").value=c.front;$("rf-back").value=c.back;$("rf-topic").value=c.topic||"";$("rf-title").textContent="Editar tarjeta";$("rf-save").textContent="Guardar cambios";$("rf-cancel").hidden=false;$("rf-card").scrollIntoView({behavior:reduced?"auto":"smooth",block:"start"});$("rf-front").focus()}
  if(t.hasAttribute("data-del")){if(t.dataset.confirm)del("cards/"+c.id);else{t.dataset.confirm="1";t.textContent="¿Borrar?";setTimeout(()=>{t.textContent="Borrar";delete t.dataset.confirm},3000)}}});
function resetRf(){rfEdit="";$("rf").reset();$("rf-title").textContent="Crear tarjeta";$("rf-save").textContent="Guardar tarjeta";$("rf-cancel").hidden=true}
$("rf-cancel").onclick=resetRf;
$("rf").addEventListener("submit",e=>{e.preventDefault();const f=$("rf-front").value.trim(),b=$("rf-back").value.trim(),tp=$("rf-topic").value.trim();if(!f||!b)return;
  if(rfEdit){const c=S.cards.find(x=>x.id===rfEdit);if(c){const nc=Object.assign({},c,{front:f,back:b,topic:tp});delete nc.id;save("cards/"+c.id,nc).then(()=>toast("Tarjeta actualizada"))}}
  else save("cards/c"+Date.now().toString(36),{front:f,back:b,topic:tp,due:today(),interval:0,ease:2.5,reps:0,reviews:0,source:"manual",created:nowISO()}).then(()=>toast("Tarjeta guardada: ya está en tu entrenamiento de hoy"));
  resetRf()});
$("rf-gen").onclick=()=>{const b=document.querySelector('#quick button[data-q^="Convierte"]');show("nexo");if(b)runMission(b.dataset.q,"",false)};

/* =================== FINANZAS =================== */
const FREQ={mensual:1,semanal:52/12,quincenal:2,anual:1/12};
let FD=null,fDirty=false;
function finCalc(f){f=f||{};const acc=f.accounts||[],ex=f.expenses||[],inc=f.incomes||[];
  const total=acc.reduce((a,x)=>a+(+x.amount||0),0);
  const monthly=ex.reduce((a,x)=>a+(+x.amount||0)*(FREQ[x.freq]||1),0);
  const incConf=inc.filter(x=>x.status!=="posible").reduce((a,x)=>a+(+x.amount||0)*(FREQ[x.freq]||1),0);
  const incPos=inc.filter(x=>x.status==="posible").reduce((a,x)=>a+(+x.amount||0)*(FREQ[x.freq]||1),0);
  const yieldM=acc.reduce((a,x)=>a+(+x.amount||0)*((+x.rate||0)/100)/12,0);
  const burn=Math.max(0,monthly-incConf);const runway=burn>0?total/burn:Infinity;
  return{total,monthly,incConf,incPos,yieldM,burn,runway}}
const raw=n=>"$"+Math.round(+n||0).toLocaleString("es-MX");
function finSummary(){const f=S.fin;if(!f)return"";const c=finCalc(f);
  return "Finanzas (MXN): ahorro total "+raw(c.total)+" ("+(f.accounts||[]).map(a=>a.name+" "+raw(a.amount)+(a.rate?" al "+a.rate+"%":"")).join(", ")+"). Gasto fijo mensual "+raw(c.monthly)+" ("+(f.expenses||[]).map(e=>e.name+" "+raw(e.amount)+" "+(e.freq||"mensual")).join(", ")+"). Ingreso confirmado "+raw(c.incConf)+"/mes; posible "+raw(c.incPos)+"/mes ("+(f.incomes||[]).map(i=>i.name+" "+raw(i.amount)+" "+(i.freq||"mensual")+" "+(i.status||"confirmado")).join(", ")+"). Colchón: "+(isFinite(c.runway)?c.runway.toFixed(1)+" meses":"sin consumo neto")+". Rendimiento estimado "+raw(c.yieldM)+"/mes."+(f.notes?" Notas: "+short(f.notes,300):"")}
function rowHTML(kind,x,i){
  const name=`<input type="text" data-k="${kind}" data-i="${i}" data-f="name" value="${esc(x.name||"")}" placeholder="Nombre" aria-label="Nombre">`;
  const amt=HIDE?`<span class="masked">$${MASK}</span>`:`<input type="number" data-k="${kind}" data-i="${i}" data-f="amount" value="${esc(x.amount??"")}" min="0" step="50" inputmode="decimal" aria-label="Monto">`;
  const del_=`<button class="btn ghost icon" type="button" data-del="${kind}" data-i="${i}" aria-label="Quitar">×</button>`;
  const freq=`<select data-k="${kind}" data-i="${i}" data-f="freq" aria-label="Frecuencia">${Object.keys(FREQ).map(k=>`<option ${((x.freq||"mensual")===k)?"selected":""}>${k}</option>`).join("")}</select>`;
  if(kind==="accounts")return `<div class="frow">${name}${amt}<input type="number" data-k="${kind}" data-i="${i}" data-f="rate" value="${esc(x.rate??"")}" min="0" step="0.1" placeholder="0" aria-label="Rendimiento anual"><span></span>${del_}</div>`;
  if(kind==="expenses")return `<div class="frow">${name}${amt}${freq}<span></span>${del_}</div>`;
  return `<div class="frow">${name}${amt}${freq}<select data-k="${kind}" data-i="${i}" data-f="status" aria-label="Estado"><option value="confirmado" ${x.status!=="posible"?"selected":""}>confirmado</option><option value="posible" ${x.status==="posible"?"selected":""}>posible</option></select>${del_}</div>`}
function paintTiles(c){$("f-total").textContent=mxn(c.total);$("f-exp").textContent=mxn(c.monthly);$("f-inc").textContent=mxn(c.incConf);$("f-yield").textContent=mxn(c.yieldM);$("f-inc-s").textContent="al mes"+(c.incPos?" · posible "+mxn(c.incPos):"")}
function renderFinanzas(){
  if(!fDirty)FD=JSON.parse(JSON.stringify(S.fin||{accounts:[],expenses:[],incomes:[]}));
  const c=finCalc(FD);paintTiles(c);$("f-total-s").textContent=(FD.accounts||[]).length+" cuentas";
  const rw=c.runway;const chip=$("f-runway-chip");
  if(isFinite(rw)){chip.textContent=rw.toFixed(1)+" meses";chip.className="chip "+(rw>=12?"ok":rw>=6?"warn":"bad");$("f-runway-bar").style.width=Math.min(100,rw/24*100)+"%";$("f-runway-txt").textContent="Con "+mxn(c.total)+" y un consumo neto de "+mxn(c.burn)+" al mes (gastos menos ingreso confirmado), aguantas "+rw.toFixed(1)+" meses. La barra llega a 24 meses; la línea roja marca 6."}
  else{chip.textContent="Sin consumo neto";chip.className="chip ok";$("f-runway-bar").style.width="100%";$("f-runway-txt").textContent="Tu ingreso confirmado cubre tus gastos fijos."}
  $("f-runway-min").style.left=(6/24*100)+"%";
  $("f-hint").textContent=HIDE?"Las cifras están ocultas. Pulsa Mostrar cifras para editar montos; nombres y frecuencias sí se editan.":"Edita y guarda. Finanzas y los demás agentes usan estos datos en cada misión. Montos en MXN.";
  const ae=document.activeElement;const inside=ae&&$("p-finanzas").contains(ae)&&/^(INPUT|SELECT)$/.test(ae.tagName)&&ae.dataset.k;
  if(!inside){$("f-acc").innerHTML=(FD.accounts||[]).map((x,i)=>rowHTML("accounts",x,i)).join("")||`<div class="empty">Sin cuentas.</div>`;
    $("f-exps").innerHTML=(FD.expenses||[]).map((x,i)=>rowHTML("expenses",x,i)).join("")||`<div class="empty">Sin gastos.</div>`;
    $("f-incs").innerHTML=(FD.incomes||[]).map((x,i)=>rowHTML("incomes",x,i)).join("")||`<div class="empty">Sin ingresos.</div>`}
  renderDecisions();
}
$("p-finanzas").addEventListener("input",e=>{const t=e.target;if(!t.dataset.k)return;const it=FD[t.dataset.k][+t.dataset.i];if(!it)return;
  it[t.dataset.f]=t.type==="number"?(t.value===""?"":+t.value):t.value;fDirty=true;$("f-state").textContent="Cambios sin guardar";paintTiles(finCalc(FD))});
$("p-finanzas").addEventListener("change",e=>{if(e.target.tagName==="SELECT"&&e.target.dataset.k){fDirty=true;$("f-state").textContent="Cambios sin guardar"}});
$("p-finanzas").addEventListener("click",e=>{const t=e.target.closest("button");if(!t)return;
  if(t.dataset.add){FD[t.dataset.add]=FD[t.dataset.add]||[];FD[t.dataset.add].push(t.dataset.add==="accounts"?{name:"",amount:"",rate:""}:t.dataset.add==="expenses"?{name:"",amount:"",freq:"mensual"}:{name:"",amount:"",freq:"mensual",status:"posible"});fDirty=true;$("f-state").textContent="Cambios sin guardar";if(document.activeElement)document.activeElement.blur();renderFinanzas()}
  if(t.dataset.del){FD[t.dataset.del].splice(+t.dataset.i,1);fDirty=true;$("f-state").textContent="Cambios sin guardar";if(document.activeElement)document.activeElement.blur();renderFinanzas()}});
$("f-save").onclick=()=>{const clean=a=>(a||[]).filter(x=>String(x.name||"").trim()||x.amount);
  const nf=Object.assign({},FD,{accounts:clean(FD.accounts),expenses:clean(FD.expenses),incomes:clean(FD.incomes),updated:nowISO()});
  $("f-state").textContent="Guardando…";save("finance/main",nf).then(()=>{fDirty=false;S.fin=nf;$("f-state").textContent="Guardado";renderFinanzas()})};
function renderDecisions(){
  $("dc-list").innerHTML=S.decisions.length?S.decisions.slice(0,10).map(d=>`<div class="prop"><div class="row between"><span class="muted" style="font-size:.78rem">${esc(pretty(ds(new Date(d.created||Date.now()))))}${d.amount?" · "+mxn(d.amount):""}</span>${d.verdict?`<span class="verdict ${VCLS[d.verdict]||""}">${esc(d.verdict)}</span>`:`<span class="chip">${esc(d.status||"pendiente")}</span>`}</div>
    <div class="t"><strong>${T(d.text)}</strong></div>${d.summary?`<div style="font-size:.88rem">${T(d.summary)}</div>`:""}${d.condition?`<div class="pnext" style="border-left-color:var(--amber)"><strong>Condición:</strong> ${T(d.condition)}</div>`:""}${d.next?`<div class="pnext" style="border-left-color:var(--c3)"><strong>Ahora:</strong> ${T(d.next)}</div>`:""}
    ${d.missionId?`<div><button class="btn ghost" type="button" data-mission="${esc(d.missionId)}">Ver cómo lo discutieron</button></div>`:""}</div>`).join(""):`<div class="empty">Aún no consultas decisiones.</div>`;
}
$("dc-list").addEventListener("click",e=>{const b=e.target.closest("button[data-mission]");if(!b)return;selMission=b.dataset.mission;show("nexo")});
$("dcf").addEventListener("submit",e=>{e.preventDefault();const t=$("dc-text").value.trim();if(!t)return;
  if(running){toast("El escuadrón está en otra misión. Espera a que termine.");return}
  if(!sample||sampleOff){toast(errCopy({code:"no_key"}));show("ajustes");return}
  const amt=parseFloat($("dc-amount").value)||0;const id="d"+Date.now().toString(36);
  const dec={text:t,amount:amt,status:"en evaluación",created:nowISO()};save("decisions/"+id,dec);
  $("dc-text").value="";$("dc-amount").value="";show("nexo");
  runMission("Decisión a evaluar: "+t+(amt?" (monto: "+raw(amt)+" MXN)":""),"",false,{lead:"finanzas",decision:Object.assign({id},dec)})});

/* =================== SISTEMA =================== */
function renderForce(){const r=S.reviews[0];$("fz-last").textContent=r?"Última: "+(r.week||""):"Sin revisiones todavía";$("fz-quick").disabled=running}
const REVIEW_Q="Revisión semanal: cada departamento revisa los datos de los últimos 7 días de su área, califica la semana, da hallazgos concretos con datos y 1 o 2 acciones; al final definan las 3 prioridades de la próxima semana.";
$("fz-quick").onclick=()=>{if(!sample||sampleOff){toast(errCopy({code:"no_key"}));show("ajustes");return}show("nexo");runMission(REVIEW_Q,"",true,{review:true})};
function renderReview(){
  const sel=$("w-review-pick");const rs=S.reviews;const prev=sel.value;
  sel.innerHTML=rs.map(r=>`<option value="${esc(r.id)}">${esc(r.week||r.id)}</option>`).join("");sel.hidden=!rs.length;if(prev&&rs.some(r=>r.id===prev))sel.value=prev;
  const r=rs.find(x=>x.id===sel.value)||rs[0];
  if(!r){$("w-review-body").innerHTML=`<p class="muted">Aún no hay revisiones. Fuerza una arriba o espera la del domingo.</p>`;return}
  let h="";String(r.summary||"").split(/\n\n+/).forEach(p=>{if(p.trim())h+=`<p>${T(p)}</p>`});
  if(Array.isArray(r.actions)&&r.actions.length)h+=`<h3>Acciones para la semana</h3><ol class="actions">${r.actions.map(a=>`<li>${T(a.text||a)}${a.dept?` <span class="chip">${esc(a.dept)}</span>`:""}</li>`).join("")}</ol>`;
  (r.departments||[]).forEach(d=>{h+=`<div class="dept"><div class="row between"><h3>${esc(d.name)}</h3>${d.grade?`<span class="chip ${/^[AB]/.test(d.grade)?"ok":/^C/.test(d.grade)?"warn":"bad"}">${esc(d.grade)}</span>`:""}</div>${d.findings&&d.findings.length?`<ul>${d.findings.map(f=>`<li>${T(f)}</li>`).join("")}</ul>`:""}</div>`});
  if(Array.isArray(r.systemChanges)&&r.systemChanges.length)h+=`<div class="dept"><h3>Cambios aplicados al sistema</h3><ul>${r.systemChanges.map(f=>`<li>${T(f)}</li>`).join("")}</ul></div>`;
  $("w-review-body").innerHTML=h;
}
$("w-review-pick").onchange=renderReview;
function renderMejoras(){
  const gt=$("goal-text");if(document.activeElement!==gt&&!gt.dataset.dirty)gt.value=cfg().goal||"";
  $("s-log").innerHTML=S.changelog.length?S.changelog.slice(0,15).map(l=>`<div class="row" style="align-items:baseline;gap:10px;flex-wrap:nowrap"><span class="muted" style="font-size:.8rem;flex:0 0 auto;font-variant-numeric:tabular-nums">${esc(l.date||"")}</span><span style="min-width:0">${T(l.text)}</span></div>`).join(""):`<div class="empty">Sin cambios registrados.</div>`;
  $("q-list").innerHTML=S.requests.slice(0,15).map(r=>`<div class="pcard"><div class="row between"><span class="muted" style="font-size:.8rem">${esc((r.created||"").slice(0,10))}</span><span class="chip ${r.status==="atendido"?"ok":r.status==="en curso"?"warn":""}">${esc(r.status||"nuevo")}</span></div><div style="overflow-wrap:anywhere">${T(r.text)}</div>${r.response?`<div class="muted" style="font-size:.88rem;border-top:1px dashed var(--line);padding-top:6px">Respuesta: ${T(r.response)}</div>`:""}</div>`).join("");
}
$("goal-text").addEventListener("input",e=>e.target.dataset.dirty="1");
$("goal-save").onclick=()=>{if(!S.config){toast("La configuración aún no carga.");return}const g=$("goal-text").value.trim();if(!g)return;delete $("goal-text").dataset.dirty;$("goal-state").textContent="Guardando…";
  save("config/main",Object.assign({},S.config,{goal:g,updated:nowISO()})).then(()=>{$("goal-state").textContent="Guardada";save("changelog/l"+Date.now().toString(36),{date:today(),text:"Meta actualizada: "+short(g,140)})})};
$("qf").addEventListener("submit",e=>{e.preventDefault();const t=$("qf-text").value.trim();if(!t)return;save("requests/q"+Date.now().toString(36),{text:t,status:"nuevo",created:nowISO()}).then(()=>toast("Enviado: Auditoría lo atiende en la próxima revisión"));$("qf-text").value=""});
function renderEscuadron(){$("s-depts").innerHTML=depts().length?depts().map(d=>agentCard(d,false)).join(""):`<div class="empty">Sin departamentos.</div>`}

/* =================== AJUSTES (versión independiente) =================== */
const RT=window.KASANOV_RUNTIME;
function renderAjustes(){
  const st=RT.getSettings();const k=$("aj-key");if(document.activeElement!==k&&!k.dataset.dirty)k.value=st.apiKey;
  ["quick","default","complex"].forEach(t=>{const el=$("aj-m-"+t);if(document.activeElement!==el&&!el.dataset.dirty)el.value=st.models[t]});
  const c=cfg();const o=$("aj-owner"),x=$("aj-context");
  if(document.activeElement!==o&&!o.dataset.dirty)o.value=c.owner||"";
  if(document.activeElement!==x&&!x.dataset.dirty)x.value=c.context||"";
  const ks=$("aj-keystate");ks.textContent=st.apiKey?"Agentes activos":"Agentes apagados";ks.className="chip "+(st.apiKey?"ok":"warn");
  if(!RT.storageOK())$("aj-dstate").textContent="Este navegador bloquea el almacenamiento local: tus datos se perderán al cerrar la pestaña.";
}
["aj-key","aj-m-quick","aj-m-default","aj-m-complex","aj-owner","aj-context"].forEach(id=>$(id).addEventListener("input",e=>e.target.dataset.dirty="1"));
const ajModels=()=>({quick:$("aj-m-quick").value.trim()||RT.DEFAULT_MODELS.quick,default:$("aj-m-default").value.trim()||RT.DEFAULT_MODELS.default,complex:$("aj-m-complex").value.trim()||RT.DEFAULT_MODELS.complex});
$("aj-save").onclick=()=>{try{RT.setSettings({apiKey:$("aj-key").value,models:ajModels()});$("aj-state").textContent="Guardado. Recargando…";setTimeout(()=>location.reload(),400)}catch(e){$("aj-state").textContent=e.message}};
$("aj-test").onclick=async()=>{const b=$("aj-test");const key=$("aj-key").value.trim();if(!key){$("aj-state").textContent="Pega tu API key primero.";return}
  b.disabled=true;$("aj-state").textContent="Probando…";
  try{await RT.test(key,ajModels().quick);$("aj-state").textContent="Conexión correcta. Guarda para activar a los agentes."}
  catch(e){$("aj-state").textContent=errCopy(e)}finally{b.disabled=false}};
$("aj-profile-save").onclick=()=>{if(!S.config)return;const o=$("aj-owner").value.trim(),x=$("aj-context").value.trim();delete $("aj-owner").dataset.dirty;delete $("aj-context").dataset.dirty;$("aj-pstate").textContent="Guardando…";
  save("config/main",Object.assign({},S.config,{owner:o,context:x,updated:nowISO()})).then(()=>{$("aj-pstate").textContent="Guardado"})};
$("aj-export").onclick=()=>{const blob=new Blob([RT.exportJSON()],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="sistema-kasanov-respaldo-"+today()+".json";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800);$("aj-dstate").textContent="Respaldo descargado."};
$("aj-import-btn").onclick=()=>$("aj-import").click();
$("aj-import").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{RT.importJSON(String(r.result));$("aj-dstate").textContent="Respaldo importado. Recargando…";setTimeout(()=>location.reload(),400)}catch(err){$("aj-dstate").textContent=err.message||"No se pudo leer el archivo."}};r.readAsText(f)});
$("aj-reset").onclick=e=>{const b=e.currentTarget;if(!b.dataset.confirm){b.dataset.confirm="1";b.textContent="¿Borrar todo de verdad?";$("aj-dstate").textContent="Se borran hábitos, proyectos, finanzas y misiones de este navegador. Tu API key se conserva.";setTimeout(()=>{if(b.dataset.confirm){b.textContent="Borrar todo";delete b.dataset.confirm}},5000);return}
  RT.reset();location.reload()};
$("setup-go").onclick=()=>show("ajustes");

/* =================== render + arranque =================== */
function renderAll(){
  $("weekpill").textContent=isoWeek(today())+" · semana "+(weekIndex(today())+1)+" del sistema";
  ensureLayout();
  const v=VIEW;
  if(v==="nexo")renderNexo();if(v==="hoy")renderHoy();if(v==="semana")renderSemana();if(v==="habitos")renderHabitos();
  if(v==="proyectos")renderProyectos();if(v==="habilidades")renderHabilidades();if(v==="repaso")renderRepaso();if(v==="finanzas")renderFinanzas();
  if(groupOf(v)==="sistema")renderForce();if(v==="revisiones")renderReview();if(v==="mejoras")renderMejoras();if(v==="escuadron")renderEscuadron();if(v==="ajustes")renderAjustes();
}
paintHide();
show(start);
requestAnimationFrame(frame);
const list=snap=>snap.docs.map(d=>Object.assign({id:d.id},d.data()));
function banner(t){const b=$("banner");b.textContent=t;b.hidden=!t}
function onErr(e){if(e&&e.code==="revoked")banner("Perdiste acceso a los datos en esta vista. Recarga la página.")}
let rT;function soon(){clearTimeout(rT);rT=setTimeout(renderAll,60)}
(async()=>{
  try{sample=window.claude&&await window.claude.use("sample")}catch(e){sample=null}
  if(!sample){sampleOff=true;$("c-msg").textContent=errCopy({code:"no_key"});$("setup").hidden=false}
  setBusy(false);soon();
})();
(async()=>{
  try{db=window.claude&&await window.claude.use("db")}catch(e){db=null}
  if(!db){banner("No se pudo abrir la base de datos local de este navegador.");return}
  db.doc("config/main").onSnapshot(s=>{S.config=s.exists?s.data():null;banner(s.exists?"":"Preparando tu configuración…");soon()},onErr);
  db.doc("finance/main").onSnapshot(s=>{S.fin=s.exists?s.data():null;soon()},onErr);
  db.doc("system/forced").onSnapshot(s=>{S.forced=s.exists?s.data():null;soon()},onErr);
  db.collection("days").where("date",">=",addDays(today(),-180)).onSnapshot(s=>{const o={};s.docs.forEach(d=>{o[d.id]=d.data()});if(chains["days/"+cur]&&S.days[cur])o[cur]=Object.assign({},o[cur],S.days[cur]);S.days=o;soon()},onErr);
  db.collection("projects").orderBy("updated","desc").onSnapshot(s=>{S.projects=list(s);soon()},onErr);
  db.collection("skills").onSnapshot(s=>{S.skills=list(s);soon()},onErr);
  db.collection("cards").onSnapshot(s=>{S.cards=list(s);soon()},onErr);
  db.collection("reviews").orderBy("week","desc").limit(20).onSnapshot(s=>{S.reviews=list(s);soon()},onErr);
  db.collection("requests").orderBy("created","desc").limit(30).onSnapshot(s=>{S.requests=list(s);soon()},onErr);
  db.collection("changelog").orderBy("date","desc").limit(30).onSnapshot(s=>{S.changelog=list(s);soon()},onErr);
  db.collection("decisions").orderBy("created","desc").limit(30).onSnapshot(s=>{S.decisions=list(s);soon()},onErr);
  db.collection("missions").orderBy("created","desc").limit(20).onSnapshot(s=>{S.missions=list(s);if(!running&&S.live&&S.missions.some(m=>m.id===S.live.id))S.live=null;soon()},onErr);
  db.collection("quests").onSnapshot(s=>{const o={};s.docs.forEach(d=>{o[d.id]=d.data()});S.quests=o;soon()},onErr);
})();
document.addEventListener("visibilitychange",()=>{if(document.hidden)flushText();else renderAll()});
})();
