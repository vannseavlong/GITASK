// Allow-list check for SVG logos. No dependency: SVG is tokenised with a strict scanner and anything it does not
// recognise is refused, so an exotic form cannot slip past a pattern. Pure (no node imports).
//
// What passes: a single well-formed <svg> tree made only of the elements and attributes below, with no DOCTYPE, entity,
// CDATA, processing instruction other than the XML declaration, namespaced extension (inkscape:, sodipodi:), script,
// event handler, external reference or character reference. Editor metadata must be exported away ("plain SVG").
// This does not make an SVG safe to inline; hosts still show it only through <img>.

const ELEMENTS = new Set([
  "svg", "g", "defs", "symbol", "use", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "text", "tspan", "title", "desc", "style", "linearGradient", "radialGradient", "stop", "clipPath", "mask", "pattern", "marker",
  "filter", "feBlend", "feColorMatrix", "feComposite", "feDropShadow", "feFlood", "feGaussianBlur", "feMerge", "feMergeNode", "feOffset",
]);

const ATTRIBUTES = new Set([
  // structure and geometry
  "id", "class", "xmlns", "xmlns:xlink", "version", "viewBox", "preserveAspectRatio", "width", "height", "x", "y", "x1", "y1", "x2", "y2",
  "cx", "cy", "r", "rx", "ry", "d", "points", "dx", "dy", "rotate", "textLength", "lengthAdjust", "transform", "href", "xlink:href",
  "xml:space", "xml:lang", "overflow", "clip-path", "clip-rule", "mask", "opacity", "display", "visibility", "style", "filter",
  // presentation
  "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray",
  "stroke-dashoffset", "stroke-opacity", "color", "stop-color", "stop-opacity", "offset", "font-family", "font-size", "font-style", "font-weight",
  "font-variant", "text-anchor", "text-decoration", "letter-spacing", "word-spacing", "dominant-baseline", "alignment-baseline", "baseline-shift",
  "writing-mode", "direction", "paint-order", "vector-effect", "shape-rendering", "text-rendering", "image-rendering", "color-interpolation",
  "color-interpolation-filters", "flood-color", "flood-opacity", "lighting-color", "mix-blend-mode", "isolation",
  // gradients, patterns, clipping, markers
  "gradientUnits", "gradientTransform", "spreadMethod", "fx", "fy", "fr", "patternUnits", "patternContentUnits", "patternTransform",
  "clipPathUnits", "maskUnits", "maskContentUnits", "markerWidth", "markerHeight", "markerUnits", "refX", "refY", "orient", "marker-start",
  "marker-mid", "marker-end", "filterUnits", "primitiveUnits",
  // filter primitives
  "in", "in2", "result", "mode", "type", "values", "operator", "k1", "k2", "k3", "k4", "stdDeviation", "edgeMode", "floodColor", "floodOpacity",
]);

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const MAX_TAGS = 20000;
const CLOSE = /<\/([A-Za-z][A-Za-z0-9]*)\s*>/y;
const OPEN = /<([A-Za-z][A-Za-z0-9]*)/y;
const ATTR = /\s+([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/y;
const TAIL = /\s*(\/?)>/y;

/** CSS (a `style` attribute or <style> text) with nothing that loads, imports, escapes or scripts. */
function cssIsPlain(css: string): boolean {
  if (/\\|@import|@font-face|expression\s*\(|javascript:|behavior|-moz-binding|<|&/i.test(css)) return false;
  // Linear scan (a regex here backtracks quadratically on "url(" repeated): every url(...) must point at a fragment.
  const lower = css.toLowerCase();
  for (let at = lower.indexOf("url"); at !== -1; at = lower.indexOf("url", at + 3)) {
    let j = at + 3;
    while (j < lower.length && /\s/.test(lower[j])) j++;
    if (lower[j] !== "(") continue;
    const close = lower.indexOf(")", j);
    if (close === -1) return false; // unclosed url(: refuse instead of rescanning the rest for every later "url"
    if (!/^\s*["']?\s*#[\w.-]+\s*["']?\s*$/.test(css.slice(j + 1, close))) return false;
    at = close - 2; // the next search starts after the closing paren
  }
  return !/image-set\s*\(|\bsrc\s*:/i.test(css);
}

/** Character data: no `<`, and no `&` except the five predefined entities (no DTD means no others can resolve). */
const textIsPlain = (t: string) => !t.includes("<") && !/&(?!(?:amp|lt|gt|quot|apos);)/.test(t);

function attrIsOk(name: string, value: string): boolean {
  if (!ATTRIBUTES.has(name) || !textIsPlain(value)) return false;
  if (name === "xmlns") return value === SVG_NS;
  if (name === "xmlns:xlink") return value === XLINK_NS;
  if (name === "href" || name === "xlink:href") return /^#[\w.-]+$/.test(value); // fragment references only: nothing external, no data: or javascript:
  if (name === "style") return cssIsPlain(value);
  // Any other value that names a resource must also point at a fragment in this document.
  if (/url\s*\(/i.test(value)) return cssIsPlain(value);
  return !/javascript:|data:|vbscript:/i.test(value);
}

/** True when `text` is a plain SVG document made only of allow-listed elements and attributes. */
export function isPlainSvg(text: string): boolean {
  let s = text.replace(/^﻿/, "");
  const decl = /^\s*<\?xml\s+version\s*=\s*["']1\.[01]["'](?:\s+encoding\s*=\s*["'][A-Za-z0-9._-]+["'])?(?:\s+standalone\s*=\s*["'](?:yes|no)["'])?\s*\?>/.exec(s);
  if (decl) s = s.slice(decl[0].length);
  const stack: string[] = [];
  let seenRoot = false;
  let tags = 0;
  let i = 0;
  while (i < s.length) {
    if (s[i] !== "<") {
      const end = s.indexOf("<", i);
      const chunk = s.slice(i, end === -1 ? s.length : end);
      if (!textIsPlain(chunk)) return false;
      const top = stack[stack.length - 1];
      if (chunk.trim()) {
        if (!top) return false; // text outside the root
        if (top === "style" && !cssIsPlain(chunk)) return false;
      }
      if (end === -1) break;
      i = end;
      continue;
    }
    if (s.startsWith("<!--", i)) {
      const end = s.indexOf("-->", i + 4);
      if (end === -1) return false;
      if (stack.includes("style")) return false; // a comment inside <style> would split text the CSS check must see whole
      const body = s.slice(i + 4, end);
      if (body.includes("--") || /[<>&]/.test(body)) return false; // keep comments inert: no markup smuggled in them
      i = end + 3;
      continue;
    }
    if (++tags > MAX_TAGS) return false;
    CLOSE.lastIndex = i;
    const close = CLOSE.exec(s);
    if (close) {
      if (stack.pop() !== close[1]) return false;
      i += close[0].length;
      continue;
    }
    OPEN.lastIndex = i;
    const open = OPEN.exec(s);
    if (!open || !ELEMENTS.has(open[1])) return false;
    const name = open[1];
    if (stack[stack.length - 1] === "style") return false; // <style> holds one run of text, so the CSS check sees all of it
    if (!stack.length) {
      if (name !== "svg" || seenRoot) return false;
      seenRoot = true;
    }
    i += open[0].length;
    const seen = new Set<string>();
    for (;;) {
      ATTR.lastIndex = i;
      const attr = ATTR.exec(s);
      if (!attr) break;
      const key = attr[1];
      if (seen.has(key) || !attrIsOk(key, attr[2] ?? attr[3])) return false;
      seen.add(key);
      i += attr[0].length;
    }
    TAIL.lastIndex = i;
    const tail = TAIL.exec(s);
    if (!tail) return false;
    i += tail[0].length;
    if (!tail[1]) stack.push(name);
  }
  return seenRoot && stack.length === 0;
}
