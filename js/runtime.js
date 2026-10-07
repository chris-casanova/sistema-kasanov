/*
 * Sistema KASANOV · capa de ejecución independiente
 *
 * La app nació como un artifact de claude.ai, que le da a la página tres capacidades:
 * una base de datos, llamadas a Claude y conectores. Este archivo las reemplaza para que
 * funcione en cualquier navegador:
 *   - db:     base de datos local (localStorage) con la misma API tipo Firestore que usa la app
 *   - sample: llamadas a Claude con tu propia API key de Anthropic, directo desde el navegador
 *   - mcp:    no disponible fuera de claude.ai (la app lo detecta y lo oculta)
 *
 * Para sincronizar entre dispositivos puedes reemplazar `db` por Firebase o Supabase
 * implementando la misma interfaz: doc(path).get/set/update/delete/onSnapshot y
 * collection(path).where/orderBy/limit/get/onSnapshot.
 */
(function () {
  "use strict";

  const DB_KEY = "kasanov:db:v1";
  const SET_KEY = "kasanov:settings:v1";
  const API_URL = "https://api.anthropic.com/v1/messages";
  // Modelos por defecto. Si alguno deja de existir, cámbialo en Ajustes por uno vigente:
  // https://docs.claude.com/en/docs/about-claude/models/overview
  const DEFAULT_MODELS = { quick: "claude-haiku-4-5-20251001", default: "claude-sonnet-5-5", complex: "claude-opus-5-5" };
  const MAX_TOKENS = { quick: 1500, default: 3000, complex: 4000 };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const pad = (n) => String(n).padStart(2, "0");
  const isoDay = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

  /* ---------------- almacenamiento ---------------- */
  let storageOK = true;
  function readStore() {
    try { const raw = localStorage.getItem(DB_KEY); return raw ? JSON.parse(raw) : {}; }
    catch (e) { storageOK = false; return {}; }
  }
  let mem = readStore();
  function writeStore() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(mem)); }
    catch (e) { storageOK = false; console.warn("[Sistema KASANOV] No se pudo guardar en localStorage.", e); }
  }

  function getSettings() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(SET_KEY) || "{}"); } catch (e) { s = {}; }
    return { apiKey: s.apiKey || "", models: Object.assign({}, DEFAULT_MODELS, s.models || {}) };
  }
  function setSettings(patch) {
    const cur = getSettings();
    const next = {
      apiKey: patch.apiKey !== undefined ? String(patch.apiKey).trim() : cur.apiKey,
      models: Object.assign({}, cur.models, patch.models || {}),
    };
    try { localStorage.setItem(SET_KEY, JSON.stringify(next)); }
    catch (e) { throw new Error("Este navegador bloquea el almacenamiento local; no se pudo guardar."); }
    return next;
  }

  /* ---------------- base de datos (API tipo Firestore) ---------------- */
  const docListeners = new Map(); // ruta -> Set(callback)
  const queryListeners = new Set(); // {coll, emit}
  const parentOf = (p) => p.split("/").slice(0, -1).join("/");
  const lastSeg = (p) => { const s = p.split("/"); return s[s.length - 1]; };
  const meta = { fromCache: false, hasPendingWrites: false };

  function snap(path) {
    const d = mem[path];
    return { id: lastSeg(path), exists: d !== undefined, data: () => (d === undefined ? undefined : clone(d)), metadata: meta };
  }
  function checkPath(p, even) {
    const segs = typeof p === "string" ? p.split("/") : [];
    if (!segs.length || segs.some((x) => !x) || (segs.length % 2 === 0) !== even) {
      throw new TypeError("Ruta inválida para " + (even ? "documento" : "colección") + ": " + p);
    }
  }

  const pending = new Set();
  let flushTimer = null;
  function changed(path) { pending.add(path); if (!flushTimer) flushTimer = setTimeout(flush, 0); }
  function flush() {
    flushTimer = null;
    const paths = [...pending]; pending.clear();
    const colls = new Set(paths.map(parentOf));
    paths.forEach((p) => { const ls = docListeners.get(p); if (ls) ls.forEach((cb) => { try { cb(snap(p)); } catch (e) { console.error(e); } }); });
    queryListeners.forEach((q) => { if (colls.has(q.coll)) q.emit(); });
  }

  function compare(a, op, b) {
    switch (op) {
      case "==": return a === b;
      case "!=": return a !== b;
      case "<": return a < b;
      case "<=": return a <= b;
      case ">": return a > b;
      case ">=": return a >= b;
      case "in": return Array.isArray(b) && b.includes(a);
      case "not-in": return Array.isArray(b) && !b.includes(a);
      case "array-contains": return Array.isArray(a) && a.includes(b);
      default: return false;
    }
  }

  function makeQuery(coll, filters, order, lim) {
    function run() {
      let rows = Object.keys(mem).filter((p) => parentOf(p) === coll).map((p) => ({ p, d: mem[p] }));
      filters.forEach(([f, op, v]) => { rows = rows.filter((r) => compare(r.d[f], op, v)); });
      if (order) {
        const [f, dir] = order;
        rows.sort((x, y) => {
          const a = x.d[f], b = y.d[f];
          if (a === undefined && b === undefined) return 0;
          if (a === undefined) return 1;
          if (b === undefined) return -1;
          return (a < b ? -1 : a > b ? 1 : 0) * (dir === "desc" ? -1 : 1);
        });
      } else rows.sort((x, y) => (x.p < y.p ? -1 : 1));
      if (lim) rows = rows.slice(0, lim);
      const docs = rows.map((r) => snap(r.p));
      return { docs, size: docs.length, empty: !docs.length, metadata: meta,
        docChanges: () => docs.map((doc, i) => ({ type: "added", doc, oldIndex: -1, newIndex: i })) };
    }
    return {
      where: (f, op, v) => makeQuery(coll, filters.concat([[f, op, v]]), order, lim),
      orderBy: (f, dir) => makeQuery(coll, filters, [f, dir || "asc"], lim),
      limit: (n) => makeQuery(coll, filters, order, n),
      get: () => Promise.resolve(run()),
      onSnapshot(next) {
        const entry = { coll, emit: () => { try { next(run()); } catch (e) { console.error(e); } } };
        queryListeners.add(entry); setTimeout(entry.emit, 0);
        return () => queryListeners.delete(entry);
      },
    };
  }

  function deepMerge(a, b) {
    const o = Object.assign({}, a);
    Object.keys(b).forEach((k) => {
      const v = b[k];
      if (v && typeof v === "object" && v.__delete__ === true) { delete o[k]; return; }
      if (v && typeof v === "object" && !Array.isArray(v) && o[k] && typeof o[k] === "object" && !Array.isArray(o[k])) o[k] = deepMerge(o[k], v);
      else o[k] = v;
    });
    return o;
  }
  const newId = () => "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function docRef(path) {
    checkPath(path, true);
    return {
      id: lastSeg(path), path,
      get: () => Promise.resolve(snap(path)),
      set(data) {
        if (!data || typeof data !== "object" || Array.isArray(data)) return Promise.reject({ code: "invalid_argument", message: "El documento debe ser un objeto." });
        mem[path] = clone(data); writeStore(); changed(path); return Promise.resolve();
      },
      update(data) {
        if (mem[path] === undefined) return Promise.reject({ code: "invalid_argument", message: "El documento no existe." });
        mem[path] = deepMerge(mem[path], clone(data)); writeStore(); changed(path); return Promise.resolve();
      },
      delete() { delete mem[path]; writeStore(); changed(path); return Promise.resolve(); },
      onSnapshot(next) {
        if (!docListeners.has(path)) docListeners.set(path, new Set());
        docListeners.get(path).add(next);
        setTimeout(() => { try { next(snap(path)); } catch (e) { console.error(e); } }, 0);
        return () => { const s = docListeners.get(path); if (s) s.delete(next); };
      },
      collection: (sub) => colRef(path + "/" + sub),
    };
  }
  function colRef(path) {
    checkPath(path, false);
    return Object.assign({}, makeQuery(path, [], null, 0), {
      path,
      doc: (id) => docRef(path + "/" + (id || newId())),
      add: (data) => { const r = docRef(path + "/" + newId()); return r.set(data).then(() => r); },
    });
  }
  const db = { doc: docRef, collection: colRef };

  // Si abres el sistema en dos pestañas, ambas se mantienen al día.
  window.addEventListener("storage", (e) => {
    if (e.key !== DB_KEY) return;
    const old = mem; mem = readStore();
    new Set(Object.keys(old).concat(Object.keys(mem))).forEach((k) => {
      if (JSON.stringify(old[k]) !== JSON.stringify(mem[k])) changed(k);
    });
  });

  /* ---------------- configuración inicial ---------------- */
  function seed() {
    if (mem["config/main"]) return;
    const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    mem["config/main"] = {
      start: isoDay(d), owner: "", context: "", goal: "",
      aiRole: "Copiloto con explicación: Claude puede escribir código en tus proyectos, pero explica cada parte para que la entiendas y la puedas defender.",
      habits: [
        { id: "estudio", name: "Estudio", priority: true },
        { id: "ejercicio", name: "Ejercicio", priority: true },
        { id: "sueno", name: "Dormir 8 h" },
        { id: "meditacion", name: "Meditación" },
        { id: "caminata", name: "Caminata" },
        { id: "idiomas", name: "Idiomas" },
      ],
      bonus: [
        { id: "ducha", name: "Ducha fría" },
        { id: "hogar", name: "Tarea del hogar" },
        { id: "commit", name: "Commit en un proyecto" },
        { id: "lectura", name: "Lectura" },
      ],
      bonusPerPoint: 3,
      weekMins: [3, 3, 4, 4, 5, 5, 6],
      studyTargetMin: [120, 150, 180, 210, 240, 270, 300],
      departments: [
        { id: "aprendizaje", name: "Aprendizaje", mission: "Lee tus sesiones, lo que construiste y dónde te trabaste. Prioriza lo que practicas de verdad, convierte lo aprendido en tarjetas de repaso y señala huecos concretos." },
        { id: "carrera", name: "Rumbo profesional", mission: "Descubre con evidencia qué camino profesional te conviene: cruza tus habilidades probadas y en práctica, tus proyectos y lo que disfrutas construir con el mercado real (empleo remoto, freelance, productos propios, roles híbridos). Trata lo no probado como hipótesis y propón experimentos pequeños para validarlo. Cuida tu portafolio, GitHub y CV." },
        { id: "habitos", name: "Hábitos y energía", mission: "Mide adherencia, racha y energía. Ajusta la exigencia semanal hacia arriba o abajo, sin culpa, para superar tu mejor momento." },
        { id: "sistema", name: "Auditoría del sistema", mission: "Revisa si el sistema se está usando y dónde hay fricción, atiende tus solicitudes de mejora y propone cambios concretos." },
        { id: "finanzas", name: "Finanzas", mission: "Cuida tu dinero con frialdad de inversionista: solo hechos y cifras, decisiones explícitas (sí o no, ganancia o pérdida), sin darte por tu lado ni aprobar gastos innecesarios, y reconociendo las buenas ideas. Opina en toda decisión personal o de dinero, protege el colchón y busca multiplicar tu capital. Señala temas legales e impuestos sin sustituir a un contador." },
      ],
      updated: new Date().toISOString(),
    };
    mem["changelog/l0001"] = { date: isoDay(new Date()), text: "Sistema creado en este navegador." };
    writeStore();
  }
  seed();

  /* ---------------- Claude (API de Anthropic) ---------------- */
  const fail = (code, message, extra) => Object.assign({ code, message }, extra || {});

  async function callClaude(input, opts) {
    opts = opts || {};
    const st = getSettings();
    const key = (opts.apiKey || st.apiKey || "").trim();
    if (!key) throw fail("no_key", "Falta la API key de Anthropic.");
    const tier = ["quick", "default", "complex"].includes(opts.modelTier) ? opts.modelTier : "default";
    const messages = typeof input === "string"
      ? [{ role: "user", content: input }]
      : Array.isArray(input) ? input.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content) })) : null;
    if (!messages || !messages.length || !messages[0].content) throw fail("invalid_request", "La entrada está vacía.");
    const system = "Respondes en español." + (opts.json
      ? " Tu respuesta la lee un programa: responde únicamente con un valor JSON válido, sin texto antes ni después y sin bloques de código."
      : "");
    let res;
    try {
      res = await fetch(API_URL, {
        method: "POST",
        signal: opts.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: opts.model || st.models[tier], max_tokens: MAX_TOKENS[tier], system, messages }),
      });
    } catch (e) {
      if (e && e.name === "AbortError") throw fail("cancelled", "Cancelado.");
      throw fail("network", "Sin conexión con la API de Anthropic.");
    }
    let body = null;
    try { body = await res.json(); } catch (e) { body = null; }
    if (!res.ok) {
      const msg = (body && body.error && body.error.message) || "HTTP " + res.status;
      const type = body && body.error && body.error.type;
      if (res.status === 401 || res.status === 403 || type === "authentication_error" || type === "permission_error") throw fail("bad_key", msg);
      if (res.status === 429) throw fail("rate_limited", msg);
      if (res.status === 529 || type === "overloaded_error") throw fail("overloaded", msg);
      if (/credit|billing|balance/i.test(msg)) throw fail("billing", msg);
      if (res.status === 404 || /model/i.test(msg)) throw fail("bad_model", msg);
      if (res.status === 413) throw fail("prompt_too_large", msg);
      if (res.status >= 500) throw fail("upstream_error", msg);
      throw fail("invalid_request", msg);
    }
    const text = ((body && body.content) || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    if (!text) throw fail("empty_completion", "Claude respondió vacío.");
    return { text, truncated: body.stop_reason === "max_tokens", modelTierApplied: tier };
  }

  function parseJSON(t) {
    const tries = [t];
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) tries.push(fence[1]);
    const a = t.search(/[\[{]/), b = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
    if (a >= 0 && b > a) tries.push(t.slice(a, b + 1));
    for (const s of tries) { try { return { ok: true, value: JSON.parse(s) }; } catch (e) { /* siguiente intento */ } }
    return { ok: false };
  }

  async function sample(input, opts) {
    const r = await callClaude(input, opts);
    if (opts && typeof opts.onText === "function") { try { opts.onText({ text: r.text, delta: r.text }); } catch (e) { console.error(e); } }
    return r;
  }
  sample.json = async function (input, opts) {
    const r = await callClaude(input, Object.assign({}, opts, { json: true }));
    const p = parseJSON(r.text);
    if (!p.ok || r.truncated) throw fail("invalid_json", "La respuesta no fue JSON válido.", { text: r.text });
    return p.value;
  };
  sample.limits = async () => ({ maxPromptBytes: 262144 });

  /* ---------------- interfaz pública ---------------- */
  window.claude = {
    use: async (name) => {
      if (name === "db") return db;
      if (name === "sample") return getSettings().apiKey ? sample : null;
      return null; // mcp, user y demás capacidades de claude.ai no existen aquí
    },
  };

  window.KASANOV_RUNTIME = {
    standalone: true,
    DEFAULT_MODELS,
    storageOK: () => storageOK,
    getSettings,
    setSettings,
    test: (apiKey, model) => callClaude("Responde solo con la palabra: listo", { modelTier: "quick", apiKey, model }).then((r) => r.text),
    exportJSON: () => JSON.stringify({ app: "sistema-kasanov", version: 1, exported: new Date().toISOString(), data: mem }, null, 2),
    importJSON: (txt) => {
      const o = JSON.parse(txt);
      if (!o || o.app !== "sistema-kasanov" || !o.data || typeof o.data !== "object") throw new Error("El archivo no es un respaldo de Sistema KASANOV.");
      mem = o.data; writeStore();
    },
    reset: () => { mem = {}; writeStore(); seed(); },
  };
})();
