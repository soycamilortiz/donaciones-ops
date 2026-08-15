/**
 * HTML del visor de logs (/logs).
 *
 * Se sirve como una única página autocontenida (sin CDN ni assets externos)
 * para que funcione aunque el resto del despliegue esté caído.
 *
 * El JS del cliente usa concatenación de strings a propósito: este archivo ya
 * es un template literal y meter backticks anidados solo invita a errores.
 */

const CSS = `
:root{--bg:#0b0f14;--panel:#111823;--panel2:#0e141d;--border:#1e2937;--fg:#dbe4f0;--muted:#7d8ea6;
--info:#5fb3f7;--warn:#f2c14e;--error:#ff6b6b;--fatal:#ff3b5c;--debug:#9b8cff;--ok:#3ddc97}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
header{padding:14px 18px;background:var(--panel);border-bottom:1px solid var(--border);
display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;position:sticky;top:0;z-index:5}
h1{font-size:15px;margin:0;font-weight:650;letter-spacing:.2px}
.pill{font-size:11px;padding:3px 9px;border-radius:999px;border:1px solid var(--border);
background:var(--panel2);color:var(--muted);white-space:nowrap}
.pill.ok{color:var(--ok);border-color:#1d4d3a}
.pill.bad{color:var(--fatal);border-color:#5a1b2a}
.pill.live{color:var(--ok);border-color:#1d4d3a}
.pill.poll{color:var(--warn);border-color:#5a4a1b}
.spacer{flex:1}
main{padding:16px 18px 60px;max-width:1400px;margin:0 auto}
.banner{border:1px solid #5a1b2a;background:#1a0d12;border-left:4px solid var(--fatal);
border-radius:8px;padding:14px 16px;margin-bottom:16px}
.banner h2{margin:0 0 8px;font-size:14px;color:var(--fatal)}
.banner pre{margin:8px 0 0;white-space:pre-wrap;word-break:break-word;font-size:12.5px;
font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#ffc9d1;max-height:340px;overflow:auto}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:12px;margin-bottom:16px}
.card{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:12px 14px}
.card h3{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:var(--muted)}
.row{display:flex;gap:8px;padding:4px 0;font-size:12.5px;align-items:baseline}
.row .k{color:var(--muted);min-width:132px;font-family:ui-monospace,Menlo,Consolas,monospace}
.row .v{word-break:break-all;font-family:ui-monospace,Menlo,Consolas,monospace}
.dot{width:8px;height:8px;border-radius:50%;flex:0 0 8px;margin-top:6px}
.dot.ok{background:var(--ok)}.dot.bad{background:var(--fatal)}
.check{display:flex;gap:9px;padding:6px 0;border-bottom:1px solid var(--panel2)}
.check:last-child{border-bottom:0}
.check .t{font-size:12.5px;font-weight:600}
.check .d{font-size:12px;color:var(--muted);margin-top:2px}
.toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
input[type=search],select,button{background:var(--panel2);color:var(--fg);border:1px solid var(--border);
border-radius:6px;padding:6px 10px;font-size:12.5px;font-family:inherit}
input[type=search]{min-width:220px;flex:1;max-width:380px}
button{cursor:pointer}
button:hover{border-color:#31445c}
button.on{border-color:var(--ok);color:var(--ok)}
#log{background:#070a0e;border:1px solid var(--border);border-radius:8px;padding:10px 4px 10px 0;
height:60vh;min-height:320px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px}
.line{display:flex;gap:10px;padding:1px 12px;white-space:pre-wrap;word-break:break-word;border-left:2px solid transparent}
.line:hover{background:#0d1219}
.line .ts{color:#4a5b70;flex:0 0 auto}
.line .lv{flex:0 0 52px;text-transform:uppercase;font-size:11px;padding-top:1px}
.line .ctx{color:#6f7f95;flex:0 0 auto}
.line .msg{flex:1}
.line.info .lv{color:var(--info)}
.line.warn{border-left-color:var(--warn)}.line.warn .lv{color:var(--warn)}
.line.error{border-left-color:var(--error);background:#160c0e}.line.error .lv{color:var(--error)}
.line.fatal{border-left-color:var(--fatal);background:#1a0d12}.line.fatal .lv{color:var(--fatal)}
.line.debug .lv{color:var(--debug)}
.empty{color:var(--muted);padding:18px 14px;font-style:italic}
footer{color:var(--muted);font-size:11.5px;padding:12px 0 0;line-height:1.7}
code{background:var(--panel2);padding:1px 5px;border-radius:4px;border:1px solid var(--border)}
a{color:var(--info)}
`;

