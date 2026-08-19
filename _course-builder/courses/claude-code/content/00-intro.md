---
title: Intro
icon: i00
gated: false
summary: What Claude Code is, how it differs from a chat app, install check, and your first real prompt.
youtube: 7-OOgkQs0Y0
---

## What Claude Code actually is

Claude Code is an agent that runs in your terminal or your editor — not a chat window. The difference isn't cosmetic. A chat app like claude.ai can talk with you about your code; Claude Code can read your files, edit them, run shell commands, and call tools, with your explicit or pre-configured permission for each action. That's the entire value proposition, and it's also the entire risk surface — which is why this course treats security as a running thread rather than a footnote.

## Install check

If you're reading this inside a Claude Code session, it's already installed — that's what's rendering this course for you if you're using the companion skills version. If you're reading this as a standalone webpage, install is a single command from Anthropic's documentation; this course assumes you already have it running before Lesson 01.

## Your first real prompt

Open a real project — even an empty folder — and ask Claude Code to do something small and concrete: "list the files here" or "read this README and summarize it." Watch what happens. Claude reads files or runs a command because you asked it to, in plain language, not code. That loop — you describe intent, Claude proposes or takes an action, you can see exactly what happened — is the whole mental model. Everything else in this course is a variation on it.

::: security
Security, from lesson zero: Claude Code can run commands and edit files on your machine. Never blanket-approve destructive operations, and always know what a tool call is about to do before approving it. The permission system exists specifically to keep a human in the loop — later lessons (Hooks, MCP) go deeper, but the rule starts here.
:::

## Where things live

Configuration, custom commands, and skills all live under a single hidden folder in your home directory. You don't need to memorize the layout yet — just know it exists. Lessons 01 and 02 will take you there directly.

::: checkpoint
Before moving on, you should be able to explain, in your own words, the difference between Claude Code and a chat app, and name one thing you should never do (blanket-approve destructive commands).
:::
