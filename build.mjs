// AR.T.L.A.S. · compilación
//   node build.mjs            → dist/fullstack y dist/web-only (app.js minificado)
//   node build.mjs --sin-min  → sin minificar ni proteger (para depurar)
//   node build.mjs --sin-proteccion → minificado pero sin codificar app.js
// Los módulos de src/modulos se concatenan en orden (00-, 10-, …) en un único app.js.
import fs from "node:fs";
import path from "node:path";
import { transform } from "esbuild";
import crypto from "node:crypto";

const R = path.dirname(new URL(import.meta.url).pathname);
const cfg = JSON.parse(fs.readFileSync(path.join(R, "artlas.config.json"), "utf8"));
const MIN = !process.argv.includes("--sin-min");
const PROT = MIN && !process.argv.includes("--sin-proteccion");
const DOMS = (cfg.dominios || ["artlas.ar", "*.artlas.ar", "artlas.netlify.app", "artlas-ai-arg.netlify.app", "localhost", "127.0.0.1"]).join(",");
const hoy = new Date().toISOString();
const BID = hoy.replace(/[-:TZ.]/g, "").slice(0, 14);   // identificador único de cada compilación
const rep = s => s.replaceAll("__ARTLAS_VER__", cfg.ver).replaceAll("__ARTLAS_NUM__", cfg.num).replaceAll("__ARTLAS_FECHA__", hoy.slice(0, 10)).replaceAll("__ARTLAS_DOMINIOS__", DOMS).replaceAll("__ARTLAS_BID__", BID).replaceAll("__ARTLAS_LIC_VER__", (cfg.licencia && cfg.licencia.ver) || cfg.ver);