const CLIENT_JS = `
var since = 0, paused = false, autoscroll = true, buffer = [], transport = 'conectando';
var elLog = document.getElementById('log');
var elSearch = document.getElementById('q');
var elLevel = document.getElementById('lvl');
var elTransport = document.getElementById('transport');
var elCount = document.getElementById('count');
var ORDER = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function passes(e){
  var min = ORDER[elLevel.value] || 0;
  if ((ORDER[e.level] === undefined ? 1 : ORDER[e.level]) < min) return false;
  var q = elSearch.value.trim().toLowerCase();
  if (!q) return true;
  return (e.message + ' ' + (e.context || '')).toLowerCase().indexOf(q) !== -1;
}

function render(){
  var visible = buffer.filter(passes);
  elCount.textContent = visible.length + ' / ' + buffer.length + ' líneas';
  if (!visible.length){
    elLog.innerHTML = '<div class="empty">Sin líneas que coincidan. Esta instancia arrancó hace poco o el filtro es muy estrecho.</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < visible.length; i++){
    var e = visible[i];
    html += '<div class="line ' + esc(e.level) + '">'
      + '<span class="ts">' + esc(e.ts.slice(11, 23)) + '</span>'
      + '<span class="lv">' + esc(e.level) + '</span>'
      + (e.context ? '<span class="ctx">[' + esc(e.context) + ']</span>' : '')
      + '<span class="msg">' + esc(e.message) + '</span>'
      + '</div>';
  }
  elLog.innerHTML = html;
  if (autoscroll) elLog.scrollTop = elLog.scrollHeight;
}

function ingest(payload){
  if (!payload || !payload.entries) return;
  if (payload.entries.length){
    buffer = buffer.concat(payload.entries);
    if (buffer.length > 4000) buffer = buffer.slice(buffer.length - 4000);
  }
  if (typeof payload.nextSeq === 'number') since = payload.nextSeq;
  if (!paused) render();
}

function setTransport(label, cls){
  transport = label;
  elTransport.textContent = label;
  elTransport.className = 'pill ' + cls;
}

function startPolling(){
  setTransport('polling 2s', 'poll');
  setInterval(function(){
    if (paused) return;
    fetch('/logs/data?since=' + since + AUTH_QS)
      .then(function(r){ return r.json(); })
      .then(ingest)
      .catch(function(){ setTransport('desconectado', 'bad'); });
  }, 2000);
}

function startStream(){
  if (typeof EventSource === 'undefined') { startPolling(); return; }
  var es;
  try { es = new EventSource('/logs/stream?since=' + since + AUTH_QS); }
  catch (err) { startPolling(); return; }

  var gotData = false;
  es.onopen = function(){ setTransport('en vivo (SSE)', 'live'); };
  es.onmessage = function(ev){
    gotData = true;
    try { ingest(JSON.parse(ev.data)); } catch (err) {}
  };
  es.onerror = function(){
    // EventSource reconecta solo; si nunca llegó nada, el entorno no soporta
    // streaming y caemos a polling.
    if (!gotData){ es.close(); startPolling(); }
    else setTransport('reconectando…', 'poll');
  };
}

document.getElementById('pause').onclick = function(){
  paused = !paused;
  this.textContent = paused ? '▶ Reanudar' : '⏸ Pausar';
  this.className = paused ? 'on' : '';
  if (!paused) render();
};
document.getElementById('scroll').onclick = function(){
  autoscroll = !autoscroll;
  this.className = autoscroll ? 'on' : '';
  if (autoscroll) elLog.scrollTop = elLog.scrollHeight;
};
document.getElementById('clear').onclick = function(){ buffer = []; render(); };
document.getElementById('copy').onclick = function(){
  var text = buffer.filter(passes).map(function(e){
    return e.ts + ' ' + e.level.toUpperCase() + ' ' + (e.context ? '[' + e.context + '] ' : '') + e.message;
  }).join('\\n');
  var btn = this;
  navigator.clipboard.writeText(text).then(function(){
    btn.textContent = '✓ Copiado';
    setTimeout(function(){ btn.textContent = '⧉ Copiar'; }, 1500);
  });
};
elSearch.oninput = render;
elLevel.onchange = render;

fetch('/logs/data?since=0' + AUTH_QS)
  .then(function(r){ return r.json(); })
  .then(function(p){ ingest(p); startStream(); })
  .catch(function(){ setTransport('sin conexión', 'bad'); });
`;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {{nest:object, stats:object, env:object, checks:Array, token:string|null}} model
 */
