---
title: Read and filter your tasks in the five views
description: What the GITASK Overview, Board, Task detail, List, Timeline and Export views show in VS Code and the browser, how to reorder the tabs, and how the shared filters work.
slug: /views
---

After this page you can pick the right view for a question and filter it. All views read the same task files (tab order and the project header need GITASK 0.6.0), in VS Code (**GITASK: Open Board**) and in a browser ([`gitask serve`](./serve.md)). Nothing is stored outside `Tasks/`.

| View | Use it to |
|---|---|
| Overview | See the health of the whole project |
| Board | Move cards between statuses |
| Task detail | Read one task without opening the Markdown |
| List | Scan every task in a table |
| Timeline | See what is due and what depends on what |

The tabs open in this order, with Overview first. Drag a tab to put the views in your own order, or focus a tab and press **Alt+Left** or **Alt+Right**. **Reset tab order** appears once the order differs from the default. GITASK remembers your order in VS Code and in the browser.

## Board

One column per status folder. A card shows the task id, title, owner avatar, tier, who has claimed it and sub-task progress `done/total`. Drag a card to another column to move it: GITASK runs `git mv` and commits that one file. Click the owner to assign someone, and use the **Sub-tasks** toggle to show a card's sub-tasks in place. Set a column colour with the swatch on its header (saved in `Tasks/gitask.json`). **+ Add status** creates a new column: give it a name and an optional colour, and GITASK creates the next numbered folder. See [task format](./task-format.md).

## Task detail

Click any card, list row or timeline item to open the task in a side panel. It shows the header fields and each section rendered. You can tick sub-tasks, add them, assign them and set their lane and set their lane. **Open file** opens the Markdown. Delete a task from the card or the panel. A dialog tells you what will be removed first. GITASK runs `git rm` and commits, so it is recoverable from history.

## List

All tasks as rows: title, status, tier, owner, claimed by, updated, due and progress. Click a column header to sort. Filter by status, tier and owner, or search the text. The chevron on a row expands it into its sub-tasks.

## Timeline

A month calendar with each task on its `Due` date, and a waterfall of bars from the start date to the `Due` date. A task with no due date gets an open-ended bar. Arrows follow `Depends on`, and a line marks today. Fields are explained in [task format](./task-format.md).

## Overview

The **Activity** chart shows commits that changed a task file, per day, for the last 12 months. It fills the width of the page. Below it are counts per status, tier and owner, tasks that have not been updated for a while, tasks that are claimed, the last ten moves and the number of overdue tasks. "A while" is `gitask.staleDays`, 14 days by default.

## Export

The **Export** button opens a dialog that turns the current period into a report of what was done, with a live preview, as HTML, Markdown or CSV. Details: [reports](./report.md).

## Filters shared by all views

A bar under the tabs applies to Board, List, Timeline and Overview at once:

- **Date range:** `From` and `To`, by `Due` or `Updated` date. While a range is active, tasks with no usable date are hidden.
- **People:** tasks a person owns or has a sub-task in, plus **Unassigned**.
- **Status chips:** click a status to hide or show it everywhere. **Show all** resets.

The filters combine, and are remembered for you only; they are never committed.

Next: [the FAQ](./faq.md).
