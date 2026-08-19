---
title: Hooks
icon: i03
gated: true
summary: Automating around tool calls — and the security rules that keep automation safe.
---

A hook is a shell command the harness runs automatically around an event — before a tool call, after a file edit, when a session stops — configured once in your settings, then fired every time the condition matches. No confirmation, no per-invocation review. That's the whole point of a hook, and it's also exactly why this lesson leads with security instead of ending with it.

::: security
Security is not negotiable here. A hook runs with no per-invocation confirmation, which means a bad hook does something dangerous silently, every single time.

- Never wire a hook to skip verification, auto-approve destructive commands, or blanket-bypass permission checks.
- Don't let a hook shell out to anything holding secrets in plaintext environment variables — treat hook scripts like production code, not scratch scripts.
- Prefer hooks that are read-only or clearly reversible (logging, formatting, linting) over anything that deletes, pushes, or deploys.
- If a hook is copied from somewhere else, read every line before enabling it. A hook is code that runs automatically and silently.
:::

## Where hooks live

Hooks are configured in your settings, keyed to lifecycle events. The event determines when the hook fires; the command is whatever shell command you've told it to run. For example, this logs the path of every file edited, in your project's `.claude/settings.json`:

```
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "echo \"$CLAUDE_TOOL_INPUT\" >> ~/edit-log.txt" }
        ]
      }
    ]
  }
}
```

`PostToolUse` fires after a tool call completes; `matcher` limits it to specific tools (here, file edits); `command` is the shell command that runs. This is intentionally the simplest possible hook — read-only, appends to a local file, touches nothing destructive.

::: exercise Try it — safely
Add one low-risk hook: something that fires after a file edit and just logs which file changed to a local log file. Nothing destructive, nothing touching git remotes, network calls, or credentials. Trigger the condition and confirm the log file recorded it.
:::

::: checkpoint
Name one category of hook you should never write, and why. A vague "be careful" doesn't count — name the actual risk (destructive ops, secrets exposure, or bypassing confirmation).
:::