function renderPage(model) {
  const { nest, stats, env, checks, token } = model;
  const failed = nest.state === 'failed';
  const authQs = token ? `'&token=' + encodeURIComponent(${JSON.stringify(token)})` : `''`;

  const banner = failed
    ? `<div class="banner">
        <h2>✕ La aplicación Nest no arrancó — por eso todas las rutas devuelven 500</h2>
        <div style="font-size:12.5px;color:#ffb3bd">${escapeHtml(nest.bootError ? nest.bootError.message : 'Error desconocido')}</div>
        <pre>${escapeHtml(nest.bootError ? nest.bootError.stack : '')}</pre>
      </div>`
    : nest.state === 'ready'
      ? `<div class="card" style="border-left:4px solid var(--ok);margin-bottom:16px">
          <strong style="color:var(--ok)">✓ La aplicación Nest arrancó correctamente</strong>
          <span style="color:var(--muted)"> · ${nest.bootMs} ms · el API responde en <code>/api/health</code></span>
        </div>`
      : `<div class="card" style="border-left:4px solid var(--warn);margin-bottom:16px">
          <strong style="color:var(--warn)">Nest aún no se ha arrancado en esta instancia.</strong>
          <span style="color:var(--muted)"> Visita <code>/api/health</code> para forzar el arranque y vuelve aquí.</span>
        </div>`;

  const checkRows = checks
    .map(
      (check) => `<div class="check">
        <div class="dot ${check.ok ? 'ok' : 'bad'}"></div>
        <div><div class="t">${escapeHtml(check.label)}</div><div class="d">${escapeHtml(check.detail)}</div></div>
      </div>`,
    )
    .join('');

  const envRows = env.publicVars
    .map(
      (item) =>
        `<div class="row"><span class="k">${escapeHtml(item.key)}</span><span class="v">${
          item.present
            ? escapeHtml(item.value)
            : '<span style="color:var(--muted)">(sin definir)</span>'
        }</span></div>`,
    )
    .join('');

  const secretRows = env.secretVars
    .map(
      (item) =>
        `<div class="row"><span class="k">${escapeHtml(item.key)}</span><span class="v">${
          item.present
            ? `<span style="color:var(--ok)">definida</span> <span style="color:var(--muted)">(${item.length} car.)</span>`
            : '<span style="color:var(--fatal)">FALTA</span>'
        }</span></div>`,
    )
    .join('');

  /** Describe una URL de conexión sin exponer credenciales. */
  const conexionRows = (info, nombre) =>
    info
      ? `<div class="row"><span class="k">protocolo</span><span class="v">${escapeHtml(info.protocol)}</span></div>
         <div class="row"><span class="k">host</span><span class="v">${escapeHtml(info.host)}</span></div>
         <div class="row"><span class="k">puerto</span><span class="v">${escapeHtml(info.port)}</span></div>
         <div class="row"><span class="k">credenciales</span><span class="v">${info.hasCredentials ? 'presentes (ocultas)' : 'ausentes'}</span></div>
         <div class="row"><span class="k">parámetros</span><span class="v">${escapeHtml(info.params)}</span></div>`
      : `<div class="row"><span class="v" style="color:var(--fatal)">${escapeHtml(nombre)} no está definida</span></div>`;

  const dbRows = conexionRows(env.database, 'DATABASE_URL');
  const redisRows = conexionRows(env.redis, 'REDIS_URL');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Logs · donaciones-ops API</title>
<style>${CSS}</style>
</head>
<body>
<header>
  <h1>Logs · donaciones-ops API</h1>
  <span class="pill ${failed ? 'bad' : nest.state === 'ready' ? 'ok' : ''}">Nest: ${escapeHtml(nest.state === 'ready' ? 'activo' : nest.state === 'failed' ? 'caído' : 'sin arrancar')}</span>
  <span id="transport" class="pill">conectando…</span>
  <span class="pill">instancia ${escapeHtml(stats.instanceId)}</span>
  ${stats.region ? `<span class="pill">región ${escapeHtml(stats.region)}</span>` : ''}
  <span class="pill">node ${escapeHtml(stats.node)}</span>
  <div class="spacer"></div>
  <span id="count" class="pill">—</span>
</header>

<main>
  ${banner}

  <div class="grid">
    <div class="card"><h3>Chequeos de arranque</h3>${checkRows}</div>
    <div class="card"><h3>Base de datos (DATABASE_URL)</h3>${dbRows}</div>
    <div class="card"><h3>Cola / Redis (REDIS_URL)</h3>${redisRows}</div>
    <div class="card"><h3>Variables presentes</h3>${secretRows}<div style="height:8px"></div>${envRows}</div>
  </div>

  <div class="toolbar">
    <input type="search" id="q" placeholder="Buscar en los logs…" autocomplete="off">
    <select id="lvl">
      <option value="debug">Todos los niveles</option>
      <option value="info" selected>info y superiores</option>
      <option value="warn">warn y superiores</option>
      <option value="error">solo errores</option>
    </select>
    <button id="pause">⏸ Pausar</button>
    <button id="scroll" class="on">↓ Auto-scroll</button>
    <button id="clear">✕ Limpiar vista</button>
    <button id="copy">⧉ Copiar</button>
    <a href="/logs/raw${token ? `?token=${encodeURIComponent(token)}` : ''}" target="_blank"><button type="button">↗ Texto plano</button></a>
  </div>

  <div id="log"><div class="empty">Cargando…</div></div>

  <footer>
    Buffer en memoria de las últimas ${stats.capacity} líneas de <strong>esta</strong> instancia serverless.
    Vercel levanta una instancia por cold start, así que los logs de ejecución son por instancia; el error de arranque,
    en cambio, se reproduce en todas.<br>
    Endpoints: <code>/logs</code> (esta página) · <code>/logs/data?since=N</code> (JSON) ·
    <code>/logs/stream</code> (SSE) · <code>/logs/raw</code> (texto plano) · <code>/logs/reset</code> (reintenta el arranque).<br>
    Los secretos se enmascaran antes de entrar al buffer. Aun así, no pegues datos sensibles en los logs.
  </footer>
</main>

<script>var AUTH_QS = ${authQs};${CLIENT_JS}</script>
</body>
</html>`;
}

module.exports = { renderPage };
