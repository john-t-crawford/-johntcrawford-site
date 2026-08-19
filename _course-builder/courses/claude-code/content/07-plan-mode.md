---
title: Plan Mode
icon: i07
gated: true
capstone: true
summary: Read-only planning, permission modes, and the principle tying the whole course together.
youtube: hmkvKpNdPzk
---

::: capstone
This is the capstone lesson — it doesn't introduce a new isolated feature so much as tie together the security thread that's run under every lesson since Hooks.
:::

Plan mode is a mode where Claude can only read, explore, and write to a plan file — no edits, no commands, no destructive actions — until you explicitly approve the plan. Research and design happen read-only; nothing executes until you say go.

## Reversibility is the real axis

Freely reversible actions — reading files, editing local drafts — don't need this ceremony. Hard-to-reverse or wide-blast-radius actions — force pushes, deletes, sending messages, spending money — do. Plan mode is one tool for that; asking before risky shell commands is another; hooks and permission settings are how you tune the default to your own risk tolerance.

::: exercise Capstone exercise
Design — on paper or just in conversation, not necessarily executed — a plan-mode task for something real in your own work. Articulate which parts of it are reversible (fine to just do) and which need a stop-and-confirm before anything happens.
:::

## The throughline

Lesson 03 (Hooks) said never wire automation to bypass confirmation on destructive actions. Lesson 05 (MCP) said every connected server is a trust boundary you should understand before granting it access. Both are the same principle, applied to a different mechanism: **powerful automation stays safe only when a human can review it before consequential action happens.** Plan mode is that principle made into a feature — research and propose, then wait for a yes.

::: checkpoint
Final check for understanding: state that one security principle in your own words. Don't settle for "just be careful" — name the actual mechanism: review before automate, least privilege, reversibility-awareness.
:::

That's the core curriculum. You don't need anything further to consider yourself proficient — the rest is practice in your own real work.