// ---------- 1) módulos ----------
const MD = path.join(R, "src", "modulos");
const files = fs.readdirSync(MD).filter(f => /^\d\d-.+\.js$/.test(f)).sort();
const mods = files.map(f => ({ f, n: f.replace(/^\d\d-/, "").replace(/\.js$/, ""), src: rep(fs.readFileSync(path.join(MD, f), "utf8")) }));
const joined = mods.map(m => m.src).join("\n");
let code = joined;
if (MIN) {
  const r = await transform(joined, { minify: true, legalComments: "none", charset: "utf8", target: "es2020", loader: "js" });
  code = r.code;
} else {
  await transform(joined, { loader: "js" }); // solo verifica la sintaxis
}
// ---------- 2) información de compilación (para «Salud de la plataforma») ----------
let pruebas = null;
try { pruebas = JSON.parse(fs.readFileSync(path.join(R, "tests", "ultimo-reporte.json"), "utf8")); } catch (e) {}
const info = { ver: cfg.ver, fecha: hoy, minificado: MIN, total: Buffer.byteLength(joined), modulos: mods.map(m => ({ n: m.n, bytes: Buffer.byteLength(m.src) })), pruebas };
// recursos pesados (íconos, RAG local, manual): archivo aparte, se cargan después de la app
const RD = path.join(R, "src", "recursos");
const recursos = fs.readdirSync(RD).filter(f => f.endsWith(".js")).sort().map(f => fs.readFileSync(path.join(RD, f), "utf8")).join("\n");
// AR.T.L.A.S. OS: archivos del núcleo local, para descargarlo desde la app (también en Escritorio, sin red)
const ND = path.join(R, "src", "nucleo");
const nucleo = {}; for (const f of fs.readdirSync(ND).sort()) nucleo[f] = rep(fs.readFileSync(path.join(ND, f), "utf8"));
const recursosTodo = recursos + "\nwindow.ARTLAS_NUCLEO=" + JSON.stringify(nucleo) + ";\n";
await transform(recursosTodo, { loader: "js" });
info.recursos = Buffer.byteLength(recursosTodo);
const head = "window.__ARTLAS_BUILD__=" + JSON.stringify(info) + ";\n";
info.min = Buffer.byteLength(head + code);
info.protegido = PROT;
const appjsPlano = "window.__ARTLAS_BUILD__=" + JSON.stringify(info) + ";\n" + code;
// ---------- 2b) protección contra copia: app.js se publica codificado ----------
// Rotación de caracteres imprimibles (32-126) con una secuencia pseudoaleatoria que cambia en cada compilación.
// El cargador lo decodifica en el navegador y lo ejecuta como script global (mismo comportamiento que antes).
// 89-proteccion.js (v68Decode/v68Unwrap) usa el mismo algoritmo para armar la versión Escritorio.
function proteger(src) {
  const S = crypto.randomInt(1, 2 ** 31 - 1);
  let k = S >>> 0; const b = new Array(src.length);
  for (let i = 0; i < src.length; i++) {
    let c = src.charCodeAt(i); k = (Math.imul(k, 1103515245) + 12345) >>> 0;
    if (c > 31 && c < 127) c = (c - 32 + ((k >>> 16) % 95)) % 95 + 32;
    b[i] = c;
  }
  let enc = ""; for (let i = 0; i < b.length; i += 8192) enc += String.fromCharCode.apply(null, b.slice(i, i + 8192));
  const loader = '(function(P,S){var k=S>>>0,n=P.length,o=[],b=[],i,c;for(i=0;i<n;i++){c=P.charCodeAt(i);k=(Math.imul(k,1103515245)+12345)>>>0;if(c>31&&c<127)c=(c-32+95-(k>>>16)%95)%95+32;b.push(c);if(b.length>8191){o.push(String.fromCharCode.apply(null,b));b=[]}}o.push(String.fromCharCode.apply(null,b));var s=document.createElement("script");s.text=o.join("");(document.head||document.documentElement).appendChild(s);if(s.parentNode)s.parentNode.removeChild(s)})';
  const out = `/*ARTLAS-P*/\n/* AR.T.L.A.S. ${cfg.ver} · © MMFC · AI-TECH · Prof. Mario M. Figueroa de la Cruz.\n   Código protegido: prohibida su copia, modificación o redistribución sin autorización. */\n` + loader + "(" + JSON.stringify(enc).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029") + "," + S + ");\n";
  // verificación: decodificar y comparar
  const P = JSON.parse(out.slice(out.lastIndexOf('})("') + 3, out.lastIndexOf('",') + 1)), S2 = parseInt(out.slice(out.lastIndexOf('",') + 2), 10);
  let k2 = S2 >>> 0, d = new Array(P.length);
  for (let i = 0; i < P.length; i++) { let c = P.charCodeAt(i); k2 = (Math.imul(k2, 1103515245) + 12345) >>> 0; if (c > 31 && c < 127) c = (c - 32 + 95 - (k2 >>> 16) % 95) % 95 + 32; d[i] = c; }
  let dec = ""; for (let i = 0; i < d.length; i += 8192) dec += String.fromCharCode.apply(null, d.slice(i, i + 8192));
  if (dec !== src) throw new Error("La protección de app.js no se pudo verificar");
  return out;
}
const appjs = PROT ? proteger(appjsPlano) : appjsPlano;

