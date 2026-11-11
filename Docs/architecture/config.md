# Project config (`Tasks/gitask.json`)

One JSON file in the Tasks folder holds board settings. Code: `packages/core/src/config.ts`. Unknown keys are kept on every write. A missing or malformed file never throws on read; it yields defaults.

| Key | Meaning | Where documented |
|---|---|---|
| `columns.<folder>.color` | `#rrggbb` column colour | `config.ts` (`parseColors`, `setColumnColor`) |
| `people` | team members | `people.ts` |
| `github` | opt-in issue sync | [github.md](github.md) |
| `project` | title, subtitle, logo, header layout | below |
| `fields` | team-defined pick-lists such as Platform | [below](#fields) |
| `defaultView` | view the board opens on when the user has none remembered: `overview` `board` `list` `timeline` `sprint` | [below](#defaultview) |
| `sprint` | turns sprints on and holds their settings | [below](#sprint), file format in [sprints.md](sprints.md) |

## `project`

```json
{ "project": { "title": "Acme", "subtitle": "Roadmap", "logo": "assets/logo.png",
  "layout": { "align": "left", "size": "md", "logoPosition": "left" } } }
```

| Field | Rule | Default |
|---|---|---|
| `title` | text, trimmed, max 80 characters | none |
| `subtitle` | text, trimmed, max 160 characters | none |
| `logo` | path relative to `Tasks/`, see below | none |
| `layout.align` | `left` `center` `right` | `left` |
| `layout.size` | `sm` `md` `lg` | `md` |
| `layout.logoPosition` | `left` `top` `right` `hidden` | `left` |

**Reading** (`parseProject` for text, `readProject` for the folder, used by `loadBoard`): every field is checked alone, so one bad value falls back to its default or is dropped without affecting the others. Control characters, line breaks and bidi marks in text become spaces. `Board.project` is present only when a title, subtitle or valid logo exists, so a board without the block looks as before. An old `layout.showTitle` key (the option was removed) is ignored on read, refused in a new `setProject` message, and dropped from the file the next time `setProject` rewrites the project block.

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

## `defaultView`

```json
{ "defaultView": "board" }
```

**Reading** (`parseDefaultView` for text, `readDefaultView` for the folder): the value must be exactly one of `BOARD_VIEWS` (`overview`, `board`, `list`, `timeline`, `sprint`, kept equal to the UI registry by a test); missing, unknown, wrong type, malformed or symlinked file means `overview`; `sprint` on a board without sprints opens Overview. Nothing writes it; edit the file by hand. **Use:** a remembered view always wins. VS Code reads it when the panel opens and the workspace has no remembered view (`gitask.lastView`); `gitask serve` reads it for every page load and puts it in `data-initial-view`, and the browser's remembered tab (`gitask.ui` in localStorage) still wins over it.

## `fields`

```json
{ "fields": [ { "key": "platform", "label": "Platform", "multi": true,
  "values": [ { "id": "admin-portal", "label": "Admin Portal", "color": "#3794ff" },
              { "id": "app", "label": "App" }, { "id": "landing-page", "label": "Landing Page" } ] } ] }
```

| Field | Rule | Default |
|---|---|---|
| `key` | `^[a-z][a-z0-9-]{0,23}$`, unique, not a header key a task already uses (`RESERVED_FIELD_KEYS`) | entry dropped |
| `label` | text, cleaned like project text, max 40 characters | the `key` |
| `multi` | `true` allows several values on one task | `false` |
| `values[].id` | `^[a-z0-9][a-z0-9-]{0,31}$`, unique in the field | value dropped |
| `values[].label` | text, max 40 characters | the `id` |
| `values[].color` | `#rrggbb`, stored lower-case | none |

At most 8 fields and 30 values per field; the rest are ignored. **Reading** (`parseFields` for text, `readFields` for the folder, used by `loadBoard`): every entry and every value is checked alone, so one bad one is dropped without affecting the others; a field left with no valid value is dropped. A missing, malformed or symlinked file yields none. `Board.config` is present only when at least one field is configured, so a board without the block looks as before. Writing the block from the board is not built yet; edit the file by hand.

**Values in task files.** A task holds values in its header, `- **Platform:** app, admin-portal` (the key with a capital first letter; the parser lower-cases it; ids separated by commas, semicolons or spaces; text that is not an id is ignored). A sub-task holds them as trailing tokens under `## Sub-tasks`: `- [ ] Build login @longcelot #backend #platform:app`. `#key:id` is a field token only when `key` is a valid field key and `id` a valid value id (`splitTokens` in `parse.ts`, no config needed); `#lane` and `@person` work as before, and a look-alike such as `#Platform:App` stays text. The parse does not look at the config, so an older sub-task that ends in `#word:word` (for example `Fix bug #area:core`) now shows `Fix bug` with a value `area:core`; the line in the file is unchanged. `loadBoard` sets `Task.values` for the configured keys only; `Subtask.values` is whatever the line says. An id not in the config is kept as written and never rewritten.

**Writing** (`setTaskField`, `setSubtaskField` in `field-values.ts` / `subtasks.ts`): they take the `FieldDef`, so unknown ids, duplicates and several values on a single-value field throw with nothing written. Only that header line or sub-task line changes, `@person`/`#lane` are kept, a file changed since it was read is refused, a header line whose text is not made of value ids (`App, Admin Portal`) is refused instead of overwritten, and the commit is that task file by pathspec when it is tracked. `addSubtask` accepts `values` too; `editSubtask` refuses text that ends in a field token.

**Filtering** (`filterByFields`, `taskMatchesFields`, `subtaskMatchesFields`): a selection `{ platform: ["app"] }` keeps a task when, for every selected field, its own value or the value of any of its sub-tasks is one of the selected ids (AND across fields, OR within one). A field with nothing selected is not filtered.

**CLI** (`packages/cli/src/commands.ts`): `gitask fields`, `gitask field set`, `gitask subtask field`, `subtask add --field`, and `--field key=id[,id]` on `board` and `report` (`fieldSelection` checks the key and every id against the config before anything is read or written, then `filterByFields` or the core writers run). The grouping of reports by a field (`--by`) is not built.

## `sprint`

```json
{ "sprint": { "lengthDays": 14, "estimate": "points", "doneColumns": ["5-done", "6-deploy"],
              "unfinished": "backlog", "resetStatus": "2-todo" } }
```

| Key | Rule | Default |
|---|---|---|
| `lengthDays` | integer 1 to 60 | `14` |
| `estimate` | `points` `hours` `none` | `points` |
| `doneColumns` | column ids (`<n>-<name>`) that exist on the board; unknown ids dropped one by one, duplicates removed | `["5-done", "6-deploy"]` |
| `unfinished` | `backlog` `next` | `backlog` |
| `resetStatus` | an existing column id, or `null` to keep the status | `2-todo` |

**Reading** (`parseSprintConfig(text, columns?)` for text, `readSprintConfig(dir, columns?)` for the folder, used by `loadBoard` through `loadSprints`): no block, a block that is not an object, or a missing, malformed or symlinked file means sprints are off, and `Board.sprints` is absent, so a board without the block looks as before. `{ "sprint": {} }` turns sprints on with all defaults. Each key is checked alone and falls back to its default when bad; a `doneColumns` list left empty falls back to the default. Defaults are not checked against the columns. Nothing writes the block yet; edit the file by hand. Sprint files and task headers: [sprints.md](sprints.md).
