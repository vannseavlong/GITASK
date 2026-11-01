---
title: Questions and troubleshooting
description: Answers to common GITASK questions. Whether it pushes to git, where data is stored, why a card or task is missing, and how it works with other tools.
slug: /faq
---

## Does GITASK push to my remote?

No. A move commits one file locally. You push when you want.

## Does a move commit everything I changed?

No. It commits only the task's file, by path. Other changed or staged files are left alone. Turn commits off with the `gitask.autoCommit` setting or `--no-commit`.

## Where is my data?

In your `Tasks/` folder, as Markdown, plus an optional `Tasks/gitask.json` for people, colours and GitHub settings. There is no server and no account. Details: [task format](./task-format.md).

## A task does not show on the board

- The file must end in `.md` and sit directly inside a column folder.
- The folder name must start with a number and a dash, like `2-todo`. Folders starting with `_` are ignored.
- Run `gitask board` in the same folder to see what GITASK finds.

## The card shows no due date or dependency

`Due` must start with a real date, `YYYY-MM-DD`. `Depends on` must name other tasks by file name, without `.md`. Anything else is ignored, not an error.

## Progress is `0/0`

Progress counts the checkboxes under `## Done when` and `## Sub-tasks`. Checkboxes in other sections are not counted.

## The move did not commit

The file must be tracked by git, `gitask.autoCommit` must be on, and the folder must be a git repository. Otherwise the file is moved and left uncommitted.

## Which editors work?

VS Code, and VSCodium, Cursor and Windsurf through Open VSX. Everything else can use the [command line](./cli.md) or [`gitask serve`](./serve.md). See [install](./install.md).

## Can coding agents use it?

Yes. They only read and move files. See [using GITASK with coding agents](./getting-started.md#using-gitask-with-coding-agents).
