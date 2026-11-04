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

Paths may contain spaces or non-ASCII characters, so a host must URL-encode them. A logo that fails is dropped (the rest of the project still shows). `Board.project.logo` is `{ path, mime }`; file bytes never travel in the board payload. A host turns `path` into a URL itself (webview URI in VS Code, a fixed route in `gitask serve`) and must re-run `resolveLogo` when serving, because the file can change after the board loads. SVG is allowed, but a host must show it only through `<img>`, never inline or in `<object>`/`<iframe>`, so scripts in it do not run. The hosts serve it through `readLogoBytes` (see [ui.md](ui.md) "Project logo").

**Reports** (`loadReportHeader(dir)` in `report-render.ts`): re-reads the project and re-runs `resolveLogo` at report time, then opens the file with `O_NOFOLLOW`, re-checks size on the open handle and embeds the bytes as a `data:` URI (`renderHtml(report, header)`; the report CSP gets `img-src data:` only then). The logo appears only as `<img src="data:...">`, so SVG scripts do not run. A bad logo is dropped and the text header stays. `renderMarkdown(report, header)` starts with `# title` and the subtitle (no logo); CSV is unchanged. A `ReportRequest` may carry `includeHeader` (default on); the CLI report always includes the header when a project is set.

**Writing** (`setProject(dir, input, opts)`): `input` has `title`, `subtitle`, `logo` (`undefined` leaves a field, `null` clears it) and a partial `layout`. Everything is validated first and any problem throws with nothing written, including a logo that does not pass `resolveLogo` and unknown fields. Other keys and unknown keys inside `project` are kept; an empty block is removed. The file is committed by pathspec only (`Tasks/gitask.json`), and only if git already tracks it; the logo file is not committed by this call. A symlinked `gitask.json` is refused.
