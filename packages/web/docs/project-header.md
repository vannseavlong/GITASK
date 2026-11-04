---
title: Add a project title and logo to your board
description: Show your project name, subtitle and logo above every GITASK view and in reports. Set it from the board or in Tasks/gitask.json, and choose the alignment, size and logo position.
slug: /project-header
---

After this page you can show your project name and logo above the Overview, Board, List and Timeline views, in VS Code and in the browser, and in the reports you export. Needs GITASK 0.6.0.

## Set it from the board

1. Open the board. At the top, click **Add project header**. If a header is already set, click the vertical dots in its corner and choose **Customize header**.
2. Type a **Title** and, if you want, a **Subtitle**.
3. Choose the **Alignment** (left, center or right), the **Size** (sm, md or lg) and the **Logo position** (left, top, right or hidden). The preview at the top of the dialog shows the result.
4. To add a logo, drop an image on the upload area or click it to browse. Use a PNG, JPG, WebP, GIF or plain SVG of at most 1 MiB. Choose **Replace** or **Remove** to change it later.
5. Click **Save**.

GITASK copies the logo into `Tasks/` as `logo-<hash>.<type>`, writes the settings to `Tasks/gitask.json`, and commits those files together if the file is tracked by git. If you replace or remove the logo, the old generated logo file is removed in the same commit. **Reset layout** puts alignment, size and logo position back to the defaults and leaves your text and logo alone.

If saving fails, the dialog stays open with your input and shows the reason.

## What the file looks like

The settings live in the `project` block of `Tasks/gitask.json`. You can edit it by hand:

```json
{
  "project": {
    "title": "Acme",
    "subtitle": "Roadmap",
    "logo": "logo-0123456789abcdef.png",
    "layout": { "align": "left", "size": "md", "logoPosition": "left" }
  }
}
```

The `logo` path is relative to `Tasks/`, and the file must be inside it. Titles are limited to 80 characters and subtitles to 160. The full rules are in [Docs/architecture/config.md](https://github.com/vannseavlong/GITASK/blob/main/Docs/architecture/config.md).

## In reports

The HTML report starts with the title, subtitle and logo, and the Markdown report starts with the title and subtitle. In the **Export** dialog, clear **Include project header** to leave it out. CSV never has a header. See [reports](./report.md).

## Good to know

- **SVG logos** must be plain SVG. Scripts, embedded images, links and Inkscape metadata are refused. Export a plain SVG from your editor, or use a PNG.
- A logo that cannot be read leaves just the title, with no broken-image icon.
- With no `project` block, nothing is shown and the board looks as it did before.

Next: [read and filter your tasks in the views](./views.md).
