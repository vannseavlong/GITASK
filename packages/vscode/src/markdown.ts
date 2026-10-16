// Sanitizing Markdown for the task detail panel. The source below runs in the webview (it is inlined
// into the page script by html.ts) and is also evaluated by node:test, so the tested code is the shipped code.
//
// Safety model: the parser produces a small AST (text, code, b, i, a, check). The renderer builds DOM nodes
// with the `el` helper, which only uses textContent. There is no HTML pass-through: `<script>` is just text.
// Links survive only when the target is http or https; every other target is shown as inert text.
// No backticks or dollar-brace in the source: it lives in a String.raw template (\x60 is a backtick).

export const MARKDOWN_JS = String.raw`
const GITASK_MD = (function () {
  const MAX_TEXT = 262144;     // characters parsed per document
  const MAX_LINE = 4000;       // characters kept per line
  const MAX_BLOCKS = 4000;
  const MAX_INLINE = 4000;     // characters parsed per inline run
  const MAX_BUDGET = 400000;   // inline characters per document
  const MAX_INLINE_DEPTH = 4;
  const MAX_LIST_DEPTH = 8;
  const MAX_ROWS = 200;
  const MAX_COLS = 40;
  const MAX_CODE = 20000;
  const BT = "\x60";

  function safeHref(url) {
    if (typeof url !== "string" || url.length > 2000) return null;
    return /^https?:\/\/[^\s<>"'\x60\\\u0000-\u001f\u007f]+$/i.test(url) ? url : null;
  }

  function inlineText(nodes) {
    let s = "";
    for (const n of nodes) {
      if (n.t === "text" || n.t === "code") s += n.v;
      else if (n.c) s += inlineText(n.c);
    }
    return s;
  }

  // Inline parsing. st = { budget, checks, line, ord }.
  function inline(src, st, depth, noLink) {
    if (src.length > MAX_INLINE) src = src.slice(0, MAX_INLINE);
    st.budget -= src.length;
    if (st.budget < 0 || depth > MAX_INLINE_DEPTH) return src ? [{ t: "text", v: src }] : [];
    const out = [];
    let buf = "";
    const flush = () => { if (buf) { out.push({ t: "text", v: buf }); buf = ""; } };
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === "\\" && i + 1 < src.length && /[\\\x60*_{}\[\]()#+\-.!|<>~]/.test(src[i + 1])) { buf += src[i + 1]; i += 2; continue; }
      if (ch === BT) {
        let n = 1;
        while (src[i + n] === BT) n++;
        const run = BT.repeat(n);
        const end = src.indexOf(run, i + n);
        if (end > i + n) { flush(); out.push({ t: "code", v: src.slice(i + n, end).trim() }); i = end + n; continue; }
        buf += run; i += n; continue;
      }
      if (st.checks && (ch === "-" || ch === "*") && (i === 0 || /\s/.test(src[i - 1]))) {
        const m = /^[-*]\s+\[([ xX])\](?=\s|$)/.exec(src.slice(i, i + 12));
        if (m) {
          flush();
          st.ord += 1;
          out.push({ t: "check", checked: m[1] !== " ", line: st.line, ord: st.ord });
          i += m[0].length; continue;
        }
      }
      if (ch === "*" || ch === "_") {
        const dbl = src[i + 1] === ch;
        const mark = dbl ? ch + ch : ch;
        const wordy = ch === "_" && i > 0 && /[A-Za-z0-9]/.test(src[i - 1]);
        if (!wordy) {
          const start = i + mark.length;
          let end = src.indexOf(mark, start);
          while (end !== -1 && !dbl && src[end + 1] === ch) end = src.indexOf(mark, end + 2);
          if (end > start && !/^\s/.test(src.slice(start, start + 1)) && !/\s$/.test(src.slice(start, end))) {
            flush();
            out.push({ t: dbl ? "b" : "i", c: inline(src.slice(start, end), st, depth + 1, noLink) });
            i = end + mark.length; continue;
          }
        }
        buf += mark; i += mark.length; continue;
      }
      if (ch === "[" && !noLink) {
        const mid = src.indexOf("](", i + 1);
        if (mid > i + 1 && src.slice(i + 1, mid).indexOf("[") === -1) {
          const close = src.indexOf(")", mid + 2);
          if (close !== -1) {
            const target = src.slice(mid + 2, close).trim().split(/\s+/)[0] || "";
            const label = inline(src.slice(i + 1, mid), st, depth + 1, true);
            flush();
            const href = safeHref(target);
            if (href) out.push({ t: "a", href: href, c: label });
            else {
              // Not an allowed link: keep the label and show the target as plain text.
              out.push({ t: "text", v: inlineText(label) });
              out.push({ t: "text", v: " (" + target.slice(0, 200) + ")" });
            }
            i = close + 1; continue;
          }
        }
      }
      if (ch === "<" && !noLink) {
        const m = /^<(https?:\/\/[^\s<>]+)>/i.exec(src.slice(i, i + 2005));
        if (m && safeHref(m[1])) { flush(); out.push({ t: "a", href: m[1], c: [{ t: "text", v: m[1] }] }); i += m[0].length; continue; }
      }
      buf += ch; i++;
    }
    flush();
    return out;
  }

  const RE_FENCE = /^\s{0,3}(\x60{3,}|~{3,})\s*([\w+#.-]*)/;
  const RE_HEAD = /^\s{0,3}(#{1,6})\s+(.*)$/; // trailing "###" is stripped by headText, not by the regex (linear time)
  const RE_HR = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
  const RE_LIST = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
  const RE_SEP = /^\s*\|?\s*:?-{1,}:?\s*(?:\|\s*:?-{1,}:?\s*)*\|?\s*$/;
  const RE_QUOTE = /^\s{0,3}>\s?(.*)$/;

  function splitRow(line) {
    let s = line.trim();
    if (s[0] === "|") s = s.slice(1);
    if (s.length && s[s.length - 1] === "|" && s[s.length - 2] !== "\\") s = s.slice(0, -1);
    const cells = [];
    let cur = "";
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "\\" && s[i + 1] === "|") { cur += "|"; i++; }
      else if (s[i] === "|") { cells.push(cur.trim()); cur = ""; }
      else cur += s[i];
      if (cells.length >= MAX_COLS) break;
    }
    cells.push(cur.trim());
    return cells.slice(0, MAX_COLS);
  }

  function startsBlock(line, next) {
    return RE_FENCE.test(line) || RE_HEAD.test(line) || RE_HR.test(line) || RE_LIST.test(line) || RE_QUOTE.test(line) ||
      (line.indexOf("|") !== -1 && next !== undefined && next.indexOf("-") !== -1 && RE_SEP.test(next));
  }

  // Blocks: h, p, quote, code, hr, list, table. Every block carries its 1-based source line.
  function parse(text) {
    text = String(text == null ? "" : text);
    if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);
    // A very long line must not reach the whole-line regexes; the preview cuts it.
    const lines = text.split(/\r?\n/).map((l) => (l.length > MAX_LINE ? l.slice(0, MAX_LINE) : l));
    const st = { budget: MAX_BUDGET, checks: false, line: 0, ord: 0 };
    const blocks = [];
    let i = 0;
    if (lines[0] && lines[0].trim() === "---") {
      for (let j = 1; j < Math.min(lines.length, 200); j++) {
        if (lines[j].trim() === "---" || lines[j].trim() === "...") { i = j + 1; break; }
      }
    }
    while (i < lines.length && blocks.length < MAX_BLOCKS) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      let m = RE_FENCE.exec(line);
      if (m) {
        const fence = m[1];
        const body = [];
        const start = i;
        i++;
        while (i < lines.length) {
          const t = lines[i].trim();
          if (t.length >= fence.length && t[0] === fence[0] && t === t[0].repeat(t.length)) { i++; break; }
          if (body.length < 2000) body.push(lines[i]);
          i++;
        }
        blocks.push({ t: "code", lang: m[2] || "", text: body.join("\n").slice(0, MAX_CODE), line: start + 1 });
        continue;
      }
      m = RE_HEAD.exec(line);
      if (m) {
        st.checks = false;
        blocks.push({ t: "h", level: m[1].length, c: inline(m[2].replace(/\s+#+\s*$/, "").trim(), st, 0, false), line: i + 1 });
        i++; continue;
      }
      if (RE_HR.test(line)) { blocks.push({ t: "hr", line: i + 1 }); i++; continue; }
      if (line.indexOf("|") !== -1 && i + 1 < lines.length && lines[i + 1].indexOf("-") !== -1 && RE_SEP.test(lines[i + 1])) {
        st.checks = false;
        const head = splitRow(line).map((c) => inline(c, st, 0, false));
        const rows = [];
        const start = i;
        i += 2;
        while (i < lines.length && lines[i].trim() && lines[i].indexOf("|") !== -1 && rows.length < MAX_ROWS) {
          rows.push(splitRow(lines[i]).map((c) => inline(c, st, 0, false)));
          i++;
        }
        blocks.push({ t: "table", head: head, rows: rows, line: start + 1 });
        continue;
      }
      if (RE_QUOTE.test(line)) {
        const parts = [];
        const start = i;
        while (i < lines.length && RE_QUOTE.test(lines[i])) { parts.push(RE_QUOTE.exec(lines[i])[1]); i++; }
        st.checks = false;
        blocks.push({ t: "quote", c: inline(parts.join(" "), st, 0, false), line: start + 1 });
        continue;
      }
      m = RE_LIST.exec(line);
      if (m) {
        const items = [];  // flat: { indent, bullet, num, ... }
        const start = i;
        while (i < lines.length && items.length < 3000) {
          const l = lines[i];
          const lm = RE_LIST.exec(l);
          if (lm && !RE_HR.test(l)) {
            const bullet = /[-*]/.test(lm[2]);
            let rest = lm[3];
            let box = null;
            if (bullet) {
              const bm = /^\[([ xX])\](?:\s+(.*))?$/.exec(rest);
              if (bm) { box = bm[1] !== " "; rest = bm[2] || ""; }
            }
            items.push({ indent: lm[1].replace(/\t/g, "    ").length, ordered: !bullet && lm[2] !== "+", num: parseInt(lm[2], 10), box: box, text: rest, cont: "", line: i + 1 });
            i++; continue;
          }
          if (!l.trim()) {
            let j = i + 1;
            while (j < lines.length && !lines[j].trim()) j++;
            if (j < lines.length && RE_LIST.test(lines[j]) && !RE_HR.test(lines[j]) && /^\s/.test(lines[j])) { i = j; continue; }
            break;
          }
          if (/^\s+\S/.test(l) && items.length && !startsBlock(l.trim(), undefined)) {
            items[items.length - 1].cont += " " + l.trim();
            i++; continue;
          }
          break;
        }
        // Build the tree from indentation. Iterative; depth is capped.
        const root = { ordered: items[0].ordered, start: items[0].num, items: [] };
        const stack = [{ indent: -1, list: root, depth: 0 }];
        for (const it of items) {
          while (stack.length > 1 && stack[stack.length - 1].indent >= it.indent) stack.pop();
          const top = stack[stack.length - 1];
          st.checks = true;
          st.line = it.line;
          st.ord = it.box !== null ? 0 : -1;
          const first = inline(it.text, st, 0, false);
          st.checks = false;
          const node = { c: it.cont ? first.concat(inline(it.cont, st, 0, false)) : first, box: it.box, line: it.line, sub: null };
          top.list.items.push(node);
          if (stack.length < MAX_LIST_DEPTH) {
            const sub = { ordered: it.ordered, start: it.num, items: [] };
            node.sub = sub;
            stack.push({ indent: it.indent, list: sub, depth: stack.length });
          }
        }
        // Drop empty sub lists.
        const prune = (list) => { for (const n of list.items) { if (n.sub && !n.sub.items.length) n.sub = null; else if (n.sub) prune(n.sub); } };
        prune(root);
        blocks.push({ t: "list", ordered: root.ordered, start: root.start, items: root.items, line: start + 1 });
        continue;
      }
      // paragraph
      const parts = [];
      const start = i;
      while (i < lines.length && lines[i].trim() && (parts.length === 0 || !startsBlock(lines[i], lines[i + 1]))) { parts.push(lines[i].trim()); i++; }
      st.checks = false;
      blocks.push({ t: "p", c: inline(parts.join(" "), st, 0, false), line: start + 1 });
    }
    return blocks;
  }

  // Title (first level-1 heading), preamble blocks, and one entry per level-2 heading.
  // Header bullets like "- **Owner:** x" are dropped from the preamble; the panel shows those as fields.
  function sections(blocks) {
    let title = "";
    const pre = [];
    const secs = [];
    let cur = null;
    for (const b of blocks) {
      if (b.t === "h" && b.level === 2) { cur = { title: inlineText(b.c), blocks: [] }; secs.push(cur); continue; }
      if (!cur && b.t === "h" && b.level === 1 && !title) { title = inlineText(b.c); continue; }
      (cur ? cur.blocks : pre).push(b);
    }
    const isHeader = (b) => b.t === "list" && b.items.length > 0 && b.items.every((n) => n.c.length && n.c[0].t === "b" && /:$/.test(inlineText(n.c[0].c)));
    return { title: title, preamble: pre.filter((b) => !isHeader(b)), sections: secs };
  }

  // Rendering. el(tag, cls, text) must only set textContent. opts.checkbox({line, ord, checked}) returns a node.
  function renderInline(nodes, el, opts) {
    const out = [];
    for (const n of nodes) {
      if (n.t === "text") out.push(el("span", "", n.v));
      else if (n.t === "code") out.push(el("code", "", n.v));
      else if (n.t === "b" || n.t === "i") {
        const e = el(n.t === "b" ? "strong" : "em");
        for (const c of renderInline(n.c, el, opts)) e.append(c);
        out.push(e);
      } else if (n.t === "a") {
        const a = el("a");
        for (const c of renderInline(n.c, el, opts)) a.append(c);
        a.setAttribute("href", n.href);
        a.setAttribute("rel", "noopener noreferrer");
        out.push(a);
      } else if (n.t === "check") out.push(opts.checkbox({ line: n.line, ord: n.ord, checked: n.checked }));
    }
    return out;
  }

  function renderList(list, el, opts) {
    const ul = el(list.ordered ? "ol" : "ul", "md-list");
    if (list.ordered && list.start > 1 && list.start < 100000) ul.setAttribute("start", String(list.start));
    for (const it of list.items) {
      const li = el("li", it.box !== null ? "md-task" : "");
      if (it.box !== null) li.append(opts.checkbox({ line: it.line, ord: 0, checked: it.box }));
      for (const c of renderInline(it.c, el, opts)) li.append(c);
      if (it.sub) li.append(renderList(it.sub, el, opts));
      ul.append(li);
    }
    return ul;
  }

  function renderBlocks(blocks, el, opts) {
    const out = [];
    for (const b of blocks) {
      let e;
      if (b.t === "h") {
        e = el("h" + Math.min(6, Math.max(4, b.level + 1)), "md-h");
        for (const c of renderInline(b.c, el, opts)) e.append(c);
      } else if (b.t === "p" || b.t === "quote") {
        e = el(b.t === "p" ? "p" : "blockquote", "md-p");
        for (const c of renderInline(b.c, el, opts)) e.append(c);
      } else if (b.t === "code") {
        e = el("pre", "md-pre");
        e.append(el("code", "", b.text));
      } else if (b.t === "hr") e = el("hr");
      else if (b.t === "list") e = renderList(b, el, opts);
      else if (b.t === "table") {
        e = el("table", "md-table");
        const tr = el("tr");
        for (const cell of b.head) { const th = el("th"); for (const c of renderInline(cell, el, opts)) th.append(c); tr.append(th); }
        const thead = el("thead"); thead.append(tr);
        const tbody = el("tbody");
        for (const row of b.rows) {
          const r = el("tr");
          for (const cell of row) { const td = el("td"); for (const c of renderInline(cell, el, opts)) td.append(c); r.append(td); }
          tbody.append(r);
        }
        e.append(thead, tbody);
      }
      if (e) out.push(e);
    }
    return out;
  }

  return { parse: parse, sections: sections, renderBlocks: renderBlocks, renderInline: renderInline, inlineText: inlineText, safeHref: safeHref };
})();
`;
