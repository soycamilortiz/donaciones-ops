/* ============================================================
   Construcción de DOM sin innerHTML.
   Todo texto entra por textContent; todo atributo por setAttribute.
   ============================================================ */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Crea un elemento HTML. `props.text` va como textContent. */
export function el(tag, props = {}, kids = []) {
  const node = document.createElement(tag);
  apply(node, props);
  append(node, kids);
  return node;
}

/** Crea un elemento SVG en su namespace. */
export function s(tag, props = {}, kids = []) {
  const node = document.createElementNS(SVG_NS, tag);
  apply(node, props);
  append(node, kids);
  return node;
}

function apply(node, props) {
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') { node.textContent = String(v); continue; }
    if (k === 'class') { node.setAttribute('class', v); continue; }
    if (k === 'html') throw new Error('html no soportado: usá text o hijos');
    if (k.startsWith('on') && typeof v === 'function') { node.addEventListener(k.slice(2).toLowerCase(), v); continue; }
    if (k === 'dataset') { Object.assign(node.dataset, v); continue; }
    node.setAttribute(k, v === true ? '' : String(v));
  }
}

function append(node, kids) {
  for (const k of [].concat(kids)) {
    if (k === null || k === undefined || k === false) continue;
    node.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k);
  }
}

/** Vacía un contenedor y le pone hijos nuevos. */
export function fill(host, kids) {
  while (host.firstChild) host.removeChild(host.firstChild);
  append(host, kids);
  return host;
}

/** Texto con una parte en negrita, sin concatenar HTML. */
export function rich(parts) {
  const frag = document.createDocumentFragment();
  for (const p of parts) {
    frag.appendChild(typeof p === 'string' ? document.createTextNode(p) : p);
  }
  return frag;
}
