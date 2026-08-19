---
title: Memory
icon: i06
gated: true
summary: CLAUDE.md vs. persistent memory vs. context compression — what belongs where.
---

Three separate mechanisms handle "not forgetting things," and mixing them up is the most common mistake at this stage: `CLAUDE.md`, persistent memory, and automatic context compression.

## CLAUDE.md

A file read at the start of every session in a project, carrying standing instructions — conventions, dos and don'ts, anything you'd otherwise repeat every conversation. It's scoped to that one codebase.

## Persistent memory

Cross-project, cross-session — durable facts about you and your preferences that carry forward into entirely new conversations, not just this one project. Where CLAUDE.md answers "how do I work in this codebase," memory answers "who am I working with, and what have I learned about working with them specifically."

## What doesn't belong in memory

Code patterns, file paths, architecture — anything derivable by reading the current code — shouldn't go in memory. Memory can go stale; the code is always the source of truth. Memory is for things that aren't otherwise discoverable: preferences, decisions, non-obvious context.

## Context compression

As a conversation grows long, older parts get automatically summarized rather than the session simply hitting a wall and failing. You don't need to artificially keep sessions short or worry about losing everything at a hard limit — the harness handles this for you.

::: exercise Try it
Look at (or start) a `CLAUDE.md` in one of your own real projects. Then think of one durable preference about how you like to work — something you'd otherwise repeat across many different projects — and decide whether it belongs in memory instead.
:::

::: checkpoint
You've mentioned three times that you prefer terse commit messages. Where should that live — CLAUDE.md, memory, or neither? *(It's memory — a durable preference about you, not project-specific instructions.)*
:::
