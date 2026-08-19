---
title: Slash Commands
icon: i01
gated: true
summary: Built-in commands, and how to write your own from a single markdown file.
---

Slash commands are the simplest way to hand Claude Code a repeatable instruction. Type `/` followed by a name, and Claude runs whatever that command's file tells it to do. This lesson covers the built-ins worth knowing, then has you write your own.

## The built-ins worth knowing

- `/help` — lists what's available in your current setup.
- `/clear` — wipes context and starts fresh. Use it after finishing one task and starting something unrelated, so old context doesn't bleed into the next request.
- `/compact` — manually summarizes the conversation so far, instead of waiting for it to happen automatically as context fills up.
- `/config` — opens your settings.

## What a slash command actually is

There's no special syntax to learn. A slash command is a markdown file with a short frontmatter `description`, followed by plain-language instructions in the body — nothing else. Claude reads the file and follows the instructions when you invoke it. That's the entire mechanism.

::: exercise Try it
Create a trivial custom command of your own — for example, one that reads a status file and prints a one-line summary. Save it, then invoke it with `/` and your command's name, and confirm it runs.
:::

## Project scope vs. global scope

A command saved inside a project's own hidden config folder is available only in that project. A command saved in your personal, machine-wide config folder is available everywhere, in every project you open. Put habits and personal shortcuts in the global location; put anything specific to one codebase in that project's local one.

::: checkpoint
If you wanted a command available only in one specific project, where does the file go? If you wanted it everywhere? You should be able to answer both without looking back.
:::