// ---------- 3) HTML: versión, sin comentarios internos, CSS minificado ----------
async function html(file) {
  let s = rep(fs.readFileSync(file, "utf8"));
  s = s.replace(/<!--(?!\[if)[\s\S]*?-->/g, "");
  if (MIN) {
    const parts = [];
    s = s.replace(/<style>([\s\S]*?)<\/style>/g, (all, css) => { parts.push(css); return "<style>\u0000" + (parts.length - 1) + "\u0000</style>"; });
    for (let i = 0; i < parts.length; i++) {
      const r = await transform(parts[i], { loader: "css", minify: true, legalComments: "none", charset: "utf8" });
      s = s.replace("\u0000" + i + "\u0000", r.code.trim());
    }
  }
  return s;
}
function copyDir(src, dst, skip = () => false) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const a = path.join(src, e.name), b = path.join(dst, e.name);
    if (skip(e.name, a)) continue;
    if (e.isDirectory()) copyDir(a, b, skip); else fs.copyFileSync(a, b);
  }
}
const S = path.join(R, "src", "sitio"), D = path.join(R, "dist");
fs.rmSync(D, { recursive: true, force: true });
// fullstack
const FS = path.join(D, "fullstack");
copyDir(S, FS);
fs.writeFileSync(path.join(FS, "app.js"), appjs);
fs.writeFileSync(path.join(FS, "app-recursos.js"), recursosTodo);
// Python en el navegador: el worker también se publica como archivo del mismo sitio
const wsrc = fs.readFileSync(path.join(MD, "84-python-worker.js"), "utf8");
fs.writeFileSync(path.join(FS, "python-worker.js"), new Function(wsrc + "\nreturn v67WorkerSrc('module');")());
const appHtml = await html(path.join(S, "app.html"));
fs.writeFileSync(path.join(FS, "app.html"), appHtml);
fs.writeFileSync(path.join(FS, "index.html"), await html(path.join(S, "index.html")));
for (const f of ["sitemap.xml", "package.json", "sw.js"]) fs.writeFileSync(path.join(FS, f), rep(fs.readFileSync(path.join(S, f), "utf8")));
// web-only (sin proxy)
const WO = path.join(D, "web-only");
const WO_FILES = ["app.js", "app-recursos.js", "python-worker.js", "index.html", "view.html", "logo.png", "emblem.png", "logo-artlas.webp", "og-image.png", "robots.txt", "sitemap.xml", "googlec9092d167579b572.html",
  "manifest.webmanifest", "sw.js", "icono-192.png", "icono-512.png", "icono-maskable-512.png", "apple-touch-icon.png", "_headers", "licencia-artlas.pdf"];
fs.mkdirSync(WO, { recursive: true });
for (const f of WO_FILES) fs.copyFileSync(path.join(FS, f), path.join(WO, f));
copyDir(path.join(FS, ".github"), path.join(WO, ".github"));
fs.mkdirSync(path.join(WO, "supabase"), { recursive: true });
fs.copyFileSync(path.join(FS, "supabase", "plantilla-reset-password.html"), path.join(WO, "supabase", "plantilla-reset-password.html"));
const tag = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>';
if (!appHtml.includes(tag)) throw new Error("No encuentro el script de JSZip en app.html");
fs.writeFileSync(path.join(WO, "app.html"), appHtml.replace(tag, "<script>window.ARTLAS_DIRECT_ONLY=true;</script>\n" + tag));
fs.writeFileSync(path.join(WO, "LEEME.txt"), rep(fs.readFileSync(path.join(R, "src", "LEEME-web-only.txt"), "utf8")));
// AR.T.L.A.S. OS como sistema propio (imagen ISO / Raspberry Pi): núcleo ya compilado y AR.T.L.A.S. RAG listos para copiar
const DN = path.join(D, "nucleo"); fs.rmSync(DN, { recursive: true, force: true }); fs.mkdirSync(DN, { recursive: true });
for (const [f, t] of Object.entries(nucleo)) fs.writeFileSync(path.join(DN, f), t);
{ const DR = path.join(D, "rag"); fs.rmSync(DR, { recursive: true, force: true }); fs.mkdirSync(DR, { recursive: true });
  const m = fs.readFileSync(path.join(RD, "20-rag-local.js"), "utf8").match(/RAGLOCAL_FILES\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  if (m) { const F = JSON.parse(m[1]); for (const [f, b64] of Object.entries(F)) fs.writeFileSync(path.join(DR, f), Buffer.from(b64, "base64")); } }

const kb = n => (n / 1024).toFixed(0) + " KB";
console.log(`AR.T.L.A.S. ${cfg.ver} · ${mods.length} módulos · fuente ${kb(info.total)} → app.js ${kb(info.min)}${MIN ? " (minificado)" : ""}${PROT ? ", publicado protegido " + kb(Buffer.byteLength(appjs)) : ""} + app-recursos.js ${kb(info.recursos)}`);
console.log(pruebas ? `Pruebas incluidas: ${pruebas.ok}/${pruebas.total}` : "Sin reporte de pruebas (tests/ultimo-reporte.json)");
