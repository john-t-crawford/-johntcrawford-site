---
title: Subagents
icon: i04
gated: true
summary: Delegating work to specialized agents — parallel research without losing the thread.
youtube: Lx9dJv8hZ7g
---

A subagent runs in its own context window, separate from your main conversation. Launch several in parallel and you can fan out independent research instead of working through it one step at a time. The tradeoff: a subagent starts cold, with no memory of what you and Claude have already discussed — so the prompt you hand it has to stand on its own.

## Why delegate at all

Three things a subagent buys you: parallelism (several run at once instead of serially), context isolation (a big search doesn't bloat your main conversation), and a narrower toolset when that's useful (a read-only research agent, for instance, can't accidentally edit anything).

::: exercise Try it
Delegate one small, real research task from your own work to a subagent — something like "find every file in this project that references X." Launch it, and when it reports back, remember that its summary describes what it intended to do, not necessarily a guaranteed account of what happened. For anything you're about to act on, verify the actual result rather than trusting the summary blindly.
:::

## Foreground vs. background

Background is the default — you keep working while the subagent runs, and get notified when it's done. Foreground blocks until it returns, which you want only when its output has to inform your very next step.

::: checkpoint
Why does a subagent need a self-contained prompt instead of something like "continue what we were just discussing"?
:::
