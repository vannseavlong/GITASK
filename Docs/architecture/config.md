# Project config (`Tasks/gitask.json`)

One JSON file in the Tasks folder holds board settings. Code: `packages/core/src/config.ts`. Unknown keys are kept on every write. A missing or malformed file never throws on read; it yields defaults.

| Key | Meaning | Where documented |
|---|---|---|
| `columns.<folder>.color` | `#rrggbb` column colour | `config.ts` (`parseColors`, `setColumnColor`) |
| `people` | team members | `people.ts` |
| `github` | opt-in issue sync | [github.md](github.md) |
| `project` | title, subtitle, logo, header layout | below |

## `project`

```json
{ "project": { "title": "Acme", "subtitle": "Roadmap", "logo": "assets/logo.png",
  "layout": { "align": "left", "size": "md", "logoPosition": "left", "showTitle": true } } }
```

| Field | Rule | Default |
|---|---|---|
| `title` | text, trimmed, max 80 characters | none |
| `subtitle` | text, trimmed, max 160 characters | none |
| `logo` | path relative to `Tasks/`, see below | none |
| `layout.align` | `left` `center` `right` | `left` |
| `layout.size` | `sm` `md` `lg` | `md` |
| `layout.logoPosition` | `left` `top` `right` `hidden` | `left` |
| `layout.showTitle` | boolean | `true` |

**Reading** (`parseProject` for text, `readProject` for the folder, used by `loadBoard`): every field is checked alone, so one bad value falls back to its default or is dropped without affecting the others. Control characters, line breaks and bidi marks in text become spaces. `Board.project` is present only when a title, subtitle or valid logo exists, so a board without the block looks as before.

**Logo** (`isLogoPath` for syntax, `resolveLogo` for the disk). Accepted only when all hold:
- relative, `/` separated, no `..`, `.` or empty segment, no absolute path, drive letter, backslash, URL or control character, at most 255 characters;
- extension is `png`, `jpg`, `jpeg`, `webp`, `gif` or `svg` (so `gitask.json` and task files can never be a logo);
- a regular file (`assertRegularFile`: not a symlink, not behind a symlinked folder, real path inside `Tasks/`);
- not empty and at most 1 MiB.

Paths may contain spaces or non-ASCII characters, so a host must URL-encode them. A logo that fails is dropped (the rest of the project still shows). `Board.project.logo` is `{ path, mime, version }` (`version` is `<mtime ms>-<size>` of the file, so a host can refetch a logo replaced by hand under the same name); file bytes never travel in the board payload. A host turns `path` into a URL itself (webview URI in VS Code, a fixed route in `gitask serve`) and must re-run `resolveLogo` when serving, because the file can change after the board loads. SVG is allowed, but a host must show it only through `<img>`, never inline or in `<object>`/`<iframe>`, so scripts in it do not run. The hosts serve it through `readLogoBytes` (see [ui.md](ui.md) "Project logo"). `readLogoBytes` also checks after the open that the real path of the file (`realpath`) is inside the real Tasks folder and is the same device and inode as the handle it holds (`openedUnder`), which closes the window where a parent folder is swapped for a symlink between `resolveLogo` and the open (`O_NOFOLLOW` only covers the last path segment).

**Reports** (`loadReportHeader(dir)` in `report-render.ts`): re-reads the project and re-runs `resolveLogo` at report time, then opens the file with `O_NOFOLLOW`, re-checks size on the open handle and embeds the bytes as a `data:` URI (`renderHtml(report, header)`; the report CSP gets `img-src data:` only then). The logo appears only as `<img src="data:...">`, so SVG scripts do not run. A bad logo is dropped and the text header stays. `renderMarkdown(report, header)` starts with `# title` and the subtitle (no logo); CSV is unchanged. A `ReportRequest` may carry `includeHeader` (default on); the CLI report always includes the header when a project is set.

**Writing** (`setProject(dir, input, opts)`): `input` has `title`, `subtitle`, `logo` (`undefined` leaves a field, `null` clears it) and a partial `layout`. Everything is validated first and any problem throws with nothing written, including a logo that does not pass `resolveLogo` and unknown fields. Other keys and unknown keys inside `project` are kept; an empty block is removed. The file is committed by pathspec only (`Tasks/gitask.json`), and only if git already tracks it; the logo file is not committed by this call. A symlinked `gitask.json` is refused.

**Saving from the board** (`setProject` message, `saveProject(dir, fields, opts)` in `project-save.ts`; pure rules in `project-rules.ts`, shared with the UI): the "Customize header" dialog sends `title`, `subtitle`, a partial `layout` and `logo` (`null` removes it, `{ name, data }` uploads). `validateMessage` checks it in both hosts: unknown fields, wrong types, control characters, over-long text, bad layout values, a logo name that is not an allowed image extension (the name is never used as a path) and a `data` that is not base64 or is over 1 MiB all fail with nothing written. `saveProject` then checks the bytes (`checkLogoUpload`: size, and the content must match the type, so HTML named `.png` is refused; an SVG must pass the allow-list below) and stores them in `Tasks/` as `logo-<16 hex of sha256>.<ext>` (files from before the change carry 12 hex and are still recognised) with `O_EXCL | O_NOFOLLOW`, so it never overwrites a file or writes through a symlink (the same content again reuses the file). It then calls `setProject` with that name, which runs `resolveLogo` again. If anything fails, a file this call created is removed. The commit is `Tasks/gitask.json` plus that one logo file, by pathspec, and only when `gitask.json` is already tracked. When a logo is replaced or removed, the previous file is deleted in the same commit (`git rm`, then `gitask.json` plus the new logo plus that deletion, all by pathspec). It is deleted only when all hold: its path in the old config is a bare name in `Tasks/` that matches exactly `logo-<12 or 16 hex>.<png|jpg|webp|gif|svg>`; it is a plain file (never a symlink); its content hashes (sha256) to the hex in its name, so a hand-made file that merely looks like ours is kept; it is no longer the configured logo; and the commit runs (`gitask.json` tracked, commit not disabled) with the file tracked. Hand-named logos (`logo.png`, `assets/...`) are never touched. If the commit fails, the deleted file is put back and unstaged, like the config. `gitask serve` accepts a body up to about 1.4 MiB only for a request that carries `X-Gitask-Upload: logo` (token still required) and only for a `setProject` message; every other message keeps the 64 KiB cap.

**SVG allow-list** (`isPlainSvg` in `svg-check.ts`, no dependency): the file must be strict UTF-8 and one well-formed `<svg>` tree. Elements are limited to shapes, `g`, `defs`, `symbol`, `use`, `text`/`tspan`, `title`, `desc`, `style`, gradients, `stop`, `clipPath`, `mask`, `pattern`, `marker`, `filter` and common `fe*` primitives; attributes to a fixed list of geometry and presentation names. `href`/`xlink:href` may only be `#fragment`; `url(...)` in any value or CSS must be `#fragment`; no `<image>`, `<a>`, `<script>`, `<foreignObject>`, animation elements, event handlers, namespaced extensions (`inkscape:`, `sodipodi:`: export as "plain SVG"), DOCTYPE, entities, CDATA, processing instructions (except the XML declaration), character references or CSS escapes and `@import`. Anything the scanner does not recognise is refused, so an unusual form cannot slip past. This lowers what is committed to the repo; it is still not a sanitiser for inline use, and the logo is shown only through `<img>` with a sandbox CSP.
