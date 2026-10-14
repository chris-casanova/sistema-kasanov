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
/* figuras mitológicas: solo la cara visible de cada departamento (los id internos no cambian) */
const MYTH={nexo:{god:"Odín",color:"#FFE2A8"},aprendizaje:{god:"Atenea",color:"#5AD1E8"},carrera:{god:"Jano",color:"#C69CFF"},habitos:{god:"Heracles",color:"#FF6F61"},finanzas:{god:"Moneta",color:"#5BE39A"},sistema:{god:"Hefesto",color:"#FFA23D"}};
const gn=d=>(d&&(d.god||d.name))||"";

const S={config:null,days:{},projects:[],cards:[],reviews:[],requests:[],changelog:[],missions:[],quests:{},inbox:[],skills:[],fin:null,decisions:[],forced:null,live:null,chats:{},dossiers:{},board:null,profile:null,signals:null};
let db=null,sample=null,sampleOff=false,mcp=null;let cur=today();
let AVCMD=null; /* avatar elegido, visible en el comandante del mapa (solo se guarda en este navegador) */

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
const GROUPS={nexo:["nexo"],personal:["hoy","semana","entreno"],trabajo:["proyectos","habilidades","repaso"],finanzas:["finanzas"],sistema:["revisiones","mejoras","escuadron","diagnostico","ajustes"]};
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
  if(!db){toast("Sin conexión con la base de datos: los cambios no se guardan.");return Promise.resolve(false)}
  chains[path]=(chains[path]||Promise.resolve()).then(()=>db.doc(path).set(data)).then(()=>{try{sparkSaved(path)}catch(e){}return true}).catch(e=>{
    toast(e&&e.code==="quota_exceeded"?"Base de datos llena: borra tarjetas o proyectos viejos.":"No se pudo guardar ("+(e&&e.code||"error")+"). Revisa tu conexión.");return false});
  return chains[path];
}
/* documentos que este navegador escribe seguido (chats, expedientes, tablero, perfil): mientras hay una escritura
   en vuelo se conserva la copia local para que un eco viejo de la base no pise el cambio nuevo */
const PEND={};
function putDoc(path,data){PEND[path]=(PEND[path]||0)+1;const i=path.indexOf("/"),c=path.slice(0,i),id=path.slice(i+1),cp=JSON.parse(JSON.stringify(data));
  if(c==="chats"||c==="dossiers")S[c][id]=cp;else if(path==="system/board")S.board=cp;else if(path==="profile/main")S.profile=cp;else if(path==="signals/github")S.signals=cp;
  return save(path,data).finally(()=>{PEND[path]--})}
function snapMap(c,s){const o={};s.docs.forEach(d=>{o[d.id]=d.data()});for(const id in S[c])if(PEND[c+"/"+id]>0)o[id]=S[c][id];return o}
function del(path){if(!db)return;chains[path]=(chains[path]||Promise.resolve()).then(()=>db.doc(path).delete()).catch(()=>toast("No se pudo borrar."))}

/* ---------- puntuación ---------- */
function cfg(){return S.config||{habits:[],bonus:[],bonusPerPoint:3,weekMins:[3],studyTargetMin:[120],start:today(),departments:[]}}
function depts(){return (cfg().departments||[]).map((d,i)=>{const m=MYTH[d.id]||{};return Object.assign({color:m.color||PALETTE[i%PALETTE.length],idx:i},d,{god:d.god||m.god||d.name})})}
function weekIndex(s){const w=Math.floor((parse(monday(s))-parse(monday(cfg().start||today())))/(7*864e5));return Math.max(0,w)}
function pick(arr,i){return arr&&arr.length?arr[Math.min(i,arr.length-1)]:0}
function minFor(s){return pick(cfg().weekMins,weekIndex(s))||3}
function studyTarget(s){return pick(cfg().studyTargetMin,weekIndex(s))||0}
function dayData(s){return S.days[s]||{date:s,habits:{},bonus:{},studyMin:0}}
/* Bitácora del día: cinco campos cortos. Los días anteriores (texto libre en learned/blocked/win/notes) se leen como "Hice"
   sin tocar ni borrar nada; al guardar el día se escribe hice y se conserva el texto viejo tal cual. */
const LF=[["hice","Hice"],["aprendi","Aprendí"],["trabe","Me trabé"],["decidi","Decidí"],["siguiente","Siguiente"]];
function legacyHice(d){const p=[],t=v=>String(v||"").trim();if(t(d.learned))p.push(t(d.learned));if(t(d.blocked))p.push("Me trabé: "+t(d.blocked));if(t(d.win))p.push("Victoria: "+t(d.win));if(t(d.notes))p.push("Notas: "+t(d.notes));return p.join("\n")}
function logOf(d){d=d||{};const v2=(d.logV||0)>=2||LF.some(([f])=>d[f]!==undefined);const o={tags:Object.assign({},d.tags||{}),closed:!!d.closed};
  LF.forEach(([f])=>{o[f]=String(d[f]||"")});if(!v2)o.hice=legacyHice(d);return o}
function tagLabel(v){v=String(v||"");if(!v)return"";const id=v.slice(2);if(v[0]==="p"){const p=S.projects.find(x=>x.id===id);return p?p.title:""}return id}
function tagOptions(){const ps=S.projects.slice().sort((a,b)=>(a.title||"").localeCompare(b.title||"")).map(p=>["p:"+p.id,p.title||"Proyecto"]);
  const seen=new Set(),ts=[];S.skills.map(x=>x.name).concat(S.cards.map(c=>c.topic)).forEach(n=>{n=String(n||"").trim();const k=n.toLowerCase();if(n&&!seen.has(k)){seen.add(k);ts.push(["t:"+n,n])}});
  ts.sort((a,b)=>a[1].localeCompare(b[1]));return{projects:ps,topics:ts}}
const hasLogText=d=>{const l=logOf(d);return LF.some(([f])=>l[f].trim())};
function score(s,dd){
  const c=cfg(),d=dd||dayData(s);
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
const LOOK={lib:{skin:"#EDC09A",hair:"#5A3426",pY:27},map:{skin:"#E3B48C",hair:"#D8D8EE",pY:26},gym:{skin:"#C98B64",hair:"#3B2A22",pY:27},ctrl:{skin:"#D9A27C",hair:"#2B1D18",pY:26},bank:{skin:"#DCA67A",hair:"#1E1A2C",pY:27},studio:{skin:"#E3B48C",hair:"#2C2C3A",pY:26}};
/* carácter de cada figura: se lee en las tarjetas y le da voz a los agentes en sus misiones */
const TRAITS={
  nexo:"Odín, el Padre de Todo: anciano de un solo ojo (lo dio por saber). Habla con calma y peso, en frases cortas, como quien ya vio el final y aun así elige el camino. Sus cuervos Hugin (pensamiento) y Munin (memoria) le traen todo; casi nunca se apresura.",
  aprendizaje:"Atenea, diosa de la estrategia y la sabiduría. Exigente: responde con preguntas socráticas («¿por qué?», «¿cómo lo probarías?») y no acepta respuestas a medias. Su lechuza lo ve todo; elogia solo lo que se sostiene con razones.",
  carrera:"Jano, el dios de las dos caras: una mira al pasado y otra al futuro, guardián de puertas. Siempre presenta dos caminos y lo que cuesta cada uno (tiempo, dinero, riesgo), sin empujar a ninguno; la decisión es de quien camina.",
  habitos:"Heracles, el héroe de los doce trabajos. Motivador y ruidoso: celebra cada esfuerzo como una hazaña, hasta el mínimo cumplido; les pone nombre épico a los hábitos y nunca regaña: si hoy falló, mañana es otro trabajo.",
  sistema:"Hefesto, el herrero de los dioses. Artesano gruñón y perfeccionista: refunfuña por cada fricción y cada tornillo flojo, mide dos veces y no entrega nada a medias. Su «está bien hecho» es raro y vale oro.",
  finanzas:"Moneta, la que advierte y acuña. Fría y precisa: habla en cifras (meses de colchón, porcentajes, montos), no aprueba gastos innecesarios y reconoce una buena idea con un «aprobado» seco, sin adornos."};
const MEET=["PW","PE","PNW","PNE","PSW","PSE","PN"];
const SC={rooms:{},agents:{},pulses:[],bubbles:[],t:0,think:0,trail:{},token:0,
  cmd:{id:"cmd",x:148,y:111,isCmd:true,color:GOLD,look:{skin:"#E0AE85",hair:"#2A1A12"},kind:"cmd",dir:1,ph:0,blink:3,blinkT:0,state:"idle",path:[],seed:.3,emote:null,name:"Tú"}};
const NEXO_T={x:160,y:92,isNexo:true,color:GOLD,name:"Odín"};
const DOFF={ctrl:-10};
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
    const doorY=s.top?s.y+s.h:s.y;const hy=s.top?(s.h>50?s.y+32:s.y+29):(s.y+s.h-12);const cy=s.top?hy+12:hy-12;
    addN("D:"+id,cxr,doorY,"door",id);addN("C:"+id,cxr,cy,"carpet",id);addN("H:"+id,cxr,hy,"carpet",id);addN("G:"+id,cxr+15,cy,"carpet",id);
    link("D:"+id,"C:"+id,"carpet");link("C:"+id,"H:"+id,"carpet");link("C:"+id,"G:"+id,"carpet");
    if(s.side==="L"){addN("JL",58,M,"hall");link("D:"+id,"JL","hall")}
    if(s.side==="R"){addN("JR",262,M,"hall");link("D:"+id,"JR","hall")}
    if(s.side==="N")link("D:"+id,"PN","hall");
    if(s.side==="S")link("D:"+id,"PS","hall");
    const r={x:s.x,y:s.y,w:s.w,h:s.h,top:!!s.top,cx:cxr,color:d.color,carpet:(THEME[kind]||THEME.studio).carpet,kind,dept:d,entry:{L:"PW",R:"PE",N:"PN",S:"PS"}[s.side],desk:{x:cxr+(DOFF[kind]||-20),y:hy-6}};
    SC.rooms[id]=r;keep[id]=1;
    let a=SC.agents[id];
    if(!a)a=SC.agents[id]={id,x:cxr,y:hy,node:"H:"+id,path:[],waiters:[],state:"idle",dir:1,ph:Math.random()*6,blink:1+Math.random()*4,blinkT:0,emote:null,speed:46,seed:Math.random()*5};
    if(!a.path.length){a.node="H:"+id;a.x=cxr;a.y=hy}
    Object.assign(a,{name:gn(d),dname:d.name,color:d.color,kind,look:LOOK[kind]||LOOK.studio,room:r,home:"H:"+id});
    const lb=document.createElement("div");lb.className="roomlabel";lb.style.left=(s.x+3)/W*100+"%";lb.style.top=(s.y+1)/H*100+"%";lb.style.color=d.color;lb.innerHTML="<b>"+esc(gn(d))+"</b>"+(gn(d)!==d.name?"<i>"+esc(d.name)+"</i>":"");ov.appendChild(lb);
  });
  if(NODES.JL)link("JL","PW","hall");if(NODES.JR)link("JR","PE","hall");
  Object.keys(SC.rooms).forEach(k=>{if(!keep[k])delete SC.rooms[k]});
  Object.keys(SC.agents).forEach(k=>{if(!keep[k])delete SC.agents[k]});
  buildBG();
}
function blinkStep(a,dt){if(a.blinkT>0)a.blinkT-=dt;else{a.blink-=dt;if(a.blink<=0){a.blinkT=0.13;a.blink=2.5+Math.random()*4}}}
function trailMark(a,b,c){if(!a||!b||a===b)return;const k=a<b?a+"|"+b:b+"|"+a;SC.trail[k]={c,t:SC.t}}
function stepAgent(a,dt){
  blinkStep(a,dt);
  if(!a.path.length){a.ph+=dt*2;if(a.kind==="ctrl"&&a.node===a.home&&!a.busy)a.dir=-1;return}
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
function posAt(p,d){let acc=0;for(let i=1;i<p.pts.length;i++){const a=p.pts[i-1],b=p.pts[i];const s=Math.hypot(b.x-a.x,b.y-a.y);if(acc+s>=d){const k=s?(d-acc)/s:0;return{x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k,i}}acc+=s}const L=p.pts[p.pts.length-1];return{x:L.x,y:L.y,i:p.pts.length-1}}
/* ---------- burbujas: capa propia sobre toda la pantalla, en cola por agente y sin encimarse ---------- */
const BL=document.createElement("div");BL.id="bubble-layer";document.body.appendChild(BL);
function bubble(target,text,ms,color,opts){
  if(!target)return;opts=opts||{};
  const mine=SC.bubbles.filter(b=>b.target===target);
  if(opts.drop&&mine.length)return;
  if(opts.now){mine.forEach(b=>{if(b.el)b.el.remove()});SC.bubbles=SC.bubbles.filter(b=>b.target!==target)}
  else{const q=mine.filter(b=>!b.el);if(q.length>=3){SC.bubbles.splice(SC.bubbles.indexOf(q[0]),1)}}
  SC.bubbles.push({target,text,ms,color:color||target.color||GOLD,el:null,until:0});
  tickBubbles(performance.now());
}
function activateBubble(b,now){
  const el=document.createElement("div");el.className="bubble";el.style.color=b.color;const tg=b.target;el.dataset.who=tg.isNexo?"Odín":tg.isCmd?"Tú":(tg.name||"");
  const sp=document.createElement("span");sp.textContent=b.text;el.appendChild(sp);BL.appendChild(el);
  b.el=el;b.until=now+b.ms;b.target.talkUntil=now+Math.min(b.ms,2600);
}
function tickBubbles(now){
  SC.bubbles=SC.bubbles.filter(b=>{if(b.el&&now>b.until){b.el.remove();return false}return true});
  const seen=new Set();SC.bubbles.forEach(b=>{if(seen.has(b.target))return;seen.add(b.target);if(!b.el)activateBubble(b,now)});
  layoutBubbles();
}
function layoutBubbles(){
  const act=SC.bubbles.filter(b=>b.el);if(!act.length)return;
  const rc=cv.getBoundingClientRect();const shown=rc.width>0&&cv.offsetParent!==null;
  const vw=document.documentElement.clientWidth,vh=window.innerHeight,M=8,G2=6;
  const items=[];
  act.forEach(b=>{const t=b.target;const ax=rc.left+t.x/W*rc.width,ay=rc.top+(t.y-(t.isNexo?28:t.isCmd?30:36))/H*rc.height;
    const ok=shown&&ay>-30&&ay<vh+30;b.el.style.visibility=ok?"visible":"hidden";if(!ok)return;
    const w=b.el.offsetWidth,h=b.el.offsetHeight;items.push({b,ax,ay,w,h,left:Math.min(vw-M-w,Math.max(M,ax-w/2)),top:ay-h-G2})});
  items.sort((p,q)=>q.ay-p.ay);
  const placed=[];const hits=(it,p)=>it.left<p.left+p.w+4&&p.left<it.left+it.w+4&&it.top<p.top+p.h+4&&p.top<it.top+it.h+4;
  items.forEach(it=>{
    const top0=it.top;it.top=Math.max(M,Math.min(it.top,vh-M-it.h));let hit,n=0;
    while((hit=placed.find(p=>hits(it,p)))&&n++<14)it.top=hit.top-it.h-G2;
    if(it.top<M){
      const L0=it.left,T0=Math.max(M,Math.min(top0,vh-M-it.h));let done=false;
      for(const p of placed){for(const L of [p.left+p.w+4,p.left-it.w-4]){if(L<M||L+it.w>vw-M)continue;it.left=L;it.top=T0;if(!placed.some(q=>hits(it,q))){done=true;break}}if(done)break}
      if(!done){it.left=L0;it.top=M;n=0;while((hit=placed.find(p=>hits(it,p)))&&n++<14)it.top=hit.top+hit.h+G2;it.top=Math.min(it.top,Math.max(M,vh-M-it.h))}}
    placed.push(it);const st=it.b.el.style;st.left=Math.round(it.left)+"px";st.top=Math.round(it.top)+"px";
    st.setProperty("--tx",Math.round(Math.min(it.w-12,Math.max(12,it.ax-it.left)))+"px");
    it.b.el.classList.toggle("moved",Math.abs(it.top-top0)>3);
  });
}

const plu=(n,s,p)=>n+" "+(n===1?s:p);
function linesFor(id){
  const s=score(today());const due=dueCards().length;const fc=finCalc(S.fin);const st=streak();
  const pr=S.skills.filter(x=>x.level==="probada").length,doing=S.projects.filter(p=>p.status==="doing").length,rq=S.requests.filter(r=>r.status!=="atendido").length;
  const L={
    nexo:["Lo vi venir hace mucho. Aun así, camina.","Hugin piensa; Munin recuerda. Yo solo escucho.","Pagué un ojo por saber. Escucha con los dos tuyos.","El final está escrito. El trayecto, no.","Todo árbol cae; el bosque sigue.",st?"Racha de "+plu(st,"día","días")+". Los cuervos lo anotaron.":"Un día cumplido, y el resto sigue."],
    aprendizaje:[due?"Quedan "+plu(due,"tarjeta","tarjetas")+" por repasar. ¿Cuál temes?":"Repaso al día. ¿Sabrías enseñárselo a otro?","¿Por qué funciona eso? Respóndeme sin mirar.","¿Qué construiste hoy, y dónde te falló?","Una respuesta a medias no es respuesta.","Si no puedes explicarlo simple, aún no lo dominas.","¿Cómo lo probarías? Muéstrame, no me cuentes.",pr?plu(pr,"habilidad probada","habilidades probadas")+". ¿Cuál sigue?":"Aún no hay habilidades probadas. ¿Qué evidencia puedes traer?"],
    carrera:["Dos puertas: una cuesta tiempo, la otra certeza. ¿Cuál pagas?","Por un lado, la evidencia; por el otro, la moda. Yo miro las dos.","Mira atrás: ¿qué disfrutaste construir? Mira adelante: ¿qué repetirías?","Camino A: seguro y lento. Camino B: rápido y caro. Elige con los ojos abiertos.","Toda puerta que abres cierra otra.",doing?"Un camino ya está en marcha: ¿lo terminas o abres otra puerta?":"Ningún proyecto en marcha. ¿Cuál puerta abres primero?"],
    habitos:[s.met?"¡Día cumplido! ¡Eso es una hazaña!":"¡Hoy llevas "+s.pts+" de "+s.min+" puntos! ¡Un trabajo más!","¡Otro día, otra hazaña!",st?"¡Racha de "+plu(st,"día","días")+"! ¡Hasta los dioses lo vieron!":"¡Hoy empieza la racha, héroe!","¡El mínimo también es una hazaña!","¡Doce trabajos tuve yo; tú vas por el siguiente!","¿Ya te moviste hoy? ¡Esos músculos no se mueven solos!"],
    sistema:["Hmm. Esto no está bien ajustado.","Cada domingo reviso el sistema. Con el martillo.","Si algo estorba, dímelo en el engranaje. Lo forjo de nuevo.","Un tornillo flojo y todo se cae. Yo lo reviso.","Menos fricción, más acero.","Bien hecho vale más que rápido. Refunfuño, pero tengo razón.",rq?plu(rq,"solicitud","solicitudes")+" en el yunque. Ya voy, ya voy.":"Yunque limpio. Por ahora."],
    finanzas:[S.fin&&isFinite(fc.runway)?"Colchón: "+fc.runway.toFixed(1)+" meses. Estable.":"Sin cifras no hay decisión. Cárgalas en Finanzas.",S.fin&&fc.yieldM>0?"Rendimiento estimado: "+mxn(fc.yieldM)+" al mes.":"El dinero quieto también pierde.","¿Ese gasto suma o resta? Dame el número.","Cero por ciento no es neutral: es pérdida lenta.","Primero no perder; después multiplicar.","Aprobado. Seco. No te acostumbres."]};
  return L[id]||[short((depts().find(d=>d.id===id)||{}).mission||"A tus órdenes.",70)];
}
const HELLO={lib:["¿Qué has aprendido hoy, {n}?","Dime, {n}: ¿cómo lo sabes?"],map:["Dos caminos, {n}. ¿Cuál tomas?","Pasa, {n}: toda puerta tiene precio."],gym:["¡{n}! ¡Otra hazaña hoy!","¡Arriba, {n}! ¡A moverse!"],ctrl:["Hmpf. {n}, ¿qué se rompió ahora?","A ver, {n}: ¿algo flojo?"],bank:["¿Cifras, {n}? Las tengo.","Dime el monto, {n}."],studio:["¿Cómo vamos, {n}?","Oye {n}, ¿qué hay de nuevo?"]};
const ASK={lib:"¿Qué quieres entender hoy?",map:"¿Qué camino quieres mirar?",gym:"¡¿En qué te ayudo, héroe?!",ctrl:"¿Qué hay que arreglar?",bank:"¿Qué número necesitas?",studio:"¿Qué necesitas?"};
const RECV={lib:"Pensemos: ",map:"Dos caminos: ",gym:"¡A la hazaña! ",bank:"Cifras: ",ctrl:"Al yunque: ",studio:"Recibido: "};
const pickOne=a=>a[Math.random()*a.length|0];
function isNight(){const h=new Date().getHours();return h>=23||h<6}
let idleNext=performance.now()+4000;
async function idleTick(now){
  if(running||document.hidden||now<idleNext)return;
  idleNext=now+6500+Math.random()*8000;
  const home=Object.values(SC.agents).filter(a=>atHome(a)&&!a.busy);if(!home.length)return;
  if(isNight()){const a=pickOne(home);a.emote={k:"z",until:now+6000};return}
  const r0=Math.random();
  if(r0<0.14&&!SC.pulses.length){bubble(NEXO_T,mm(pickOne(linesFor("nexo"))),4800,GOLD,{drop:true});return}
  if(r0<0.26&&!SC.pulses.length&&!reduced){scout();return}
  const a=pickOne(home);
  const r=Math.random();const tok=SC.token;
  if(reduced||r<0.45){bubble(a,mm(pickOne(linesFor(a.id))),4200,undefined,{drop:true});a.emote={k:a.kind==="bank"?"$":"♪",until:now+2500};return}
  if(r<0.72){a.busy=1;try{const spot=pickOne(MEET);if(await go(a,spot,34)&&tok===SC.token){a.emote={k:Math.random()<.5?"?":"♪",until:performance.now()+2200};await sleep(2400);if(tok===SC.token)await go(a,a.home,34)}}finally{a.busy=0}return}
  const others=home.filter(b=>b!==a);if(!others.length)return;const b=pickOne(others);
  a.busy=1;b.busy=1;
  try{
    if(!(await go(a,"G:"+b.id,40))||tok!==SC.token)return;
    a.dir=-1;b.dir=1;bubble(a,pickOne(HELLO[a.kind]||HELLO.studio).replace("{n}",b.name),2600,undefined,{drop:true});await sleep(2800);if(tok!==SC.token)return;
    bubble(b,mm(pickOne(linesFor(b.id))),3000,undefined,{drop:true});await sleep(3200);if(tok!==SC.token)return;
    a.emote={k:"♥",until:performance.now()+1500};await go(a,a.home,40);
  }finally{a.busy=0;b.busy=0}
}
const PORT={};
function portrait(id){
  let key=id,a=null;
  if(id==="cmd")a=SC.cmd;else if(id!=="nexo"){a=SC.agents[id];if(!a)return"";key=id+a.kind+a.color}
  if(PORT[key])return PORT[key];
  const c=document.createElement("canvas");c.width=16;c.height=16;const g=c.getContext("2d");g.imageSmoothingEnabled=false;const prev=G;G=g;
  try{P(0,0,16,16,"#1A1F52");P(0,0,16,1,"#2C357C");
    if(id==="nexo")FIG.nexo({look:{},color:GOLD},8,27,0,{still:true,perched:0,think:0,run:0,talk:0});
    else drawAgent(Object.assign({},a,{x:8,y:(a.look&&a.look.pY)||(id==="cmd"?25:27),dir:1,blinkT:0,state:"idle",path:[],talkUntil:0,emote:null}),0,{still:true});
  }finally{G=prev}
  return PORT[key]=c.toDataURL();
}
let last=performance.now();
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;SC.t+=dt;const t=SC.t;
  Object.values(SC.agents).forEach(a=>stepAgent(a,dt));stepPulses(dt);stepMotes(dt);stepFx(dt);
  G=mainG;if(BG)G.drawImage(BG,0,0);else P(0,0,W,H,"#070A22");
  drawStars(t);
  Object.values(SC.rooms).forEach(r=>drawRoom(r,t));
  drawTrails();drawParty(t);drawMotes(t);drawNexo(t);
  Object.values(SC.agents).sort((p,q)=>p.y-q.y).forEach(a=>drawAgent(a,t));
  drawPulses(t);drawFx();ambientFx(dt,t);
  tickBubbles(now);
  idleTick(now);
  requestAnimationFrame(frame);
}
cv.addEventListener("click",e=>{const rc=cv.getBoundingClientRect();const x=(e.clientX-rc.left)/rc.width*W,y=(e.clientY-rc.top)/rc.height*H;
  let hit=null;Object.values(SC.agents).forEach(a=>{if(Math.abs(a.x-x)<8&&y>a.y-29&&y<a.y+3)hit=a.id});
  if(!hit)Object.values(SC.rooms).forEach(rm=>{if(x>=rm.x&&x<=rm.x+rm.w&&y>=rm.y&&y<=rm.y+rm.h)hit=rm.dept.id});
  if(hit)selectAgent(hit);
  else if(Math.hypot((x-160)/26,(y-84)/26)<1.15)selectAgent("")});
cv.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectAgent("")}});
function selectAgent(id){$("c-target").value=id;openConsole(id);const a=SC.agents[id];
  if(a&&!running){bubble(a,mm(pickOne(linesFor(id)))+" "+(ASK[a.kind]||ASK.studio),3400,undefined,{now:true});a.emote={k:"!",until:performance.now()+1200}}
  if(!id&&!running)bubble(NEXO_T,pickOne(["Habla. Los cuervos escuchan.","Te oigo. ¿Qué buscas?","Di tu orden; yo ya la oí venir."]),2200,GOLD,{now:true})}
/* =================== ARTE MÍTICO: utilidades y figuras =================== */
const INK="#14102B";
const hexa=a=>Math.max(0,Math.min(255,Math.round(a*255))).toString(16).padStart(2,"0");
function SPR(x,y,rows,pal,flip){const w=rows[0].length;for(let j=0;j<rows.length;j++){const r=rows[j];for(let i=0;i<w;i++){const ch=r[flip?w-1-i:i];if(ch&&ch!=="."){const c=pal[ch];if(c)P(x+i,y+j,1,1,c)}}}}
function DISC(cx,cy,r,c){for(let dy=-r;dy<=r;dy++){const w=Math.floor(Math.sqrt(r*r-dy*dy)+.5);P(cx-w,cy+dy,w*2+1,1,c)}}
function LINEP(x0,y0,x1,y1,c){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx+dy,n=0;for(;n++<400;){P(x0,y0,1,1,c);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx}if(e2<=dx){e+=dx;y0+=sy}}}
function GLOW(cx,cy,r,c,a){const g=G.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,c+hexa(a));g.addColorStop(1,c+"00");G.fillStyle=g;G.fillRect(Math.floor(cx-r),Math.floor(cy-r),Math.ceil(r*2),Math.ceil(r*2))}
const FIG={};
/* boca compartida: hablando = abierta, contento = sonrisa */
function mouthAt(x,y,o,w){if(o.talk)P(x,y,w>2?2:1,1,"#7A2E3E");else if(o.happy)P(x-1+(w>2?0:1),y,w,1,"#A5465A")}

/* ---------- ATENEA · estratega con casco, escudo y lechuza ---------- */
FIG.lib=function(a,x,y,t,o){
  const L=a.look,c=a.color,d=o.dir,cD=mix(c,INK,.5);const Sd=(dx,dy,w,h,col)=>P(d>0?x+dx:x-dx-w+1,y+dy,w,h,col);
  const sil="#CBD5F4",silD="#8A9AD2",dress="#EEF0FF",dressD="#C3C9EA",gold="#E5B84B",goldL="#FFE08A",st=o.step?1:0;
  /* vestido (peplos) y pies */
  P(x-3,y-6,7,1,dress);P(x-4,y-5,9,4,dress);P(x-2,y-5,1,4,dressD);P(x+1,y-5,1,4,dressD);P(x-4,y-2,9,1,c);
  P(x-3+st,y-1,2,1,"#8A6A40");P(x+1-st,y-1,2,1,"#8A6A40");
  P(x-3,y-13,7,7,dress);P(x-3,y-8,7,1,gold);P(x,y-8,1,1,goldL);P(x-1,y-12,3,1,dressD);
  /* égida: hombros con el color de Atenea */
  P(x-4,y-13,9,2,c);P(x-4,y-11,1,5,c);P(x+4,y-11,1,5,c);P(x-3,y-13,2,1,"#FFFFFF66");
  P(x-4,y-6,1,1,L.skin);P(x+4,y-6,1,1,L.skin);
  /* escudo redondo en el brazo izquierdo */
  const sx=d>0?x-8:x+8;P(d>0?x-5:x+5,y-9,1,3,L.skin);DISC(sx,y-9,3,gold);DISC(sx,y-9,2,"#9FB4E8");P(sx,y-9,1,1,"#2A2E66");P(sx-1,y-10,1,1,goldL);
  /* cabeza: casco corintio con cimera */
  P(x-1,y-26,3,1,c);P(x-2,y-25,5,1,c);P(x-2,y-24,5,1,cD);
  P(x-4,y-23,9,3,sil);P(x-2,y-23,3,1,"#F4F7FF");P(x-4,y-21,9,1,silD);
  P(x-3,y-20,7,5,L.skin);P(x-4,y-20,1,5,sil);P(x+4,y-20,1,5,sil);P(x,y-20,1,3,sil);
  P(x-4,y-15,1,3,L.hair);P(x+4,y-15,1,3,L.hair);P(x-1,y-15,3,2,L.skin);
  if(!o.blink){P(x-2,y-18,1,1,"#3FC8F2");P(x+2,y-18,1,1,"#3FC8F2")}
  mouthAt(x-1,y-16,o,3);
  /* lechuza en el hombro: parpadea y mira */
  const ox=d>0?x+4:x-8,tt=o.tt;const ob=!o.still&&!reduced&&((tt%3.8)<0.2);const up=!o.still&&!reduced&&((tt%8.5)>6.9&&(tt%8.5)<8);
  const owl=["b...b","bbbbb","bYbYb","bYbYb","bbobb","bwwwb"];const pal={b:"#8A6643",w:"#DCC49A",Y:ob?"#8A6643":"#FFE066",o:"#E8943A"};
  SPR(ox,y-19,owl,pal,d<0);if(ob){P(ox+1,y-16,1,1,"#4A3018");P(ox+3,y-16,1,1,"#4A3018")}else{P(ox+1,y-(up?17:16),1,1,INK);P(ox+3,y-(up?17:16),1,1,INK)}
  P(ox+1,y-13,1,1,"#E8943A");P(ox+3,y-13,1,1,"#E8943A");
};

/* ---------- JANO · dos caras, llave y bastón ---------- */
FIG.map=function(a,x,y,t,o){
  const L=a.look,c=a.color,d=o.dir;const Sd=(dx,dy,w,h,col)=>P(d>0?x+dx:x-dx-w+1,y+dy,w,h,col);
  const vio="#5B45C9",vioD="#3F2F98",amb="#E3A64B",ambD="#B77C2C",gold="#FFD27A",st=o.step?1:0,seam="#8E86B4";
  /* bastón al fondo */
  Sd(-9,-26,1,25,"#8A6A40");Sd(-10,-28,3,3,gold);Sd(-9,-27,1,1,"#FFF3C4");
  /* túnica partida en dos colores */
  P(x-4,y-5,5,4,vio);P(x+1,y-5,4,4,amb);P(x-3,y-6,4,1,vio);P(x+1,y-6,3,1,amb);P(x-4,y-2,9,1,gold);
  P(x-3+st,y-1,2,1,"#4A3A2A");P(x+1-st,y-1,2,1,"#4A3A2A");
  P(x-3,y-13,4,7,vio);P(x+1,y-13,3,7,amb);P(x,y-13,1,7,"#2A2050");P(x-3,y-8,7,1,gold);
  P(x-5,y-12,1,5,vioD);P(x+5,y-12,1,5,ambD);P(x-5,y-7,1,1,L.skin);
  /* llave en la mano derecha */
  P(x+5,y-7,1,1,L.skin);P(x+6,y-13,3,1,gold);P(x+6,y-12,1,1,gold);P(x+8,y-12,1,1,gold);P(x+6,y-11,3,1,gold);P(x+7,y-10,1,6,gold);P(x+8,y-8,1,1,gold);P(x+8,y-6,1,1,gold);
  /* cabeza de dos caras: gira lentamente */
  const ph=(o.still||reduced)?0:(o.tt%7.2);const k=ph<1.6?0:ph<2.4?1:ph<3.8?0:ph<4.6?-1:0;
  const sxm=x+k,lw=sxm-(x-5),rw=(x+5)-sxm;
  P(x-5,y-23,11,1,"#5FBF7A");for(let i=0;i<11;i+=2)P(x-5+i,y-24,1,1,"#3C9A5A");P(sxm,y-24,1,1,gold);
  P(x-5,y-22,11,1,L.hair);
  const skR=mix(L.skin,"#7A5A48",.8);P(x-5,y-21,lw,6,L.skin);P(sxm+1,y-21,rw,6,skR);P(sxm,y-22,1,8,seam);
  P(x-5,y-16,lw,1,L.hair);P(sxm+1,y-16,rw,1,"#B4B4CC");P(x-4,y-15,5,1,L.hair);P(x+1,y-15,4,1,"#B4B4CC");P(x-3,y-14,3,1,L.hair);P(x,y-14,3,1,"#B4B4CC");
  if(lw>=4){P(x-6,y-19,1,2,L.skin);P(x-6,y-18,1,1,mix(L.skin,"#000000",.8))}if(rw>=4){P(x+6,y-19,1,2,skR);P(x+6,y-18,1,1,mix(skR,"#000000",.8))}
  if(!o.blink){if(lw>=3)P(x-4,y-20,1,1,INK);if(rw>=3)P(x+4,y-20,1,1,INK)}
  if(lw>=3)P(x-4,y-18,1,1,"#B07A78");if(rw>=3)P(x+4,y-18,1,1,"#B07A78");
  if(o.talk){if(lw>=3)P(x-4,y-17,1,1,"#7A2E3E");if(rw>=3)P(x+4,y-17,1,1,"#7A2E3E")}
  P(x-1,y-13,3,1,L.skin);
};

/* ---------- HERACLES · piel de león y maza ---------- */
FIG.gym=function(a,x,y,t,o){
  const L=a.look,c=a.color,d=o.dir;const Sd=(dx,dy,w,h,col)=>P(d>0?x+dx:x-dx-w+1,y+dy,w,h,col);
  const fur="#E0A63C",furD="#B97A24",furL="#F6CF74",st=o.step?1:0;
  const flex=!o.still&&!o.walking&&!reduced&&o.idle&&((o.tt%5.5)<1.2);
  /* maza apoyada al hombro */
  const my=flex?-2:0;
  Sd(6,-24+my,3,3,"#6B4A2A");Sd(5,-22+my,4,5,"#8A6038");Sd(6,-18+my,2,17-my,"#7A5230");Sd(8,-23+my,1,1,"#C9C9D8");Sd(5,-20+my,1,1,"#C9C9D8");Sd(9,-19+my,1,1,"#C9C9D8");Sd(5,-17+my,1,1,"#4A3018");
  /* piernas y sandalias */
  P(x-2,y-5,2,4-st,L.skin);P(x+1,y-5,2,o.walking?3+st:4,L.skin);P(x-3,y-1,3,1,"#6B4A2A");P(x+1,y-1,3,1,"#6B4A2A");
  /* faldellín con tiras de cuero */
  P(x-4,y-8,9,4,"#C94A32");for(let i=0;i<9;i+=2)P(x-4+i,y-5,1,2,"#8A3A26");P(x-4,y-8,9,1,"#E5B84B");
  /* torso desnudo y piel de león sobre los hombros */
  P(x-4,y-14,9,6,L.skin);P(x-1,y-13,1,3,mix(L.skin,"#000000",.8));P(x+1,y-13,1,3,mix(L.skin,"#000000",.8));
  P(x-5,y-15,11,3,fur);P(x-5,y-12,1,4,furD);P(x+5,y-12,1,4,furD);P(x-3,y-15,2,1,furL);P(x+2,y-14,2,1,furD);
  P(x-2,y-12,2,2,furL);P(x+1,y-12,2,2,furL);P(x-1,y-11,3,1,furD);
  /* brazos */
  if(flex){P(x-6,y-19,2,5,L.skin);P(x+5,y-19,2,5,L.skin);P(x-7,y-21,2,2,L.skin);P(x+6,y-21,2,2,L.skin)}
  else{P(x-6,y-13,2,6,L.skin);P(x+5,y-13,2,6,L.skin);P(x-6,y-13,1,2,mix(L.skin,"#FFFFFF",.8));P(x+5,y-13,1,2,mix(L.skin,"#FFFFFF",.8))}
  /* cabeza con la melena del león */
  P(x-5,y-24,11,3,fur);P(x-6,y-23,1,3,furD);P(x+6,y-23,1,3,furD);P(x-5,y-25,2,2,furD);P(x+4,y-25,2,2,furD);P(x-1,y-24,3,1,furL);
  P(x-1,y-22,3,1,"#8A5A1E");P(x-3,y-22,1,1,INK);P(x+3,y-22,1,1,INK);
  P(x-4,y-21,9,1,fur);P(x-4,y-20,1,5,fur);P(x+4,y-20,1,5,fur);P(x-5,y-20,1,6,furD);P(x+5,y-20,1,6,furD);
  P(x-3,y-21,7,6,L.skin);P(x-3,y-21,7,1,"#00000033");
  P(x-3,y-16,7,1,L.hair);P(x-1,y-15,3,1,L.hair);
  if(!o.blink){P(x-2,y-19,1,1,INK);P(x+2,y-19,1,1,INK)}P(x-3,y-20,2,1,L.hair);P(x+2,y-20,2,1,L.hair);
  if(o.talk||flex||o.happy)P(x-1,y-17,3,1,"#F4F1FF");else P(x-1,y-17,3,1,"#8A4A3A");
};

/* ---------- MONETA · balanza y moneda ---------- */
FIG.bank=function(a,x,y,t,o){
  const L=a.look,c=a.color,d=o.dir;const Sd=(dx,dy,w,h,col)=>P(d>0?x+dx:x-dx-w+1,y+dy,w,h,col);
  const gold="#FFD86B",goldD="#C7902E",stola="#2E8B67",stolaD="#1F6A4E",palla="#F4EBD0",st=o.step?1:0;
  /* balanza sostenida por su mano derecha */
  const tilt=reduced?0:Math.round(Math.sin(o.tt*(o.work?4:1.3))*(o.work?2:1.2));
  Sd(7,-23,1,13,"#B8923A");Sd(7,-24,1,1,"#FFF1B8");Sd(3,-23+tilt,9,1,gold);
  Sd(3,-22+tilt,1,3,goldD);Sd(11,-22-tilt,1,3,goldD);Sd(2,-19+tilt,3,1,gold);Sd(2,-18+tilt,3,1,goldD);Sd(10,-19-tilt,3,1,gold);Sd(10,-18-tilt,3,1,goldD);
  Sd(3,-20+tilt,1,1,"#FFF1B8");Sd(11,-20-tilt,1,1,"#FFF1B8");
  if(!o.still&&!reduced&&((o.tt%2.6)<1.3))P(d>0?x+11:x-11,y-21-tilt,1,1,"#FFFFFF");
  /* estola larga y palla */
  P(x-3,y-6,7,1,stola);P(x-4,y-5,9,4,stola);P(x-2,y-5,1,4,stolaD);P(x+1,y-5,1,4,stolaD);P(x-4,y-2,9,1,gold);
  P(x-3+st,y-1,2,1,"#6A4A2A");P(x+1-st,y-1,2,1,"#6A4A2A");
  P(x-3,y-13,7,7,stola);P(x-3,y-8,7,1,gold);P(x,y-8,1,1,"#FFF1B8");
  P(x-3,y-13,2,1,palla);P(x-2,y-12,2,1,palla);P(x-1,y-11,2,1,palla);P(x,y-10,2,1,palla);P(x+1,y-9,2,1,palla);P(x+2,y-8,2,1,palla);
  P(x-4,y-12,1,6,stolaD);P(x+4,y-12,1,5,stolaD);P(x-4,y-7,1,1,L.skin);Sd(5,-12,1,3,stolaD);Sd(5,-9,2,2,L.skin);
  /* cabeza: moño, diadema y rostro frío */
  P(x-3,y-22,7,2,L.hair);P(x-2,y-24,5,2,L.hair);P(x-1,y-25,3,1,L.hair);P(x-3,y-21,7,1,gold);P(x,y-22,1,1,"#FFF1B8");
  P(x-3,y-20,7,5,L.skin);P(x-4,y-20,1,4,L.hair);P(x+4,y-20,1,4,L.hair);P(x-1,y-15,3,2,L.skin);
  if(!o.blink){P(x-2,y-18,1,1,INK);P(x+2,y-18,1,1,INK)}P(x-2,y-19,2,1,L.hair);P(x+1,y-19,2,1,L.hair);
  if(o.talk)P(x-1,y-16,3,1,"#7A2E3E");else P(x-1,y-16,3,1,o.happy?"#C0507A":"#B04460");
  P(x-4,y-17,1,1,gold);P(x+4,y-17,1,1,gold);
};

/* ---------- HEFESTO · herrero con martillo ---------- */
FIG.ctrl=function(a,x,y,t,o){
  const L=a.look,c=a.color,d=o.dir;const Sd=(dx,dy,w,h,col)=>P(d>0?x+dx:x-dx-w+1,y+dy,w,h,col);
  const apr="#7A4A2A",aprD="#5A3420",tun="#B8432E",steel="#AEB4C8",steelD="#7C839C",st=o.step?1:0;
  const rate=o.work?1.0:2.2;const ph=(!o.still&&!reduced&&(o.idle||o.work))?((o.tt%rate)/rate):-1;
  const up=ph>=0&&ph<0.55;const hit=ph>=0.55&&ph<0.75;
  /* piernas y botas */
  P(x-3,y-5,3,4-st,"#3A2A24");P(x+1,y-5,3,o.walking?3+st:4,"#3A2A24");P(x-3,y-1,3,1,"#241812");P(x+1,y-1,3,1,"#241812");
  /* túnica y delantal de cuero */
  P(x-4,y-14,9,10,tun);P(x-3,y-12,7,9,apr);P(x-3,y-12,7,1,aprD);P(x-3,y-4,7,1,aprD);P(x-1,y-8,3,2,aprD);P(x-4,y-9,1,1,"#C9C9D8");
  P(x-3,y-14,1,3,aprD);P(x+3,y-14,1,3,aprD);
  /* brazos de forjador y martillo */
  const f=d>0?1:-1;
  P(x-f*6-(f>0?0:1)+(f>0?0:0),y-13,2,6,L.skin);P(x-f*6-(f>0?0:1),y-9,2,1,"#00000033");
  const hx0=x+f*5,hy0=y-12;const hdx=up?f*5:hit?f*11:f*8,hdy=up?-24:hit?-6:-14;
  P(f>0?x+3:x-4,y-14,2,4,L.skin);P(hx0,hy0,1,1,L.skin);
  LINEP(hx0,hy0,x+hdx,y+hdy,"#8A6038");LINEP(hx0+(f>0?1:-1),hy0,x+hdx+(f>0?1:-1),y+hdy,"#6B4A2A");
  P(x+hdx-2,y+hdy-1,5,3,steel);P(x+hdx-2,y+hdy+1,5,1,steelD);P(x+hdx+(f>0?2:-2),y+hdy-1,1,3,"#E7ECFF");
  /* cabeza: pañuelo rojo, ceño y barba tiznada */
  P(x-4,y-23,9,2,"#C0392B");P(x-5,y-21,1,1,"#C0392B");P(x+5,y-21,1,1,"#C0392B");P(x-3,y-24,6,1,"#A02A20");
  P(x-3,y-21,7,6,L.skin);P(x-3,y-21,7,1,"#00000026");P(x-3,y-17,7,4,L.hair);P(x-2,y-14,5,1,L.hair);P(x-1,y-13,3,1,L.hair);P(x-4,y-17,1,3,L.hair);P(x+4,y-17,1,3,L.hair);
  P(x-3,y-20,3,1,"#2B1D18");P(x+1,y-20,3,1,"#2B1D18");P(x-3,y-19,1,1,"#2B1D18");P(x+3,y-19,1,1,"#2B1D18");
  if(!o.blink){P(x-2,y-18,1,1,"#F4F1FF");P(x+2,y-18,1,1,"#F4F1FF")}
  if(o.talk)P(x-1,y-15,3,1,"#4A1E26");P(x+1,y-21,1,1,"#00000044");P(x-2,y-19,1,1,"#00000033");
};

/* ---------- genérico (departamentos nuevos): oráculo encapuchado ---------- */
FIG.studio=function(a,x,y,t,o){
  const L=a.look,c=a.color,cD=mix(c,INK,.45),st=o.step?1:0;
  P(x-3,y-6,7,1,cD);P(x-4,y-5,9,4,cD);P(x-4,y-2,9,1,c);P(x-3+st,y-1,2,1,"#4A3A2A");P(x+1-st,y-1,2,1,"#4A3A2A");
  P(x-3,y-13,7,7,cD);P(x-3,y-8,7,1,c);P(x-5,y-12,1,6,cD);P(x+5,y-12,1,6,cD);P(x-5,y-6,1,1,L.skin);P(x+5,y-6,1,1,L.skin);
  P(x-4,y-22,9,3,cD);P(x-5,y-19,1,6,cD);P(x+5,y-19,1,6,cD);P(x-1,y-24,3,2,cD);
  P(x-3,y-20,7,6,L.skin);P(x-3,y-20,7,1,cD);P(x-3,y-21,7,1,cD);
  if(!o.blink){P(x-2,y-18,1,1,INK);P(x+2,y-18,1,1,INK)}mouthAt(x-1,y-16,o,3);
  P(x,y-23,1,1,"#FFE9A6");if(!o.still&&!reduced&&((o.tt*2|0)%2))P(x,y-25,1,1,"#FFFFFF");
};

/* ---------- el comandante (el usuario): héroe mortal con laurel y capa ---------- */
FIG.cmd=function(a,x,y,t,o){
  const L=a.look,d=o.dir,st=o.step?1:0;
  P(x-4,y-14,9,12,"#2F2680");P(x-4,y-3,9,1,"#E5B84B");P(x-4,y-14,9,1,"#4B3FB0");
  P(x-2,y-4,2,4-st,"#2A2540");P(x+1,y-4,2,o.walking?3+st:4,"#2A2540");
  P(x-3,y-13,7,7,"#5B4FD0");P(x-3,y-13,7,1,"#E5B84B");P(x-3,y-8,7,1,"#E5B84B");P(x-5,y-12,2,5,"#5B4FD0");P(x+4,y-12,2,5,"#5B4FD0");P(x-5,y-7,1,1,L.skin);P(x+5,y-7,1,1,L.skin);
  P(x-3,y-20,7,6,L.skin);P(x-3,y-21,7,2,L.hair);P(x-4,y-19,1,3,L.hair);P(x+4,y-19,1,3,L.hair);
  P(x-4,y-22,9,1,"#E5B84B");P(x-3,y-23,1,1,"#E5B84B");P(x,y-23,1,1,AVCMD?AVCMD.acc:"#FFE9A6");P(x+3,y-23,1,1,"#E5B84B");
  if(AVCMD&&AVCMD.emb){const e=AVCMD.emb;P(x-3,y-13,7,7,"#E5B84B");for(let r=0;r<5;r++)for(let c=0;c<5;c++)P(x-2+c,y-12+r,1,1,e[r*5+c])}
  const ex=d>0?0:-1;if(!o.blink){P(x-2+ex,y-18,1,1,INK);P(x+2+ex,y-18,1,1,INK)}mouthAt(x-1,y-16,o,3);
};

/* ---------- cuervos de Odín: Hugin y Munin ---------- */
function ravenPerched(x,y,s,blink){const R=(dx,dy,w,h,c)=>P(s>0?x+dx:x-dx-w+1,y+dy,w,h,c);const k="#262158",hl="#8F89E6",rim="#6C66C8";
  R(-1,-4,6,1,rim);R(0,-3,5,3,k);R(4,-6,4,4,k);R(4,-7,3,1,rim);R(8,-5,2,1,"#F0B24E");if(!blink)R(6,-5,1,1,"#FFFFFF");R(-3,-2,3,1,k);R(-4,-1,2,1,rim);R(1,0,1,1,"#B89A5A");R(3,0,1,1,"#B89A5A");R(1,-3,3,1,hl);R(0,-2,1,1,"#3A3478")}
function ravenFly(x,y,s,fr){const R=(dx,dy,w,h,c)=>P(s>0?x+dx:x-dx-w+1,y+dy,w,h,c);const k="#1B1740",kk="#5A54A8";
  R(-2,0,5,2,k);R(-4,0,2,1,k);R(3,-1,3,3,k);R(6,0,1,1,"#E5A84A");R(4,-1,1,1,"#F4F1FF");R(-1,0,3,1,"#3A3478");
  if(fr===0){R(-1,-3,3,3,kk);R(-2,-4,2,1,k);R(1,-4,1,1,k)}else if(fr===1){R(-2,-1,6,1,kk)}else{R(-1,2,3,2,kk);R(-2,3,2,1,k)}}

/* ---------- ODÍN · el centro: anciano sabio con parche, lanza y dos cuervos ---------- */
FIG.nexo=function(a,x,y,t,o){
  const skin="#E3B48C",skinD="#B98768",cl="#2A3A9A",clD="#1B2878",clL="#4A5FD0",gold="#E5B84B",beard="#ECEFFA",beardD="#B9C0DC",wood="#8A6A40";
  const w=reduced?0:Math.round(Math.sin(t*1.7+1));const talk=o.talk,eyeG=o.think||o.run;
  /* lanza Gungnir (más afuera, para dejar sitio a los cuervos) */
  const sp=x+13;P(sp,y-34,1,35,wood);for(let i=0;i<7;i++)P(sp,y-30+i*4,1,1,gold);
  P(sp,y-39,1,5,"#E9EEFF");P(sp-1,y-37,3,2,"#E9EEFF");P(sp,y-40,1,1,"#FFFFFF");
  if(eyeG){const g=reduced?1:Math.round(Math.sin(t*6)*0.5+0.5);P(sp-1,y-41,3,1,g?"#FFE9A6":"#FFE9A688");P(sp,y-42,1,1,"#FFF3C4")}
  /* capa azul con mantón ancho */
  P(x-8,y-19,17,2,cl);P(x-9,y-18,19,1,clL);P(x-6,y-17,13,16,cl);P(x-6,y-17,2,16,clD);P(x+5,y-17,2,16,clD);P(x-6,y-3,13,1,clD);
  for(let i=0;i<13;i++)if((i+w+2)%3===0)P(x-6+i,y-2,1,1,clL);
  P(x-3,y-16,1,12,"#00000022");P(x+3,y-16,1,12,"#00000022");
  /* túnica y cinturón */
  P(x-2,y-14,5,12,"#46547F");P(x-2,y-8,5,1,gold);P(x,y-8,1,1,"#FFF1B8");P(x-3,y-1,2,1,"#2A1E1A");P(x+2,y-1,2,1,"#2A1E1A");
  /* brazo extendido con la lanza */
  P(x+6,y-14,7,2,cl);P(x+12,y-14,2,2,skin);P(x-7,y-14,2,6,cl);P(x-7,y-8,2,1,skin);
  /* cabeza: sombrero de ala ancha, parche y barba larga */
  P(x-2,y-26,5,1,"#27348F");P(x-3,y-25,7,3,"#27348F");P(x-3,y-23,7,1,"#C9A04A");P(x-6,y-22,13,1,"#1B2566");P(x-5,y-23,1,1,"#1B2566");P(x+5,y-23,1,1,"#1B2566");P(x-2,y-25,2,1,"#3E4FB8");
  P(x-3,y-21,7,4,skin);P(x-3,y-21,7,1,skinD);
  P(x-3,y-20,3,2,"#0C0A18");P(x-4,y-21,1,1,"#0C0A18");
  P(x+2,y-19,1,1,eyeG?"#FFE9A6":"#EAF4FF");P(x+1,y-20,3,1,"#DADCEC");P(x,y-19,1,2,skinD);
  P(x-3,y-17,7,2,beard);P(x-3,y-15,7,2,beard);P(x-2,y-13,5,2,beard);P(x-1,y-11,3,2,beard);P(x,y-9,1,1,beard);
  P(x-3,y-17,1,6,beardD);P(x+3,y-16,1,3,beardD);P(x-1,y-14,1,3,beardD);
  if(talk)P(x-1,y-16,3,1,"#8E96BC");
  /* Hugin y Munin susurrándole al oído (si no andan de misión) */
  const per=o.perched===undefined?2:o.perched;
  if(per>0)ravenPerched(x-10,y-19,1,!o.still&&!reduced&&((t+.4)%4.1<.15));
  if(per>1)ravenPerched(x+10,y-19,-1,!o.still&&!reduced&&((t+2)%5.3<.15));
};
/* =================== ARTE MÍTICO: mapa, senderos de runas y salas =================== */
const THEME={
  lib:{floor:"#182052",tile:"#1D2660",wall:"#2B3478",trim:"#C9D3F2",carpet:"#2B6F8E"},
  map:{floor:"#1A1648",tile:"#201B54",wall:"#2C2368",trim:"#B79CFF",carpet:"#4D3C94"},
  gym:{floor:"#3C2E30",tile:"#45353A",wall:"#352529",trim:"#E0A63C",carpet:"#6E4C3E"},
  ctrl:{floor:"#201A2C",tile:"#271F36",wall:"#35232E",trim:"#FF9E3D",carpet:"#4C2F32"},
  bank:{floor:"#11292F",tile:"#163239",wall:"#1B3939",trim:"#FFD86B",carpet:"#2B5C4B"},
  studio:{floor:"#1A1646",tile:"#1F1A50",wall:"#292357",trim:"#C69CFF",carpet:"#3B3070"}};
const RUNE_G=[["#..","##.","#.#","#..","#.."],["#.#","#.#","#.#","#.#","###"],["##.","#.#","##.","#.#","#.#"],["#.#","#.#","###","#.#","#.#"],["..#",".#.","#..",".#.","..#"],[".#.",".#.","###",".#.",".#."],["#.#",".#.",".#.",".#.","#.#"],["###","..#",".#.","#..","###"],[".#.","#.#","#.#",".#.",".#."],["#..","##.","#.#","##.","#.."]];
const RUNE_DIM="#3A4596";
let RUNE_BY={};
function rune(x,y,g,c){const r=RUNE_G[g%RUNE_G.length];for(let j=0;j<5;j++)for(let i=0;i<3;i++)if(r[j][i]==="#")P(x+i,y+j,1,1,c)}
function sigil(x,y,c,fill){DISC(x,y,3,c);DISC(x,y,2,fill);P(x,y,1,1,c);P(x-2,y,1,1,c);P(x+2,y,1,1,c)}
function checker(x,y,w,h,s,c1,c2){for(let yy=0;yy<h;yy+=s)for(let xx=0;xx<w;xx+=s)P(x+xx,y+yy,Math.min(s,w-xx),Math.min(s,h-yy),(((xx/s)+(yy/s))&1)?c2:c1)}
function zones(r){return{ZR:{x:r.cx+22,y:r.y+10,w:r.x+r.w-4-(r.cx+22),h:r.h-15},ZF:r.top?{x:r.x+4,y:r.desk.y+10,w:(r.cx-9)-(r.x+4),h:(r.y+r.h-3)-(r.desk.y+10)}:{x:r.x+4,y:r.y+10,w:(r.cx-9)-(r.x+4),h:(r.desk.y-9)-(r.y+10)}}}
/* cielo: estrellas, constelaciones (la del Cuervo abajo, por Hugin y Munin) */
const STARS=(()=>{const a=[];let s=7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;for(let i=0;i<86;i++){const k=rnd();a.push({x:Math.floor(rnd()*W),y:Math.floor(rnd()*H),c:k>.9?"#FFE9A6":k>.7?"#9FE8FF":k>.4?"#AEB8F0":"#6A74C0",tw:rnd()*6})}return a})();
const CONST=[{p:[[139,146],[151,138],[168,141],[180,151],[167,161],[150,158],[139,146]]},{p:[[113,14],[118,24],[112,34],[117,46],[113,56]]},{p:[[204,138],[200,148],[207,157],[201,168]]},{p:[[132,118],[126,126]]}];
function strip(e,hw,col){const a=NODES[e.a],b=NODES[e.b];if(!a||!b)return;if(a.y===b.y){const x0=Math.min(a.x,b.x)-hw,x1=Math.max(a.x,b.x)+hw;P(x0,a.y-hw,x1-x0,hw*2,col)}else{const y0=Math.min(a.y,b.y)-hw,y1=Math.max(a.y,b.y)+hw;P(a.x-hw,y0,hw*2,y1-y0,col)}}
const HALL="#1A2052",HALLE="#2C357C",HALLD="#222A68";
function buildBG(){
  const c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");g.imageSmoothingEnabled=false;const prev=G;G=g;
  const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,"#050818");gr.addColorStop(.6,"#0A0F2E");gr.addColorStop(1,"#13164A");g.fillStyle=gr;g.fillRect(0,0,W,H);
  GLOW(44,150,64,"#4A2F9A",.24);GLOW(276,34,74,"#1E6AA0",.22);GLOW(160,172,72,"#7A3A9A",.2);GLOW(160,92,56,"#2A3090",.3);
  STARS.forEach(s=>P(s.x,s.y,1,1,s.c));
  CONST.forEach(cn=>{g.strokeStyle="rgba(150,172,255,.30)";g.lineWidth=1;g.beginPath();cn.p.forEach((q,i)=>i?g.lineTo(q[0]+.5,q[1]+.5):g.moveTo(q[0]+.5,q[1]+.5));g.stroke();cn.p.forEach(q=>{P(q[0]-1,q[1],3,1,"#9FB0FF");P(q[0],q[1]-1,1,3,"#9FB0FF");P(q[0],q[1],1,1,"#FFFFFF")})});
  const halls=EDGES.filter(e=>e.type!=="carpet");RUNE_BY={};
  halls.forEach(e=>strip(e,6,HALLE));halls.forEach(e=>strip(e,5,HALL));
  halls.forEach(e=>{const A=NODES[e.a],B=NODES[e.b];const k=e.a<e.b?e.a+"|"+e.b:e.b+"|"+e.a;const list=[];
    if(A.y===B.y){const x0=Math.min(A.x,B.x),x1=Math.max(A.x,B.x);for(let xx=x0+10,i=0;xx<=x1-9;xx+=13,i++)list.push({x:xx,y:A.y,g:(xx*7+A.y*3+i)})}
    else{const y0=Math.min(A.y,B.y),y1=Math.max(A.y,B.y);for(let yy=y0+10,i=0;yy<=y1-9;yy+=13,i++)list.push({x:A.x,y:yy,g:(yy*5+A.x+i)})}
    RUNE_BY[k]=list;list.forEach(q=>rune(q.x-1,q.y-2,q.g,RUNE_DIM))});
  Object.values(NODES).filter(n=>n.type==="hall").forEach(n=>sigil(n.x,n.y,"#46509E",HALL));
  /* tarima circular de Odín */
  G.fillStyle="#141A4A";G.beginPath();G.ellipse(160,90,24,20,0,0,Math.PI*2);G.fill();
  G.strokeStyle=GOLD+"66";G.lineWidth=1;G.beginPath();G.ellipse(160,90,24,20,0,0,Math.PI*2);G.stroke();
  G.strokeStyle=GOLD+"2A";G.beginPath();G.ellipse(160,90,17,14,0,0,Math.PI*2);G.stroke();
  Object.values(SC.rooms).forEach(roomStatic);
  G=prev;BG=c;
}
function column(x,y,w,h){P(x-1,y,w+2,2,"#E4E9FF");P(x,y+2,w,h-4,"#AEB8E0");for(let i=1;i<w;i+=2)P(x+i,y+2,1,h-4,"#7B86BC");P(x,y+2,1,h-4,"#D6DCFA");P(x-1,y+h-2,w+2,2,"#E4E9FF");P(x-1,y+h,w+2,1,"#00000055")}
function roomStatic(r){
  const th=THEME[r.kind]||THEME.studio,{x,y,w,h,color}=r,Z=zones(r);
  P(x-1,y-1,w+2,h+2,"#04061A");checker(x,y,w,h,6,th.floor,th.tile);
  P(x,y,w,7,th.wall);P(x,y+6,w,1,color+"99");
  const sp=SPEC[r.kind];if(sp)sp(r,Z,th);
  const ce=EDGES.filter(e=>e.type==="carpet"&&NODES[e.a].room===r.dept.id);ce.forEach(e=>strip(e,4,th.trim+"44"));ce.forEach(e=>strip(e,3,th.carpet));
  G.strokeStyle=color+"CC";G.lineWidth=1;G.strokeRect(x+.5,y+.5,w-1,h-1);
  P(x,y,2,2,th.trim);P(x+w-2,y,2,2,th.trim);P(x,y+h-2,2,2,th.trim);P(x+w-2,y+h-2,2,2,th.trim);
  if(r.top){P(r.cx-4,y+h-1,8,1,th.carpet);P(r.cx-5,y+h-3,1,3,th.trim);P(r.cx+4,y+h-3,1,3,th.trim)}
  else{P(r.cx-4,y,8,7,th.carpet);P(r.cx-5,y,1,7,th.trim);P(r.cx+4,y,1,7,th.trim)}
}
const SPEC={
  lib:(r,Z,th)=>{const {x,y,w}=r;
    for(let i=0;i<w-4;i+=4){P(x+2+i,y+2,3,1,"#C9A04A66");P(x+2+i,y+3,1,2,"#C9A04A66");P(x+4+i,y+3,1,1,"#C9A04A66")}
    const sx=x+12,sw=w-24;P(sx,y+9,sw,15,"#241F48");
    for(let row=0;row<2;row++){const ry=y+10+row*7;P(sx,ry+6,sw,1,"#6A5538");for(let i=0;i<sw-3;i+=4){P(sx+1+i,ry+1,3,5,PALETTE[(i/4+row*2)%6]+"BB");P(sx+1+i,ry+1,3,1,"#FFFFFF44")}}
    column(x+3,y+8,6,23);column(x+w-9,y+8,6,23)},
  map:(r,Z,th)=>{const {x,y,w,h}=r;
    for(let i=0;i<3;i++){const nx=x+8+i*28;if(Math.abs(nx+8-r.cx)<12&&!r.top)continue;P(nx,y+9,16,13,"#0F0C33");DISC(nx+8,y+14,5,"#0F0C33");P(nx+7,y+12,1,1,"#9FB0FF");P(nx+10,y+16,1,1,"#FFE9A6");P(nx+4,y+18,1,1,"#C69CFF")}
    const my=r.top?y+h-21:y+23;for(let i=0;i<24;i++){P(x+14+i,my+((i*5)%3),1,1,"#4D3C94")}
    P(x+8,my-3,2,9,"#35296E");P(x+8,my-3,9,2,"#35296E");P(x+8+8,my-3,2,2,"#35296E")},
  gym:(r,Z,th)=>{const {x,y,w,h}=r;
    for(let i=0;i<w-4;i+=5){P(x+2+i,y+1,4,5,"#4A3434");P(x+2+i,y+1,1,5,"#5A4040")}
    for(let i=0;i<40;i++){P(x+3+(i*37)%(w-6),y+8+(i*23)%(h-10),1,1,"#5A4640")}
    G.strokeStyle="#6A5448";G.setLineDash([3,3]);G.beginPath();G.ellipse(r.cx+.5,r.y+r.h/2+4,24,15,0,0,Math.PI*2);G.stroke();G.setLineDash([])},
  ctrl:(r,Z,th)=>{const {x,y,w,h}=r;
    for(let j=0;j<3;j++)for(let i=0;i<w-2;i+=8){P(x+1+i+(j%2?4:0),y+1+j*2,7,1,"#4A2E3A")}
    for(let i=0;i<22;i++){const cx2=x+4+(i*43)%(w-8),cy2=y+9+(i*29)%(h-11);P(cx2,cy2,1,1,"#7A3A2A");if(i%3===0)P(cx2+1,cy2+1,1,1,"#9A4A2A")}},
  bank:(r,Z,th)=>{const {x,y,w}=r;
    for(let i=0;i<w-2;i+=4)P(x+1+i,y+3,2,1,"#FFD86B55");
    DISC(r.cx,y+16,6,"#0C1F22");DISC(r.cx,y+16,5,"#C7902E");DISC(r.cx,y+16,4,"#FFD86B");P(r.cx-1,y+14,3,1,"#C7902E");P(r.cx,y+14,1,5,"#C7902E");P(r.cx-1,y+18,3,1,"#C7902E")},
  studio:(r,Z,th)=>{const {x,y,w}=r;for(let i=0;i<7;i++)P(x+6+(i*29)%(w-12),y+2+(i*7)%4,1,1,"#C69CFF")}
};
/* ---------- objetos animados ---------- */
function flame(x,y,t,c,big){const f=reduced?1:(t*9+x)|0;const h=(big?6:4)+(f%2);P(x-1,y-h+1,3,h,c);P(x,y-h,1,2,c);P(x,y-h+2,1,h-2,"#FFF6D8");if(!reduced&&f%3===0)P(x+1,y-h-1,1,1,c+"AA")}
function olive(x,y,t){const sw=reduced?0:Math.round(Math.sin(t*1.1)*.6);
  P(x+6,y+11,3,11,"#6B4A2A");P(x+5,y+15,1,4,"#6B4A2A");P(x+9,y+13,1,4,"#5A3A20");P(x+4,y+21,7,1,"#4A3018");
  DISC(x+7+sw,y+6,6,"#5F8A6E");DISC(x+3+sw,y+9,4,"#527A62");DISC(x+11+sw,y+9,4,"#527A62");DISC(x+7+sw,y+4,4,"#7FB08E");
  P(x+4+sw,y+3,2,1,"#C9E8CF");P(x+9+sw,y+5,2,1,"#C9E8CF");P(x+6+sw,y+1,2,1,"#C9E8CF");
  [[3,8],[7,11],[11,7],[9,3],[5,6]].forEach(([dx,dy])=>P(x+dx+sw,y+dy,1,1,"#241E3C"))}
function brazier(x,y,t,c,wk){GLOW(x+4,y+2,wk?22:15,c,wk?.3:.2);P(x+1,y+6,1,6,"#7A7AA0");P(x+7,y+6,1,6,"#7A7AA0");P(x+4,y+8,1,4,"#7A7AA0");P(x,y+5,9,2,"#9A9AC0");P(x,y+5,9,1,"#C9C9E8");flame(x+4,y+5,t,c,true)}
function scrollRoll(x,y,c){P(x,y,7,3,"#E8DDBB");P(x,y,1,3,"#C9B98A");P(x+6,y,1,3,"#C9B98A");P(x+1,y+1,5,1,c)}
function portal(x,y,t,wk){const gap=reduced?2:Math.round(2.2+1.8*Math.sin(t*.9+1)),pulse=reduced?.2:.18+.06*Math.sin(t*1.6);
  GLOW(x+11,y+22,wk?34:28,"#C69CFF",pulse+(wk?.12:0));
  DISC(x+11,y+11,11,"#5A5296");P(x,y+11,22,25,"#5A5296");DISC(x+11,y+11,9,"#120F3A");P(x+2,y+11,18,23,"#120F3A");
  const lx=x+2,rx=x+20-8;P(lx,y+9,8-gap/2,25,"#2D2670");P(rx+gap/2,y+9,8-gap/2,25,"#4A3418");
  for(let j=0;j<5;j++){P(lx+1,y+12+j*5,5,1,"#B79CFF");P(rx+3+gap/2,y+12+j*5,4,1,"#FFB04A")}
  P(x+11-gap/2,y+9,gap,25,"#FFF6D8");P(x+11-gap/2-1,y+9,1,25,"#FFF6D888");P(x+11+gap/2,y+9,1,25,"#FFF6D888");
  P(x+9,y+1,5,3,"#8F86C8");P(x+10,y+2,1,1,"#120F3A");P(x+12,y+2,1,1,"#120F3A");
  P(x-1,y+34,24,2,"#6E66A8");P(x-2,y+36,26,2,"#4A4488");
  if(!reduced)for(let i=0;i<4;i++){const ph=(t*.5+i*.27)%1;P(x+3+(i*6)%16+Math.round(Math.sin(ph*6+i)*2),y+32-Math.round(ph*28),1,1,i%2?"#FFD27A":"#C69CFF")}}
function signpost(x,y,t){P(x+2,y,2,17,"#7A5A38");P(x-5,y+2,9,4,"#B77C2C");P(x-6,y+3,1,2,"#B77C2C");P(x-5,y+2,9,1,"#E3A64B");P(x+2,y+8,9,4,"#5B45C9");P(x+11,y+9,1,2,"#5B45C9");P(x+2,y+8,9,1,"#8E7CE8");P(x,y+16,6,2,"#4A3A2A");P(x+1,y-1,4,1,"#FFD27A")}
function torch(x,y,t,c){P(x,y+3,2,8,"#6B4A2A");P(x-1,y+2,4,2,"#9A9AC0");flame(x+1,y+2,t,c,false);GLOW(x+1,y,10,c,.18)}
function dummy(x,y,t){const sw=reduced?0:Math.round(Math.sin(t*.8));P(x+4,y+4,2,17,"#7A5230");P(x+1+sw,y+6,8,10,"#B8A070");P(x+1+sw,y+6,8,1,"#D8C690");DISC(x+5+sw,y+3,3,"#B8A070");P(x+4+sw,y+3,1,1,"#4A3018");P(x+6+sw,y+3,1,1,"#4A3018");P(x-2+sw,y+8,5,2,"#B8A070");P(x+8+sw,y+8,5,2,"#B8A070");P(x,y+20,10,2,"#5A4030")}
function rack(x,y){P(x,y,18,2,"#6B4A2A");P(x,y+10,18,2,"#6B4A2A");P(x+2,y+2,2,8,"#8A6038");P(x+8,y+2,2,8,"#8A6038");P(x+14,y+2,2,8,"#8A6038");P(x+2,y-3,2,3,"#C9C9D8");P(x+8,y-5,2,5,"#7A5230");P(x+7,y-6,4,2,"#9A7048");P(x+14,y-3,2,3,"#C9C9D8")}
function medalBoard(x,y,r){const mon=monday(today());P(x,y,22,13,"#5A3E28");P(x,y,22,2,"#E0A63C");P(x+1,y+2,20,10,"#3A281C");
  for(let i=0;i<7;i++){const s=addDays(mon,i);const sc=score(s);const mx=x+3+(i%4)*5,my=y+4+(i>3?5:0);const c=s>today()?"#5A4A44":sc.met?"#7EE0A1":s===today()?"#FFD86B":"#8A4A40";DISC(mx,my,2,c);P(mx-1,my-1,1,1,"#FFFFFF66")}
  if(!reduced&&score(today()).met&&((SC.t*2|0)%2))P(x+19,y+3,2,2,"#FFD86B")}
function forge(x,y,t,wk){const fl=reduced?1:(t*7|0)%3;GLOW(x+11,y+14,wk?36:28,"#FF8A3D",wk?.34:.24+fl*.02);
  P(x+14,y-12,6,13,"#4A2E3A");P(x+14,y-12,6,2,"#5E3C4A");P(x+15,y-11,1,12,"#3A2230");
  P(x,y,22,23,"#5A3A46");for(let j=0;j<5;j++)for(let i=0;i<22;i+=6)P(x+i+(j%2?3:0),y+1+j*5,5,1,"#3E2630");P(x,y,22,2,"#6E4A58");
  P(x+3,y+8,16,12,"#1A1018");P(x+4,y+9,14,10,"#2A1418");
  P(x+5,y+14,12,5,"#FF8A3D");P(x+6,y+13-fl%2,10,3,"#FFB04A");P(x+8,y+12-fl,6,3,"#FFD86B");P(x+10,y+11-fl,2,2,"#FFF6D8");
  for(let i=0;i<4;i++)P(x+5+i*3,y+17+(i+fl)%2,2,1,"#FFD86B");
  P(x-6,y+14,5,6,"#6B4A2A");P(x-7,y+13,7,2,"#8A6038");P(x-1,y+16,2,2,"#9A9AC0")}
function smoke(x,y,t,n){if(reduced)return;for(let i=0;i<n;i++){const ph=(t*.4+i*.31)%1;P(x+Math.round(Math.sin(ph*5+i)*2),y-Math.round(ph*22),2,1,"rgba(180,170,200,"+((1-ph)*.32).toFixed(2)+")")}}
function barrel(x,y,t){P(x,y,10,12,"#5A3E28");P(x,y+3,10,1,"#9A9AC0");P(x,y+8,10,1,"#9A9AC0");P(x+1,y,8,2,"#4AA3D8");if(!reduced&&(t*2|0)%2)P(x+3,y-2,1,1,"#C9E8FF")}
function toolRack(x,y){P(x,y,20,2,"#6B4A2A");P(x+2,y+2,1,3,"#8A8AA0");P(x+1,y+5,3,3,"#8A8AA0");P(x+8,y+2,2,6,"#7A5230");P(x+7,y+8,4,3,"#C9C9D8");P(x+14,y+2,1,8,"#8A8AA0");P(x+15,y+9,2,2,"#8A8AA0");P(x+17,y+2,1,6,"#8A8AA0")}
function chest(x,y,t,wk){GLOW(x+7,y+1,16,"#FFD86B",wk?.35:.24);P(x,y+4,14,8,"#6B4A2A");P(x,y+4,14,1,"#E5B84B");P(x,y+8,14,1,"#E5B84B");P(x+6,y+6,2,3,"#FFD86B");P(x,y+1,14,3,"#8A6038");P(x+1,y,12,2,"#FFD86B");P(x+2,y-1,3,1,"#FFF1B8");P(x+8,y-1,3,1,"#FFD86B");
  if(!reduced&&((t*3|0)%4===0))P(x+4+((t*5|0)%6),y-2,1,1,"#FFFFFF")}
function coinStack(x,y,n,t,i){for(let j=0;j<n;j++){P(x,y-j*2,5,2,j%2?"#D9A93F":"#FFD86B");P(x,y-j*2,5,1,"#FFF1B8")}if(!reduced&&((t*2+i)|0)%5===0&&n>0)P(x+1+(i%3),y-n*2-1,1,1,"#FFFFFF")}
const DYN={
  lib:(r,Z,t,wk)=>{olive(r.x+4,r.y+r.h-23,t);brazier(r.x+81,r.y+r.h-17,t,r.color,wk);scrollRoll(r.x+70,r.y+r.h-7,r.color);scrollRoll(r.x+73,r.y+r.h-10,"#C69CFF")},
  map:(r,Z,t,wk)=>{portal(Z.ZR.x+1,Z.ZR.y+2,t,wk);torch(r.x+r.w-4,r.y+10,t,"#FFB04A");torch(Z.ZR.x-4,r.y+10,t,"#B79CFF");signpost(Z.ZF.x+(r.top?6:10),Z.ZF.y+(r.top?1:2),t)},
  gym:(r,Z,t,wk)=>{medalBoard(Z.ZR.x,Z.ZR.y,r);rack(Z.ZR.x+2,Z.ZR.y+30);dummy(Z.ZF.x+4,Z.ZF.y-1,t);P(Z.ZF.x+26,Z.ZF.y+12,8,4,"#3A3550");P(Z.ZF.x+27,Z.ZF.y+11,6,1,"#AFAFC4")},
  ctrl:(r,Z,t,wk)=>{forge(Z.ZR.x,Z.ZR.y+14,t,wk);smoke(Z.ZR.x+17,Z.ZR.y+2,t,5);barrel(Z.ZF.x+2,Z.ZF.y+7,t);toolRack(Z.ZF.x+16,Z.ZF.y-1);P(Z.ZF.x+24,Z.ZF.y+10,9,4,"#2A2030");P(Z.ZF.x+25,Z.ZF.y+9,3,1,"#7A3A2A")},
  bank:(r,Z,t,wk)=>{const fc=finCalc(S.fin);const rw=isFinite(fc.runway)?fc.runway:24;const base=Z.ZR.y+Z.ZR.h-2;
    [Math.min(12,2+Math.round(rw/2)),Math.min(9,Math.round(rw/3)+1),Math.min(6,Math.round(rw/4)+1)].forEach((n,i)=>coinStack(Z.ZR.x+(Z.ZR.w>10?i*4:0)-(Z.ZR.w<=10?i*0:0),base,Math.min(n,Math.floor((Z.ZR.h-4)/2)),t,i));
    chest(Z.ZF.x+2,Z.ZF.y+1,t,wk)},
  studio:(r,Z,t,wk)=>{brazier(Z.ZR.x,Z.ZR.y+Z.ZR.h-14,t,r.color,wk)}
};
/* ---------- el escritorio de cada sala: atril, altar, yunque, mesa de cuenta ---------- */
const DESKS={
  lib:(r,t,wk)=>{const dx=r.desk.x,dy=r.desk.y;P(dx-2,dy+4,5,6,"#4A3A28");P(dx-7,dy-2,15,6,"#6B4A2A");P(dx-7,dy-2,15,1,"#8A6038");
    P(dx-6,dy-5,7,5,"#F1EDFF");P(dx+1,dy-5,7,5,"#E2DDF6");P(dx,dy-5,1,5,"#B8B0E0");
    for(let i=0;i<3;i++){const lw=wk?(((t*9)+i*3)|0)%5+1:4;P(dx-5,dy-4+i,Math.min(lw,5),1,r.color);P(dx+2,dy-4+i,wk?Math.min(5,(((t*7)+i*4)|0)%5+1):3,1,"#8A82C0")}
    if(wk)GLOW(dx+1,dy-4,12,r.color,.22)},
  map:(r,t,wk)=>{const dx=r.desk.x,dy=r.desk.y;P(dx-8,dy+2,17,6,"#35296E");P(dx-8,dy+2,17,1,"#6E66A8");P(dx-7,dy+8,2,3,"#241C4E");P(dx+6,dy+8,2,3,"#241C4E");
    P(dx-6,dy-3,6,5,"#E7DFC0");P(dx+1,dy-3,7,5,"#D8CFAA");P(dx,dy-3,1,5,"#A89A70");P(dx-5,dy-1,3,1,"#5B45C9");P(dx+3,dy-2,3,1,"#E3A64B");
    flame(dx-9,dy+1,t,"#B79CFF",false);flame(dx+9,dy+1,t,"#FFB04A",false);if(wk)GLOW(dx,dy,14,"#C69CFF",.2)},
  gym:(r,t,wk)=>{const dx=r.desk.x,dy=r.desk.y;P(dx-9,dy+5,18,3,"#6B4A2A");P(dx-9,dy+5,18,1,"#8A6038");P(dx-8,dy+8,2,3,"#4A3018");P(dx+6,dy+8,2,3,"#4A3018");
    const lift=wk&&!reduced?(((t*3)|0)%2?-1:0):0;P(dx-9,dy+lift,18,1,"#C9C9D8");P(dx-11,dy-2+lift,3,6,"#3A3550");P(dx+8,dy-2+lift,3,6,"#3A3550");P(dx-12,dy-1+lift,1,4,"#5A5470");P(dx+11,dy-1+lift,1,4,"#5A5470")},
  ctrl:(r,t,wk)=>{const dx=r.desk.x,dy=r.desk.y;P(dx-4,dy+5,9,6,"#5A3E28");P(dx-5,dy+10,11,2,"#3A281C");P(dx-9,dy+1,19,4,"#4A4A66");P(dx-9,dy+1,19,1,"#8A8AA8");P(dx-12,dy+1,4,2,"#4A4A66");P(dx-4,dy+5,9,1,"#2A2840");
    const hot=wk||(!reduced&&((t*.9)%2.2)<1.2);if(hot){P(dx-3,dy,6,1,wk?"#FFB04A":"#FF8A3D");P(dx-1,dy-1,3,1,"#FFD86B");GLOW(dx,dy,13,"#FF8A3D",wk?.35:.2)}},
  bank:(r,t,wk)=>{const dx=r.desk.x,dy=r.desk.y;P(dx-10,dy+3,20,6,"#1F4A3E");P(dx-10,dy+3,20,1,"#3A7A62");P(dx-9,dy+9,2,3,"#123028");P(dx+7,dy+9,2,3,"#123028");
    coinStack(dx-8,dy+2,3,t,0);coinStack(dx-2,dy+2,2,t,1);coinStack(dx+4,dy+2,4,t,2);if(wk&&!reduced){const hop=((t*6)|0)%3;P(dx+9,dy-1-hop,2,2,"#FFD86B")}},
  studio:(r,t,wk)=>{const dx=r.desk.x,dy=r.desk.y;P(dx-9,dy+3,18,5,"#3B3070");P(dx-9,dy+3,18,1,"#6E66A8");P(dx-5,dy-5,10,7,"#120F3A");P(dx-4,dy-4,8,5,wk?r.carpet:"#241F40")}
};
function drawDesk(r,t,wk){(DESKS[r.kind]||DESKS.studio)(r,t,wk)}
function drawRoom(r,t){
  const {x,y,w,color}=r;const a=SC.agents[r.dept.id];const wk=!!(a&&a.state==="working");const th=THEME[r.kind]||THEME.studio,Z=zones(r);
  for(let wx=x+8;wx<x+w-9;wx+=12)if(r.top||Math.abs(wx+1-r.cx)>9)P(wx,y+2,3,2,wk?(((t*5+wx)|0)%2?color:color+"88"):"#323A80");
  (DYN[r.kind]||DYN.studio)(r,Z,t,wk);
  const ce=EDGES.filter(e=>e.type==="carpet"&&NODES[e.a].room===r.dept.id);
  drawDesk(r,t,wk);
}
/* ---------- el centro: la tarima de Odín, con su aura y su anillo de runas ---------- */
function drawNexo(t){
  const run=!!running,th=SC.think?1:0,act=run||th;const pa=(Math.sin(t*2)+1)/2;
  GLOW(160,88,act?34:24,GOLD,act?.34+pa*.1:.16+pa*.04);
  /* anillo de runas que gira: más rápido y brillante en misión */
  const n=8,sp=reduced?0:t*(run?.9:.25),rx=22,ry=17.5;
  for(let i=0;i<n;i++){const an=sp+i*(Math.PI*2/n);const px=160+Math.cos(an)*rx,py=90+Math.sin(an)*ry;const on=act&&((i+(t*(run?6:3)|0))%3===0);rune(Math.round(px)-1,Math.round(py)-2,i*3+2,on?"#FFF3C4":act?GOLD:GOLD+"77");if(on)GLOW(Math.round(px),Math.round(py),6,GOLD,.28)}
  if(act&&!reduced){for(let i=0;i<10;i++){const ph=(t*.6+i*.1)%1;const an=i*.9+t*.3;P(160+Math.round(Math.cos(an)*(6+ph*16)),88-Math.round(ph*26)+Math.round(Math.sin(an)*3),1,1,i%2?"#FFE9A6":"#FFFFFF")}}
  G.fillStyle="rgba(0,0,0,.38)";G.beginPath();G.ellipse(160,93,11,3,0,0,Math.PI*2);G.fill();
  const a={look:{},color:GOLD};
  FIG.nexo(a,160,92,t,{think:th,run,perched:Math.max(0,2-SC.pulses.length*2),talk:performance.now()<(NEXO_T.talkUntil||0)&&((t*8|0)%2)===1,still:false});
}
/* =================== ARTE MÍTICO: agentes, rastros de luz, cuervos y partículas =================== */
const ICONS={"!":["..#..","..#..","..#..",".....","..#.."],"?":[".###.","...#.","..##.",".....","..#.."],"z":["####.","..#..",".#...","####.","....."],"$":[".###.","#.#..",".###.","..#.#",".###."],"♪":["..###","..#.#","..#..","###..","##..."],"♥":[".#.#.","#####","#####",".###.","..#.."]};
const ICOL={"!":"#E5484D","?":"#3A8FD9","z":"#8A6FE0","$":"#2E9E5B","♪":"#C2410C","♥":"#E5487D"};
function drawEmote(a,x,y,t){
  let k=null;if(a.state==="working")k="…";else if(a.emote&&performance.now()<a.emote.until)k=a.emote.k;if(!k)return;
  const top=y-(a.isCmd?30:35);P(x-4,top,9,7,"#F7F3FF");P(x-3,top-1,7,1,"#F7F3FF");P(x-3,top+7,7,1,"#F7F3FF");P(x-1,top+8,2,1,"#F7F3FF");
  if(k==="…"){const n=reduced?3:(t*3|0)%4;for(let i=0;i<3;i++)P(x-3+i*3,top+3,1,1,i<n?"#16122B":"#C9C4E6");return}
  const bm=ICONS[k];if(!bm)return;bm.forEach((row,ry)=>{for(let rx=0;rx<5;rx++)if(row[rx]==="#")P(x-2+rx,top+1+ry,1,1,ICOL[k])});
}
function drawAgent(a,t,opt){
  opt=opt||{};const x=Math.round(a.x);const walking=!opt.still&&a.path&&a.path.length>0;const now=performance.now();
  let hop=0;if(!opt.still&&!walking&&!reduced&&a.kind==="gym"&&a.state==="idle"){const k=(t+a.seed)%6;if(k>2.4&&k<3.3)hop=-Math.round(Math.abs(Math.sin((k-2.4)*Math.PI*3.3))*2)}
  const y=Math.round(a.y)+hop;const step=walking?((a.ph|0)%2):0;const dir=a.dir||1;
  if(!opt.still)P(x-4,Math.round(a.y),9,1,"rgba(0,0,0,.45)");
  const o={still:!!opt.still,walking,step,dir,blink:!opt.still&&a.blinkT>0,talk:!opt.still&&now<(a.talkUntil||0)&&((t*8|0)%2)===1,happy:!!opt.still||!!(a.emote&&a.emote.k==="♥"&&now<a.emote.until),work:a.state==="working"&&!walking,idle:!opt.still&&!walking&&a.state==="idle"&&!a.isCmd&&!reduced,tt:t+(a.seed||0)};
  (a.isCmd?FIG.cmd:(FIG[a.kind]||FIG.studio))(a,x,y,t,o);
  if(!opt.still)drawEmote(a,x,y,t);
}
/* ---------- senderos de runas: se encienden donde pisa o pasa información ---------- */
function litEdge(k,c,al){
  const ab=k.split("|");const A=NODES[ab[0]],B=NODES[ab[1]];if(!A||!B)return;
  const carpet=A.type==="carpet"||B.type==="carpet";
  G.globalAlpha=al*.3;strip({a:ab[0],b:ab[1]},carpet?3:5,c);G.globalAlpha=1;
  const rl=RUNE_BY[k];
  if(rl)rl.forEach((q,i)=>{const pu=reduced?1:.7+.3*Math.sin(SC.t*8-i*1.4);G.globalAlpha=Math.min(1,al*pu);rune(q.x-1,q.y-2,q.g,c);G.globalAlpha=Math.min(1,al*.9);P(q.x-1,q.y-2,1,1,"#FFFFFF");G.globalAlpha=1;GLOW(q.x,q.y,6,c,.2*al)});
  [A,B].forEach(n=>{if(n.type==="hall"){G.globalAlpha=Math.min(1,al);sigil(n.x,n.y,c,HALL);G.globalAlpha=1}});
}
function drawTrails(){for(const k in SC.trail){const tr=SC.trail[k];const age=SC.t-tr.t;if(age>1.6){delete SC.trail[k];continue}litEdge(k,tr.c,1-age/1.6)}}
/* ---------- misión en curso: senderos encendidos y hilos de luz entre los que participan ---------- */
SC.party=[];SC.partyEdges=[];SC.fx=[];SC.birds=[];
function setParty(ids){
  SC.party=(ids||[]).filter((id,i,arr)=>SC.agents[id]&&arr.indexOf(id)===i);SC.partyEdges=[];
  SC.party.forEach(id=>{const a=SC.agents[id];const r=a.room;let prev=r.entry;SC.partyEdges.push({spoke:true,to:r.entry,c:a.color});
    route(r.entry,a.home).forEach(n=>{SC.partyEdges.push({k:prev<n?prev+"|"+n:n+"|"+prev,c:a.color});prev=n})});
}
function spokeLine(x0,y0,x1,y1,c,t){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let i=5;i<n-3;i+=3){if(((i/3|0)+(reduced?0:(t*10|0)))%3)continue;P(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n,1,1,c)}}
function thread(A,B,t){
  const ax=A.room.cx,ay=A.room.y+A.room.h/2,bx=B.room.cx,by=B.room.y+B.room.h/2;const mx=(ax+bx)/2,my=(ay+by)/2;const dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy)||1;const cx=mx-dy/L*16,cy=my+dx/L*16;
  const pt=f=>({x:(1-f)*(1-f)*ax+2*(1-f)*f*cx+f*f*bx,y:(1-f)*(1-f)*ay+2*(1-f)*f*cy+f*f*by});
  for(let i=0;i<=44;i++){if(i%2)continue;const q=pt(i/44);G.globalAlpha=.55;P(q.x,q.y,1,1,i<22?A.color:B.color);G.globalAlpha=1}
  for(let k=0;k<3;k++){const f=((reduced?.5:t*.35)+k/3)%1;const q=pt(f);GLOW(q.x,q.y,5,f<.5?A.color:B.color,.4);P(q.x-1,q.y,3,1,"#FFFFFF");P(q.x,q.y-1,1,3,"#FFFFFF")}
}
function drawParty(t){
  if(!SC.party.length)return;const pl=reduced?.8:.62+.2*Math.sin(t*3);
  SC.partyEdges.forEach(e=>{if(e.spoke){const n=NODES[e.to];if(n)spokeLine(160,88,n.x,n.y,e.c,t)}else litEdge(e.k,e.c,pl)});
  SC.party.forEach(id=>{const r=SC.rooms[id];if(!r)return;G.globalAlpha=.4+(reduced?0:.25*Math.sin(t*3+r.x));G.strokeStyle=r.color;G.lineWidth=1;G.strokeRect(r.x-.5,r.y-.5,r.w+1,r.h+1);G.globalAlpha=1});
  for(let i=1;i<SC.party.length;i++){const A=SC.agents[SC.party[i-1]],B=SC.agents[SC.party[i]];if(A&&B)thread(A,B,t)}
}
/* ---------- cuervos Hugin y Munin: salen de Odín hacia el agente que recibe la orden ---------- */
const RAVEN_SEND=["Hugin, Munin: lleven mi palabra a {n}.","Vuelen, cuervos. {n} espera.","Hugin al oído de {n}; Munin, tras él."];
function ravenRoute(a,toDoor){const r=a.room;const ids=[r.entry].concat(route(r.entry,toDoor?"D:"+a.id:a.home));return ids}
function pulse(a,color,opts){opts=opts||{};return new Promise(res=>{
  const ids=ravenRoute(a,opts.idle);const pts=[{x:160,y:80}].concat(ids.map(id=>NODES[id]));let len=0;for(let i=1;i<pts.length;i++)len+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
  SC.pulses.push({pts,ids,color,d:0,len,speed:reduced?4000:opts.idle?70:120,res,ph:"out",idle:!!opts.idle,who:a.id});
  if(!opts.idle&&!reduced)bubble(NEXO_T,pickOne(RAVEN_SEND).replace("{n}",a.name||""),1900,GOLD,{drop:true});
})}
function stepPulses(dt){
  SC.pulses=SC.pulses.filter(p=>{
    p.d+=p.speed*dt;
    if(p.ph==="out"){const q=posAt(p,Math.min(p.d,p.len));if(q.i>=2&&p.ids[q.i-1])trailMark(p.ids[q.i-2],p.ids[q.i-1],p.color);
      if(p.d>=p.len){p.res();p.ph="back";p.d=0;p.ids=p.ids.slice().reverse();p.pts=p.ids.map(id=>NODES[id]).concat([{x:160,y:80}]);p.hold=p.idle?.4:.5}return true}
    if(p.hold>0){p.hold-=dt;p.d=0;return true}
    const q=posAt(p,Math.min(p.d,p.len));if(q.i>=1&&q.i<=p.ids.length-1)trailMark(p.ids[q.i-1],p.ids[q.i],p.color);
    return p.d<p.len;
  });
}
function drawPulses(t){
  SC.pulses.forEach(p=>{
    const d=Math.min(p.d,p.len);const fr=[0,1,2,1][(t*13|0)%4];
    for(let k=1;k<=5;k++){const q=posAt(p,Math.max(0,d-k*5));G.globalAlpha=.5-k*.08;P(q.x,q.y+2,1,1,p.color);G.globalAlpha=1}
    [[0,0],[12,3]].forEach(([lag,off],i)=>{if(p.hold>0&&i===1&&p.ph==="back"){}
      const q=posAt(p,Math.max(0,d-lag)),q2=posAt(p,Math.max(0,d-lag-3));const s=q.x>=q2.x?1:-1;const fl=reduced?0:Math.round(Math.sin(t*9+i*2)*1.5);
      GLOW(q.x,q.y,7,p.color,.22);ravenFly(Math.round(q.x),Math.round(q.y+off*(i?.3:0)+fl),s,fr)});
  });
}
/* ---------- partículas lentas, chispas de la forja y destellos ---------- */
const MOTES=(()=>{const a=[];let s=11;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;for(let i=0;i<24;i++)a.push({x:rnd()*W,y:rnd()*H,vx:(rnd()-.5)*2.4,vy:-(.9+rnd()*2.4),c:["#FFE9A6","#9FE8FF","#C69CFF","#AEB8F0"][i%4],ph:rnd()*6});return a})();
function stepMotes(dt){if(reduced)return;MOTES.forEach(m=>{m.x+=m.vx*dt;m.y+=m.vy*dt;if(m.y<-2){m.y=H+2;m.x=Math.random()*W}if(m.x<-2)m.x=W+2;if(m.x>W+2)m.x=-2})}
function drawMotes(t){MOTES.forEach(m=>{const tw=reduced?.7:.5+.45*Math.sin(t*1.7+m.ph);G.globalAlpha=tw*.85;P(m.x,m.y,1,1,m.c);G.globalAlpha=tw*.28;P(m.x-1,m.y,3,1,m.c);P(m.x,m.y-1,1,3,m.c);G.globalAlpha=1})}
function drawStars(t){STARS.forEach((s,i)=>{if(i%3)return;const tw=reduced?1:(Math.sin(t*1.3+s.tw)+1)/2;if(tw>.7){G.globalAlpha=.95;P(s.x,s.y,1,1,"#FFFFFF");G.globalAlpha=.35;P(s.x-1,s.y,3,1,s.c);P(s.x,s.y-1,1,3,s.c);G.globalAlpha=1}})}
function emit(x,y,n,cols,o){if(reduced)return;o=o||{};for(let i=0;i<n;i++){const an=(o.up?-Math.PI/2+(Math.random()-.5)*1.6:Math.random()*Math.PI*2),sp=(o.sp||26)*(.4+Math.random()*.8);SC.fx.push({x,y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,g:o.g===undefined?60:o.g,life:0,max:(o.life||.7)*(.6+Math.random()*.6),c:cols[i%cols.length]})}if(SC.fx.length>160)SC.fx.splice(0,SC.fx.length-160)}
function stepFx(dt){SC.fx=SC.fx.filter(f=>{f.life+=dt;f.vy+=f.g*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;return f.life<f.max})}
function drawFx(){SC.fx.forEach(f=>{G.globalAlpha=Math.max(0,1-f.life/f.max);P(f.x,f.y,1,1,f.c);G.globalAlpha=1})}
function ambientFx(dt,t){
  if(reduced||document.hidden)return;
  Object.values(SC.agents).forEach(a=>{const r=a.room;if(!r)return;const Z=zones(r),wk=a.state==="working";
    if(r.kind==="ctrl"){if(Math.random()<dt*(wk?10:4))emit(Z.ZR.x+11,Z.ZR.y+26,1,["#FFB04A","#FFD86B","#FF8A3D"],{up:true,sp:30,g:30,life:1.1});
      const rate=wk?1.0:2.2,ph=((t+a.seed)%rate)/rate;if((a.lph||0)<.55&&ph>=.55&&!(a.path&&a.path.length))emit(r.desk.x,r.desk.y,wk?14:9,["#FFD86B","#FFB04A","#FFFFFF","#FF8A3D"],{sp:44,g:90,life:.55});a.lph=ph}
    if(r.kind==="bank"&&Math.random()<dt*2)emit(Z.ZR.x+3+Math.random()*6,Z.ZR.y+Z.ZR.h-10-Math.random()*10,1,["#FFFFFF","#FFF1B8"],{sp:3,g:-4,life:.5});
    if(r.kind==="lib"&&Math.random()<dt*1.6)emit(r.x+85,r.y+r.h-20,1,[r.color,"#FFFFFF"],{up:true,sp:12,g:-8,life:1.2});
    if(r.kind==="gym"&&a.state==="idle"){const k=(t+a.seed)%6;if(k>3.2&&k<3.3&&!(a.path&&a.path.length))emit(a.x,a.y,6,["#8A7468","#6A5448"],{sp:16,g:-6,life:.5})}
  });
}
/* idle de Odín: un cuervo hace una ronda hasta la puerta de un agente y vuelve */
function scout(){const list=Object.values(SC.agents).filter(a=>atHome(a));if(!list.length)return;const a=pickOne(list);pulse(a,a.color,{idle:true})}
/* =================== CIELO VIVO Y DESTELLOS (capa de DOM) =================== */
/* Constelaciones y motas que se mueven despacio detrás de toda la app (fijo, ~24 fps; estático con movimiento reducido). */
(function sky(){
  const cvs=document.createElement("canvas");cvs.id="sky";cvs.setAttribute("aria-hidden","true");document.body.insertBefore(cvs,document.body.firstChild);
  const g=cvs.getContext("2d");if(!g)return;
  let w=0,h=0,dpr=1,lastDraw=0,running_=false;
  let sd=20261009;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
  const COLS=["#FFE9A6","#9FE8FF","#AEB8F0","#C69CFF","#FFFFFF","#AEB8F0"];
  const ST=[];for(let i=0;i<170;i++)ST.push({x:rnd(),y:rnd(),r:.5+rnd()*1.15,c:COLS[(rnd()*COLS.length)|0],ph:rnd()*6.3,sp:.4+rnd()*1.5,dr:.5+rnd()*1.8});
  const CON=[[[.05,.11],[.09,.17],[.14,.13],[.18,.21],[.13,.27]],[[.84,.07],[.88,.14],[.93,.11],[.91,.21],[.86,.25],[.88,.14]],[[.03,.60],[.08,.56],[.12,.64],[.07,.73],[.03,.60]],[[.90,.56],[.94,.64],[.88,.70],[.93,.80]],[[.38,.03],[.44,.06],[.51,.03],[.57,.07]],[[.52,.92],[.58,.96],[.64,.92],[.71,.97]],[[.22,.86],[.27,.80],[.33,.84],[.30,.93]]];
  let shoot=null,nextShoot=9;
  function size(){dpr=Math.min(window.devicePixelRatio||1,1.5);w=window.innerWidth;h=window.innerHeight;cvs.width=Math.round(w*dpr);cvs.height=Math.round(h*dpr);cvs.style.width=w+"px";cvs.style.height=h+"px"}
  function draw(t){
    g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
    const sy=window.scrollY||0;
    CON.forEach((cn,ci)=>{const sw=reduced?0:Math.sin(t*.05+ci*1.7)*7,sv=reduced?0:Math.cos(t*.04+ci)*4;
      g.strokeStyle="rgba(150,172,255,"+(.13+(reduced?0:.05*Math.sin(t*.6+ci*2))).toFixed(3)+")";g.lineWidth=1;g.beginPath();
      cn.forEach((q,i)=>{const x=q[0]*w+sw,y=q[1]*h+sv-sy*.03;i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke();
      cn.forEach((q,i)=>{const x=q[0]*w+sw,y=q[1]*h+sv-sy*.03,tw=reduced?.8:.6+.4*Math.sin(t*1.1+i*1.3+ci);g.fillStyle="rgba(190,205,255,"+(.5*tw).toFixed(2)+")";g.fillRect(x-1,y-1,3,3);g.fillStyle="rgba(255,255,255,"+(.8*tw).toFixed(2)+")";g.fillRect(x,y,1,1)})});
    ST.forEach(s=>{let y=s.y*h-(reduced?0:t*s.dr*2.2)-sy*(.015+.03*s.r);y=((y%h)+h)%h;const x=s.x*w+(reduced?0:Math.sin(t*.12+s.ph)*3);
      const tw=reduced?.75:.55+.45*Math.sin(t*s.sp+s.ph);g.globalAlpha=tw*.9;g.fillStyle=s.c;g.fillRect(x,y,s.r+.3,s.r+.3);
      if(s.r>1.25){g.globalAlpha=tw*.28;g.fillRect(x-1.5,y+.3,s.r+3.3,.7);g.fillRect(x+.3,y-1.5,.7,s.r+3.3)}});
    g.globalAlpha=1;
    if(!reduced){
      if(!shoot&&t>nextShoot){shoot={x:w*(.2+rnd()*.6),y:h*(.05+rnd()*.25),vx:420+rnd()*160,vy:170+rnd()*90,t0:t};nextShoot=t+14+rnd()*16}
      if(shoot){const a=t-shoot.t0;if(a>.9)shoot=null;else{const x=shoot.x+shoot.vx*a,y=shoot.y+shoot.vy*a,al=1-a/.9;const gr=g.createLinearGradient(x,y,x-shoot.vx*.12,y-shoot.vy*.12);gr.addColorStop(0,"rgba(255,246,214,"+(.9*al).toFixed(2)+")");gr.addColorStop(1,"rgba(255,246,214,0)");g.strokeStyle=gr;g.lineWidth=1.5;g.beginPath();g.moveTo(x,y);g.lineTo(x-shoot.vx*.12,y-shoot.vy*.12);g.stroke()}}
    }
  }
  function loop(ts){
    if(document.hidden){running_=false;return}
    if(ts-lastDraw>=41){lastDraw=ts;draw(ts/1000)}
    requestAnimationFrame(loop)
  }
  function start(){if(running_||reduced)return;running_=true;requestAnimationFrame(loop)}
  size();draw(3);
  window.addEventListener("resize",()=>{size();draw(performance.now()/1000)});
  if(!reduced){window.addEventListener("scroll",()=>{if(!running_)draw(performance.now()/1000)},{passive:true});document.addEventListener("visibilitychange",()=>{if(!document.hidden)start()});start()}
})();

/* ---------- destellos: chispas que salen de lo que acabas de tocar ---------- */
const FXL=document.createElement("div");FXL.id="fx-layer";FXL.setAttribute("aria-hidden","true");document.body.appendChild(FXL);
function spark(el,n,cols,o){
  if(reduced)return;o=o||{};
  let r=o.rect;if(!r&&el&&document.body.contains(el)){const b=el.getBoundingClientRect();r={left:b.left,top:b.top,width:b.width,height:b.height}}
  if(!r||(!r.width&&!r.height))return;
  const cx=r.left+(o.x!==undefined?o.x:r.width/2),cy=r.top+(o.y!==undefined?o.y:r.height/2);
  n=Math.max(1,Math.min(n||10,36));
  while(FXL.childElementCount>140)FXL.firstChild.remove();
  for(let i=0;i<n;i++){
    const p=document.createElement("i");p.className="spk"+(i%4===0?" big":"");const col=cols[i%cols.length];
    p.style.left=cx+"px";p.style.top=cy+"px";p.style.background=col;p.style.color=col;FXL.appendChild(p);
    const an=Math.random()*Math.PI*2,dist=(o.r||34)*(.45+Math.random()*.95),dx=Math.cos(an)*dist,dy=Math.sin(an)*dist-(o.lift||0);
    const a=p.animate([{transform:"translate(-50%,-50%) scale(1)",opacity:1},{transform:"translate(calc(-50% + "+dx.toFixed(1)+"px),calc(-50% + "+dy.toFixed(1)+"px)) scale(.15)",opacity:0}],{duration:520+Math.random()*420,easing:"cubic-bezier(.15,.7,.3,1)",fill:"forwards"});
    a.onfinish=()=>p.remove();
  }
}
const SPK=["#FFE9A6","#FFC15A","#FFFFFF","#9FB0FF"];
let LASTCLICK=null;
document.addEventListener("click",e=>{const t=e.target&&e.target.closest?e.target.closest("button,label.chk,summary,input[type=checkbox],a"):null;
  if(t){const b=t.getBoundingClientRect();LASTCLICK={el:t,at:performance.now(),r:{left:b.left,top:b.top,width:b.width,height:b.height}}}},true);
/* al guardar: la tarjeta se ilumina y salen chispas del botón que pulsaste */
function sparkSaved(path){
  if(/^(missions|decisions|changelog)\//.test(path))return;
  const lc=LASTCLICK;if(!lc||performance.now()-lc.at>3500)return;
  const live=document.body.contains(lc.el);
  spark(live?lc.el:null,13,SPK,{rect:live?null:lc.r,r:40});
  const card=live?lc.el.closest(".card,.forcebox,.prop,.pcard"):null;
  if(card&&!reduced){card.classList.remove("saved");void card.offsetWidth;card.classList.add("saved");setTimeout(()=>card.classList.remove("saved"),1600)}
  if(path==="days/"+today()&&score(today()).met){const dp=$("d-points");if(dp&&dp.offsetParent)spark(dp,26,SPK.concat(["#FFD27A"]),{r:70,lift:10})}
}
/* completar un hábito, un bonus o la misión del día: la runa se enciende */
function runeBurst(box,key,val,n){
  box.addEventListener("change",e=>{const t=e.target;if(!t||t.type!=="checkbox")return;const on=t.checked;const sel=key(t);if(!sel)return;
    setTimeout(()=>{const nn=box.querySelector(sel)||t;const lab=nn.closest("label")||nn;if(!lab||!document.body.contains(lab))return;
      lab.classList.add("rune-pop");setTimeout(()=>lab.classList.remove("rune-pop"),800);
      if(on)spark(nn,n,SPK,{r:30,x:20,y:lab.getBoundingClientRect().height/2})},0)});
}
(function(){
  const esc2=v=>(window.CSS&&CSS.escape)?CSS.escape(v):String(v).replace(/"/g,'\\"');
  const hb=$("d-habits"),bb=$("d-bonuses"),hq=$("h-quest");
  if(hb)runeBurst(hb,t=>t.dataset.h!==undefined?'[data-h="'+esc2(t.dataset.h)+'"]':"",0,10);
  if(bb)runeBurst(bb,t=>t.dataset.b!==undefined?'[data-b="'+esc2(t.dataset.b)+'"]':"",0,8);
  if(hq)runeBurst(hq,t=>t.id==="q-done"?"#q-done":"",0,14);
})();
/* subir de nivel: destello dorado, rayos y la runa del rango nuevo */
let LV=null;const BOOT_AT=performance.now();
function levelCheck(){
  if(!S.config)return;
  const xp=xpTotal(),lv=lvlOf(xp);levelWatch(lv,rankOf(lv),xp);
}
function levelWatch(lv,rank,xp){
  const now=performance.now();
  if(LV===null||now-BOOT_AT<12000){LV={lv:Math.max(LV?LV.lv:0,lv),xp:Math.max(LV?LV.xp:0,xp)};return}
  const recent=!!LASTCLICK&&now-LASTCLICK.at<90000;
  if(lv>LV.lv){LV={lv,xp};if(recent)levelUp(lv,rank);return}
  const gained=xp>LV.xp;LV={lv,xp};
  if(gained&&recent&&typeof VIEW!=="undefined"&&VIEW==="nexo"&&!reduced){const b=document.querySelector(".xpbar");if(b){b.classList.remove("gain");void b.offsetWidth;b.classList.add("gain");setTimeout(()=>b.classList.remove("gain"),1400)}}
}
function levelUp(lv,rank){
  const old=document.querySelector(".lvlup");if(old)old.remove();
  const o=document.createElement("div");o.className="lvlup";o.setAttribute("role","status");
  o.innerHTML='<div class="lv-rays" aria-hidden="true"></div><div class="lv-card"><small>Subes de nivel</small><b>Nv '+esc(String(lv))+'</b><span>'+esc(rank)+'</span></div>';
  document.body.appendChild(o);
  const close=()=>{o.classList.add("out");setTimeout(()=>o.remove(),600)};
  o.addEventListener("click",close);setTimeout(close,3600);
  if(!reduced){const c=o.querySelector(".lv-card");setTimeout(()=>{spark(c,34,SPK.concat(["#FFD27A","#C69CFF"]),{r:150,lift:20})},180);setTimeout(()=>spark(c,22,SPK,{r:110}),700)}
  try{bubble(NEXO_T,"Nivel "+lv+". Los cuervos lo anotaron.",4600,GOLD,{now:true});Object.values(SC.agents).forEach(a=>a.emote={k:"♥",until:performance.now()+2600})}catch(e){}
}
/* =================== ORQUESTACIÓN =================== */
let running=false,ctl=null,stopFlag=false,PHASE="";
const ODIN={think:["Déjenme mirar lo que viene…","Hugin, Munin: escuchen la orden…","Veo el camino. Un momento…"],sync:["Los cuervos vuelven con noticias…","Hugin piensa, Munin recuerda. Integro…","Escucho a todos. Un momento…"]};
function logCtx(d){const l=logOf(d),tg=f=>{const t=tagLabel(l.tags[f]);return t?" ["+t+"]":""};
  return LF.map(([f,n],i)=>l[f].trim()?" | "+["hice","aprendió","se trabó en","decidió","siguiente paso"][i]+tg(f)+": "+short(l[f].replace(/\s+/g," "),i===0?220:150):"").join("")+(l.closed?" | día cerrado":"")}
function skillsLine(lv){return S.skills.filter(s=>(s.level||"sinprobar")===lv).map(s=>s.name+(s.evidence?" ("+short(s.evidence,90)+")":"")).join("; ")}
const BASE_=()=>{const c=cfg();return "Trabajas para "+(c.owner||"el comandante, la persona que usa este sistema")+". Su meta: "+(c.goal||"todavía no la define; ayúdale a aclararla")+"."+(c.context?" Contexto que él mismo escribió: "+c.context:"")+" No lo encasilles en ningún rol: su camino profesional se descubre con evidencia. Cuenta como habilidad solo lo PROBADO o EN PRÁCTICA según su inventario; lo SIN PROBAR es hipótesis y nunca lo presentes como habilidad ni como el camino obvio. Escribe en español, directo, concreto y amable; nunca culpabilizante. No inventes datos que no estén en el contexto."};
const WHO=()=>cfg().owner||"el comandante";
function plannerPrompt(text,dl,all,opts){
  return BASEP()+"\n\nEres NEXO, el orquestador del centro de mando, encarnado en Odín. Tu carácter: "+TRAITS.nexo+" Que se note un poco en el tono de \"why\", sin perder claridad.\nVes el Tablero de estado, los despachos de tu escuadrón y un resumen mínimo de los datos de "+WHO()+" (respaldo). El detalle de cada área lo trae su agente: por eso los convocas.\nDepartamentos disponibles (entre paréntesis, la figura que los encarna y sus únicas fuentes):\n"+dl.map(d=>"- "+d.id+": "+d.name+" ("+gn(d)+"; fuentes: "+(SRCN[d.id]||"su área")+"). "+d.mission).join("\n")+
  "\n\nOrden de "+WHO()+": \""+text+"\"\n\n"+sourcesFor("nexo")+
  (dl.some(d=>d.id==="finanzas")?"\n\nRegla: si la orden implica dinero, compras, ingresos, tiempo de trabajo o una decisión personal, incluye al departamento finanzas.":"")+(opts&&opts.lead?"\nEsta orden es una DECISIÓN que "+WHO()+" quiere tomar. El primer departamento debe ser "+opts.lead+"; agrega 1 o 2 más solo si aportan otra perspectiva.":"")+
  (all||(opts&&(opts.lead||opts.review))?"":"\n\nPrimero: si la orden es sobre todo para REGISTRAR algo que "+WHO()+" ya hizo (un avance, un commit, un repo subido, un proyecto nuevo, algo que aprendió, un hábito cumplido) y no pide análisis, consejo ni plan, responde solo {\"mode\":\"registro\"} y nada más.")+
  "\n\nDecide qué departamentos intervienen"+(all?" (en esta orden participan TODOS)":" (1 a 3, solo los necesarios)")+". El orden de trabajo es fijo (Heracles → Moneta → Jano → Atenea → Hefesto) y tú cierras: cada uno lee los despachos anteriores. Responde solo con JSON: {\"title\":\"título de la misión, máx 6 palabras\",\"why\":\"una frase sobre el plan\",\"plan\":[{\"dept\":\"id\",\"task\":\"instrucción concreta, máx 25 palabras\"}]}";
}
function agentPrompt(d,task,text,prior,src,proposed,cap,noap){
  const th=threadOf(d.id);
  return BASEP()+"\nRol de Claude en sus proyectos de código: "+(cfg().aiRole||"copiloto con explicación")+
  "\n\nEres el agente del departamento "+d.name+(gn(d)!==d.name?", encarnado en "+gn(d):"")+". Tu misión permanente: "+d.mission+(TRAITS[d.id]?"\nTu carácter: "+TRAITS[d.id]+" Que se note un poco en el tono, sin perder claridad.":"")+
  exText(d.id)+(d.id==="habitos"?EN_COACH:"")+
  "\n\nOrden original de "+WHO()+": \""+text+"\"\nTu tarea asignada por Odín: "+task+
  "\nTus FUENTES son solo las de abajo ("+(SRCN[d.id]||"tu área")+"). No ves nada más: si algo no está en ellas, no lo sabes; no lo inventes. No le hagas preguntas a "+WHO()+" salvo una, en el campo pregunta, y solo si de verdad falta un dato para decidir."+
  "\n\n"+dossierText(d.id)+
  (th.summary?"\n\nRESUMEN DE TU HILO CON "+WHO()+": "+th.summary:"")+
  (prior.length?"\n\nDESPACHOS ANTERIORES DE ESTA MISIÓN (léelos y construye sobre ellos; no los repitas):\n"+prior.map(despLine).join("\n"):"")+
  (proposed&&proposed.length?"\n\nYa se propuso en esta misión (NO repitas ni reformules estas propuestas; si no tienes algo distinto, deja proposals vacío):\n"+proposed.map(s=>"- "+s).join("\n"):"")+
  "\n\nFUENTES\n"+srcHeader(d.id)+emptyRule(d.id)+"\n"+src+
  "\n\nAUTORREVISIÓN (hazla en silencio antes de responder; no la menciones): 1) ¿la evidencia cita un dato concreto que aparece en tus FUENTES? 2) ¿la duración cabe en la capacidad de hoy"+(cap&&cap.min?" ("+cap.min+" min, según "+(cap.from||"Heracles")+")":cap&&cap.level?" (capacidad "+cap.level+", según "+(cap.from||"el Tablero")+")":d.id==="habitos"?" (tú la defines en capacidad)":" (sin dato de capacidad: sé conservador)")+"? 3) ¿dice cómo sabrá "+WHO()+" que terminó? 4) ¿no repite algo que "+WHO()+" marcó como «No aplica»"+(noap&&noap.length?" ("+noap.map(x=>short(x,90)).join("; ")+")":"")+"? Si falla una, corrígela antes de responder."+
  "\n\nEntrega tu DESPACHO. Responde solo con JSON: {\"hallazgo\":\"lo más importante que ves en tu área, máx 160 caracteres\",\"evidencia\":\"el dato concreto de tus FUENTES que lo sostiene (cifra, fecha, nombre o cita corta), máx 200 caracteres; si no citas un dato concreto, Odín descarta tu despacho\",\"recomendacion\":{\"accion\":\"qué hacer, concreta, máx 140 caracteres\",\"duracion\":\"cuánto toma, ej. 25 min\",\"terminado\":\"criterio observable de terminado, máx 110 caracteres\"},\"confianza\":\"alta|media|baja\",\"para\":{\"agente\":\"id del destinatario: habitos|finanzas|carrera|aprendizaje|sistema|nexo\",\"porque\":\"por qué le sirve, máx 110 caracteres\"},\"pregunta\":\"opcional: una pregunta a "+WHO()+" solo si falta un dato clave; si no, cadena vacía\",\"faltan\":[\"0 a 3 datos concretos que "+WHO()+" aún no ha registrado y que necesitas; vacío si tienes lo necesario\"],"+(d.id==="habitos"?"\"capacidad\":{\"nivel\":\"alta|media|baja\",\"minutos\":minutos realistas disponibles hoy para TODO lo que recomiende el escuadrón (número)},":"")+"\"sobre_ti\":[\"0 a 2 hechos duraderos de "+WHO()+" en tu área que tus fuentes muestran y aún no están en tu expediente\"],\"patron\":null o {\"texto\":\"un patrón de conducta que se repite en tus fuentes y no está en el perfil, máx 100 caracteres\",\"evidencia\":\"dato concreto\"},\"detalle\":\"opcional: desarrollo en viñetas con '- ', máx 500 caracteres\",\"proposals\":[...]}. Propuestas opcionales (máx 4, solo si aportan), cada una de un tipo: {\"type\":\"card\",\"front\":\"pregunta\",\"back\":\"respuesta\",\"topic\":\"tema\"} | {\"type\":\"project\",\"title\":\"...\",\"area\":\"Portafolio|Negocio|Aprendizaje|Creativo\",\"stack\":\"herramientas que de verdad usa o practica\",\"goal\":\"qué demuestra o para qué sirve\"} | {\"type\":\"skill\",\"name\":\"habilidad\",\"level\":\"probada|practica|sinprobar\",\"evidence\":\"evidencia concreta tomada de tus fuentes\"} (skill solo si tus fuentes muestran evidencia nueva). No dupliques tarjetas, proyectos ni habilidades existentes.";
}
function synthPrompt(text,acc,rej,opts,stuck,stats){
  const now=new Date(),dec=opts&&opts.decision;
  return BASEP()+"\n\nEres NEXO, encarnado en Odín. Tu carácter: "+TRAITS.nexo+" Que se note un poco en el tono del resumen, sin perder claridad ni números."+
  "\nIntegra los despachos de tu escuadrón para la orden de "+WHO()+": \""+text+"\""+
  "\nVes los DESPACHOS, el TABLERO DE ESTADO y un RESUMEN MÍNIMO de sus datos como respaldo; no ves el detalle de cada área. Hora local: "+pad(now.getHours())+":"+pad(now.getMinutes())+" del "+today()+" ("+pretty(today())+")."+
  exText("nexo")+
  "\n\nDESPACHOS (en el orden en que se entregaron):\n"+acc.map(despLine).join("\n")+
  (rej.length?"\n\nDESCARTADOS AUTOMÁTICAMENTE por no citar un dato concreto (no los uses para decidir):\n"+rej.map(o=>"- ["+o.agent+"] "+nameOf(o.agent)+": "+(o.hallazgo||"sin hallazgo")+" ("+o.motivo+")").join("\n"):"")+
  "\n\n"+sourcesFor("nexo")+
  "\n\nReglas:\n1) Rechaza toda recomendación cuya evidencia no sea un dato concreto: ponla en descartados con el motivo y no la uses.\n2) Da de 1 a 3 acciones para hoy, cada una con hora sugerida (HH:MM), criterio de terminado y basado_en (ids de los despachos que la sostienen). Respeta las restricciones del perfil y nunca recomiendes lo que el perfil dice que NO quiere.\n3) Si dos despachos chocan (tiempo, dinero, energía o prioridad), explica en conflicto cómo lo resolviste y por qué; si no hay choque, cadena vacía.\n4) Actualiza el Tablero de estado: capacidad de hoy (alta|media|baja y por qué), urgencia, dirección, huecos (datos que faltan y preguntas abiertas de los despachos) y misión del día (concreta y medible).\n8) Un despacho marcado SIN DATOS significa que "+WHO()+" aún no registró nada en esa área: no inventes por ese agente. NUNCA digas «no hay datos» como resumen: arma el Tablero con lo que sí hay (despachos con datos y el RESUMEN MÍNIMO), pon en huecos cada dato que falta con la pregunta concreta, y si ninguna acción es posible, la acción de hoy es registrar ese dato (con hora y criterio de terminado)."+
  (stuck&&stuck.length?"\n5) Estas misiones ya fallaron dos o más veces porque "+WHO()+" no supo cómo: "+stuck.map(x=>"«"+x.text+"»").join("; ")+". No las repitas: si siguen siendo prioridad, divídelas en 2 a 4 pasos chicos (máx 25 min cada uno) en mision_pasos y pon como misión del día solo el primer paso.":"")+
  (stats&&stats.lines?"\n6) Es la REVISIÓN SEMANAL. Resultados por agente en 7 días (según las calificaciones de "+WHO()+" y las misiones cumplidas):\n"+stats.lines+"\nEn summary di qué agente tuvo más recomendaciones útiles y cumplidas"+(stats.best?" ("+nameOf(stats.best)+")":"")+" y por qué, con los números.":"")+
  (dec?"\n7) Es una DECISIÓN: da un veredicto explícito con base en los números.":"")+
  "\n\nResponde solo con JSON: {"+(dec?"\"verdict\":\"Sí|No|Depende|Esperar\",\"condition\":\"si es Depende o Esperar, la condición concreta; si no, cadena vacía\",":"")+"\"summary\":\"síntesis para "+WHO()+", máx 380 caracteres, sin preguntas\",\"next\":\"la siguiente acción, máx 100 caracteres\",\"acciones\":[{\"accion\":\"\",\"hora\":\"HH:MM\",\"terminado\":\"\",\"basado_en\":[\"id\"]}],\"conflicto\":\"\",\"descartados\":[{\"agente\":\"id\",\"motivo\":\"\"}],\"tablero\":{\"capacidad\":{\"nivel\":\"alta|media|baja\",\"minutos\":0,\"porque\":\"\"},\"urgencia\":\"\",\"direccion\":\"\",\"huecos\":[\"\"],\"mision_del_dia\":\"\",\"mision_pasos\":[]}}";
}
function errCopy(e){const c=e&&e.code;return {cancelled:"Misión detenida por el comandante.",not_granted:"El tablero no tiene permiso para usar Claude. Recarga la página y acepta el permiso para desplegar misiones.",sampling_disabled:"Claude no está disponible para esta cuenta desde el tablero.",rate_limited:"Llegaste al límite de uso por ahora. Intenta de nuevo más tarde.",invalid_json:"Claude respondió dos veces en un formato que no pude leer. Despliega la misión otra vez.",session_expired:"Tu sesión expiró. Vuelve a iniciar sesión.",refused:"Claude no aceptó esta orden. Reformúlala.",prompt_too_large:"Hay demasiados datos para enviar. Intenta una orden más específica.",no_key:"Agrega tu API key de Anthropic en el engranaje → Ajustes para activar a los agentes.",bad_key:"Tu API key de Anthropic no es válida. Revísala en el engranaje → Ajustes.",billing:"Tu cuenta de la API de Anthropic no tiene saldo. Recarga créditos en console.anthropic.com.",bad_model:"El modelo configurado no existe o no está disponible para tu cuenta. Cámbialo en el engranaje → Ajustes.",overloaded:"Los servidores de Claude están saturados. Intenta de nuevo en un momento.",network:"No hubo conexión con la API de Anthropic. Revisa tu internet.",invalid_request:"La API rechazó la petición. Revisa los modelos en el engranaje → Ajustes."}[c]||"Se perdió la conexión con Claude. Despliega la misión otra vez."}
/* si la respuesta no es JSON válido, se reintenta una vez pidiendo solo el objeto JSON */
const JSON_RETRY="\n\nIMPORTANTE: tu respuesta anterior no se pudo leer como JSON. Responde ÚNICAMENTE con el objeto JSON, completo y válido: sin texto antes ni después, sin ``` y sin comentarios. Sé breve en cada campo.";
async function callJson(p,tier){for(let i=0;;i++){ctl=new AbortController();try{return await sample.json(i?p+JSON_RETRY:p,{modelTier:tier,signal:ctl.signal,cache:false})}catch(e){if(i===0&&e&&e.code==="invalid_json"&&!stopFlag)continue;throw e}}}
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
function setBusy(on,label){running=on;$("scene-wrap").classList.toggle("mission",!!on);if(!on)setParty([]);$("c-ask").disabled=on||sampleOff;$("c-log").disabled=on||sampleOff;$("c-send").disabled=on||sampleOff;$("c-stop").hidden=!on;$("mbar").hidden=!on;$("mbar-t").textContent=on?(label||"En misión"):"";document.querySelectorAll("#quick button").forEach(b=>b.disabled=on||sampleOff);
  const st=$("c-state");st.className="chip "+(on?"ok":"");st.textContent=on?(label||"En misión"):"En espera";PHASE=on?(label||""):"";
  $("c-msg").innerHTML=on?`<div class="thinking"><i></i><i></i><i></i><span>${esc(label||"Trabajando")}</span></div>`:$("c-msg").innerHTML;renderRoster()}
function setPhase(t){if(!running)return;PHASE=t;$("c-state").textContent=t;$("mbar-t").textContent=t;$("c-msg").innerHTML=`<div class="thinking"><i></i><i></i><i></i><span>${esc(t)}</span></div>`;renderSummary()}

async function runMission(text,target,all,opts){
  opts=opts||{};
  if(running)return;
  if(!sample||sampleOff){toast(errCopy({code:"no_key"}));show("ajustes");return}
  const dl=depts();if(!dl.length){toast("Aún no cargan los departamentos.");return}
  stopFlag=false;SC.token++;setBusy(true,"Odín analiza la orden");
  const recall=recallAll(true);
  const mid="m"+Date.now().toString(36);
  const M={title:short(text,60),text,status:"running",origin:"nexo",steps:[],proposals:[],created:nowISO(),fuentes:{nexo:srcStat("nexo")}};
  const cold=coldStart();
  const push=(who,kind,msg,extra)=>{M.steps.push(Object.assign({who,kind,text:msg,at:nowISO()},extra||{}));S.live=Object.assign({id:mid},M);selMission=mid;renderComms();renderRoster()};
  const persist=()=>save("missions/"+mid,JSON.parse(JSON.stringify(M)));
  let redirect=false,committed=false;const desp=[];
  let cap=S.board&&S.board.date===today()&&S.board.capacity?{level:S.board.capacity.level,min:S.board.capacity.min||0,from:"el Tablero de hoy"}:null;
  /* lo aceptado queda en el chat y el expediente de cada agente; el cierre de Odín, en el suyo */
  const commit=()=>{if(committed)return;committed=true;desp.filter(o=>o.ok).forEach(o=>{
    threadPush(o.agent,{r:"a",k:"despacho",t:o.hallazgo,d:despCompact(o),ord:short(text,140),m:mid});
    dossierAdd(o.agent,{facts:o.sobre_ti,rec:Object.assign({evidencia:o.evidencia,mid},o.recomendacion),from:"misión"})})};
  try{
    push("cmd","order",text);persist();
    let plan;
    if(target){const d=dl.find(x=>x.id===target);plan=[{dept:d.id,task:text}];push("nexo","plan","Orden directa a "+gn(d)+".",{plan})}
    else{SC.think=1;bubble(NEXO_T,pickOne(ODIN.think),4000);setPhase("Odín traza el plan");
      const r=await callJson(plannerPrompt(text,dl,all,opts),"quick");
      if(r&&r.mode==="registro"&&!all&&!opts.lead&&!opts.review&&!opts.decision){redirect=true;throw{code:"redirect"}}
      plan=(Array.isArray(r.plan)?r.plan:[]).filter(p=>p&&dl.some(d=>d.id===p.dept));
      plan=plan.filter((p,i)=>plan.findIndex(x=>x.dept===p.dept)===i);
      if(all)dl.forEach(d=>{if(!plan.some(p=>p.dept===d.id))plan.push({dept:d.id,task:"Reporta el estado de tu área con un dato concreto y una recomendación."})});
      if(!plan.length)plan=[{dept:dl[0].id,task:text}];
      if(opts.lead&&dl.some(d=>d.id===opts.lead)){plan=plan.filter(p=>p.dept!==opts.lead).sort((a,b)=>canonIdx(a.dept)-canonIdx(b.dept));plan.unshift({dept:opts.lead,task:"Evalúa esta decisión con números: costo, efecto en el colchón y en la meta, y alternativas."});plan=plan.slice(0,3)}
      else plan=plan.sort((a,b)=>canonIdx(a.dept)-canonIdx(b.dept)).slice(0,all?8:3);
      if(r.title)M.title=short(r.title,60);
      if(cold&&(all||opts.why==="cold"))push("nexo","note","Arranque en frío: aún no hay despachos ni Tablero. Odín no responde «no hay datos»: lanza la ronda completa para construir el Tablero ahora.");
      push("nexo","plan",short(r.why||"Plan listo.",220),{plan,convoked:plan.length,total:dl.length,why:opts.why||""});SC.think=0}
    persist();setParty(plan.map(p=>p.dept));
    {const nm=plan.map(p=>gn(dl.find(x=>x.id===p.dept))).join(" → ");bubble(NEXO_T,mm("Convoco a "+nm),4200)}
    threadPush("nexo",{r:"u",k:"mision",t:text.slice(0,1500),m:mid},{r:"a",k:"convoca",t:"Convoco a "+plan.map(p=>gn(dl.find(x=>x.id===p.dept))).join(" → ")+" ("+plan.length+" de "+dl.length+"), y yo cierro. "+(M.steps.filter(s=>s.kind==="plan").map(s=>s.text)[0]||""),m:mid});
    await recall;
    for(let i=0;i<plan.length;i++){
      if(stopFlag)throw{code:"cancelled"};
      const p=plan[i];const d=dl.find(x=>x.id===p.dept);const a=SC.agents[d.id];
      setPhase(gn(d)+" recibe la orden");
      if(a){if(!atHome(a))await go(a,a.home,84);await pulse(a,d.color);a.emote={k:"!",until:performance.now()+1300};bubble(a,(RECV[a.kind]||RECV.studio)+mm(short(p.task,70)),2600);a.state="working";a.dir=-1;renderRoster()}
      setPhase(gn(d)+" prepara su despacho");
      const src=srcOf(d.id);M.fuentes[d.id]=srcStat(d.id);
      const proposed=M.proposals.map(x=>x.type==="card"?"Tarjeta: "+x.front:x.type==="project"?"Proyecto: "+x.title:x.type==="skill"?"Habilidad: "+x.name:"Misión del día: "+x.text);
      const noap=noAplica(d.id);
      let r;try{r=await callJson(agentPrompt(d,p.task,text,desp.filter(o=>o.ok),src,proposed,cap,noap),"default")}finally{if(a){a.state="idle";a.dir=1}}
      let o=normDesp(r,d,src);
      if(d.id==="habitos"&&o.capacidad)cap={level:o.capacidad.nivel,min:o.capacidad.minutos,from:"Heracles"};
      /* autorrevisión: si falla un punto, el agente lo corrige con el modelo rápido */
      const iss=reviewIssues(o,cap,noap,src);
      if(iss.length){setPhase(gn(d)+" revisa su despacho");let fixed=false;
        try{const r2=await callJson(revisePrompt(d,r,iss,src,cap,noap),"quick");const o2=normDesp(Object.assign({},r,r2),d,src);if(d.id==="habitos"&&!o2.capacidad&&o.capacidad)o2.capacidad=o.capacidad;
          const left=reviewIssues(o2,cap,noap,src);if(left.length<iss.length||o2.ok&&!o.ok){r=Object.assign({},r,r2);o=o2;fixed=true}}catch(e){if(e&&e.code==="cancelled")throw e}
        o.rev={issues:iss,fixed}}
      o.task=p.task;desp.push(o);
      if(o.ok){(Array.isArray(r.proposals)?r.proposals:[]).slice(0,4).forEach(pr=>{const n=normProp(pr,d);if(n&&n.type!=="quest"&&!isDup(n,M.proposals))M.proposals.push(n)});
        if(r.patron&&proposePattern(r.patron,d.id,src))push(d.id,"note",gn(d)+" propone un patrón para tu perfil: «"+short(r.patron.texto||r.patron.text,100)+"». Apruébalo o descártalo en Propuestas.")}
      push(d.id,"report",o.hallazgo||"Sin hallazgo.",{desp:o,task:p.task});
      if(!o.ok)push("nexo","reject","Odín descartó el despacho de "+gn(d)+": "+o.motivo+".",{to:d.id});
      persist();
      if(a){bubble(a,mm(short(o.hallazgo||"…",110)),5200);a.emote={k:o.ok?"♪":"?",until:performance.now()+1800}}
      const to=o.para.agente,later=plan.slice(i+1).find(x=>x.dept===to);
      if(o.ok&&later&&o.para.porque&&a&&SC.agents[to]&&to!==d.id){const b=SC.agents[to];await sleep(1100);setPhase(gn(d)+" lleva su despacho a "+b.name);
        await go(a,"G:"+b.id,62);a.dir=-1;b.dir=1;bubble(a,mm(short(o.para.porque,90)),3200);b.emote={k:"!",until:performance.now()+1500};push(d.id,"handoff",o.para.porque,{to});await sleep(1500);go(a,a.home,62)}
    }
    if(stopFlag)throw{code:"cancelled"};
    setPhase("Reunión en el Nexo");
    const inv=[...new Set(plan.map(p=>p.dept))].map(id=>SC.agents[id]).filter(Boolean);
    await Promise.all(inv.map((a,i)=>go(a,MEET[i%MEET.length],62)));
    inv.forEach(a=>a.dir=a.x<160?1:-1);
    const acc=desp.filter(o=>o.ok),rej=desp.filter(o=>!o.ok);
    if(!acc.length){M.summary="Odín descartó todos los despachos: ninguno citó un dato concreto de sus fuentes. Despliega la misión otra vez.";M.next="";M.actions=[];M.conflict=""}
    else{
      SC.think=1;bubble(NEXO_T,pickOne(ODIN.sync),5000);setPhase("Odín integra los despachos");
      const stuck=stuckMissions(),stats=opts.review?agentStats(7):null;
      if(stats)stats.lines=Object.keys(stats.st).map(id=>"- "+statLine(id,stats.st[id])).join("\n");
      /* si la síntesis de Odín no se puede leer ni al reintentar, no se pierden los despachos: se cierra con ellos y el Tablero queda como estaba */
      let syn,synFail=false;try{syn=await callJson(synthPrompt(text,acc,rej,opts,stuck,stats),"complex")}catch(e){if(!(e&&e.code==="invalid_json"))throw e;synFail=true;
        syn={summary:"Odín no pudo leer su propia síntesis (formato inválido dos veces), así que te dejo lo que trajo el escuadrón: "+acc.map(o=>nameOf(o.agent)+": "+o.hallazgo).join(" · "),next:(acc.find(o=>o.recomendacion.accion)||{recomendacion:{}}).recomendacion.accion||"",acciones:[],descartados:[],tablero:{}};
        push("nexo","note","La síntesis de Odín llegó en un formato ilegible dos veces. Guardé los despachos y el resumen sin tocar el Tablero; vuelve a desplegar la misión para el veredicto completo.")}SC.think=0;
      (Array.isArray(syn.descartados)?syn.descartados:[]).forEach(x=>{const id=agentIdFrom(x&&x.agente),o=acc.find(z=>z.agent===id);if(o){o.ok=false;o.motivo="Odín: "+(short(x.motivo,140)||"sin evidencia suficiente");push("nexo","reject","Odín descartó la recomendación de "+nameOf(id)+": "+o.motivo.replace(/^Odín: /,"")+".",{to:id})}});
      const ok2=desp.filter(o=>o.ok);
      const board=ok2.length&&!synFail?normBoard(syn,ok2,mid):null;
      M.summary=short(syn.summary,500);M.next=short(syn.next,140);M.actions=board?board.actions:[];M.conflict=board?board.conflict:"";
      if(opts.decision&&synFail)save("decisions/"+opts.decision.id,Object.assign({},opts.decision,{status:"sin evaluar",missionId:mid}));
      else if(opts.decision){const vv=["Sí","No","Depende","Esperar"].includes(syn.verdict)?syn.verdict:"Depende";M.verdict=vv;M.condition=short(syn.condition||"",200);
        save("decisions/"+opts.decision.id,Object.assign({},opts.decision,{verdict:vv,summary:M.summary,next:M.next,condition:M.condition,missionId:mid,status:"evaluada",evaluated:nowISO()}))}
      if(board&&board.quest){const hit=stuck.find(x=>overlap(x.text,board.quest)>=.5||overlap(board.quest,x.text)>=.5);
        if(hit&&board.steps.length<2){setPhase("Odín divide la misión en pasos chicos");board.steps=await splitQuest(hit.text);
          if(board.steps.length<2)board.steps=["15 min: escribe qué parte de «"+short(hit.text,60)+"» no sabes hacer y busca un ejemplo que la resuelva · terminas cuando lo anotes en Me trabé"]}
        if(hit||board.steps.length>1){board.parent=hit?hit.text:board.quest;board.quest=board.steps.length>1?"Paso 1 de "+board.steps.length+": "+board.steps[0]:board.steps[0];
          if(hit)push("nexo","note","Odín no repite «"+short(hit.text,80)+"» (falló "+hit.n+" veces por «no supe cómo»): la dividió en "+board.steps.length+" paso"+(board.steps.length===1?"":"s")+" chicos.")}}
      if(board){putDoc("system/board",board);
        if(board.quest&&!S.quests[today()])M.proposals.push(Object.assign({id:"x"+Math.random().toString(36).slice(2,9),dept:"nexo",state:"pending",type:"quest",text:short(board.quest,160)},board.steps.length>1?{steps:board.steps,parent:board.parent}:{}))}
      if(stats&&stats.best){M.best={agent:stats.best,text:statLine(stats.best,stats.st[stats.best])}}
      if(stats&&stats.worst){const w=stats.worst,wd=dl.find(x=>x.id===w),hf=SC.agents.sistema;
        if(wd&&!stopFlag){setPhase("Hefesto propone un ajuste a "+gn(wd));if(hf){hf.state="working";bubble(hf,"Esa misión rechina. La ajusto.",3000)}
          try{const t=await callJson(tunePrompt(w,stats.st[w]),"default");const nm=short(t&&t.mision,460);
            if(nm&&nm!==wd.mission){M.proposals.push({id:"x"+Math.random().toString(36).slice(2,9),dept:"sistema",state:"pending",type:"deptmission",target:w,prev:wd.mission,mission:nm,why:short(t.porque,240)});
              push("sistema","note","Hefesto propone ajustar la misión de "+gn(wd)+" (peores resultados de la semana). Apruébalo o descártalo en Propuestas.")}}
          catch(e){if(e&&e.code==="cancelled")throw e}finally{if(hf)hf.state="idle"}}}
    }
    M.rejected=desp.filter(o=>!o.ok).map(o=>({agent:o.agent,motivo:o.motivo}));
    M.status="done";push("nexo","summary",M.summary,{next:M.next});persist();
    if(opts.review){const wk=isoWeek(today());save("reviews/"+wk+"-"+Date.now().toString(36),{week:wk+" · "+today(),created:nowISO(),summary:M.summary,departments:desp.map(o=>({name:nameOf(o.agent),findings:[o.hallazgo,o.evidencia?"Evidencia: "+o.evidencia:"",o.recomendacion.accion?"Recomendación: "+o.recomendacion.accion:"",o.ok?"":"Descartado: "+o.motivo].filter(Boolean)})),actions:(M.actions||[]).map(a=>({text:(a.hora?a.hora+" · ":"")+a.accion})).concat(M.next&&!(M.actions||[]).length?[{text:M.next}]:[]),systemChanges:[]})}
    commit();
    threadPush("nexo",{r:"a",k:"resumen",t:M.summary||"Misión cerrada.",acts:M.actions||[],conf:M.conflict||"",m:mid,ds:desp.map(o=>({a:o.agent,t:short(o.hallazgo,120),ok:!!o.ok,sd:!!o.sinDatos}))});
    (M.actions||[]).forEach((x,i)=>dossierAdd("nexo",{rec:{accion:(x.hora?x.hora+" · ":"")+x.accion,terminado:x.terminado,evidencia:"Basado en "+x.basado_en.map(nameOf).join(", "),mid,ai:i},from:"misión"}));
    bubble(NEXO_T,mm((M.verdict?M.verdict+". ":"")+short(M.summary,110)),6500);
    inv.forEach(a=>a.emote={k:"♥",until:performance.now()+2600});
    toast(M.proposals.length?"Misión cumplida: "+M.proposals.length+" propuestas esperan tu decisión":"Misión cumplida · Tablero actualizado");
    setTimeout(()=>inv.forEach(a=>{if(!running)go(a,a.home)}),2800);
  }catch(e){SC.think=0;SC.token++;
    if(redirect){del("missions/"+mid);S.live=null;selMission="";Object.values(SC.agents).forEach(a=>{a.state="idle";go(a,a.home)})}
    else{
    if(e&&["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(e.code))sampleOff=true;
    M.status=e&&e.code==="cancelled"?"stopped":"error";push("nexo","error",errCopy(e));persist();commit();
    if(opts.decision)save("decisions/"+opts.decision.id,Object.assign({},opts.decision,{status:"sin evaluar",missionId:mid}));
    Object.values(SC.agents).forEach(a=>{a.state="idle";go(a,a.home)})}}
  finally{setBusy(false);$("c-msg").textContent=sampleOff?errCopy({code:"not_granted"}):"";renderAll()}
  if(redirect){toast("Odín vio que era un registro: lo anoto sin preguntas.");return quickLog(text)}
}
/* ---------- registro rápido (kaizen: anotar lo que ya hiciste, sin preguntas y con deshacer) ---------- */
const LVORD={sinprobar:0,practica:1,probada:2};
const addTxt=(a,b)=>{a=String(a||"").trim();b=String(b||"").trim();if(!b||a.includes(b))return a;return a?a+"\n"+b:b};
const normUrl=u=>String(u||"").trim().replace(/^https?:\/\//i,"").replace(/\/+$/,"").toLowerCase();
function docAt(path){const i=path.indexOf("/");const c=path.slice(0,i),id=path.slice(i+1);
  if(c==="days")return S.days[id]||null;if(c==="projects")return S.projects.find(x=>x.id===id)||null;if(c==="skills")return S.skills.find(x=>x.id===id)||null;return null}
function logPrompt(text){
  const t=today();const d=dayData(t);const c=cfg();
  return BASE_()+"\n\nEres NEXO en modo REGISTRO RÁPIDO. "+WHO()+" te cuenta algo que ya hizo y tú lo registras de inmediato en sus datos, sin hacerle ninguna pregunta: infiere lo razonable, deja vacío lo que no sepas y nunca inventes URLs, cifras ni nombres que no estén en su texto o en el contexto."+
  "\n\nLo que contó "+WHO()+": \""+text+"\""+
  "\n\nSu bitácora de hoy ("+t+"): hizo: "+(logOf(d).hice.trim()||"(vacío)")+" | aprendió: "+(logOf(d).aprendi.trim()||"(vacío)")+" | minutos de estudio: "+(d.studyMin||0)+"."+
  "\nHábitos (id: nombre): "+c.habits.map(h=>h.id+": "+h.name).join("; ")+". Bonus (id: nombre): "+c.bonus.map(h=>h.id+": "+h.name).join("; ")+"."+
  "\nProyectos existentes (id | título | estado | repo): "+(S.projects.map(p=>p.id+" | "+p.title+" | "+(p.status||"idea")+" | "+(p.repo||"-")).join("; ")||"ninguno")+"."+
  "\nHabilidades existentes (id | nombre | nivel): "+(S.skills.map(s=>s.id+" | "+s.name+" | "+(s.level||"sinprobar")).join("; ")||"ninguna")+"."+
  "\n\nResponde solo con JSON: {\"summary\":\"qué registraste, una frase para "+WHO()+", sin preguntas\",\"day\":{\"hice\":\"lo que hizo, texto NUEVO para agregar (no repitas lo que ya está) o vacío\",\"aprendi\":\"lo que aprendió, texto nuevo o vacío\",\"trabe\":\"dónde se trabó, solo si lo dice, o vacío\",\"decidi\":\"una decisión que tomó, solo si la dice, o vacío\",\"studyMin\":0,\"habits\":[\"ids de hábitos que su texto confirma hechos hoy\"],\"bonus\":[\"ids de bonus que su texto confirma\"]},\"projects\":[{\"id\":\"id existente si es el mismo proyecto aunque el título varíe, o vacío si es nuevo\",\"title\":\"\",\"area\":\"Portafolio|Negocio|Aprendizaje|Creativo|Otro\",\"status\":\"idea|doing|review|done, o vacío para no cambiar\",\"repo\":\"URL solo si aparece en su texto\",\"stack\":\"\",\"goal\":\"\",\"next\":\"\",\"learned\":\"texto nuevo para agregar o vacío\"}],\"skills\":[{\"id\":\"id existente o vacío\",\"name\":\"\",\"level\":\"probada|practica|sinprobar\",\"evidence\":\"evidencia nueva y concreta\"}]}. studyMin son minutos ADICIONALES que mencione explícitamente; si no menciona tiempo, 0. Un commit o un push cuenta como el bonus de commit si existe. En proyectos y habilidades existentes deja vacíos los campos que no cambian. Listas vacías si no aplica.";
}
function toastUndo(msg,fn){const t=$("toast");t.textContent="";const s=document.createElement("span");s.textContent=mm(msg);const b=document.createElement("button");b.type="button";b.className="btn";b.textContent="Deshacer";b.style.cssText="margin-left:12px;padding:4px 10px;min-height:0";b.onclick=()=>{t.hidden=true;fn()};t.append(s,b);t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,9000)}
async function quickLog(text){
  if(running)return;
  if(!sample||sampleOff){toast(errCopy({code:"no_key"}));show("ajustes");return}
  SC.token++;setBusy(true,"Odín registra tu avance");
  const mid="m"+Date.now().toString(36);
  const M={title:"Registro: "+short(text,40),text,status:"running",origin:"registro",steps:[],proposals:[],created:nowISO()};
  const push=(who,kind,msg,extra)=>{M.steps.push(Object.assign({who,kind,text:msg,at:nowISO()},extra||{}));S.live=Object.assign({id:mid},M);selMission=mid;renderComms()};
  const undo=[];const track=path=>{let e=undo.find(u=>u.path===path);if(!e){e={path,ops:[]};undo.push(e)}return e};
  const setF=(e,nd,k,v)=>{if(JSON.stringify(nd[k])===JSON.stringify(v))return false;const had=nd[k]!==undefined;e.ops.push({k,had,prev:had?nd[k]:null,now:v});nd[k]=v;return true};
  const appF=(e,nd,k,add)=>{add=String(add||"").trim();const v=addTxt(nd[k],add);if(!add||v===String(nd[k]||"").trim())return false;e.ops.push({k,add});nd[k]=v;return true};
  try{
    push("cmd","order",text);SC.think=1;bubble(NEXO_T,"Registrando…",3000);
    const r=await callJson(logPrompt(text),"quick");SC.think=0;
    const t=today();const changes=[];const tn=normUrl(text);
    /* bitácora del día: solo se agrega, nunca se borra lo que ya tenías */
    const dd=r.day||{};const d0=dayData(t);const nd=JSON.parse(JSON.stringify(Object.assign({date:t},d0)));nd.habits=nd.habits||{};nd.bonus=nd.bonus||{};
    const de=track("days/"+t);
    const base=logOf(d0);
    const adds=[["hice",dd.hice||dd.learned,400,"Hice"],["aprendi",dd.aprendi,300,"Aprendí"],["trabe",dd.trabe,300,"Me trabé"],["decidi",dd.decidi,300,"Decidí"],["hice",dd.win?"Victoria: "+dd.win:"",200,"Hice"]].filter(x=>String(x[1]||"").trim());
    if(adds.length&&(nd.logV||0)<2){setF(de,nd,"logV",2);LF.forEach(([f])=>{if(nd[f]===undefined&&base[f])setF(de,nd,f,base[f])})}
    adds.forEach(([f,v,n,lab])=>{if(appF(de,nd,f,short(v,n)))changes.push(lab+": "+short(v,110))});
    const sm=Math.max(0,Math.min(600,parseInt(dd.studyMin,10)||0));if(sm){nd.studyMin=(nd.studyMin||0)+sm;de.ops.push({k:"studyMin",inc:sm});changes.push("+"+sm+" min de estudio")}
    [["habits",cfg().habits,"Hábito cumplido: "],["bonus",cfg().bonus,"Bonus: "]].forEach(([k,list,lab])=>(Array.isArray(dd[k])?dd[k]:[]).forEach(id=>{const h=list.find(x=>x.id===id);
      if(h&&!nd[k][id]){de.ops.push({k,sub:id,had:nd[k][id]!==undefined,prev:nd[k][id]===undefined?null:nd[k][id],now:true});nd[k][id]=true;changes.push(lab+h.name)}}));
    if(de.ops.length){delete nd.id;nd.updated=nowISO();S.days[t]=nd;save("days/"+t,nd)}
    /* proyectos: se actualiza el existente (sin renombrarlo) o se crea uno nuevo */
    (Array.isArray(r.projects)?r.projects:[]).slice(0,4).forEach(p=>{if(!p||!(p.title||p.id))return;
      let ex=p.id&&S.projects.find(x=>x.id===p.id);if(!ex&&p.title)ex=S.projects.find(x=>overlap(x.title,p.title)>=.6);
      const repoOk=p.repo&&tn.includes(normUrl(p.repo));
      const f={};["stack","goal","next"].forEach(k=>{if(p[k])f[k]=short(p[k],k==="goal"?240:140)});if(repoOk)f.repo=/^https?:/i.test(p.repo)?p.repo:"https://"+p.repo;
      if(AREAS.includes(p.area)&&!ex)f.area=p.area;if(COLN[p.status])f.status=p.status;
      if(ex){const e=track("projects/"+ex.id);const np=JSON.parse(JSON.stringify(ex));delete np.id;const was=np.status;
        Object.keys(f).forEach(k=>setF(e,np,k,f[k]));appF(e,np,"learned",short(p.learned,300));
        if(e.ops.length){np.updated=nowISO();save("projects/"+ex.id,np);changes.push("Proyecto actualizado: "+ex.title+(np.status!==was?" → "+COLN[np.status]:"")+(f.repo&&e.ops.some(o=>o.k==="repo")?" · repo enlazado":""))}}
      else if(p.title){const id="p"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
        const np=Object.assign({title:short(p.title,90),area:"Portafolio",status:"doing",stack:"",goal:"",next:"",repo:"",learned:short(p.learned,300)},f,{source:"registro",created:nowISO(),updated:nowISO()});
        undo.push({path:"projects/"+id,create:true});save("projects/"+id,np);changes.push("Proyecto nuevo: "+np.title+" ("+COLN[np.status]+")")}});
    /* habilidades: suma evidencia; sube hasta "en práctica" y "probada" queda como propuesta */
    (Array.isArray(r.skills)?r.skills:[]).slice(0,4).forEach(s=>{if(!s||!(s.name||s.id))return;
      let ex=s.id&&S.skills.find(x=>x.id===s.id);if(!ex&&s.name)ex=S.skills.find(x=>overlap(x.name,s.name)>=.6);
      const lv=LVKEYS.includes(s.level)?s.level:"practica";const ev=short(s.evidence||"",220);if(!ev)return;
      const wantsProbada=lv==="probada";const safe=wantsProbada?"practica":lv;
      if(ex){const e=track("skills/"+ex.id);const ns=JSON.parse(JSON.stringify(ex));delete ns.id;const cl=ns.level||"sinprobar";
        if(LVORD[safe]>LVORD[cl])setF(e,ns,"level",safe);appF(e,ns,"evidence",ev);
        if(e.ops.length){ns.updated=nowISO();save("skills/"+ex.id,ns);changes.push("Habilidad: "+ex.name+(ns.level!==cl?" → "+LVNAME[ns.level]:" (nueva evidencia)"))}
        if(wantsProbada&&cl!=="probada")M.proposals.push({id:"x"+Math.random().toString(36).slice(2,9),dept:"nexo",state:"pending",type:"skill",name:ex.name,level:"probada",evidence:ev})}
      else if(s.name){const id="s"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);undo.push({path:"skills/"+id,create:true});
        save("skills/"+id,{name:short(s.name,60),level:safe,category:"Otra",evidence:ev,source:"registro",updated:nowISO()});changes.push("Habilidad nueva: "+short(s.name,60)+" ("+LVNAME[safe]+")");
        if(wantsProbada)M.proposals.push({id:"x"+Math.random().toString(36).slice(2,9),dept:"nexo",state:"pending",type:"skill",name:short(s.name,60),level:"probada",evidence:ev})}});
    const U=undo.filter(u=>u.create||u.ops.length);
    M.summary=short(r.summary||(changes.length?"Listo, quedó registrado.":"No encontré nada nuevo que registrar."),300);
    if(!changes.length&&!M.proposals.length)M.summary="No encontré nada nuevo que registrar: ya estaba todo anotado.";
    M.next="";M.status="done";M.changes=changes;M.undo=U;
    threadPush("nexo",{r:"u",k:"registro",t:text.slice(0,1500),m:mid},{r:"a",k:"chat",t:M.summary,m:mid});
    push("nexo","report",M.summary,{detail:changes.map(c=>"- "+c).join("\n"),task:"Registro rápido"});
    save("missions/"+mid,JSON.parse(JSON.stringify(M)));
    bubble(NEXO_T,mm(short(M.summary,100)),4500);
    const al=SC.agents.aprendizaje;if(al)al.emote={k:"♥",until:performance.now()+2200};
    if(U.length)toastUndo("Registrado: "+changes.length+" cambio"+(changes.length===1?"":"s")+(M.proposals.length?" · "+M.proposals.length+" propuesta"+(M.proposals.length>1?"s":"")+" por decidir":""),()=>doUndo(mid));else toast(M.summary);
  }catch(e){SC.think=0;if(e&&["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(e.code))sampleOff=true;
    M.status=e&&e.code==="cancelled"?"stopped":"error";push("nexo","error",errCopy(e));save("missions/"+mid,JSON.parse(JSON.stringify(M)))}
  finally{setBusy(false);$("c-msg").textContent="";renderAll()}
}
function canUndo(m){if(!m||m.origin!=="registro"||m.undone||!(m.undo&&m.undo.length))return false;
  const last=missionsAll().find(x=>x.origin==="registro"&&x.status==="done"&&!x.undone);return !!last&&last.id===m.id}
function doUndo(mid){const m=missionsAll().find(z=>z.id===mid);if(!canUndo(m)){toast("Solo se puede deshacer el último registro.");return}
  m.undo.slice().reverse().forEach(u=>{
    if(u.create){del(u.path);return}
    const cur=docAt(u.path);if(!cur)return;const nd=JSON.parse(JSON.stringify(cur));delete nd.id;
    (u.ops||[]).forEach(o=>{
      if(o.add!=null){const s=String(nd[o.k]||"");nd[o.k]=s.includes("\n"+o.add)?s.replace("\n"+o.add,""):s.replace(o.add,"").trim();return}
      if(o.inc){nd[o.k]=Math.max(0,(nd[o.k]||0)-o.inc);return}
      if(o.sub){nd[o.k]=Object.assign({},nd[o.k]);if(JSON.stringify(nd[o.k][o.sub])===JSON.stringify(o.now)){if(o.had)nd[o.k][o.sub]=o.prev;else delete nd[o.k][o.sub]}return}
      if(JSON.stringify(nd[o.k])===JSON.stringify(o.now)){if(o.had)nd[o.k]=o.prev;else delete nd[o.k]}});
    nd.updated=nowISO();if(u.path.startsWith("days/"))S.days[u.path.slice(5)]=nd;save(u.path,nd)});
  const nm=JSON.parse(JSON.stringify(m));delete nm.id;nm.undone=true;nm.summary="Registro deshecho: tus datos quedaron como estaban.";
  nm.proposals=(nm.proposals||[]).map(p=>Object.assign(p,{state:p.state==="pending"?"dismissed":p.state}));
  if(S.live&&S.live.id===mid)S.live=Object.assign({id:mid},nm);save("missions/"+mid,nm);
  toast("Registro deshecho");renderAll()}
$("c-log").onclick=()=>{const t=$("c-text").value.trim();if(!t){toast("Escribe primero qué hiciste y luego pulsa Registrar avance.");$("c-text").focus();return}$("c-text").value="";closeConsole();quickLog(t)};

/* ---------- comunicaciones ---------- */
let selMission="";
function missionsAll(){const list=S.missions.slice();if(S.live&&!list.some(m=>m.id===S.live.id))list.unshift(S.live);return list.map(m=>S.live&&m.id===S.live.id&&running?S.live:m)}
function whoInfo(w){if(w==="cmd")return{name:"Tú",color:GOLD};if(w==="nexo")return{name:"Odín",color:"#FFE2A8"};const d=depts().find(x=>x.id===w);return d?{name:gn(d),color:d.color}:{name:w,color:"#A39BCB"}}
const VCLS={"Sí":"v-si","No":"v-no","Depende":"v-dep","Esperar":"v-esp"};
const hhmm=iso=>{if(!iso)return"";const d=new Date(iso);return pad(d.getHours())+":"+pad(d.getMinutes())};
function curMission(){const ms=missionsAll();if(!selMission||!ms.some(m=>m.id===selMission))selMission=ms[0]?ms[0].id:"";return ms.find(x=>x.id===selMission)}
function renderComms(){
  const ms=missionsAll();const sel=$("l-pick");curMission();
  sel.innerHTML=ms.map(m=>`<option value="${esc(m.id)}">${esc((m.origin==="semanal"?"Revisión · ":"")+(m.title||"Misión")+(m.undone?" (deshecho)":""))} · ${esc(pretty(ds(new Date(m.created||Date.now()))))}</option>`).join("");sel.value=selMission;sel.hidden=!ms.length;
  renderSummary();renderLog();
}
function renderSummary(){
  const el=$("l-summary");const m=curMission();
  if(!m){el.hidden=true;el.innerHTML="";return}
  const steps=m.steps||[];const reported=[...new Set(steps.filter(s=>s.kind==="report").map(s=>s.who))];
  const people=reported.map(id=>{const w=whoInfo(id);const src=portrait(id);return `<span class="ppl">${src?`<img src="${src}" alt="">`:`<span class="dot" style="background:${w.color}"></span>`}<span style="color:${w.color}">${esc(w.name)}</span></span>`}).join("");
  const pend=(m.proposals||[]).filter(p=>p.state==="pending").length;
  el.hidden=false;
  if(m.origin==="registro"){
    if(m.status==="running"){el.innerHTML=`<div class="sum run"><span class="eyebrow">Registro rápido</span><div class="thinking"><i></i><i></i><i></i><span>Odín está anotando tu avance…</span></div></div>`;return}
    if(m.summary){const ch=m.undone?[]:(m.changes||[]);
      el.innerHTML=`<div class="sum"><div class="row between"><span class="eyebrow">${m.undone?"Registro deshecho":"Registro rápido"}</span>${ch.length?`<span class="chip ok">${ch.length} cambio${ch.length===1?"":"s"}</span>`:""}</div>
        <p class="sumtext">${T(m.summary)}</p>${ch.length?`<ul class="chg">${ch.map(c=>`<li>${T(c)}</li>`).join("")}</ul>`:""}
        <div class="row between"><div>${pend?`<button class="btn ghost" type="button" id="go-props">${pend} propuesta${pend>1?"s":""} por decidir</button>`:""}</div>${canUndo(m)?`<button class="btn" type="button" id="undo-log">Deshacer registro</button>`:""}</div></div>`;
      const gp=$("go-props");if(gp)gp.onclick=()=>$("props-card").scrollIntoView({behavior:reduced?"auto":"smooth",block:"start"});
      const ub=$("undo-log");if(ub)ub.onclick=()=>doUndo(m.id);
      return}}
  if(m.status==="running"&&running&&S.live&&m.id===S.live.id){
    const plan=((steps.find(s=>s.kind==="plan")||{}).plan)||[];const hasPlan=steps.some(s=>s.kind==="plan");
    const items=[["Plan",hasPlan]].concat(plan.map(p=>[whoInfo(p.dept).name,reported.includes(p.dept)])).concat([["Odín",!!m.summary]]);
    const onIdx=items.findIndex(x=>!x[1]);
    el.innerHTML=`<div class="sum run"><div class="row between"><span class="eyebrow">Misión en curso</span><span class="chip ok">${esc(PHASE||"Trabajando")}</span></div><div class="prog">${items.map((x,i)=>`<span class="${x[1]?"done":i===onIdx?"on":""}">${x[1]?"✓ ":""}${esc(x[0])}</span>`).join("")}</div><p class="hint">${esc(m.title||"")}</p></div>`;
    return}
  if(m.summary){
    el.innerHTML=`<div class="sum"><div class="row between"><span class="eyebrow">Resumen de la misión</span>${m.verdict?`<span class="verdict ${VCLS[m.verdict]||""}">${esc(m.verdict)}</span>`:""}</div>
      <p class="sumtext">${T(m.summary)}</p>
      ${m.next?`<div class="nextbox"><span>Siguiente paso</span><strong>${T(m.next)}</strong></div>`:""}
      ${m.condition?`<div class="nextbox cond"><span>Condición</span><strong>${T(m.condition)}</strong></div>`:""}
      ${(m.actions||[]).length?`<div class="stack" style="gap:6px"><span class="eyebrow">Acciones de Odín</span>${actsHTML(m.actions,m.id)}</div>`:""}
      ${m.best?`<div class="nextbox"><span>Mejor agente de la semana</span><strong>${esc(nameOf(m.best.agent))}</strong><div class="muted" style="font-size:.82rem">${T(m.best.text)}</div></div>`:""}
      ${m.conflict?`<div class="nextbox cond"><span>Cómo resolvió el conflicto</span><strong>${T(m.conflict)}</strong></div>`:""}
      ${(m.rejected||[]).length?`<p class="hint" style="margin:0">Odín descartó ${m.rejected.length} despacho${m.rejected.length===1?"":"s"} por falta de evidencia: ${esc(m.rejected.map(x=>nameOf(x.agent)).join(", "))}.</p>`:""}
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
/* qué recibió cada agente en la misión: rojo = llegó vacío */
function recibioHTML(m,id){const f=m&&m.fuentes&&m.fuentes[id];if(!Array.isArray(f)||!f.length)return"";
  return `<div class="recib"><span class="rl">Recibió:</span>${f.filter(s=>s.k.indexOf("perfil")<0).map(s=>`<span class="rc ${s.n?"":"z"}" title="${esc(s.n?"Llegaron "+s.n:"Llegó vacío"+(s.note?": "+s.note:""))}">${esc(s.k)} <b class="num">${s.n}</b>${s.n||!s.note?"":` <i>${esc(s.note)}</i>`}</span>`).join("")}</div>`}
function renderLog(){
  const L=$("log");const m=curMission();
  if(!m){L.innerHTML=`<div class="empty">Aquí verás la conversación de cada misión: tu orden, el plan de Odín, el reporte de cada agente y lo que se pasan entre ellos. Prueba con "Planear mi día".</div>`;return}
  if(typingNote(L))return;
  const atBottom=L.scrollHeight-L.scrollTop-L.clientHeight<30;
  L.innerHTML=(m.steps||[]).map(st=>{const w=whoInfo(st.who);const hh=hhmm(st.at);
    if(st.kind==="order")return `<div class="msg me"><div class="bub"><div class="mh"><strong style="color:${GOLD}">Tu orden</strong><span class="tm">${hh}</span></div><div class="lead">${T(st.text)}</div></div><img class="av" src="${portrait("cmd")}" alt=""></div>`;
    if(st.kind==="plan")return `<div class="sys"><span class="sysl">${st.convoked?"Odín convocó a "+st.convoked+" de "+(st.total||st.convoked)+" agente"+(st.total===1?"":"s"):"Odín trazó el plan"}</span><div class="route">${(st.plan||[]).map((p,i)=>`<span class="rchip" style="--ac:${whoInfo(p.dept).color}" title="${esc(p.task)}">${i+1}. ${esc(whoInfo(p.dept).name)}</span>`).join('<span class="arr">→</span>')}<span class="arr">→</span><span class="rchip" style="--ac:${GOLD}">Odín sintetiza</span></div>${st.text?`<div>${T(st.text)}</div>`:""}</div>`;
    if(st.kind==="report"&&st.desp){const src=portrait(st.who),d=st.desp;return `<div class="msg${d.ok===false?" rej":""}" style="--ac:${w.color}">${src?`<img class="av" src="${src}" alt="">`:`<span class="av" style="background:${w.color}"></span>`}<div class="bub"><div class="mh"><strong style="color:${w.color}">${esc(w.name)}</strong><span class="dtag">Despacho</span><span class="tm">${hh}</span></div>${st.task?`<div class="task">Tarea: ${T(st.task)}</div>`:""}${recibioHTML(m,st.who)}${d.sinDatos?`<div class="sdtag">Sin datos en sus fuentes${(d.faltan||[]).length?" · le falta: "+T(d.faltan.join("; ")):""}</div>`:""}<div class="lead">${T(st.text)}</div>${d.ok===false?`<div class="rejtag">Descartado · ${T(d.motivo)}</div>`:""}${d.rev?`<div class="revtag" title="${esc(d.rev.issues.join(" · "))}">${d.rev.fixed?"Autorrevisión: corrigió "+d.rev.issues.length+" punto"+(d.rev.issues.length===1?"":"s"):"Autorrevisión: no logró corregir "+d.rev.issues.length+" punto"+(d.rev.issues.length===1?"":"s")}</div>`:""}<details><summary>Ver despacho completo</summary>${despBody(d)}${d.capacidad?`<p class="muted" style="font-size:.84rem;margin:6px 0 0">Capacidad de hoy: ${esc(d.capacidad.nivel)}${d.capacidad.minutos?" · "+d.capacidad.minutos+" min":""}</p>`:""}${d.detalle?fmtDetail(d.detalle):""}</details>${d.ok!==false&&d.recomendacion&&d.recomendacion.accion&&m.status!=="running"?rateHTML(st.who,m.id+"·"+st.who,d.recomendacion.accion):""}</div></div>`}
    if(st.kind==="reject")return `<div class="sys rej">${T(st.text)}</div>`;
    if(st.kind==="report"){const src=portrait(st.who);return `<div class="msg" style="--ac:${w.color}">${src?`<img class="av" src="${src}" alt="">`:`<span class="av" style="background:${w.color}"></span>`}<div class="bub"><div class="mh"><strong style="color:${w.color}">${esc(w.name)}</strong><span class="tm">${hh}</span></div>${st.task?`<div class="task">Tarea: ${T(st.task)}</div>`:""}<div class="lead">${T(st.text)}</div>${st.detail?`<details><summary>Ver informe completo</summary>${fmtDetail(st.detail)}</details>`:""}</div></div>`}
    if(st.kind==="handoff"){const to=whoInfo(st.to);return `<div class="hand"><span style="color:${w.color}">${esc(w.name)}</span> <span class="arr">lleva una nota a</span> <span style="color:${to.color}">${esc(to.name)}</span><span class="hq">“${T(st.text)}”</span></div>`}
    if(st.kind==="summary")return `<div class="sys"><span class="sysl">Síntesis de Odín</span><div>${T(st.text||"")}</div>${st.next?`<div class="muted" style="font-size:.84rem">Siguiente paso: ${T(st.next)}</div>`:""}<div class="muted" style="font-size:.8rem">Resumen completo y Tablero, arriba.</div></div>`;
    if(st.kind==="error")return `<div class="sys err">${T(st.text)}</div>`;
    return `<div class="sys">${T(st.text)}</div>`}).join("")||`<div class="empty">Misión sin registros.</div>`;
  if(running||atBottom)L.scrollTop=L.scrollHeight;
}
$("l-pick").onchange=e=>{selMission=e.target.value;renderComms()};

/* ---------- propuestas ---------- */
function pendingProps(){const out=[];missionsAll().slice(0,15).forEach(m=>{const seen=[];(m.proposals||[]).forEach(p=>{if(p.state!=="pending")return;
  if(p.type==="quest"){if(S.quests[today()]||seen.some(x=>x.type==="quest"))return}else if(isDup(p,seen))return;seen.push(p);out.push({m,p})})});return out}
function renderProps(){
  const ps=pendingProps(),pp=profOf().pending,n=ps.length+pp.length;$("p-count").textContent=n;$("p-count").className="chip "+(n?"warn":"");
  const patH=pp.map(x=>`<div class="prop" data-pat="${esc(x.id)}"><div class="row" style="gap:6px">${portrait(x.by)?`<img src="${portrait(x.by)}" alt="" style="width:20px;height:20px;image-rendering:pixelated;border-radius:3px">`:""}<span style="font:500 .82rem var(--f-display);color:${whoInfo(x.by).color}">${esc(nameOf(x.by))}</span></div><span class="chip">Patrón para tu perfil</span><div class="t"><strong>${T(x.t)}</strong></div>${x.ev?`<div class="muted t" style="font-size:.86rem">Evidencia: ${T(x.ev)}</div>`:""}<div class="row"><button class="btn primary" data-act="apply">Aprobar</button><button class="btn ghost" data-act="dismiss">Descartar</button></div></div>`).join("");
  $("props").innerHTML=n?patH+ps.slice(0,12).map(({m,p})=>{const w=whoInfo(p.dept);let body="";
    if(p.type==="card")body=`<span class="chip">Tarjeta${p.topic?" · "+esc(p.topic):""}</span><div class="t"><strong>${T(p.front)}</strong></div><div class="muted t" style="font-size:.86rem">${T(p.back)}</div>`;
    if(p.type==="project")body=`<span class="chip">Proyecto · ${esc(p.area||"Portafolio")}</span><div class="t"><strong>${T(p.title)}</strong></div>${p.stack||p.skill?`<div class="muted" style="font-size:.8rem">${T(p.stack||p.skill)}</div>`:""}${p.goal?`<div class="muted t" style="font-size:.86rem">${T(p.goal)}</div>`:""}`;
    if(p.type==="quest")body=`<span class="chip ok">Misión del día</span><div class="t"><strong>${T(p.text)}</strong></div>${(p.steps||[]).length>1?`<ol class="qsteps">${p.steps.map(x=>`<li>${T(x)}</li>`).join("")}</ol>`:""}`;
    if(p.type==="deptmission")body=`<span class="chip warn">Ajuste a la misión de ${esc(nameOf(p.target))}</span><div class="muted t" style="font-size:.84rem">Antes: ${T(p.prev)}</div><div class="t"><strong>Ahora: ${T(p.mission)}</strong></div>${p.why?`<div class="muted t" style="font-size:.84rem">Por qué: ${T(p.why)}</div>`:""}`;
    if(p.type==="skill")body=`<span class="chip">Habilidad · ${esc(LVNAME[p.level]||p.level)}</span><div class="t"><strong>${T(p.name)}</strong></div>${p.evidence?`<div class="muted t" style="font-size:.86rem">Evidencia: ${T(p.evidence)}</div>`:""}`;
    const src=portrait(p.dept);
    return `<div class="prop" data-m="${esc(m.id)}" data-p="${esc(p.id)}"><div class="row" style="gap:6px">${src?`<img src="${src}" alt="" style="width:20px;height:20px;image-rendering:pixelated;border-radius:3px">`:""}<span style="font:500 .82rem var(--f-display);color:${w.color}">${esc(w.name)}</span></div>${body}<div class="row"><button class="btn primary" data-act="apply">Aplicar</button><button class="btn ghost" data-act="dismiss">Descartar</button></div></div>`}).join(""):`<div class="empty">Sin propuestas pendientes.</div>`;
}
$("props").addEventListener("click",e=>{const b=e.target.closest("button[data-act]");if(!b)return;const box=b.closest(".prop");if(box.dataset.pat){patternAct(box.dataset.pat,b.dataset.act==="apply");return}const m=missionsAll().find(x=>x.id===box.dataset.m);if(!m)return;
  const pr=(m.proposals||[]).find(x=>x.id===box.dataset.p);if(!pr)return;const t=today();
  if(b.dataset.act==="apply"){
    if(pr.type==="card")save("cards/c"+Date.now().toString(36),{front:pr.front,back:pr.back,topic:pr.topic||"",due:t,interval:0,ease:2.5,reps:0,reviews:0,source:"agente:"+pr.dept,created:nowISO()});
    if(pr.type==="project")save("projects/p"+Date.now().toString(36),{title:pr.title,area:pr.area||"Portafolio",stack:pr.stack||pr.skill||"",goal:pr.goal||"",next:"",repo:"",status:"idea",learned:"",source:"agente:"+pr.dept,created:nowISO(),updated:nowISO()});
    if(pr.type==="quest")save("quests/"+t,Object.assign({date:t,text:pr.text,dept:pr.dept,done:false,created:nowISO()},(pr.steps||[]).length>1?{steps:pr.steps,parent:pr.parent||"",step:1}:{}));
    if(pr.type==="deptmission"&&S.config){const c=S.config,nd=(c.departments||[]).map(x=>x.id===pr.target?Object.assign({},x,{mission:pr.mission}):x);const nc=Object.assign({},c,{departments:nd,updated:nowISO()});delete nc.id;
      save("config/main",nc);save("changelog/l"+Date.now().toString(36),{date:today(),text:"Misión de "+nameOf(pr.target)+" ajustada con la propuesta de Hefesto que aprobaste: "+short(pr.mission,240)})}
    if(pr.type==="skill"){const ex=S.skills.find(s=>overlap(s.name,pr.name)>=.6);if(ex){const ns=Object.assign({},ex,{level:pr.level,evidence:pr.evidence||ex.evidence,updated:nowISO()});delete ns.id;save("skills/"+ex.id,ns)}else save("skills/s"+Date.now().toString(36),{name:pr.name,level:pr.level,evidence:pr.evidence||"",category:"Otra",source:"agente:"+pr.dept,updated:nowISO()})}
    toast({card:"Tarjeta creada",project:"Proyecto agregado a ideas",quest:"Misión del día fijada",skill:"Habilidad actualizada",deptmission:"Misión de "+nameOf(pr.target)+" actualizada"}[pr.type]||"Aplicado")}
  const nm=JSON.parse(JSON.stringify(m));delete nm.id;nm.proposals.forEach(x=>{if(x.id===pr.id)x.state=b.dataset.act==="apply"?"applied":"dismissed"});
  pr.state=b.dataset.act==="apply"?"applied":"dismissed";if(S.live&&S.live.id===m.id)S.live.proposals=nm.proposals;
  save("missions/"+m.id,nm);renderProps();renderSummary()});

/* ---------- escuadrón y HUD ---------- */
function agentCard(d,clickable){const a=SC.agents[d.id];const xp=agentXP(d.id);const lv=Math.floor(xp/30)+1;
  let lastR="";missionsAll().some(m=>(m.steps||[]).slice().reverse().some(st=>{if(st.who===d.id&&st.kind==="report"){lastR=st.text;return true}return false}));
  const st=a&&a.state==="working"?"Trabajando":a&&a.path&&a.path.length?"En movimiento":isNight()?"Descansando":"En su sala";const src=portrait(d.id);
  return `<${clickable?"button type=\"button\"":"div"} class="agent" style="--ac:${d.color}${clickable?"":";cursor:default"}" data-id="${esc(d.id)}"><span class="ah">${src?`<img src="${src}" alt="">`:""}<span class="an"><span class="n" style="color:${d.color}">${esc(gn(d))}</span>${gn(d)!==d.name?`<span class="dn">${esc(d.name)}</span>`:""}<span class="s">${st} · Nv ${lv} · ${xp} XP</span></span></span>${TRAITS[d.id]?`<span class="tr">${esc(TRAITS[d.id])}</span>`:""}${SRCN[d.id]?`<span class="srcl">Fuentes: ${esc(SRCN[d.id])}</span>`:""}${clickable&&(S.chats[d.id]||{}).unread?`<span class="newb">${(S.chats[d.id]||{}).unread} mensaje${(S.chats[d.id]||{}).unread===1?"":"s"} nuevo${(S.chats[d.id]||{}).unread===1?"":"s"}</span>`:""}<span class="r">${T(clickable?(lastR||d.mission):d.mission)}</span></${clickable?"button":"div"}>`}
function renderRoster(){$("roster").innerHTML=depts().map(d=>agentCard(d,true)).join("")}
$("roster").addEventListener("click",e=>{const b=e.target.closest(".agent");if(b)selectAgent(b.dataset.id)});
function renderHud(){
  const xp=xpTotal(),lv=lvlOf(xp),lo=25*(lv-1)**2,hi=25*lv**2;
  $("h-level").textContent="Nv "+lv;$("h-rank").textContent=rankOf(lv);$("h-xpbar").style.width=Math.round(100*(xp-lo)/(hi-lo))+"%";$("h-xp").textContent=xp+" XP · faltan "+(hi-xp)+" para Nv "+(lv+1);
  const sc=score(today());$("h-pts").textContent=sc.pts+"/"+sc.min;$("h-pts-s").textContent=sc.met?"día cumplido":"puntos de hoy";$("h-pts").style.color=sc.met?"var(--accent)":"";
  $("h-streak").textContent=streak();
  const q=S.quests[today()];const hq=$("h-quest");
  if(q){if(hq.dataset.t!==q.text+q.done){hq.dataset.t=q.text+q.done;hq.innerHTML=`<input type="checkbox" id="q-done" ${q.done?"checked":""} aria-label="Marcar misión del día"><label for="q-done" style="font-size:.88rem;${q.done?"text-decoration:line-through;color:var(--muted)":""}">${T(q.text)}</label>`}}
  else{hq.dataset.t="";hq.innerHTML=`<span class="muted" style="font-size:.85rem">Pulsa a Odín y pide "Planear mi día"; aplica la misión que proponga.</span>`}
  const sel=$("c-target");const cv_=sel.value;sel.innerHTML=`<option value="">Odín decide y coordina</option>`+depts().map(d=>`<option value="${esc(d.id)}">${esc(gn(d)===d.name?d.name:gn(d)+" · "+d.name)}</option>`).join("");sel.value=cv_;
}
$("h-quest").addEventListener("change",e=>{if(e.target.id!=="q-done")return;const q=S.quests[today()];if(!q)return;const nq=Object.assign({},q,{done:e.target.checked,doneAt:nowISO()});delete nq.id;if(e.target.checked){nq.outcome="cumplida";delete nq.reason}else if(nq.outcome==="cumplida")delete nq.outcome;try{questFeedback(today(),nq)}catch(_){}S.quests[today()]=Object.assign({},nq);save("quests/"+today(),nq);if(e.target.checked){toast("+15 XP · misión del día cumplida");bubble(SC.cmd,"¡Misión cumplida!",2500,GOLD);Object.values(SC.agents).forEach(a=>a.emote={k:"♥",until:performance.now()+2000})}renderHud()});
let lastLayoutKey="";
function ensureLayout(){const key=JSON.stringify(depts().map(d=>d.id+d.name+d.color+gn(d)));if(key!==lastLayoutKey){lastLayoutKey=key;layout()}}
function renderNexo(){ensureLayout();renderHud();renderBoard();renderComms();renderProps();renderRoster()}


/* =================== AGENTES: perfil, fuentes, chats, expedientes, despachos y Tablero =================== */
/* Orden fijo de trabajo en las misiones; Odín siempre cierra. */
const CANON=["habitos","finanzas","carrera","aprendizaje","sistema"];
const canonIdx=id=>{const i=CANON.indexOf(id);return i<0?50:i};
const SRCN={habitos:"hábitos, energía, lo que hiciste (Hice) y Entrenamiento",finanzas:"finanzas",carrera:"proyectos, habilidades y tu bitácora (Hice, Decidí, Siguiente)",aprendizaje:"Aprendí, Me trabé, Hice, Repaso y Bandeja",sistema:"uso del sistema",nexo:"despachos del escuadrón y Tablero de estado"};
const nameOf=id=>{if(id==="nexo")return"Odín";const d=depts().find(x=>x.id===id);return d?gn(d):String(id||"")};
function agentIdFrom(x){x=String(x||"").trim().toLowerCase();if(!x)return"";if(x==="nexo"||x==="odín"||x==="odin")return"nexo";
  const d=depts().find(d=>d.id===x||gn(d).toLowerCase()===x||d.name.toLowerCase()===x);return d?d.id:""}

/* ---------- perfil del comandante (lo reciben todos los agentes) ---------- */
function profOf(){const p=S.profile||{};const L=k=>(Array.isArray(p[k])?p[k]:[]).map(String).filter(Boolean);
  return{goal:p.goal||"",goalDate:p.goalDate||"",hours:p.hours||"",money:p.money||"",commitments:p.commitments||"",learnBest:p.learnBest||"",learnBad:p.learnBad||"",
    patterns:L("patterns"),avoid:L("avoid"),saved:!!p.saved,github:p.github||"",pending:(Array.isArray(p.pending)?p.pending:[]).map(x=>Object.assign({},x)),rejected:L("rejected")}}
function profileText(){const p=profOf(),o=[];const ln=(k,v)=>{v=String(v||"").replace(/\s+/g," ").trim();if(v)o.push("- "+k+": "+v)};
  let dl="";if(p.goalDate){const n=Math.round((parse(p.goalDate)-parse(today()))/864e5);dl=" · fecha objetivo: "+p.goalDate+(n>=0?" (faltan "+n+" días)":" (ya pasó)")}
  if(p.goal||dl)o.push("- Meta principal: "+(p.goal||cfg().goal||"sin definir")+dl);
  const rs=[p.hours?"horas disponibles: "+p.hours:"",p.money?"dinero: "+p.money:"",p.commitments?"compromisos fijos: "+p.commitments:""].filter(Boolean).join("; ");
  ln("Restricciones reales",rs);ln("Aprende mejor",p.learnBest);ln("No le funciona",p.learnBad);ln("Usuario de GitHub",ghClean(p.github));
  if(p.patterns.length)o.push("- Patrones conocidos: "+p.patterns.join("; "));
  if(p.avoid.length)o.push("- NO quiere que le recomienden: "+p.avoid.join("; ")+". Si una idea cae aquí, descártala.");
  return "\n\nPERFIL DEL COMANDANTE (lo escribió él; respétalo en todo lo que digas):\n"+(o.length?o.join("\n"):"- Aún vacío.")}
const BASEP=()=>BASE_()+profileText()+prefsText();
function putProfile(p){p.updated=nowISO();return putDoc("profile/main",p)}
/* un agente puede PROPONER un patrón; solo se guarda en el perfil si lo apruebas */
function proposePattern(pt,by,src){if(!pt||typeof pt!=="object")return false;const t=short(pt.texto||pt.text,120),ev=short(pt.evidencia||pt.evidence,200);
  if(t.length<8||!hasEvidence(ev,src))return false;const p=profOf();
  if(p.patterns.concat(p.rejected,p.pending.map(x=>x.t)).some(x=>overlap(x,t)>=.6))return false;
  p.pending.push({id:"pt"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),t,ev,by,at:nowISO()});putProfile(p);return true}
function patternAct(id,ok){const p=profOf(),x=p.pending.find(z=>z.id===id);if(!x)return;p.pending=p.pending.filter(z=>z.id!==id);
  if(ok)p.patterns.push(x.t);else{p.rejected.push(x.t);p.rejected=p.rejected.slice(-30)}
  putProfile(p);toast(ok?"Patrón agregado a tu perfil":"Patrón descartado");renderAll()}

/* ---------- ejemplos de despacho bueno y malo (con datos reales del contexto) ---------- */
/* Ejemplos de despacho bueno y malo (datos de ejemplo; en tu copia puedes cambiarlos por datos de tu propio contexto) */
const DESP_EX={
  habitos:{malo:"«¡Tienes que ser más constante con el ejercicio!»",porque:"regaña, no cita ningún dato, no dice cuánto ni cuándo, y no hay forma de saber cuándo terminaste",
    bueno:"«Ejercicio va 1 de 7 días esta semana, pero tu energía subió de 2 (lunes) a 4 (jueves). Hoy: 20 min de caminata rápida antes de las 19:00. Terminas cuando marques Ejercicio en Hoy y guardes.»"},
  finanzas:{malo:"«Deberías invertir tu dinero.»",porque:"sin cifras, sin monto, sin plazo y sin criterio de terminado",
    bueno:"«Tienes 50,000 MXN en una cuenta al 0% y otra cuenta tuya paga 10%: dejas de ganar unos 5,000 MXN al año. Hoy: 30 min para comparar 2 instrumentos de bajo riesgo y decidir cuánto mover sin tocar 6 meses de gasto. Terminas cuando anotes en Finanzas el monto y el destino.»"},
  carrera:{malo:"«Busca trabajo como desarrollador senior.»",porque:"te encasilla, presenta lo no probado como el camino y no cita evidencia ni propone cómo validarlo",
    bueno:"«Tu única habilidad probada de código es Git y GitHub y tu proyecto en curso es una app de tareas. Dos puertas: freelance pequeño (ingreso rápido, precio sin validar) o empleo junior (estable, pide portafolio). Hoy: 45 min para publicar la app con README. Terminas cuando el enlace esté en el proyecto.»"},
  aprendizaje:{malo:"«Repasa tus tarjetas de React.»",porque:"no cita datos, no dice cuánto ni cómo sé que terminé",
    bueno:"«Fallaste 3 de 4 tarjetas de useState esta semana y el 8 oct anotaste que te trabaste con el formulario. Hoy: 25 min reconstruyendo el formulario sin ver el código anterior. Terminas cuando guarde y recupere una receta.»"},
  sistema:{malo:"«El sistema está bien, sigue usándolo.»",porque:"no mide nada y no propone un ajuste concreto",
    bueno:"«De 20 propuestas de los agentes aplicaste 2; 18 siguen pendientes, la más vieja de hace 9 días. Fricción: se acumulan sin decidir. Hoy: 15 min para aplicar o descartar las 10 más viejas. Terminas cuando el contador baje de 18 a 8 o menos.»"},
  nexo:{malo:"«Hoy enfócate en estudiar, ahorrar y avanzar en tus proyectos.»",porque:"mezcla todo, no da hora ni criterio de terminado, no dice qué despacho lo sostiene ni cómo resolvió el choque entre agentes",
    bueno:"«10:00 · 50 min del tema que más te cuesta; terminas cuando resuelvas 3 ejercicios y lo anotes en Aprendí (basado en Atenea: 3 tarjetas falladas). 18:30 · 20 min de ejercicio; terminas cuando lo marques (basado en Heracles: 1 de 7 días). Conflicto: Jano pedía 2 h para tu proyecto y Heracles bajar la carga porque tu energía es 2; dejé el proyecto en 45 min mañana a las 10:00.»"}};
function exText(id){const e=DESP_EX[id];if(!e)return"";return "\n\nEJEMPLOS DE "+(id==="nexo"?"CIERRE":"DESPACHO")+" (imita el bueno; nunca entregues algo como el malo):\nMALO: "+e.malo+" Por qué es malo: "+e.porque+".\nBUENO: "+e.bueno}

/* ---------- fuentes: cada agente recibe solo las suyas ---------- */
function dayLines(n,fn){const t=today(),o=[];for(let i=n-1;i>=0;i--){const s=addDays(t,-i),d=S.days[s];if(!d)continue;const l=fn(s,d);if(l)o.push("- "+s+": "+l)}return o}
function srcOf(id){
  const c=cfg(),t=today(),L=["Hoy: "+t+" ("+pretty(t)+"), semana "+(weekIndex(t)+1)+" del sistema."];
  if(id==="habitos"){
    L.push("Mínimo diario: "+minFor(t)+" puntos (con al menos un hábito prioritario). Meta de estudio: "+studyTarget(t)+" min/día. Racha: "+streak()+" días.");
    L.push("Hábitos: "+c.habits.map(h=>h.name+(h.priority?" (prioridad)":"")).join(", ")+". Bonus: "+c.bonus.map(h=>h.name).join(", ")+" ("+(c.bonusPerPoint||3)+" bonus = 1 punto).");
    const dl=dayLines(14,(s,d)=>{const sc=score(s);const hb=c.habits.filter(h=>d.habits&&d.habits[h.id]).map(h=>h.name).join("/");const bn=c.bonus.filter(h=>d.bonus&&d.bonus[h.id]).map(h=>h.name).join("/");
      return sc.pts+"/"+sc.min+" pts"+(sc.met?" cumplido":"")+", energía "+(d.energy||"-")+", estudio "+(d.studyMin||0)+" min"+(hb?", hábitos: "+hb:", sin hábitos")+(bn?", bonus: "+bn:"")});
    L.push("Últimos 14 días (los días sin registro no aparecen):\n"+(dl.join("\n")||"- sin registros"));
    c.habits.forEach(h=>{let n=0;for(let i=0;i<7;i++){const d=S.days[addDays(t,-i)];if(d&&d.habits&&d.habits[h.id])n++}L.push("Últimos 7 días · "+h.name+": "+n+"/7")});
    const hl=dayLines(7,(s,d)=>{const x=logOf(d).hice.trim();return x?"hizo: "+short(x.replace(/\s+/g," "),150):""});
    L.push("Lo que anotó en «Hice» (bitácora), últimos 7 días:\n"+(hl.join("\n")||"- sin entradas"));
    L.push(enSignals());
  }else if(id==="finanzas"){
    L.push(finSummary()||"Aún no hay datos de finanzas.");
    if(S.fin&&S.fin.notes)L.push("Notas de finanzas: "+short(S.fin.notes,300));
    const dcs=S.decisions.slice(0,6);if(dcs.length)L.push("Decisiones de dinero recientes: "+dcs.map(d=>short(d.text,90)+(d.verdict?" → "+d.verdict:" (sin evaluar)")).join(" | "));
  }else if(id==="carrera"){
    L.push("Meta: "+(profOf().goal||c.goal||"sin definir")+".");
    L.push("Habilidades PROBADAS (con evidencia): "+(skillsLine("probada")||"ninguna registrada")+".");
    L.push("Habilidades EN PRÁCTICA: "+(skillsLine("practica")||"ninguna registrada")+".");
    L.push("SIN PROBAR (hipótesis, no son habilidades): "+(skillsLine("sinprobar")||"ninguna")+".");
    L.push("Proyectos: "+(S.projects.length?S.projects.map(p=>p.title+" ["+areaOf(p)+", "+(COLN[p.status]||"Ideas")+(p.goal?", de qué trata: "+short(p.goal,100):"")+(p.stack?", "+short(p.stack,60):"")+(p.next?", siguiente: "+short(p.next,80):"")+(p.learned?", aprendido: "+short(p.learned,90):"")+(p.repo?", repo: "+p.repo:"")+(p.updated?", actualizado "+String(p.updated).slice(0,10):"")+"]").join("; "):"ninguno aún")+".");
    const cl=dayLines(14,(s,d)=>{const l=logOf(d),tg=f=>{const x=tagLabel(l.tags[f]);return x?" ["+x+"]":""};
      return ["hice","decidi","siguiente"].map((f,i)=>l[f].trim()?["hizo","decidió","siguiente paso"][i]+tg(f)+": "+short(l[f].replace(/\s+/g," "),i===0?170:130):"").filter(Boolean).join(" | ")});
    L.push("Bitácora (Hice / Decidí / Siguiente), últimos 14 días:\n"+(cl.join("\n")||"- sin entradas"));
  }else if(id==="aprendizaje"){
    const dl=dayLines(14,(s,d)=>{const l=logOf(d),tg=f=>{const x=tagLabel(l.tags[f]);return x?" ["+x+"]":""};const a=l.aprendi.trim(),b=l.trabe.trim();
      const h=l.hice.trim();return [a?"aprendió"+tg("aprendi")+": "+short(a,220):"",b?"se trabó"+tg("trabe")+": "+short(b,200):"",h?"hizo"+tg("hice")+": "+short(h.replace(/\s+/g," "),140):""].filter(Boolean).join(" | ")});
    L.push("Bitácora (Aprendí / Me trabé / Hice), últimos 14 días:\n"+(dl.join("\n")||"- sin entradas"));
    const due=S.cards.filter(x=>(x.due||t)<=t),tp={};S.cards.forEach(x=>{const k=x.topic||"Sin tema";tp[k]=(tp[k]||0)+1});
    L.push("Repaso: "+S.cards.length+" tarjetas, "+due.length+" pendientes hoy. Por tema: "+(Object.entries(tp).map(([k,n])=>k+" "+n).join(", ")||"—")+".");
    const hard=S.cards.filter(x=>(x.reviews||0)>0).sort((a,b)=>(a.ease||2.5)-(b.ease||2.5)).slice(0,5);
    if(hard.length)L.push("Tarjetas que más te cuestan (facilidad baja): "+hard.map(x=>short(x.front,70)+" (tema "+(x.topic||"—")+", "+(x.reviews||0)+" repasos, facilidad "+(+(x.ease||2.5)).toFixed(2)+")").join(" | "));
    L.push("Preguntas existentes: "+(S.cards.slice(0,25).map(x=>short(x.front,60)).join(" | ")||"ninguna"));
    const bx=S.inbox.filter(n=>n.state==="open");L.push("Bandeja (notas rápidas sin clasificar): "+(bx.length?bx.length+" · "+bx.slice(0,8).map(n=>short(n.text||n.t||"",100)).filter(Boolean).join(" | "):"vacía")+".");
  }else if(id==="sistema"){
    let act=0,lg=0,cl=0;for(let i=0;i<14;i++){const d=S.days[addDays(t,-i)];if(!d)continue;if(hasAct(d))act++;if(hasLogText(d))lg++;if(logOf(d).closed)cl++}
    L.push("Últimos 14 días: "+act+" con Actividades guardadas, "+lg+" con Bitácora, "+cl+" cerrados.");
    const io=S.inbox.filter(n=>n.state==="open");L.push("Bandeja sin clasificar: "+io.length+" notas abiertas"+(io.length?", la más vieja del "+String(io.map(n=>n.created).sort()[0]||"").slice(0,10):"")+".");
    const ms=S.missions.filter(m=>String(m.created||"")>=addDays(t,-14));const by={};ms.forEach(m=>{by[m.origin||"nexo"]=(by[m.origin||"nexo"]||0)+1});
    L.push("Misiones en 14 días: "+ms.length+" ("+(Object.entries(by).map(([k,n])=>k+" "+n).join(", ")||"ninguna")+").");
    let pa=0,pd=0,pp=0,old="";S.missions.forEach(m=>(m.proposals||[]).forEach(p=>{if(p.state==="applied")pa++;else if(p.state==="dismissed")pd++;else{pp++;if(!old||String(m.created)<old)old=String(m.created)}}));
    L.push("Propuestas de los agentes: "+(pa+pd+pp)+" en total; aplicaste "+pa+", descartaste "+pd+", pendientes "+pp+(old?" (la más vieja del "+old.slice(0,10)+")":"")+".");
    const chats=Object.keys(S.chats).map(k=>nameOf(k)+" "+((S.chats[k].n)||0)).join(", ");if(chats)L.push("Mensajes de chat por agente: "+chats+".");
    let rp=0,rh=0,ri=0;Object.values(S.dossiers).forEach(d=>(d.recs||[]).forEach(r=>{if(r.state==="hecha")rh++;else if(r.state==="ignorada")ri++;else rp++}));
    L.push("Recomendaciones en expedientes: "+rp+" pendientes, "+rh+" hechas, "+ri+" ignoradas.");
    const rq=S.requests.filter(r=>r.status!=="atendido");L.push("Solicitudes abiertas al sistema: "+(rq.map(r=>short(r.text,140)).join(" | ")||"ninguna")+".");
    if(S.reviews[0])L.push("Última revisión semanal: "+(S.reviews[0].week||"")+" · "+short(S.reviews[0].summary,300));
    if(S.changelog.length)L.push("Cambios recientes al sistema: "+S.changelog.slice(0,3).map(x=>x.date+": "+short(x.text,120)).join(" | "));
  }
  if(id!=="finanzas")L.push(ghBlock(id));
  return L.filter(Boolean).join("\n")}
function boardText(){const b=S.board;if(!b)return "TABLERO DE ESTADO: aún vacío (no ha habido misiones con despachos).";
  const o=["TABLERO DE ESTADO (actualizado "+String(b.updated||"").slice(0,16).replace("T"," ")+"):",
    "- Capacidad de hoy: "+((b.capacity&&b.capacity.level)||"—")+((b.capacity&&b.capacity.why)?" · "+b.capacity.why:""),"- Urgencia: "+(b.urgency||"—"),"- Dirección: "+(b.direction||"—"),
    "- Huecos: "+((b.gaps||[]).join("; ")||"—"),"- Misión del día: "+(b.quest||"—")];
  if((b.actions||[]).length)o.push("- Acciones vigentes: "+b.actions.map(a=>(a.hora?a.hora+" ":"")+a.accion).join(" | "));
  const last=b.last||{};const ks=Object.keys(last).sort((a,b)=>canonIdx(a)-canonIdx(b));
  if(ks.length)o.push("Último despacho de cada agente:\n"+ks.map(k=>{const x=last[k];if(x.sd)return "- ["+k+"] "+nameOf(k)+" ("+String(x.at||"").slice(0,10)+") SIN DATOS en sus fuentes: "+x.hallazgo+(x.faltan&&x.faltan.length?" | le falta: "+x.faltan.join("; "):"")+(x.pregunta?" | pregunta: "+x.pregunta:"");return "- ["+k+"] "+nameOf(k)+" ("+String(x.at||"").slice(0,10)+", confianza "+(x.confianza||"—")+"): "+x.hallazgo+" | evidencia: "+x.evidencia+" | recomendación: "+x.accion+(x.pregunta?" | pregunta: "+x.pregunta:"")}).join("\n"));
  return o.join("\n")}
/* ---------- qué recibe cada agente: conteos por fuente (alimentan el Diagnóstico y la regla de «sin datos») ---------- */
function srcStat(id){
  const c=cfg(),t=today(),o=[],add=(k,n,core,note)=>o.push({k,n:Math.max(0,+n||0),core:!!core,note:note||""});
  const d14=[];for(let i=0;i<14;i++){const d=S.days[addDays(t,-i)];if(d)d14.push(d)}
  const withF=(fs)=>d14.filter(d=>{const l=logOf(d);return fs.some(f=>l[f].trim())}).length;
  const f=S.fin||{},nAcc=(f.accounts||[]).length,nExp=(f.expenses||[]).length,nInc=(f.incomes||[]).length;
  const gh=()=>{const s=ghSignals();if(s)add("commits de GitHub",s.commits.length,false,s.commits.length?"":"sin commits recientes");
    else add("commits de GitHub",0,false,!ghUser()?"sin usuario conectado":GH.err?(GH_TITLE[GH.err.kind]||"error de consulta"):(ghMem().env?(GH_TITLE[ghMem().env.kind]||"bloqueado"):"aún sin consulta"))};
  const tail=()=>{const p=profOf();add("perfil (campos llenos)",[p.goal||c.goal,p.hours,p.money,p.commitments,p.learnBest,p.learnBad,p.patterns.length,p.avoid.length].filter(Boolean).length,false);
    const d=dossierOf(id);add("expediente (entradas)",d.knows.length+d.recs.length+d.works.length+d.fails.length,false)};
  if(id==="habitos"){add("hábitos configurados",c.habits.length+c.bonus.length,true);add("días con hábitos o energía (14 d)",d14.filter(hasAct).length,true);add("bitácora · Hice (7 d)",dayLines(7,(s,d)=>logOf(d).hice.trim()?"x":"").length,false);add("sesiones de entrenamiento",enDone().length,false,enPlan()?"":"plan aún sin cargar");gh();tail()}
  else if(id==="finanzas"){add("cuentas",nAcc,true);add("gastos",nExp,true);add("ingresos",nInc,true);add("decisiones de dinero",S.decisions.length,false);tail()}
  else if(id==="carrera"){add("proyectos",S.projects.length,true);add("habilidades",S.skills.length,true);add("bitácora · Hice/Decidí/Siguiente (14 d)",withF(["hice","decidi","siguiente"]),false);gh();tail()}
  else if(id==="aprendizaje"){add("bitácora · Aprendí/Me trabé/Hice (14 d)",withF(["aprendi","trabe","hice"]),true);add("tarjetas de repaso",S.cards.length,true);add("Bandeja (notas abiertas)",S.inbox.filter(n=>n.state==="open").length,false);gh();tail()}
  else if(id==="sistema"){add("días con actividad (14 d)",d14.filter(hasAct).length,true);add("misiones (14 d)",S.missions.filter(m=>String(m.created||"")>=addDays(t,-14)).length,false);add("propuestas de agentes",S.missions.reduce((a,m)=>a+(m.proposals||[]).length,0),false);gh();tail()}
  else if(id==="nexo"){const b=S.board;add("despachos en el Tablero",b?Object.keys(b.last||{}).length:0,true);add("Tablero de estado",b?1:0,true);
    add("hábitos configurados (respaldo)",c.habits.length,false);add("proyectos en curso (respaldo)",S.projects.filter(p=>(p.status||"idea")==="doing").length,false);add("entradas de bitácora (respaldo)",d14.filter(hasLogText).length,false);add("cuentas (respaldo)",nAcc,false)}
  else{tail()}
  return o}
const srcEmpty=id=>srcStat(id).filter(s=>s.n===0);
const srcHeader=id=>"DATOS QUE RECIBISTE (conteos de esta consulta): "+srcStat(id).map(s=>s.k+" "+s.n+(s.n===0?" [VACÍO"+(s.note?": "+s.note:"")+"]":"")).join(" · ")+".";
/* sin datos = todas las fuentes principales del agente llegaron vacías */
function sinDatosDe(id){const core=srcStat(id).filter(s=>s.core);return core.length>0&&core.every(s=>s.n===0)}
function emptyRule(id,chat){const e=srcEmpty(id).filter(s=>s.k.indexOf("(respaldo)")<0&&s.k.indexOf("perfil")<0&&s.k.indexOf("expediente")<0);if(!e.length)return"";const sd=sinDatosDe(id);
  return "\n\nFUENTES VACÍAS: "+e.map(s=>s.k).join(", ")+". Si una fuente está vacía es porque "+WHO()+" aún no ha registrado nada, no porque algo esté mal. "+
    (sd?"TODAS tus fuentes principales llegaron vacías: no des un consejo genérico ni inventes cifras. "+(chat?"Dilo con claridad y pídele UN solo dato, el más útil y fácil de responder":"En hallazgo di con claridad qué no tienes, en faltan lista (1 a 3) los datos concretos que necesitas y en pregunta pídele UNO solo, el más útil y fácil de responder")+" (ej. «¿Cuánto tienes ahorrado y cuánto gastas al mes?»). Registrar ese dato puede ser tu recomendación, con duración y criterio de terminado.":
    "Para lo vacío no des consejo genérico: dilo en una línea y pídele "+(chat?"":"en pregunta ")+"el dato concreto que necesitas"+(chat?"":" (anótalo también en faltan)")+". Para lo demás, usa tus datos.")}
function odinBackup(){const c=cfg(),t=today(),o=["RESUMEN MÍNIMO DE LOS DATOS DE "+WHO()+" (respaldo directo; si un despacho dice otra cosa, manda el despacho):"];
  const d=S.days[t],sc=score(t),dn=c.habits.filter(h=>d&&d.habits&&d.habits[h.id]).map(h=>h.name);
  o.push("- Hábitos de hoy ("+t+"): "+(c.habits.length?dn.length+" de "+c.habits.length+" hechos"+(dn.length?" ("+dn.join(", ")+")":"")+" · "+sc.pts+"/"+sc.min+" puntos · racha "+streak()+" días"+(d&&d.energy?" · energía "+d.energy:""):"sin hábitos configurados"));
  const pr=S.projects.filter(p=>(p.status||"idea")==="doing");
  o.push("- Proyectos en curso: "+(pr.length?pr.map(p=>p.title+(p.next?" (siguiente: "+short(p.next,70)+")":"")).join("; "):"ninguno"+(S.projects.length?" (hay "+S.projects.length+" en otros estados)":" (no hay proyectos registrados)")));
  let ld="";for(let i=0;i<30&&!ld;i++){const s=addDays(t,-i),dd=S.days[s];if(dd&&hasLogText(dd))ld=s}
  if(ld){const l=logOf(S.days[ld]);o.push("- Última bitácora ("+ld+"): "+LF.filter(([f])=>l[f].trim()).map(([f,n])=>n.toLowerCase()+": "+short(l[f].replace(/\s+/g," "),110)).join(" | "))}else o.push("- Última bitácora: ninguna en los últimos 30 días");
  const fc=S.fin?finCalc(S.fin):null;
  if(enPlan()){const st=enStreak(),nx=enNext();o.push("- Entrenamiento: racha "+st.cur+" días ("+EN_STN[st.state]+"), siguiente sesión "+(nx?nx.name:"—")+", "+enDone().length+" sesiones registradas")}
  o.push("- Colchón: "+(fc&&(fc.total>0||fc.monthly>0)?(isFinite(fc.runway)?fc.runway.toFixed(1)+" meses":"sin gasto mensual que lo limite")+" (ahorro "+raw(fc.total)+", gasto fijo "+raw(fc.monthly)+"/mes)":"sin datos de finanzas"));
  return o.join("\n")}
function sourcesFor(id){return id==="nexo"?boardText()+"\n\n"+odinBackup():srcOf(id)}
/* evidencia: un dato concreto que exista en las fuentes del agente (cifra que aparece tal cual o palabras que coinciden) */
function hasEvidence(ev,src){ev=String(ev||"").trim();src=String(src||"");if(ev.length<12)return false;
  const nums=(ev.match(/\d[\d.,:\/-]*\d|\d/g)||[]).map(n=>n.replace(/[.,]$/,"")).filter(n=>n.length>=2);if(nums.some(n=>src.includes(n)))return true;
  return overlap(src,ev)>=.3}

/* ---------- expedientes ---------- */
const cpL=l=>(Array.isArray(l)?l:[]).map(x=>Object.assign({},x));
const dossierOf=id=>{const d=S.dossiers[id]||{};return{knows:cpL(d.knows),recs:cpL(d.recs),fb:cpL(d.fb),works:cpL(d.works),fails:cpL(d.fails)}};
function putDossier(id,d){d.updated=nowISO();d.recs=d.recs.slice(-40);d.knows=d.knows.slice(-15);d.fb=(d.fb||[]).slice(-60);d.works=(d.works||[]).slice(-12);d.fails=(d.fails||[]).slice(-12);return putDoc("dossiers/"+id,d)}
const noAplica=id=>dossierOf(id).fb.filter(x=>x.r==="noaplica").map(x=>x.t+(x.note?" ("+x.note+")":""));
function dossierText(id){const d=dossierOf(id);
  return "TU EXPEDIENTE\nLo que sabes de "+WHO()+" en tu área:\n"+(d.knows.length?d.knows.map(x=>"- "+x.t).join("\n"):"- (aún nada)")+
    "\nTus recomendaciones anteriores (fecha · estado · calificación · acción). Retoma las pendientes en vez de repetirlas; no repitas las hechas ni las ignoradas:\n"+(d.recs.length?d.recs.slice(-12).map(x=>"- "+String(x.at||"").slice(0,10)+" · "+x.state+(x.rate?" · "+RATEN[x.rate]:"")+": "+x.text+(x.dur?" ("+x.dur+")":"")).join("\n"):"- (ninguna aún)")+
    "\nLO QUE FUNCIONA CON "+WHO()+" (consúltalo antes de recomendar y apóyate en ello):\n"+(d.works.length?d.works.map(x=>"- "+x.t).join("\n"):"- (aún sin calificaciones)")+
    "\nLO QUE NO FUNCIONA CON "+WHO()+" (no repitas nada parecido):\n"+(d.fails.length?d.fails.map(x=>"- "+x.t).join("\n"):"- (aún sin calificaciones)")}
function dossierAdd(id,{facts,rec,src,reqEv,from}){const d=dossierOf(id);let ch=false;
  (Array.isArray(facts)?facts:[]).map(x=>short(x,160)).filter(x=>x.length>=6).slice(0,3).forEach(t=>{if(!d.knows.some(k=>overlap(k.t,t)>=.6)){d.knows.push({id:"k"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),t,at:nowISO()});ch=true}});
  if(rec&&typeof rec==="object"){const text=short(rec.accion||rec.text,170);
    if(text&&(!reqEv||hasEvidence(rec.evidencia,src))&&!d.recs.some(r=>r.state==="pendiente"&&overlap(r.text,text)>=.6)){
      const nr={id:"r"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),text,dur:short(rec.duracion,40),done:short(rec.terminado,130),ev:short(rec.evidencia,200),at:nowISO(),state:"pendiente",src:from||"chat"};
      if(rec.mid){nr.mid=rec.mid;if(rec.ai!=null)nr.ai=rec.ai}d.recs.push(nr);ch=true}}
  if(ch)putDossier(id,d);return ch}

/* ---------- retroalimentación: Útil / Ya lo sabía / No aplica, y lo que funciona o no con él ---------- */
const RATES=[["util","Útil"],["sabia","Ya lo sabía"],["noaplica","No aplica"]],RATEN={util:"útil",sabia:"ya lo sabía",noaplica:"no aplica"};
const rateKey=(agent,x)=>x.mid?x.mid+"·"+agent+(x.ai!=null?"·"+x.ai:""):x.id;
const fbOf=(agent,k)=>(((S.dossiers[agent]||{}).fb)||[]).find(x=>x.k===k);
function rateHTML(agent,k,text){if(!agent||!k)return"";const f=fbOf(agent,k);
  return `<div class="rate" data-ag="${esc(agent)}" data-k="${esc(k)}" data-t="${esc(short(text,170))}"><span class="ratel">${f?"Tu calificación":"¿Te sirvió?"}</span><span class="seg sm" role="group" aria-label="Calificar recomendación">${RATES.map(([r,l])=>`<button type="button" data-r="${r}" aria-pressed="${!!f&&f.r===r}">${l}</button>`).join("")}</span>${f?`<input type="text" class="rnote" maxlength="160" value="${esc(f.note||"")}" placeholder="Nota opcional (Enter para guardar)" aria-label="Nota sobre esta recomendación">`:""}</div>`}
function deriveFb(d,k){d.works=d.works.filter(x=>x.k!==k);d.fails=d.fails.filter(x=>x.k!==k)}
function rateSet(agent,k,text,r,note){const d=dossierOf(agent),prev=d.fb.find(x=>x.k===k);
  if(prev&&prev.r===r&&note===undefined)d.fb=d.fb.filter(x=>x.k!==k);
  else{const e=prev||{k,t:short(text,170),at:nowISO()};e.r=r;if(note!==undefined)e.note=short(note,160);e.upd=nowISO();if(!prev)d.fb.push(e)}
  deriveFb(d,k);const cur=d.fb.find(x=>x.k===k);
  if(cur){const n=cur.note?" — "+cur.note:"";if(cur.r==="util")d.works.push({k,t:"Le sirvió: "+short(cur.t,130)+n,at:nowISO()});else d.fails.push({k,t:(cur.r==="sabia"?"Ya lo sabía (no repetir lo obvio): ":"No aplica: ")+short(cur.t,130)+n,at:nowISO()})}
  d.recs.forEach(x=>{if(rateKey(agent,x)===k){if(cur)x.rate=cur.r;else delete x.rate}});
  putDossier(agent,d);return cur}
function rateSaveNote(i){const w=i.closest(".rate"),f=fbOf(w.dataset.ag,w.dataset.k),v=i.value.trim();if(!f||(f.note||"")===v)return;rateSet(w.dataset.ag,w.dataset.k,w.dataset.t,f.r,v);toast("Nota guardada para "+nameOf(w.dataset.ag))}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest(".rate button[data-r]");if(!b)return;const w=b.closest(".rate"),ag=w.dataset.ag,k=w.dataset.k;
  const cur=rateSet(ag,k,w.dataset.t,b.dataset.r);toast(cur?"Calificado: "+RATEN[cur.r]+". "+nameOf(ag)+" lo tomará en cuenta.":"Calificación quitada");renderAll();
  const sel='.rate[data-k="'+(window.CSS&&CSS.escape?CSS.escape(k):k)+'"]';const nb=document.querySelector(sel+' button[data-r="'+b.dataset.r+'"]');if(nb)nb.focus({preventScroll:true})});
document.addEventListener("keydown",e=>{const i=e.target.closest&&e.target.closest(".rate .rnote");if(!i||e.key!=="Enter")return;e.preventDefault();rateSaveNote(i);i.blur()});
document.addEventListener("change",e=>{const i=e.target.closest&&e.target.closest(".rate .rnote");if(i)rateSaveNote(i)});
const typingNote=el=>{const a=document.activeElement;return !!(a&&a.classList&&a.classList.contains("rnote")&&el.contains(a))};

/* misión del día: resultado al cerrar el día */
const QOUT={cumplida:"Cumplida",parcial:"Parcial",no:"No cumplida"},QWHY={tiempo:"Falta de tiempo",energia:"Falta de energía",prioridad:"No era prioridad",como:"No supe cómo"};
function questFeedback(day,q){const ag=q.dept==="nexo"||depts().some(d=>d.id===q.dept)?q.dept:"nexo",k="q:"+day,d=dossierOf(ag);deriveFb(d,k);
  if(q.outcome==="cumplida")d.works.push({k,t:"Cumplió la misión del día ("+day+"): "+short(q.text,130),at:nowISO()});
  else if(q.outcome)d.fails.push({k,t:(q.outcome==="parcial"?"Misión parcial":"Misión no cumplida")+" ("+day+"): "+short(q.text,110)+(q.reason?" — "+QWHY[q.reason].toLowerCase():""),at:nowISO()});
  putDossier(ag,d)}
function setQuestOutcome(day,o,why){const q0=S.quests[day];if(!q0)return;const q=Object.assign({},q0);delete q.id;
  if(o!==undefined){if(q.outcome===o&&why===undefined){delete q.outcome;delete q.reason;q.done=false}else{q.outcome=o;q.done=o==="cumplida";if(q.done)delete q.reason;q.doneAt=nowISO()}}
  if(why!==undefined&&q.outcome&&q.outcome!=="cumplida")q.reason=q.reason===why?undefined:why;
  if(q.reason===undefined)delete q.reason;q.ratedAt=nowISO();S.quests[day]=Object.assign({},q);save("quests/"+day,q);questFeedback(day,q);
  if(q.done&&!q0.done){toast("+15 XP · misión del día cumplida");try{bubble(SC.cmd,"¡Misión cumplida!",2500,GOLD)}catch(e){}}
  delete CM[day];renderAll()}
/* misiones que fallaron 2+ veces por «no supe cómo»: Odín las divide en pasos chicos en vez de repetirlas */
function stuckMissions(){const qs=Object.entries(S.quests).map(([d,q])=>Object.assign({date:d},q)).filter(q=>q.outcome&&q.outcome!=="cumplida"&&q.reason==="como"),out=[];
  qs.forEach(q=>{const base=q.parent||q.text;if(out.some(x=>overlap(x.text,base)>=.5))return;
    const n=qs.filter(o=>{const b=o.parent||o.text;return overlap(b,base)>=.5||overlap(base,b)>=.5}).length;if(n>=2)out.push({text:base,n})});return out}
function splitPrompt(text){return BASEP()+"\n\nDIVIDIR MISIÓN. Eres NEXO, encarnado en Odín. Esta misión del día falló dos o más veces porque "+WHO()+" no supo cómo hacerla: «"+text+"». No la repitas: divídela en 2 a 4 pasos chicos, concretos y en orden, de máx 25 min cada uno, cada uno con su criterio de terminado observable. El primero debe poder empezarse hoy sin saber nada nuevo.\nResponde solo con JSON: {\"pasos\":[\"paso 1 · cómo sé que terminé\",\"…\"]}"}
async function splitQuest(text){try{const r=await sample.json(splitPrompt(text),{modelTier:"quick",cache:false});return (Array.isArray(r&&r.pasos)?r.pasos:[]).map(x=>short(x,150)).filter(Boolean).slice(0,4)}catch(e){return[]}}

/* resultados por agente para la revisión semanal */
function agentStats(days){const since=addDays(today(),-(days-1)),st={};
  depts().forEach(dp=>{const id=dp.id,d=dossierOf(id),fb=d.fb.filter(x=>String(x.upd||x.at||"").slice(0,10)>=since);
    const qs=Object.entries(S.quests).filter(([dt,q])=>dt>=since&&q.dept===id&&q.outcome).map(x=>x[1]);
    const o={util:fb.filter(x=>x.r==="util").length,sabia:fb.filter(x=>x.r==="sabia").length,noap:fb.filter(x=>x.r==="noaplica").length,
      hechas:d.recs.filter(r=>r.state==="hecha"&&String(r.upd||r.at||"").slice(0,10)>=since).length,ignoradas:d.recs.filter(r=>r.state==="ignorada"&&String(r.upd||r.at||"").slice(0,10)>=since).length,
      cumplidas:qs.filter(q=>q.outcome==="cumplida").length,fallidas:qs.filter(q=>q.outcome!=="cumplida").length};
    o.n=o.util+o.sabia+o.noap+o.hechas+o.ignoradas+o.cumplidas+o.fallidas;o.score=o.util+o.hechas+o.cumplidas-o.noap-.5*(o.sabia+o.ignoradas+o.fallidas);st[id]=o});
  const ids=Object.keys(st).filter(id=>st[id].n>0).sort((a,b)=>st[b].score-st[a].score||st[b].util-st[a].util);
  return{st,best:ids[0]||"",worst:ids.length>1?ids[ids.length-1]:""}}
const statLine=(id,o)=>nameOf(id)+": "+o.util+" útiles, "+o.hechas+" hechas, "+o.cumplidas+" misiones cumplidas, "+o.noap+" no aplica, "+o.sabia+" ya lo sabía, "+o.ignoradas+" ignoradas, "+o.fallidas+" misiones fallidas (puntaje "+o.score+")";
function tunePrompt(id,o){const d=depts().find(x=>x.id===id),hf=depts().find(x=>x.id==="sistema"),dd=dossierOf(id),notes=dd.fb.filter(x=>x.note).map(x=>RATEN[x.r]+": "+x.t+" — "+x.note);
  return BASEP()+"\n\nAJUSTE DE MISIÓN. Eres el agente del departamento "+(hf?hf.name:"Auditoría del sistema")+", encarnado en Hefesto. Tu carácter: "+(TRAITS.sistema||"")+
    "\nEl agente con peores resultados esta semana es "+gn(d)+" ("+d.name+"). Sus números: "+statLine(id,o)+"."+
    "\nSu misión actual: «"+d.mission+"»\nLo que no funcionó con "+WHO()+" según su expediente:\n"+(dd.fails.map(x=>"- "+x.t).join("\n")||"- (nada)")+(notes.length?"\nNotas de "+WHO()+":\n"+notes.map(x=>"- "+x).join("\n"):"")+
    "\n\nPropón UN ajuste concreto a su misión que ataque la causa de esos resultados (no la cambies por completo si no hace falta). "+WHO()+" lo aprueba o lo descarta.\nResponde solo con JSON: {\"mision\":\"texto completo de la misión ajustada, máx 420 caracteres\",\"porque\":\"qué cambia y por qué, con los números, máx 220 caracteres\"}"}

/* ---------- autorrevisión del despacho ---------- */
function durMin(s){s=String(s||"").toLowerCase();let m=0,f=false;const h=s.match(/(\d+(?:[.,]\d+)?)\s*(?:h\b|hr|hora)/);if(h){m+=parseFloat(h[1].replace(",","."))*60;f=true}const mi=s.match(/(\d+)\s*(?:min|m\b)/);if(mi){m+=+mi[1];f=true}return f?Math.round(m):0}
function reviewIssues(o,cap,noap,src){const is=[],a=o.recomendacion.accion;
  if(o.sinDatos)return(o.pregunta||o.faltan.length)?[]:["no pide a "+WHO()+" el dato concreto que necesita"];
  if(!hasEvidence(o.evidencia,src))is.push("no cita un dato concreto de tus fuentes en evidencia");
  if(cap&&cap.min&&durMin(o.recomendacion.duracion)>cap.min)is.push("la duración ("+o.recomendacion.duracion+") no cabe en la capacidad de hoy que reportó "+(cap.from||"Heracles")+" ("+cap.min+" min)");
  if(a&&!o.recomendacion.terminado)is.push("no dice cómo sabrá "+WHO()+" que terminó (criterio de terminado)");
  const na=noap.find(x=>overlap(x,a)>=.6||overlap(a,x)>=.6);if(na)is.push("repite algo que "+WHO()+" marcó como «No aplica»: "+short(na,120));
  return is}
function revisePrompt(d,raw,issues,src,cap,noap){return BASEP()+"\n\nCORRIGE TU DESPACHO. Eres "+gn(d)+" ("+d.name+"). Tu autorrevisión encontró estas fallas:\n"+issues.map(x=>"- "+x).join("\n")+
  "\nCorrígelas sin perder lo que estaba bien. La evidencia debe ser un dato que aparezca tal cual en tus FUENTES."+(cap&&cap.min?" La duración debe caber en "+cap.min+" min.":"")+(noap.length?" No recomiendes nada parecido a: "+noap.join("; ")+".":"")+
  "\n\nDESPACHO ACTUAL:\n"+JSON.stringify(raw)+"\n\nFUENTES\n"+src+"\n\nResponde solo con el JSON del despacho corregido, con el mismo formato."}

/* ---------- hilos: resumen rodante + últimos 10 mensajes ---------- */
const THR_MAX=10;
const threadOf=id=>{const t=S.chats[id]||{};return{summary:t.summary||"",msgs:(t.msgs||[]).map(m=>Object.assign({},m)),n:t.n||0,unread:t.unread||0}};
function putThread(id,t){t.updated=nowISO();putDoc("chats/"+id,t);if(t.msgs.length>THR_MAX)foldThread(id)}
function threadPush(id,...ms){const t=threadOf(id);ms.forEach(m=>{t.msgs.push(Object.assign({at:nowISO()},m));t.n++});putThread(id,t);return t}
const msgLine=(id,m)=>(m.r==="u"?""+WHO()+"":nameOf(id))+(m.k==="despacho"?" (despacho de misión)":m.k==="mision"?" (misión)":m.k==="resumen"?" (cierre de misión)":"")+": "+short(m.t,500)+(m.d&&m.d.recomendacion&&m.d.recomendacion.accion?" → recomendó: "+m.d.recomendacion.accion:"")+((m.acts||[]).length?" → acciones: "+m.acts.map(a=>a.accion).join("; "):"");
function foldPrompt(id,sum,over){return "RESUMEN RODANTE. Actualiza el resumen de la conversación entre "+WHO()+" y "+nameOf(id)+". Conserva lo importante: decisiones, compromisos, datos personales que él contó, recomendaciones y su estado. Máx 700 caracteres, en español, en tercera persona, sin inventar.\n\nResumen actual: "+(sum||"(vacío)")+"\n\nMensajes que salen del hilo:\n"+over.map(m=>"- "+msgLine(id,m)).join("\n")+"\n\nResponde solo con JSON: {\"summary\":\"...\"}"}
const FOLDING={};
async function foldThread(id){if(FOLDING[id])return;const t0=threadOf(id);if(t0.msgs.length<=THR_MAX)return;FOLDING[id]=true;
  try{const over=t0.msgs.slice(0,t0.msgs.length-THR_MAX);let sum="";
    try{if(sample&&!sampleOff){const r=await sample.json(foldPrompt(id,t0.summary,over),{modelTier:"quick",cache:false});sum=short(r&&r.summary,800)}}catch(e){}
    if(!sum)sum=short((t0.summary?t0.summary+" | ":"")+over.map(m=>(m.r==="u"?"Tú: ":nameOf(id)+": ")+short(m.t,90)).join(" | "),800);
    const t=threadOf(id);t.msgs.splice(0,over.length);t.summary=sum;t.updated=nowISO();putDoc("chats/"+id,t)}
  finally{FOLDING[id]=false}
  if(threadOf(id).msgs.length>THR_MAX)foldThread(id)}

/* ---------- chat privado con cada agente ---------- */
function chatPrompt(id,t,text){
  const odin=id==="nexo",d=odin?null:depts().find(x=>x.id===id);
  return BASEP()+"\n\nCHAT PRIVADO. "+(odin?"Eres NEXO, encarnado en Odín. Tu carácter: "+TRAITS.nexo:"Eres el agente del departamento "+d.name+(gn(d)!==d.name?", encarnado en "+gn(d):"")+". Tu misión permanente: "+d.mission+(TRAITS[id]?"\nTu carácter: "+TRAITS[id]:""))+" Que se note un poco en el tono, sin perder claridad."+
    (odin?"\nVes los despachos del escuadrón, el Tablero de estado y un RESUMEN MÍNIMO de los datos de "+WHO()+" como respaldo (abajo); no ves el detalle de cada área. NUNCA respondas «no hay datos» ni «no hay despachos»: si no hay despachos ni Tablero, responde con el RESUMEN MÍNIMO y di que para armar el Tablero hay que convocar al escuadrón (botón «Enviar y convocar»). Si te pide un dato concreto, responde con lo que dicen los despachos y di qué agente lo lleva. Esta es una respuesta rápida sin convocar al escuadrón.":
      "\nTus FUENTES son solo las de abajo ("+SRCN[id]+"). Hablas de tu área; si te preguntan por otra, dilo en una línea y señala al agente que la lleva. Si algo no está en tus fuentes, no lo sabes: no lo inventes.\n"+srcHeader(id)+emptyRule(id,true))+
    exText(id)+(id==="habitos"?EN_COACH:"")+
    "\n\n"+dossierText(id)+
    (t.summary?"\n\nRESUMEN DE LA CONVERSACIÓN ANTERIOR: "+t.summary:"")+
    (t.msgs.length?"\n\nÚLTIMOS MENSAJES:\n"+t.msgs.slice(-THR_MAX).map(m=>"- "+msgLine(id,m)).join("\n"):"")+
    "\n\n"+(odin?"":"FUENTES\n")+sourcesFor(id)+
    "\n\nMensaje de "+WHO()+": \""+text+"\""+
    "\n\nResponde como en un chat: directo, corto y útil. Si das una recomendación, que cite un dato concreto de tus fuentes y tenga duración y criterio de terminado."+
    "\nResponde solo con JSON: {\"reply\":\"tu respuesta, máx 700 caracteres\",\"sobre_ti\":[\"0 a 2 hechos duraderos y NUEVOS que "+WHO()+" te contó en este mensaje\"]"+
    (odin?"":",\"recomendacion\":null o {\"accion\":\"\",\"duracion\":\"\",\"terminado\":\"\",\"evidencia\":\"dato concreto de tus fuentes\"},\"patron\":null o {\"texto\":\"patrón repetido que tus fuentes muestran y no está en el perfil\",\"evidencia\":\"dato concreto\"}")+"}"}
const CHATPEND={},CHATERR={};
async function chatSend(id,text){
  text=String(text||"").trim();if(!text||CHATPEND[id])return false;
  if(running){toast("Hay una misión en curso. Espera a que termine para chatear.");return false}
  if(!sample||sampleOff){toast(errCopy({code:"no_key"}));closeConsole();show("ajustes");return false}
  const t=threadOf(id),src=sourcesFor(id)+"\n"+text;CHATPEND[id]=text.slice(0,1500);delete CHATERR[id];renderChat();
  const a=SC.agents[id];if(a)a.emote={k:"?",until:performance.now()+2500};
  try{const cp=chatPrompt(id,t,text.slice(0,1500));let r;try{r=await sample.json(cp,{modelTier:"default",cache:false})}catch(e1){if(!(e1&&e1.code==="invalid_json"))throw e1;r=await sample.json(cp+JSON_RETRY,{modelTier:"default",cache:false})}
    const reply=short(r&&r.reply,1400)||"…";
    threadPush(id,{r:"u",k:"chat",t:text.slice(0,1500)},{r:"a",k:"chat",t:reply});
    dossierAdd(id,{facts:r&&r.sobre_ti,rec:id==="nexo"?null:r&&r.recomendacion,src,reqEv:true,from:"chat"});
    if(id!=="nexo"&&r&&r.patron&&proposePattern(r.patron,id,src))toast(nameOf(id)+" propone un patrón para tu perfil");
    if(a){bubble(a,mm(short(reply,90)),4200);a.emote={k:"♪",until:performance.now()+1500}}
    delete CHATPEND[id];return true}
  catch(e){if(e&&["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(e.code))sampleOff=true;
    CHATERR[id]=errCopy(e);if(id===CHATID&&!$("c-text").value)$("c-text").value=CHATPEND[id];delete CHATPEND[id];return false}
  finally{renderChat();renderExp()}}

/* ---------- consola emergente: chat + expediente ---------- */
let CHATID="nexo",POPFROM=null;
const STARTERS={nexo:["¿Cómo está mi tablero hoy?","¿Qué hago primero hoy?"],habitos:["¿Cómo voy con mis hábitos esta semana?","¿Qué hábito conviene ajustar?"],finanzas:["¿Cuántos meses de colchón tengo?","¿Conviene mover mis ahorros?"],carrera:["¿Qué camino tiene más evidencia hoy?","¿Qué experimento hago esta semana?"],aprendizaje:["¿En qué me trabé estos días?","¿Qué repaso hoy?"],sistema:["¿Qué fricción ves en el sistema?","¿Qué uso poco y conviene quitar?"]};
/* hablarle a Odín = desplegar una misión (por defecto). Para «planear mi día», «reunión general» y la primera misión de cada día, convoca a TODOS. */
const ALLRE=/(planea\w*|organiza\w*|arma\w*|define\w*)\s+(mi|el|este|nuestro)\s+dia|reunion\s+(general|de\s+escuadron)|junta\s+general|revision\s+general|convoca\w*\s+a\s+todos|plan\s+del\s+dia/;
const flat=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
function firstToday(){const t=today();return !S.missions.some(m=>(m.origin||"nexo")==="nexo"&&m.status==="done"&&m.created&&ds(new Date(m.created))===t)}
function coldStart(){const b=S.board;return !b||!Object.keys(b.last||{}).length}
function convokeWhy(text){return coldStart()?"cold":ALLRE.test(flat(text))?"text":firstToday()?"first":""}
const convokeAll=text=>!!convokeWhy(text);
function odinSend(text){text=String(text||"").trim();if(!text)return;const why=convokeWhy(text);closeConsole();runMission(text,"",!!why,{why})}
function openConsole(id){
  CHATID=id||"nexo";const back=$("console-back");$("c-target").value=id||"";
  let nm="Odín",sub="Coordina al escuadrón · ve despachos y Tablero";
  if(id){const d=depts().find(x=>x.id===id);if(d){nm=gn(d);sub=d.name+" · fuentes: "+(SRCN[id]||"su área")}}
  $("pop-title").textContent=nm;$("pop-sub").textContent=sub;$("console-pop").dataset.who=id?"agent":"odin";
  const f=portrait(id?id:"nexo");if(f)$("pop-face").src=f;
  $("c-text").placeholder=id?"Escríbele a "+nm+"…":"Escríbele a Odín, o cuenta lo que hiciste…";
  $("c-hint").textContent=id?"Chat privado con "+nm+". Solo ve sus fuentes ("+(SRCN[id]||"su área")+"), tu perfil y este hilo: un resumen más los últimos 10 mensajes.":"«Enviar y convocar» pone a trabajar al escuadrón: Odín planea, convoca a los agentes que hagan falta, cada uno entrega su despacho con SUS fuentes y Odín sintetiza. Para planear tu día, la reunión general, la primera misión del día o si el Tablero está vacío, convoca a TODOS (Heracles → Moneta → Jano → Atenea → Hefesto → Odín). «Solo preguntarle a Odín» responde rápido sin convocar. «Registrar avance» anota lo que ya hiciste.";
  if(back.hidden)POPFROM=document.activeElement;back.hidden=false;setCTab("chat");renderChat();renderExp();
  const th=threadOf(CHATID);if(th.unread){th.unread=0;putDoc("chats/"+CHATID,Object.assign(th,{updated:nowISO()}));renderRoster()}
  setTimeout(()=>{try{$("c-text").focus({preventScroll:true})}catch(e){}},30)}
function closeConsole(){const b=$("console-back");if(b.hidden)return;b.hidden=true;try{if(POPFROM&&document.body.contains(POPFROM)&&POPFROM.focus)POPFROM.focus({preventScroll:true})}catch(e){}POPFROM=null}
function setCTab(k){["chat","exp"].forEach(x=>{const on=x===k;$("ct-"+x).setAttribute("aria-selected",String(on));$("ct-"+x).tabIndex=on?0:-1;$("cv-"+x).hidden=!on});if(k==="chat"){const L=$("chatlog");L.scrollTop=L.scrollHeight}}
$("ct-chat").onclick=()=>setCTab("chat");$("ct-exp").onclick=()=>{setCTab("exp");renderExp()};
$("console-pop").querySelector(".ctabs").addEventListener("keydown",e=>{if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;const k=$("ct-chat").getAttribute("aria-selected")==="true"?"exp":"chat";setCTab(k);$("ct-"+k).focus()});
$("pop-close").onclick=closeConsole;
$("console-back").addEventListener("mousedown",e=>{if(e.target===$("console-back"))closeConsole()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeConsole()});
const recLabel=k=>({pendiente:"Pendiente",hecha:"Hecha",ignorada:"Ignorada"})[k]||k;
function despBody(d){if(!d)return"";const r=d.recomendacion||{};
  return `<dl class="desp">${d.evidencia?`<dt>Evidencia</dt><dd>${T(d.evidencia)}</dd>`:""}${r.accion?`<dt>Recomendación</dt><dd>${T(r.accion)}${r.duracion?` <span class="dur">${T(r.duracion)}</span>`:""}${r.terminado?`<span class="done">Terminado cuando: ${T(r.terminado)}</span>`:""}</dd>`:""}${d.para&&(d.para.agente||d.para.porque)?`<dt>Para</dt><dd>${d.para.agente?`<strong>${esc(nameOf(d.para.agente))}</strong>`:""}${d.para.porque?(d.para.agente?" · ":"")+T(d.para.porque):""}</dd>`:""}${d.pregunta?`<dt>Pregunta</dt><dd>${T(d.pregunta)}</dd>`:""}${(d.faltan||[]).length?`<dt>Datos que faltan</dt><dd>${T(d.faltan.join("; "))}</dd>`:""}</dl>${d.confianza?`<span class="conf c-${esc(d.confianza)}">Confianza ${esc(d.confianza)}</span>`:""}`}
function actsHTML(acts,mid){return `<ol class="acts">${acts.map((a,i)=>`<li><span class="hora">${esc(a.hora||"—")}</span><div><strong>${T(a.accion)}</strong>${a.terminado?`<span class="done">Terminado cuando: ${T(a.terminado)}</span>`:""}${(a.basado_en||[]).length?`<span class="by">Basado en: ${esc(a.basado_en.map(nameOf).join(", "))}</span>`:""}${mid?rateHTML("nexo",mid+"·nexo·"+i,a.accion):""}</div></li>`).join("")}</ol>`}
function msgHTML(id,m){const me=m.r==="u",w=whoInfo(me?"cmd":id),src=me?"":portrait(id);let body;
  if(m.k==="despacho")body=`<div class="ctag">Despacho de misión${m.ord?" · "+T(short(m.ord,80)):""}</div><div class="ct"><strong>${T(m.t)}</strong></div>${despBody(m.d)}${m.m&&m.d&&m.d.recomendacion?rateHTML(id,m.m+"·"+id,m.d.recomendacion.accion||m.t):""}`;
  else if(m.k==="resumen")body=`<div class="ctag">Cierre de misión</div><div class="ct">${T(m.t)}</div>${(m.acts||[]).length?actsHTML(m.acts,m.m):""}${m.conf?`<div class="ctag">Conflicto resuelto</div><div class="ct">${T(m.conf)}</div>`:""}${(m.ds||[]).length?`<div class="ctag">Despachos recibidos</div><ul class="dsl">${m.ds.map(x=>`<li><strong style="color:${whoInfo(x.a).color}">${esc(nameOf(x.a))}</strong>${x.sd?` <span class="chip warn">Sin datos</span>`:""}${x.ok?"":` <span class="chip">Descartado</span>`}: ${T(x.t||"—")}</li>`).join("")}</ul>`:""}`;
  else if(m.k==="convoca")body=`<div class="ctag">Convocatoria</div><div class="ct">${T(m.t)}</div>`;
  else if(m.k==="mision")body=`<div class="ctag">Misión desplegada</div><div class="ct">${T(m.t)}</div>`;
  else if(m.k==="pregunta")body=`<div class="ctag">Pregunta · señal de GitHub</div><div class="ct">${T(m.t)}</div>`;
  else if(m.k==="registro")body=`<div class="ctag">Registro de avance</div><div class="ct">${T(m.t)}</div>`;
  else body=`<div class="ct">${T(m.t)}</div>`;
  return `<div class="cm ${me?"me":"ag"}" style="--ac:${w.color}">${me?"":src?`<img class="av" src="${src}" alt="">`:`<span class="av"></span>`}<div class="cb"><div class="cmh"><strong style="color:${me?GOLD:w.color}">${esc(me?"Tú":w.name)}</strong><span class="tm">${hhmm(m.at)}</span></div>${body}</div></div>`}
function renderChat(){
  if($("console-back").hidden)return;const id=CHATID,t=threadOf(id),L=$("chatlog"),p=CHATPEND[id];let h="",last="";
  if(t.summary)h+=`<div class="csum"><span class="eyebrow">Resumen de lo anterior</span><p>${T(t.summary)}</p></div>`;
  t.msgs.forEach(m=>{const dd=m.at?ds(new Date(m.at)):"";if(dd&&dd!==last){last=dd;h+=`<div class="cday"><span>${esc(dd===today()?"Hoy":pretty(dd))}</span></div>`}h+=msgHTML(id,m)});
  if(p)h+=msgHTML(id,{r:"u",t:p,at:nowISO()})+`<div class="cm ag"><span class="av"></span><div class="cb"><div class="thinking"><i></i><i></i><i></i><span>${esc(nameOf(id))} escribe…</span></div></div></div>`;
  if(CHATERR[id])h+=`<div class="sys err">${T(CHATERR[id])}</div>`;
  if(!h){const d=dossierOf(id);h=`<div class="cintro"><p>${id==="nexo"?"Soy Odín. Lo que me digas lo convierto en una misión: convoco a los agentes que hagan falta, cada uno trabaja con sus fuentes y yo sintetizo. Si solo quieres una respuesta rápida, usa «Solo preguntarle a Odín».":"Soy "+esc(nameOf(id))+". Llevo "+esc(SRCN[id]||"mi área")+"; solo veo eso, tu perfil y este chat."}${d.knows.length?" Sé "+d.knows.length+" cosa"+(d.knows.length===1?"":"s")+" de ti (mira el Expediente).":""}</p><div class="starters">${(STARTERS[id]||[]).map(s=>`<button type="button" class="btn ghost" data-starter="${esc(s)}">${esc(s)}</button>`).join("")}</div></div>`}
  if(L.__h!==h&&!typingNote(L)){const stick=L.__id!==id||L.scrollHeight-L.scrollTop-L.clientHeight<60;L.innerHTML=h;L.__h=h;if(stick)L.scrollTop=L.scrollHeight}L.__id=id;
  $("c-send").disabled=!!p||running;$("c-send").textContent=p?"Enviando…":id==="nexo"?"Enviar y convocar":"Enviar";$("c-ask").disabled=!!p||running||sampleOff;
  const n=dossierOf(id).recs.filter(r=>r.state==="pendiente").length,cn=$("ct-n");cn.hidden=!n;cn.textContent=n}
$("chatlog").addEventListener("click",e=>{const b=e.target.closest("button[data-starter]");if(!b)return;$("c-text").value=b.dataset.starter;$("c-text").focus()});
function renderExp(){
  if($("console-back").hidden)return;const id=CHATID,d=dossierOf(id);
  const kn=`<div class="row between"><h4 class="sub">Lo que sabe de ti</h4><span class="muted" style="font-size:.78rem">Fuentes: ${esc(SRCN[id]||"su área")}${id==="nexo"?"":" + tu perfil"}</span></div>`+
    (d.knows.length?`<ul class="knows">${d.knows.map(k=>`<li><span>${T(k.t)}</span><button type="button" class="popx sm" data-kdel="${esc(k.id)}" aria-label="Quitar: ${esc(short(k.t,40))}">×</button></li>`).join("")}</ul>`:`<div class="empty">Aún nada. Lo aprende de tus chats y de sus despachos; también puedes agregarlo tú.</div>`)+
    `<div class="fbcols"><div><h4 class="sub">Lo que funciona contigo</h4>${d.works.length?`<ul class="knows wk">${d.works.slice().reverse().map(x=>`<li><span>${T(x.t)}</span></li>`).join("")}</ul>`:`<div class="empty">Aún nada: califica sus recomendaciones con «Útil».</div>`}</div><div><h4 class="sub">Lo que no</h4>${d.fails.length?`<ul class="knows fl">${d.fails.slice().reverse().map(x=>`<li><span>${T(x.t)}</span></li>`).join("")}</ul>`:`<div class="empty">Nada marcado como «Ya lo sabía» o «No aplica».</div>`}</div></div>`;
  const order={pendiente:0,hecha:1,ignorada:2};const recs=d.recs.slice().sort((a,b)=>(order[a.state]||0)-(order[b.state]||0)||String(b.at).localeCompare(String(a.at)));
  const pend=d.recs.filter(r=>r.state==="pendiente").length;
  const rc=`<div class="row between"><h4 class="sub">${id==="nexo"?"Acciones":"Recomendaciones"}</h4><span class="chip ${pend?"warn":""}">${pend} pendiente${pend===1?"":"s"}</span></div>`+
    (recs.length?recs.map(r=>`<div class="rec s-${esc(r.state)}" data-id="${esc(r.id)}"><div class="row between"><span class="muted" style="font-size:.78rem">${esc(r.at?pretty(ds(new Date(r.at))):"")}${r.src?" · "+esc(r.src):""}</span><span class="chip ${r.state==="hecha"?"ok":r.state==="pendiente"?"warn":""}">${esc(recLabel(r.state))}</span></div><div class="rt">${T(r.text)}</div>${r.dur||r.done?`<div class="muted" style="font-size:.82rem">${r.dur?T(r.dur)+(r.done?" · ":""):""}${r.done?"Terminado cuando: "+T(r.done):""}</div>`:""}${r.ev?`<div class="muted" style="font-size:.8rem">Evidencia: ${T(r.ev)}</div>`:""}<div class="seg" role="group" aria-label="Estado de la recomendación">${["pendiente","hecha","ignorada"].map(k=>`<button type="button" data-st="${k}" aria-pressed="${r.state===k}">${recLabel(k)}</button>`).join("")}</div>${rateHTML(id,rateKey(id,r),r.text)}</div>`).join(""):`<div class="empty">Sin ${id==="nexo"?"acciones":"recomendaciones"} todavía.</div>`);
  const a=$("ex-knows"),b=$("ex-recs");if(a.__h!==kn){a.innerHTML=kn;a.__h=kn}if(b.__h!==rc&&!typingNote(b)){b.innerHTML=rc;b.__h=rc}}
$("cv-exp").addEventListener("click",e=>{const id=CHATID;const kd=e.target.closest("button[data-kdel]");
  if(kd){const d=dossierOf(id);d.knows=d.knows.filter(k=>k.id!==kd.dataset.kdel);putDossier(id,d);renderExp();toast("Dato quitado del expediente");return}
  const st=e.target.closest("button[data-st]");if(st){const box=st.closest(".rec"),d=dossierOf(id),r=d.recs.find(x=>x.id===box.dataset.id);if(!r||r.state===st.dataset.st)return;
    r.state=st.dataset.st;r.upd=nowISO();putDossier(id,d);renderExp();renderChat();const nb=document.querySelector('#ex-recs .rec[data-id="'+r.id+'"] button[data-st="'+r.state+'"]');if(nb)nb.focus()}});
$("ex-add").addEventListener("submit",e=>{e.preventDefault();const v=$("ex-fact").value.trim();if(!v)return;const d=dossierOf(CHATID);d.knows.push({id:"k"+Date.now().toString(36),t:short(v,160),at:nowISO(),by:"tú"});putDossier(CHATID,d);$("ex-fact").value="";renderExp()});
$("c-text").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();$("cf").requestSubmit()}});
$("cf").addEventListener("submit",async e=>{e.preventDefault();const id=CHATID,el=$("c-text"),t=el.value.trim();if(!t)return;
  if(id==="nexo"){if(running){toast("Hay una misión en curso. Espera a que termine.");return}if(!sample||sampleOff){toast("La orquestación en vivo no está disponible en esta vista.");return}el.value="";odinSend(t);return}
  el.value="";const ok=await chatSend(id,t);if(id===CHATID&&!$("console-back").hidden)try{el.focus({preventScroll:true})}catch(_){}if(!ok&&!el.value)el.value=t});
$("c-ask").onclick=async()=>{const el=$("c-text"),t=el.value.trim();if(!t){toast("Escribe primero tu pregunta y luego pulsa Solo preguntarle a Odín.");el.focus();return}
  if(CHATID!=="nexo")return;el.value="";const ok=await chatSend("nexo",t);if(!ok&&!el.value)el.value=t};
$("quick").addEventListener("click",e=>{const b=e.target.closest("button[data-q]");if(!b)return;closeConsole();{const why=convokeWhy(b.dataset.q)||(b.dataset.all?"text":"");runMission(b.dataset.q,"",!!why,{why})}});
$("c-stop").onclick=$("mbar-stop").onclick=()=>{stopFlag=true;if(ctl)ctl.abort()};

/* ---------- despachos ---------- */
function normDesp(r,d,src){r=r||{};const rc=r.recomendacion&&typeof r.recomendacion==="object"?r.recomendacion:{accion:r.recomendacion};
  const pa=r.para&&typeof r.para==="object"?r.para:{agente:"",porque:String(r.para||"")};const cf=String(r.confianza||"").toLowerCase();
  const o={agent:d.id,at:nowISO(),hallazgo:short(r.hallazgo||r.report,200),evidencia:short(r.evidencia,240),
    recomendacion:{accion:short(rc.accion,170),duracion:short(rc.duracion,40),terminado:short(rc.terminado,130)},
    confianza:["alta","media","baja"].includes(cf)?cf:"baja",para:{agente:agentIdFrom(pa.agente),porque:short(pa.porque,140)},
    pregunta:short(r.pregunta,200),sobre_ti:(Array.isArray(r.sobre_ti)?r.sobre_ti:[]).map(x=>short(x,160)).filter(Boolean).slice(0,2),detalle:String(r.detalle||r.detail||"").slice(0,800)};
  if(d.id==="habitos"&&r.capacidad&&typeof r.capacidad==="object"){const lv=String(r.capacidad.nivel||"").toLowerCase(),mn=parseInt(r.capacidad.minutos,10);o.capacidad={nivel:["alta","media","baja"].includes(lv)?lv:"media",minutos:mn>0&&mn<1000?mn:0}}
  o.faltan=(Array.isArray(r.faltan)?r.faltan:r.faltan?[r.faltan]:[]).map(x=>short(x,120)).filter(Boolean).slice(0,3);
  o.sinDatos=sinDatosDe(d.id);
  if(o.sinDatos&&!o.pregunta&&o.faltan.length)o.pregunta=short("¿Puedes registrar esto? "+o.faltan[0],200);
  o.ok=o.sinDatos?!!(o.hallazgo&&(o.pregunta||o.faltan.length)):!!(o.hallazgo&&o.recomendacion.accion&&hasEvidence(o.evidencia,src));
  o.motivo=o.ok?"":o.sinDatos?(!o.hallazgo?"no entregó hallazgo":"sin datos en sus fuentes y no pidió el dato concreto que necesita"):!o.hallazgo?"no entregó hallazgo":!o.recomendacion.accion?"no entregó recomendación":"no citó un dato concreto de sus fuentes";
  return o}
const despLine=o=>o.sinDatos?"- ["+o.agent+"] "+nameOf(o.agent)+" · SIN DATOS en sus fuentes ("+WHO()+" aún no registró nada ahí) | hallazgo: "+o.hallazgo+(o.faltan&&o.faltan.length?" | datos que le faltan: "+o.faltan.join("; "):"")+(o.pregunta?" | pregunta a "+WHO()+": "+o.pregunta:"")+(o.recomendacion.accion?" | recomendación: "+o.recomendacion.accion:""):"- ["+o.agent+"] "+nameOf(o.agent)+" · confianza "+o.confianza+" | hallazgo: "+o.hallazgo+" | evidencia: "+o.evidencia+" | recomendación: "+o.recomendacion.accion+(o.recomendacion.duracion?" ("+o.recomendacion.duracion+")":"")+(o.recomendacion.terminado?" · terminado cuando: "+o.recomendacion.terminado:"")+(o.para.agente?" | para "+nameOf(o.para.agente)+": "+o.para.porque:"")+(o.pregunta?" | pregunta: "+o.pregunta:"");
const despCompact=o=>({evidencia:o.evidencia,recomendacion:o.recomendacion,confianza:o.confianza,para:o.para,pregunta:o.pregunta,faltan:o.faltan||[],sinDatos:!!o.sinDatos});
const normHora=h=>{h=String(h||"").trim();const m=h.match(/(\d{1,2}):(\d{2})/);return m?(h.toLowerCase().includes("mañana")?"mañana ":"")+pad(+m[1])+":"+m[2]:short(h,16)};
function normBoard(syn,acc,mid){const prev=S.board||{},tb=syn.tablero||{},cap=tb.capacidad||{},ids=acc.map(o=>o.agent),last=Object.assign({},prev.last||{});
  acc.forEach(o=>{last[o.agent]={at:o.at,hallazgo:o.hallazgo,evidencia:o.evidencia,accion:o.recomendacion.accion,duracion:o.recomendacion.duracion,terminado:o.recomendacion.terminado,confianza:o.confianza,para:o.para.agente,pregunta:o.pregunta,sd:o.sinDatos?1:0,faltan:o.faltan||[]}});
  const actions=(Array.isArray(syn.acciones)?syn.acciones:[]).map(a=>({accion:short(a&&a.accion,170),hora:normHora(a&&a.hora),terminado:short(a&&a.terminado,130),
    basado_en:[...new Set((Array.isArray(a&&a.basado_en)?a.basado_en:[a&&a.basado_en]).map(agentIdFrom))].filter(x=>ids.includes(x))})).filter(a=>a.accion&&a.basado_en.length).slice(0,3);
  const lv=String(cap.nivel||"").toLowerCase();
  return{updated:nowISO(),date:today(),mission:mid,capacity:{level:["alta","media","baja"].includes(lv)?lv:"media",why:short(cap.porque,220),min:Math.max(0,Math.min(999,parseInt(cap.minutos,10)||0))},steps:(Array.isArray(tb.mision_pasos)?tb.mision_pasos:[]).map(x=>short(x,150)).filter(Boolean).slice(0,4),urgency:short(tb.urgencia,240),direction:short(tb.direccion,240),
    gaps:(Array.isArray(tb.huecos)?tb.huecos:[]).map(x=>short(x,160)).filter(Boolean).slice(0,5),quest:short(tb.mision_del_dia,150),actions,conflict:short(syn.conflicto,420),last}}

/* ---------- Tablero de estado (Nexo) ---------- */
const CAPL={alta:"Alta",media:"Media",baja:"Baja"};
function renderBoard(){const b=S.board,el=$("b-body"),wh=$("b-when");let h;
  if(!b){wh.textContent="Vacío";wh.className="chip";h=`<p class="hint">Odín lo llena con los despachos de cada misión: capacidad de hoy, urgencia, dirección, huecos y misión del día. Se actualiza tras cada misión.</p><div class="row"><button class="btn primary" type="button" data-bq="1">Planear mi día</button></div>`}
  else{const old=b.date!==today();wh.textContent=(old?"Del "+pretty(b.date):"Hoy")+" · "+hhmm(b.updated);wh.className="chip "+(old?"warn":"ok");
    const q=S.quests[today()],quest=q?q.text+(q.done?" (cumplida)":""):b.quest,cap=(b.capacity&&b.capacity.level)||"media";
    h=`<div class="bgrid"><div class="bcell cap c-${esc(cap)}"><span class="eyebrow">Capacidad de hoy</span><strong>${esc(CAPL[cap]||cap)}${b.capacity&&b.capacity.min?` · ${b.capacity.min} min`:""}</strong>${b.capacity&&b.capacity.why?`<p>${T(b.capacity.why)}</p>`:""}</div>
      <div class="bcell"><span class="eyebrow">Urgencia</span><p>${T(b.urgency||"—")}</p></div>
      <div class="bcell"><span class="eyebrow">Dirección</span><p>${T(b.direction||"—")}</p></div>
      <div class="bcell"><span class="eyebrow">Huecos</span>${(b.gaps||[]).length?`<ul>${b.gaps.map(g=>`<li>${T(g)}</li>`).join("")}</ul>`:`<p>Ninguno</p>`}</div>
      <div class="bcell quest"><span class="eyebrow">Misión del día${q?"":" (sugerida)"}</span><p>${T(quest||"—")}</p>${(q?q.steps||[]:b.steps||[]).length>1?`<ol class="qsteps">${(q?q.steps:b.steps).map((x,i)=>`<li${i===(q&&q.step?q.step-1:0)?' class="on"':""}>${T(x)}</li>`).join("")}</ol>`:""}${q&&!(q.steps||[]).length&&(b.steps||[]).length>1&&b.parent&&overlap(b.parent,q.parent||q.text)>=.5?`<p class="muted" style="font-size:.8rem;margin-top:6px">Odín la dividió en pasos chicos para la próxima:</p><ol class="qsteps">${b.steps.map(x=>`<li>${T(x)}</li>`).join("")}</ol>`:""}${q&&q.outcome?`<span class="chip ${q.outcome==="cumplida"?"ok":"warn"}">${esc(QOUT[q.outcome])}${q.reason?" · "+esc(QWHY[q.reason]):""}</span>`:""}</div></div>
      ${(b.actions||[]).length?`<div class="stack" style="gap:6px"><span class="eyebrow">Acciones de Odín</span>${actsHTML(b.actions,b.mission)}</div>`:""}
      ${b.conflict?`<div class="nextbox cond"><span>Cómo resolvió el conflicto</span><strong>${T(b.conflict)}</strong></div>`:""}${old?`<p class="hint">Es del ${esc(pretty(b.date))}: despliega una misión para actualizarlo.</p>`:""}`}
  if(el.__h!==h&&!typingNote(el)){el.innerHTML=h;el.__h=h}}
$("b-body").addEventListener("click",e=>{if(!e.target.closest("button[data-bq]"))return;const b=document.querySelector("#quick button[data-q]");if(b)runMission(b.dataset.q,"",true,{why:coldStart()?"cold":"text"})});


/* ---------- SEÑALES: actividad pública de GitHub (sin token; como máximo una consulta por hora; si falla, te dice exactamente por qué y todo sigue igual) ---------- */
const GH_TTL=3600e3,GH_LS="kasanov:gh:v1";let GH={state:"",msg:"",err:null,via:"",warn:"",test:null},GH_AUTO=false,GH_CSP=null;
try{document.addEventListener("securitypolicyviolation",e=>{if(/github/i.test(String(e.blockedURI||"")))GH_CSP={dir:e.effectiveDirective||e.violatedDirective||"connect-src",uri:String(e.blockedURI||"")}})}catch(e){}
const ghClean=s=>String(s||"").trim().replace(/^@/,"").replace(/^https?:\/\/(www\.)?github\.com\//i,"").split(/[\/?#]/)[0].trim();
const ghUser=()=>ghClean(profOf().github);
const ghValid=u=>/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(u);
const ghNorm=u=>String(u||"").toLowerCase().replace(/^https?:\/\/(www\.)?/,"").replace(/\.git$/,"").replace(/\/+$/,"");
const ghOwn=(full,u)=>String(full||"").toLowerCase().startsWith(String(u||"").toLowerCase()+"/");
const hm=ms=>{const d=new Date(ms);return pad(d.getHours())+":"+pad(d.getMinutes())};
const GH_ENV=["csp","network","offline"];
function ghMem(){try{return JSON.parse(localStorage.getItem(GH_LS)||"{}")||{}}catch(e){return{}}}
function ghMemSet(o){try{localStorage.setItem(GH_LS,JSON.stringify(Object.assign(ghMem(),o)))}catch(e){}}
/* errores con causa exacta: cada uno trae msg (qué pasó, en claro) y detail (dato técnico tal cual) */
async function ghNetErr(e,url){await sleep(40);
  const det=((e&&e.name)||"Error")+": "+((e&&e.message)||"sin mensaje")+" · GET "+url;
  if(e&&e.name==="AbortError")return{kind:"timeout",msg:"GitHub no respondió en 12 segundos (tiempo agotado). Puede ser tu conexión o que GitHub esté lento.",detail:det};
  if(GH_CSP)return{kind:"csp",msg:"Bloqueado en este entorno: la política de seguridad de la página ("+GH_CSP.dir+") no deja conectarse a api.github.com. No es un problema de tu usuario ni de GitHub: aquí no se puede leer GitHub.",detail:det+" · bloqueado: "+GH_CSP.uri};
  if(typeof navigator!=="undefined"&&navigator.onLine===false)return{kind:"offline",msg:"Sin conexión a internet. Revisa tu red y vuelve a probar.",detail:det};
  return{kind:"network",msg:"El navegador no pudo conectar con api.github.com: no llegó ninguna respuesta. Es un bloqueo de red o de permisos de la página (firewall, proxy, extensión, o un entorno que no permite salir a internet), no un error de tu usuario.",detail:det}}
function ghHttpErr(st,body,meta,url,ctx){ctx=ctx||{};const msg=body&&body.message?String(body.message):"";
  const det="HTTP "+st+(msg?" «"+msg+"»":"")+" · GET "+url+(meta.remaining!=null?" · consultas restantes "+meta.remaining+"/"+(meta.limit==null?"?":meta.limit):"");
  if(st===404)return ctx.repo?{kind:"repo404",status:st,msg:"GitHub respondió 404 para el repo «"+ctx.repo+"»: no existe, cambió de nombre o ya no es público.",detail:det}:{kind:"notfound",status:st,msg:"GitHub respondió 404: el usuario «"+(ctx.user||"")+"» no existe. Revisa que esté bien escrito (sin @ ni espacios).",detail:det};
  if(st===403||st===429){
    if(meta.remaining===0||/rate limit|abuse|secondary/i.test(msg)){const until=meta.reset||0;return{kind:"ratelimit",status:st,until,msg:"GitHub agotó el límite de consultas sin token (60 por hora por conexión)"+(until?"; se libera a las "+hm(until):"")+". Mientras tanto se usan los datos guardados.",detail:det}}
    return{kind:"forbidden",status:st,msg:"GitHub rechazó la consulta (HTTP "+st+")"+(msg?": «"+msg+"»":"")+". Puede ser un bloqueo de tu red o de permisos.",detail:det}}
  if(st===401)return{kind:"auth",status:st,msg:"GitHub pide credenciales para esta consulta (HTTP 401). El sistema solo usa datos públicos, sin token.",detail:det};
  if(st===451)return{kind:"legal",status:st,msg:"GitHub no puede mostrar este recurso por motivos legales (HTTP 451).",detail:det};
  if(st>=500)return{kind:"server",status:st,msg:"GitHub tuvo un error temporal (HTTP "+st+"). Intenta de nuevo más tarde.",detail:det};
  return{kind:"http",status:st,msg:"GitHub respondió HTTP "+st+(msg?": «"+msg+"»":"")+".",detail:det}}
const ghAsErr=e=>e&&e.kind?e:{kind:"unknown",msg:"Error inesperado: "+((e&&e.message)||String(e)),detail:String((e&&e.stack)||e)};
async function ghGet(url,ctx){GH_CSP=null;const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);let r;
  try{r=await fetch(url,{headers:{Accept:"application/vnd.github+json"},signal:c.signal,cache:"no-store"})}catch(e){clearTimeout(t);throw await ghNetErr(e,url)}
  const rh=n=>{try{return r.headers.get(n)}catch(e){return null}},rem=rh("x-ratelimit-remaining"),rs=rh("x-ratelimit-reset"),lm=rh("x-ratelimit-limit");
  const meta={remaining:rem==null?null:+rem,limit:lm==null?null:+lm,reset:rs?+rs*1000:0};let body=null,bad=false;
  try{body=await r.json()}catch(e){bad=true}finally{clearTimeout(t)}
  if(!r.ok)throw ghHttpErr(r.status,body,meta,url,ctx);
  if(bad)throw{kind:"format",msg:"GitHub respondió, pero no con datos legibles (no es JSON).",detail:"HTTP "+r.status+" · GET "+url};
  return{data:body,meta}}
/* consulta completa: repos por último push + eventos públicos; si los eventos vienen vacíos, commits de los 3 repos más recientes */
async function ghFetch(force){
  const u=ghUser();if(!u||GH.state==="loading")return false;const prev=S.signals||{},mem=ghMem();
  if(!ghValid(u)){GH={state:"error",msg:"",err:{kind:"invalid",msg:"«"+u+"» no es un usuario válido de GitHub (solo letras, números y guiones, sin espacios).",detail:"validación local, sin consulta"},via:"",warn:"",test:GH.test};renderGh();return false}
  const age=prev.user===u&&prev.ok&&prev.fetchedAt?Date.now()-Date.parse(prev.fetchedAt):Infinity;
  if(age<GH_TTL){if(force){GH.msg="Los datos son de hace "+Math.max(1,Math.round(age/60000))+" min. Para respetar el límite de GitHub, la próxima consulta es posible a las "+hm(Date.parse(prev.fetchedAt)+GH_TTL)+".";renderGh()}return false}
  const same=mem.user===u;
  if(same&&mem.err&&mem.err.until&&Date.now()<mem.err.until){GH=Object.assign({},GH,{state:"error",msg:"",err:mem.err});renderGh();return false}
  if(!force&&same&&mem.tryAt&&Date.now()-mem.tryAt<GH_TTL){GH=Object.assign({},GH,{state:mem.err?"error":"",msg:"",err:mem.err||null});renderGh();return false}
  GH=Object.assign({},GH,{state:"loading",msg:"Consultando tus repos…",err:null,warn:""});renderGh();
  try{
    const rr=await ghGet("https://api.github.com/users/"+encodeURIComponent(u)+"/repos?sort=pushed&direction=desc&per_page=15&type=owner",{user:u});
    const all=Array.isArray(rr.data)?rr.data:[],own=all.filter(x=>!x.fork),pool=own.length?own:all;
    const repos=pool.slice(0,8).map(x=>({name:x.name,full:x.full_name,url:x.html_url,pushedAt:x.pushed_at||""}));
    GH.msg="Consultando tus eventos públicos…";renderGh();let evs=[],note="";
    try{const er=await ghGet("https://api.github.com/users/"+encodeURIComponent(u)+"/events/public?per_page=100",{user:u});evs=Array.isArray(er.data)?er.data:[]}
    catch(e){if(e&&e.kind==="ratelimit")throw e;note="eventos no disponibles ("+((e&&e.kind)||"error")+")"}
    const push=evs.filter(e=>e&&e.type==="PushEvent"&&e.repo&&e.repo.name);let targets=[],via="repos";
    if(push.length){via="eventos";const seen=new Set();push.forEach(e=>{const f=String(e.repo.name),k=f.toLowerCase();if(!seen.has(k)&&seen.size<5){seen.add(k);targets.push({full:f,at:e.created_at||""})}});
      targets.forEach(t=>{if(!repos.some(r=>r.full.toLowerCase()===t.full.toLowerCase()))repos.push({name:t.full.split("/")[1]||t.full,full:t.full,url:"https://github.com/"+t.full,pushedAt:t.at})})}
    else targets=repos.slice(0,3).map(r=>({full:r.full,at:r.pushedAt}));
    const commits=[],warn=[],failed=new Set();
    for(const t of targets){GH.msg="Consultando los commits de "+t.full+"…";renderGh();
      const nm=(repos.find(r=>r.full.toLowerCase()===t.full.toLowerCase())||{}).name||t.full.split("/")[1]||t.full;
      try{const q=a=>"https://api.github.com/repos/"+t.full+"/commits?per_page=10"+(a?"&author="+encodeURIComponent(u):"");
        let cr=await ghGet(q(true),{repo:t.full}),cs=Array.isArray(cr.data)?cr.data:[];
        if(!cs.length&&ghOwn(t.full,u)){cr=await ghGet(q(false),{repo:t.full});cs=Array.isArray(cr.data)?cr.data:[]}
        cs.forEach(c=>{const cm=c.commit||{};commits.push({repo:nm,date:(cm.author&&cm.author.date)||(cm.committer&&cm.committer.date)||"",msg:short(String(cm.message||"").split("\n")[0],140)})})}
      catch(e){failed.add(nm);if(e&&e.kind==="ratelimit"){warn.push(e.msg);break}warn.push(t.full+": "+((e&&e.msg)||"no se pudieron leer sus commits"))}}
    if(failed.size&&Array.isArray(prev.commits)&&prev.user===u)prev.commits.forEach(c=>{if(failed.has(c.repo))commits.push(c)});
    commits.sort((a,b)=>String(b.date).localeCompare(String(a.date)));repos.sort((a,b)=>String(b.pushedAt).localeCompare(String(a.pushedAt)));
    putDoc("signals/github",{user:u,fetchedAt:nowISO(),ok:true,repos:repos.slice(0,8),commits:commits.slice(0,80),asked:(prev.user===u&&prev.asked)||[]});
    ghMemSet({user:u,tryAt:Date.now(),err:null,env:null,via});
    GH={state:"ok",msg:"",err:null,via,warn:warn.concat(note?[note]:[]).join(" · "),test:GH.test};ateneaAsk();renderAll();return true}
  catch(e){const er=ghAsErr(e);ghMemSet({user:u,tryAt:Date.now(),err:er,env:GH_ENV.includes(er.kind)?Object.assign({at:Date.now()},er):ghMem().env||null});
    GH={state:"error",msg:"",err:er,via:"",warn:"",test:GH.test};renderGh();return false}}
/* «Probar conexión»: una sola consulta a /users/{usuario}; muestra el resultado o el error exacto */
async function ghTest(){const raw=ghClean($("gh-user").value);
  if(!raw){GH.test={ok:false,msg:"Escribe primero tu usuario de GitHub.",detail:""};renderGh();return}
  if(!ghValid(raw)){GH.test={ok:false,msg:"«"+raw+"» no es un usuario válido de GitHub (solo letras, números y guiones, sin espacios).",detail:"validación local, sin consulta"};renderGh();return}
  GH.test={loading:true};renderGh();
  try{const r=await ghGet("https://api.github.com/users/"+encodeURIComponent(raw),{user:raw}),d=r.data||{};
    GH.test={ok:true,msg:"Conexión correcta: «"+(d.login||raw)+"» existe en GitHub y tiene "+(d.public_repos==null?"?":d.public_repos)+" repos públicos."+(r.meta.remaining!=null?" Consultas restantes esta hora: "+r.meta.remaining+" de "+(r.meta.limit||"?")+".":"")+(raw!==ghUser()?" Pulsa «Guardar y consultar» para usar este usuario.":""),detail:"GET /users/"+raw+" → HTTP 200"};
    ghMemSet({env:null})}
  catch(e){const er=ghAsErr(e);GH.test={ok:false,kind:er.kind,msg:er.msg,detail:er.detail};if(GH_ENV.includes(er.kind))ghMemSet({env:Object.assign({at:Date.now()},er)})}
  renderGh()}
function ghProject(repo){const full=ghNorm("github.com/"+repo.full),sl=slug(repo.name);
  return S.projects.find(p=>p.repo&&ghNorm(p.repo).endsWith(full.replace(/^github\.com\//,"")))||S.projects.find(p=>slug(p.title||"")===sl)||null}
function ghSignals(){const g=S.signals;if(!g||!g.ok||g.user!==ghUser()||!Array.isArray(g.commits))return null;
  const t=today(),mon=monday(t),wk=addDays(t,-6),days=s=>Math.round((parse(t)-parse(s))/864e5),loc=iso=>ds(new Date(iso));
  const repos=(g.repos||[]).map(rp=>{const cs=g.commits.filter(c=>c.repo===rp.name&&c.date),last=cs.length?loc(cs[0].date):(rp.pushedAt?loc(rp.pushedAt):"");
    const pushed=rp.pushedAt?loc(rp.pushedAt):"";
    return Object.assign({},rp,{last,days:last?days(last):null,pushed,pdays:pushed?days(pushed):null,week:cs.filter(c=>loc(c.date)>=mon).length,n7:cs.filter(c=>loc(c.date)>=wk).length,lastMsg:cs[0]?cs[0].msg:"",proj:ghProject(rp)})});
  const active=repos.filter(x=>x.week>0);
  const doing=S.projects.filter(p=>(p.status||"idea")==="doing").map(p=>{const rp=repos.find(x=>x.proj&&x.proj.id===p.id);return{p,week:rp?rp.week:0,repo:rp}});
  const logTxt=[];for(let i=0;i<7;i++){const s=addDays(t,-i),d=S.days[s];if(!d)continue;const l=logOf(d);logTxt.push({tags:Object.values(l.tags||{}),txt:LF.map(([f])=>l[f]).join(" ").toLowerCase()})}
  const noLog=repos.filter(x=>x.n7>0).filter(x=>{const words=[x.name.toLowerCase(),x.name.toLowerCase().replace(/[-_]/g," ")].concat(x.proj?[String(x.proj.title||"").toLowerCase()]:[]).filter(w=>w.length>2);
    return !logTxt.some(e=>(x.proj&&e.tags.includes("p:"+x.proj.id))||words.some(w=>e.txt.includes(w)))});
  return{user:g.user,at:g.fetchedAt,repos,active,doing,noLog,commits:g.commits.slice(0,8)}}
function ghBlock(id){const s=ghSignals();if(!s)return"";
  const o=["SEÑALES (actividad pública de GitHub de "+s.user+", consultada "+String(s.at).slice(0,16).replace("T"," ")+"; él no tuvo que anotarla):"];
  o.push("- Días desde el último commit por repo: "+(s.repos.length?s.repos.map(x=>x.name+" "+(x.days==null?"—":x.days+" días")+" ("+x.n7+" commits en 7 días)").join("; "):"sin repos con actividad en 3 semanas"));
  o.push("- Repos activos esta semana: "+(s.active.map(x=>x.name+" ("+x.week+")").join(", ")||"ninguno"));
  o.push("- Proyectos «En curso» en el tablero: "+(s.doing.length?s.doing.map(d=>d.p.title+(d.week?" con "+d.week+" commits esta semana":d.repo?" sin commits esta semana":" (sin repo enlazado)")).join("; "):"ninguno"));
  if(s.commits.length)o.push("- Commits recientes: "+s.commits.map(c=>String(c.date).slice(0,10)+" "+c.repo+": «"+c.msg+"»").join(" | "));
  if(s.noLog.length)o.push("- Con commits pero SIN entrada en la bitácora de los últimos 7 días: "+s.noLog.map(x=>(x.proj?x.proj.title:x.name)+" ("+x.n7+" commits, último "+x.last+")").join("; ")+(id==="aprendizaje"?". Pregúntale qué aprendió ahí (usa el campo pregunta).":"."));
  return "\n"+o.join("\n")}
/* Atenea pregunta por lo que hiciste en GitHub y no anotaste (una vez por proyecto y semana) */
function ateneaAsk(){const s=ghSignals();if(!s||!s.noLog.length||!depts().some(d=>d.id==="aprendizaje"))return;const g=Object.assign({},S.signals),asked=(g.asked||[]).slice(),wk=isoWeek(today()),msgs=[];
  s.noLog.forEach(x=>{const k=(x.proj?"p:"+x.proj.id:"r:"+x.name)+"|"+wk;if(asked.includes(k))return;asked.push(k);
    msgs.push({r:"a",k:"pregunta",t:"Vi "+x.n7+" commit"+(x.n7===1?"":"s")+" en «"+(x.proj?x.proj.title:x.name)+"» (el último el "+pretty(x.last)+(x.lastMsg?": «"+x.lastMsg+"»":"")+") y nada de eso en tu bitácora. ¿Qué aprendiste ahí? ¿Por qué funcionó o qué te costó? Respóndeme aquí o anótalo en Aprendí.",proj:x.proj?x.proj.id:"",repo:x.name})});
  if(!msgs.length)return;g.asked=asked.slice(-40);delete g.id;putDoc("signals/github",g);
  const t=threadOf("aprendizaje");msgs.forEach(m=>{t.msgs.push(Object.assign({at:nowISO()},m));t.n++});t.unread=(t.unread||0)+msgs.length;putThread("aprendizaje",t);
  const a=SC.agents.aprendizaje;if(a){bubble(a,"Vi commits que no anotaste. ¿Qué aprendiste ahí?",5000);a.emote={k:"?",until:performance.now()+4000}}
  toast("Atenea tiene "+(msgs.length===1?"una pregunta":msgs.length+" preguntas")+" sobre tus commits")}
const GH_TITLE={csp:"GitHub está bloqueado en este entorno",network:"No hay conexión con GitHub desde aquí",offline:"Sin conexión a internet",ratelimit:"Límite de consultas de GitHub",notfound:"Ese usuario no existe en GitHub",timeout:"GitHub no respondió a tiempo",invalid:"Usuario no válido",forbidden:"GitHub rechazó la consulta",server:"GitHub tiene un error temporal"};
const ghAlertHTML=er=>`<strong>${esc(GH_TITLE[er.kind]||"No se pudo consultar GitHub")}</strong><span>${esc(er.msg)}</span>${GH_ENV.includes(er.kind)?`<span>Mientras siga así, las SEÑALES de GitHub no se actualizan; todo lo demás del sistema funciona igual.</span>`:""}${er.detail?`<code>${esc(er.detail)}</code>`:""}`;
function renderGh(){const el=$("gh-user");if(!el)return;const u=ghUser(),mem=ghMem();
  if(document.activeElement!==el&&!el.dataset.dirty&&el.value!==u)el.value=u;
  const sig=ghSignals(),er=GH.err||(u&&mem.user===u&&mem.err?mem.err:null)||mem.env||null,blocked=!!(er&&GH_ENV.includes(er.kind)),loading=GH.state==="loading";
  const fs=$("fi-s-gh");if(fs)fs.textContent=!u?"Sin conectar":loading?"Consultando…":blocked?"Bloqueado en este entorno":er?"Sin datos nuevos: "+short(GH_TITLE[er.kind]||"error de consulta",44):sig?"@"+u+" · "+sig.repos.length+" repo"+(sig.repos.length===1?"":"s")+" · consultado "+hhmm(sig.at):"@"+u+" · aún sin consulta";
  const ff=$("fi-f-gh");if(ff)ff.classList.toggle("dirty",!!er&&!loading);
  const al=$("gh-alert");al.hidden=!er||loading;if(er){const h=ghAlertHTML(er);if(al.__h!==h){al.innerHTML=h;al.__h=h}al.className="ghalert "+(blocked?"bad":"warn")}
  const to=$("gh-test-out"),t=GH.test;to.hidden=!t;
  if(t){to.className="ghtest "+(t.loading?"":t.ok?"ok":"bad");const h=t.loading?"Probando la conexión con api.github.com…":`<strong>${t.ok?"Funciona":"No funciona"}</strong><span>${esc(t.msg)}</span>${t.detail?`<code>${esc(t.detail)}</code>`:""}`;if(to.__h!==h){to.innerHTML=h;to.__h=h}}
  const next=sig?Date.parse(sig.at)+GH_TTL:0;
  $("gh-st").textContent=loading?GH.msg:(GH.msg||(sig?"Última consulta: "+pretty(ds(new Date(sig.at)))+" "+hhmm(sig.at)+" · "+(next>Date.now()?"la próxima es posible a las "+hm(next):"ya puedes actualizar")+(GH.via?" · fuente: "+(GH.via==="eventos"?"tus eventos públicos":"tus repos por último push"):""):u?"Aún sin consulta.":""))+(!loading&&GH.warn?" · Aviso: "+GH.warn:"");
  $("gh-refresh").disabled=!u||loading;$("gh-test").disabled=loading||!!(t&&t.loading);$("gh-save").disabled=loading;
  const ago=n=>n==null?"—":n===0?"hoy":"hace "+n+" día"+(n===1?"":"s");
  const h=sig?`<h4 class="sub">Repos públicos más recientes</h4><div class="ghlist">${sig.repos.length?sig.repos.map(x=>`<div class="ghrow"><a href="${esc(x.url||"#")}" target="_blank" rel="noopener noreferrer">${esc(x.name)}</a><span class="muted">último push: ${x.pushed?esc(pretty(x.pushed))+" · "+ago(x.pdays):"—"}</span>${x.proj?`<span class="chip">${esc(x.proj.title)}</span>`:""}</div>`).join(""):`<div class="empty">GitHub no devolvió repos públicos para este usuario.</div>`}</div>
    <h4 class="sub">Últimos commits</h4><div class="ghlist">${sig.commits.length?sig.commits.map(c=>`<div class="ghrow"><span class="muted num">${c.date?esc(pretty(ds(new Date(c.date))))+" "+hhmm(c.date):"—"}</span><span><strong>${esc(c.repo)}</strong> · ${T(c.msg)}</span></div>`).join(""):`<div class="empty">Sin commits para mostrar.</div>`}</div>
    ${sig.noLog.length?`<p class="hint" style="margin:0">Con commits pero sin bitácora: ${esc(sig.noLog.map(x=>x.proj?x.proj.title:x.name).join(", "))}. Atenea te pregunta en su chat.</p>`:""}`:"";
  const b=$("gh-sum");if(b.__h!==h){b.innerHTML=h;b.__h=h}}
$("gh-user").addEventListener("input",e=>{e.target.dataset.dirty="1"});
$("gh-user").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();ghTest()}});
$("gh-save").onclick=async()=>{const v=ghClean($("gh-user").value);const p=profOf();p.github=v;delete $("gh-user").dataset.dirty;await putProfile(p);GH=Object.assign({},GH,{state:"",msg:"",err:null,via:"",warn:"",test:null});renderGh();if(v)ghFetch(true);else toast("Usuario de GitHub quitado")};
$("gh-refresh").onclick=()=>ghFetch(true);
$("gh-test").onclick=ghTest;
function ghBoot(){if(GH_AUTO||!S.profile)return;GH_AUTO=true;renderGh();if(ghUser())setTimeout(()=>ghFetch(false),1500)}

/* ---------- perfil: perfil (meta, contexto, restricciones, patrones) ---------- */
const PFF=[["pf-goal","goal"],["pf-date","goalDate"],["pf-hours","hours"],["pf-money","money"],["pf-commit","commitments"],["pf-learn","learnBest"],["pf-nolearn","learnBad"],["pf-patterns","patterns"],["pf-avoid","avoid"]];
function renderPerfil(){const p=profOf(),c=cfg();
  PFF.forEach(([el,k])=>{const x=$(el);if(document.activeElement===x||x.dataset.dirty)return;let v=Array.isArray(p[k])?p[k].join("\n"):p[k];if(k==="goal"&&!v)v=c.goal||"";if(x.value!==v)x.value=v});
  const cx=$("pf-ctx");if(document.activeElement!==cx&&!cx.dataset.dirty&&cx.value!==(c.context||""))cx.value=c.context||"";
  const ow=$("pf-owner");if(ow&&document.activeElement!==ow&&!ow.dataset.dirty&&ow.value!==(c.owner||""))ow.value=c.owner||"";
  const n=[p.goal||c.goal,p.hours||p.money||p.commitments,p.learnBest||p.learnBad,p.patterns.length,p.avoid.length].filter(Boolean).length;
  const np=p.pending.length;$("fi-s-perfil").textContent=(S.profile?n+"/5 secciones":"Sin guardar")+(np?" · "+np+" patrón"+(np===1?"":"es")+" por revisar":"");
  $("fi-f-perfil").classList.toggle("dirty",!!np);
  $("pf-pn").textContent=np;$("pf-pn").className="chip "+(np?"warn":"");
  const h=np?p.pending.map(x=>`<div class="prop" data-pat="${esc(x.id)}"><div class="row" style="gap:6px"><span style="font:500 .82rem var(--f-display);color:${whoInfo(x.by).color}">${esc(nameOf(x.by))}</span><span class="muted" style="font-size:.78rem">${esc(x.at?pretty(ds(new Date(x.at))):"")}</span></div><div class="t"><strong>${T(x.t)}</strong></div>${x.ev?`<div class="muted t" style="font-size:.86rem">Evidencia: ${T(x.ev)}</div>`:""}<div class="row"><button class="btn primary" type="button" data-pact="ok">Aprobar</button><button class="btn ghost" type="button" data-pact="no">Descartar</button></div></div>`).join(""):`<div class="empty">Sin patrones propuestos. Los agentes los proponen cuando ven algo que se repite en tus datos.</div>`;
  const el=$("pf-pending");if(el.__h!==h){el.innerHTML=h;el.__h=h}
  try{renderProfBtn()}catch(e){}}
[...PFF.map(x=>x[0]),"pf-ctx","pf-owner"].forEach(id=>{const x=$(id);if(x)x.addEventListener("input",e=>{e.target.dataset.dirty="1";$("pf-st").textContent="Cambios sin guardar"})});
$("pf-save").onclick=()=>{const p=profOf(),g=id=>$(id).value.trim(),lines=id=>$(id).value.split("\n").map(s=>s.trim()).filter(Boolean).slice(0,20);
  const goal=g("pf-goal"),ow=$("pf-owner"),ctx=g("pf-ctx"),c=S.config,ch={};
  Object.assign(p,{saved:true,goal,goalDate:g("pf-date"),hours:g("pf-hours"),money:g("pf-money"),commitments:g("pf-commit"),learnBest:g("pf-learn"),learnBad:g("pf-nolearn"),patterns:lines("pf-patterns"),avoid:lines("pf-avoid")});
  if(c){if(goal&&goal!==(c.goal||""))ch.goal=goal;if($("pf-ctx").dataset.dirty&&ctx!==(c.context||""))ch.context=ctx;if(ow&&ow.dataset.dirty&&g("pf-owner")!==(c.owner||""))ch.owner=g("pf-owner")}
  else if($("pf-ctx").dataset.dirty||(ow&&ow.dataset.dirty))toast("La configuración aún no carga: el contexto y el nombre no se guardaron.");
  PFF.forEach(([el])=>delete $(el).dataset.dirty);delete $("pf-ctx").dataset.dirty;if(ow)delete ow.dataset.dirty;$("pf-st").textContent="Guardando…";
  const jobs=[putProfile(p)];
  if(Object.keys(ch).length){const nc=Object.assign({},c,ch,{updated:nowISO()});S.config=nc;jobs.push(save("config/main",nc));if(ch.goal)save("changelog/l"+Date.now().toString(36),{date:today(),text:"Meta actualizada: "+short(goal,140)})}
  Promise.all(jobs).then(r=>{$("pf-st").textContent=r.every(Boolean)?"Guardado: todos los agentes lo reciben desde ya.":"No se pudo guardar."});renderPerfil()};
$("pf-pending").addEventListener("click",e=>{const b=e.target.closest("button[data-pact]");if(!b)return;patternAct(b.closest(".prop").dataset.pat,b.dataset.pact==="ok")});
/* =================== AVATARES · sellos místicos en pixel art (dibujados en código) =================== */
/* Lienzo de 24×24: marco dorado de 2 px + 20×20 de arte. Cada avatar se dibuja con rectángulos, elipses y polígonos; sin imágenes externas. */
const AVN=24;
const AK={ink:"#05061A",nav:"#0C1138",in1:"#1A1F52",in2:"#2C357C",in3:"#3A4699",vio:"#5B4FD0",vioD:"#4B3FB0",vioK:"#2B2380",vioL:"#8F89E6",lav:"#B9B2FF",pale:"#E4DEFF",gold:"#FFC15A",goldL:"#FFE9A6",goldD:"#B8862E",cy:"#5AD1E8",cyD:"#2B7FA8",cyK:"#17506E",or:"#FF9E6B",red:"#FF6F61",redD:"#C8423A",pink:"#FF7AA8",gr:"#7EE0A1",grD:"#2F8F6B",grK:"#1D5C4A",white:"#F1EEFF",steel:"#A9B0E0",steelD:"#6C7AC8",steelK:"#3A4699"};
let AVG=null,AVSYM=false,AVSKY=["#1A1F52","#0C1138"];
const avHex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const avMix=(a,b,t)=>{const A=avHex(a),B=avHex(b);return"#"+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,"0")).join("")};
const avSky=y=>avMix(AVSKY[0],AVSKY[1],Math.max(0,Math.min(1,(y-2)/19)));
function avR(x,y,w,h,c){AVG.fillStyle=c;AVG.fillRect(x,y,w,h);if(AVSYM&&AVN-x-w!==x)AVG.fillRect(AVN-x-w,y,w,h)}
function avP(x,y,c){avR(x,y,1,1,c)}
function avFill(test,col){for(let j=0;j<AVN;j++)for(let i=0;i<AVN;i++){let c=null;
  if(test(i+.5,j+.5))c=typeof col==="function"?col(i,j):col;
  else if(AVSYM&&test(AVN-i-.5,j+.5))c=typeof col==="function"?col(AVN-1-i,j):col;
  if(c){AVG.fillStyle=c;AVG.fillRect(i,j,1,1)}}}
function avE(cx,cy,rx,ry,col){avFill((x,y)=>{const dx=(x-cx)/rx,dy=(y-cy)/ry;return dx*dx+dy*dy<=1},col)}
function avIn(x,y,p){let o=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])o=!o}return o}
function avPoly(p,col){avFill((x,y)=>avIn(x,y,p),col)}
function avL(x0,y0,x1,y1,c){const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx+dy;for(;;){avP(x0,y0,c);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx}if(e2<=dx){e+=dx;y0+=sy}}}
function avBg(top,bot,stars){AVSKY=[top,bot];for(let j=2;j<22;j++){AVG.fillStyle=avSky(j);AVG.fillRect(2,j,20,1)}(stars||[]).forEach(s=>avP(s[0],s[1],s[2]))}
function avFrame(acc){
  const C=(x,y,c)=>{AVG.fillStyle=c;AVG.fillRect(x,y,1,1)};
  for(let i=1;i<23;i++){C(i,0,AK.ink);C(i,23,AK.ink);C(0,i,AK.ink);C(23,i,AK.ink)}
  for(let i=2;i<22;i++){C(i,1,AK.goldL);C(1,i,AK.goldL);C(i,22,AK.goldD);C(22,i,AK.goldD)}
  C(1,1,acc);C(22,1,acc);C(1,22,acc);C(22,22,acc);
  C(11,0,AK.gold);C(12,0,AK.gold);C(11,23,AK.goldD);C(12,23,AK.goldD);C(0,11,AK.gold);C(0,12,AK.gold);C(23,11,AK.goldD);C(23,12,AK.goldD);
  AVG.fillStyle="rgba(5,6,26,.5)";for(let i=2;i<22;i++){AVG.fillRect(i,2,1,1);AVG.fillRect(2,i,1,1);AVG.fillRect(i,21,1,1);AVG.fillRect(21,i,1,1)}
  C(2,2,acc);C(21,2,acc);C(2,21,acc);C(21,21,acc);
}
function avBuho(){
  avBg("#232A7A","#0C1138",[[4,4,AK.goldL],[19,5,AK.lav],[4,12,AK.lav],[20,11,AK.goldL],[18,17,AK.lav]]);
  avR(2,19,20,2,"#5B3A24");avR(2,19,20,1,"#8A5A36");avR(2,20,20,1,"#3A2314");
  AVSYM=true;
  avE(12,14.5,5.8,5.6,AK.vio);
  avE(7.3,14.6,1.8,4.6,AK.vioD);
  avE(12,16,3.1,3.9,AK.pale);
  [[10,13],[11,15],[10,17],[12,18],[9,15]].forEach(p=>avP(p[0],p[1],AK.lav));
  avPoly([[5.4,7.4],[4.8,2.4],[9.4,5.2]],AK.vioD);
  avPoly([[6.2,6.4],[5.8,3.8],[8.2,5.4]],AK.vio);
  avE(12,9,6.9,5.4,AK.vio);
  avE(8.9,9.2,3.5,3.4,AK.pale);
  avE(8.9,9.2,2.5,2.5,AK.gold);
  avE(8.9,9.2,1.3,1.3,AK.ink);
  avP(8,8,AK.white);
  avPoly([[11,10.4],[13,10.4],[12,12.8]],AK.or);
  avP(11,10,AK.gold);
  avR(10,19,1,1,AK.gold);avR(9,19,1,1,AK.gold);
  AVSYM=false;
}
function avCuervo(){
  avBg("#1A1B66","#0A0E34",[[4,4,AK.goldL],[19,3,AK.lav],[3,13,AK.lav],[20,12,AK.goldL],[3,20,AK.goldL]]);
  avE(11.6,9.4,7,7,AK.goldL);
  avFill((x,y)=>Math.hypot(x-11.6,y-9.4)<=7,(i,j)=>Math.hypot(i+.5-11.6,j+.5-9.4)>5.7?AK.gold:AK.goldL);
  avP(7,7,AK.goldD);avP(8,7,AK.goldD);avP(8,8,AK.goldD);avP(14,5,AK.goldD);avP(15,12,AK.goldD);avP(14,12,AK.goldD);
  avR(2,18,20,2,"#4A3322");avR(2,18,20,1,"#7A5636");
  avPoly([[2.2,20.2],[5,13.6],[9,17],[4,21]],"#3A3490");
  avPoly([[4,18],[4.6,12.6],[8.4,9.2],[13.8,8.6],[16.4,11],[16,15],[11,18.4]],"#3A3490");
  avPoly([[2.6,19.8],[5.2,14.2],[8.6,17.4],[4,20.6]],"#120F33");
  avPoly([[4.4,17.4],[5,13],[8.5,9.6],[13.6,9],[16,11],[15.6,14.4],[11,17.6]],"#120F33");
  avPoly([[6.6,13],[11.6,10.6],[14.2,13.4],[9.4,16.6],[5.8,15.4]],"#241C66");
  [[8,13],[10,12],[12,12],[9,15],[11,15],[13,14]].forEach(p=>avP(p[0],p[1],"#5A54A8"));
  avE(15.8,8.2,3,2.8,"#120F33");
  avPoly([[18,7.2],[21.8,8.7],[18,10]],AK.or);avPoly([[18,8.9],[21.8,8.8],[18,10]],AK.redD);
  avR(16,7,1,1,AK.goldL);avP(15,6,"#5A54A8");avP(14,10,"#5A54A8");
  avR(11,17,1,2,"#B89A5A");avR(14,17,1,2,"#B89A5A");
}
function avLobo(){
  avBg("#1B2872","#0A1030",[[4,3,AK.cy],[20,3,AK.lav],[3,19,AK.lav],[20,19,AK.cy],[2,11,AK.goldL]]);
  AVSYM=true;
  avPoly([[3.2,1.8],[10.6,6.6],[4.6,11.8]],AK.steelD);avPoly([[4.8,4.4],[9,7],[5.6,10]],AK.pink);
  avPoly([[4.6,10.4],[2.4,14.2],[5.6,13.8],[4.6,17.4],[8.6,15.6]],AK.steel);
  avE(12,10.4,7,5.6,AK.steel);
  avPoly([[4.8,9],[12,6],[12,9.6],[8,10.6]],AK.steelD);
  avPoly([[12,9.4],[10.6,10.4],[9.8,14],[10.4,18.2],[12,19.8]],AK.pale);
  avPoly([[12,6.4],[11,7.6],[12,9.6]],AK.pale);
  avPoly([[5.4,9.6],[9.6,10.2],[9.8,11.8],[6.4,11.6]],AK.gold);
  avR(8,10,2,2,AK.ink);avP(7,10,AK.goldL);
  avPoly([[4.8,8.4],[9.8,9.4],[9.6,10],[5,9]],AK.steelK);
  avR(11,15,1,2,AK.ink);avP(11,15,AK.in3);
  avR(10,18,1,1,AK.white);avP(9,13,AK.steelD);avP(8,14,AK.steelD);
  AVSYM=false;
}
function avFenix(){
  avBg("#34185E","#12082E",[[3,4,AK.goldL],[20,5,AK.pink],[3,14,AK.pink],[20,15,AK.goldL]]);
  AVSYM=true;
  avPoly([[11,11],[2.6,3.4],[2.6,9],[4.6,13],[3.4,16.4],[8.6,15.4],[11,19]],AK.redD);
  avPoly([[11,11],[4.4,5.4],[4.6,9.4],[6,12.6],[5.8,15],[9.4,14.6],[11,17.4]],AK.red);
  avPoly([[11,11.6],[6,7.4],[6.6,10.6],[8,12.6],[7.8,14],[10.4,14.2]],AK.or);
  avPoly([[11,12.2],[8,9.6],[8.8,12],[10,13.2]],AK.gold);
  avPoly([[10.4,18],[9.4,21.4],[11.6,19.8]],AK.redD);avPoly([[11,17],[11,21.4],[12,21.4],[13,17]],AK.or);
  avE(12,13,2.4,5,AK.or);avE(12,13.6,1.4,3.6,AK.gold);
  avPoly([[10.4,6],[9.2,2.2],[11.2,4.2],[12,1.2]],AK.gold);avPoly([[11,5.6],[11,2.8],[12,2.2]],AK.goldL);
  avE(12,7.6,2.3,2.4,AK.red);
  avP(10,7,AK.ink);avP(10,6,AK.goldL);
  avPoly([[11,8.4],[13,8.4],[12,10.6]],AK.gold);
  AVSYM=false;
}
function avOuroboros(){
  avBg("#0E2A3C","#07121F",[[3,3,AK.gr],[20,3,AK.cy],[3,19,AK.cy],[20,19,AK.gr],[19,12,AK.goldL]]);
  const cx=12,cy=12.2,th=-70;
  const sOf=(x,y)=>{let a=Math.atan2(y-cy,x-cx)*180/Math.PI;return (((a-th)%360)+360)%360/360};
  avFill((x,y)=>{const d=Math.hypot(x-cx,y-cy);if(d<4.9||d>9.2)return false;const s=sOf(x,y);if(s>.93)return false;const w=s<.55?1:Math.max(.12,1-(s-.55)/.42);return Math.abs(d-7.05)<=2.05*w},(i,j)=>{const a=Math.atan2(j+.5-cy,i+.5-cx),d=Math.hypot(i+.5-cx,j+.5-cy);const k=(Math.floor((a+Math.PI)/(Math.PI*2)*30)+(d>7.05?1:0))%2;const hl=d<6.1&&a>-2.8&&a<-1.1;return hl?AK.gr:k?AK.grD:"#3FAE80"});
  avE(12,12.2,3,3,"#0A1A2A");avP(11,11,AK.gold);avP(12,11,AK.gold);avP(11,12,AK.gold);avP(12,12,AK.goldL);avP(11,13,AK.gold);avP(12,13,AK.gold);
  avE(15.6,6.2,3.1,2.7,AK.gr);avPoly([[13.8,4.2],[10.2,3.6],[14.4,5.9]],AK.gr);avPoly([[14.4,6.6],[10.6,6.8],[13.6,8.6]],AK.grD);
  avP(14,5,AK.gold);avP(14,5,AK.red);avP(11,4,AK.white);avP(11,6,AK.white);avP(16,4,AK.goldL);avP(17,6,AK.grD);avP(16,8,AK.grD);
}
function avOjo(){
  avBg("#2A1B66","#0C1138",[[4,4,AK.goldL],[19,4,AK.lav],[3,17,AK.lav],[20,16,AK.goldL]]);
  const cx=12,cy=12.6;
  for(let k=0;k<16;k++){const a=k*Math.PI/8+.2;for(let r=8.6;r<13;r+=1)avP(Math.round(cx+Math.cos(a)*r),Math.round(cy+Math.sin(a)*r*.9),k%2?AK.goldD:"#6E5A8A")}
  avPoly([[12,3],[21,19.4],[3,19.4]],AK.gold);
  avPoly([[12,5.2],[19,18.2],[5,18.2]],AK.vioK);
  avPoly([[12,5.2],[12,18.2],[5,18.2]],"#322A8C");
  avPoly([[2.6,14.6],[12,10.2],[21.4,14.6],[12,18.4]],AK.ink);
  avE(12,14.2,5.6,3.1,AK.white);
  avE(12,14.3,2.6,2.6,AK.cy);avE(12,14.3,2.6,2.6,(i,j)=>(j<14?AK.cy:AK.cyD));
  avE(12,14.3,1.2,1.2,AK.ink);avP(11,13,AK.white);
  avL(6,12,12,10,AK.goldL);avL(12,10,18,12,AK.goldL);
}
function avLuna(){
  avBg("#1A1F6E","#080C2A",[[18,4,AK.goldL],[4,5,AK.lav],[20,12,AK.lav],[5,18,AK.goldL],[17,19,AK.lav]]);
  avE(11.2,12,7.6,7.6,AK.goldL);
  avFill((x,y)=>Math.hypot(x-11.2,y-12)<=7.6,(i,j)=>{const d=Math.hypot(i+.5-11.2,j+.5-12);return d>6.2?AK.gold:AK.goldL});
  avE(15.6,10.6,6.5,6.5,(i,j)=>avSky(j));
  avFill((x,y)=>Math.hypot(x-11.2,y-12)<=7.6&&Math.hypot(x-15.6,y-10.6)>6.5,(i,j)=>{const d=Math.hypot(i+.5-11.2,j+.5-12);return d>6.3?AK.gold:AK.goldL});
  avP(8,10,AK.goldD);avP(9,10,AK.goldD);avP(7,15,AK.goldD);avP(8,15,AK.goldD);avP(8,16,AK.goldD);avP(9,13,AK.gold);
  [[17,6],[16,16]].forEach(p=>{avP(p[0],p[1],AK.white);avP(p[0]-1,p[1],AK.lav);avP(p[0]+1,p[1],AK.lav);avP(p[0],p[1]-1,AK.lav);avP(p[0],p[1]+1,AK.lav)});
}
function avLlama(){
  avBg("#33134E","#100828",[[3,5,AK.or],[20,4,AK.pink],[3,16,AK.pink],[20,17,AK.or]]);
  avPoly([[11.4,1.8],[13.4,4.6],[12.8,6.8],[15.2,8.6],[17.8,12],[17,16.6],[13.8,19.8],[9.6,19.8],[6.4,16.6],[5.8,12.4],[7.6,9.2],[6.8,5.4],[9.6,7.4],[10.2,4.2]],AK.redD);
  avPoly([[11.6,4],[12.8,6.4],[12.2,8.2],[14.8,10],[16.4,13],[15.6,16.6],[12.6,18.8],[9.8,18.8],[7.6,16.2],[7.2,13],[9,10.4],[9.2,8.4],[10.6,10],[10.8,6.6]],AK.red);
  avPoly([[12,8.6],[13.2,10.8],[14.8,13.4],[14,16.8],[12,18.4],[10.2,16.8],[9.2,13.8],[10.2,11.8],[11.4,12],[11.6,10]],AK.or);
  avPoly([[12,12],[13.2,14],[12.8,16.6],[12,17.8],[11.2,16.6],[10.8,14.4]],AK.gold);
  avPoly([[12,14.2],[12.6,15.8],[12,17],[11.4,15.8]],AK.goldL);
  [[5,7,AK.or],[18,6,AK.gold],[16,3,AK.or],[4,13,AK.gold],[19,15,AK.or],[17,10,AK.pink]].forEach(p=>avP(p[0],p[1],p[2]));
}
function avArbol(){
  avBg("#12295E","#08123A",[[4,4,AK.goldL],[19,4,AK.lav],[20,12,AK.goldL],[3,13,AK.lav]]);
  avE(12,3.6,0.1,0.1,AK.gold);
  AVSYM=true;
  avPoly([[10.4,10],[13.6,10],[13,15],[15,19.6],[12,17.4],[9,19.6],[11,15]],"#7A5233");
  avL(10,15,5,19,"#7A5233");avL(10,16,3,20,"#5B3A24");avL(11,17,8,21,"#5B3A24");
  avR(11,10,1,6,"#A87444");
  avE(12,6.6,7.4,4.6,AK.grK);
  avE(7.6,8.6,3.6,2.8,AK.grK);
  avE(12,6.2,6.4,3.8,AK.grD);
  avE(8.2,8.2,2.8,2.1,AK.grD);
  avE(11,5,3.8,2.2,AK.gr);
  avE(7.4,7,2,1.3,AK.gr);
  [[9,6,AK.goldL],[6,8,AK.cy],[10,4,AK.white],[8,9,AK.gold]].forEach(p=>avP(p[0],p[1],p[2]));
  AVSYM=false;
  avP(15,6,AK.goldL);avP(16,8,AK.cy);avP(13,4,AK.white);
}
function avYelmo(){
  avBg("#262E7A","#0C1138",[[4,4,AK.goldL],[19,3,AK.lav],[2,14,AK.lav],[21,13,AK.goldL]]);
  AVSYM=true;
  avPoly([[4.6,11],[2.2,6.6],[2.8,2.6],[4.8,5],[6.4,8.4]],AK.pale);avPoly([[4.6,10],[3,6.6],[3.4,4.2],[4.6,6.4],[5.6,8.6]],AK.white);avP(3,3,AK.goldL);
  avPoly([[11,3],[13,3],[12.4,5.6],[11.6,5.6]],AK.red);avR(11,1,2,3,AK.red);avR(11,1,2,1,AK.or);
  avE(12,9.6,7,6.4,AK.steelK);
  avPoly([[4.8,10],[19.2,10],[18.4,17.6],[15,20.6],[9,20.6],[5.6,17.6]],AK.steelK);
  avE(12,9.6,6.2,5.6,AK.steel);
  avPoly([[5.6,10],[18.4,10],[17.6,17],[14.6,19.8],[9.4,19.8],[6.4,17]],AK.steel);
  avPoly([[5.6,10.4],[8.6,11],[9.4,16],[7.6,18.6],[6.4,17]],AK.steelD);
  avR(5,9,14,2,AK.gold);avR(5,9,14,1,AK.goldL);avP(5,10,AK.goldD);
  avR(6,11,5,2,AK.ink);avR(7,11,3,1,AK.cyD);avP(8,11,AK.cy);avP(9,11,AK.cy);
  avR(11,9,2,10,AK.steelD);avR(11,11,1,8,AK.steel);avR(11,9,1,1,AK.goldL);
  avE(12,6.2,3.4,2.2,AK.pale);avE(12,6.2,2.6,1.6,AK.white);
  avP(6,15,AK.in3);avP(7,16,AK.in3);avP(8,15,AK.in3);avP(6,5,AK.gold);avP(9,18,AK.gold);
  AVSYM=false;
}
function avMascara(){
  avBg("#3A1A6A","#150A36",[[3,3,AK.pink],[20,3,AK.goldL],[2,18,AK.goldL],[20,19,AK.pink],[3,10,AK.lav]]);
  avPoly([[15.6,8],[16.6,2.2],[19,2.6],[18,8.6]],AK.pink);avPoly([[17,8],[19.6,4],[21.2,5.6],[18.6,9]],AK.cy);avPoly([[14.4,8.6],[15,3.4],[16.4,4],[15.6,9]],AK.gold);
  AVSYM=true;
  avPoly([[12,8.4],[9.8,7],[6,6.8],[2.8,9.4],[3.4,12.8],[6.4,15.2],[9.6,14.8],[10.8,12.6],[12,12.2]],AK.pale);
  avPoly([[12,13],[10.8,12.6],[9.6,14.8],[6.4,15.2],[3.4,12.8],[3.8,13.6],[6.4,16],[10.2,15.6],[11.6,13.6]],AK.lav);
  avPoly([[5.2,9.4],[8.8,8.8],[10.2,10.8],[8.4,12.6],[6,12.2]],AK.ink);
  avPoly([[5.8,9.8],[8.4,9.4],[9.2,10.6]],AK.vioL);avP(8,10,AK.pink);
  avL(4,8,7,7,AK.gold);avL(3,12,6,14,AK.gold);avL(9,8,11,9,AK.gold);
  avE(12,9.2,1.3,1.5,AK.pink);avP(12,8,AK.white);
  AVSYM=false;
  avR(11,12,2,1,AK.lav);
  avPoly([[10.6,17.6],[12,17],[13.4,17.6],[12,19]],AK.red);avR(11,17,2,1,AK.redD);
}
function avRuna(){
  avBg("#17205E","#0A1030",[]);
  avPoly([[4,3.4],[20,3.4],[20.6,20],[3.4,20]],"#3A4699");
  avPoly([[5,4.4],[19,4.4],[19.6,19],[4.4,19]],"#2C357C");
  avR(5,4,14,1,"#5560B8");avR(4,5,1,14,"#4752A8");avR(19,5,1,14,"#1A2266");avR(5,19,15,1,"#1A2266");
  [[6,16,AK.in1],[16,6,AK.in1],[7,7,AK.in1],[17,15,AK.in1]].forEach(p=>avP(p[0],p[1],p[2]));
  AVG.fillStyle="rgba(90,209,232,.22)";
  for(let j=5;j<19;j++)for(let i=5;i<19;i++){const d=Math.min(Math.abs(i-11.5),99);if(Math.abs(i-11.5)<4.5&&Math.abs(j-11.5)<7)AVG.fillRect(i,j,1,1)}
  avR(11,6,2,12,AK.cyD);avL(11,10,6,6,AK.cyD);avL(12,10,17,6,AK.cyD);avL(11,11,6,7,AK.cyD);avL(12,11,17,7,AK.cyD);
  avR(11,6,1,12,AK.cy);avR(12,6,1,12,AK.white);avL(11,10,7,6,AK.cy);avL(12,10,16,6,AK.cy);
  [[8,17,AK.cy],[16,17,AK.cy],[10,5,AK.white],[15,12,AK.cy]].forEach(p=>avP(p[0],p[1],p[2]));
}
const AV_DEFS=[
  {id:"buho",name:"Búho",accent:AK.gold,draw:avBuho},
  {id:"cuervo",name:"Cuervo",accent:AK.lav,draw:avCuervo},
  {id:"lobo",name:"Lobo",accent:AK.cy,draw:avLobo},
  {id:"fenix",name:"Fénix",accent:AK.or,draw:avFenix},
  {id:"ouroboros",name:"Ouroboros",accent:AK.gr,draw:avOuroboros},
  {id:"ojo",name:"Ojo que todo lo ve",accent:AK.gold,draw:avOjo},
  {id:"luna",name:"Luna",accent:AK.goldL,draw:avLuna},
  {id:"llama",name:"Llama",accent:AK.red,draw:avLlama},
  {id:"arbol",name:"Árbol del mundo",accent:AK.gr,draw:avArbol},
  {id:"yelmo",name:"Yelmo",accent:AK.steel,draw:avYelmo},
  {id:"mascara",name:"Máscara",accent:AK.pink,draw:avMascara},
  {id:"runa",name:"Runa",accent:AK.cy,draw:avRuna}
];
function avRender(def){const c=document.createElement("canvas");c.width=c.height=AVN;AVG=c.getContext("2d");AVG.imageSmoothingEnabled=false;AVSYM=false;def.draw();AVSYM=false;avFrame(def.accent);return c}

/* emblema de 5×5 (para el pecho del comandante en el mapa): el píxel más vivo de cada bloque de 4×4 */
function avEmblem(c){const d=c.getContext("2d").getImageData(2,2,20,20).data,out=[];
  for(let by=0;by<5;by++)for(let bx=0;bx<5;bx++){let best=null,bs=-1;
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){const i=((by*4+y)*20+bx*4+x)*4,r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b),s=(mx-mn)+.45*(.299*r+.587*g+.114*b);if(s>bs){bs=s;best=[r,g,b]}}
    out.push("#"+best.map(v=>v.toString(16).padStart(2,"0")).join(""))}
  return out}
const AV_KEY="kasanov:avatar:v1",AVURL={};
let AV={id:"buho",chosen:false,url:"",acc:AK.gold,emb:null,name:"Búho"};
function avBuilt(id){if(AVURL[id])return AVURL[id];const d=AV_DEFS.find(x=>x.id===id)||AV_DEFS[0];const c=avRender(d);return AVURL[d.id]={url:c.toDataURL(),acc:d.accent,emb:avEmblem(c),name:d.name}}
function avLoad(){let o=null;try{o=JSON.parse(localStorage.getItem(AV_KEY)||"null")}catch(e){}
  if(o&&o.id==="foto"&&typeof o.url==="string"&&o.url.indexOf("data:image/png")===0&&Array.isArray(o.emb)&&o.emb.length===25){AV={id:"foto",chosen:true,url:o.url,acc:/^#[0-9a-f]{6}$/i.test(o.acc||"")?o.acc:AK.gold,emb:o.emb.map(String),name:"Tu foto"};return}
  const id=o&&AV_DEFS.some(d=>d.id===o.id)?o.id:null,b=avBuilt(id||"buho");AV={id:id||"buho",chosen:!!id,url:b.url,acc:b.acc,emb:b.emb,name:b.name}}
function avPersist(){try{if(!AV.chosen)localStorage.removeItem(AV_KEY);else localStorage.setItem(AV_KEY,JSON.stringify(AV.id==="foto"?{id:"foto",url:AV.url,acc:AV.acc,emb:AV.emb}:{id:AV.id}));return true}catch(e){return false}}
const avHTML=(url,acc,cls,alt)=>`<span class="avt ${cls||""}" style="--av:${esc(acc)}"><img src="${esc(url)}" alt="${esc(alt||"")}" width="24" height="24"><i class="tw t1"></i><i class="tw t2"></i><i class="tw t3"></i></span>`;
function paintAvatars(){
  const h=avHTML(AV.url,AV.acc,"",""),b=$("prof-av");if(b&&b.__h!==h){b.innerHTML=h;b.__h=h}
  const big=$("fi-avimg");if(big){const h2=avHTML(AV.url,AV.acc,"big",AV.name);if(big.__h!==h2){big.innerHTML=h2;big.__h=h2}}
  const gal=$("av-gal");if(gal)gal.querySelectorAll(".avopt").forEach(x=>x.setAttribute("aria-checked",String(AV.chosen&&x.dataset.av===AV.id)));
  const cl=$("av-clear");if(cl)cl.hidden=AV.id!=="foto";
  const up=$("av-up");if(up)up.setAttribute("aria-pressed",String(AV.id==="foto"));
  const pb=$("prof-btn");if(pb)pb.title="Perfil · avatar: "+AV.name}
function avApply(){AVCMD=AV.chosen?{acc:AV.acc,emb:AV.emb}:null;delete PORT.cmd;paintAvatars();try{renderChat();renderExp()}catch(e){}}
function avPick(id){const b=avBuilt(id);AV={id,chosen:true,url:b.url,acc:b.acc,emb:b.emb,name:b.name};const ok=avPersist();avApply();return ok}
function avReset(){AV.chosen=false;const b=avBuilt("buho");AV={id:"buho",chosen:false,url:b.url,acc:b.acc,emb:b.emb,name:b.name};avPersist();avApply()}
/* foto → pixel art con la paleta de la app: recorte cuadrado, 20×20, contraste ajustado, tramado ordenado y marco místico */
const AV_PAL=["#05061A","#0C1138","#1A1F52","#2C357C","#3A4699","#4B3FB0","#5B4FD0","#8F89E6","#B9B2FF","#C69CFF","#5AD1E8","#2B7FA8","#FFE9A6","#FFC15A","#B8862E","#FF9E6B","#FF7AA8","#E0AE85","#A36A4C","#6B3E3A","#7EE0A1","#2F8F6B","#F1EEFF","#A9B0E0"];
const AV_PALRGB=AV_PAL.map(avHex),AV_VIVID=[10,13,15,16,20,9,7],BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function avNearest(r,g,b){let bi=0,bd=1e12;for(let i=0;i<AV_PALRGB.length;i++){const p=AV_PALRGB[i],rm=(r+p[0])/2,dr=r-p[0],dg=g-p[1],db=b-p[2],d=(2+rm/256)*dr*dr+4*dg*dg+(2+(255-rm)/256)*db*db;if(d<bd){bd=d;bi=i}}return bi}
function avPixelate(src,sw,sh){
  const S=20,m=Math.min(sw,sh),sx=(sw-m)/2,sy=(sh-m)/2;
  const w=document.createElement("canvas");w.width=w.height=S*4;const g=w.getContext("2d");g.fillStyle="#1A1F52";g.fillRect(0,0,S*4,S*4);g.imageSmoothingEnabled=true;g.imageSmoothingQuality="high";g.drawImage(src,sx,sy,m,m,0,0,S*4,S*4);
  const w2=document.createElement("canvas");w2.width=w2.height=S;const g2=w2.getContext("2d");g2.imageSmoothingEnabled=true;g2.imageSmoothingQuality="high";g2.drawImage(w,0,0,S,S);
  const im=g2.getImageData(0,0,S,S),d=im.data,L=[];
  for(let i=0;i<S*S;i++)L.push(.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2]);
  const so=L.slice().sort((a,b)=>a-b),lo=so[Math.floor(S*S*.04)],hi=so[Math.floor(S*S*.96)],k=hi-lo>24?255/(hi-lo):1;
  const out=document.createElement("canvas");out.width=out.height=AVN;AVG=out.getContext("2d");AVG.imageSmoothingEnabled=false;AVSYM=false;
  AVG.fillStyle=AK.in1;AVG.fillRect(2,2,20,20);
  const use=new Array(AV_PAL.length).fill(0),idx=[];
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const i=y*S+x;let r=d[i*4],gg=d[i*4+1],b=d[i*4+2];const l=L[i],nl=Math.max(0,Math.min(255,(l-lo)*k)),f=l>2?nl/l:1;r*=f;gg*=f;b*=f;
    const mu=(r+gg+b)/3;r=mu+(r-mu)*1.3;gg=mu+(gg-mu)*1.3;b=mu+(b-mu)*1.3;const t=(BAYER[(y%4)*4+x%4]-7.5)*3.4;
    const j=avNearest(Math.max(0,Math.min(255,r+t)),Math.max(0,Math.min(255,gg+t)),Math.max(0,Math.min(255,b+t)));use[j]++;idx.push(j);AVG.fillStyle=AV_PAL[j];AVG.fillRect(2+x,2+y,1,1)}
  let acc=AK.gold,bu=0;AV_VIVID.forEach(j=>{if(use[j]>bu){bu=use[j];acc=AV_PAL[j]}});
  avFrame(acc);
  const emb=[];for(let by=0;by<5;by++)for(let bx=0;bx<5;bx++){let r=0,gg=0,b=0;for(let y=0;y<4;y++)for(let x=0;x<4;x++){const p=AV_PALRGB[idx[(by*4+y)*S+bx*4+x]];r+=p[0];gg+=p[1];b+=p[2]}
    const j=avNearest(r/16,gg/16,b/16);emb.push(AV_PAL[j])}
  return{url:out.toDataURL("image/png"),acc,emb}}
function avSetPhoto(res){AV={id:"foto",chosen:true,url:res.url,acc:res.acc,emb:res.emb,name:"Tu foto"};const ok=avPersist();avApply();return ok}

/* =================== FICHA DEL COMANDANTE (ícono de perfil junto al engranaje) =================== */
const CMD_DEFAULT="Comandante";
const cmdName=()=>String(cfg().owner||"").trim()||CMD_DEFAULT;
/* íconos de 7×7 para las estadísticas (pixel art en SVG) */
const PXI={
  racha:["...#...","..###..",".#####.",".##.###",".######","..####.","...##.."],
  trofeo:["#.###.#","#######",".#####.",".#####.","..###..","...#...","..###.."],
  check:[".......","......#",".....##","#...##.","##.##..",".###...","..#...."],
  gema:["..###..",".#####.","#######",".#####.","..###..","...#...","......."],
  bandera:["#####..","######.","#####..","#......","#......","#......","#......"],
  espada:[".....##","....###","...###.","#.###..",".###...",".##....","#.#...."]};
const pxSvg=rows=>`<svg viewBox="0 0 7 7" shape-rendering="crispEdges" aria-hidden="true" fill="currentColor">`+rows.map((r,y)=>[...r].map((c,x)=>c==="#"?`<rect x="${x}" y="${y}" width="1" height="1"/>`:"").join("")).join("")+`</svg>`;
const FI_TILES=[["racha","Racha actual","cur","días seguidos","var(--gold)"],["trofeo","Mejor racha","best","días seguidos","var(--c5)"],["check","Días cumplidos","met","últimos 180 días","var(--c3)"],["gema","Habilidades probadas","skills","con evidencia","var(--c1)"],["bandera","Proyectos publicados","pubs","terminados","var(--c6)"],["espada","Misiones cumplidas","quests","misiones del día","var(--c4)"]];
function fichaStats(){
  const t=today(),keys=Object.keys(S.days).filter(s=>s<=t).sort();let best=0,run=0,met=0;
  if(keys.length){let s=keys[0],guard=0;while(s<=t&&guard++<400){if(score(s).met){met++;run++;if(run>best)best=run}else run=0;s=addDays(s,1)}}
  const cur=streak();
  return{cur,best:Math.max(best,cur),met,skills:S.skills.filter(x=>x.level==="probada").length,pubs:S.projects.filter(p=>p.status==="done").length,quests:Object.values(S.quests).filter(q=>q.done).length}}

/* ---------- preferencias: el rol de Claude vive en config (campo aiRole que ya existía); tono y horarios, solo en este navegador ---------- */
const PREF_KEY="kasanov:prefs:v1";
const TONES=[["directo","Directo y breve","Háblale directo y breve: sin rodeos ni sermones."],["calido","Cálido y alentador","Háblale con calidez y ánimo: reconoce primero lo que sí hizo y después propón."],["estricto","Estricto","Sé exigente: señala sin suavizar lo que no cumplió, pero sin culpabilizar."],["mitico","Mítico, en personaje","Habla en personaje, con el carácter mitológico de cada agente, sin perder claridad."]];
const ROLES=[["Copiloto","copiloto con explicación"],["Maestro","maestro: me guía con preguntas y pistas, sin escribirme el código"],["Ejecutor","ejecutor: escribe el código y me resume qué hizo"],["Revisor","revisor: solo revisa y critica lo que yo escribo"]];
let PREFS={tone:"",toneNote:"",study:"",close:""},PRT=null;
function prefsLoad(){try{const o=JSON.parse(localStorage.getItem(PREF_KEY)||"{}")||{};["tone","toneNote","study","close"].forEach(k=>{if(typeof o[k]==="string")PREFS[k]=o[k].slice(0,200)});if(!TONES.some(t=>t[0]===PREFS.tone))PREFS.tone=""}catch(e){}}
function prefsSaveLocal(){try{localStorage.setItem(PREF_KEY,JSON.stringify(PREFS));return true}catch(e){return false}}
function prefsText(){const o=[],t=TONES.find(x=>x[0]===PREFS.tone);if(t)o.push("- Tono: "+t[2]);if(PREFS.toneNote.trim())o.push("- Sobre cómo hablarle: "+PREFS.toneNote.trim());
  const h=[PREFS.study.trim()?"su mejor franja para estudiar o construir es "+PREFS.study.trim():"",PREFS.close.trim()?"cierra el día a las "+PREFS.close.trim():""].filter(Boolean);
  if(h.length)o.push("- Horarios: "+h.join("; ")+". Respétalos al asignar horas.");
  return o.length?"\n\nPREFERENCIAS DEL COMANDANTE (cómo quiere que le hablen y cuándo):\n"+o.join("\n"):""}
function renderPrefs(){
  const cur=PRT===null?PREFS.tone:PRT;
  $("pr-tone").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.tone===cur)));
  const set=(id,v)=>{const x=$(id);if(document.activeElement!==x&&!x.dataset.dirty&&x.value!==v)x.value=v};
  set("pr-note",PREFS.toneNote);set("pr-study",PREFS.study);set("pr-close",PREFS.close);set("pr-role",cfg().aiRole||"");
  const tl=(TONES.find(t=>t[0]===PREFS.tone)||[])[1];
  $("fi-s-prefs").textContent=(tl?"Tono: "+tl:"Tono sin definir")+" · Rol de Claude: "+(()=>{const a=String(cfg().aiRole||"copiloto con explicación"),r=ROLES.find(x=>a.toLowerCase().startsWith(x[0].toLowerCase()));return r?r[0]:short(a,34)})()}
$("pr-tone").innerHTML=TONES.map(t=>`<button type="button" data-tone="${t[0]}" aria-pressed="false">${esc(t[1])}</button>`).join("");
$("pr-roles").innerHTML=ROLES.map(r=>`<button type="button" class="chip" data-role="${esc(r[1])}">${esc(r[0])}</button>`).join("");
$("pr-tone").addEventListener("click",e=>{const b=e.target.closest("button[data-tone]");if(!b)return;const cur=PRT===null?PREFS.tone:PRT;PRT=cur===b.dataset.tone?"":b.dataset.tone;$("pr-st").textContent="Cambios sin guardar";renderPrefs()});
$("pr-roles").addEventListener("click",e=>{const b=e.target.closest("button[data-role]");if(!b)return;const x=$("pr-role");x.value=b.dataset.role;x.dataset.dirty="1";$("pr-st").textContent="Cambios sin guardar"});
["pr-note","pr-study","pr-close","pr-role"].forEach(id=>$(id).addEventListener("input",e=>{e.target.dataset.dirty="1";$("pr-st").textContent="Cambios sin guardar"}));
$("pr-save").onclick=()=>{
  if(PRT!==null)PREFS.tone=PRT;PRT=null;PREFS.toneNote=$("pr-note").value.trim().slice(0,200);PREFS.study=$("pr-study").value.trim().slice(0,200);PREFS.close=$("pr-close").value.trim().slice(0,200);
  ["pr-note","pr-study","pr-close"].forEach(id=>delete $(id).dataset.dirty);
  const okLocal=prefsSaveLocal(),role=$("pr-role").value.trim().slice(0,240);let p=Promise.resolve(true);
  if($("pr-role").dataset.dirty){
    if(!S.config){toast("La configuración aún no carga: el rol de Claude no se guardó.")}
    else if(role!==(S.config.aiRole||"")){const nc=Object.assign({},S.config,{updated:nowISO()});if(role)nc.aiRole=role;else delete nc.aiRole;S.config=nc;p=save("config/main",nc);delete $("pr-role").dataset.dirty}
    else delete $("pr-role").dataset.dirty}
  $("pr-st").textContent="Guardando…";
  p.then(ok=>{$("pr-st").textContent=!ok?"No se pudo guardar el rol de Claude.":okLocal?"Guardado. Los agentes lo usan desde su próximo mensaje.":"El rol se guardó, pero este navegador no permitió guardar tono y horarios."});
  renderPrefs()};

/* ---------- apertura, cierre y secciones desplegables ---------- */
let FIFROM=null;const FI_OPEN={perfil:false,prefs:false,habitos:false,gh:false};
function renderFichaFolds(){Object.keys(FI_OPEN).forEach(k=>{const o=FI_OPEN[k];$("fi-h-"+k).setAttribute("aria-expanded",String(o));$("fi-b-"+k).hidden=!o})}
function renderProfBtn(){const n=profOf().pending.length,b=$("prof-n");b.hidden=!n;b.textContent=n;$("prof-btn").setAttribute("aria-label","Perfil"+(n?" · "+n+" patrón"+(n===1?"":"es")+" por revisar":""))}
function renderFicha(){
  const xp=xpTotal(),lv=lvlOf(xp),lo=25*(lv-1)**2,hi=25*lv**2;
  $("fi-name").textContent=cmdName();$("fi-rank").textContent=rankOf(lv);$("fi-lv").textContent="Nv "+lv;
  $("fi-xp").textContent=xp+" XP · faltan "+(hi-xp)+" para Nv "+(lv+1);$("fi-xpbar").style.width=Math.round(100*(xp-lo)/(hi-lo))+"%";
  const st=fichaStats(),h=FI_TILES.map(t=>`<div class="st" style="--ic:${t[4]}"><span class="si">${pxSvg(PXI[t[0]])}</span><div class="sx"><span class="sl">${t[1]}</span><b class="sv">${st[t[2]]}</b><span class="ss">${t[3]}</span></div></div>`).join("");
  const el=$("fi-stats");if(el.__h!==h){el.innerHTML=h;el.__h=h}
  paintAvatars();renderFichaFolds();renderPerfil();renderPrefs();renderHabitos();renderGh();
  const c=cfg();$("fi-s-habitos").textContent=(c.habits||[]).length+" hábitos · "+(c.bonus||[]).length+" bonus"}
function openFicha(sec){const b=$("fi-back");if(b.hidden)FIFROM=document.activeElement;if(sec&&sec in FI_OPEN)FI_OPEN[sec]=true;b.hidden=false;$("fi-avpick").hidden=true;renderFicha();
  setTimeout(()=>{try{if(sec&&FI_OPEN[sec]){const f=$("fi-f-"+sec);if(f&&f.scrollIntoView)f.scrollIntoView({block:"nearest"})}$("fi-close").focus({preventScroll:true})}catch(e){}},30)}
function closeFicha(){const b=$("fi-back");if(b.hidden)return;b.hidden=true;try{if(FIFROM&&document.body.contains(FIFROM)&&FIFROM.focus)FIFROM.focus({preventScroll:true})}catch(e){}FIFROM=null}
$("prof-btn").onclick=()=>openFicha();
$("fi-close").onclick=closeFicha;
$("fi-back").addEventListener("mousedown",e=>{if(e.target===$("fi-back"))closeFicha()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeFicha()});
$("fi-folds").addEventListener("click",e=>{const b=e.target.closest(".fold-h");if(!b)return;const k=b.dataset.f;FI_OPEN[k]=!FI_OPEN[k];renderFichaFolds()});

/* ---------- galería de avatares y foto propia ---------- */
$("av-gal").innerHTML=AV_DEFS.map(d=>{const b=avBuilt(d.id);return `<button type="button" class="avopt" role="radio" aria-checked="false" data-av="${d.id}" title="${esc(d.name)}">${avHTML(b.url,b.acc,"med",d.name)}<span class="avn">${esc(d.name)}</span></button>`}).join("");
$("av-gal").addEventListener("click",e=>{const b=e.target.closest(".avopt");if(!b)return;const ok=avPick(b.dataset.av);$("av-msg").textContent=ok?"Avatar guardado en este navegador.":"Se aplicó, pero este navegador no permitió guardarlo."});
$("fi-av").onclick=()=>{const p=$("fi-avpick");p.hidden=!p.hidden;$("fi-av").setAttribute("aria-expanded",String(!p.hidden));if(!p.hidden)try{p.scrollIntoView({block:"nearest"})}catch(e){}};
$("av-close").onclick=()=>{$("fi-avpick").hidden=true;$("fi-av").setAttribute("aria-expanded","false")};
$("av-up").onclick=()=>$("av-file").click();
$("av-clear").onclick=()=>{avReset();$("av-msg").textContent="Foto quitada."};
async function avFile(f){const m=$("av-msg");if(!f)return;
  if(!/^image\//.test(f.type||"")){m.textContent="Ese archivo no es una imagen.";return}
  if(f.size>20e6){m.textContent="La imagen pesa más de 20 MB; elige una más ligera.";return}
  m.textContent="Convirtiendo a pixel art…";
  try{let src=null,w=0,h=0,rel=null;
    if(window.createImageBitmap){try{src=await createImageBitmap(f);w=src.width;h=src.height;rel=()=>{try{src.close()}catch(e){}}}catch(e){src=null}}
    if(!src){const u=URL.createObjectURL(f);try{src=await new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=()=>no(new Error("no se pudo decodificar"));im.src=u});w=src.naturalWidth;h=src.naturalHeight}finally{URL.revokeObjectURL(u)}}
    if(!w||!h)throw new Error("imagen vacía");
    const res=avPixelate(src,w,h);if(rel)rel();const ok=avSetPhoto(res);
    m.textContent=ok?"Listo: tu foto quedó como avatar y solo vive en este navegador (la original no se guarda).":"Tu foto se aplicó, pero este navegador no permitió guardarla: al recargar volverá el avatar anterior."}
  catch(e){m.textContent="No se pudo leer esa imagen ("+(e&&e.message||"error")+"). Prueba con un JPG o PNG."}}
$("av-file").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];e.target.value="";avFile(f)});
const avp=$("fi-avpick");["dragenter","dragover"].forEach(t=>avp.addEventListener(t,e=>{e.preventDefault();avp.classList.add("drop")}));
["dragleave","drop"].forEach(t=>avp.addEventListener(t,e=>{e.preventDefault();avp.classList.remove("drop")}));
avp.addEventListener("drop",e=>{const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];avFile(f)});

prefsLoad();avLoad();avApply();

/* =================== DIAGNÓSTICO DE AGENTES: qué recibió cada uno en la última misión =================== */
function diagMission(){return missionsAll().find(m=>m.origin!=="registro"&&m.fuentes&&Object.keys(m.fuentes).length>1)||null}
function renderDiag(){const el=$("dg-body");if(!el)return;
  const m=diagMission(),order=depts().slice().sort((a,b)=>canonIdx(a.id)-canonIdx(b.id)).map(d=>d.id).concat(["nexo"]);
  const rep={};if(m)(m.steps||[]).forEach(s=>{if(s.kind==="report"&&s.desp)rep[s.who]=s.desp});
  const head=m?`<p class="hint">Última misión con registro de fuentes: <strong>${T(m.title||"Misión")}</strong> · ${esc(pretty(ds(new Date(m.created||Date.now()))))} ${esc(hhmm(m.created))}. Lo que ves es lo que llegó a cada agente en esa misión; si algo está en rojo, esa fuente llegó vacía. «Ahora» es lo que hay guardado en este momento.</p>`
    :`<p class="hint">Aún no hay una misión con registro de fuentes. Abajo ves lo que recibiría cada agente <strong>ahora</strong> con tus datos; despliega una ronda completa para registrar lo que recibe de verdad.</p>`;
  const cards=order.map(id=>{const w=whoInfo(id),live=srcStat(id),got=m&&m.fuentes[id],src=portrait(id);
    const rows=(got||live).filter(s=>s.k.indexOf("(respaldo)")<0||id==="nexo");
    const chips=rows.map(s=>{const lv=live.find(x=>x.k===s.k),diff=got&&lv&&lv.n!==s.n;
      return `<li class="${s.n?"ok":"z"}"><span class="k">${esc(s.k)}</span><b class="num">${s.n}</b>${s.n===0?`<span class="dst">vacío${s.note?" · "+esc(s.note):""}</span>`:""}${diff?`<span class="dnow">ahora ${lv.n}</span>`:""}</li>`}).join("");
    const d=rep[id];let st;
    if(!m)st=`<span class="chip">Vista previa</span>`;else if(id==="nexo")st=m.summary?`<span class="chip ok">Sintetizó</span>`:`<span class="chip">Sin síntesis</span>`;
    else if(!got)st=`<span class="chip">No convocado en esa misión</span>`;
    else if(!d)st=`<span class="chip">Sin despacho</span>`;else if(d.sinDatos)st=`<span class="chip warn">Sin datos · pidió el dato</span>`;else if(d.ok===false)st=`<span class="chip bad">Descartado</span>`;else st=`<span class="chip ok">Despacho entregado</span>`;
    const empt=rows.filter(s=>s.n===0&&s.k.indexOf("(respaldo)")<0&&s.k.indexOf("perfil")<0&&s.k.indexOf("expediente")<0).length;
    return `<article class="dgc${empt?" hasz":""}" style="--ac:${w.color}"><header>${src?`<img src="${src}" alt="">`:`<span class="dot" style="background:${w.color}"></span>`}<strong style="color:${w.color}">${esc(w.name)}</strong>${st}</header>
      <ul class="dgl" aria-label="Fuentes de ${esc(w.name)}">${chips||`<li class="z">Sin fuentes</li>`}</ul>
      ${d&&d.sinDatos&&((d.faltan||[]).length||d.pregunta)?`<p class="dgq"><strong>Pidió:</strong> ${T((d.faltan||[]).join("; ")||d.pregunta)}</p>`:""}</article>`}).join("");
  const h=head+`<div class="dgrid">${cards}</div><p class="hint">Cada agente recibe también tu perfil y su expediente. Si «commits de GitHub» sale vacío, revisa la conexión en tu Perfil (en claude.ai puede estar bloqueado).</p>`;
  if(el.__h!==h){el.innerHTML=h;el.__h=h}
  const go=$("dg-run");if(go)go.disabled=running||sampleOff}
$("dg-run").onclick=()=>{if(running)return;closeConsole();runMission("Planear mi día: ronda completa para revisar el estado de todas mis áreas.","",true,{why:coldStart()?"cold":"text"});show("nexo")};

/* =================== ENTRENAMIENTO (a cargo de Heracles) · colección propia «entreno» =================== */
/* Documentos: entreno/plan (programa y ejercicios), entreno/body (métricas), entreno/supl (creatina, agua, proteína) y entreno/w-* (una sesión cada uno).
   Nada de esto toca days, config ni ninguna otra colección; lo único que escribe afuera es marcar el hábito «Ejercicio» del día al cerrar una sesión. */
const EN={docs:{},loaded:false,seeded:false};
const EN_DOW=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const dDiff=(a,b)=>Math.round((parse(a)-parse(b))/864e5);
const r05=x=>Math.round(x*2)/2;
const enId=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const EN_PERSONAL={program:"Upper/Lower 4 días (ejemplo editable)",startLabel:"",level:"",shoulder:"Sin molestias registradas",priorities:[],
  refs:{},body:{weight:"",height:"",age:"",sex:"hombre",waist:"",fat:"",w:[]},creStart:"",creSeed:[],water:2000};
const EN_PLAN_TXT=`UPPER A – Fuerza
- Press inclinado con mancuernas, banco 30-45° [P] 3×6-8 — escápulas atrás y abajo pegadas al banco; codos a 30-45° del torso; bajar en 2 s a la parte alta del pecho
- Jalón al pecho agarre ancho [P] 3×8-10 (Dominadas) — pecho arriba con ligera inclinación atrás; codos a las costillas, no jalar con las manos; barra a la clavícula sin balanceo. Cambia a dominadas si haces 8 limpias
- Remo con mancuerna a una mano apoyado en banco [P] 3×6-8 — espalda plana paralela al piso; jalar hacia la cadera; pausa 1 s arriba
- Elevación lateral con mancuernas de pie [A] 3×10-12 — torso ligeramente al frente; los codos guían hasta la altura del hombro; sin impulso, bajar en 2 s
- Extensión de tríceps sobre la cabeza con cuerda [A] 2×8-10 (Mancuerna a dos manos) — codos fijos al frente; estirar completo atrás
- Curl inclinado con mancuernas, banco 45-60° [A] 2×8-10 — brazos colgando detrás del torso; hombros quietos; bajar en 2-3 s
LOWER A – Fuerza
- Curl femoral acostado [A] 2×8-10 — cadera pegada al banco; recorrido completo; bajar en 2 s
- Sentadilla en Smith [P] 3×6-8 (Sentadilla goblet) — pies ligeramente adelante de la barra al ancho de hombros; muslos paralelos o un poco más; rodillas hacia las puntas
- Peso muerto rumano con mancuernas o barra [P] 3×6-8 — cadera atrás, rodillas apenas flexionadas; peso pegado a los muslos; bajar hasta sentir el femoral (media espinilla) con espalda neutra
- Extensión de cuádriceps [A] 2×8-10 — pausa 1 s arriba; bajar controlado
- Elevación de talones de pie [A] 3×8-10 (Escalón con mancuerna) — pausa 1-2 s abajo en el estiramiento; subir a la punta completa
- Crunch en polea alta de rodillas [A] 2×10-12 (Crunch en banco declinado) — redondear la columna; exhalar al bajar; no jalar con los brazos
UPPER B – Hipertrofia
- Press de banca con barra [P] 3×8-10 (Máquina de pecho) — escápulas retraídas, pies firmes; barra a la línea de los pezones, codos a ~45°
- Jalón agarre neutro [P] 3×10-12 — pecho arriba, codos hacia abajo; estirar completo arriba sin perder la postura
- Remo sentado en polea agarre neutro [P] 3×10-12 (Máquina de remo con apoyo de pecho) — torso fijo sin mecerse; juntar escápulas al final
- Press de hombro sentado [P] 2×8-10 (Mancuernas con banco a 80-90°) — codos ligeramente al frente del torso; bajar a la altura de las orejas
- Face pull con cuerda [A] 2×12-15 — jalar hacia la frente separando la cuerda; terminar con codos altos y manos a los lados de la cabeza. No saltar: cuida el hombro
- Curl con barra EZ [A] 2×10-12 — codos pegados a los costados; sin balanceo; bajar en 2 s
LOWER B – Hipertrofia
- Prensa de piernas [P] 3×8-10 — pies al ancho de hombros a media plataforma; bajar a ~90° de rodilla sin despegar el glúteo; no bloquear arriba
- Curl femoral sentado [A] 2×10-12 (Curl femoral acostado) — rodilla alineada con el eje de la máquina; pausa 1 s al flexionar
- Sentadilla búlgara con mancuernas [P] 2×8-10 por pierna — torso ligeramente al frente; muslo de adelante paralelo; empujar con el talón de adelante
- Extensión de cuádriceps [A] 2×10-12 — pausa 1 s arriba
- Aductor en máquina [A] 2×10-12 — abrir hasta sentir estiramiento, sin rebote
- Elevación de talones sentado [A] 3×10-12 (Mancuerna sobre las rodillas) — pausa abajo, recorrido completo`;
const SHRE=/press|lateral|face pull|jal[oó]n|dominada|fondos|remo/i;
/* «Pegar lista»: encabezado de sesión y líneas «- Ejercicio [P|A] 3×6-8 (alternativa) — técnica» */
function enParse(txt,prev){const out=[];let cur=null;const norm=s=>flat(s).replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
  const old={};(prev||[]).forEach(s=>(s.ex||[]).forEach(e=>{old[norm(e.n)]=e.id}));
  String(txt||"").split(/\r?\n/).forEach(raw=>{const l=raw.trim();if(!l)return;
    const m=l.match(/^[-•*]\s*(.+?)\s*\[\s*([PpAa])\s*\]\s*(\d+)\s*[×xX*]\s*(\d+)(?:\s*[-–a]\s*(\d+))?\s*(por\s+pierna|por\s+lado)?\s*(?:\(([^)]*)\))?\s*(?:[—–]|--|-)?\s*(.*)$/);
    if(m){if(!cur){cur={id:"s1",name:"Sesión 1",ex:[]};out.push(cur)}
      let tec=m[8]||"";const ns=/no\s+saltar/i.test(tec);tec=tec.replace(/\.?\s*no\s+saltar[^.;]*/i,"").replace(/marcado como\s*["“«]?\s*$/i,"").trim().replace(/[;,]\s*$/,"");
      tec=tec.charAt(0).toUpperCase()+tec.slice(1);const n=m[1].trim(),lo=+m[4],hi=+(m[5]||m[4]),id=old[norm(n)]||enId("e");
      cur.ex.push({id,n,t:m[2].toUpperCase(),s:Math.max(1,Math.min(8,+m[3])),lo:Math.min(lo,hi),hi:Math.max(lo,hi),pl:!!m[6],alt:(m[7]||"").trim(),tec,ns,sh:SHRE.test(n)&&!/femoral|cu[aá]driceps|prensa|talones/i.test(n)});return}
    if(/^[-•*]/.test(l))return;
    const parts=l.replace(/\s+/g," ").split(/\s+[–—-]\s+/),left=parts[0]===parts[0].toUpperCase()?parts[0].split(" ").map(w=>w.length===1?w.toUpperCase():w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(" "):parts[0];
    cur={id:"",name:left+(parts.length>1?" – "+parts.slice(1).join(" – "):""),ex:[]};out.push(cur)});
  const ids=["ua","la","ub","lb"];return out.filter(s=>s.ex.length).map((s,i)=>Object.assign(s,{id:(prev&&prev[i]&&prev[i].id)||ids[i]||("s"+(i+1))}))}
function enDefaultPlan(){const P=EN_PERSONAL,ss=enParse(EN_PLAN_TXT);
  ss.forEach(s=>s.ex.forEach((e,i)=>{e.id=s.id+"-"+(i+1)}));
  return{v:1,program:P.program,startLabel:P.startLabel,block:"A",base:0,blockWeeks:8,readapt:2,level:P.level,shoulder:P.shoulder,priorities:P.priorities.slice(),
    cal:{ua:0,la:1,ub:3,lb:5},warmup:"5 min de cardio + movilidad + 1-2 series de aproximación en el primer ejercicio.",
    rules:{readapt:"2 series por ejercicio a RPE 6-7 (3-4 repeticiones en reserva), cargas por sensación.",normal:"Series completas del plan a RPE 7-8; la última serie a RPE 8.",prog:"Progresión doble: si llegas al tope del rango en todas las series con buena técnica, sube 2.5-5% la siguiente sesión; si no, mantén."},
    rest:{P:[120,180],A:[60,120]},refs:Object.assign({},P.refs),sessions:ss,deload:null,updated:nowISO()}}
function enSeed(){if(EN.docs.plan)return;const P=EN_PERSONAL;enPut("plan",enDefaultPlan());
  if(!EN.docs.body)enPut("body",JSON.parse(JSON.stringify(P.body)));
  if(!EN.docs.supl){const cre={};(P.creSeed||[]).forEach(d=>cre[d]=true);enPut("supl",{creStart:P.creStart||"",cre,water:{goal:P.water||0,days:{}},prot:{on:false,goal:0,days:{}}})}}
function enLoad(s){const o={};s.docs.forEach(d=>{o[d.id]=d.data()});for(const id in EN.docs)if(PEND["entreno/"+id]>0)o[id]=EN.docs[id];EN.docs=o;EN.loaded=true;
  if(!o.plan&&!EN.seeded){EN.seeded=true;enSeed()}}
function enPut(id,data){data.updated=nowISO();EN.docs[id]=JSON.parse(JSON.stringify(data));PEND["entreno/"+id]=(PEND["entreno/"+id]||0)+1;
  return save("entreno/"+id,data).finally(()=>{PEND["entreno/"+id]--})}
const enPlan=()=>EN.docs.plan||null;
const enBody=()=>Object.assign({weight:"",height:"",age:"",sex:"hombre",waist:"",fat:"",w:[]},EN.docs.body||{});
const enSupl=()=>{const s=EN.docs.supl||{};return{creStart:s.creStart||"",cre:Object.assign({},s.cre||{}),water:Object.assign({goal:0,days:{}},s.water||{}),prot:Object.assign({on:false,goal:0,days:{}},s.prot||{})}};
/* sesiones: las cerradas en orden; la abierta (si hay) aparte */
function enWorkouts(){return Object.keys(EN.docs).filter(k=>k.startsWith("w-")).map(k=>Object.assign({id:k},EN.docs[k])).sort((a,b)=>String(a.started||"").localeCompare(String(b.started||"")))}
const enDone=()=>enWorkouts().filter(w=>w.done);
const enOpen=()=>enWorkouts().filter(w=>!w.done).slice(-1)[0]||null;
function enSess(id){const p=enPlan();return p?p.sessions.find(s=>s.id===id)||null:null}
/* regla secuencial: la siguiente después de la última cerrada, sin importar el día */
function enNext(){const p=enPlan();if(!p||!p.sessions.length)return null;const o=enOpen();if(o&&enSess(o.sid))return enSess(o.sid);
  const d=enDone().filter(w=>enSess(w.sid)),last=d[d.length-1];if(!last)return p.sessions[0];const i=p.sessions.findIndex(s=>s.id===last.sid);return p.sessions[(i+1)%p.sessions.length]}
/* semana del bloque = sesiones cerradas desde el inicio del bloque ÷ sesiones por semana */
function enWeekInfo(){const p=enPlan();if(!p)return{week:1,ord:1,per:4,phase:"normal"};const per=Math.max(1,p.sessions.length),o=enOpen();
  const n=o&&o.n!=null?o.n:Math.max(0,enDone().length-(p.base||0));const week=Math.floor(n/per)+1;
  const deload=p.deload&&p.deload.state==="on"&&p.deload.week===week;
  const phase=deload?"descarga":(p.block==="A"&&week<=(p.readapt||0))?"readapt":"normal";return{week,ord:(n%per)+1,per,phase,n}}
function enSetsFor(e,phase){return phase==="readapt"||phase==="descarga"?Math.min(2,e.s):e.s}
const EN_PHASE={readapt:"Readaptación",normal:"Plan completo",descarga:"Semana de descarga"};
function enPhaseRule(ph){const p=enPlan()||{rules:{}};return ph==="readapt"?p.rules.readapt:ph==="descarga"?"Descarga: 2 series por ejercicio a RPE 6, con 10% menos de carga. Recupera para volver más fuerte.":p.rules.normal}
/* historial por ejercicio Y variante (m = principal, a = alternativa) */
function enHist(exId,v){return enDone().filter(w=>(w.sets&&w.sets[exId]||[]).some(x=>x.v===v)).reverse().map(w=>({date:w.date||String(w.finished||w.started||"").slice(0,10),w,sets:w.sets[exId].filter(x=>x.v===v)}))}
const e1rm=x=>(+x.w||0)*(1+(+x.r||0)/30);
const bestOf=sets=>sets.reduce((m,x)=>Math.max(m,e1rm(x)),0);
function enShoulder(){const d=enDone().slice().reverse().find(w=>w.pain&&w.pain.sh);const o=enOpen();
  if(o&&o.pain&&o.pain.sh)return{date:today(),note:o.pain.note||"",open:true};if(!d)return null;const dt=d.date||String(d.finished).slice(0,10);return dDiff(today(),dt)<=14?{date:dt,note:d.pain.note||""}:null}
/* decisión de Heracles por ejercicio y variante: subir, mantener o bajar */
function enCoach(e,v,phase){const p=enPlan()||{},h=enHist(e.id,v),sh=enShoulder();
  if(!h.length){const ref=v==="m"&&p.refs&&p.refs[e.id];return{act:"base",w:0,text:ref?"Para empezar: "+ref+".":phase==="readapt"?"Carga por sensación (RPE 6-7, 3-4 en reserva).":"Elige una carga que te deje 2-3 repeticiones en reserva."}}
  const last=h[0].sets,top=Math.max(...last.map(x=>+x.w||0)),allTop=last.length>0&&last.every(x=>(+x.r||0)>=e.hi),under=last.some(x=>(+x.r||0)<e.lo);
  if(sh&&e.sh)return{act:"bajar",w:r05(top*.85),text:"Registraste molestia en el hombro: baja ~15% ("+r05(top*.85)+" kg) o usa la variante"+(e.alt?" «"+e.alt+"»":"")+". Nunca entrenes con dolor."};
  if(phase==="descarga")return{act:"bajar",w:r05(top*.9),text:"Semana de descarga: "+r05(top*.9)+" kg (−10%), 2 series a RPE 6."};
  if(allTop){const a=r05(top*1.025),b=r05(top*1.05),lo=a>top?a:top+.5;return{act:"subir",w:lo,text:"Llegaste al tope ("+e.hi+") en todas las series con "+top+" kg: sube a "+lo+(b>lo?"–"+b:"")+" kg."}}
  if(under&&h[1]&&h[1].sets.some(x=>(+x.r||0)<e.lo))return{act:"bajar",w:r05(top*.92),text:"Dos sesiones por debajo de "+e.lo+" repeticiones: baja a "+r05(top*.92)+" kg y vuelve a construir."};
  return{act:"mantener",w:top,text:"Mantén "+top+" kg hasta llegar a "+e.hi+" repeticiones en todas las series."+(phase==="readapt"?" Readaptación: RPE 6-7.":"")}}
/* estancamiento: el mejor set de la última sesión no supera al de hace 2+ semanas */
function enStalled(){const p=enPlan();if(!p)return[];const out=[];
  p.sessions.forEach(s=>s.ex.forEach(e=>["m","a"].forEach(v=>{const h=enHist(e.id,v);if(h.length<2)return;const old=h.find(x=>dDiff(h[0].date,x.date)>=14);if(!old)return;
    if(bestOf(h[0].sets)<=bestOf(old.sets))out.push({e,v,since:old.date})})));return out}
function enEnergy(){let n=0,s=0;for(let i=0;i<7;i++){const d=S.days[addDays(today(),-i)];if(d&&d.energy){n++;s+=+d.energy}}return n>=3?s/n:null}
function enDeloadSuggest(){const p=enPlan();if(!p)return null;const wi=enWeekInfo();if(wi.phase!=="normal")return null;if(p.deload&&(p.deload.state==="on"&&p.deload.week>=wi.week))return null;
  if(p.deload&&p.deload.state==="no"&&dDiff(today(),p.deload.at)<7)return null;
  const st=enStalled(),en=enEnergy();if(st.length>=2)return{why:"Te estancaste 2 semanas en "+st.length+" ejercicios ("+st.slice(0,3).map(x=>x.e.n+(x.v==="a"?" (alternativa)":"")).join(", ")+")."};
  if(en!=null&&en<=2.5)return{why:"Tu energía promedio de 7 días es "+en.toFixed(1)+" de 5."};return null}
/* racha estilo Duolingo: solo se rompe con MÁS de 2 días seguidos sin entrenar */
function enStreak(){const dates=[...new Set(enDone().map(w=>w.date||String(w.finished||"").slice(0,10)).filter(Boolean))].sort(),t=today(),runs=[];
  dates.forEach(d=>{const r=runs[runs.length-1];if(r&&dDiff(d,r.end)<=3)r.end=d;else runs.push({start:d,end:d})});
  const last=runs[runs.length-1],since=last?dDiff(t,last.end):null,alive=last&&since<=2;
  const cur=alive?dDiff(t,last.start)+1:0,best=Math.max(cur,...runs.map(r=>dDiff(r.end,r.start)+1),0);
  const per=Math.max(1,(enPlan()||{sessions:[1,2,3,4]}).sessions.length),wk={};enDone().forEach(w=>{const d=w.date||String(w.finished||"").slice(0,10);if(d){const m=monday(d);wk[m]=(wk[m]||0)+1}});
  const full=Object.values(wk).filter(n=>n>=per).length;
  const state=!last?"nueva":since===0?"salvo":since===1?"riesgo":since===2?"ultimo":"perdida";
  return{cur,best,full,state,since,last:last?last.end:"",start:alive?last.start:"",lostAt:last&&!alive?addDays(last.end,3):""}}
const EN_STN={nueva:"Aún sin empezar",salvo:"A salvo",riesgo:"En riesgo",ultimo:"Último día para salvarla",perdida:"Perdida"};
/* creatina y agua */
function creStreak(){const s=enSupl(),t=today();let d=s.cre[t]?t:addDays(t,-1),n=0;while(s.cre[d]&&(!s.creStart||d>=s.creStart)&&n<2000){n++;d=addDays(d,-1)}return n}
const dayTot=(o,d)=>((o.days[d]||{}).e||[]).reduce((a,x)=>a+(+x.v||0),0);
function intakeStreak(o){const t=today();const met=d=>{const x=o.days[d];return x&&(+x.g||o.goal)>0&&dayTot(o,d)>=(+x.g||o.goal)};let d=met(t)?t:addDays(t,-1),n=0;while(met(d)&&n<2000){n++;d=addDays(d,-1)}return n}
/* métricas: IMC, gasto (Mifflin-St Jeor × 1.55 por 4 entrenos/semana), agua 35 ml/kg, proteína 1.6-2.2 g/kg */
function enEst(){const b=enBody(),w=+b.weight||0,h=+b.height||0,a=+b.age||0,o={w,h,a};
  if(w&&h){const hm=h>3?h/100:h;o.bmi=w/(hm*hm)}
  if(w&&h&&a){const cm=h>3?h:h*100;o.bmr=10*w+6.25*cm-5*a+(b.sex==="mujer"?-161:5);o.tdee=o.bmr*1.55}
  if(w){o.water=Math.round(w*35/250)*250;o.protLo=Math.round(w*1.6);o.protHi=Math.round(w*2.2);o.prot=Math.round(w*1.8/5)*5}return o}
/* ---------- SEÑALES de entrenamiento para Heracles (y resumen para Odín) ---------- */
function enSignals(){const p=enPlan();if(!p)return"";const wi=enWeekInfo(),nx=enNext(),st=enStreak(),o=enOpen(),sp=enSupl(),b=enBody(),es=enEst(),t=today();
  const L=["SEÑALES DE ENTRENAMIENTO (módulo Entrenamiento, a tu cargo):"];
  L.push("- Programa: "+p.program+" · bloque "+p.block+", semana "+wi.week+" de "+(p.blockWeeks||8)+" ("+EN_PHASE[wi.phase]+": "+enPhaseRule(wi.phase)+") · nivel "+p.level+" · "+p.shoulder+(p.priorities&&p.priorities.length?" · prioridades: "+p.priorities.join(", "):""));
  L.push("- Regla secuencial: las sesiones van en orden, no amarradas al día. Siguiente sesión: "+(nx?nx.name:"—")+(o?" (ya empezada hoy: "+Object.values(o.sets||{}).reduce((a,x)=>a+x.length,0)+" series registradas)":"")+".");
  L.push("- Racha de entrenamiento: "+st.cur+" días ("+EN_STN[st.state]+(st.last?", último entrenamiento el "+st.last:"")+"); mejor racha "+st.best+" días; semanas con "+wi.per+" de "+wi.per+" sesiones: "+st.full+"."+
    (st.state==="riesgo"?" Si no entrena hoy ni mañana, pierde la racha de "+st.cur+" días.":st.state==="ultimo"?" HOY es el último día: si no entrena hoy, pierde la racha de "+st.cur+" días.":st.state==="perdida"?" La racha se perdió el "+st.lostAt+".":""));
  const dn=enDone().slice(-4).reverse();if(dn.length)L.push("- Últimas sesiones: "+dn.map(w=>(w.date||"")+" "+w.sname+" ("+Object.values(w.sets||{}).reduce((a,x)=>a+x.length,0)+" series"+(w.pain&&w.pain.sh?", MOLESTIA EN EL HOMBRO"+(w.pain.note?": "+w.pain.note:""):"")+")").join(" | "));
  else L.push("- Aún no registra ninguna sesión.");
  if(nx){const dec=nx.ex.map(e=>{const v=(o&&o.vsel&&o.vsel[e.id])||"m",c=enCoach(e,v,wi.phase);return e.n+(v==="a"&&e.alt?" ["+e.alt+"]":"")+": "+c.act+(c.w?" "+c.w+" kg":"")}).join("; ");L.push("- Tu decisión de carga para «"+nx.name+"»: "+dec+".")}
  const stl=enStalled();if(stl.length)L.push("- Estancados 2+ semanas: "+stl.map(x=>x.e.n+(x.v==="a"?" (alternativa)":"")).join(", ")+".");
  const dl=enDeloadSuggest();if(dl)L.push("- Propuesta de semana de descarga: "+dl.why);if(p.deload&&p.deload.state==="on")L.push("- Descarga aceptada para la semana "+p.deload.week+".");
  const sh=enShoulder();if(sh)L.push("- Molestia en el hombro registrada el "+sh.date+(sh.note?" («"+sh.note+"»)":"")+": baja carga o cambia a la variante en empujes y jalones; nunca entrenar con dolor.");
  L.push("- Creatina: racha de "+creStreak()+" días"+(sp.creStart?" (desde "+sp.creStart+")":"")+"; hoy "+(sp.cre[t]?"tomada":"pendiente")+".");
  L.push("- Agua: hoy "+dayTot(sp.water,t)+" de "+(sp.water.goal||0)+" ml; racha de "+intakeStreak(sp.water)+" días cumpliendo la meta.");
  if(sp.prot.on)L.push("- Proteína: hoy "+dayTot(sp.prot,t)+" de "+(sp.prot.goal||0)+" g; racha "+intakeStreak(sp.prot)+" días.");
  L.push("- Cuerpo: peso "+(b.weight||"—")+" kg, altura "+(b.height||"—")+" m"+(b.age?", edad "+b.age:"")+(b.waist?", cintura "+b.waist+" cm":"")+(b.fat?", grasa "+b.fat+"%":"")+(es.bmi?" · IMC "+es.bmi.toFixed(1):"")+(es.tdee?" · gasto estimado "+Math.round(es.tdee)+" kcal/día":"")+(es.prot?" · proteína sugerida "+es.protLo+"-"+es.protHi+" g/día":"")+".");
  const wsr=(b.w||[]).slice(-6);if(wsr.length)L.push("- Pesajes: "+wsr.map(x=>x.d+" "+x.kg+" kg").join(", ")+".");
  return "\n"+L.join("\n")}
const EN_COACH="\n\nCOMO ENTRENADOR (módulo Entrenamiento): eres motivador intenso, pero con datos reales y sin exagerar. La pérdida de músculo NO ocurre en pocos días: lo que está en riesgo a corto plazo es la racha, el ritmo y el hábito; usa eso para presionar, con la cifra exacta (ej. «si no entrenas hoy ni mañana, pierdes tu racha de 23 días»). Di qué sesión sigue según la regla secuencial. Decide subir, mantener o bajar la carga por ejercicio con el registro y cuánto debe durar el bloque (alargarlo si sigue progresando, cerrarlo si se estanca), y si hay estancamiento de 2 semanas en varios ejercicios o la energía cae, propón una semana de descarga. Si hay molestia en el hombro, sugiere bajar carga o cambiar a la variante y nunca que entrene con dolor.";

/* ---------- Entrenamiento: interfaz ---------- */
const ENF={},EDR={},VSEL={};let EN_CW=0,ED=null,EN_EDMSG="";
const enKey=(e,v,side,i)=>e+"|"+v+"|"+side+"|"+i;
const enTyping=el=>{const a=document.activeElement;return !!(a&&el&&el.contains(a)&&(/^(TEXTAREA|SELECT)$/.test(a.tagName)||a.tagName==="INPUT"&&!/^(checkbox|radio|button)$/.test(a.type)))};
function enSet(el,h){if(!el)return;if(el.__h===h||enTyping(el))return;const op=[...el.querySelectorAll("details[open][data-d]")].map(d=>d.dataset.d);el.innerHTML=h;el.__h=h;
  op.forEach(k=>{const d=el.querySelector('details[data-d="'+k+'"]');if(d)d.open=true})}
function enVar(e){const o=enOpen();return (o&&o.vsel&&o.vsel[e.id])||VSEL[e.id]||"m"}
/* valor prellenado: la última vez de esa variante (misma serie y lado), o la sugerencia de Heracles */
function enPrefill(e,v,side,i,c){const k=enKey(e.id,v,side,i);if(EDR[k])return EDR[k];const h=enHist(e.id,v)[0];let w="",r=e.lo;
  if(h){const ss=h.sets.filter(x=>(x.side||"")===side);const x=ss[i]||ss[ss.length-1]||h.sets[h.sets.length-1];if(x){w=+x.w||"";r=+x.r||e.lo}}
  else{const cs=enCurSets(e,v,side),x=cs[cs.length-1];if(x){w=+x.w||"";r=+x.r||e.lo}else if(c&&c.w)w=c.w}return{w,r}}
function enCurSets(e,v,side){const o=enOpen();return o&&o.sets&&o.sets[e.id]?o.sets[e.id].map((x,ix)=>Object.assign({ix},x)).filter(x=>x.v===v&&(x.side||"")===side):[]}
function enExHTML(e,s,live,wi){const v=e.alt?enVar(e):"m",nm=v==="a"&&e.alt?e.alt:e.n,c=enCoach(e,v,wi.phase),N=enSetsFor(e,wi.phase),p=enPlan();
  const rest=(p.rest||{})[e.t]||[60,120],ACT={subir:"↑ Sube",mantener:"= Mantén",bajar:"↓ Baja",base:"• Empieza"};
  let rows="";
  if(live)(e.pl?["izq","der"]:[""]).forEach(side=>{const done=enCurSets(e,v,side);
    for(let i=0;i<N;i++){const lab="Serie "+(i+1)+(side?" · "+(side==="izq"?"pierna izq.":"pierna der."):"");
      if(done[i]){const x=done[i];rows+=`<div class="srow ok"><span class="sl">${esc(lab)}</span><b class="num">${esc(x.w)} kg × ${esc(x.r)}</b><button type="button" class="popx sm" data-undo="${esc(e.id)}" data-ix="${x.ix}" aria-label="Borrar ${esc(lab)}">×</button></div>`;continue}
      const f=enPrefill(e,v,side,i,c),k=enKey(e.id,v,side,i),nextRow=i===done.length;
      rows+=`<div class="srow${nextRow?" nx":""}" data-k="${esc(k)}"><span class="sl">${esc(lab)}</span>
        <span class="stp"><button type="button" class="btn icon" data-step="w" data-d="-1" aria-label="Menos peso">−</button><input type="number" class="num" inputmode="decimal" step="0.5" min="0" data-f="w" value="${esc(f.w)}" aria-label="Peso en kg, ${esc(lab)}"><button type="button" class="btn icon" data-step="w" data-d="1" aria-label="Más peso">+</button><span class="u">kg</span></span>
        <span class="stp"><button type="button" class="btn icon" data-step="r" data-d="-1" aria-label="Menos repeticiones">−</button><input type="number" class="num" inputmode="numeric" step="1" min="0" data-f="r" value="${esc(f.r)}" aria-label="Repeticiones, ${esc(lab)}"><button type="button" class="btn icon" data-step="r" data-d="1" aria-label="Más repeticiones">+</button><span class="u">reps</span></span>
        <button type="button" class="btn primary ok" data-ok="${esc(e.id)}" data-side="${side}" data-i="${i}" aria-label="Confirmar ${esc(lab)}"${nextRow?"":" disabled"}>✓</button></div>`;
}});
  const anyDone=live&&enCurSets(e,v,"").length+enCurSets(e,v,"izq").length+enCurSets(e,v,"der").length>0;
  return `<div class="enex" data-ex="${esc(e.id)}"><div class="enexh"><strong>${T(nm)}</strong><span class="num sxr">${N}×${e.lo}${e.hi!==e.lo?"-"+e.hi:""}${e.pl?" por pierna":""}</span><span class="chip ${e.t==="P"?"tp":"ta"}" title="Descanso ${Math.round(rest[0]/60)}-${Math.round(rest[1]/60)} min">${e.t==="P"?"Pesado":"Aislamiento"}</span>${e.ns?`<span class="chip warn">No saltar: cuida el hombro</span>`:""}</div>
    ${e.alt?`<div class="seg sm" role="group" aria-label="Variante de ${esc(e.n)}"><button type="button" data-var="m" data-e="${esc(e.id)}" aria-pressed="${v==="m"}">Principal</button><button type="button" data-var="a" data-e="${esc(e.id)}" aria-pressed="${v==="a"}">${esc(e.alt)}</button></div>`:""}
    <div class="sug a-${c.act}"><span><b>${ACT[c.act]||""}</b> ${T(c.text)}</span>${live&&c.w?`<button type="button" class="btn ghost sm" data-use="${esc(e.id)}" data-w="${c.w}">Usar ${c.w} kg</button>`:""}</div>
    <details class="tec" data-d="tec-${esc(e.id)}"><summary>Técnica</summary><p>${T(e.tec||"Sin indicaciones.")}</p></details>
    ${live?`<div class="sets">${rows}</div><div class="row"><button type="button" class="btn ghost sm" data-rep="${esc(e.id)}"${anyDone?"":" disabled"}>Repetir serie anterior</button></div>`:""}</div>`}
function enSessHTML(){const p=enPlan(),nx=enNext(),o=enOpen(),wi=enWeekInfo(),t=today(),dow=(parse(t).getDay()+6)%7;
  const cal=EN_DOW.map((d,i)=>{const sid=Object.keys(p.cal||{}).find(k=>p.cal[k]===i),ss=sid&&enSess(sid);return `<div class="cd${i===dow?" on":""}"><span>${d}</span><b>${ss?esc(ss.name.split(" – ")[0]):i===6?"Descanso":"Libre"}</b></div>`}).join("");
  const last={};enDone().forEach(w=>{last[w.sid]=w.date});
  const body=p.sessions.map(s=>{const live=nx&&s.id===nx.id,open=ENF[s.id]!=null?ENF[s.id]:live,cnt=live&&o?Object.values(o.sets||{}).reduce((a,x)=>a+x.length,0):0;
    const sub=(live?(o?"En curso · "+cnt+" serie"+(cnt===1?"":"s"):"Te toca"):"")+(last[s.id]?(live?" · ":"")+"Última: "+pretty(last[s.id]):"")||s.ex.length+" ejercicios";
    return `<section class="card fold enses${live?" next":""}" data-sid="${esc(s.id)}"><h3 class="fold-hh"><button type="button" class="fold-h" data-fold="${esc(s.id)}" aria-expanded="${!!open}"><span class="fold-n">${T(s.name)}</span><span class="fold-s">${T(sub)}</span></button></h3>
      <div class="fold-b stack"${open?"":" hidden"}>
      ${live&&!cnt?`<div class="callout"><strong>Calentamiento</strong><span>${T(p.warmup)} Primer ejercicio: ${T(s.ex[0]?s.ex[0].n:"—")}.</span></div>`:""}
      ${!live?`<p class="hint">Las sesiones van en orden: ahora toca «${T(nx?nx.name:"—")}». Esta queda como referencia.</p>`:""}
      ${s.ex.map(e=>enExHTML(e,s,live,wi)).join("")}
      ${live?`<div class="enpain"><label class="chk"><input type="checkbox" id="en-sh"${o&&o.pain&&o.pain.sh?" checked":""}> Molestia en el hombro</label><input type="text" id="en-shn" maxlength="140" placeholder="Qué sentiste (opcional)" value="${esc(o&&o.pain?o.pain.note||"":"")}" aria-label="Nota de la molestia"${o&&o.pain&&o.pain.sh?"":" hidden"}></div>
        <div class="row"><button type="button" class="btn primary" id="en-finish"${cnt?"":" disabled"}>Terminar sesión</button>${o?`<button type="button" class="btn ghost" id="en-discard">Descartar sesión</button>`:""}<span class="muted" style="font-size:.84rem">Al terminar se marca el hábito «Ejercicio» de hoy.</span></div>`:""}
      </div></section>`}).join("");
  return `<div class="encal" aria-label="Calendario de referencia">${cal}</div>
    <p class="hint"><strong>${esc(EN_PHASE[wi.phase])}</strong> · bloque ${esc(p.block)}, semana <span class="num">${wi.week}</span> de <span class="num">${p.blockWeeks||8}</span>, sesión <span class="num">${wi.ord}</span> de <span class="num">${wi.per}</span>: ${T(enPhaseRule(wi.phase))} Las sesiones van en orden, no amarradas al día: si faltas, al volver haces la que sigue.</p>${body}`}
function enStreakLine(st,nx){const n=st.cur,nm=nx?"«"+nx.name+"»":"tu siguiente sesión";
  return {nueva:"¡El primer trabajo te espera! Hoy toca "+nm+". Tu racha empieza con la primera sesión.",
    salvo:"¡Hazaña cumplida! Racha de "+n+" días a salvo. Lo que sigue: "+nm+".",
    riesgo:"Tu racha de "+n+" días está EN RIESGO. Toca "+nm+". Si no entrenas hoy ni mañana, pierdes tu racha de "+n+" días.",
    ultimo:"ÚLTIMO DÍA: si no entrenas hoy, pierdes tu racha de "+n+" días. Toca "+nm+". Unos días no te quitan músculo; lo que se va es el ritmo.",
    perdida:"La racha se perdió el "+(st.lostAt?pretty(st.lostAt):"—")+". El músculo no se va en unos días: lo que perdiste es el ritmo. Hoy toca "+nm+": empieza la nueva."}[st.state]}
function enHeadHTML(){const p=enPlan(),st=enStreak(),wi=enWeekInfo(),nx=enNext(),dl=enDeloadSuggest(),sh=enShoulder(),f=portrait("habitos");
  const tile=(l,v,s)=>`<div class="ent"><span class="l">${l}</span><b class="num">${v}</b>${s?`<span class="s">${s}</span>`:""}</div>`;
  let ban="";
  if(dl)ban+=`<div class="callout warn"><strong>Heracles propone una semana de descarga</strong><span>${T(dl.why)} La próxima semana: 2 series por ejercicio a RPE 6 con 10% menos de carga.</span><div class="row"><button type="button" class="btn primary sm" data-deload="on">Aceptar descarga</button><button type="button" class="btn ghost sm" data-deload="no">Ahora no</button></div></div>`;
  if(p.deload&&p.deload.state==="on"&&p.deload.week>=wi.week)ban+=`<div class="callout"><strong>Descarga aceptada</strong><span>Semana ${p.deload.week} del bloque: 2 series, RPE 6, −10% de carga.</span></div>`;
  if(wi.week>(p.blockWeeks||8))ban+=`<div class="callout"><strong>Terminó el bloque ${esc(p.block)}</strong><span>Llevas ${wi.week-1} semanas. Cierra con una semana de descarga y empieza el siguiente bloque con cargas nuevas.</span><div class="row"><button type="button" class="btn sm" id="en-newblock">Empezar bloque ${esc(String.fromCharCode((p.block||"A").charCodeAt(0)+1))}</button></div></div>`;
  if(sh)ban+=`<div class="callout bad"><strong>Molestia en el hombro (${esc(pretty(sh.date))})</strong><span>${sh.note?T(sh.note)+". ":""}En empujes y jalones baja la carga o usa la variante. Nunca entrenes con dolor; si sigue, consúltalo con un profesional.</span></div>`;
  return `<div class="enhead"><div class="who">${f?`<img src="${f}" alt="">`:""}<div><span class="eyebrow">Heracles · tu entrenador</span><p class="line st-${st.state}">${T(enStreakLine(st,nx))}</p><span class="chip st-${st.state}">${EN_STN[st.state]}</span></div></div>
    <div class="entiles">${tile("Racha actual",st.cur,"días")}${tile("Mejor racha",st.best,"días")}${tile("Semanas completas",st.full,wi.per+" de "+wi.per+" sesiones")}${tile("Semana del bloque",wi.week,"de "+(p.blockWeeks||8)+" · bloque "+esc(p.block))}</div></div>${ban}`}
function enCreHTML(){const s=enSupl(),t=today(),m=addDays(monday(t),EN_CW*7);
  const box=EN_DOW.map((d,i)=>{const dd=addDays(m,i),fut=dd>t;return `<label class="crd${dd===t?" on":""}${fut?" fut":""}"><span>${d}</span><span class="num">${parse(dd).getDate()}</span><input type="checkbox" data-cre="${dd}"${s.cre[dd]?" checked":""}${fut?" disabled":""} aria-label="Creatina ${esc(pretty(dd))}"></label>`}).join("");
  return `<div class="row between"><h3>Creatina</h3><span class="chip ok">Racha: <span class="num">${creStreak()}</span> días</span></div>
    <div class="row between"><button type="button" class="btn icon ghost" data-cw="-1" aria-label="Semana anterior">←</button><span class="muted" style="font-size:.84rem">Semana del ${esc(pretty(m))}</span><button type="button" class="btn icon ghost" data-cw="1" aria-label="Semana siguiente"${EN_CW>=0?" disabled":""}>→</button></div>
    <div class="crow">${box}</div>${s.creStart?`<p class="hint">Contando desde el ${esc(pretty(s.creStart))}.</p>`:""}`}
function enIntakeHTML(k){const s=enSupl(),o=s[k],t=today(),tot=dayTot(o,t),g=+o.goal||0,u=k==="water"?"ml":"g",pct=g?Math.min(100,Math.round(tot/g*100)):0;
  const ent=((o.days[t]||{}).e||[]);
  const quick=k==="water"?[250,500]:[20,30];
  return `<div class="row between"><h3>${k==="water"?"Agua":"Proteína"}</h3><span class="chip ${intakeStreak(o)?"ok":""}">Racha: <span class="num">${intakeStreak(o)}</span> días</span></div>
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${g}" aria-valuenow="${tot}" aria-label="${k==="water"?"Agua de hoy":"Proteína de hoy"}"><i style="width:${pct}%"></i></div>
    <div class="row between"><span><b class="num">${tot.toLocaleString("es-MX")}</b> <span class="muted">de</span> <b class="num">${g.toLocaleString("es-MX")}</b> ${u}</span><span class="muted num">${pct}%</span></div>
    <div class="row">${quick.map(q=>`<button type="button" class="btn" data-add="${k}" data-v="${q}">+${q} ${u}</button>`).join("")}<span class="free"><input type="number" class="num" min="1" step="${k==="water"?50:1}" inputmode="numeric" id="en-free-${k}" placeholder="Otra cantidad" aria-label="Cantidad libre en ${u}"><button type="button" class="btn" data-addfree="${k}">Agregar</button></span></div>
    ${ent.length?`<ul class="intk">${ent.map((x,i)=>`<li><span class="muted num">${esc(hhmm(x.at))}</span><input type="number" class="num" min="0" value="${esc(x.v)}" data-edit="${k}" data-i="${i}" aria-label="Corregir registro"><span class="u">${u}</span><button type="button" class="popx sm" data-rm="${k}" data-i="${i}" aria-label="Borrar registro">×</button></li>`).join("")}</ul>`:`<p class="hint">Sin registros hoy.</p>`}
    <div class="row"><label class="field inl">Meta diaria (${u})<input type="number" class="num" min="0" step="${k==="water"?250:5}" id="en-goal-${k}" value="${esc(g||"")}"></label><button type="button" class="btn ghost" data-goal="${k}">Guardar meta</button></div>`}
function enProtHTML(){const s=enSupl(),sw=`<label class="switch"><input type="checkbox" id="en-prot-on"${s.prot.on?" checked":""}><span>${s.prot.on?"Activada":"Activar registro de proteína"}</span></label>`;return s.prot.on?enIntakeHTML("prot")+sw:`<div class="row between"><h3>Proteína</h3><span class="chip">Apagada</span></div><p class="hint">Cuando la actives: meta en gramos por día y registro rápido como el agua.</p>${sw}`}
function enChart(ws){if(ws.length<2)return ws.length?`<p class="hint">Un pesaje registrado. Con dos o más verás la tendencia.</p>`:"";const W=320,H=110,P=26,xs=ws.map(x=>parse(x.d).getTime()),ys=ws.map(x=>+x.kg);
  const x0=Math.min(...xs),x1=Math.max(...xs)||x0+1,y0=Math.min(...ys)-.5,y1=Math.max(...ys)+.5,X=v=>P+(x1===x0?0:(v-x0)/(x1-x0))*(W-P-8),Y=v=>8+(1-(v-y0)/(y1-y0))*(H-P);
  const pts=ws.map((x,i)=>X(xs[i]).toFixed(1)+","+Y(ys[i]).toFixed(1)).join(" ");
  return `<svg class="wchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tendencia de peso: de ${ys[0]} a ${ys[ys.length-1]} kg"><line x1="${P}" y1="${H-P+8}" x2="${W-8}" y2="${H-P+8}" class="ax"/><text x="2" y="${Y(y1-.5)+4}" class="tk">${(y1-.5).toFixed(1)}</text><text x="2" y="${Y(y0+.5)+4}" class="tk">${(y0+.5).toFixed(1)}</text><polyline points="${pts}" class="ln"/>${ws.map((x,i)=>`<circle cx="${X(xs[i]).toFixed(1)}" cy="${Y(ys[i]).toFixed(1)}" r="3" class="pt"><title>${esc(x.d)}: ${esc(x.kg)} kg</title></circle>`).join("")}<text x="${P}" y="${H-2}" class="tk">${esc(pretty(ws[0].d))}</text><text x="${W-8}" y="${H-2}" class="tk" text-anchor="end">${esc(pretty(ws[ws.length-1].d))}</text></svg>`}
function enBodyHTML(){const b=enBody(),e=enEst(),s=enSupl(),ws=(b.w||[]).slice().sort((a,c)=>a.d.localeCompare(c.d)).slice(-26);
  const fld=(id,l,v,ty,ex)=>`<label class="field">${l}<input type="${ty||"number"}" class="num" id="en-b-${id}" value="${esc(v)}" ${ex||""}></label>`;
  const est=[e.bmi?["IMC",e.bmi.toFixed(1),e.bmi<18.5?"bajo":e.bmi<25?"normal":e.bmi<30?"sobrepeso":"obesidad"]:null,e.tdee?["Gasto diario",Math.round(e.tdee).toLocaleString("es-MX")+" kcal","base "+Math.round(e.bmr).toLocaleString("es-MX")+" × 1.55 (4 entrenos/sem)"]:["Gasto diario","—","agrega tu edad"],
    e.water?["Agua sugerida",e.water.toLocaleString("es-MX")+" ml","35 ml por kg"]:null,e.prot?["Proteína sugerida",e.protLo+"-"+e.protHi+" g","1.6-2.2 g por kg"]:null].filter(Boolean);
  return `<div class="row between"><h3>Métricas corporales</h3><span class="muted" style="font-size:.82rem">Heracles usa estos datos en sus cálculos</span></div>
    <div class="bgrid">${fld("weight","Peso (kg)",b.weight,"number",'step="0.1" min="0" inputmode="decimal"')}${fld("height","Altura (m)",b.height,"number",'step="0.01" min="0" inputmode="decimal"')}${fld("age","Edad",b.age,"number",'min="0" inputmode="numeric"')}<label class="field">Sexo<select id="en-b-sex"><option value="hombre"${b.sex!=="mujer"?" selected":""}>Hombre</option><option value="mujer"${b.sex==="mujer"?" selected":""}>Mujer</option></select></label>${fld("waist","Cintura (cm, opcional)",b.waist,"number",'step="0.5" min="0" inputmode="decimal"')}${fld("fat","Grasa % (opcional)",b.fat,"number",'step="0.1" min="0" inputmode="decimal"')}</div>
    <div class="row"><button type="button" class="btn" id="en-b-save">Guardar métricas</button><span class="savestate" id="en-b-st"></span></div>
    <div class="estg">${est.map(x=>`<div class="ent"><span class="l">${x[0]}</span><b class="num">${x[1]}</b><span class="s">${x[2]}</span></div>`).join("")}</div>
    ${e.water||e.prot?`<div class="row">${e.water?`<button type="button" class="btn ghost sm" data-acc="water" data-v="${e.water}">Usar ${e.water.toLocaleString("es-MX")} ml como meta de agua${+s.water.goal===e.water?" ✓":""}</button>`:""}${e.prot?`<button type="button" class="btn ghost sm" data-acc="prot" data-v="${e.prot}">Usar ${e.prot} g como meta de proteína${+s.prot.goal===e.prot?" ✓":""}</button>`:""}</div><p class="hint">Son estimaciones; acéptalas como meta o ignóralas.</p>`:""}
    <h4 class="sub">Pesaje semanal (opcional)</h4>
    <div class="row"><label class="field inl">Peso (kg)<input type="number" class="num" id="en-w-kg" step="0.1" min="0" inputmode="decimal" value="${esc(b.weight||"")}"></label><label class="field inl">Fecha<input type="date" id="en-w-d" value="${today()}" max="${today()}"></label><button type="button" class="btn" id="en-w-add">Registrar pesaje</button></div>
    ${enChart(ws)}${ws.length?`<ul class="intk">${ws.slice().reverse().slice(0,6).map(x=>`<li><span class="muted">${esc(pretty(x.d))}</span><b class="num">${esc(x.kg)} kg</b><button type="button" class="popx sm" data-wrm="${esc(x.d)}" aria-label="Borrar pesaje del ${esc(pretty(x.d))}">×</button></li>`).join("")}</ul>`:""}`}
/* ---------- programa y editor ---------- */
const EN_RANGE=n=>Array.from({length:n},(_,i)=>i+1);
function enEdHTML(){if(!ED)return"";const opt=(arr,v)=>arr.map(x=>`<option value="${x}"${+v===x?" selected":""}>${x}</option>`).join("");
  return ED.sessions.map((s,si)=>`<div class="edses" data-si="${si}"><div class="row"><label class="field grow">Sesión<input type="text" data-ed="name" value="${esc(s.name)}"></label><label class="field">Día de referencia<select data-ed="cal"><option value="-1">Sin día</option>${EN_DOW.map((d,i)=>`<option value="${i}"${ED.cal[s.id]===i?" selected":""}>${d}</option>`).join("")}</select></label></div>
    ${s.ex.map((e,ei)=>`<div class="edex" data-ei="${ei}"><div class="edrow"><label class="field grow">Ejercicio<input type="text" data-ex="n" value="${esc(e.n)}"></label><label class="field">Tipo<select data-ex="t"><option value="P"${e.t==="P"?" selected":""}>Pesado [P]</option><option value="A"${e.t==="A"?" selected":""}>Aislamiento [A]</option></select></label><label class="field">Series<select data-ex="s">${opt(EN_RANGE(8),e.s)}</select></label><label class="field">Reps mín.<select data-ex="lo">${opt(EN_RANGE(30),e.lo)}</select></label><label class="field">Reps máx.<select data-ex="hi">${opt(EN_RANGE(30),e.hi)}</select></label></div>
      <div class="edrow"><label class="field grow">Alternativa (variante)<input type="text" data-ex="alt" value="${esc(e.alt||"")}" placeholder="Opcional"></label><label class="chk"><input type="checkbox" data-ex="pl"${e.pl?" checked":""}> Por pierna</label><label class="chk"><input type="checkbox" data-ex="ns"${e.ns?" checked":""}> No saltar</label><label class="chk"><input type="checkbox" data-ex="sh"${e.sh?" checked":""}> Carga el hombro</label></div>
      <label class="field">Técnica<textarea rows="2" data-ex="tec">${esc(e.tec||"")}</textarea></label>
      <div class="row"><button type="button" class="btn ghost sm" data-mv="-1"${ei?"":" disabled"} aria-label="Subir ejercicio">↑</button><button type="button" class="btn ghost sm" data-mv="1"${ei<s.ex.length-1?"":" disabled"} aria-label="Bajar ejercicio">↓</button><button type="button" class="btn ghost sm danger" data-exdel>Quitar</button></div></div>`).join("")}
    <button type="button" class="btn ghost sm" data-exadd>+ Agregar ejercicio</button></div>`).join("")}
function enProgHTML(){const p=enPlan(),r=p.rest||{P:[120,180],A:[60,120]};
  const f=(id,l,v,ex)=>`<label class="field">${l}<input type="text" id="en-p-${id}" value="${esc(v)}" ${ex||""}></label>`;
  return `<div class="grid2">${f("program","Programa",p.program)}${f("start","Inicio",p.startLabel)}${f("level","Nivel",p.level)}${f("shoulder","Hombro",p.shoulder)}${f("prio","Prioridades (separadas por coma)",(p.priorities||[]).join(", "))}${f("warm","Calentamiento",p.warmup)}</div>
    <div class="bgrid"><label class="field">Bloque<select id="en-p-block">${"ABCDEF".split("").map(x=>`<option${p.block===x?" selected":""}>${x}</option>`).join("")}</select></label><label class="field">Semanas por bloque<select id="en-p-bw">${EN_RANGE(16).map(x=>`<option${(p.blockWeeks||8)===x?" selected":""}>${x}</option>`).join("")}</select></label><label class="field">Semanas de readaptación<select id="en-p-ra">${[0,1,2,3,4].map(x=>`<option${(p.readapt||0)===x?" selected":""}>${x}</option>`).join("")}</select></label>
      <label class="field">Descanso pesado (min)<select id="en-p-rp">${[[60,120],[90,150],[120,180],[150,240],[180,300]].map(x=>`<option value="${x.join("-")}"${r.P[0]===x[0]?" selected":""}>${x[0]/60}-${x[1]/60}</option>`).join("")}</select></label><label class="field">Descanso aislamiento (min)<select id="en-p-ra2">${[[45,90],[60,120],[90,150]].map(x=>`<option value="${x.join("-")}"${r.A[0]===x[0]?" selected":""}>${x[0]/60}-${x[1]/60}</option>`).join("")}</select></label></div>
    <p class="hint">${T(p.rules.prog)}</p>
    <div class="row"><button type="button" class="btn" id="en-p-save">Guardar programa</button><span class="savestate" id="en-p-st"></span></div>
    <h4 class="sub">Ejercicios</h4>
    ${ED?`${EN_EDMSG?`<p class="hint" role="status">${T(EN_EDMSG)}</p>`:""}<div id="en-ed" class="stack">${enEdHTML()}</div><div class="row"><button type="button" class="btn primary" id="en-ed-save">Guardar plan</button><button type="button" class="btn ghost" id="en-ed-cancel">Cancelar</button></div>`:`<div class="row"><button type="button" class="btn" id="en-ed-open">Editar ejercicios</button></div>`}
    <details class="paste" data-d="paste"><summary>Pegar lista</summary><p class="hint">Un encabezado por sesión y una línea por ejercicio: «- Ejercicio [P] 3×6-8 (alternativa) — técnica». Agrega «por pierna» después del rango si aplica. Se carga en el editor para que lo revises antes de guardar; el historial se conserva para los ejercicios con el mismo nombre.</p><textarea id="en-paste" rows="8" placeholder="UPPER A – Fuerza&#10;- Press inclinado con mancuernas [P] 3×6-8 — técnica"></textarea><div class="row"><button type="button" class="btn" id="en-paste-go">Cargar en el editor</button></div></details>`}
function renderEntreno(){const root=$("en-root");if(!root)return;
  if(!EN.loaded||!enPlan()){root.innerHTML=`<div class="empty">${db?"Preparando tu plan de entrenamiento…":"Abre el centro de mando con tu sesión de Claude iniciada para ver tu entrenamiento."}</div>`;root.__built=false;return}
  if(!root.__built){root.innerHTML=`<div class="card stack" id="en-head"></div><div class="stack" id="en-sess"></div><div class="grid2 engrid"><div class="stack"><div class="card stack" id="en-cre"></div><div class="card stack" id="en-prot"></div></div><div class="card stack" id="en-water"></div></div><div class="card stack" id="en-body"></div>
    <section class="card fold" id="en-progf"><h3 class="fold-hh"><button type="button" class="fold-h" data-fold="__prog" aria-expanded="false"><span class="fold-n">Programa y ejercicios</span><span class="fold-s" id="en-prog-s"></span></button></h3><div class="fold-b stack" id="en-prog" hidden></div></section>`;root.__built=true}
  enSet($("en-head"),enHeadHTML());enSet($("en-sess"),enSessHTML());enSet($("en-cre"),enCreHTML());enSet($("en-water"),enIntakeHTML("water"));enSet($("en-prot"),enProtHTML());enSet($("en-body"),enBodyHTML());
  const p=enPlan(),po=!!ENF.__prog;$("en-prog-s").textContent=p.program+" · "+p.sessions.length+" sesiones · "+p.sessions.reduce((a,s)=>a+s.ex.length,0)+" ejercicios";
  const pf=$("en-progf").querySelector(".fold-h");pf.setAttribute("aria-expanded",String(po));$("en-prog").hidden=!po;if(po)enSet($("en-prog"),enProgHTML())}
/* ---------- acciones ---------- */
function enNewWorkout(){const nx=enNext(),wi=enWeekInfo(),vs={};nx.ex.forEach(e=>{if(VSEL[e.id])vs[e.id]=VSEL[e.id]});
  const id=enId("w-");const w={sid:nx.id,sname:nx.name,n:wi.n,week:wi.week,phase:wi.phase,block:enPlan().block,date:today(),started:nowISO(),done:false,sets:{},pain:{sh:false,note:""},vsel:vs};return{id,w}}
function enSaveW(id,w){const o=Object.assign({},w);delete o.id;return enPut(id,o)}
function enAddSet(exId,side,wv,rv){let o=enOpen(),id;if(o){id=o.id}else{const n=enNewWorkout();id=n.id;o=n.w}
  const e=(enSess(o.sid)||{ex:[]}).ex.find(x=>x.id===exId);if(!e)return;const v=e.alt?((o.vsel&&o.vsel[exId])||VSEL[exId]||"m"):"m";
  o.sets=o.sets||{};(o.sets[exId]=o.sets[exId]||[]).push({v,w:+wv||0,r:+rv||0,side:side||"",at:nowISO()});enSaveW(id,o);
  Object.keys(EDR).forEach(k=>{if(k.startsWith(exId+"|"))delete EDR[k]});enRest(e);renderEntreno()}
/* temporizador de descanso: [P] 2-3 min, [A] 1-2 min, con aviso al terminar */
let EN_T=null,EN_TI=0;
function enBeep(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C(),o=c.createOscillator(),g=c.createGain();o.frequency.value=880;o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.18,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.6);o.start();o.stop(c.currentTime+.62)}catch(e){}try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}}
function enRest(e){const r=((enPlan()||{}).rest||{})[e.t]||(e.t==="P"?[120,180]:[60,120]);EN_T={name:e.n,min:r[0],max:r[1],end:Date.now()+r[0]*1000,start:Date.now(),done:false};clearInterval(EN_TI);EN_TI=setInterval(enTick,250);enTick()}
const mmss=s=>Math.floor(s/60)+":"+pad(Math.floor(s%60));
function enTick(){const b=$("en-timer");if(!b)return;if(!EN_T){b.hidden=true;clearInterval(EN_TI);return}const left=Math.max(0,(EN_T.end-Date.now())/1000),el=(Date.now()-EN_T.start)/1000;
  if(left<=0&&!EN_T.done){EN_T.done=true;enBeep();toast("Descanso listo: siguiente serie de "+EN_T.name)}
  if(EN_T.done&&el>EN_T.max+30){EN_T=null;b.hidden=true;clearInterval(EN_TI);return}
  b.hidden=false;b.classList.toggle("done",EN_T.done);
  const h=`<span class="tl">${EN_T.done?"Descanso listo":"Descanso"}</span><b class="num">${EN_T.done?mmss(el):mmss(left)}</b><span class="tn">${T(EN_T.done?"Puedes extender hasta "+mmss(EN_T.max)+" · "+EN_T.name:EN_T.name+" · "+mmss(EN_T.min)+"-"+mmss(EN_T.max))}</span><button type="button" class="btn sm" data-tm="30">+30 s</button><button type="button" class="btn ghost sm" data-tm="x">${EN_T.done?"Cerrar":"Saltar"}</button>`;
  if(b.__h!==h){b.innerHTML=h;b.__h=h}}
$("en-timer").addEventListener("click",e=>{const x=e.target.closest("button[data-tm]");if(!x||!EN_T)return;if(x.dataset.tm==="x"){EN_T=null;enTick();return}EN_T.end=Math.max(EN_T.end,Date.now())+30000;EN_T.done=false;enTick()});
function enMarkHabit(day){const h=cfg().habits.find(x=>/ejercicio|gym|entren/i.test(x.name));if(!h)return "";const d=JSON.parse(JSON.stringify(dayData(day)));delete d.id;
  d.date=day;d.habits=Object.assign({},d.habits||{},{[h.id]:true});d.updated=nowISO();S.days[day]=d;save("days/"+day,d);return h.name}
function enFinish(){const o=enOpen();if(!o)return;const id=o.id,w=Object.assign({},o);w.done=true;w.finished=nowISO();w.date=today();enSaveW(id,w);
  const hn=enMarkHabit(today());EN_T=null;enTick();ENF[o.sid]=false;
  const st=enStreak();toast("Sesión completa: "+o.sname+(hn?" · «"+hn+"» marcado en Hoy":" · no encontré un hábito «Ejercicio» en tu Perfil")+" · racha "+st.cur+" días");
  try{const a=SC.agents.habitos;if(a){bubble(a,"¡Trabajo cumplido! "+o.sname+". Racha: "+st.cur+" días.",4200);a.emote={k:"♥",until:performance.now()+2500}}}catch(e){}
  renderAll()}
function enIntakeAdd(k,v){v=Math.round(+v||0);if(v<=0){toast("Escribe una cantidad mayor que cero.");return}const s=enSupl(),o=s[k],t=today();const d=o.days[t]||{g:o.goal,e:[]};d.g=+o.goal||d.g||0;d.e=(d.e||[]).concat([{v,at:nowISO()}]);o.days=Object.assign({},o.days,{[t]:d});s[k]=o;enPut("supl",s);renderEntreno()}
function enSuplSave(fn){const s=enSupl();fn(s);enPut("supl",s);renderEntreno()}
/* clicks */
$("p-entreno").addEventListener("click",e=>{const B=sel=>e.target.closest(sel);let b;
  if(b=B("button[data-fold]")){const k=b.dataset.fold,cur=b.getAttribute("aria-expanded")==="true";ENF[k]=!cur;$("en-sess").__h=null;renderEntreno();return}
  if(b=B("button[data-step]")){const row=b.closest(".srow"),inp=row.querySelector('input[data-f="'+b.dataset.step+'"]'),st=b.dataset.step==="w"?(row.closest(".enex")&&enFindEx(row.closest(".enex").dataset.ex).t==="P"?2.5:1):1;
    let v=(+inp.value||0)+st*(+b.dataset.d);v=Math.max(0,Math.round(v*2)/2);inp.value=v;const k=row.dataset.k,cur=EDR[k]||{w:row.querySelector('input[data-f="w"]').value,r:row.querySelector('input[data-f="r"]').value};cur[b.dataset.step]=v;EDR[k]=cur;return}
  if(b=B("button[data-ok]")){const row=b.closest(".srow"),w=row.querySelector('input[data-f="w"]').value,r=row.querySelector('input[data-f="r"]').value;if(!(+r>0)){toast("Anota cuántas repeticiones hiciste.");return}enAddSet(b.dataset.ok,b.dataset.side,w,r);return}
  if(b=B("button[data-rep]")){const e2=enFindEx(b.dataset.rep),o=enOpen(),v=e2.alt?enVar(e2):"m";if(!o)return;const all=(o.sets[e2.id]||[]).filter(x=>x.v===v);const last=all[all.length-1];if(!last)return;
    let side=last.side||"";if(e2.pl){const nI=enCurSets(e2,v,"izq").length,nD=enCurSets(e2,v,"der").length;side=nI<=nD?"izq":"der";const ref=all.filter(x=>x.side===side).slice(-1)[0];if(ref){enAddSet(e2.id,side,ref.w,ref.r);return}}
    if(enCurSets(e2,v,side).length>=enSetsFor(e2,enWeekInfo().phase)){toast("Ya completaste las series de este ejercicio.");return}enAddSet(e2.id,side,last.w,last.r);return}
  if(b=B("button[data-undo]")){const o=enOpen();if(!o)return;const w=Object.assign({},o),l=(w.sets[b.dataset.undo]||[]).slice();l.splice(+b.dataset.ix,1);w.sets=Object.assign({},w.sets,{[b.dataset.undo]:l});enSaveW(o.id,w);renderEntreno();return}
  if(b=B("button[data-var]")){const id=b.dataset.e,o=enOpen();VSEL[id]=b.dataset.var;if(o){const w=Object.assign({},o);w.vsel=Object.assign({},w.vsel||{},{[id]:b.dataset.var});enSaveW(o.id,w)}renderEntreno();return}
  if(b=B("button[data-use]")){const ex=b.closest(".enex");ex.querySelectorAll(".srow[data-k]").forEach(r=>{const i=r.querySelector('input[data-f="w"]');i.value=b.dataset.w;EDR[r.dataset.k]={w:+b.dataset.w,r:+r.querySelector('input[data-f="r"]').value||0}});toast("Peso sugerido en las series pendientes");return}
  if(b=B("#en-finish")){enFinish();return}
  if(b=B("#en-discard")){if(b.dataset.sure!=="1"){b.dataset.sure="1";b.textContent="¿Seguro? Toca otra vez";setTimeout(()=>{if(document.body.contains(b)){b.dataset.sure="";b.textContent="Descartar sesión"}},4000);return}const o=enOpen();if(o){del("entreno/"+o.id);delete EN.docs[o.id];EN_T=null;enTick();toast("Sesión descartada");renderEntreno()}return}
  if(b=B("button[data-deload]")){const p=JSON.parse(JSON.stringify(enPlan())),wi=enWeekInfo();p.deload=b.dataset.deload==="on"?{state:"on",week:wi.ord===1&&!enOpen()?wi.week:wi.week+1,at:today()}:{state:"no",at:today()};enPut("plan",p);toast(b.dataset.deload==="on"?"Descarga programada para la semana "+p.deload.week:"Heracles lo vuelve a revisar en 7 días");renderEntreno();return}
  if(b=B("#en-newblock")){const p=JSON.parse(JSON.stringify(enPlan()));p.block=String.fromCharCode((p.block||"A").charCodeAt(0)+1);p.base=enDone().length;p.deload=null;enPut("plan",p);toast("Bloque "+p.block+": semana 1");renderEntreno();return}
  if(b=B("button[data-cw]")){EN_CW=Math.min(0,EN_CW+(+b.dataset.cw));renderEntreno();return}
  if(b=B("button[data-add]")){enIntakeAdd(b.dataset.add,b.dataset.v);return}
  if(b=B("button[data-addfree]")){const i=$("en-free-"+b.dataset.addfree);enIntakeAdd(b.dataset.addfree,i.value);i.value="";return}
  if(b=B("button[data-rm]")){const k=b.dataset.rm;enSuplSave(s=>{const t=today(),d=Object.assign({},s[k].days[t]);d.e=(d.e||[]).slice();d.e.splice(+b.dataset.i,1);s[k].days=Object.assign({},s[k].days,{[t]:d})});return}
  if(b=B("button[data-goal]")){const k=b.dataset.goal,v=Math.round(+$("en-goal-"+k).value||0);enSuplSave(s=>{s[k].goal=v;const t=today();if(s[k].days[t])s[k].days=Object.assign({},s[k].days,{[t]:Object.assign({},s[k].days[t],{g:v})})});toast("Meta guardada: "+v.toLocaleString("es-MX")+(k==="water"?" ml":" g"));return}
  if(b=B("button[data-acc]")){const k=b.dataset.acc,v=+b.dataset.v;enSuplSave(s=>{s[k].goal=v;const t=today();if(s[k].days[t])s[k].days=Object.assign({},s[k].days,{[t]:Object.assign({},s[k].days[t],{g:v})})});toast(k==="water"?"Meta de agua: "+v.toLocaleString("es-MX")+" ml":"Meta de proteína: "+v+" g"+(enSupl().prot.on?"":" (actívala para registrar)"));return}
  if(b=B("#en-b-save")){const g=id=>$("en-b-"+id).value.trim(),bd=enBody();Object.assign(bd,{weight:g("weight")?+g("weight"):"",height:g("height")?+g("height"):"",age:g("age")?+g("age"):"",sex:$("en-b-sex").value,waist:g("waist")?+g("waist"):"",fat:g("fat")?+g("fat"):""});
    enPut("body",bd);$("en-b-st").textContent="Guardado";renderEntreno();return}
  if(b=B("#en-w-add")){const kg=+$("en-w-kg").value,d=$("en-w-d").value||today();if(!(kg>0)){toast("Escribe tu peso en kg.");return}const bd=enBody();bd.w=(bd.w||[]).filter(x=>x.d!==d).concat([{d,kg}]).sort((a,c)=>a.d.localeCompare(c.d));
    if(d>=(bd.w.map(x=>x.d).filter(x=>x!==d).sort().slice(-1)[0]||""))bd.weight=kg;enPut("body",bd);toast("Pesaje registrado: "+kg+" kg");renderEntreno();return}
  if(b=B("button[data-wrm]")){const bd=enBody();bd.w=(bd.w||[]).filter(x=>x.d!==b.dataset.wrm);enPut("body",bd);renderEntreno();return}
  if(b=B("#en-p-save")){const p=JSON.parse(JSON.stringify(enPlan())),g=id=>$("en-p-"+id).value.trim(),rr=v=>v.split("-").map(Number);
    Object.assign(p,{program:g("program")||p.program,startLabel:g("start"),level:g("level"),shoulder:g("shoulder"),priorities:g("prio").split(",").map(x=>x.trim()).filter(Boolean),warmup:g("warm")||p.warmup,block:$("en-p-block").value,blockWeeks:+$("en-p-bw").value,readapt:+$("en-p-ra").value,rest:{P:rr($("en-p-rp").value),A:rr($("en-p-ra2").value)}});
    enPut("plan",p);$("en-p-st").textContent="Guardado";$("en-prog").__h=null;renderEntreno();return}
  if(b=B("#en-ed-open")){const p=enPlan();ED={sessions:JSON.parse(JSON.stringify(p.sessions)),cal:Object.assign({},p.cal)};EN_EDMSG="";$("en-prog").__h=null;renderEntreno();return}
  if(b=B("#en-ed-cancel")){ED=null;EN_EDMSG="";$("en-prog").__h=null;renderEntreno();return}
  if(b=B("#en-ed-save")){enEdSave();return}
  if(b=B("#en-paste-go")){const txt=$("en-paste").value,base=ED?ED.sessions:enPlan().sessions,ss=enParse(txt,base);if(!ss.length){toast("No reconocí ejercicios. Usa el formato «- Ejercicio [P] 3×6-8 — técnica».");return}
    const cal={},pc=enPlan().cal||{},def=[0,1,3,5];ss.forEach((s,i)=>{cal[s.id]=pc[s.id]!=null?pc[s.id]:def[i]!=null?def[i]:-1});ED={sessions:ss,cal};
    EN_EDMSG="Plan cargado: "+ss.length+" sesiones y "+ss.reduce((a,s)=>a+s.ex.length,0)+" ejercicios. Revísalo y pulsa «Guardar plan».";$("en-paste").value="";$("en-prog").__h=null;renderEntreno();return}
  const ex=B(".edex"),se=B(".edses");
  if(ED&&se&&(b=B("button[data-exadd]"))){ED.sessions[+se.dataset.si].ex.push({id:enId("e"),n:"Nuevo ejercicio",t:"A",s:2,lo:8,hi:12,alt:"",tec:"",pl:false,ns:false,sh:false});enEdRender();return}
  if(ED&&ex&&(b=B("button[data-mv]"))){const L=ED.sessions[+se.dataset.si].ex,i=+ex.dataset.ei,j=i+(+b.dataset.mv);if(j<0||j>=L.length)return;[L[i],L[j]]=[L[j],L[i]];enEdRender();return}
  if(ED&&ex&&(b=B("button[data-exdel]"))){ED.sessions[+se.dataset.si].ex.splice(+ex.dataset.ei,1);enEdRender();return}});
function enFindEx(id){const p=enPlan();for(const s of p.sessions)for(const e of s.ex)if(e.id===id)return e;return{id,t:"A",ex:[]}}
function enEdRender(){const el=$("en-ed");if(el){el.innerHTML=enEdHTML()}$("en-prog").__h=null}
function enEdSave(){if(!ED)return;const bad=[];ED.sessions.forEach(s=>{if(!s.name.trim())bad.push("una sesión sin nombre");s.ex.forEach(e=>{if(!e.n.trim())bad.push("un ejercicio sin nombre en "+s.name);if(e.lo>e.hi){const t=e.lo;e.lo=e.hi;e.hi=t}})});
  if(bad.length){toast("Revisa: "+bad[0]);return}if(!ED.sessions.some(s=>s.ex.length)){toast("El plan necesita al menos un ejercicio.");return}
  const p=JSON.parse(JSON.stringify(enPlan()));p.sessions=ED.sessions.filter(s=>s.ex.length);p.cal={};p.sessions.forEach(s=>{if(ED.cal[s.id]!=null&&ED.cal[s.id]>=0)p.cal[s.id]=ED.cal[s.id]});
  enPut("plan",p);ED=null;EN_EDMSG="";$("en-prog").__h=null;toast("Plan guardado: "+p.sessions.length+" sesiones");renderEntreno()}
$("p-entreno").addEventListener("input",e=>{const t=e.target;
  if(t.matches(".srow input[data-f]")){const row=t.closest(".srow");EDR[row.dataset.k]={w:row.querySelector('input[data-f="w"]').value,r:row.querySelector('input[data-f="r"]').value};return}
  if(ED&&t.closest(".edses")){const se=t.closest(".edses"),s=ED.sessions[+se.dataset.si],ex=t.closest(".edex");
    if(!ex){if(t.dataset.ed==="name")s.name=t.value;if(t.dataset.ed==="cal")ED.cal[s.id]=+t.value;return}
    const e=s.ex[+ex.dataset.ei],k=t.dataset.ex;if(!k)return;e[k]=t.type==="checkbox"?t.checked:/^(s|lo|hi)$/.test(k)?+t.value:k==="t"?t.value:t.value}});
$("p-entreno").addEventListener("change",e=>{const t=e.target;
  if(t.matches("input[data-cre]")){const d=t.dataset.cre,on=t.checked;enSuplSave(s=>{if(on)s.cre[d]=true;else delete s.cre[d];if(on&&(!s.creStart||d<s.creStart))s.creStart=d});return}
  if(t.id==="en-prot-on"){enSuplSave(s=>{s.prot.on=t.checked});return}
  if(t.matches("input[data-edit]")){const k=t.dataset.edit,v=Math.max(0,Math.round(+t.value||0));enSuplSave(s=>{const td=today(),d=Object.assign({},s[k].days[td]);d.e=(d.e||[]).slice();if(!d.e[+t.dataset.i])return;d.e[+t.dataset.i]=Object.assign({},d.e[+t.dataset.i],{v});if(!v)d.e.splice(+t.dataset.i,1);s[k].days=Object.assign({},s[k].days,{[td]:d})});t.blur();return}
  if(t.id==="en-sh"||t.id==="en-shn"){const o=enOpen(),sh=$("en-sh").checked,note=$("en-shn")?$("en-shn").value.trim():"";
    if(!o){const n=enNewWorkout();n.w.pain={sh,note};enSaveW(n.id,n.w)}else{const w=Object.assign({},o);w.pain={sh,note};enSaveW(o.id,w)}
    if(t.id==="en-sh"&&sh)toast("Anotado. Heracles bajará la carga en empujes y jalones: nunca entrenes con dolor.");renderEntreno();return}});
$("p-entreno").addEventListener("keydown",e=>{if(e.key!=="Enter")return;const t=e.target;if(t.id==="en-free-water"||t.id==="en-free-prot"){e.preventDefault();const k=t.id.slice(8);enIntakeAdd(k,t.value);t.value=""}
  if(t.matches(".srow input[data-f]")){e.preventDefault();const ok=t.closest(".srow").querySelector("button[data-ok]");if(ok)ok.click()}});
/* Heracles vigila la racha: avisa una vez al día cuando entra en riesgo */
function enWatch(){if(!EN.loaded||!enPlan())return;const st=enStreak();if(st.state!=="riesgo"&&st.state!=="ultimo")return;const k="kasanov:enwarn:v1",v=today()+"|"+st.state;
  try{if(localStorage.getItem(k)===v)return;localStorage.setItem(k,v)}catch(e){return}const nx=enNext(),msg=st.state==="ultimo"?"¡Último día! Si no entrenas hoy pierdes tu racha de "+st.cur+" días. Toca "+(nx?nx.name:"tu sesión")+".":"Racha de "+st.cur+" días en riesgo: si no entrenas hoy ni mañana, la pierdes. Toca "+(nx?nx.name:"tu sesión")+".";
  setTimeout(()=>{try{const a=SC.agents.habitos;if(a){bubble(a,msg,6500);a.emote={k:"!",until:performance.now()+3000}}}catch(e){}toast("Heracles: "+msg)},2500)}
/* =================== PERSONAL: HOY =================== */
/* Dos secciones desplegables: Actividades del día y Bitácora. Lo que cambias es un borrador en memoria
   hasta que pulsas Guardar; entonces se escriben los mismos campos de siempre en days/{fecha}. */
const LOGF=LF.map(([f])=>[f,"d-"+f]);
const DR={},OPEN={},SAVING={},ERR={};
let SV={};try{SV=JSON.parse(localStorage.getItem("hoy-sv")||"{}")||{}}catch(e){SV={}}
const svKey=(k,day)=>day+"|"+k;
function svSet(k,day,iso){SV[svKey(k,day)]=iso;try{const ks=Object.keys(SV).sort();while(ks.length>80)delete SV[ks.shift()];localStorage.setItem("hoy-sv",JSON.stringify(SV))}catch(e){}}
const clock=iso=>{const t=iso?new Date(iso):null;return t&&!isNaN(t)?pad(t.getHours())+":"+pad(t.getMinutes()):""};
const drOf=day=>DR[day]||(DR[day]={habits:{},bonus:{},log:{},moved:{}});
const CM={},WARN={};
function pruneDraft(day){const dr=DR[day];if(!dr)return;const d=dayData(day);
  for(const m of ["habits","bonus"])for(const id in dr[m])if(dr[m][id]===!!(d[m]&&d[m][id]))delete dr[m][id];
  if(dr.min&&dr.min.v===(d.studyMin||0))delete dr.min;
  if(dr.energy&&dr.energy.v===(d.energy||null))delete dr.energy;
  const lg=logOf(d);for(const f in dr.log){const base=f[0]==="@"?(lg.tags[f.slice(1)]||""):lg[f];if(dr.log[f].v===String(base||""))delete dr.log[f]}
  if(!Object.keys(dr.log).length)dr.moved={}}
const actDirty=day=>{const dr=DR[day];return !!dr&&(Object.keys(dr.habits).length+Object.keys(dr.bonus).length>0||!!dr.min||!!dr.energy)};
const logDirty=day=>{const dr=DR[day];return !!dr&&Object.keys(dr.log).length>0};
function effLog(day){const lg=logOf(dayData(day)),dr=DR[day];if(dr)for(const f in dr.log){if(f[0]==="@")lg.tags[f.slice(1)]=dr.log[f].v;else lg[f]=dr.log[f].v}return lg}
const movedIds=()=>{const o={};for(const day in DR)Object.assign(o,DR[day].moved||{});return o};
const openNotes=()=>{const mv=movedIds();return S.inbox.filter(n=>n.state==="open"&&!mv[n.id]).sort((a,b)=>String(a.created||"").localeCompare(String(b.created||"")))};
const anyDirty=()=>Object.keys(DR).some(day=>actDirty(day)||logDirty(day));
function effDay(day){const d=dayData(day),dr=DR[day];if(!dr)return d;
  const e=Object.assign({},d,{habits:Object.assign({},d.habits),bonus:Object.assign({},d.bonus)});
  for(const m of ["habits","bonus"])for(const id in dr[m]){if(dr[m][id])e[m][id]=true;else delete e[m][id]}
  if(dr.min)e.studyMin=dr.min.v;if(dr.energy)e.energy=dr.energy.v;return e}
const hasAct=d=>Object.values(d.habits||{}).some(Boolean)||Object.values(d.bonus||{}).some(Boolean)||(d.studyMin||0)>0||!!d.energy;
const hasLog=d=>hasLogText(d)||logOf(d).closed;
const isSaved=(k,day)=>{const d=dayData(day);return (k==="act"?hasAct(d):hasLog(d))||!!SV[svKey(k,day)]};
const isOpen=(k,day)=>{const o=OPEN[day]&&OPEN[day][k];return o!==undefined?o:((k==="act"?actDirty(day):logDirty(day))||!isSaved(k,day))};
const setOpen=(k,day,v)=>{(OPEN[day]||(OPEN[day]={}))[k]=v};
function actLine(d){const c=cfg();const hn=c.habits.filter(h=>d.habits&&d.habits[h.id]).length,bn=c.bonus.filter(h=>d.bonus&&d.bonus[h.id]).length;
  return [hn+"/"+c.habits.length+" hábitos",bn?bn+" bonus":"",(d.studyMin||0)+" min",d.energy?"energía "+d.energy:""].filter(Boolean).join(" · ")}
function firstWords(t,n){let o="";for(const w of t.split(" ")){const x=o?o+" "+w:w;if(x.length>n)break;o=x}return o?o+(o.length<t.length?"…":""):short(t,n)}
function logLine(d){const l=logOf(d),w=t=>firstWords(String(t).replace(/\s+/g," ").trim(),70);
  if(l.closed&&l.siguiente.trim())return "siguiente «"+w(l.siguiente)+"»";
  for(const [f] of LF){if(l[f].trim())return "«"+w(l[f])+"»"}return "sin texto"}
function setHTML(el,html){if(el.__h===html)return;const a=document.activeElement;let sel="";
  if(a&&el.contains(a)){const k=a.dataset.h!==undefined?"h":a.dataset.b!==undefined?"b":a.dataset.e!==undefined?"e":"";if(k)sel="[data-"+k+'="'+(window.CSS&&CSS.escape?CSS.escape(a.dataset[k]):a.dataset[k])+'"]'}
  el.innerHTML=html;el.__h=html;if(sel){const n=el.querySelector(sel);if(n)n.focus()}}
function renderFold(k){
  const day=cur,d=dayData(day),dirty=k==="act"?actDirty(day):logDirty(day),open=isOpen(k,day),key=k+day;
  const root=$("f-"+k),btn=$("f-"+k+"-save");let line;
  if(dirty)line="● Cambios sin guardar";
  else if(isSaved(k,day)){const cl=k==="log"&&logOf(d).closed;const t=clock(cl?(d.closedAt||d.updated):(SV[svKey(k,day)]||d.updated));line=(cl?"✓ Día cerrado":"✓ Guardado")+(t?" "+t:"")+" · "+(k==="act"?actLine(d):logLine(d))}
  else line="Sin registrar todavía";
  $("f-"+k+"-s").textContent=mm(line);
  root.classList.toggle("dirty",dirty);root.classList.toggle("done",!dirty&&isSaved(k,day));$("f-"+k+"-h").setAttribute("aria-expanded",String(open));$("f-"+k+"-b").hidden=!open;
  btn.disabled=!dirty||!!SAVING[key];btn.className="btn"+(dirty?" primary":"");btn.textContent=SAVING[key]?"Guardando…":"Guardar";
  $("f-"+k+"-st").textContent=ERR[key]?"No se pudo guardar. Revisa tu conexión y vuelve a intentar.":"";
  if(k==="log"){const cl=logOf(d).closed,cb=$("f-log-close"),lg=effLog(day),cm=CM[day];
    cb.textContent=cl&&!dirty?"Reabrir el día":"Cerrar el día";cb.disabled=!!SAVING[key];cb.className="btn"+(!cl&&lg.siguiente.trim()?" primary":"");
    const m=$("f-log-cm");m.textContent=cm?cm.t:"";m.classList.toggle("bad",!!(cm&&cm.bad))}}
function renderHoy(){
  pruneDraft(cur);
  const c=cfg(),e=effDay(cur),sc=score(cur,e);
  $("d-label").textContent=cur===today()?"Hoy · "+pretty(cur):pretty(cur);$("d-next").disabled=cur>=today();
  $("d-points").textContent=sc.pts;$("d-min").textContent="/ "+sc.min+" mínimo · semana "+(weekIndex(cur)+1);
  const st=$("d-status");st.className="chip "+(sc.met?"ok":sc.any?"warn":"");st.textContent=sc.met?"Día cumplido":sc.pts>=sc.min&&!sc.priOk?"Falta un prioritario":sc.any?"En progreso":"Sin empezar";
  $("d-hint").textContent=actDirty(cur)?"Vista previa con tus cambios sin guardar. Los puntos cuentan al guardar.":"El día cuenta con el mínimo de puntos y al menos un hábito prioritario.";
  $("d-streak").textContent="Racha: "+streak()+" días";$("d-bonus").textContent="Bonus: "+sc.b+" ("+Math.floor(sc.b/sc.per)+" pt)";$("d-bonus-rule").textContent="· "+sc.per+" bonus = 1 punto";
  const tgt=studyTarget(cur);$("d-study-target").textContent=tgt?("Meta de estudio esta semana: "+tgt+" min/día · llevas "+(e.studyMin||0)):"";
  setHTML($("d-habits"),c.habits.length?c.habits.map(h=>`<label class="chk ${e.habits&&e.habits[h.id]?"on":""}"><input type="checkbox" data-h="${esc(h.id)}" ${e.habits&&e.habits[h.id]?"checked":""}><span>${esc(h.name)}</span>${h.priority?'<span class="tag">Prioridad</span>':""}</label>`).join(""):`<div class="empty">Tus hábitos aparecen aquí en cuanto cargue la configuración.</div>`);
  setHTML($("d-bonuses"),c.bonus.map(h=>`<label class="chk bonus ${e.bonus&&e.bonus[h.id]?"on":""}"><input type="checkbox" data-b="${esc(h.id)}" ${e.bonus&&e.bonus[h.id]?"checked":""}><span>${esc(h.name)}</span></label>`).join(""));
  setHTML($("d-energy"),[1,2,3,4,5].map(n=>`<button type="button" data-e="${n}" aria-pressed="${e.energy===n}">${n}</button>`).join(""));
  const mi=$("d-min-input");if(document.activeElement!==mi)mi.value=e.studyMin||"";
  const lg=effLog(cur),to=tagOptions();
  const og=(arr)=>arr.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join("");
  const tagHTML='<option value="">Sin etiqueta</option>'+(to.projects.length?`<optgroup label="Proyectos">${og(to.projects)}</optgroup>`:"")+(to.topics.length?`<optgroup label="Temas">${og(to.topics)}</optgroup>`:"");
  LF.forEach(([f])=>{const el=$("d-"+f),v=lg[f]||"";if(document.activeElement!==el&&el.value!==v)el.value=v;
    const sel=$("t-"+f);if(sel.__h!==tagHTML){sel.innerHTML=tagHTML;sel.__h=tagHTML}const tv=lg.tags[f]||"";if(sel.value!==tv)sel.value=tv;if(sel.value!==tv&&tv)sel.value=""});
  renderFold("act");renderFold("log");renderInbox();renderQuestOut();renderGhAsk();
}
/* Atenea pregunta en la Bitácora por los commits que no anotaste */
function renderGhAsk(){const box=$("gh-ask"),sg=cur===today()?ghSignals():null,items=sg?sg.noLog:[];box.hidden=!items.length;if(!items.length)return;
  const h=items.map(x=>`<div class="ghq"><img src="${portrait("aprendizaje")}" alt="" class="av"><div><strong>Atenea pregunta:</strong> ¿qué aprendiste en «${esc(x.proj?x.proj.title:x.name)}»? <span class="muted">Vi ${x.n7} commit${x.n7===1?"":"s"} (el último el ${esc(pretty(x.last))}) sin entrada en tu bitácora.</span></div><button type="button" class="btn" data-ghp="${esc(x.proj?x.proj.id:"")}" data-ghn="${esc(x.proj?x.proj.title:x.name)}">Anotar en Aprendí</button></div>`).join("");
  if(box.__h!==h){box.innerHTML=h;box.__h=h}}
$("gh-ask").addEventListener("click",e=>{const b=e.target.closest("button[data-ghn]");if(!b)return;const dr=drOf(cur),base=logOf(dayData(cur));
  if(b.dataset.ghp){dr.log["@aprendi"]={v:"p:"+b.dataset.ghp,b:dr.log["@aprendi"]?dr.log["@aprendi"].b:(base.tags.aprendi||"")}}
  const cv=effLog(cur).aprendi;if(!cv.trim())dr.log.aprendi={v:"En "+b.dataset.ghn+": ",b:dr.log.aprendi?dr.log.aprendi.b:base.aprendi};
  edited("log");setOpen("log",cur,true);renderHoy();const ta=$("d-aprendi");ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)});
/* resultado de la misión del día (se marca al cerrar el día) */
function renderQuestOut(){const q=S.quests[cur],box=$("qo");box.hidden=!q;if(!q)return;
  $("qo-t").innerHTML=T(q.text)+((q.steps||[]).length>1?`<ol class="qsteps">${q.steps.map((x,i)=>`<li${i===(q.step||1)-1?' class="on"':""}>${T(x)}</li>`).join("")}</ol>`:"");
  const ch=$("qo-chip");ch.textContent=q.outcome?QOUT[q.outcome]+(q.reason?" · "+QWHY[q.reason]:""):"Sin marcar";ch.className="chip "+(q.outcome==="cumplida"?"ok":q.outcome?"warn":"");
  $("qo-st").querySelectorAll("button[data-o]").forEach(b=>b.setAttribute("aria-pressed",String(q.outcome===b.dataset.o)));
  const rr=$("qo-r");rr.hidden=!q.outcome||q.outcome==="cumplida";rr.querySelectorAll("button[data-why]").forEach(b=>b.setAttribute("aria-pressed",String(q.reason===b.dataset.why)))}
$("qo").addEventListener("click",e=>{const b=e.target.closest("button[data-o],button[data-why]");if(!b)return;const day=cur;
  if(b.dataset.o)setQuestOutcome(day,b.dataset.o);else setQuestOutcome(day,undefined,b.dataset.why);
  const sel=b.dataset.o?'#qo-st button[data-o="'+b.dataset.o+'"]':'#qo-r button[data-why="'+b.dataset.why+'"]';const nb=document.querySelector(sel);if(nb&&!nb.closest("[hidden]"))nb.focus();
  const q=S.quests[day];if(b.dataset.o&&q&&q.outcome&&q.outcome!=="cumplida"&&!q.reason){const f=document.querySelector("#qo-r button[data-why]");if(f)f.focus()}});
const edited=k=>{delete ERR[k+cur];if(k==="log")delete CM[cur]};
$("d-habits").addEventListener("change",e=>{const id=e.target.dataset.h;if(!id)return;drOf(cur).habits[id]=e.target.checked;edited("act");renderHoy()});
$("d-bonuses").addEventListener("change",e=>{const id=e.target.dataset.b;if(!id)return;drOf(cur).bonus[id]=e.target.checked;edited("act");renderHoy()});
$("d-energy").addEventListener("click",e=>{const b=e.target.closest("button[data-e]");if(!b)return;const n=+b.dataset.e;drOf(cur).energy={v:(effDay(cur).energy||null)===n?null:n};edited("act");renderHoy()});
function setMin(v){const dr=drOf(cur);dr.min={v:Math.max(0,v),b:dr.min?dr.min.b:(dayData(cur).studyMin||0)};edited("act");renderHoy()}
$("d-min-input").addEventListener("input",e=>setMin(parseInt(e.target.value||"0",10)||0));
$("pomo-add").onclick=()=>setMin((effDay(cur).studyMin||0)+25);
$("pomo-add50").onclick=()=>setMin((effDay(cur).studyMin||0)+50);
LOGF.forEach(([f,id])=>$(id).addEventListener("input",e=>{const dr=drOf(cur);dr.log[f]={v:e.target.value,b:dr.log[f]?dr.log[f].b:logOf(dayData(cur))[f]};edited("log");renderHoy()}));
LF.forEach(([f])=>$("t-"+f).addEventListener("change",e=>{const dr=drOf(cur),k="@"+f;dr.log[k]={v:e.target.value,b:dr.log[k]?dr.log[k].b:(logOf(dayData(cur)).tags[f]||"")};edited("log");renderHoy()}));
["act","log"].forEach(k=>{$("f-"+k+"-h").addEventListener("click",()=>{setOpen(k,cur,!isOpen(k,cur));renderHoy()});$("f-"+k+"-save").onclick=()=>saveFold(k)});
async function saveFold(k,opt){
  opt=opt||{};const day=cur,key=k+day,dr0=DR[day],dirty=k==="act"?actDirty(day):logDirty(day);
  if(SAVING[key]||(!dirty&&!(k==="log"&&(opt.close||opt.reopen))))return;
  const dr=dr0||{habits:{},bonus:{},log:{},moved:{}};
  const d0=dayData(day);const d=Object.assign({},d0,{date:day,updated:nowISO()});delete d.id;d.habits=Object.assign({},d0.habits);d.bonus=Object.assign({},d0.bonus);
  const snap={habits:Object.assign({},dr.habits),bonus:Object.assign({},dr.bonus),min:dr.min,energy:dr.energy,log:Object.assign({},dr.log),moved:Object.assign({},dr.moved||{})};
  if(k==="act"){
    for(const m of ["habits","bonus"])for(const id in snap[m]){if(snap[m][id])d[m][id]=true;else delete d[m][id]}
    if(snap.min)d.studyMin=Math.max(0,snap.min.v+((d0.studyMin||0)-snap.min.b));
    if(snap.energy)d.energy=snap.energy.v;
  }else{
    /* Bitácora v2: cinco campos + etiquetas + cierre. Los campos viejos (learned, blocked, win, notes) se dejan intactos. */
    const base=logOf(d0),tags=Object.assign({},base.tags);d.logV=2;
    for(const [f] of LF){let out=base[f];const dd=snap.log[f];
      if(dd){const v=dd.v,b=dd.b,now=base[f];out=v;
        if(now!==b&&now.startsWith(b)){const add=now.slice(b.length).trim();if(add&&!v.includes(add))out=(v.trim()?v.replace(/\s+$/,"")+"\n":"")+add}}
      d[f]=out}
    for(const f in snap.log)if(f[0]==="@"){const v=snap.log[f].v;if(v)tags[f.slice(1)]=v;else delete tags[f.slice(1)]}
    d.tags=tags;
    if(opt.close){if(!String(d.siguiente||"").trim())return;d.closed=true;d.closedAt=nowISO()}
    if(opt.reopen){d.closed=false;delete d.closedAt}
  }
  SAVING[key]=true;delete ERR[key];renderHoy();
  const prev=S.days[day];S.days[day]=d;
  const ok=await save("days/"+day,d);delete SAVING[key];
  if(!ok){if(S.days[day]===d){if(prev)S.days[day]=prev;else delete S.days[day]}ERR[key]=true;renderHoy();return}
  svSet(k,day,d.updated);
  const cd=drOf(day);
  if(k==="act"){for(const m of ["habits","bonus"])for(const id in snap[m])if(cd[m][id]===snap[m][id])delete cd[m][id];if(cd.min===snap.min)delete cd.min;if(cd.energy===snap.energy)delete cd.energy}
  else{
    for(const f in snap.log)if(cd.log[f]===snap.log[f])delete cd.log[f];
    for(const id in snap.moved){const n=S.inbox.find(x=>x.id===id);if(cd.moved[id])delete cd.moved[id];
      if(n&&n.state==="open")setNote(n,{state:"moved",to:snap.moved[id],day,movedAt:nowISO()})}
    delete WARN[day];delete CM[day];
  }
  pruneDraft(day);
  if(k==="log"&&opt.reopen)setOpen(k,day,true);
  else if(!(k==="act"?actDirty(day):logDirty(day)))setOpen(k,day,false);
  renderHoy();
  if(k==="log"&&opt.close)toast(openNotes().length?"Día cerrado. Lo que sigue en la Bandeja pasa a mañana.":"Día cerrado. Nos vemos mañana.");
  const a=document.activeElement;if(day===cur&&(!a||a===document.body||$("f-"+k).contains(a)))$("f-"+k+"-h").focus();
}
/* Bandeja: las notas rápidas viven en inbox/{id} con state open | moved | discarded. Nada se borra. */
function setNote(n,patch){Object.assign(n,patch);const o=Object.assign({},n);delete o.id;save("inbox/"+n.id,o)}
function renderInbox(){
  const all=S.inbox.filter(x=>x.state==="open").length,ns=openNotes();
  const bg=$("qn-badge");bg.hidden=!all;bg.textContent=all>99?"99+":String(all);
  $("qn-fab").setAttribute("aria-label","Nota rápida"+(all?" ("+all+(all===1?" nota":" notas")+" en la Bandeja)":""));
  const box=$("inbox");box.hidden=!ns.length;if(!ns.length)return;
  $("inbox-n").textContent=ns.length+(ns.length===1?" nota":" notas");
  const btns=LF.map(([f,l])=>`<button type="button" class="btn imv" data-mv="${f}">${l}</button>`).join("");
  setHTML($("inbox-list"),ns.map(n=>{const t=clock(n.created),when=(n.day&&n.day!==cur?pretty(n.day)+(t?" · ":""):"")+t;
    return `<div class="inote" data-id="${esc(n.id)}"><div class="itxt">${T(n.text)}</div>${when?`<div class="imeta">${esc(when)}</div>`:""}<div class="imvs" role="group" aria-label="Mover esta nota a un campo"><span class="imvl">Mover a</span>${btns}<button type="button" class="btn ghost" data-dis>Descartar</button></div></div>`}).join(""));
}
$("inbox-list").addEventListener("click",e=>{
  const row=e.target.closest(".inote"),btn=e.target.closest("button");if(!row||!btn)return;
  const n=S.inbox.find(x=>x.id===row.dataset.id);if(!n)return;
  if(btn.dataset.mv){const f=btn.dataset.mv,dr=drOf(cur),now=effLog(cur)[f],t=String(n.text).trim();
    dr.log[f]={v:now.trim()?now.replace(/\s+$/,"")+"\n"+t:t,b:dr.log[f]?dr.log[f].b:logOf(dayData(cur))[f]};dr.moved[n.id]=f;
    edited("log");setOpen("log",cur,true);renderHoy();
    const nx=document.querySelector("#inbox-list .imv"),ta=$("d-"+f);(nx||ta).focus()}
  else if(btn.hasAttribute("data-dis")){setNote(n,{state:"discarded",discarded:nowISO()});renderHoy();
    toastUndo("Nota descartada.",()=>{setNote(n,{state:"open"});delete n.discarded;renderHoy()});
    const nx=document.querySelector("#inbox-list .imv");if(nx)nx.focus()}
});
$("f-log-close").onclick=()=>{
  const day=cur,d=dayData(day),lg=effLog(day);if(SAVING["log"+day])return;
  if(logOf(d).closed&&!logDirty(day)){saveFold("log",{reopen:true});return}
  if(!lg.siguiente.trim()){CM[day]={t:"Escribe «Siguiente» para cerrar el día: qué harás primero la próxima vez.",bad:1};setOpen("log",day,true);renderHoy();$("d-siguiente").focus();return}
  const q=S.quests[day];
  if(q&&(!q.outcome||(q.outcome!=="cumplida"&&!q.reason))){CM[day]={t:!q.outcome?"Marca cómo te fue con la misión del día (cumplida, parcial o no cumplida) para cerrar el día.":"Elige un motivo rápido para la misión del día y luego cierra.",bad:1};setOpen("log",day,true);renderHoy();$("qo").scrollIntoView({block:"nearest"});const f=document.querySelector(q.outcome?"#qo-r button[data-why]":"#qo-st button[data-o]");if(f)f.focus();return}
  const pend=openNotes().length;
  if(pend&&!WARN[day]){WARN[day]=true;CM[day]={t:"Tienes "+pend+(pend===1?" nota":" notas")+" en la Bandeja. Muévelas a un campo o descártalas; si cierras ahora, pasan a mañana. Pulsa «Cerrar el día» otra vez para cerrar."};renderHoy();$("inbox").scrollIntoView({block:"nearest"});return}
  saveFold("log",{close:true});
};
/* Nota rápida: botón flotante disponible en toda la app */
function qnOpen(){$("qn-st").textContent="";$("qn-back").hidden=false;$("qn-text").focus()}
function qnClose(){if($("qn-back").hidden)return;$("qn-back").hidden=true;$("qn-fab").focus()}
$("qn-fab").onclick=qnOpen;$("qn-close").onclick=qnClose;
$("qn-back").addEventListener("mousedown",e=>{if(e.target===$("qn-back"))qnClose()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")qnClose()});
$("qn-text").addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();$("qn-form").requestSubmit()}});
$("qn-form").addEventListener("submit",e=>{e.preventDefault();const t=$("qn-text").value.trim();if(!t){$("qn-st").textContent="Escribe algo primero.";return}
  const id="n"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),note={text:t,state:"open",created:nowISO(),day:today()};
  S.inbox.push(Object.assign({id},note));$("qn-text").value="";renderInbox();
  save("inbox/"+id,note).then(ok=>{if(!ok){S.inbox=S.inbox.filter(x=>x.id!==id);renderInbox();toast("La nota no se guardó. Inténtalo de nuevo.")}});
  qnClose();toast("Nota guardada en la Bandeja")});
window.addEventListener("beforeunload",e=>{if(anyDirty()){e.preventDefault();e.returnValue=""}});
function go2(n){cur=n;renderHoy()}
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
  const w=$("r-why");if(!S.cards.length)w.open=true;else if(w.__n===0)w.open=false;w.__n=S.cards.length;
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
    else Pp.innerHTML=`<div class="qbox">Aún no tienes tarjetas para entrenar.</div><p class="hint">Cuando tengas, aquí te preguntaré una por una las que toquen hoy. Empieza con una de estas dos:</p><div class="row"><button class="btn primary" type="button" id="rv-gen">Crear tarjetas desde mi bitácora</button><span class="muted" style="font-size:.85rem">o escribe la primera a mano en «Crear tarjeta».</span></div>`;
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
  if(t.id==="rv-gen"){$("rf-gen").click();return}
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
  $("s-log").innerHTML=S.changelog.length?S.changelog.slice(0,15).map(l=>`<div class="row" style="align-items:baseline;gap:10px;flex-wrap:nowrap"><span class="muted" style="font-size:.8rem;flex:0 0 auto;font-variant-numeric:tabular-nums">${esc(l.date||"")}</span><span style="min-width:0">${T(l.text)}</span></div>`).join(""):`<div class="empty">Sin cambios registrados.</div>`;
  $("q-list").innerHTML=S.requests.slice(0,15).map(r=>`<div class="pcard"><div class="row between"><span class="muted" style="font-size:.8rem">${esc((r.created||"").slice(0,10))}</span><span class="chip ${r.status==="atendido"?"ok":r.status==="en curso"?"warn":""}">${esc(r.status||"nuevo")}</span></div><div style="overflow-wrap:anywhere">${T(r.text)}</div>${r.response?`<div class="muted" style="font-size:.88rem;border-top:1px dashed var(--line);padding-top:6px">Respuesta: ${T(r.response)}</div>`:""}</div>`).join("");
}
$("qf").addEventListener("submit",e=>{e.preventDefault();const t=$("qf-text").value.trim();if(!t)return;save("requests/q"+Date.now().toString(36),{text:t,status:"nuevo",created:nowISO()}).then(()=>toast("Enviado: Auditoría lo atiende en la próxima revisión"));$("qf-text").value=""});
function renderEscuadron(){$("s-depts").innerHTML=depts().length?depts().map(d=>agentCard(d,false)).join(""):`<div class="empty">Sin departamentos.</div>`}

/* =================== AJUSTES (versión independiente) =================== */
const RT=window.KASANOV_RUNTIME;
function renderAjustes(){
  const st=RT.getSettings();const k=$("aj-key");if(document.activeElement!==k&&!k.dataset.dirty)k.value=st.apiKey;
  ["quick","default","complex"].forEach(t=>{const el=$("aj-m-"+t);if(document.activeElement!==el&&!el.dataset.dirty)el.value=st.models[t]});
  const ks=$("aj-keystate");ks.textContent=st.apiKey?"Agentes activos":"Agentes apagados";ks.className="chip "+(st.apiKey?"ok":"warn");
  if(!RT.storageOK())$("aj-dstate").textContent="Este navegador bloquea el almacenamiento local: tus datos se perderán al cerrar la pestaña.";
}
["aj-key","aj-m-quick","aj-m-default","aj-m-complex"].forEach(id=>$(id).addEventListener("input",e=>e.target.dataset.dirty="1"));
const ajModels=()=>({quick:$("aj-m-quick").value.trim()||RT.DEFAULT_MODELS.quick,default:$("aj-m-default").value.trim()||RT.DEFAULT_MODELS.default,complex:$("aj-m-complex").value.trim()||RT.DEFAULT_MODELS.complex});
$("aj-save").onclick=()=>{try{RT.setSettings({apiKey:$("aj-key").value,models:ajModels()});$("aj-state").textContent="Guardado. Recargando…";setTimeout(()=>location.reload(),400)}catch(e){$("aj-state").textContent=e.message}};
$("aj-test").onclick=async()=>{const b=$("aj-test");const key=$("aj-key").value.trim();if(!key){$("aj-state").textContent="Pega tu API key primero.";return}
  b.disabled=true;$("aj-state").textContent="Probando…";
  try{await RT.test(key,ajModels().quick);$("aj-state").textContent="Conexión correcta. Guarda para activar a los agentes."}
  catch(e){$("aj-state").textContent=errCopy(e)}finally{b.disabled=false}};
$("aj-export").onclick=()=>{const blob=new Blob([RT.exportJSON()],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="sistema-kasanov-respaldo-"+today()+".json";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800);$("aj-dstate").textContent="Respaldo descargado."};
$("aj-import-btn").onclick=()=>$("aj-import").click();
$("aj-import").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{RT.importJSON(String(r.result));$("aj-dstate").textContent="Respaldo importado. Recargando…";setTimeout(()=>location.reload(),400)}catch(err){$("aj-dstate").textContent=err.message||"No se pudo leer el archivo."}};r.readAsText(f)});
$("aj-reset").onclick=e=>{const b=e.currentTarget;if(!b.dataset.confirm){b.dataset.confirm="1";b.textContent="¿Borrar todo de verdad?";$("aj-dstate").textContent="Se borran hábitos, proyectos, finanzas y misiones de este navegador. Tu API key se conserva.";setTimeout(()=>{if(b.dataset.confirm){b.textContent="Borrar todo";delete b.dataset.confirm}},5000);return}
  RT.reset();location.reload()};
$("setup-go").onclick=()=>show("ajustes");

/* =================== render + arranque =================== */
function renderAll(){
  try{levelCheck()}catch(e){}
  $("weekpill").textContent=isoWeek(today())+" · semana "+(weekIndex(today())+1)+" del sistema";
  ensureLayout();
  const v=VIEW;
  if(v==="nexo")renderNexo();if(v==="hoy")renderHoy();if(v==="semana")renderSemana();if(v==="entreno")renderEntreno();try{enWatch()}catch(e){}
  if(v==="proyectos")renderProyectos();if(v==="habilidades")renderHabilidades();if(v==="repaso")renderRepaso();if(v==="finanzas")renderFinanzas();
  try{renderInbox()}catch(e){}
  try{renderChat();renderExp()}catch(e){}
  if(groupOf(v)==="sistema")renderForce();if(v==="revisiones")renderReview();if(v==="mejoras")renderMejoras();if(v==="escuadron")renderEscuadron();if(v==="ajustes")renderAjustes();if(v==="diagnostico")renderDiag();
  try{renderProfBtn()}catch(e){}
  if(!$("fi-back").hidden)renderFicha();
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
  db.collection("inbox").onSnapshot(s=>{S.inbox=list(s);soon()},onErr);
  db.collection("chats").onSnapshot(s=>{S.chats=snapMap("chats",s);soon()},onErr);
  db.collection("dossiers").onSnapshot(s=>{S.dossiers=snapMap("dossiers",s);soon()},onErr);
  db.doc("system/board").onSnapshot(s=>{if(!(PEND["system/board"]>0))S.board=s.exists?s.data():null;soon()},onErr);
  db.doc("profile/main").onSnapshot(s=>{if(!(PEND["profile/main"]>0))S.profile=s.exists?s.data():null;soon();setTimeout(ghBoot,800)},onErr);
  db.doc("signals/github").onSnapshot(s=>{if(!(PEND["signals/github"]>0))S.signals=s.exists?s.data():null;soon()},onErr);
  db.collection("entreno").onSnapshot(s=>{enLoad(s);soon()},onErr);
  db.collection("quests").onSnapshot(s=>{const o={};s.docs.forEach(d=>{o[d.id]=d.data()});S.quests=o;soon()},onErr);
})();
document.addEventListener("visibilitychange",()=>{if(!document.hidden)renderAll()});
})();
