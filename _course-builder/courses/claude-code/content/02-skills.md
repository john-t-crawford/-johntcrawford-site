---
title: Skills
icon: i02
gated: true
summary: Reusable, self-triggering capabilities — what makes a Skill different from a command.
youtube: 9MqenTLuQ18
---

A Skill is a step up from a slash command: instead of something you type deliberately every time, it's a packaged capability Claude can reach for on its own when it's relevant — triggered by matching your request against the Skill's description, not by you typing its name.

## Slash command vs. Skill

Use a slash command for something you'll invoke deliberately, every time, the same way. Use a Skill for something you want Claude to notice is relevant without you having to remember a specific command name — and for anything that needs to bundle more than one file (reference material, scripts) alongside its instructions.

## The one file that matters

A Skill lives in its own folder as a `SKILL.md` file with two frontmatter fields — `name` and `description` — followed by instructions in the body. The `description` is doing more work than it looks like: it's what Claude matches against your request to decide whether this Skill is relevant. Write it like a search-index entry, specific enough to trigger on the right requests and general enough not to require an exact phrase match.

::: exercise Try it
Pick one small, real, recurring task from your own work and write a genuine Skill for it. Spend real effort on the description — that's the part most people get wrong: too vague and it never triggers, too narrow and it only triggers on an exact phrase. Then phrase a natural request that should trigger it — not by name — and confirm it loads.
:::

::: checkpoint
Why does the `description` field matter more for a Skill than it does for a slash command?
:::
